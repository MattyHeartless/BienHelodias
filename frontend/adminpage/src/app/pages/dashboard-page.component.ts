import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  AppRole,
  DashboardDto,
  OrderDto,
  ProductDto,
  StoreDto,
  SubscriptionStatus
} from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { AdminSessionService } from '../core/admin-session.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';
import { SuperadminApiService } from '../services/superadmin-api.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css'
})
export class DashboardPageComponent {
  private readonly session = inject(AdminSessionService);
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly superadminApi = inject(SuperadminApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly role = this.session.role;
  readonly email = this.session.email;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly dashboard = signal<DashboardDto | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly orders = signal<OrderDto[]>([]);
  readonly stores = signal<StoreDto[]>([]);

  readonly storeForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    slug: ['', [Validators.required, Validators.minLength(3)]],
    subscriptionStatus: [SubscriptionStatus.Active, [Validators.required]]
  });

  readonly adminForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['Admin123!', [Validators.required, Validators.minLength(8)]],
    storeId: ['', [Validators.required]]
  });

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(6)]],
    price: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    category: ['', [Validators.required]],
    imageUrl: ['']
  });

  readonly storeMetrics = computed(() => [
    { label: 'Productos', value: this.dashboard()?.totalProducts ?? 0 },
    { label: 'Activos', value: this.dashboard()?.activeProducts ?? 0 },
    { label: 'Pedidos', value: this.dashboard()?.totalOrders ?? 0 },
    { label: 'Revenue', value: this.dashboard()?.revenueInOrders ?? 0, currency: true }
  ]);

  readonly isSuperAdmin = computed(() => this.role() === AppRole.SuperAdmin);
  readonly isStoreAdmin = computed(() => this.role() === AppRole.StoreAdmin);
  readonly subscriptionOptions = [
    { label: 'Trial', value: SubscriptionStatus.Trial },
    { label: 'Active', value: SubscriptionStatus.Active },
    { label: 'Suspended', value: SubscriptionStatus.Suspended },
    { label: 'Cancelled', value: SubscriptionStatus.Cancelled }
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.feedback.set(null);

    if (this.isSuperAdmin()) {
      this.superadminApi.getStores().subscribe({
        next: (response) => {
          this.stores.set(response.data.items);
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(getApiErrorMessage(error, 'No fue posible cargar las tiendas.'));
          this.loading.set(false);
        }
      });

      return;
    }

    forkJoin({
      dashboard: this.storeAdminApi.getDashboard(),
      products: this.storeAdminApi.getProducts(),
      orders: this.storeAdminApi.getOrders()
    }).subscribe({
      next: (response) => {
        this.dashboard.set(response.dashboard.data);
        this.products.set(response.products.data.items);
        this.orders.set(response.orders.data.items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el dashboard.'));
        this.loading.set(false);
      }
    });
  }

  createStore(): void {
    this.storeForm.markAllAsTouched();
    if (this.storeForm.invalid) {
      return;
    }

    this.superadminApi.createStore(this.storeForm.getRawValue()).subscribe({
      next: (response) => {
        this.feedback.set(`Tienda creada: ${response.data.name}`);
        this.storeForm.reset({
          name: '',
          slug: '',
          subscriptionStatus: SubscriptionStatus.Active
        });
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible crear la tienda.'));
      }
    });
  }

  createAdmin(): void {
    this.adminForm.markAllAsTouched();
    if (this.adminForm.invalid) {
      return;
    }

    this.superadminApi.registerAdmin(this.adminForm.getRawValue()).subscribe({
      next: () => {
        this.feedback.set('Administrador registrado correctamente.');
        this.adminForm.reset({
          name: '',
          email: '',
          password: 'Admin123!',
          storeId: ''
        });
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible registrar el administrador.'));
      }
    });
  }

  updateSubscription(storeId: string, subscriptionStatus: SubscriptionStatus): void {
    this.superadminApi.updateSubscription(storeId, subscriptionStatus).subscribe({
      next: (response) => {
        this.feedback.set(`Suscripcion actualizada para ${response.data.name}.`);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar la suscripcion.'));
      }
    });
  }

  createProduct(): void {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid) {
      return;
    }

    const values = this.productForm.getRawValue();
    this.storeAdminApi
      .createProduct({
        name: values.name,
        description: values.description,
        price: values.price,
        stock: values.stock,
        category: values.category,
        imageUrl: values.imageUrl || null
      })
      .subscribe({
        next: (response) => {
          this.feedback.set(`Producto creado: ${response.data.name}`);
          this.productForm.reset({
            name: '',
            description: '',
            price: 0,
            stock: 0,
            category: '',
            imageUrl: ''
          });
          this.load();
        },
        error: (error) => {
          this.error.set(getApiErrorMessage(error, 'No fue posible crear el producto.'));
        }
      });
  }

  toggleProduct(product: ProductDto): void {
    this.storeAdminApi.updateProductStatus(product.id, !product.isActive).subscribe({
      next: (response) => {
        this.feedback.set(`Estado actualizado: ${response.data.name}`);
        this.load();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar el producto.'));
      }
    });
  }

  logout(): void {
    this.session.clear();
    void this.router.navigate(['/login']);
  }
}
