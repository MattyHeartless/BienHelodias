import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DeliveryAddressDraft, ProductDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { GooglePlacesService } from '../services/google-places.service';
import { OrdersApiService } from '../services/orders-api.service';
import { ProductsApiService } from '../services/products-api.service';
import { CartSessionService } from '../services/cart-session.service';
import { StorefrontTenantService } from '../services/storefront-tenant.service';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, RouterLink],
  templateUrl: './checkout-page.component.html',
  styleUrl: './checkout-page.component.css'
})
export class CheckoutPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly productsApi = inject(ProductsApiService);
  private readonly ordersApi = inject(OrdersApiService);
  private readonly googlePlaces = inject(GooglePlacesService);
  private readonly cartSession = inject(CartSessionService);
  private readonly storefrontTenant = inject(StorefrontTenantService);
  private autocomplete: any | null = null;
  private autocompleteListener: { remove: () => void } | null = null;
  private autocompleteInput: HTMLInputElement | null = null;

  @ViewChild('deliveryAddressInput')
  private deliveryAddressInput?: ElementRef<HTMLInputElement>;

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly placesLoading = signal(false);
  readonly placesError = signal<string | null>(null);
  readonly selectedAddress = signal<DeliveryAddressDraft | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly activeSlug = signal<string | null>(null);
  readonly storeName = computed(() => this.storefrontTenant.store()?.name ?? 'Licoreria');
  readonly cart = computed(() => this.cartSession.items());
  readonly appliedPromotion = computed(() => this.cartSession.appliedPromotion());

  readonly checkoutForm = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.minLength(2)]],
    customerPhone: ['', [Validators.required, Validators.minLength(8)]],
    deliveryAddress: ['', [Validators.required, Validators.minLength(10)]],
    notes: [''],
    deliveryPlaceId: [''],
    deliveryLatitude: [''],
    deliveryLongitude: ['']
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

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug');
      if (!slug) {
        this.error.set('No se encontro el slug de la tienda.');
        this.loading.set(false);
        return;
      }

      this.activeSlug.set(slug);
      this.cartSession.loadForSlug(slug);
      if (this.cartSession.cartCount() === 0) {
        void this.router.navigate(['/', slug, 'cart']);
        return;
      }

      this.resolveStorefront(slug);
    });
  }

  ngOnDestroy(): void {
    this.destroyAutocompleteListener();
  }

  submitOrder(): void {
    this.checkoutForm.markAllAsTouched();
    const storeId = this.storefrontTenant.storeId();
    const slug = this.activeSlug();
    if (this.checkoutForm.invalid || this.cartItems().length === 0 || !storeId || !slug) {
      return;
    }

    const values = this.checkoutForm.getRawValue();
    this.submitting.set(true);
    this.error.set(null);

    this.ordersApi.createOrder({
      storeId,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      deliveryAddress: values.deliveryAddress,
      deliveryLatitude: values.deliveryLatitude ? Number(values.deliveryLatitude) : null,
      deliveryLongitude: values.deliveryLongitude ? Number(values.deliveryLongitude) : null,
      notes: values.notes || null,
      promoCode: this.appliedPromotion()?.code ?? null,
      items: this.cartItems().map((entry) => ({
        productId: entry.product.id,
        quantity: entry.quantity
      }))
    }).subscribe({
      next: (response) => {
        localStorage.setItem(this.getLastOrderStorageKey(slug), JSON.stringify(response.data));
        this.cartSession.clearCart();
        this.submitting.set(false);
        void this.router.navigate(['/', slug, 'order', response.data.id]);
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
            if (this.cartItems().length === 0) {
              void this.router.navigate(['/', slug, 'cart']);
              return;
            }

            this.loading.set(false);
            queueMicrotask(() => void this.initializeDeliveryAddressAutocomplete());
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

  private getLastOrderStorageKey(slug: string): string {
    return `bien-helodias-last-order:${slug}`;
  }
}
