import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDto, OrderStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { OrdersApiService } from '../services/orders-api.service';
import { StorefrontTenantService } from '../services/storefront-tenant.service';

@Component({
  selector: 'app-order-tracking-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-tracking-page.component.html',
  styleUrl: './order-tracking-page.component.css'
})
export class OrderTrackingPageComponent implements OnDestroy {
  private static readonly POLL_INTERVAL_MS = 15000;
  private readonly route = inject(ActivatedRoute);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly storefrontTenant = inject(StorefrontTenantService);
  private pollHandle: ReturnType<typeof window.setInterval> | null = null;
  private statusChangeHandle: ReturnType<typeof window.setTimeout> | null = null;

  readonly order = signal<OrderDto | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly statusJustChanged = signal(false);
  readonly storeName = computed(() => this.storefrontTenant.store()?.name ?? 'Licoreria');
  readonly activeSlug = signal<string | null>(null);
  readonly activeOrderId = signal<string | null>(null);
  readonly steps = [
    { label: 'Pedido recibido', status: OrderStatus.Pending },
    { label: 'Aceptado', status: OrderStatus.Accepted },
    { label: 'Preparando', status: OrderStatus.Preparing },
    { label: 'Listo', status: OrderStatus.Ready },
    { label: 'En camino', status: OrderStatus.OnTheWay },
    { label: 'Entregado', status: OrderStatus.Delivered }
  ];

  readonly statusLabel = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) {
      return 'Sin datos';
    }

    return this.steps.find((step) => step.status === currentOrder.status)?.label ?? 'Cancelado';
  });

  readonly currentStepIndex = computed(() => {
    const currentOrder = this.order();
    if (!currentOrder) {
      return -1;
    }

    return this.steps.findIndex((step) => step.status === currentOrder.status);
  });

  readonly isOnTheWay = computed(() => this.order()?.status === OrderStatus.OnTheWay);

  constructor() {
    const slug = this.route.snapshot.paramMap.get('slug');
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!slug || !orderId) {
      this.loading.set(false);
      return;
    }

    this.activeSlug.set(slug);
    this.activeOrderId.set(orderId);

    const rawOrder = localStorage.getItem(this.getLastOrderStorageKey(slug));
    if (!rawOrder) {
      this.order.set(null);
    } else {
      const parsedOrder = JSON.parse(rawOrder) as OrderDto;
      if (parsedOrder.id === orderId) {
        this.order.set(parsedOrder);
      }
    }

    this.storefrontTenant.loadStore(slug).subscribe({
      next: () => {
        this.fetchTracking();
        this.startPolling();
      },
      error: () => {
        this.loading.set(false);
        this.error.set(this.storefrontTenant.error() ?? 'No fue posible cargar la tienda.');
      }
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.clearStatusChangeHandle();
  }

  isCompleted(status: OrderStatus): boolean {
    const currentOrder = this.order();
    return currentOrder ? currentOrder.status >= status : false;
  }

  private fetchTracking(): void {
    const orderId = this.activeOrderId();
    const slug = this.activeSlug();
    if (!orderId || !slug) {
      this.loading.set(false);
      return;
    }

    this.ordersApi.getTracking(orderId).subscribe({
      next: (response) => {
        const previousStatus = this.order()?.status;
        this.order.set(response.data);
        if (previousStatus !== undefined && previousStatus !== response.data.status) {
          this.triggerStatusChangeAnimation();
        }
        localStorage.setItem(this.getLastOrderStorageKey(slug), JSON.stringify(response.data));
        this.error.set(null);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible consultar el estado actual del pedido.'));
        this.loading.set(false);
      }
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollHandle = window.setInterval(() => this.fetchTracking(), OrderTrackingPageComponent.POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      window.clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private triggerStatusChangeAnimation(): void {
    this.clearStatusChangeHandle();
    this.statusJustChanged.set(true);
    this.statusChangeHandle = window.setTimeout(() => {
      this.statusJustChanged.set(false);
      this.statusChangeHandle = null;
    }, 2200);
  }

  private clearStatusChangeHandle(): void {
    if (this.statusChangeHandle !== null) {
      window.clearTimeout(this.statusChangeHandle);
      this.statusChangeHandle = null;
    }
  }

  private getLastOrderStorageKey(slug: string): string {
    return `bien-helodias-last-order:${slug}`;
  }
}
