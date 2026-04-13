import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderDto, OrderStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { StoreAdminApiService } from '../services/store-admin-api.service';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent {
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly orders = signal<OrderDto[]>([]);
  readonly selectedOrder = signal<OrderDto | null>(null);

  readonly summary = computed(() => ({
    total: this.orders().length,
    revenue: this.orders().reduce((acc, order) => acc + order.total, 0),
    pending: this.orders().filter((order) => order.status === OrderStatus.Pending).length
  }));

  private readonly orderFlow = [
    { status: OrderStatus.Pending, label: 'Pedido recibido', description: 'El pedido entro al sistema.' },
    { status: OrderStatus.Accepted, label: 'Pedido aceptado', description: 'La tienda confirmo la preparacion.' },
    { status: OrderStatus.Preparing, label: 'En preparacion', description: 'El equipo esta armando el pedido.' },
    { status: OrderStatus.Ready, label: 'Listo para salir', description: 'El pedido ya puede despacharse.' },
    { status: OrderStatus.OnTheWay, label: 'En camino', description: 'El pedido va rumbo al cliente.' },
    { status: OrderStatus.Delivered, label: 'Entregado', description: 'La entrega fue completada.' }
  ];

  constructor() {
    this.loadOrders();
    this.route.paramMap.subscribe((params) => {
      const orderId = params.get('orderId');
      if (orderId) {
        this.loadOrderDetail(orderId);
      }
    });
  }

  orderStatusLabel(status: OrderStatus): string {
    return (
      {
        [OrderStatus.Pending]: 'Pendiente',
        [OrderStatus.Accepted]: 'Aceptado',
        [OrderStatus.Preparing]: 'Preparando',
        [OrderStatus.Ready]: 'Listo',
        [OrderStatus.OnTheWay]: 'En camino',
        [OrderStatus.Delivered]: 'Entregado',
        [OrderStatus.Cancelled]: 'Cancelado'
      }[status] ?? 'Sin estado'
    );
  }

  orderTimeline(order: OrderDto): Array<{
    label: string;
    description: string;
    state: 'complete' | 'current' | 'upcoming' | 'cancelled';
    timestamp: string | null;
  }> {
    if (order.status === OrderStatus.Cancelled) {
      return [
        {
          label: 'Pedido recibido',
          description: 'El pedido entro al sistema.',
          state: 'complete',
          timestamp: order.createdAtUtc
        },
        {
          label: 'Pedido cancelado',
          description: 'La operacion fue detenida antes de completarse.',
          state: 'cancelled',
          timestamp: order.updatedAtUtc
        }
      ];
    }

    const currentIndex = this.orderFlow.findIndex((step) => step.status === order.status);

    return this.orderFlow.map((step, index) => ({
      label: step.label,
      description: step.description,
      state: index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming',
      timestamp:
        index === 0
          ? order.createdAtUtc
          : index === currentIndex || (index === this.orderFlow.length - 1 && order.status === OrderStatus.Delivered)
            ? order.updatedAtUtc
            : null
    }));
  }

  loadOrders(): void {
    this.loading.set(true);
    this.error.set(null);

    this.storeAdminApi.getOrders().subscribe({
      next: (response) => {
        this.orders.set(response.data.items);
        this.loading.set(false);

        const routeOrderId = this.route.snapshot.paramMap.get('orderId');
        if (routeOrderId) {
          this.loadOrderDetail(routeOrderId);
          return;
        }

        const firstOrder = response.data.items[0];
        if (firstOrder) {
          this.selectedOrder.set(firstOrder);
          void this.router.navigate(['/dashboard/orders', firstOrder.id], { replaceUrl: true });
        }
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar los pedidos.'));
        this.loading.set(false);
      }
    });
  }

  selectOrder(orderId: string): void {
    void this.router.navigate(['/dashboard/orders', orderId]);
  }

  private loadOrderDetail(orderId: string): void {
    this.detailLoading.set(true);

    this.storeAdminApi.getOrder(orderId).subscribe({
      next: (response) => {
        this.selectedOrder.set(response.data);
        this.detailLoading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el detalle del pedido.'));
        this.detailLoading.set(false);
      }
    });
  }
}
