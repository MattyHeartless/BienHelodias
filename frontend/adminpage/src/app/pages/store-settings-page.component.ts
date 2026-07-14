import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, ViewChild, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AddressDraft, BannerDto, DeliveryAvailability, DeliveryUserDto, ProductDto, PromotionType, StoreDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { shakeFieldBySelector, shakeInvalidFormControls } from '../core/form-error-shake.util';
import { NotificationUiService } from '../core/notification-ui.service';
import { GooglePlacesService } from '../services/google-places.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';

@Component({
  selector: 'app-store-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './store-settings-page.component.html',
  styleUrl: './store-settings-page.component.css'
})
export class StoreSettingsPageComponent implements AfterViewChecked, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationUiService);
  private readonly googlePlaces = inject(GooglePlacesService);
  private autocomplete: any = null;
  private autocompleteInput: HTMLInputElement | null = null;
  private autocompleteListener: { remove: () => void } | null = null;

  @ViewChild('businessAddressInput') businessAddressInput?: ElementRef<HTMLInputElement>;

  readonly loading = signal(true);
  readonly submittingWelcome = signal(false);
  readonly submittingBanner = signal(false);
  readonly submittingDeliveryUser = signal(false);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly welcomePhraseRows = signal(1);
  readonly identityPanelOpen = signal(false);
  readonly placesLoading = signal(false);
  readonly placesError = signal<string | null>(null);
  readonly selectedBusinessAddress = signal<AddressDraft | null>(null);
  readonly store = signal<StoreDto | null>(null);
  readonly banners = signal<BannerDto[]>([]);
  readonly products = signal<ProductDto[]>([]);
  readonly deliveryUsers = signal<DeliveryUserDto[]>([]);
  readonly bannerModalOpen = signal(false);
  readonly bannerModalActive = signal(false);
  readonly bannerModalClosing = signal(false);
  readonly deliveryUserModalOpen = signal(false);
  readonly deliveryUserModalActive = signal(false);
  readonly deliveryUserModalClosing = signal(false);
  readonly editingBannerId = signal<string | null>(null);
  readonly editingPromotionProductName = signal('');
  readonly deliveryAvailability = DeliveryAvailability;
  readonly promotionType = PromotionType;

  readonly welcomeForm = this.formBuilder.nonNullable.group({
    welcomePhrase: ['', [Validators.maxLength(280)]],
    openingTime: [''],
    closingTime: [''],
    cartonPrice: [null as number | null, [Validators.min(0)]],
    bucketPrice: [null as number | null, [Validators.min(0)]],
    minimumPurchase: [null as number | null, [Validators.min(0)]],
    businessAddress: ['', [Validators.maxLength(500)]],
    latitude: [null as number | null],
    longitude: [null as number | null]
  });

  readonly bannerForm = this.formBuilder.nonNullable.group({
    header: ['', [Validators.required, Validators.minLength(2)]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(6)]],
    wildcard: [''],
    expirationDate: [''],
    status: [true, [Validators.required]],
    hasPromotion: [false],
    promotionName: [''],
    promotionCode: [''],
    promotionType: [PromotionType.Percentage],
    percentageValue: [10],
    targetProductId: [''],
    buyQuantity: [1],
    freeQuantity: [1]
  });

  readonly deliveryUserForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  readonly orderedBanners = computed(() =>
    [...this.banners()].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  );

  readonly bannerSummary = computed(() => ({
    total: this.banners().length,
    active: this.banners().filter((banner) => banner.status).length,
    scheduled: this.banners().filter((banner) => Boolean(banner.expirationDate)).length
  }));

  readonly deliverySummary = computed(() => ({
    total: this.deliveryUsers().length,
    active: this.deliveryUsers().filter((deliveryUser) => deliveryUser.isActive).length,
    available: this.deliveryUsers().filter((deliveryUser) =>
      deliveryUser.isActive && deliveryUser.currentAvailability === DeliveryAvailability.Available
    ).length
  }));

  readonly isEditingBanner = computed(() => this.editingBannerId() !== null);
  readonly promotionProductSearch = signal('');
  readonly selectedPromotionProduct = computed(() => {
    const targetProductId = this.bannerForm.controls.targetProductId.value;

    if (!targetProductId) {
      return null;
    }

    return this.products().find((product) => product.id === targetProductId) ?? null;
  });
  readonly filteredPromotionProducts = computed(() => {
    const query = this.promotionProductSearch().trim().toLowerCase();
    const items = [...this.products()].sort((a, b) => a.name.localeCompare(b.name));

    return items
      .filter((product) =>
        !query
        || product.name.toLowerCase().includes(query)
        || product.category.toLowerCase().includes(query))
      .slice(0, 8);
  });

  constructor() {
    this.syncWelcomeTextareaRows();

    this.bannerForm.controls.promotionType.valueChanges.subscribe((value) => {
      if (value !== PromotionType.BuyXGetY) {
        this.clearPromotionProductSelection();
      }
    });

    this.load();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.syncWelcomeTextareaRows();
  }

  toggleIdentityPanel(): void {
    this.identityPanelOpen.update((open) => !open);
  }

  ngAfterViewChecked(): void {
    if (this.identityPanelOpen()) {
      void this.initializeBusinessAddressAutocomplete();
    }
  }

  ngOnDestroy(): void {
    this.destroyAutocompleteListener();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.storeAdminApi.getMyStore().subscribe({
      next: (response) => {
        this.store.set(response.data);
        this.welcomeForm.reset({
          welcomePhrase: response.data.welcomePhrase ?? '',
          openingTime: this.normalizeTimeForInput(response.data.openingTime),
          closingTime: this.normalizeTimeForInput(response.data.closingTime),
          cartonPrice: response.data.cartonPrice,
          bucketPrice: response.data.bucketPrice,
          minimumPurchase: response.data.minimumPurchase,
          businessAddress: response.data.businessAddress ?? '',
          latitude: response.data.latitude,
          longitude: response.data.longitude
        });
        this.selectedBusinessAddress.set(this.buildSelectedBusinessAddress(response.data));
        this.loadStoreResources();
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible cargar los datos de la tienda.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.loading.set(false);
      }
    });
  }

  loadStoreResources(): void {
    forkJoin({
      banners: this.storeAdminApi.getBanners(),
      products: this.storeAdminApi.getProducts(200),
      deliveryUsers: this.storeAdminApi.getDeliveryUsers()
    }).subscribe({
      next: (response) => {
        this.banners.set(response.banners.data.items);
        this.products.set(response.products.data.items);
        this.deliveryUsers.set(response.deliveryUsers.data);
        this.loading.set(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible cargar la configuracion de la tienda.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.loading.set(false);
      }
    });
  }

  saveWelcomePhrase(): void {
    const store = this.store();
    if (!store || this.submittingWelcome()) {
      return;
    }

    this.welcomeForm.markAllAsTouched();
    if (this.welcomeForm.invalid) {
      shakeInvalidFormControls(this.host.nativeElement);
      return;
    }

    this.submittingWelcome.set(true);
    this.error.set(null);
    this.feedback.set(null);

    const values = this.welcomeForm.getRawValue();

    this.storeAdminApi.updateMyStore({
      name: store.name,
      slug: store.slug,
      isActive: store.isActive,
      welcomePhrase: values.welcomePhrase.trim() || null,
      openingTime: this.normalizeTimeForApi(values.openingTime),
      closingTime: this.normalizeTimeForApi(values.closingTime),
      cartonPrice: values.cartonPrice,
      bucketPrice: values.bucketPrice,
      minimumPurchase: values.minimumPurchase,
      businessAddress: values.businessAddress.trim() || null,
      latitude: values.latitude,
      longitude: values.longitude
    }).subscribe({
      next: (response) => {
        this.store.set(response.data);
        this.welcomeForm.reset({
          welcomePhrase: response.data.welcomePhrase ?? '',
          openingTime: this.normalizeTimeForInput(response.data.openingTime),
          closingTime: this.normalizeTimeForInput(response.data.closingTime),
          cartonPrice: response.data.cartonPrice,
          bucketPrice: response.data.bucketPrice,
          minimumPurchase: response.data.minimumPurchase,
          businessAddress: response.data.businessAddress ?? '',
          latitude: response.data.latitude,
          longitude: response.data.longitude
        });
        this.selectedBusinessAddress.set(this.buildSelectedBusinessAddress(response.data));
        const message = 'Datos de identidad actualizados.';
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.submittingWelcome.set(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible actualizar la identidad de la tienda.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.submittingWelcome.set(false);
      }
    });
  }

  openCreateBannerModal(): void {
    this.error.set(null);
    this.feedback.set(null);
    this.editingBannerId.set(null);
    this.bannerForm.reset({
      header: '',
      title: '',
      description: '',
      wildcard: '',
      expirationDate: '',
      status: true,
      hasPromotion: false,
      promotionName: '',
      promotionCode: '',
      promotionType: PromotionType.Percentage,
      percentageValue: 10,
      targetProductId: '',
      buyQuantity: 1,
      freeQuantity: 1
    });
    this.promotionProductSearch.set('');
    this.editingPromotionProductName.set('');
    this.openAnimatedModal(this.bannerModalOpen, this.bannerModalActive, this.bannerModalClosing);
  }

  editBanner(banner: BannerDto): void {
    this.error.set(null);
    this.feedback.set(null);
    this.editingBannerId.set(banner.bannerId);
    this.bannerForm.reset({
      header: banner.header,
      title: banner.title,
      description: banner.description,
      wildcard: banner.wildcard ?? '',
      expirationDate: banner.expirationDate ? banner.expirationDate.slice(0, 10) : '',
      status: banner.status,
      hasPromotion: !!banner.promotion,
      promotionName: banner.promotion?.name ?? '',
      promotionCode: banner.promotion?.code ?? '',
      promotionType: banner.promotion?.type ?? PromotionType.Percentage,
      percentageValue: banner.promotion?.percentageValue ?? 10,
      targetProductId: banner.promotion?.targetProductId ?? '',
      buyQuantity: banner.promotion?.buyQuantity ?? 1,
      freeQuantity: banner.promotion?.freeQuantity ?? 1
    });
    this.promotionProductSearch.set(banner.promotion?.targetProductName ?? this.selectedPromotionProductName(banner.promotion?.targetProductId ?? ''));
    this.editingPromotionProductName.set(banner.promotion?.targetProductName ?? '');
    if (banner.promotion?.targetProductId) {
      this.storeAdminApi.getProduct(banner.promotion.targetProductId).subscribe({
        next: (response) => {
          const productName = response.data.name;
          this.editingPromotionProductName.set(productName);

          if (!this.promotionProductSearch().trim()) {
            this.promotionProductSearch.set(productName);
          }
        }
      });
    }
    this.openAnimatedModal(this.bannerModalOpen, this.bannerModalActive, this.bannerModalClosing);
  }

  closeBannerModal(): void {
    this.closeAnimatedModal(this.bannerModalOpen, this.bannerModalActive, this.bannerModalClosing, () => {
      this.editingBannerId.set(null);
      this.bannerForm.reset({
        header: '',
        title: '',
        description: '',
        wildcard: '',
        expirationDate: '',
        status: true,
        hasPromotion: false,
        promotionName: '',
        promotionCode: '',
        promotionType: PromotionType.Percentage,
        percentageValue: 10,
        targetProductId: '',
        buyQuantity: 1,
        freeQuantity: 1
      });
      this.promotionProductSearch.set('');
      this.editingPromotionProductName.set('');
    });
  }

  saveBanner(): void {
    this.bannerForm.markAllAsTouched();
    if (this.bannerForm.invalid) {
      shakeInvalidFormControls(this.host.nativeElement);
      return;
    }

    if (this.submittingBanner()) {
      return;
    }

    this.submittingBanner.set(true);
    this.error.set(null);
    this.feedback.set(null);

    const values = this.bannerForm.getRawValue();
    if (values.hasPromotion && values.promotionType === PromotionType.Percentage) {
      const percentageValue = Number(values.percentageValue);
      if (!Number.isFinite(percentageValue) || percentageValue <= 0 || percentageValue > 100) {
        const message = 'Captura un porcentaje de descuento entre 1 y 100.';
        this.error.set(message);
        shakeFieldBySelector(this.host.nativeElement, '#promotion-percentage', message);
        this.notifications.error({ summary: message });
        this.submittingBanner.set(false);
        return;
      }
    }

    if (values.hasPromotion && values.promotionType === PromotionType.BuyXGetY && !values.targetProductId) {
      const message = 'Selecciona el producto al que aplica el 2x1.';
      this.error.set(message);
      shakeFieldBySelector(this.host.nativeElement, '#promotion-target-product', message);
      this.notifications.error({ summary: message });
      this.submittingBanner.set(false);
      return;
    }

    const request = {
      header: values.header.trim(),
      title: values.title.trim(),
      description: values.description.trim(),
      wildcard: values.wildcard.trim() || null,
      expirationDate: values.expirationDate || null,
      status: values.status,
      promotion: values.hasPromotion
        ? {
            name: values.promotionName.trim() || null,
            code: values.promotionCode.trim() || null,
            type: Number(values.promotionType),
            percentageValue: values.promotionType === PromotionType.Percentage ? Number(values.percentageValue) : null,
            targetProductId: values.promotionType === PromotionType.BuyXGetY ? values.targetProductId || null : null,
            buyQuantity: values.promotionType === PromotionType.BuyXGetY ? 1 : null,
            freeQuantity: values.promotionType === PromotionType.BuyXGetY ? 1 : null
          }
        : null
    };

    const operation = this.isEditingBanner()
      ? this.storeAdminApi.updateBanner(this.editingBannerId()!, request)
      : this.storeAdminApi.createBanner(request);

    operation.subscribe({
      next: (response) => {
        const message = this.isEditingBanner() ? `Banner actualizado: ${response.data.title}` : `Banner creado: ${response.data.title}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.closeBannerModal();
        this.loadStoreResources();
        this.submittingBanner.set(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, this.isEditingBanner() ? 'No fue posible actualizar el banner.' : 'No fue posible crear el banner.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.submittingBanner.set(false);
      }
    });
  }

  toggleBannerStatus(banner: BannerDto): void {
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.updateBannerStatus(banner.bannerId, !banner.status).subscribe({
      next: (response) => {
        const message = `Estado actualizado: ${response.data.title}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.loadStoreResources();
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible actualizar el estado del banner.');
        this.error.set(message);
        this.notifications.error({ summary: message });
      }
    });
  }

  deleteBanner(banner: BannerDto): void {
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.deleteBanner(banner.bannerId).subscribe({
      next: () => {
        const message = `Banner eliminado: ${banner.title}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        if (this.editingBannerId() === banner.bannerId) {
          this.closeBannerModal();
        }
        this.loadStoreResources();
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible eliminar el banner.');
        this.error.set(message);
        this.notifications.error({ summary: message });
      }
    });
  }

  openCreateDeliveryUserModal(): void {
    this.error.set(null);
    this.feedback.set(null);
    this.deliveryUserForm.reset({
      name: '',
      email: '',
      phone: '',
      password: ''
    });
    this.openAnimatedModal(this.deliveryUserModalOpen, this.deliveryUserModalActive, this.deliveryUserModalClosing);
  }

  closeDeliveryUserModal(): void {
    this.closeAnimatedModal(this.deliveryUserModalOpen, this.deliveryUserModalActive, this.deliveryUserModalClosing, () => {
      this.deliveryUserForm.reset({
        name: '',
        email: '',
        phone: '',
        password: ''
      });
    });
  }

  saveDeliveryUser(): void {
    this.deliveryUserForm.markAllAsTouched();
    if (this.deliveryUserForm.invalid) {
      shakeInvalidFormControls(this.host.nativeElement);
      return;
    }

    if (this.submittingDeliveryUser()) {
      return;
    }

    this.submittingDeliveryUser.set(true);
    this.error.set(null);
    this.feedback.set(null);

    const values = this.deliveryUserForm.getRawValue();
    this.storeAdminApi.createDeliveryUser({
      name: values.name,
      email: values.email,
      phone: values.phone,
      password: values.password
    }).subscribe({
      next: () => {
        const message = `Repartidor dado de alta: ${values.name}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.closeDeliveryUserModal();
        this.loadStoreResources();
        this.submittingDeliveryUser.set(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible dar de alta al repartidor.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.submittingDeliveryUser.set(false);
      }
    });
  }

  toggleDeliveryUserStatus(deliveryUser: DeliveryUserDto): void {
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.updateDeliveryUserStatus(deliveryUser.id, !deliveryUser.isActive).subscribe({
      next: (response) => {
        const message = `Estado de repartidor actualizado: ${response.data.fullName}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.loadStoreResources();
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible actualizar el estado del repartidor.');
        this.error.set(message);
        this.notifications.error({ summary: message });
      }
    });
  }

  deliveryAvailabilityLabel(deliveryUser: DeliveryUserDto): string {
    if (!deliveryUser.isActive) {
      return 'Inactivo';
    }

    switch (deliveryUser.currentAvailability) {
      case DeliveryAvailability.Available:
        return 'Disponible';
      case DeliveryAvailability.Busy:
        return 'Ocupado';
      default:
        return 'No disponible';
    }
  }

  promotionLabel(banner: BannerDto): string | null {
    if (!banner.promotion) {
      return null;
    }

    return banner.promotion.type === PromotionType.Percentage
      ? `${banner.promotion.percentageValue ?? 0}% de descuento`
      : `2x1 en ${banner.promotion.targetProductName ?? 'producto seleccionado'}`;
  }

  updatePromotionProductSearch(value: string): void {
    this.promotionProductSearch.set(value);

    if (this.selectedPromotionProduct()?.name !== value.trim()) {
      this.bannerForm.controls.targetProductId.setValue('');
    }
  }

  selectPromotionProduct(product: ProductDto): void {
    this.bannerForm.controls.targetProductId.setValue(product.id);
    this.promotionProductSearch.set(product.name);
    this.editingPromotionProductName.set(product.name);
  }

  clearPromotionProductSelection(): void {
    this.bannerForm.controls.targetProductId.setValue('');
    this.promotionProductSearch.set('');
    this.editingPromotionProductName.set('');
  }

  onBusinessAddressInput(): void {
    const currentValue = this.welcomeForm.controls.businessAddress.value.trim();
    const selectedAddress = this.selectedBusinessAddress();

    if (!selectedAddress || currentValue === selectedAddress.formattedAddress) {
      return;
    }

    this.selectedBusinessAddress.set(null);
    this.welcomeForm.patchValue({
      latitude: null,
      longitude: null
    }, { emitEvent: false });
  }

  private openAnimatedModal(
    open: WritableSignal<boolean>,
    active: WritableSignal<boolean>,
    closing: WritableSignal<boolean>
  ): void {
    closing.set(false);
    active.set(false);
    open.set(true);
    window.requestAnimationFrame(() => active.set(true));
  }

  private closeAnimatedModal(
    open: WritableSignal<boolean>,
    active: WritableSignal<boolean>,
    closing: WritableSignal<boolean>,
    afterClose?: () => void
  ): void {
    if (!open()) {
      afterClose?.();
      return;
    }

    if (closing()) {
      return;
    }

    active.set(false);
    closing.set(true);
    window.setTimeout(() => {
      open.set(false);
      closing.set(false);
      afterClose?.();
    }, this.getModalCloseDurationMs());
  }

  private getModalCloseDurationMs(): number {
    const rawValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-close-dur')
      .trim();

    if (rawValue.endsWith('ms')) {
      return Number.parseFloat(rawValue) || 150;
    }

    if (rawValue.endsWith('s')) {
      return (Number.parseFloat(rawValue) || 0.15) * 1000;
    }

    return Number.parseFloat(rawValue) || 150;
  }

  private selectedPromotionProductName(productId: string): string {
    return this.products().find((product) => product.id === productId)?.name ?? '';
  }

  private async initializeBusinessAddressAutocomplete(): Promise<void> {
    const input = this.businessAddressInput?.nativeElement;
    if (!input) {
      return;
    }

    if (this.autocomplete && this.autocompleteInput === input) {
      return;
    }

    this.placesLoading.set(true);
    this.placesError.set(null);

    try {
      this.destroyAutocompleteListener();
      this.autocompleteInput = input;
      this.autocomplete = await this.googlePlaces.createAddressAutocomplete(input);
      this.autocompleteListener = this.googlePlaces.addPlaceChangedListener(this.autocomplete, () => {
        this.applySelectedBusinessAddress();
      });
      this.placesLoading.set(false);
    } catch (error) {
      this.autocomplete = null;
      this.autocompleteInput = null;
      this.placesLoading.set(false);
      this.placesError.set(getApiErrorMessage(error, 'No fue posible cargar Google Places para la direccion del negocio.'));
    }
  }

  private applySelectedBusinessAddress(): void {
    if (!this.autocomplete) {
      return;
    }

    const addressDraft = this.googlePlaces.extractAddressDraft(this.autocomplete);
    if (!addressDraft?.formattedAddress) {
      return;
    }

    this.selectedBusinessAddress.set(addressDraft);
    this.welcomeForm.patchValue({
      businessAddress: addressDraft.formattedAddress,
      latitude: addressDraft.latitude,
      longitude: addressDraft.longitude
    });
  }

  private buildSelectedBusinessAddress(store: StoreDto): AddressDraft | null {
    if (!store.businessAddress) {
      return null;
    }

    return {
      formattedAddress: store.businessAddress,
      placeId: null,
      latitude: store.latitude,
      longitude: store.longitude
    };
  }

  private destroyAutocompleteListener(): void {
    this.autocompleteListener?.remove();
    this.autocompleteListener = null;
  }

  private normalizeTimeForInput(value: string | null): string {
    return value ? value.slice(0, 5) : '';
  }

  private normalizeTimeForApi(value: string): string | null {
    const normalized = value.trim();
    return normalized ? `${normalized}:00` : null;
  }

  private syncWelcomeTextareaRows(): void {
    this.welcomePhraseRows.set(window.matchMedia('(max-width: 639px)').matches ? 3 : 1);
  }
}
