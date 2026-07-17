import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ContainerDepositType, DeliveryAddressDraft, ProductDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { GooglePlacesService } from '../services/google-places.service';
import { OrdersApiService } from '../services/orders-api.service';
import { ProductsApiService } from '../services/products-api.service';
import { CartSessionService } from '../services/cart-session.service';
import { StorefrontTenantService } from '../services/storefront-tenant.service';
import { StoreAvailabilityService } from '../services/store-availability.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, RouterLink],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css'
})
export class CheckoutPageComponent implements OnDestroy {
  readonly containerDepositType = ContainerDepositType;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly productsApi = inject(ProductsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly googlePlaces = inject(GooglePlacesService);
  private readonly cartSession = inject(CartSessionService);
  private readonly storefrontTenant = inject(StorefrontTenantService);
  private readonly storeAvailabilityService = inject(StoreAvailabilityService);
  private autocomplete: any | null = null;
  private autocompleteListener: { remove: () => void } | null = null;
  private autocompleteInput: HTMLInputElement | null = null;
  private confirmationCloseHandle: ReturnType<typeof window.setTimeout> | null = null;
  private confirmationOpenFrame: number | null = null;
  private readonly validationShakeTimers = new Map<string, ReturnType<typeof window.setTimeout>>();

  @ViewChild('deliveryAddressInput')
  set deliveryAddressInputRef(value: ElementRef<HTMLInputElement> | undefined) {
    this.deliveryAddressInput = value;
    if (value) {
      void this.initializeDeliveryAddressAutocomplete();
    }
  }

  private deliveryAddressInput?: ElementRef<HTMLInputElement>;

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly placesLoading = signal(false);
  readonly placesError = signal<string | null>(null);
  readonly confirmationModalOpen = signal(false);
  readonly confirmationModalActive = signal(false);
  readonly confirmationModalClosing = signal(false);
  readonly selectedAddress = signal<DeliveryAddressDraft | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly activeSlug = signal<string | null>(null);
  readonly storeName = computed(() => this.storefrontTenant.store()?.name ?? 'Licoreria');
  readonly cart = computed(() => this.cartSession.items());
  readonly emptyContainersToExchange = computed(() => this.cartSession.emptyContainersToExchange());
  readonly appliedPromotion = computed(() => this.cartSession.appliedPromotion());
  readonly storeAvailability = computed(() => this.storeAvailabilityService.getAvailability(this.storefrontTenant.store()));

  readonly checkoutForm = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    deliveryAddress: ['', [Validators.required, Validators.minLength(10)]],
    notes: [''],
    deliveryPlaceId: [''],
    deliveryLatitude: [''],
    deliveryLongitude: ['']
  });

  readonly cartItems = computed(() =>
    this.products()
      .filter((product) => (this.cart()[product.id] ?? 0) > 0)
      .map((product) => ({
        product,
        quantity: this.cart()[product.id],
        emptyContainersToExchange: this.emptyContainersToExchange()[product.id] ?? 0
      }))
  );

  readonly subtotal = computed(() =>
    this.cartItems().reduce((total, entry) => total + entry.product.price * entry.quantity, 0)
  );

  readonly depositTotal = computed(() =>
    this.cartItems().reduce((total, entry) => total + this.getDepositTotal(entry.product, entry.quantity, entry.emptyContainersToExchange), 0)
  );

  readonly discountTotal = computed(() => this.appliedPromotion()?.discountTotal ?? 0);
  readonly total = computed(() => (this.appliedPromotion()?.total ?? this.subtotal()) + this.depositTotal());
  readonly minimumPurchase = computed(() => this.storefrontTenant.store()?.minimumPurchase ?? null);
  readonly amountMissingForMinimum = computed(() => Math.max(0, (this.minimumPurchase() ?? 0) - (this.subtotal() + this.depositTotal())));
  readonly meetsMinimumPurchase = computed(() => this.amountMissingForMinimum() === 0);
  readonly canSubmitOrder = computed(() =>
    this.cartItems().length > 0 && this.storeAvailability().isOpen && this.meetsMinimumPurchase()
  );

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.error.set('No se encontro el slug de la tienda.');
        this.loading.set(false);
        return;
      }

      this.activeSlug.set(slug);
      this.cartSession.loadForSlug(slug);
      if (this.cartSession.cartCount() === 0) {
        void this.router.navigate(['/', slug, 'cart']);
        return;
      }

      this.resolveStorefront(slug);
    });
  }

  ngOnDestroy(): void {
    this.destroyAutocompleteListener();
    this.clearConfirmationCloseHandle();
    this.cancelConfirmationOpenFrame();
    this.validationShakeTimers.forEach((timer) => window.clearTimeout(timer));
    this.validationShakeTimers.clear();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.confirmationModalOpen()) {
      this.closeConfirmationModal();
    }
  }

  requestOrderConfirmation(): void {
    this.checkoutForm.markAllAsTouched();
    const storeId = this.storefrontTenant.storeId();
    const slug = this.activeSlug();
    if (this.checkoutForm.invalid || !storeId || !slug) {
      if (this.checkoutForm.invalid) {
        this.shakeInvalidFields();
      }
      return;
    }

    if (!this.storeAvailability().isOpen) {
      this.error.set(`La tienda está cerrada. Horario de atención: ${this.storeAvailability().scheduleLabel}.`);
      return;
    }

    if (!this.meetsMinimumPurchase()) {
      this.error.set(`Te faltan ${this.amountMissingForMinimum().toFixed(2)} para alcanzar el pedido mínimo.`);
      return;
    }

    this.clearConfirmationCloseHandle();
    this.cancelConfirmationOpenFrame();
    this.confirmationModalClosing.set(false);
    this.confirmationModalActive.set(false);
    this.confirmationModalOpen.set(true);
    this.confirmationOpenFrame = window.requestAnimationFrame(() => {
      this.confirmationModalActive.set(true);
      this.confirmationOpenFrame = null;
    });
  }

  closeConfirmationModal(): void {
    if (!this.confirmationModalOpen()) {
      return;
    }

    this.confirmationModalActive.set(false);
    this.confirmationModalClosing.set(true);
    this.cancelConfirmationOpenFrame();
    this.clearConfirmationCloseHandle();
    const closeDuration = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--modal-close-dur')) || 150;
    this.confirmationCloseHandle = window.setTimeout(() => {
      this.confirmationModalOpen.set(false);
      this.confirmationModalClosing.set(false);
      this.confirmationCloseHandle = null;
    }, closeDuration);
  }

  confirmOrder(): void {
    this.closeConfirmationModal();
    this.submitOrder();
  }

  isFieldInvalid(fieldName: 'customerName' | 'customerPhone' | 'deliveryAddress'): boolean {
    const control = this.checkoutForm.controls[fieldName];
    return control.touched && control.invalid;
  }

  submitOrder(): void {
    this.checkoutForm.markAllAsTouched();
    const storeId = this.storefrontTenant.storeId();
    const slug = this.activeSlug();
    if (this.checkoutForm.invalid || !storeId || !slug) {
      return;
    }

    if (!this.storeAvailability().isOpen) {
      this.error.set(`La tienda está cerrada. Horario de atención: ${this.storeAvailability().scheduleLabel}.`);
      return;
    }

    if (!this.meetsMinimumPurchase()) {
      this.error.set(`Te faltan ${this.amountMissingForMinimum().toFixed(2)} para alcanzar el pedido mínimo.`);
      return;
    }

    const values = this.checkoutForm.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.ordersApi.createOrder({
      storeId,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      deliveryAddress: values.deliveryAddress,
      deliveryLatitude: values.deliveryLatitude ? Number(values.deliveryLatitude) : null,
      deliveryLongitude: values.deliveryLongitude ? Number(values.deliveryLongitude) : null,
      notes: values.notes || null,
      promoCode: this.appliedPromotion()?.code ?? null,
      items: this.cartItems().map((entry) => ({
        productId: entry.product.id,
        quantity: entry.quantity,
        emptyContainersToExchange: entry.emptyContainersToExchange
      }))
    }).subscribe({
      next: (response) => {
        localStorage.setItem(this.getLastOrderStorageKey(slug), JSON.stringify(response.data));
        this.cartSession.clearCart();
        this.submitting.set(false);
        void this.router.navigate(['/', slug, 'order', response.data.id]);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible crear tu pedido.'));
        this.submitting.set(false);
      }
    });
  }

  handleDeliveryAddressInput(rawAddress: string): void {
    const currentSelection = this.selectedAddress();
    if (!currentSelection) {
      return;
    }

    if (rawAddress.trim() === currentSelection.formattedAddress.trim()) {
      return;
    }

    this.clearSelectedAddress();
  }

  normalizeCustomerPhone(rawPhone: string): void {
    const phone = rawPhone.replace(/\D/g, '').slice(0, 10);
    if (phone !== rawPhone) {
      this.checkoutForm.controls.customerPhone.setValue(phone);
    }
  }

  requiresDeposit(product: ProductDto): boolean {
    return product.depositType !== ContainerDepositType.None;
  }

  getDepositLabel(product: ProductDto, plural = false): string {
    const label = product.depositType === ContainerDepositType.Bucket ? 'cubeta' : 'cartón';
    return plural ? (label === 'cartón' ? 'cartones' : 'cubetas') : label;
  }

  getDepositUnitPrice(product: ProductDto): number {
    const store = this.storefrontTenant.store();
    return product.depositType === ContainerDepositType.Bucket ? store?.bucketPrice ?? 0 : store?.cartonPrice ?? 0;
  }

  getDepositQuantity(product: ProductDto, quantity: number, emptyContainersToExchange: number): number {
    return this.requiresDeposit(product) ? Math.max(0, quantity - emptyContainersToExchange) : 0;
  }

  getDepositTotal(product: ProductDto, quantity: number, emptyContainersToExchange: number): number {
    return this.getDepositQuantity(product, quantity, emptyContainersToExchange) * this.getDepositUnitPrice(product);
  }

  trackLastOrder(): void {
    const slug = this.activeSlug();
    if (!slug) {
      return;
    }

    const rawOrder = localStorage.getItem(this.getLastOrderStorageKey(slug));
    if (!rawOrder) {
      return;
    }

    const parsedOrder = JSON.parse(rawOrder) as { id: string };
    void this.router.navigate(['/', slug, 'order', parsedOrder.id]);
  }

  private resolveStorefront(slug: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.storefrontTenant.loadStore(slug).subscribe({
      next: () => {
        this.productsApi.getCatalog().subscribe({
          next: (response) => {
            this.products.set(response.data.items.filter((product) => product.isActive));
            if (this.cartItems().length === 0) {
              void this.router.navigate(['/', slug, 'cart']);
              return;
            }

            this.loading.set(false);
          },
          error: (error) => {
            this.products.set([]);
            this.loading.set(false);
            this.error.set(getApiErrorMessage(error, 'No fue posible cargar el catalogo de la tienda.'));
          }
        });
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
        this.error.set(this.storefrontTenant.error() ?? 'No fue posible cargar la tienda solicitada.');
      }
    });
  }

  private async initializeDeliveryAddressAutocomplete(): Promise<void> {
    const input = this.deliveryAddressInput?.nativeElement;
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
        this.applySelectedAddress();
      });
      this.placesLoading.set(false);
    } catch (error) {
      this.autocomplete = null;
      this.autocompleteInput = null;
      this.placesLoading.set(false);
      this.placesError.set(getApiErrorMessage(error, 'No fue posible cargar Google Places. Puedes escribir la direccion manualmente.'));
    }
  }

  private applySelectedAddress(): void {
    if (!this.autocomplete) {
      return;
    }

    const addressDraft = this.googlePlaces.extractAddressDraft(this.autocomplete);
    if (!addressDraft?.formattedAddress) {
      return;
    }

    this.selectedAddress.set(addressDraft);
    this.checkoutForm.patchValue({
      deliveryAddress: addressDraft.formattedAddress,
      deliveryPlaceId: addressDraft.placeId ?? '',
      deliveryLatitude: addressDraft.latitude !== null ? String(addressDraft.latitude) : '',
      deliveryLongitude: addressDraft.longitude !== null ? String(addressDraft.longitude) : ''
    });
  }

  private clearSelectedAddress(): void {
    this.selectedAddress.set(null);
    this.checkoutForm.patchValue({
      deliveryPlaceId: '',
      deliveryLatitude: '',
      deliveryLongitude: ''
    });
  }

  private destroyAutocompleteListener(): void {
    this.autocompleteListener?.remove();
    this.autocompleteListener = null;
  }

  private clearConfirmationCloseHandle(): void {
    if (this.confirmationCloseHandle !== null) {
      window.clearTimeout(this.confirmationCloseHandle);
      this.confirmationCloseHandle = null;
    }
  }

  private cancelConfirmationOpenFrame(): void {
    if (this.confirmationOpenFrame !== null) {
      window.cancelAnimationFrame(this.confirmationOpenFrame);
      this.confirmationOpenFrame = null;
    }
  }

  private shakeInvalidFields(): void {
    const invalidFieldNames = (['customerName', 'customerPhone', 'deliveryAddress'] as const)
      .filter((fieldName) => this.checkoutForm.controls[fieldName].invalid);
    const computedStyles = getComputedStyle(document.documentElement);
    const shakeDuration = (Number.parseFloat(computedStyles.getPropertyValue('--shake-dur-a')) || 80) * 2
      + (Number.parseFloat(computedStyles.getPropertyValue('--shake-dur-b')) || 60) * 2;

    invalidFieldNames.forEach((fieldName) => {
      const input = document.querySelector<HTMLElement>(`[data-checkout-field="${fieldName}"] .t-input`);
      if (!input) {
        return;
      }

      input.classList.remove('is-shaking');
      void input.offsetWidth;
      input.classList.add('is-shaking');

      const existingTimer = this.validationShakeTimers.get(fieldName);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      this.validationShakeTimers.set(fieldName, window.setTimeout(() => {
        input.classList.remove('is-shaking');
        this.validationShakeTimers.delete(fieldName);
      }, shakeDuration + 20));
    });
  }

  private getLastOrderStorageKey(slug: string): string {
    return `bien-helodias-last-order:${slug}`;
  }
}
