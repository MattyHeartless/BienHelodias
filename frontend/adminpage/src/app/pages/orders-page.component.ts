import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, HostListener, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import gsap from 'gsap';
import { OrderDto, OrderStatus } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { NotificationUiService } from '../core/notification-ui.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';
import { AnimatedSearchInputComponent } from '../shared/animated-search-input.component';

@Component({
  selector: 'app-orders-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, AnimatedSearchInputComponent],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent {
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationUiService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('ordersListPanel') private readonly ordersListPanel?: ElementRef<HTMLElement>;
  @ViewChild('ordersDetailPanel') private readonly ordersDetailPanel?: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly detailLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly orders = signal<OrderDto[]>([]);
  readonly summaryOrders = signal<OrderDto[]>([]);
  readonly selectedOrder = signal<OrderDto | null>(null);
  readonly mobileDetailVisible = signal(false);
  readonly searchTerm = signal('');

  private mobileTransitionTimeline: gsap.core.Timeline | null = null;
  private searchDebounceHandle: ReturnType<typeof setTimeout> | null = null;
  private ordersRequestId = 0;

  readonly summary = computed(() => ({
    total: this.summaryOrders().length,
    revenue: this.summaryOrders().reduce((acc, order) => acc + order.total, 0),
    pending: this.summaryOrders().filter((order) => order.status === OrderStatus.Pending).length
  }));

  private readonly orderFlow = [
    { status: OrderStatus.Pending, label: 'Pedido recibido', description: 'El pedido entró al sistema.' },
    { status: OrderStatus.Accepted, label: 'Pedido aceptado', description: 'La tienda confirmó la preparación.' },
    { status: OrderStatus.Preparing, label: 'En preparación', description: 'El equipo está armando el pedido.' },
    { status: OrderStatus.Ready, label: 'Listo para salir', description: 'El pedido ya puede despacharse.' },
    { status: OrderStatus.OnTheWay, label: 'En camino', description: 'El pedido va rumbo al cliente.' },
    { status: OrderStatus.Delivered, label: 'Entregado', description: 'La entrega fue completada.' }
  ];

  constructor() {
    this.loadOrders();
    this.route.paramMap.subscribe((params) => {
      const orderId = params.get('orderId');
      if (orderId && this.selectedOrder()?.id !== orderId) {
        this.loadOrderDetail(orderId);
      }
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.isMobileOrdersLayout()) {
      this.resetMobilePanels();
    }
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

  deliveryAvailabilityLabel(availability: number): string {
    return (
      {
        0: 'No disponible',
        1: 'Disponible',
        2: 'Ocupado'
      }[availability] ?? 'Sin estado'
    );
  }

  orderItemsLabel(order: OrderDto): string {
    const totalItems = order.items.reduce((acc, item) => acc + item.quantity, 0);
    return totalItems === 1 ? '1 producto' : `${totalItems} productos`;
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
          description: 'El pedido entró al sistema.',
          state: 'complete',
          timestamp: order.createdAtUtc
        },
        {
          label: 'Pedido cancelado',
          description: 'La operación fue detenida antes de completarse.',
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

  loadOrders(keepCurrentRoute = false): void {
    const requestId = ++this.ordersRequestId;

    if (!keepCurrentRoute) {
      this.loading.set(true);
    }

    this.error.set(null);

    this.storeAdminApi.getOrders(this.searchTerm()).subscribe({
      next: (response) => {
        if (requestId !== this.ordersRequestId) {
          return;
        }

        this.orders.set(response.data.items);
        if (!this.searchTerm().trim()) {
          this.summaryOrders.set(response.data.items);
        }
        this.loading.set(false);

        if (keepCurrentRoute) {
          this.syncSelectedOrderWithResults(response.data.items);
          return;
        }

        const routeOrderId = this.route.snapshot.paramMap.get('orderId');
        if (routeOrderId && (!this.searchTerm().trim() || response.data.items.some((order) => order.id === routeOrderId))) {
          this.loadOrderDetail(routeOrderId);
          return;
        }

        const firstOrder = response.data.items[0];
        if (firstOrder) {
          this.selectedOrder.set(firstOrder);
          void this.router.navigate(['/dashboard/orders', firstOrder.id], { replaceUrl: true });
          return;
        }

        this.selectedOrder.set(null);
        void this.router.navigate(['/dashboard/orders'], { replaceUrl: true });
      },
      error: (error) => {
        if (requestId !== this.ordersRequestId) {
          return;
        }

        const message = getApiErrorMessage(error, 'No fue posible cargar los pedidos.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.loading.set(false);
      }
    });
  }

  selectOrder(orderId: string): void {
    const order = this.orders().find((item) => item.id === orderId);

    if (order) {
      this.selectedOrder.set(order);
    }

    this.loadOrderDetail(orderId);
    void this.router.navigate(['/dashboard/orders', orderId]);

    if (this.isMobileOrdersLayout()) {
      this.openMobileDetail();
    }
  }

  showMobileOrderList(): void {
    if (!this.mobileDetailVisible()) {
      return;
    }

    const listPanel = this.ordersListPanel?.nativeElement;
    const detailPanel = this.ordersDetailPanel?.nativeElement;

    if (!listPanel || !detailPanel || this.prefersReducedMotion()) {
      this.mobileDetailVisible.set(false);
      this.resetMobilePanels();
      return;
    }

    this.mobileTransitionTimeline?.kill();
    this.mobileTransitionTimeline = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        this.mobileDetailVisible.set(false);
        this.cdr.detectChanges();

        window.requestAnimationFrame(() => {
          gsap.fromTo(
            listPanel,
            { xPercent: -8, autoAlpha: 0, filter: 'blur(3px)' },
            {
              xPercent: 0,
              autoAlpha: 1,
              filter: 'blur(0px)',
              duration: 0.28,
              ease: 'power3.out',
              clearProps: 'transform,opacity,visibility,filter'
            }
          );
          gsap.set(detailPanel, { clearProps: 'transform,opacity,visibility,filter' });
        });
      }
    });

    this.mobileTransitionTimeline.to(detailPanel, {
      xPercent: 8,
      autoAlpha: 0,
      filter: 'blur(3px)',
      duration: 0.22
    });
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);

    if (this.searchDebounceHandle) {
      clearTimeout(this.searchDebounceHandle);
    }

    this.searchDebounceHandle = setTimeout(() => {
      this.searchDebounceHandle = null;
      this.loadOrders(true);
    }, 250);
  }

  private syncSelectedOrderWithResults(orders: OrderDto[]): void {
    const selected = this.selectedOrder();

    if (!selected) {
      return;
    }

    const refreshedSelection = orders.find((order) => order.id === selected.id);

    if (refreshedSelection) {
      this.selectedOrder.set(refreshedSelection);
      return;
    }

    if (this.searchTerm().trim()) {
      this.selectedOrder.set(null);
    }
  }

  private loadOrderDetail(orderId: string): void {
    this.detailLoading.set(true);

    this.storeAdminApi.getOrder(orderId).subscribe({
      next: (response) => {
        this.selectedOrder.set(response.data);
        this.detailLoading.set(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible cargar el detalle del pedido.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.detailLoading.set(false);
      }
    });
  }

  private openMobileDetail(): void {
    if (this.mobileDetailVisible()) {
      return;
    }

    const listPanel = this.ordersListPanel?.nativeElement;
    const detailPanel = this.ordersDetailPanel?.nativeElement;

    if (!listPanel || !detailPanel || this.prefersReducedMotion()) {
      this.mobileDetailVisible.set(true);
      this.resetMobilePanels();
      return;
    }

    this.mobileTransitionTimeline?.kill();
    this.mobileTransitionTimeline = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        this.mobileDetailVisible.set(true);
        this.cdr.detectChanges();

        window.requestAnimationFrame(() => {
          gsap.fromTo(
            detailPanel,
            { xPercent: 8, autoAlpha: 0, filter: 'blur(3px)' },
            {
              xPercent: 0,
              autoAlpha: 1,
              filter: 'blur(0px)',
              duration: 0.32,
              ease: 'power3.out',
              clearProps: 'transform,opacity,visibility,filter'
            }
          );
          gsap.set(listPanel, { clearProps: 'transform,opacity,visibility,filter' });
        });
      }
    });

    this.mobileTransitionTimeline.to(listPanel, {
      xPercent: -8,
      autoAlpha: 0,
      filter: 'blur(3px)',
      duration: 0.22
    });
  }

  private resetMobilePanels(): void {
    this.mobileTransitionTimeline?.kill();
    this.mobileTransitionTimeline = null;

    const panels = [
      this.ordersListPanel?.nativeElement,
      this.ordersDetailPanel?.nativeElement
    ].filter((panel): panel is HTMLElement => Boolean(panel));

    if (panels.length) {
      gsap.set(panels, { clearProps: 'transform,opacity,visibility,filter' });
    }
  }

  private isMobileOrdersLayout(): boolean {
    return window.matchMedia('(max-width: 1279px)').matches;
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
