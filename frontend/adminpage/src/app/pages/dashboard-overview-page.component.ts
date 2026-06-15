import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { NotificationUiService } from '../core/notification-ui.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';
import { SuperadminApiService } from '../services/superadmin-api.service';

@Component({
  selector: 'app-dashboard-overview-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './dashboard-overview-page.component.html',
  styleUrl: './dashboard-overview-page.component.css'
})
export class DashboardOverviewPageComponent {
  private readonly session = inject(AdminSessionService);
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly superadminApi = inject(SuperadminApiService);
  private readonly notifications = inject(NotificationUiService);

  readonly role = this.session.role;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly dashboard = signal<DashboardDto | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly orders = signal<OrderDto[]>([]);
  readonly stores = signal<StoreDto[]>([]);

  readonly isSuperAdmin = computed(() => this.role() === AppRole.SuperAdmin);
  readonly storeMetrics = computed(() => [
    { label: 'Productos', value: this.dashboard()?.totalProducts ?? 0, icon: 'inventory_2' },
    { label: 'Activos', value: this.dashboard()?.activeProducts ?? 0, icon: 'visibility' },
    { label: 'Pedidos', value: this.dashboard()?.totalOrders ?? 0, icon: 'receipt_long' },
    { label: 'Pendientes', value: this.dashboard()?.pendingOrders ?? 0, icon: 'schedule' },
    { label: 'Listos', value: this.dashboard()?.readyOrders ?? 0, icon: 'package_2' },
    { label: 'En camino', value: this.dashboard()?.onTheWayOrders ?? 0, icon: 'local_shipping' },
    { label: 'Revenue', value: this.dashboard()?.revenueInOrders ?? 0, currency: true, icon: 'payments' }
  ]);

  readonly latestOrders = computed(() => this.orders().slice(0, 5));
  readonly lowStockProducts = computed(() =>
    [...this.products()]
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 4)
  );
  readonly superAdminMetrics = computed(() => {
    const stores = this.stores();

    return [
      { label: 'Licorerías', value: stores.length, icon: 'storefront' },
      { label: 'Activas', value: stores.filter((store) => store.isActive).length, icon: 'check_circle' },
      { label: 'Trial', value: stores.filter((store) => store.subscriptionStatus === SubscriptionStatus.Trial).length, icon: 'rocket_launch' },
      { label: 'Suspendidas', value: stores.filter((store) => store.subscriptionStatus === SubscriptionStatus.Suspended).length, icon: 'pause_circle' }
    ];
  });
  readonly recentStores = computed(() =>
    [...this.stores()]
      .sort((a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime())
      .slice(0, 5)
  );
  readonly statusCards = computed(() => [
    {
      label: 'Suscripciones activas',
      value: this.stores().filter((store) => store.subscriptionStatus === SubscriptionStatus.Active).length,
      tone: 'primary'
    },
    {
      label: 'En trial',
      value: this.stores().filter((store) => store.subscriptionStatus === SubscriptionStatus.Trial).length,
      tone: 'neutral'
    },
    {
      label: 'Canceladas',
      value: this.stores().filter((store) => store.subscriptionStatus === SubscriptionStatus.Cancelled).length,
      tone: 'warn'
    }
  ]);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.isSuperAdmin()) {
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
        const message = getApiErrorMessage(error, 'No fue posible cargar el dashboard.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.loading.set(false);
      }
    });
  }
}
