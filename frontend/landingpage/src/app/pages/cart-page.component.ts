import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductDto, PromotionValidationDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { OrdersApiService } from '../services/orders-api.service';
import { ProductsApiService } from '../services/products-api.service';
import { CartSessionService } from '../services/cart-session.service';
import { StorefrontTenantService } from '../services/storefront-tenant.service';
import { StoreAvailabilityService } from '../services/store-availability.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, RouterLink],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.css'
})
export class CartPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly productsApi = inject(ProductsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly cartSession = inject(CartSessionService);
  private readonly storefrontTenant = inject(StorefrontTenantService);
  private readonly storeAvailabilityService = inject(StoreAvailabilityService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly promoError = signal<string | null>(null);
  readonly applyingPromotion = signal(false);
  readonly products = signal<ProductDto[]>([]);
  readonly activeSlug = signal<string | null>(null);
  readonly storeName = computed(() => this.storefrontTenant.store()?.name ?? 'Licoreria');
  readonly cart = computed(() => this.cartSession.items());
  readonly cartCount = computed(() => this.cartSession.cartCount());
  readonly appliedPromotion = computed(() => this.cartSession.appliedPromotion());
  readonly storeAvailability = computed(() => this.storeAvailabilityService.getAvailability(this.storefrontTenant.store()));

  readonly promoForm = this.formBuilder.nonNullable.group({
    promoCode: ['']
  });

  readonly cartItems = computed(() =>
    this.products()
      .filter((product) => (this.cart()[product.id] ?? 0) > 0)
      .map((product) => ({
        product,
        quantity: this.cart()[product.id]
      }))
  );

  readonly subtotal = computed(() =>
    this.cartItems().reduce((total, entry) => total + entry.product.price * entry.quantity, 0)
  );

  readonly discountTotal = computed(() => this.appliedPromotion()?.discountTotal ?? 0);
  readonly total = computed(() => this.appliedPromotion()?.total ?? this.subtotal());
  readonly minimumPurchase = computed(() => this.storefrontTenant.store()?.minimumPurchase ?? null);
  readonly amountMissingForMinimum = computed(() => Math.max(0, (this.minimumPurchase() ?? 0) - this.subtotal()));
  readonly meetsMinimumPurchase = computed(() => this.amountMissingForMinimum() === 0);
  readonly canContinueCheckout = computed(() =>
    this.cartItems().length > 0 && this.storeAvailability().isOpen && this.meetsMinimumPurchase()
  );

  constructor() {
    this.promoForm.controls.promoCode.valueChanges.subscribe((value) => {
      const normalized = value.trim().toUpperCase();
      if (this.appliedPromotion()?.code !== normalized) {
        this.cartSession.clearPromotion(false);
      }

      this.cartSession.setPromoCode(normalized);
      this.promoError.set(null);
    });

    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.error.set('No se encontro el slug de la tienda.');
        this.loading.set(false);
        return;
      }

      this.activeSlug.set(slug);
      this.cartSession.loadForSlug(slug);
      this.promoForm.patchValue({ promoCode: this.cartSession.promoCode() }, { emitEvent: false });
      this.resolveStorefront(slug);
    });
  }

  increaseQuantity(product: ProductDto): void {
    this.cartSession.addItem(product.id, 1, product.stock);
  }

  decreaseQuantity(productId: string): void {
    const currentQuantity = this.cart()[productId] ?? 0;
    this.cartSession.setQuantity(productId, currentQuantity - 1);
  }

  removeItem(productId: string): void {
    this.cartSession.removeItem(productId);
  }

  applyPromotionCode(): void {
    const storeId = this.storefrontTenant.storeId();
    const code = this.promoForm.controls.promoCode.value.trim();
    if (!storeId || !code || this.cartItems().length === 0 || this.applyingPromotion()) {
      return;
    }

    this.applyingPromotion.set(true);
    this.promoError.set(null);

    this.ordersApi.validatePromotion({
      storeId,
      code,
      items: this.cartItems().map((entry) => ({
        productId: entry.product.id,
        quantity: entry.quantity
      }))
    }).subscribe({
      next: (response) => {
        this.cartSession.applyPromotion(response.data);
        this.promoForm.patchValue({ promoCode: response.data.code }, { emitEvent: false });
        this.promoError.set(null);
        this.applyingPromotion.set(false);
      },
      error: (error) => {
        this.cartSession.clearPromotion(false);
        this.promoError.set(getApiErrorMessage(error, 'No fue posible validar el codigo.'));
        this.applyingPromotion.set(false);
      }
    });
  }

  continueCheckout(): void {
    const slug = this.activeSlug();
    if (!slug || !this.canContinueCheckout()) {
      return;
    }

    void this.router.navigate(['/', slug, 'checkout']);
  }

  trackLastOrder(): void {
    const slug = this.activeSlug();
    if (!slug) {
      return;
    }

    const rawOrder = localStorage.getItem(this.getLastOrderStorageKey(slug));
    if (!rawOrder) {
      return;
    }

    const parsedOrder = JSON.parse(rawOrder) as { id: string };
    void this.router.navigate(['/', slug, 'order', parsedOrder.id]);
  }

  private resolveStorefront(slug: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.storefrontTenant.loadStore(slug).subscribe({
      next: () => {
        this.productsApi.getCatalog().subscribe({
          next: (response) => {
            this.products.set(response.data.items.filter((product) => product.isActive));
            this.loading.set(false);
          },
          error: (error) => {
            this.products.set([]);
            this.loading.set(false);
            this.error.set(getApiErrorMessage(error, 'No fue posible cargar el catalogo de la tienda.'));
          }
        });
      },
      error: () => {
        this.products.set([]);
        this.loading.set(false);
        this.error.set(this.storefrontTenant.error() ?? 'No fue posible cargar la tienda solicitada.');
      }
    });
  }

  private getLastOrderStorageKey(slug: string): string {
    return `bien-helodias-last-order:${slug}`;
  }
}
