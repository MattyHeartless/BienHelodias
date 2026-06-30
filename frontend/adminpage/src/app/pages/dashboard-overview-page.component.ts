import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule
} from 'ng-apexcharts';
import {
  AppRole,
  DashboardOverviewDto,
  OrderStatus,
  SuperAdminDashboardOverviewDto,
  SubscriptionStatus
} from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { AdminSessionService } from '../core/admin-session.service';
import { NotificationUiService } from '../core/notification-ui.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';
import { SuperadminApiService } from '../services/superadmin-api.service';

type AxisChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  colors: string[];
  dataLabels: ApexDataLabels;
  fill: ApexFill;
  grid: ApexGrid;
  plotOptions: ApexPlotOptions;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis | ApexYAxis[];
};

type NonAxisChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  colors: string[];
  dataLabels: ApexDataLabels;
  fill?: ApexFill;
  labels: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-dashboard-overview-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, RouterLink, NgApexchartsModule],
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
  readonly overview = signal<DashboardOverviewDto | null>(null);
  readonly superAdminOverview = signal<SuperAdminDashboardOverviewDto | null>(null);
  readonly dateFrom = signal(this.toDateInputValue(this.addDays(new Date(), -29)));
  readonly dateTo = signal(this.toDateInputValue(new Date()));
  readonly mobileFiltersOpen = signal(false);
  readonly mobileFiltersActive = signal(false);
  readonly mobileFiltersClosing = signal(false);

  readonly isSuperAdmin = computed(() => this.role() === AppRole.SuperAdmin);
  readonly storeMetrics = computed(() => {
    const kpis = this.overview()?.kpis;

    return [
      { label: 'Ingresos', value: kpis?.revenue ?? 0, icon: 'payments', currency: true, hint: 'Periodo actual' },
      { label: 'Pedidos', value: kpis?.totalOrders ?? 0, icon: 'receipt_long', hint: 'Ordenes recibidas' },
      { label: 'Ticket prom.', value: kpis?.averageTicket ?? 0, icon: 'trending_up', currency: true, hint: 'Venta media' },
      { label: 'En camino', value: kpis?.onTheWayOrders ?? 0, icon: 'local_shipping', hint: 'Entregas activas' },
      { label: 'Stock critico', value: (kpis?.lowStockProducts ?? 0) + (kpis?.outOfStockProducts ?? 0), icon: 'warning', hint: 'Bajo o agotado', warn: true },
      { label: 'Valor inventario', value: kpis?.inventoryValue ?? 0, icon: 'inventory_2', currency: true, hint: 'Precio x unidades' }
    ];
  });
  readonly periodLabel = computed(() => {
    const period = this.overview()?.period;

    if (!period) {
      return 'Ultimos 30 dias';
    }

    return `${this.formatDate(period.from)} - ${this.formatDate(period.to)}`;
  });
  readonly superAdminPeriodLabel = computed(() => {
    const period = this.superAdminOverview()?.period;

    if (!period) {
      return 'Ultimos 30 dias';
    }

    return `${this.formatDate(period.from)} - ${this.formatDate(period.to)}`;
  });
  readonly orderStatusSummary = computed(() =>
    (this.overview()?.ordersByStatus ?? []).filter((item) => item.count > 0)
  );
  readonly stockAlerts = computed(() => this.overview()?.stockAlerts ?? []);
  readonly recentOrders = computed(() => this.overview()?.recentOrders ?? []);
  readonly topSellingProducts = computed(() => this.overview()?.topSellingProducts ?? []);
  readonly hasRevenueData = computed(() =>
    (this.overview()?.revenueByDay ?? []).some((point) => point.orders > 0 || point.revenue > 0)
  );
  readonly hasCategoryData = computed(() => (this.overview()?.stockByCategory ?? []).some((category) => category.units > 0));
  readonly hasTopProducts = computed(() => this.topSellingProducts().length > 0);

  readonly superAdminMetrics = computed(() => {
    const kpis = this.superAdminOverview()?.kpis;
    const stockCritical = (kpis?.lowStockProducts ?? 0) + (kpis?.outOfStockProducts ?? 0);

    return [
      { label: 'Ingresos', value: kpis?.revenue ?? 0, icon: 'payments', currency: true, hint: 'Venta global' },
      { label: 'Pedidos', value: kpis?.totalOrders ?? 0, icon: 'receipt_long', hint: 'Periodo actual' },
      { label: 'Ticket prom.', value: kpis?.averageTicket ?? 0, icon: 'trending_up', currency: true, hint: 'Promedio global' },
      { label: 'Tiendas activas', value: kpis?.activeStores ?? 0, icon: 'storefront', hint: `${kpis?.totalStores ?? 0} registradas` },
      { label: 'En trial', value: kpis?.trialStores ?? 0, icon: 'rocket_launch', hint: 'Evaluando plataforma' },
      { label: 'Stock critico', value: stockCritical, icon: 'warning', hint: 'Global', warn: stockCritical > 0 }
    ];
  });
  readonly superAdminOrderStatusSummary = computed(() =>
    (this.superAdminOverview()?.ordersByStatus ?? []).filter((item) => item.count > 0)
  );
  readonly superAdminRecentStores = computed(() => this.superAdminOverview()?.recentStores ?? []);
  readonly superAdminRecentOrders = computed(() => this.superAdminOverview()?.recentOrders ?? []);
  readonly storeOperationalHealth = computed(() => this.superAdminOverview()?.storeOperationalHealth ?? []);
  readonly hasSuperAdminRevenueData = computed(() =>
    (this.superAdminOverview()?.revenueByDay ?? []).some((point) => point.orders > 0 || point.revenue > 0)
  );
  readonly hasTopStoresByRevenue = computed(() => (this.superAdminOverview()?.topStoresByRevenue ?? []).length > 0);
  readonly hasTopStoresByOrders = computed(() => (this.superAdminOverview()?.topStoresByOrders ?? []).length > 0);

  readonly revenueChart = computed<AxisChartOptions>(() => {
    const points = this.overview()?.revenueByDay ?? [];

    return {
      series: [
        {
          name: 'Ingresos',
          data: points.map((point) => point.revenue)
        }
      ],
      chart: this.axisChart('area', 320),
      colors: ['#d2fd6e'],
      dataLabels: { enabled: false },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.5,
          opacityFrom: 0.42,
          opacityTo: 0.02,
          stops: [0, 92]
        }
      },
      grid: this.chartGrid(),
      plotOptions: {},
      stroke: { curve: 'smooth', width: 3 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => this.formatMoney(value)
        }
      },
      xaxis: {
        categories: points.map((point) => this.formatShortDate(point.date)),
        labels: { style: { colors: '#adaaaa', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#adaaaa' },
          formatter: (value) => this.compactMoney(value)
        }
      }
    };
  });

  readonly ordersStatusChart = computed<NonAxisChartOptions>(() => {
    const activeStatuses = this.orderStatusSummary();
    const statuses = activeStatuses.length
      ? activeStatuses
      : [{ status: OrderStatus.Pending, label: 'Sin pedidos', count: 1, percentage: 0, revenue: 0 }];
    const totalOrders = this.overview()?.kpis.totalOrders ?? 0;

    return {
      series: statuses.map((status) => status.count),
      chart: {
        type: 'donut',
        height: 310,
        background: 'transparent',
        toolbar: { show: false }
      },
      colors: activeStatuses.length ? statuses.map((status) => this.statusColor(status.status)) : ['#484848'],
      dataLabels: { enabled: false },
      labels: statuses.map((status) => status.label),
      legend: {
        position: 'bottom',
        labels: { colors: '#adaaaa' },
        markers: { shape: 'circle' }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: { color: '#adaaaa', fontSize: '12px' },
              value: {
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: 700,
                formatter: () => totalOrders.toString()
              },
              total: {
                show: true,
                label: 'Pedidos',
                color: '#adaaaa',
                formatter: () => totalOrders.toString()
              }
            }
          }
        }
      },
      stroke: { colors: ['#131313'], width: 3 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => `${value} pedidos`
        }
      }
    };
  });

  readonly inventoryHealthChart = computed<NonAxisChartOptions>(() => {
    const health = this.overview()?.inventoryHealth;
    const activeProducts = health?.activeProducts ?? 0;
    const toPercent = (value: number) => activeProducts === 0 ? 0 : Math.round((value / activeProducts) * 100);

    return {
      series: [
        toPercent(health?.healthyProducts ?? 0),
        toPercent(health?.lowStockProducts ?? 0),
        toPercent(health?.outOfStockProducts ?? 0)
      ],
      chart: {
        type: 'radialBar',
        height: 300,
        background: 'transparent',
        toolbar: { show: false }
      },
      colors: ['#d2fd6e', '#e7e959', '#ff7351'],
      dataLabels: { enabled: false },
      labels: ['Sanos', 'Bajo', 'Agotado'],
      legend: { show: false },
      plotOptions: {
        radialBar: {
          hollow: { size: '34%' },
          track: { background: 'rgba(255,255,255,0.08)' },
          dataLabels: {
            name: { color: '#adaaaa', fontSize: '12px' },
            value: {
              color: '#ffffff',
              fontSize: '22px',
              formatter: (value) => `${Math.round(value)}%`
            },
            total: {
              show: true,
              label: 'Activos',
              color: '#adaaaa',
              formatter: () => activeProducts.toString()
            }
          }
        }
      },
      stroke: { lineCap: 'round' },
      tooltip: { enabled: false }
    };
  });

  readonly categoryStockChart = computed<AxisChartOptions>(() => {
    const categories = this.overview()?.stockByCategory ?? [];

    return {
      series: [
        {
          name: 'Unidades',
          data: categories.map((category) => category.units)
        }
      ],
      chart: this.axisChart('bar', Math.max(280, categories.length * 44)),
      colors: ['#87ad26'],
      dataLabels: {
        enabled: true,
        style: { colors: ['#ffffff'] },
        formatter: (value) => `${value}`
      },
      fill: { opacity: 1 },
      grid: this.chartGrid(),
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 7,
          barHeight: '58%'
        }
      },
      stroke: { width: 0 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => `${value} unidades`
        }
      },
      xaxis: {
        categories: categories.map((category) => category.category),
        labels: { style: { colors: '#adaaaa' } }
      },
      yaxis: {
        labels: { style: { colors: '#ffffff', fontSize: '12px' } }
      }
    };
  });

  readonly topProductsChart = computed<AxisChartOptions>(() => {
    const products = this.topSellingProducts();

    return {
      series: [
        {
          name: 'Unidades vendidas',
          data: products.map((product) => product.unitsSold)
        }
      ],
      chart: this.axisChart('bar', Math.max(240, products.length * 48)),
      colors: ['#e7e959'],
      dataLabels: {
        enabled: true,
        style: { colors: ['#0e0e0e'] },
        formatter: (value) => `${value}`
      },
      fill: { opacity: 1 },
      grid: this.chartGrid(),
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 7,
          barHeight: '56%'
        }
      },
      stroke: { width: 0 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => `${value} unidades`
        }
      },
      xaxis: {
        categories: products.map((product) => product.name),
        labels: { style: { colors: '#adaaaa' } }
      },
      yaxis: {
        labels: { style: { colors: '#ffffff', fontSize: '12px' } }
      }
    };
  });

  readonly superAdminRevenueChart = computed<AxisChartOptions>(() => {
    const points = this.superAdminOverview()?.revenueByDay ?? [];

    return {
      series: [
        {
          name: 'Ingresos',
          data: points.map((point) => point.revenue)
        }
      ],
      chart: this.axisChart('area', 320),
      colors: ['#d2fd6e'],
      dataLabels: { enabled: false },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 0.5,
          opacityFrom: 0.42,
          opacityTo: 0.02,
          stops: [0, 92]
        }
      },
      grid: this.chartGrid(),
      plotOptions: {},
      stroke: { curve: 'smooth', width: 3 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => this.formatMoney(value)
        }
      },
      xaxis: {
        categories: points.map((point) => this.formatShortDate(point.date)),
        labels: { style: { colors: '#adaaaa', fontSize: '11px' } },
        axisBorder: { show: false },
        axisTicks: { show: false }
      },
      yaxis: {
        labels: {
          style: { colors: '#adaaaa' },
          formatter: (value) => this.compactMoney(value)
        }
      }
    };
  });

  readonly superAdminSubscriptionChart = computed<NonAxisChartOptions>(() => {
    const activeStatuses = (this.superAdminOverview()?.storesBySubscription ?? []).filter((item) => item.count > 0);
    const statuses = activeStatuses.length
      ? activeStatuses
      : [{ status: SubscriptionStatus.Trial, label: 'Sin tiendas', count: 1, percentage: 0 }];
    const totalStores = this.superAdminOverview()?.kpis.totalStores ?? 0;

    return {
      series: statuses.map((status) => status.count),
      chart: {
        type: 'donut',
        height: 310,
        background: 'transparent',
        toolbar: { show: false }
      },
      colors: activeStatuses.length ? statuses.map((status) => this.subscriptionColor(status.status)) : ['#484848'],
      dataLabels: { enabled: false },
      labels: statuses.map((status) => status.label),
      legend: {
        position: 'bottom',
        labels: { colors: '#adaaaa' },
        markers: { shape: 'circle' }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: { color: '#adaaaa', fontSize: '12px' },
              value: {
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: 700,
                formatter: () => totalStores.toString()
              },
              total: {
                show: true,
                label: 'Tiendas',
                color: '#adaaaa',
                formatter: () => totalStores.toString()
              }
            }
          }
        }
      },
      stroke: { colors: ['#131313'], width: 3 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => `${value} tiendas`
        }
      }
    };
  });

  readonly superAdminOrdersStatusChart = computed<NonAxisChartOptions>(() => {
    const activeStatuses = this.superAdminOrderStatusSummary();
    const statuses = activeStatuses.length
      ? activeStatuses
      : [{ status: OrderStatus.Pending, label: 'Sin pedidos', count: 1, percentage: 0, revenue: 0 }];
    const totalOrders = this.superAdminOverview()?.kpis.totalOrders ?? 0;

    return {
      series: statuses.map((status) => status.count),
      chart: {
        type: 'donut',
        height: 310,
        background: 'transparent',
        toolbar: { show: false }
      },
      colors: activeStatuses.length ? statuses.map((status) => this.statusColor(status.status)) : ['#484848'],
      dataLabels: { enabled: false },
      labels: statuses.map((status) => status.label),
      legend: {
        position: 'bottom',
        labels: { colors: '#adaaaa' },
        markers: { shape: 'circle' }
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: { color: '#adaaaa', fontSize: '12px' },
              value: {
                color: '#ffffff',
                fontSize: '32px',
                fontWeight: 700,
                formatter: () => totalOrders.toString()
              },
              total: {
                show: true,
                label: 'Pedidos',
                color: '#adaaaa',
                formatter: () => totalOrders.toString()
              }
            }
          }
        }
      },
      stroke: { colors: ['#131313'], width: 3 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => `${value} pedidos`
        }
      }
    };
  });

  readonly topStoresRevenueChart = computed<AxisChartOptions>(() => {
    const stores = this.superAdminOverview()?.topStoresByRevenue ?? [];

    return {
      series: [
        {
          name: 'Ingresos',
          data: stores.map((store) => store.revenue)
        }
      ],
      chart: this.axisChart('bar', Math.max(260, stores.length * 50)),
      colors: ['#d2fd6e'],
      dataLabels: {
        enabled: true,
        style: { colors: ['#0e0e0e'] },
        formatter: (value) => this.compactMoney(Number(value))
      },
      fill: { opacity: 1 },
      grid: this.chartGrid(),
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 7,
          barHeight: '56%'
        }
      },
      stroke: { width: 0 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => this.formatMoney(value)
        }
      },
      xaxis: {
        categories: stores.map((store) => store.name),
        labels: { style: { colors: '#adaaaa' } }
      },
      yaxis: {
        labels: { style: { colors: '#ffffff', fontSize: '12px' } }
      }
    };
  });

  readonly topStoresOrdersChart = computed<AxisChartOptions>(() => {
    const stores = this.superAdminOverview()?.topStoresByOrders ?? [];

    return {
      series: [
        {
          name: 'Pedidos',
          data: stores.map((store) => store.orders)
        }
      ],
      chart: this.axisChart('bar', Math.max(260, stores.length * 50)),
      colors: ['#87ad26'],
      dataLabels: {
        enabled: true,
        style: { colors: ['#ffffff'] },
        formatter: (value) => `${value}`
      },
      fill: { opacity: 1 },
      grid: this.chartGrid(),
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 7,
          barHeight: '56%'
        }
      },
      stroke: { width: 0 },
      tooltip: {
        theme: 'dark',
        y: {
          formatter: (value) => `${value} pedidos`
        }
      },
      xaxis: {
        categories: stores.map((store) => store.name),
        labels: { style: { colors: '#adaaaa' } }
      },
      yaxis: {
        labels: { style: { colors: '#ffffff', fontSize: '12px' } }
      }
    };
  });

  constructor() {
    this.load();
  }

  @HostListener('document:keydown.escape')
  closeMobileFiltersOnEscape(): void {
    this.closeMobileFilters();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    if (this.isSuperAdmin()) {
      this.overview.set(null);

      if (!this.isValidDateRange()) {
        const message = 'Selecciona un rango de fechas valido.';
        this.error.set(message);
        this.notifications.warning({ summary: message });
        this.loading.set(false);
        return;
      }

      this.superadminApi.getDashboardOverview(this.dateFrom(), this.dateTo()).subscribe({
        next: (response) => {
          this.superAdminOverview.set(response.data);
          this.loading.set(false);
        },
        error: (error) => {
          const message = getApiErrorMessage(error, 'No fue posible cargar el dashboard.');
          this.error.set(message);
          this.notifications.error({ summary: message });
          this.loading.set(false);
        }
      });
      return;
    }

    this.superAdminOverview.set(null);

    if (!this.isValidDateRange()) {
      const message = 'Selecciona un rango de fechas valido.';
      this.error.set(message);
      this.notifications.warning({ summary: message });
      this.loading.set(false);
      return;
    }

    this.storeAdminApi.getDashboardOverview(this.dateFrom(), this.dateTo()).subscribe({
      next: (response) => {
        this.overview.set(response.data);
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

  updateDateFrom(value: string): void {
    this.dateFrom.set(value);
  }

  updateDateTo(value: string): void {
    this.dateTo.set(value);
  }

  applyDateRange(): void {
    this.load();
  }

  applyDateRangeAndCloseMobileFilters(): void {
    this.applyDateRange();
    this.closeMobileFilters();
  }

  setDatePreset(days: number): void {
    const today = new Date();
    this.dateFrom.set(this.toDateInputValue(this.addDays(today, -(days - 1))));
    this.dateTo.set(this.toDateInputValue(today));
    this.load();
  }

  setDatePresetAndCloseMobileFilters(days: number): void {
    this.setDatePreset(days);
    this.closeMobileFilters();
  }

  setCurrentMonth(): void {
    const today = new Date();
    this.dateFrom.set(this.toDateInputValue(new Date(today.getFullYear(), today.getMonth(), 1)));
    this.dateTo.set(this.toDateInputValue(today));
    this.load();
  }

  setCurrentMonthAndCloseMobileFilters(): void {
    this.setCurrentMonth();
    this.closeMobileFilters();
  }

  openMobileFilters(): void {
    if (this.mobileFiltersOpen()) {
      return;
    }

    this.mobileFiltersClosing.set(false);
    this.mobileFiltersActive.set(false);
    this.mobileFiltersOpen.set(true);

    requestAnimationFrame(() => this.mobileFiltersActive.set(true));
  }

  closeMobileFilters(): void {
    if (!this.mobileFiltersOpen() || this.mobileFiltersClosing()) {
      return;
    }

    this.mobileFiltersActive.set(false);
    this.mobileFiltersClosing.set(true);

    setTimeout(() => {
      this.mobileFiltersOpen.set(false);
      this.mobileFiltersClosing.set(false);
    }, this.getModalCloseDurationMs());
  }

  getOrderStatusLabel(status: OrderStatus): string {
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

  getOrderStatusClass(status: OrderStatus): string {
    return (
      {
        [OrderStatus.Pending]: 'status-pending',
        [OrderStatus.Accepted]: 'status-accepted',
        [OrderStatus.Preparing]: 'status-preparing',
        [OrderStatus.Ready]: 'status-ready',
        [OrderStatus.OnTheWay]: 'status-way',
        [OrderStatus.Delivered]: 'status-delivered',
        [OrderStatus.Cancelled]: 'status-cancelled'
      }[status] ?? 'status-pending'
    );
  }

  getStockSeverityLabel(severity: 'out' | 'low'): string {
    return severity === 'out' ? 'Agotado' : 'Bajo';
  }

  getSubscriptionStatusLabel(status: SubscriptionStatus): string {
    return (
      {
        [SubscriptionStatus.Trial]: 'Trial',
        [SubscriptionStatus.Active]: 'Activa',
        [SubscriptionStatus.Suspended]: 'Suspendida',
        [SubscriptionStatus.Cancelled]: 'Cancelada'
      }[status] ?? 'Sin estado'
    );
  }

  getSubscriptionStatusClass(status: SubscriptionStatus): string {
    return (
      {
        [SubscriptionStatus.Trial]: 'subscription-trial',
        [SubscriptionStatus.Active]: 'subscription-active',
        [SubscriptionStatus.Suspended]: 'subscription-suspended',
        [SubscriptionStatus.Cancelled]: 'subscription-cancelled'
      }[status] ?? 'subscription-trial'
    );
  }

  getProductInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('');
  }

  private axisChart(type: 'area' | 'bar', height: number): ApexChart {
    return {
      type,
      height,
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        speed: 520,
        dynamicAnimation: { speed: 260 }
      }
    };
  }

  private chartGrid(): ApexGrid {
    return {
      borderColor: 'rgba(255,255,255,0.08)',
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 4, right: 10 }
    };
  }

  private statusColor(status: OrderStatus): string {
    return (
      {
        [OrderStatus.Pending]: '#e7e959',
        [OrderStatus.Accepted]: '#8ec5ff',
        [OrderStatus.Preparing]: '#f7a95f',
        [OrderStatus.Ready]: '#d2fd6e',
        [OrderStatus.OnTheWay]: '#7dd3fc',
        [OrderStatus.Delivered]: '#87ad26',
        [OrderStatus.Cancelled]: '#ff7351'
      }[status] ?? '#adaaaa'
    );
  }

  private subscriptionColor(status: SubscriptionStatus): string {
    return (
      {
        [SubscriptionStatus.Trial]: '#e7e959',
        [SubscriptionStatus.Active]: '#d2fd6e',
        [SubscriptionStatus.Suspended]: '#ffb15f',
        [SubscriptionStatus.Cancelled]: '#ff7351'
      }[status] ?? '#adaaaa'
    );
  }

  private formatDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  }

  private formatShortDate(value: string): string {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short'
    }).format(new Date(value));
  }

  private formatMoney(value: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(value);
  }

  private compactMoney(value: number): string {
    if (value >= 1_000_000) {
      return `$${Math.round(value / 1_000_000)}M`;
    }

    if (value >= 1_000) {
      return `$${Math.round(value / 1_000)}k`;
    }

    return `$${Math.round(value)}`;
  }

  private isValidDateRange(): boolean {
    if (!this.dateFrom() || !this.dateTo()) {
      return false;
    }

    return new Date(this.dateFrom()).getTime() <= new Date(this.dateTo()).getTime();
  }

  private addDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    return next;
  }

  private toDateInputValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private getModalCloseDurationMs(): number {
    if (typeof window === 'undefined') {
      return 150;
    }

    const duration = getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-close-dur')
      .trim();

    if (duration.endsWith('ms')) {
      return Number.parseFloat(duration) || 150;
    }

    if (duration.endsWith('s')) {
      return (Number.parseFloat(duration) || 0.15) * 1000;
    }

    return 150;
  }
}
