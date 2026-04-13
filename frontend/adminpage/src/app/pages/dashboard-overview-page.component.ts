import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AppRole,
  DashboardDto,
  OrderDto,
  ProductDto,
  StoreDto,
  SubscriptionStatus
} from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { AdminSessionService } from '../core/admin-session.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';
import { SuperadminApiService } from '../services/superadmin-api.service';

@Component({
  selector: 'app-dashboard-overview-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './dashboard-overview-page.component.html',
  styleUrl: './dashboard-overview-page.component.css'
})
export class DashboardOverviewPageComponent {
  private readonly session = inject(AdminSessionService);
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly superadminApi = inject(SuperadminApiService);
  private readonly formBuilder = inject(FormBuilder);

  readonly role = this.session.role;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly dashboard = signal<DashboardDto | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly orders = signal<OrderDto[]>([]);
  readonly stores = signal<StoreDto[]>([]);

  readonly storeForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    slug: ['', [Validators.required, Validators.minLength(3)]],
    subscriptionStatus: [SubscriptionStatus.Active, [Validators.required]]
  });

  readonly adminForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['Admin123!', [Validators.required, Validators.minLength(8)]],
    storeId: ['', [Validators.required]]
  });

  readonly isSuperAdmin = computed(() => this.role() === AppRole.SuperAdmin);
  readonly subscriptionOptions = [
    { label: 'Trial', value: SubscriptionStatus.Trial },
    { label: 'Active', value: SubscriptionStatus.Active },
    { label: 'Suspended', value: SubscriptionStatus.Suspended },
    { label: 'Cancelled', value: SubscriptionStatus.Cancelled }
  ];

  readonly storeMetrics = computed(() => [
    { label: 'Productos', value: this.dashboard()?.totalProducts ?? 0 },
    { label: 'Activos', value: this.dashboard()?.activeProducts ?? 0 },
    { label: 'Pedidos', value: this.dashboard()?.totalOrders ?? 0 },
    { label: 'Pendientes', value: this.dashboard()?.pendingOrders ?? 0 },
    { label: 'Listos', value: this.dashboard()?.readyOrders ?? 0 },
    { label: 'En camino', value: this.dashboard()?.onTheWayOrders ?? 0 },
    { label: 'Revenue', value: this.dashboard()?.revenueInOrders ?? 0, currency: true }
  ]);

  readonly latestOrders = computed(() => this.orders().slice(0, 5));
  readonly lowStockProducts = computed(() =>
    [...this.products()]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 4)
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.feedback.set(null);

    if (this.isSuperAdmin()) {
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
      return;
    }

    forkJoin({
      dashboard: this.storeAdminApi.getDashboard(),
      products: this.storeAdminApi.getProducts(),
      orders: this.storeAdminApi.getOrders()
    }).subscribe({
      next: (response) => {
        this.dashboard.set(response.dashboard.data);
        this.products.set(response.products.data.items);
        this.orders.set(response.orders.data.items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el dashboard.'));
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
        this.storeForm.reset({
          name: '',
          slug: '',
          subscriptionStatus: SubscriptionStatus.Active
        });
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible crear la tienda.'));
      }
    });
  }

  createAdmin(): void {
    this.adminForm.markAllAsTouched();
    if (this.adminForm.invalid) {
      return;
    }

    this.superadminApi.registerAdmin(this.adminForm.getRawValue()).subscribe({
      next: () => {
        this.feedback.set('Administrador registrado correctamente.');
        this.adminForm.reset({
          name: '',
          email: '',
          password: 'Admin123!',
          storeId: ''
        });
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible registrar el administrador.'));
      }
    });
  }

  updateSubscription(storeId: string, subscriptionStatus: SubscriptionStatus): void {
    this.superadminApi.updateSubscription(storeId, subscriptionStatus).subscribe({
      next: (response) => {
        this.feedback.set(`Suscripcion actualizada para ${response.data.name}.`);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar la suscripcion.'));
      }
    });
  }
}
