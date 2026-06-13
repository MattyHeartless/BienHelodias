import { CommonModule, CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DeliveryAvailability, DeliveryUserDto, OrderDto, OrderStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { DeliverySessionService } from '../core/delivery-session.service';
import { NotificationUiService } from '../core/notification-ui.service';
import { DeliveryApiService } from '../services/delivery-api.service';
import { PushNotificationService } from '../services/push-notification.service';

@Component({
  selector: 'app-panel-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe],
  templateUrl: './panel-page.component.html',
  styleUrl: './panel-page.component.css'
})
export class PanelPageComponent {
  private readonly document = inject(DOCUMENT);
  private readonly deliveryApi = inject(DeliveryApiService);
  private readonly pushNotifications = inject(PushNotificationService);
  private readonly session = inject(DeliverySessionService);
  private readonly notifications = inject(NotificationUiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly profile = signal<DeliveryUserDto | null>(null);
  readonly availableOrders = signal<OrderDto[]>([]);
  readonly myOrders = signal<OrderDto[]>([]);
  readonly selectedOrderId = signal<string | null>(null);
  readonly availability = signal(DeliveryAvailability.Unavailable);
  readonly availabilityOptions = [
    { label: 'Fuera de jugada', value: DeliveryAvailability.Unavailable },
    { label: 'Al tiro', value: DeliveryAvailability.Available },
    { label: 'Ocupado', value: DeliveryAvailability.Busy }
  ];

  readonly email = this.session.email;
  readonly pushState = this.pushNotifications.state;
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
    effect(() => {
      this.document.body.classList.toggle('modal-open', Boolean(this.selectedOrder()));
    });

    this.pushNotifications.initialize();

    this.route.queryParamMap.subscribe((params) => {
      this.selectedOrderId.set(params.get('orderId'));
    });

    this.load();
  }

  load(): void {
    this.loading.set(true);

    forkJoin({
      profile: this.deliveryApi.getCurrentProfile(),
      available: this.deliveryApi.getAvailableOrders(),
      mine: this.deliveryApi.getMyOrders()
    }).subscribe({
      next: (response) => {
        this.profile.set(response.profile.data);
        this.availability.set(response.profile.data.currentAvailability);
        this.availableOrders.set(response.available.data.items);
        this.myOrders.set(response.mine.data.items);
        this.syncSelectedOrder();
        this.loading.set(false);
      },
      error: (error) => {
        this.notifications.error({
          summary: getApiErrorMessage(error, 'No se pudo cargar el panel')
        });
        this.loading.set(false);
      }
    });
  }

  updateAvailability(value: DeliveryAvailability): void {
    this.deliveryApi.updateAvailability(value).subscribe({
      next: (response) => {
        this.profile.set(response.data);
        this.availability.set(response.data.currentAvailability);
        this.notifications.info({
          summary: `Andas ${this.availabilityLabel().toLowerCase()}`
        });
      },
      error: (error) => {
        this.notifications.error({
          summary: getApiErrorMessage(error, 'No se pudo mover tu disponibilidad')
        });
      }
    });
  }

  takeOrder(orderId: string): void {
    if (this.availability() !== DeliveryAvailability.Available) {
      this.notifications.warning({
        summary: 'Primero ponte disponible'
      });
      return;
    }

    this.deliveryApi.takeOrder(orderId).subscribe({
      next: () => {
        this.notifications.success({
          summary: 'Pedido asignado'
        });
        this.load();
      },
      error: (error) => {
        this.notifications.error({
          summary: getApiErrorMessage(error, 'No se pudo tomar el pedido')
        });
      }
    });
  }

  releaseOrder(orderId: string): void {
    const order = this.myOrders().find((item) => item.id === orderId);
    if (order && !this.canRelease(order)) {
      this.notifications.warning({
        summary: 'Ese pedido ya no se puede soltar'
      });
      return;
    }

    this.deliveryApi.releaseOrder(orderId).subscribe({
      next: () => {
        this.notifications.info({
          summary: 'Pedido liberado'
        });
        this.load();
      },
      error: (error) => {
        this.notifications.error({
          summary: getApiErrorMessage(error, 'No se pudo liberar el pedido')
        });
      }
    });
  }

  markDelivered(orderId: string): void {
    const order = this.myOrders().find((item) => item.id === orderId);
    if (order && !this.canMarkDelivered(order)) {
      this.notifications.warning({
        summary: 'Ese pedido ya no se puede cerrar'
      });
      return;
    }

    this.deliveryApi.markDelivered(orderId).subscribe({
      next: () => {
        this.notifications.success({
          summary: 'Pedido entregado'
        });
        this.load();
      },
      error: (error) => {
        this.notifications.error({
          summary: getApiErrorMessage(error, 'No se pudo cerrar el pedido')
        });
      }
    });
  }

  logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }

  enablePushNotifications(): void {
    void this.pushNotifications.subscribeCourierToPushNotifications();
  }

  disablePushNotifications(): void {
    void this.pushNotifications.unsubscribeCurrentDevice();
  }

  selectOrder(order: OrderDto): void {
    this.selectedOrderId.set(order.id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { orderId: order.id },
      queryParamsHandling: 'merge'
    });
  }

  closeOrderDetail(): void {
    this.selectedOrderId.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { orderId: null },
      queryParamsHandling: 'merge'
    });
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

  getOrderUnitCount(order: OrderDto): number {
    return order.items.reduce((total, item) => total + item.quantity, 0);
  }

  getOrderStatusLabel(status: OrderStatus): string {
    switch (status) {
      case OrderStatus.Pending:
        return 'Ya cayó';
      case OrderStatus.Accepted:
        return 'Aceptado';
      case OrderStatus.Preparing:
        return 'Se está armando';
      case OrderStatus.Ready:
        return 'Bien helodia';
      case OrderStatus.OnTheWay:
        return 'En camino';
      case OrderStatus.Delivered:
        return 'Entregado';
      case OrderStatus.Cancelled:
        return 'Cancelado';
      default:
        return 'Sin estado';
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
