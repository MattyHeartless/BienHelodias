import { CommonModule, CurrencyPipe, DatePipe, DOCUMENT } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DeliveryAvailability, DeliveryUserDto, OrderDto, OrderStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { DeliverySessionService } from '../core/delivery-session.service';
import { NotificationUiService } from '../core/notification-ui.service';
import { DeliveryApiService } from '../services/delivery-api.service';
import { PushNotificationService } from '../services/push-notification.service';
import { AnimatedNumberComponent } from '../shared/animated-number.component';

type PanelView = 'orders' | 'routes';

type RouteLocationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; latitude: number; longitude: number; accuracy: number | null }
  | { status: 'error'; message: string };

@Component({
  selector: 'app-panel-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, AnimatedNumberComponent],
  templateUrl: './panel-page.component.html',
  styleUrl: './panel-page.component.css'
})
export class PanelPageComponent implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly deliveryApi = inject(DeliveryApiService);
  private readonly pushNotifications = inject(PushNotificationService);
  private readonly session = inject(DeliverySessionService);
  private readonly notifications = inject(NotificationUiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  readonly menuOpen = signal(false);
  readonly availabilityOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly desktopAvailabilityOpen = signal(false);
  readonly desktopAvailabilityClosing = signal(false);
  readonly desktopNotificationsOpen = signal(false);
  readonly desktopNotificationsClosing = signal(false);
  readonly availableOrdersOpen = signal(true);
  readonly modalClosing = signal(false);
  readonly routeCompletionModalOpen = signal(false);
  readonly routeCompletionModalClosing = signal(false);
  readonly activeView = signal<PanelView>('orders');
  readonly showScrollTopFab = signal(false);
  readonly detailItemImageErrors = signal<Record<string, true>>({});
  readonly routeSelection = signal<Record<string, boolean>>({});
  readonly routeLocation = signal<RouteLocationState>({ status: 'idle' });
  readonly activeRouteOrderIds = signal<string[]>([]);
  readonly routeCompletionSelection = signal<Record<string, boolean>>({});
  readonly routeFinishing = signal(false);
  readonly profile = signal<DeliveryUserDto | null>(null);
  readonly availableOrders = signal<OrderDto[]>([]);
  readonly myOrders = signal<OrderDto[]>([]);
  readonly selectedOrderId = signal<string | null>(null);
  readonly availability = signal(DeliveryAvailability.Unavailable);
  readonly availabilityOptions = [
    { label: 'Fuera', value: DeliveryAvailability.Unavailable },
    { label: 'Al tiro', value: DeliveryAvailability.Available },
    { label: 'Ocupado', value: DeliveryAvailability.Busy }
  ];

  readonly email = this.session.email;
  readonly pushState = this.pushNotifications.state;
  readonly workspaceTitle = computed(() => this.profile()?.storeName?.trim() || 'Bien Helodias Reparto');
  private modalCloseTimer: number | null = null;
  private routeCompletionModalCloseTimer: number | null = null;
  private desktopAvailabilityCloseTimer: number | null = null;
  private desktopNotificationsCloseTimer: number | null = null;

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
  readonly pushSubscribeDisabled = computed(() => {
    const state = this.pushState();
    return state.isRegistering || state.availability !== 'supported' || (state.isSubscribed && state.backendSynchronized);
  });
  readonly pushSubscribeLabel = computed(() => {
    const state = this.pushState();
    if (state.isRegistering) {
      return 'Aguanta, se esta armando...';
    }

    if (state.isSubscribed && state.backendSynchronized) {
      return 'Avisos activos';
    }

    if (state.isSubscribed && !state.backendSynchronized) {
      return 'Terminar activacion';
    }

    return 'Quiero que me avisen';
  });
  readonly pushSubscribeCompactLabel = computed(() => {
    const state = this.pushState();
    if (state.isRegistering) {
      return 'Activando';
    }

    if (state.isSubscribed && state.backendSynchronized) {
      return 'Activos';
    }

    if (state.isSubscribed && !state.backendSynchronized) {
      return 'Finalizar';
    }

    return 'Activar';
  });
  readonly selectedRouteOrders = computed(() =>
    this.myOrders().filter((order) => this.routeSelection()[order.id] !== false)
  );
  readonly routePreviewOrders = computed(() => this.buildRoutePreview(this.selectedRouteOrders(), this.routeLocation()));
  readonly activeRouteOrders = computed(() => {
    const activeRouteOrderIds = new Set(this.activeRouteOrderIds());
    return this.myOrders().filter((order) => activeRouteOrderIds.has(order.id));
  });
  readonly selectedCompletionOrders = computed(() =>
    this.activeRouteOrders().filter((order) => this.routeCompletionSelection()[order.id] !== false)
  );
  readonly canNavigateRoute = computed(() => {
    const location = this.routeLocation();
    return location.status === 'ready' && this.routePreviewOrders().length > 0;
  });
  readonly canCompleteActiveRoute = computed(() => this.activeRouteOrders().length > 0);
  readonly googleMapsRouteUrl = computed(() => {
    const location = this.routeLocation();
    const ordered = this.routePreviewOrders();

    if (location.status !== 'ready' || ordered.length === 0) {
      return null;
    }

    return this.buildGoogleMapsRouteUrl(location.latitude, location.longitude, ordered);
  });

  constructor() {
    effect(() => {
      this.document.body.classList.toggle(
        'modal-open',
        Boolean(this.selectedOrder()) || this.menuOpen() || this.routeCompletionModalOpen()
      );
    });

    effect(() => {
      if (this.activeView() === 'routes' && this.routeLocation().status === 'idle') {
        this.requestCurrentLocation();
      }
    });

    this.pushNotifications.initialize();

    this.route.queryParamMap.subscribe((params) => {
      this.selectedOrderId.set(params.get('orderId'));
      this.activeView.set(params.get('view') === 'routes' ? 'routes' : 'orders');
    });

    this.load();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.desktopAvailabilityOpen()) {
      this.closeDesktopAvailability();
      return;
    }

    if (this.desktopNotificationsOpen()) {
      this.closeDesktopNotifications();
      return;
    }

    if (this.menuOpen()) {
      this.closeMenu();
      return;
    }

    if (this.routeCompletionModalOpen()) {
      this.closeRouteCompletionModal();
      return;
    }

    if (this.selectedOrder()) {
      this.closeOrderDetail();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const documentElement = this.document.documentElement;
    const scrollableHeight = documentElement.scrollHeight - window.innerHeight;

    if (scrollableHeight <= 0) {
      this.showScrollTopFab.set(false);
      return;
    }

    this.showScrollTopFab.set(window.scrollY / scrollableHeight >= 0.3);
  }

  ngOnDestroy(): void {
    this.clearModalCloseTimer();
    this.clearRouteCompletionModalCloseTimer();
    this.clearDesktopAvailabilityCloseTimer();
    this.clearDesktopNotificationsCloseTimer();
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
        this.syncRouteSelection();
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
    this.closeMenu();
    void this.session.logout().then(() => this.router.navigate(['/login']));
  }

  openMenu(): void {
    this.availabilityOpen.set(false);
    this.notificationsOpen.set(false);
    this.menuOpen.set(true);
  }

  closeMenu(): void {
    this.availabilityOpen.set(false);
    this.notificationsOpen.set(false);
    this.menuOpen.set(false);
  }

  toggleNotifications(): void {
    const nextOpen = !this.notificationsOpen();
    this.notificationsOpen.set(nextOpen);

    if (nextOpen) {
      this.availabilityOpen.set(false);
    }
  }

  toggleAvailability(): void {
    const nextOpen = !this.availabilityOpen();
    this.availabilityOpen.set(nextOpen);

    if (nextOpen) {
      this.notificationsOpen.set(false);
    }
  }

  toggleDesktopAvailability(): void {
    if (this.desktopAvailabilityOpen()) {
      this.closeDesktopAvailability();
      return;
    }

    this.clearDesktopNotificationsCloseTimer();
    this.desktopNotificationsClosing.set(false);
    this.desktopNotificationsOpen.set(false);
    this.clearDesktopAvailabilityCloseTimer();
    this.desktopAvailabilityClosing.set(false);
    this.desktopAvailabilityOpen.set(true);
  }

  closeDesktopAvailability(): void {
    if (!this.desktopAvailabilityOpen() || this.desktopAvailabilityClosing()) {
      return;
    }

    this.desktopAvailabilityClosing.set(true);
    this.desktopAvailabilityCloseTimer = window.setTimeout(() => {
      this.desktopAvailabilityCloseTimer = null;
      this.desktopAvailabilityClosing.set(false);
      this.desktopAvailabilityOpen.set(false);
    }, this.getDropdownCloseDurationMs());
  }

  toggleDesktopNotifications(): void {
    if (this.desktopNotificationsOpen()) {
      this.closeDesktopNotifications();
      return;
    }

    this.clearDesktopAvailabilityCloseTimer();
    this.desktopAvailabilityClosing.set(false);
    this.desktopAvailabilityOpen.set(false);
    this.clearDesktopNotificationsCloseTimer();
    this.desktopNotificationsClosing.set(false);
    this.desktopNotificationsOpen.set(true);
  }

  closeDesktopNotifications(): void {
    if (!this.desktopNotificationsOpen() || this.desktopNotificationsClosing()) {
      return;
    }

    this.desktopNotificationsClosing.set(true);
    this.desktopNotificationsCloseTimer = window.setTimeout(() => {
      this.desktopNotificationsCloseTimer = null;
      this.desktopNotificationsClosing.set(false);
      this.desktopNotificationsOpen.set(false);
    }, this.getDropdownCloseDurationMs());
  }

  toggleAvailableOrders(): void {
    this.availableOrdersOpen.update((open) => !open);
  }

  switchView(view: PanelView): void {
    if (this.activeView() === view) {
      this.closeMenu();
      return;
    }

    this.closeMenu();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view },
      queryParamsHandling: 'merge'
    });
  }

  enablePushNotifications(): void {
    if (this.pushSubscribeDisabled()) {
      return;
    }

    void this.pushNotifications.subscribeCourierToPushNotifications();
  }

  disablePushNotifications(): void {
    void this.pushNotifications.unsubscribeCurrentDevice();
  }

  isAvailabilityAvailable(): boolean {
    return this.availability() === DeliveryAvailability.Available;
  }

  isAvailabilityWarning(): boolean {
    return this.availability() === DeliveryAvailability.Busy;
  }

  isAvailabilityError(): boolean {
    return this.availability() === DeliveryAvailability.Unavailable;
  }

  isRouteOrderSelected(orderId: string): boolean {
    return this.routeSelection()[orderId] !== false;
  }

  toggleRouteOrder(orderId: string): void {
    this.routeSelection.update((selection) => ({
      ...selection,
      [orderId]: selection[orderId] === false
        ? true
        : false
    }));
  }

  requestCurrentLocation(): void {
    if (!('geolocation' in navigator)) {
      this.routeLocation.set({ status: 'error', message: 'Este dispositivo no deja sacar tu ubicacion.' });
      return;
    }

    this.routeLocation.set({ status: 'loading' });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.routeLocation.set({
          status: 'ready',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
        });
      },
      (error) => {
        this.routeLocation.set({
          status: 'error',
          message: this.getGeolocationErrorMessage(error)
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateRouteInGoogleMaps(): void {
    const routeUrl = this.googleMapsRouteUrl();

    if (!routeUrl) {
      return;
    }

    this.activeRouteOrderIds.set(this.routePreviewOrders().map((order) => order.id));
    window.open(routeUrl, '_blank', 'noopener,noreferrer');
  }

  openRouteCompletionModal(): void {
    if (!this.canCompleteActiveRoute()) {
      return;
    }

    this.clearRouteCompletionModalCloseTimer();
    this.routeCompletionModalClosing.set(false);
    this.routeCompletionSelection.set(
      Object.fromEntries(this.activeRouteOrders().map((order) => [order.id, true]))
    );
    this.routeCompletionModalOpen.set(true);
  }

  closeRouteCompletionModal(): void {
    if (this.routeFinishing() || !this.routeCompletionModalOpen() || this.routeCompletionModalClosing()) {
      return;
    }

    this.routeCompletionModalClosing.set(true);
    this.routeCompletionModalCloseTimer = window.setTimeout(() => {
      this.routeCompletionModalCloseTimer = null;
      this.routeCompletionModalClosing.set(false);
      this.routeCompletionModalOpen.set(false);
      this.routeCompletionSelection.set({});
    }, this.getModalCloseDurationMs());
  }

  isRouteCompletionOrderSelected(orderId: string): boolean {
    return this.routeCompletionSelection()[orderId] !== false;
  }

  toggleRouteCompletionOrder(orderId: string): void {
    this.routeCompletionSelection.update((selection) => ({
      ...selection,
      [orderId]: selection[orderId] === false ? true : false
    }));
  }

  markActiveRouteDelivered(): void {
    const routeOrders = this.selectedCompletionOrders();

    if (routeOrders.length === 0 || this.routeFinishing()) {
      return;
    }

    this.routeFinishing.set(true);
    forkJoin(routeOrders.map((order) => this.deliveryApi.markDelivered(order.id))).subscribe({
      next: () => {
        this.routeFinishing.set(false);
        this.routeCompletionModalClosing.set(false);
        this.routeCompletionModalOpen.set(false);
        this.activeRouteOrderIds.set([]);
        this.routeCompletionSelection.set({});
        this.notifications.success({
          summary: routeOrders.length === 1 ? 'Pedido entregado' : 'Pedidos entregados'
        });
        this.load();
      },
      error: (error) => {
        this.routeFinishing.set(false);
        this.notifications.error({
          summary: getApiErrorMessage(error, 'No se pudieron cerrar los pedidos')
        });
      }
    });
  }

  hasOrderItemImage(item: OrderDto['items'][number]): boolean {
    return Boolean(item.imageUrl && !this.detailItemImageErrors()[item.id]);
  }

  markOrderItemImageError(itemId: string): void {
    this.detailItemImageErrors.update((errors) => ({ ...errors, [itemId]: true }));
  }

  selectOrder(order: OrderDto): void {
    this.clearModalCloseTimer();
    this.modalClosing.set(false);
    this.detailItemImageErrors.set({});
    this.selectedOrderId.set(order.id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { orderId: order.id },
      queryParamsHandling: 'merge'
    });
  }

  closeOrderDetail(): void {
    if (!this.selectedOrder() || this.modalClosing()) {
      return;
    }

    this.modalClosing.set(true);
    this.modalCloseTimer = window.setTimeout(() => {
      this.modalCloseTimer = null;
      this.modalClosing.set(false);
      this.detailItemImageErrors.set({});
      this.selectedOrderId.set(null);
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { orderId: null },
        queryParamsHandling: 'merge'
      });
    }, this.getModalCloseDurationMs());
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
    this.detailItemImageErrors.set({});
  }

  private syncRouteSelection(): void {
    const currentSelection = this.routeSelection();
    const nextSelection: Record<string, boolean> = {};

    for (const order of this.myOrders()) {
      nextSelection[order.id] = currentSelection[order.id] !== false;
    }

    this.routeSelection.set(nextSelection);
  }

  private buildRoutePreview(orders: OrderDto[], location: RouteLocationState): OrderDto[] {
    if (orders.length <= 1 || location.status !== 'ready') {
      return orders;
    }

    const remaining = [...orders];
    const ordered: OrderDto[] = [];
    let currentLatitude = location.latitude;
    let currentLongitude = location.longitude;

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < remaining.length; index += 1) {
        const order = remaining[index];
        const distance = this.getDistanceKm(
          currentLatitude,
          currentLongitude,
          order.deliveryLatitude ?? currentLatitude,
          order.deliveryLongitude ?? currentLongitude
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }

      const [nearestOrder] = remaining.splice(nearestIndex, 1);
      ordered.push(nearestOrder);
      currentLatitude = nearestOrder.deliveryLatitude ?? currentLatitude;
      currentLongitude = nearestOrder.deliveryLongitude ?? currentLongitude;
    }

    return ordered;
  }

  private buildGoogleMapsRouteUrl(latitude: number, longitude: number, orders: OrderDto[]): string {
    const waypoints = orders
      .slice(0, -1)
      .map((order) => `${order.deliveryLatitude},${order.deliveryLongitude}`)
      .join('|');
    const destinationOrder = orders[orders.length - 1];
    const params = new URLSearchParams({
      api: '1',
      origin: `${latitude},${longitude}`,
      destination: `${destinationOrder.deliveryLatitude},${destinationOrder.deliveryLongitude}`,
      travelmode: 'driving'
    });

    if (waypoints) {
      params.set('waypoints', waypoints);
    } else {
      params.set('dir_action', 'navigate');
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  private getDistanceKm(originLatitude: number, originLongitude: number, destinationLatitude: number, destinationLongitude: number): number {
    const earthRadiusKm = 6371;
    const dLat = this.toRadians(destinationLatitude - originLatitude);
    const dLng = this.toRadians(destinationLongitude - originLongitude);
    const lat1 = this.toRadians(originLatitude);
    const lat2 = this.toRadians(destinationLatitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

    return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private getGeolocationErrorMessage(error: GeolocationPositionError): string {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Activa tu ubicacion para poder armar la ruta.';
      case error.POSITION_UNAVAILABLE:
        return 'No pude ubicarte ahorita. Intenta otra vez.';
      case error.TIMEOUT:
        return 'La ubicacion tardo demasiado. Reintenta.';
      default:
        return 'No se pudo conseguir tu ubicacion.';
    }
  }

  private clearModalCloseTimer(): void {
    if (this.modalCloseTimer === null) {
      return;
    }

    window.clearTimeout(this.modalCloseTimer);
    this.modalCloseTimer = null;
  }

  private clearRouteCompletionModalCloseTimer(): void {
    if (this.routeCompletionModalCloseTimer === null) {
      return;
    }

    window.clearTimeout(this.routeCompletionModalCloseTimer);
    this.routeCompletionModalCloseTimer = null;
  }

  private clearDesktopAvailabilityCloseTimer(): void {
    if (this.desktopAvailabilityCloseTimer === null) {
      return;
    }

    window.clearTimeout(this.desktopAvailabilityCloseTimer);
    this.desktopAvailabilityCloseTimer = null;
  }

  private clearDesktopNotificationsCloseTimer(): void {
    if (this.desktopNotificationsCloseTimer === null) {
      return;
    }

    window.clearTimeout(this.desktopNotificationsCloseTimer);
    this.desktopNotificationsCloseTimer = null;
  }

  private getModalCloseDurationMs(): number {
    const modalElement = this.document.querySelector<HTMLElement>('.t-modal');
    const duration = getComputedStyle(modalElement ?? this.document.documentElement).getPropertyValue('--modal-close-dur').trim();

    if (!duration) {
      return 150;
    }

    if (duration.endsWith('ms')) {
      return Number.parseFloat(duration) || 150;
    }

    if (duration.endsWith('s')) {
      return (Number.parseFloat(duration) || 0.15) * 1000;
    }

    return Number.parseFloat(duration) || 150;
  }

  private getDropdownCloseDurationMs(): number {
    const dropdownElement = this.document.querySelector<HTMLElement>('.t-dropdown');
    const duration = getComputedStyle(dropdownElement ?? this.document.documentElement).getPropertyValue('--dropdown-close-dur').trim();

    if (!duration) {
      return 150;
    }

    if (duration.endsWith('ms')) {
      return Number.parseFloat(duration) || 150;
    }

    if (duration.endsWith('s')) {
      return (Number.parseFloat(duration) || 0.15) * 1000;
    }

    return Number.parseFloat(duration) || 150;
  }
}
