import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DeliveryAvailability, DeliveryUserDto, OrderDto, OrderStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { DeliverySessionService } from '../core/delivery-session.service';
import { DeliveryApiService } from '../services/delivery-api.service';

@Component({
  selector: 'app-panel-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './panel-page.component.html',
  styleUrl: './panel-page.component.css'
})
export class PanelPageComponent {
  private readonly deliveryApi = inject(DeliveryApiService);
  private readonly session = inject(DeliverySessionService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly profile = signal<DeliveryUserDto | null>(null);
  readonly availableOrders = signal<OrderDto[]>([]);
  readonly myOrders = signal<OrderDto[]>([]);
  readonly selectedOrderId = signal<string | null>(null);
  readonly availability = signal(DeliveryAvailability.Unavailable);
  readonly availabilityOptions = [
    { label: 'No disponible', value: DeliveryAvailability.Unavailable },
    { label: 'Disponible', value: DeliveryAvailability.Available },
    { label: 'Ocupado', value: DeliveryAvailability.Busy }
  ];

  readonly email = this.session.email;
  readonly selectedOrder = computed(() => {
    const selectedOrderId = this.selectedOrderId();
    if (!selectedOrderId) {
      return null;
    }

    return [...this.myOrders(), ...this.availableOrders()].find((order) => order.id === selectedOrderId) ?? null;
  });
  readonly availabilityLabel = computed(
    () => this.availabilityOptions.find((option) => option.value === this.availability())?.label ?? 'Disponible'
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.feedback.set(null);

    forkJoin({
      available: this.deliveryApi.getAvailableOrders(),
      mine: this.deliveryApi.getMyOrders()
    }).subscribe({
      next: (response) => {
        this.availableOrders.set(response.available.data.items);
        this.myOrders.set(response.mine.data.items);
        this.syncSelectedOrder();
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el panel de reparto.'));
        this.loading.set(false);
      }
    });
  }

  updateAvailability(value: DeliveryAvailability): void {
    this.deliveryApi.updateAvailability(value).subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.availability.set(response.data.currentAvailability);
        this.feedback.set(`Disponibilidad actual: ${this.availabilityLabel()}`);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar la disponibilidad.'));
      }
    });
  }

  takeOrder(orderId: string): void {
    if (this.availability() !== DeliveryAvailability.Available) {
      this.error.set('Para tomar un pedido primero cambia tu estado a Disponible.');
      return;
    }

    this.deliveryApi.takeOrder(orderId).subscribe({
      next: () => {
        this.feedback.set('Pedido tomado correctamente.');
        this.availability.set(DeliveryAvailability.Busy);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible tomar el pedido.'));
      }
    });
  }

  releaseOrder(orderId: string): void {
    const order = this.myOrders().find((item) => item.id === orderId);
    if (order && !this.canRelease(order)) {
      this.error.set(`El pedido ${this.getOrderStatusLabel(order.status).toLowerCase()} ya no se puede liberar.`);
      return;
    }

    this.deliveryApi.releaseOrder(orderId).subscribe({
      next: () => {
        this.feedback.set('Pedido liberado correctamente.');
        this.availability.set(DeliveryAvailability.Available);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible liberar el pedido.'));
      }
    });
  }

  markDelivered(orderId: string): void {
    const order = this.myOrders().find((item) => item.id === orderId);
    if (order && !this.canMarkDelivered(order)) {
      this.error.set(`El pedido ${this.getOrderStatusLabel(order.status).toLowerCase()} ya no se puede marcar como entregado.`);
      return;
    }

    this.deliveryApi.markDelivered(orderId).subscribe({
      next: () => {
        this.feedback.set('Pedido marcado como entregado.');
        this.availability.set(DeliveryAvailability.Available);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible marcar el pedido como entregado.'));
      }
    });
  }

  logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  selectOrder(order: OrderDto): void {
    this.selectedOrderId.set(order.id);
  }

  closeOrderDetail(): void {
    this.selectedOrderId.set(null);
  }

  hasDeliveryCoordinates(order: OrderDto): boolean {
    return Number.isFinite(order.deliveryLatitude) && Number.isFinite(order.deliveryLongitude);
  }

  openGoogleMapsNavigation(order: OrderDto): void {
    if (!this.hasDeliveryCoordinates(order)) {
      return;
    }

    const destination = `${order.deliveryLatitude},${order.deliveryLongitude}`;
    const navigationUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving&dir_action=navigate`;
    window.open(navigationUrl, '_blank', 'noopener,noreferrer');
  }

  isSelected(orderId: string): boolean {
    return this.selectedOrderId() === orderId;
  }

  canRelease(order: OrderDto): boolean {
    return !this.isTerminalStatus(order.status);
  }

  canMarkDelivered(order: OrderDto): boolean {
    return !this.isTerminalStatus(order.status);
  }

  getOrderStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'Pendiente';
      case OrderStatus.Accepted:
        return 'Aceptado';
      case OrderStatus.Preparing:
        return 'En preparacion';
      case OrderStatus.Ready:
        return 'Listo';
      case OrderStatus.OnTheWay:
        return 'En camino';
      case OrderStatus.Delivered:
        return 'Entregado';
      case OrderStatus.Cancelled:
        return 'Cancelado';
      default:
        return 'Desconocido';
    }
  }

  private isTerminalStatus(status: OrderStatus): boolean {
    return status === OrderStatus.Delivered || status === OrderStatus.Cancelled;
  }

  private syncSelectedOrder(): void {
    const selectedOrderId = this.selectedOrderId();
    const allOrders = [...this.myOrders(), ...this.availableOrders()];

    if (!selectedOrderId) {
      return;
    }

    if (allOrders.some((order) => order.id === selectedOrderId)) {
      return;
    }

    this.selectedOrderId.set(null);
  }
}
