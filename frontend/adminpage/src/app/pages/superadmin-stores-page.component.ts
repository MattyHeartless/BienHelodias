import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StoreAdminDto, StoreDto, SubscriptionStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { SuperadminApiService } from '../services/superadmin-api.service';

const DEFAULT_ADMIN_PASSWORD = 'Admin123!';

@Component({
  selector: 'app-superadmin-stores-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './superadmin-stores-page.component.html',
  styleUrl: './superadmin-stores-page.component.css'
})
export class SuperadminStoresPageComponent {
  private readonly superadminApi = inject(SuperadminApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly stores = signal<StoreDto[]>([]);
  readonly createStoreModalOpen = signal(false);
  readonly editStoreModalOpen = signal(false);
  readonly adminsModalOpen = signal(false);
  readonly selectedStore = signal<StoreDto | null>(null);
  readonly loadingAdmins = signal(false);
  readonly savingAdmin = signal(false);
  readonly storeAdmins = signal<StoreAdminDto[]>([]);

  readonly storeForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    slug: ['', [Validators.required, Validators.minLength(3)]],
    subscriptionStatus: [SubscriptionStatus.Active, [Validators.required]]
  });

  readonly editStoreForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    slug: ['', [Validators.required, Validators.minLength(3)]],
    isActive: [true]
  });

  readonly adminForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: [DEFAULT_ADMIN_PASSWORD, [Validators.required, Validators.minLength(8)]]
  });

  readonly subscriptionOptions = [
    { label: 'Trial', value: SubscriptionStatus.Trial },
    { label: 'Active', value: SubscriptionStatus.Active },
    { label: 'Suspended', value: SubscriptionStatus.Suspended },
    { label: 'Cancelled', value: SubscriptionStatus.Cancelled }
  ];

  readonly orderedStores = computed(() =>
    [...this.stores()].sort((a, b) => a.name.localeCompare(b.name))
  );

  constructor() {
    this.load();
  }

  openCreateStoreModal(): void {
    this.error.set(null);
    this.feedback.set(null);
    this.createStoreModalOpen.set(true);
  }

  closeCreateStoreModal(): void {
    this.createStoreModalOpen.set(false);
    this.storeForm.reset({
      name: '',
      slug: '',
      subscriptionStatus: SubscriptionStatus.Active
    });
  }

  openEditStoreModal(store: StoreDto): void {
    this.error.set(null);
    this.feedback.set(null);
    this.selectedStore.set(store);
    this.editStoreForm.reset({
      name: store.name,
      slug: store.slug,
      isActive: store.isActive
    });
    this.editStoreModalOpen.set(true);
  }

  closeEditStoreModal(): void {
    this.editStoreModalOpen.set(false);
    this.selectedStore.set(null);
    this.editStoreForm.reset({
      name: '',
      slug: '',
      isActive: true
    });
  }

  openAdminsModal(store: StoreDto): void {
    this.error.set(null);
    this.feedback.set(null);
    this.selectedStore.set(store);
    this.storeAdmins.set([]);
    this.adminForm.reset({
      name: '',
      email: '',
      password: DEFAULT_ADMIN_PASSWORD
    });
    this.adminsModalOpen.set(true);
    this.loadStoreAdmins(store.id);
  }

  closeAdminsModal(): void {
    this.adminsModalOpen.set(false);
    this.selectedStore.set(null);
    this.storeAdmins.set([]);
    this.adminForm.reset({
      name: '',
      email: '',
      password: DEFAULT_ADMIN_PASSWORD
    });
    this.savingAdmin.set(false);
  }

  load(clearFeedback = true): void {
    this.loading.set(true);
    this.error.set(null);
    if (clearFeedback) {
      this.feedback.set(null);
    }

    this.superadminApi.getStores().subscribe({
      next: (response) => {
        this.stores.set(response.data.items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar las tiendas.'));
        this.loading.set(false);
      }
    });
  }

  createStore(): void {
    this.storeForm.markAllAsTouched();
    if (this.storeForm.invalid) {
      return;
    }

    this.superadminApi.createStore(this.storeForm.getRawValue()).subscribe({
      next: (response) => {
        this.feedback.set(`Tienda creada: ${response.data.name}`);
        this.closeCreateStoreModal();
        this.load(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible crear la tienda.'));
      }
    });
  }

  saveStoreChanges(): void {
    const store = this.selectedStore();
    if (!store) {
      return;
    }

    this.editStoreForm.markAllAsTouched();
    if (this.editStoreForm.invalid) {
      return;
    }

    this.superadminApi.updateStore(store.id, this.editStoreForm.getRawValue()).subscribe({
      next: (response) => {
        this.feedback.set(`Licorería actualizada: ${response.data.name}`);
        this.closeEditStoreModal();
        this.load(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar la licorería.'));
      }
    });
  }

  registerAdmin(): void {
    const store = this.selectedStore();
    if (!store) {
      return;
    }

    this.error.set(null);
    this.feedback.set(null);
    this.adminForm.markAllAsTouched();
    if (this.adminForm.invalid) {
      this.error.set('Completa nombre, correo valido y una contrasena de al menos 8 caracteres.');
      return;
    }

    const formValue = this.adminForm.getRawValue();
    const password = formValue.password.trim() || DEFAULT_ADMIN_PASSWORD;

    this.savingAdmin.set(true);
    this.superadminApi.registerAdmin({
      ...formValue,
      password,
      storeId: store.id
    }).subscribe({
      next: () => {
        this.feedback.set(`Administrador registrado para ${store.name}.`);
        this.adminForm.reset({
          name: '',
          email: '',
          password: DEFAULT_ADMIN_PASSWORD
        });
        this.savingAdmin.set(false);
        this.loadStoreAdmins(store.id);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible registrar el administrador.'));
        this.savingAdmin.set(false);
      }
    });
  }

  loadStoreAdmins(storeId: string): void {
    this.loadingAdmins.set(true);

    this.superadminApi.getStoreAdmins(storeId).subscribe({
      next: (response) => {
        this.storeAdmins.set(response.data);
        this.loadingAdmins.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar los administradores.'));
        this.loadingAdmins.set(false);
      }
    });
  }

  updateSubscription(storeId: string, subscriptionStatus: SubscriptionStatus): void {
    this.superadminApi.updateSubscription(storeId, subscriptionStatus).subscribe({
      next: (response) => {
        this.feedback.set(`Suscripcion actualizada para ${response.data.name}.`);
        this.load(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar la suscripcion.'));
      }
    });
  }
}
