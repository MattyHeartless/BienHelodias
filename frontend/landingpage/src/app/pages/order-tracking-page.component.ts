import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderDto, OrderStatus } from '../core/models';

const LAST_ORDER_KEY = 'bien-helodias-last-order';

@Component({
  selector: 'app-order-tracking-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-tracking-page.component.html',
  styleUrl: './order-tracking-page.component.css'
})
export class OrderTrackingPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly order = signal<OrderDto | null>(null);
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

  constructor() {
    const rawOrder = localStorage.getItem(LAST_ORDER_KEY);
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!rawOrder || !orderId) {
      return;
    }

    const parsedOrder = JSON.parse(rawOrder) as OrderDto;
    if (parsedOrder.id === orderId) {
      this.order.set(parsedOrder);
    }
  }

  isCompleted(status: OrderStatus): boolean {
    const currentOrder = this.order();
    return currentOrder ? currentOrder.status >= status : false;
  }
}
