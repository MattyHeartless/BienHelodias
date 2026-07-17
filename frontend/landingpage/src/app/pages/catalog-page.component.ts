import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, WritableSignal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BannerDto, ProductDto, StorefrontCategoryDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { ProductsApiService } from '../services/products-api.service';
import { CartSessionService } from '../services/cart-session.service';
import { StorefrontContentApiService } from '../services/storefront-content-api.service';
import { StorefrontTenantService } from '../services/storefront-tenant.service';
import { StoreAvailabilityService } from '../services/store-availability.service';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.css'
})
export class CatalogPageComponent {
  private static readonly BANNER_SWIPE_THRESHOLD = 45;
  private static readonly SKELETON_DELAY_MS = 240;
  private readonly productsApi = inject(ProductsApiService);
  private readonly storefrontContentApi = inject(StorefrontContentApiService);
  private readonly cartSession = inject(CartSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly storefrontTenant = inject(StorefrontTenantService);
  private readonly storeAvailabilityService = inject(StoreAvailabilityService);
  private bannerRotationHandle: ReturnType<typeof window.setInterval> | null = null;
  private bannerPointerId: number | null = null;
  private bannerPointerStartX: number | null = null;
  private bannerPointerStartY: number | null = null;
  private storeFinderNavigationHandle: ReturnType<typeof window.setTimeout> | null = null;
  private categoryScrollHandle: ReturnType<typeof window.setTimeout> | null = null;
  private loadingSkeletonHandle: ReturnType<typeof window.setTimeout> | null = null;
  private readonly quickAddFeedbackTimeouts = new Map<string, ReturnType<typeof window.setTimeout>>();

  readonly tenant = computed(() => this.storefrontTenant.store());
  readonly storeAvailability = computed(() => this.storeAvailabilityService.getAvailability(this.tenant()));
  readonly loading = signal(true);
  readonly loadingSkeletonVisible = signal(false);
  readonly error = signal<string | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly storeCategories = signal<StorefrontCategoryDto[]>([]);
  readonly welcomePhrase = signal('No te compliques, aqui te lo mandamos.');
  readonly banners = signal<BannerDto[]>([]);
  readonly activeBannerIndex = signal(0);
  readonly promoModalOpen = signal(false);
  readonly promoModalActive = signal(false);
  readonly promoModalClosing = signal(false);
  readonly promoModalBanner = signal<BannerDto | null>(null);
  readonly promoCodeCopied = signal(false);
  readonly storeInfoModalOpen = signal(false);
  readonly storeInfoModalActive = signal(false);
  readonly storeInfoModalClosing = signal(false);
  readonly isStoreFabHidden = signal(false);
  readonly isSearchFocused = signal(false);
  readonly isStoreFinderLaunching = signal(false);
  readonly activeCategory = signal<string>('all');
  readonly searchQuery = signal('');
  readonly isBannerDragging = signal(false);
  readonly highlightedProductId = signal<string | null>(null);
  readonly detailOpen = signal(false);
  readonly detailModalActive = signal(false);
  readonly detailModalClosing = signal(false);
  readonly cart = computed(() => this.cartSession.items());
  readonly cartCount = computed(() => this.cartSession.cartCount());
  readonly quickAddFeedback = signal<Record<string, boolean>>({});
  readonly detailQuantity = signal(1);

  readonly categories = computed(() => {
    const productCategoryIds = new Set(this.products().map((product) => product.storeCategoryId).filter(Boolean));
    const configuredCategories = this.storeCategories().filter((category) => productCategoryIds.has(category.id));

    if (configuredCategories.length > 0) {
      return configuredCategories;
    }

    return Array.from(new Set(this.products().map((product) => product.category).filter(Boolean)))
      .map((name) => ({ id: name, name }));
  });

  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    return this.products().filter((product) => {
      const matchesCategory = this.activeCategory() === 'all'
        || product.storeCategoryId === this.activeCategory()
        || (!product.storeCategoryId && product.category === this.activeCategory());
      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query);

      return matchesCategory && matchesQuery;
    });
  });

  readonly selectedProduct = computed(() => {
    const highlightedId = this.highlightedProductId();
    const source = this.filteredProducts();

    return source.find((product) => product.id === highlightedId) ?? source[0] ?? this.products()[0] ?? null;
  });

  readonly activeBanner = computed(() => {
    const banners = this.banners();
    if (banners.length === 0) {
      return null;
    }

    return banners[this.activeBannerIndex() % banners.length] ?? null;
  });

  readonly storeInfoCards = computed(() => {
    const store = this.tenant();

    return [
      {
        icon: 'schedule',
        label: 'Horario',
        value: this.formatSchedule(store?.openingTime ?? null, store?.closingTime ?? null)
      },
      {
        icon: 'shopping_bag',
        label: 'Pedido minimo',
        value: this.formatCurrencyLabel(store?.minimumPurchase ?? null, 'Sin minimo')
      },
      {
        icon: 'inventory_2',
        label: 'Importe carton',
        value: this.formatCurrencyLabel(store?.cartonPrice ?? null, 'No definido')
      },
      {
        icon: 'wine_bar',
        label: 'Importe cubeta',
        value: this.formatCurrencyLabel(store?.bucketPrice ?? null, 'No definido')
      }
    ];
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.storefrontTenant.clear();
        this.finishLoading();
        this.error.set('No se encontro el slug de la tienda.');
        return;
      }

      this.cartSession.loadForSlug(slug);
      this.resolveStorefront(slug);
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.detailOpen()) {
      this.closeDetail();
      return;
    }

    if (this.promoModalOpen()) {
      this.closePromotionModal();
      return;
    }

    if (this.storeInfoModalOpen()) {
      this.closeStoreInfoModal();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;

    this.isStoreFabHidden.set(scrollProgress >= 5);
  }

  loadCatalog(): void {
    this.beginLoading();
    this.error.set(null);

    forkJoin({
      catalog: this.productsApi.getCatalog(),
      storefront: this.storefrontContentApi.getContent().pipe(catchError(() => of(null)))
    }).subscribe({
      next: (response) => {
        const activeProducts = response.catalog.data.items.filter((product) => product.isActive);
        this.products.set(activeProducts);
        this.highlightedProductId.set(activeProducts[0]?.id ?? null);
        this.welcomePhrase.set(response.storefront?.data.welcomePhrase?.trim() || 'No te compliques, aqui te lo mandamos.');
        this.banners.set(response.storefront?.data.banners ?? []);
        this.storeCategories.set(response.storefront?.data.categories ?? []);
        this.activeBannerIndex.set(0);
        this.startBannerRotation();
        this.detailQuantity.set(1);
        this.detailOpen.set(false);
        this.finishLoading();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el catalogo.'));
        this.finishLoading();
      }
    });
  }

  selectCategory(categoryId: string): void {
    this.activeCategory.set(categoryId);
    this.closeDetail();
    this.scrollToCatalogStart();
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  selectProduct(productId: string): void {
    this.highlightedProductId.set(productId);
    this.detailQuantity.set(1);
    this.openAnimatedModal(this.detailOpen, this.detailModalActive, this.detailModalClosing);
  }

  closeDetail(): void {
    this.closeAnimatedModal(
      this.detailOpen,
      this.detailModalActive,
      this.detailModalClosing,
      () => this.detailQuantity.set(1)
    );
  }

  isSelectedProduct(productId: string): boolean {
    return this.selectedProduct()?.id === productId;
  }

  addToCart(product: ProductDto, quantity = 1): void {
    if (!this.storeAvailability().isOpen) {
      return;
    }

    this.cartSession.addItem(product.id, quantity, product.stock);
  }

  openCart(): void {
    const slug = this.storefrontTenant.slug();
    if (!slug) {
      return;
    }

    void this.router.navigate(['/', slug, 'cart']);
  }

  openStoreFinder(): void {
    if (this.isStoreFinderLaunching()) {
      return;
    }

    this.isStoreFinderLaunching.set(true);
    this.storeFinderNavigationHandle = window.setTimeout(() => {
      void this.router.navigate(['/']);
    }, 250);
  }

  openPromotionModal(banner: BannerDto): void {
    if (!banner.promotion) {
      this.selectCategory('all');
      return;
    }

    this.promoModalBanner.set(banner);
    this.promoCodeCopied.set(false);
    this.openAnimatedModal(this.promoModalOpen, this.promoModalActive, this.promoModalClosing);
  }

  closePromotionModal(): void {
    this.closeAnimatedModal(
      this.promoModalOpen,
      this.promoModalActive,
      this.promoModalClosing,
      () => {
        this.promoModalBanner.set(null);
        this.promoCodeCopied.set(false);
      },
      240
    );
  }

  openStoreInfoModal(): void {
    this.openAnimatedModal(this.storeInfoModalOpen, this.storeInfoModalActive, this.storeInfoModalClosing);
  }

  closeStoreInfoModal(): void {
    this.closeAnimatedModal(this.storeInfoModalOpen, this.storeInfoModalActive, this.storeInfoModalClosing);
  }

  ngOnDestroy(): void {
    this.stopBannerRotation();
    if (this.storeFinderNavigationHandle !== null) {
      window.clearTimeout(this.storeFinderNavigationHandle);
    }
    if (this.categoryScrollHandle !== null) {
      window.clearTimeout(this.categoryScrollHandle);
    }
    if (this.loadingSkeletonHandle !== null) {
      window.clearTimeout(this.loadingSkeletonHandle);
    }
    this.quickAddFeedbackTimeouts.forEach((handle) => window.clearTimeout(handle));
    this.quickAddFeedbackTimeouts.clear();
  }

  private scrollToCatalogStart(): void {
    if (this.categoryScrollHandle !== null) {
      window.clearTimeout(this.categoryScrollHandle);
    }

    this.categoryScrollHandle = window.setTimeout(() => {
      const catalog = document.getElementById('catalog-products');
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (catalog) {
        const top = Math.max(0, window.scrollY + catalog.getBoundingClientRect().top - window.innerHeight * 0.2);
        window.scrollTo({ top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      }
      this.categoryScrollHandle = null;
    });
  }

  quickBuy(product: ProductDto): void {
    this.addToCart(product);
    this.openCart();
  }

  addToCartWithFeedback(product: ProductDto): void {
    const isDetailPurchase = this.detailOpen() && this.selectedProduct()?.id === product.id;
    const quantity = isDetailPurchase ? this.detailQuantity() : 1;
    this.addToCart(product, quantity);

    if (isDetailPurchase) {
      this.closeDetail();
      return;
    }

    this.triggerQuickAddFeedback(product.id);
  }

  decreaseDetailQuantity(): void {
    this.detailQuantity.update((current) => Math.max(1, current - 1));
  }

  increaseDetailQuantity(): void {
    const maxQuantity = Math.max(1, this.selectedProduct()?.stock ?? 1);
    this.detailQuantity.update((current) => Math.min(maxQuantity, current + 1));
  }

  trackLastOrder(): void {
    const activeSlug = this.storefrontTenant.slug();
    if (!activeSlug) {
      return;
    }

    const rawOrder = localStorage.getItem(this.getLastOrderStorageKey(activeSlug));
    if (!rawOrder) {
      return;
    }

    const parsedOrder = JSON.parse(rawOrder) as { id: string };
    void this.router.navigate(['/', activeSlug, 'order', parsedOrder.id]);
  }

  productTone(index: number): string {
    const tones = [
      'linear-gradient(135deg, rgba(210,253,110,0.22), transparent 58%)',
      'linear-gradient(135deg, rgba(231,233,89,0.2), transparent 58%)',
      'linear-gradient(135deg, rgba(135,173,38,0.28), transparent 58%)'
    ];

    return tones[index % tones.length];
  }

  isQuickAddAnimating(productId: string): boolean {
    return this.quickAddFeedback()[productId] ?? false;
  }

  showPreviousBanner(): void {
    const banners = this.banners();
    if (banners.length <= 1) {
      return;
    }

    this.activeBannerIndex.update((current) => (current - 1 + banners.length) % banners.length);
    this.restartBannerRotation();
  }

  showNextBanner(): void {
    const banners = this.banners();
    if (banners.length <= 1) {
      return;
    }

    this.activeBannerIndex.update((current) => (current + 1) % banners.length);
    this.restartBannerRotation();
  }

  showBanner(index: number): void {
    this.activeBannerIndex.set(index);
    this.restartBannerRotation();
  }

  async copyPromotionCode(): Promise<void> {
    const code = this.promoModalBanner()?.promotion?.code;
    if (!code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      this.closePromotionModal();
    } catch {
      this.promoCodeCopied.set(false);
    }
  }

  handleBannerPointerDown(event: PointerEvent): void {
    if (this.banners().length <= 1 || this.isInteractiveBannerTarget(event.target)) {
      return;
    }

    this.bannerPointerId = event.pointerId;
    this.bannerPointerStartX = event.clientX;
    this.bannerPointerStartY = event.clientY;
    this.isBannerDragging.set(true);
    (event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId);
  }

  handleBannerPointerMove(event: PointerEvent): void {
    if (!this.isTrackingBannerPointer(event.pointerId) || this.bannerPointerStartX === null || this.bannerPointerStartY === null) {
      return;
    }

    const deltaX = event.clientX - this.bannerPointerStartX;
    const deltaY = event.clientY - this.bannerPointerStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault();
    }
  }

  handleBannerPointerUp(event: PointerEvent): void {
    if (!this.isTrackingBannerPointer(event.pointerId) || this.bannerPointerStartX === null || this.bannerPointerStartY === null) {
      this.resetBannerPointerState();
      return;
    }

    const deltaX = event.clientX - this.bannerPointerStartX;
    const deltaY = event.clientY - this.bannerPointerStartY;
    const isHorizontalSwipe =
      Math.abs(deltaX) >= CatalogPageComponent.BANNER_SWIPE_THRESHOLD &&
      Math.abs(deltaX) > Math.abs(deltaY);

    if (isHorizontalSwipe) {
      if (deltaX > 0) {
        this.showPreviousBanner();
      } else {
        this.showNextBanner();
      }
    }

    (event.currentTarget as HTMLElement | null)?.releasePointerCapture?.(event.pointerId);
    this.resetBannerPointerState();
  }

  private startBannerRotation(): void {
    this.stopBannerRotation();

    if (this.banners().length <= 1) {
      return;
    }

    this.bannerRotationHandle = window.setInterval(() => {
      this.activeBannerIndex.update((current) => (current + 1) % this.banners().length);
    }, 5000);
  }

  private stopBannerRotation(): void {
    if (this.bannerRotationHandle !== null) {
      window.clearInterval(this.bannerRotationHandle);
      this.bannerRotationHandle = null;
    }
  }

  private restartBannerRotation(): void {
    this.startBannerRotation();
  }

  private triggerQuickAddFeedback(productId: string): void {
    const currentTimeout = this.quickAddFeedbackTimeouts.get(productId);
    if (currentTimeout) {
      window.clearTimeout(currentTimeout);
    }

    this.quickAddFeedback.update((current) => {
      const { [productId]: _removed, ...rest } = current;
      return rest;
    });

    window.requestAnimationFrame(() => {
      this.quickAddFeedback.update((current) => ({
        ...current,
        [productId]: true
      }));

      const timeoutHandle = window.setTimeout(() => {
        this.quickAddFeedback.update((current) => {
          const { [productId]: _removed, ...rest } = current;
          return rest;
        });
        this.quickAddFeedbackTimeouts.delete(productId);
      }, 720);

      this.quickAddFeedbackTimeouts.set(productId, timeoutHandle);
    });
  }

  private beginLoading(): void {
    if (this.loadingSkeletonHandle !== null) {
      window.clearTimeout(this.loadingSkeletonHandle);
    }

    this.loading.set(true);
    this.loadingSkeletonVisible.set(false);
    this.loadingSkeletonHandle = window.setTimeout(() => {
      if (this.loading()) {
        this.loadingSkeletonVisible.set(true);
      }
      this.loadingSkeletonHandle = null;
    }, CatalogPageComponent.SKELETON_DELAY_MS);
  }

  private finishLoading(): void {
    if (this.loadingSkeletonHandle !== null) {
      window.clearTimeout(this.loadingSkeletonHandle);
      this.loadingSkeletonHandle = null;
    }

    this.loadingSkeletonVisible.set(false);
    this.loading.set(false);
  }

  private resolveStorefront(slug: string): void {
    this.beginLoading();
    this.error.set(null);

    this.storefrontTenant.loadStore(slug).subscribe({
      next: (store) => {
        this.welcomePhrase.set(store.welcomePhrase?.trim() || 'No te compliques, aqui te lo mandamos.');
        this.loadCatalog();
      },
      error: () => {
        this.products.set([]);
        this.banners.set([]);
        this.highlightedProductId.set(null);
        this.finishLoading();
        this.error.set(this.storefrontTenant.error() ?? 'No fue posible cargar la tienda solicitada.');
      }
    });
  }

  private getLastOrderStorageKey(slug: string): string {
    return `bien-helodias-last-order:${slug}`;
  }

  private formatSchedule(openingTime: string | null, closingTime: string | null): string {
    if (!openingTime && !closingTime) {
      return 'Consulta horario';
    }

    if (openingTime && closingTime) {
      return `${this.formatTime(openingTime)} - ${this.formatTime(closingTime)}`;
    }

    return openingTime
      ? `Abre ${this.formatTime(openingTime)}`
      : `Cierra ${this.formatTime(closingTime!)}`;
  }

  private formatCurrencyLabel(value: number | null, fallback: string): string {
    if (value === null) {
      return fallback;
    }

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  }

  private formatTime(value: string): string {
    return value.slice(0, 5);
  }

  private openAnimatedModal(
    open: WritableSignal<boolean>,
    active: WritableSignal<boolean>,
    closing: WritableSignal<boolean>
  ): void {
    closing.set(false);
    active.set(false);
    open.set(true);
    window.requestAnimationFrame(() => active.set(true));
  }

  private closeAnimatedModal(
    open: WritableSignal<boolean>,
    active: WritableSignal<boolean>,
    closing: WritableSignal<boolean>,
    afterClose?: () => void,
    closeDurationMs?: number
  ): void {
    if (!open()) {
      afterClose?.();
      return;
    }

    if (closing()) {
      return;
    }

    active.set(false);
    closing.set(true);
    window.setTimeout(() => {
      open.set(false);
      closing.set(false);
      afterClose?.();
    }, closeDurationMs ?? this.getModalCloseDurationMs());
  }

  private getModalCloseDurationMs(): number {
    const rawValue = getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-close-dur')
      .trim();

    if (rawValue.endsWith('ms')) {
      return Number.parseFloat(rawValue) || 150;
    }

    if (rawValue.endsWith('s')) {
      return (Number.parseFloat(rawValue) || 0.15) * 1000;
    }

    return Number.parseFloat(rawValue) || 150;
  }

  private resetBannerPointerState(): void {
    this.bannerPointerId = null;
    this.bannerPointerStartX = null;
    this.bannerPointerStartY = null;
    this.isBannerDragging.set(false);
  }

  private isTrackingBannerPointer(pointerId: number): boolean {
    return this.bannerPointerId === pointerId;
  }

  private isInteractiveBannerTarget(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest('button, a, input, textarea, select') !== null;
  }
}
