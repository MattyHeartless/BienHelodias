import { CommonModule } from '@angular/common';
import { Component, ElementRef, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StoreAdminDto, StoreDto, SubscriptionStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { shakeInvalidFormControls } from '../core/form-error-shake.util';
import { NotificationUiService } from '../core/notification-ui.service';
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
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly superadminApi = inject(SuperadminApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationUiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly stores = signal<StoreDto[]>([]);
  readonly createStoreModalOpen = signal(false);
  readonly createStoreModalActive = signal(false);
  readonly createStoreModalClosing = signal(false);
  readonly editStoreModalOpen = signal(false);
  readonly editStoreModalActive = signal(false);
  readonly editStoreModalClosing = signal(false);
  readonly adminsModalOpen = signal(false);
  readonly adminsModalActive = signal(false);
  readonly adminsModalClosing = signal(false);
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
    this.openAnimatedModal(this.createStoreModalOpen, this.createStoreModalActive, this.createStoreModalClosing);
  }

  closeCreateStoreModal(): void {
    this.closeAnimatedModal(this.createStoreModalOpen, this.createStoreModalActive, this.createStoreModalClosing, () => {
      this.storeForm.reset({
        name: '',
        slug: '',
        subscriptionStatus: SubscriptionStatus.Active
      });
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
    this.openAnimatedModal(this.editStoreModalOpen, this.editStoreModalActive, this.editStoreModalClosing);
  }

  closeEditStoreModal(): void {
    this.closeAnimatedModal(this.editStoreModalOpen, this.editStoreModalActive, this.editStoreModalClosing, () => {
      this.selectedStore.set(null);
      this.editStoreForm.reset({
        name: '',
        slug: '',
        isActive: true
      });
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
    this.openAnimatedModal(this.adminsModalOpen, this.adminsModalActive, this.adminsModalClosing);
    this.loadStoreAdmins(store.id);
  }

  closeAdminsModal(): void {
    this.closeAnimatedModal(this.adminsModalOpen, this.adminsModalActive, this.adminsModalClosing, () => {
      this.selectedStore.set(null);
      this.storeAdmins.set([]);
      this.adminForm.reset({
        name: '',
        email: '',
        password: DEFAULT_ADMIN_PASSWORD
      });
      this.savingAdmin.set(false);
    });
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
        const message = getApiErrorMessage(error, 'No fue posible cargar las tiendas.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.loading.set(false);
      }
    });
  }

  createStore(): void {
    this.storeForm.markAllAsTouched();
    if (this.storeForm.invalid) {
      shakeInvalidFormControls(this.host.nativeElement);
      return;
    }

    this.superadminApi.createStore(this.storeForm.getRawValue()).subscribe({
      next: (response) => {
        const message = `Tienda creada: ${response.data.name}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.closeCreateStoreModal();
        this.load(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible crear la tienda.');
        this.error.set(message);
        this.notifications.error({ summary: message });
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
      shakeInvalidFormControls(this.host.nativeElement);
      return;
    }

    this.superadminApi.updateStore(store.id, this.editStoreForm.getRawValue()).subscribe({
      next: (response) => {
        const message = `Licorería actualizada: ${response.data.name}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.closeEditStoreModal();
        this.load(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible actualizar la licorería.');
        this.error.set(message);
        this.notifications.error({ summary: message });
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
      const message = 'Completa nombre, correo valido y una contrasena de al menos 8 caracteres.';
      this.error.set(message);
      shakeInvalidFormControls(this.host.nativeElement);
      this.notifications.error({ summary: message });
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
        const message = `Administrador registrado para ${store.name}.`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.adminForm.reset({
          name: '',
          email: '',
          password: DEFAULT_ADMIN_PASSWORD
        });
        this.savingAdmin.set(false);
        this.loadStoreAdmins(store.id);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible registrar el administrador.');
        this.error.set(message);
        this.notifications.error({ summary: message });
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
        const message = getApiErrorMessage(error, 'No fue posible cargar los administradores.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.loadingAdmins.set(false);
      }
    });
  }

  updateSubscription(storeId: string, subscriptionStatus: SubscriptionStatus): void {
    this.superadminApi.updateSubscription(storeId, subscriptionStatus).subscribe({
      next: (response) => {
        const message = `Suscripcion actualizada para ${response.data.name}.`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.load(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible actualizar la suscripcion.');
        this.error.set(message);
        this.notifications.error({ summary: message });
      }
    });
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
}
