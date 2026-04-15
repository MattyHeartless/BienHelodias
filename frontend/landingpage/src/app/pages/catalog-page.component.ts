import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DeliveryAddressDraft, ProductDto, BannerDto } from '../core/models';
import { landingTenant } from '../core/tenant.config';
import { getApiErrorMessage } from '../core/api-error.util';
import { GooglePlacesService } from '../services/google-places.service';
import { OrdersApiService } from '../services/orders-api.service';
import { ProductsApiService } from '../services/products-api.service';
import { StorefrontContentApiService } from '../services/storefront-content-api.service';
import { catchError, forkJoin, of } from 'rxjs';

const LAST_ORDER_KEY = 'bien-helodias-last-order';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.css'
})
export class CatalogPageComponent {
  private readonly productsApi = inject(ProductsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly storefrontContentApi = inject(StorefrontContentApiService);
  private readonly googlePlaces = inject(GooglePlacesService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private autocomplete: any | null = null;
  private autocompleteListener: { remove: () => void } | null = null;
  private autocompleteInput: HTMLInputElement | null = null;
  private bannerRotationHandle: ReturnType<typeof window.setInterval> | null = null;

  @ViewChild('deliveryAddressInput')
  private deliveryAddressInput?: ElementRef<HTMLInputElement>;

  readonly tenant = landingTenant;
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly placesLoading = signal(false);
  readonly placesError = signal<string | null>(null);
  readonly selectedAddress = signal<DeliveryAddressDraft | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly welcomePhrase = signal('No te compliques, aqui te lo mandamos.');
  readonly banners = signal<BannerDto[]>([]);
  readonly activeBannerIndex = signal(0);
  readonly activeCategory = signal<string>('all');
  readonly searchQuery = signal('');
  readonly highlightedProductId = signal<string | null>(null);
  readonly detailOpen = signal(false);
  readonly cartOpen = signal(false);
  readonly checkoutOpen = signal(false);
  readonly cart = signal<Record<string, number>>({});
  readonly checkoutForm = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required, Validators.minLength(8)]],
    deliveryAddress: ['', [Validators.required, Validators.minLength(10)]],
    notes: [''],
    deliveryPlaceId: [''],
    deliveryLatitude: [''],
    deliveryLongitude: ['']
  });

  readonly categories = computed(() => {
    const names = new Set(this.products().map((product) => product.category).filter(Boolean));
    return ['all', ...Array.from(names)];
  });

  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();

    return this.products().filter((product) => {
      const matchesCategory = this.activeCategory() === 'all' || product.category === this.activeCategory();
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

  readonly cartItems = computed(() =>
    this.products()
      .filter((product) => (this.cart()[product.id] ?? 0) > 0)
      .map((product) => ({
        product,
        quantity: this.cart()[product.id]
      }))
  );

  readonly cartCount = computed(() =>
    Object.values(this.cart()).reduce((total, quantity) => total + quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.cartItems().reduce((total, entry) => total + entry.product.price * entry.quantity, 0)
  );

  constructor() {
    this.route.queryParamMap.subscribe((params) => {
      const panel = params.get('panel');
      this.cartOpen.set(panel === 'cart');
    });

    this.loadCatalog();
  }

  loadCatalog(): void {
    this.loading.set(true);
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
        this.activeBannerIndex.set(0);
        this.startBannerRotation();
        this.detailOpen.set(false);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el catalogo.'));
        this.loading.set(false);
      }
    });
  }

  selectCategory(category: string): void {
    this.activeCategory.set(category);
    this.detailOpen.set(false);
  }

  updateSearch(query: string): void {
    this.searchQuery.set(query);
  }

  selectProduct(productId: string): void {
    this.highlightedProductId.set(productId);
    this.detailOpen.set(true);
  }

  closeDetail(): void {
    this.detailOpen.set(false);
  }

  isSelectedProduct(productId: string): boolean {
    return this.selectedProduct()?.id === productId;
  }

  addToCart(product: ProductDto): void {
    this.cart.update((current) => ({
      ...current,
      [product.id]: Math.min(product.stock, (current[product.id] ?? 0) + 1)
    }));
  }

  openCart(): void {
    this.cartOpen.set(true);
  }

  closeCart(): void {
    this.cartOpen.set(false);
    this.checkoutOpen.set(false);
  }

  openCheckout(): void {
    if (this.cartCount() === 0) {
      return;
    }

    this.checkoutOpen.set(true);
    setTimeout(() => {
      void this.initializeDeliveryAddressAutocomplete();
    }, 0);
  }

  closeCheckout(): void {
    this.checkoutOpen.set(false);
  }

  ngOnDestroy(): void {
    this.destroyAutocompleteListener();
    this.stopBannerRotation();
  }

  quickBuy(product: ProductDto): void {
    this.addToCart(product);
    this.openCart();
  }

  removeFromCart(productId: string): void {
    this.cart.update((current) => {
      const nextQuantity = (current[productId] ?? 0) - 1;
      if (nextQuantity <= 0) {
        const { [productId]: _removed, ...rest } = current;
        return rest;
      }

      return { ...current, [productId]: nextQuantity };
    });
  }

  submitOrder(): void {
    this.checkoutForm.markAllAsTouched();
    if (this.checkoutForm.invalid || this.cartCount() === 0) {
      return;
    }

    const checkoutValues = this.checkoutForm.getRawValue();

    this.submitting.set(true);
    this.error.set(null);

    this.ordersApi
      .createOrder({
        storeId: this.tenant.storeId,
        customerName: checkoutValues.customerName,
        customerPhone: checkoutValues.customerPhone,
        deliveryAddress: checkoutValues.deliveryAddress,
        notes: checkoutValues.notes || null,
        items: this.cartItems().map((entry) => ({
          productId: entry.product.id,
          quantity: entry.quantity
        }))
      })
      .subscribe({
        next: (response) => {
          localStorage.setItem(LAST_ORDER_KEY, JSON.stringify(response.data));
          this.cart.set({});
          this.cartOpen.set(false);
          this.checkoutOpen.set(false);
          this.submitting.set(false);
          void this.router.navigate(['/order', response.data.id]);
        },
        error: (error) => {
          this.error.set(getApiErrorMessage(error, 'No fue posible crear tu pedido.'));
          this.submitting.set(false);
        }
      });
  }

  handleDeliveryAddressInput(rawAddress: string): void {
    const currentSelection = this.selectedAddress();
    if (!currentSelection) {
      return;
    }

    if (rawAddress.trim() === currentSelection.formattedAddress.trim()) {
      return;
    }

    this.clearSelectedAddress();
  }

  trackLastOrder(): void {
    const rawOrder = localStorage.getItem(LAST_ORDER_KEY);
    if (!rawOrder) {
      return;
    }

    const parsedOrder = JSON.parse(rawOrder) as { id: string };
    void this.router.navigate(['/order', parsedOrder.id]);
  }

  productTone(index: number): string {
    const tones = [
      'linear-gradient(135deg, rgba(210,253,110,0.22), transparent 58%)',
      'linear-gradient(135deg, rgba(231,233,89,0.2), transparent 58%)',
      'linear-gradient(135deg, rgba(135,173,38,0.28), transparent 58%)'
    ];

    return tones[index % tones.length];
  }

  productVolume(product: ProductDto): string {
    return product.category?.toLowerCase().includes('cerveza') ? '355ml' : '150ml';
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

  private async initializeDeliveryAddressAutocomplete(): Promise<void> {
    const input = this.deliveryAddressInput?.nativeElement;
    if (!input) {
      return;
    }

    if (this.autocomplete && this.autocompleteInput === input) {
      return;
    }

    this.placesLoading.set(true);
    this.placesError.set(null);

    try {
      this.destroyAutocompleteListener();
      this.autocompleteInput = input;
      this.autocomplete = await this.googlePlaces.createAddressAutocomplete(input);
      this.autocompleteListener = this.googlePlaces.addPlaceChangedListener(this.autocomplete, () => {
        this.applySelectedAddress();
      });
      this.placesLoading.set(false);
    } catch (error) {
      this.autocomplete = null;
      this.autocompleteInput = null;
      this.placesLoading.set(false);
      this.placesError.set(getApiErrorMessage(error, 'No fue posible cargar Google Places. Puedes escribir la direccion manualmente.'));
    }
  }

  private applySelectedAddress(): void {
    if (!this.autocomplete) {
      return;
    }

    const addressDraft = this.googlePlaces.extractAddressDraft(this.autocomplete);
    if (!addressDraft?.formattedAddress) {
      return;
    }

    this.selectedAddress.set(addressDraft);
    this.checkoutForm.patchValue({
      deliveryAddress: addressDraft.formattedAddress,
      deliveryPlaceId: addressDraft.placeId ?? '',
      deliveryLatitude: addressDraft.latitude !== null ? String(addressDraft.latitude) : '',
      deliveryLongitude: addressDraft.longitude !== null ? String(addressDraft.longitude) : ''
    });
  }

  private clearSelectedAddress(): void {
    this.selectedAddress.set(null);
    this.checkoutForm.patchValue({
      deliveryPlaceId: '',
      deliveryLatitude: '',
      deliveryLongitude: ''
    });
  }

  private destroyAutocompleteListener(): void {
    this.autocompleteListener?.remove();
    this.autocompleteListener = null;
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
}
