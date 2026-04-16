import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { BannerDto, DeliveryAvailability, DeliveryUserDto, StoreDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { StoreAdminApiService } from '../services/store-admin-api.service';

@Component({
  selector: 'app-store-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  templateUrl: './store-settings-page.component.html',
  styleUrl: './store-settings-page.component.css'
})
export class StoreSettingsPageComponent {
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = signal(true);
  readonly submittingWelcome = signal(false);
  readonly submittingBanner = signal(false);
  readonly submittingDeliveryUser = signal(false);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly store = signal<StoreDto | null>(null);
  readonly banners = signal<BannerDto[]>([]);
  readonly deliveryUsers = signal<DeliveryUserDto[]>([]);
  readonly bannerModalOpen = signal(false);
  readonly deliveryUserModalOpen = signal(false);
  readonly editingBannerId = signal<string | null>(null);
  readonly deliveryAvailability = DeliveryAvailability;

  readonly welcomeForm = this.formBuilder.nonNullable.group({
    welcomePhrase: ['', [Validators.maxLength(280)]]
  });

  readonly bannerForm = this.formBuilder.nonNullable.group({
    header: ['', [Validators.required, Validators.minLength(2)]],
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(6)]],
    wildcard: [''],
    expirationDate: [''],
    status: [true, [Validators.required]]
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

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.storeAdminApi.getMyStore().subscribe({
      next: (response) => {
        this.store.set(response.data);
        this.welcomeForm.reset({
          welcomePhrase: response.data.welcomePhrase ?? ''
        });
        this.loadStoreResources();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar los datos de la tienda.'));
        this.loading.set(false);
      }
    });
  }

  loadStoreResources(): void {
    forkJoin({
      banners: this.storeAdminApi.getBanners(),
      deliveryUsers: this.storeAdminApi.getDeliveryUsers()
    }).subscribe({
      next: (response) => {
        this.banners.set(response.banners.data.items);
        this.deliveryUsers.set(response.deliveryUsers.data);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar la configuracion de la tienda.'));
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
      return;
    }

    this.submittingWelcome.set(true);
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.updateMyStore({
      name: store.name,
      slug: store.slug,
      isActive: store.isActive,
      welcomePhrase: this.welcomeForm.getRawValue().welcomePhrase.trim() || null
    }).subscribe({
      next: (response) => {
        this.store.set(response.data);
        this.welcomeForm.reset({
          welcomePhrase: response.data.welcomePhrase ?? ''
        });
        this.feedback.set('Frase de bienvenida actualizada.');
        this.submittingWelcome.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar la frase de bienvenida.'));
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
      status: true
    });
    this.bannerModalOpen.set(true);
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
      status: banner.status
    });
    this.bannerModalOpen.set(true);
  }

  closeBannerModal(): void {
    this.bannerModalOpen.set(false);
    this.editingBannerId.set(null);
    this.bannerForm.reset({
      header: '',
      title: '',
      description: '',
      wildcard: '',
      expirationDate: '',
      status: true
    });
  }

  saveBanner(): void {
    this.bannerForm.markAllAsTouched();
    if (this.bannerForm.invalid || this.submittingBanner()) {
      return;
    }

    this.submittingBanner.set(true);
    this.error.set(null);
    this.feedback.set(null);

    const values = this.bannerForm.getRawValue();
    const request = {
      header: values.header,
      title: values.title,
      description: values.description,
      wildcard: values.wildcard.trim() || null,
      expirationDate: values.expirationDate || null,
      status: values.status
    };

    const operation = this.isEditingBanner()
      ? this.storeAdminApi.updateBanner(this.editingBannerId()!, request)
      : this.storeAdminApi.createBanner(request);

    operation.subscribe({
      next: (response) => {
        this.feedback.set(this.isEditingBanner() ? `Banner actualizado: ${response.data.title}` : `Banner creado: ${response.data.title}`);
        this.closeBannerModal();
        this.loadStoreResources();
        this.submittingBanner.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, this.isEditingBanner() ? 'No fue posible actualizar el banner.' : 'No fue posible crear el banner.'));
        this.submittingBanner.set(false);
      }
    });
  }

  toggleBannerStatus(banner: BannerDto): void {
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.updateBannerStatus(banner.bannerId, !banner.status).subscribe({
      next: (response) => {
        this.feedback.set(`Estado actualizado: ${response.data.title}`);
        this.loadStoreResources();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar el estado del banner.'));
      }
    });
  }

  deleteBanner(banner: BannerDto): void {
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.deleteBanner(banner.bannerId).subscribe({
      next: () => {
        this.feedback.set(`Banner eliminado: ${banner.title}`);
        if (this.editingBannerId() === banner.bannerId) {
          this.closeBannerModal();
        }
        this.loadStoreResources();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible eliminar el banner.'));
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
    this.deliveryUserModalOpen.set(true);
  }

  closeDeliveryUserModal(): void {
    this.deliveryUserModalOpen.set(false);
    this.deliveryUserForm.reset({
      name: '',
      email: '',
      phone: '',
      password: ''
    });
  }

  saveDeliveryUser(): void {
    this.deliveryUserForm.markAllAsTouched();
    if (this.deliveryUserForm.invalid || this.submittingDeliveryUser()) {
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
        this.feedback.set(`Repartidor dado de alta: ${values.name}`);
        this.closeDeliveryUserModal();
        this.loadStoreResources();
        this.submittingDeliveryUser.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible dar de alta al repartidor.'));
        this.submittingDeliveryUser.set(false);
      }
    });
  }

  toggleDeliveryUserStatus(deliveryUser: DeliveryUserDto): void {
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.updateDeliveryUserStatus(deliveryUser.id, !deliveryUser.isActive).subscribe({
      next: (response) => {
        this.feedback.set(`Estado de repartidor actualizado: ${response.data.fullName}`);
        this.loadStoreResources();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar el estado del repartidor.'));
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
}
