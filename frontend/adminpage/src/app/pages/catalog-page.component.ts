import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { NotificationUiService } from '../core/notification-ui.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.css'
})
export class CatalogPageComponent {
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationUiService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly products = signal<ProductDto[]>([]);
  readonly imageLoadErrors = signal<Record<string, boolean>>({});
  readonly searchTerm = signal('');
  readonly selectedCategory = signal('all');
  readonly editingProductId = signal<string | null>(null);
  readonly modalOpen = signal(false);

  readonly productForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    description: ['', [Validators.required, Validators.minLength(6)]],
    price: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    category: ['', [Validators.required]],
    imageUrl: [''],
    isActive: [true, [Validators.required]]
  });

  readonly inventorySummary = computed(() => ({
    totalProducts: this.products().length,
    activeProducts: this.products().filter((product) => product.isActive).length,
    totalUnits: this.products().reduce((acc, product) => acc + product.stock, 0)
  }));

  readonly isEditing = computed(() => this.editingProductId() !== null);
  readonly categories = computed(() =>
    [...new Set(this.products().map((product) => product.category.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'es', { sensitivity: 'base' }))
  );
  readonly filteredProducts = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase();
    const category = this.selectedCategory();

    return this.products().filter((product) => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesSearch =
        !search ||
        product.name.toLocaleLowerCase().includes(search) ||
        product.category.toLocaleLowerCase().includes(search);

      return matchesCategory && matchesSearch;
    });
  });

  constructor() {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.storeAdminApi.getProducts().subscribe({
      next: (response) => {
        this.products.set(response.data.items);
        this.imageLoadErrors.set({});
        this.loading.set(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible cargar el catalogo.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.loading.set(false);
      }
    });
  }

  saveProduct(): void {
    this.productForm.markAllAsTouched();
    if (this.productForm.invalid || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);
    this.feedback.set(null);

    const values = this.productForm.getRawValue();
    const request = {
      name: values.name,
      description: values.description,
      price: values.price,
      stock: values.stock,
      category: values.category,
      imageUrl: values.imageUrl || null,
      isActive: values.isActive
    };

    const operation = this.isEditing()
      ? this.storeAdminApi.updateProduct(this.editingProductId()!, request)
      : this.storeAdminApi.createProduct(request);

    operation.subscribe({
      next: (response) => {
        const message = this.isEditing() ? `Producto actualizado: ${response.data.name}` : `Producto creado: ${response.data.name}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.resetForm();
        this.loadProducts();
        this.submitting.set(false);
      },
      error: (error) => {
        const message = getApiErrorMessage(error, this.isEditing() ? 'No fue posible actualizar el producto.' : 'No fue posible crear el producto.');
        this.error.set(message);
        this.notifications.error({ summary: message });
        this.submitting.set(false);
      }
    });
  }

  editProduct(product: ProductDto): void {
    this.editingProductId.set(product.id);
    this.productForm.reset({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      imageUrl: product.imageUrl ?? '',
      isActive: product.isActive
    });
    this.modalOpen.set(true);
  }

  deleteProduct(product: ProductDto): void {
    this.error.set(null);
    this.feedback.set(null);

    this.storeAdminApi.deleteProduct(product.id).subscribe({
      next: () => {
        const message = `Producto eliminado: ${product.name}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        if (this.editingProductId() === product.id) {
          this.resetForm();
        }
        this.loadProducts();
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible eliminar el producto.');
        this.error.set(message);
        this.notifications.error({ summary: message });
      }
    });
  }

  toggleProduct(product: ProductDto): void {
    this.storeAdminApi.updateProductStatus(product.id, !product.isActive).subscribe({
      next: (response) => {
        const message = `Estado actualizado: ${response.data.name}`;
        this.feedback.set(message);
        this.notifications.success({ summary: message });
        this.loadProducts();
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible actualizar el estado del producto.');
        this.error.set(message);
        this.notifications.error({ summary: message });
      }
    });
  }

  resetForm(): void {
    this.editingProductId.set(null);
    this.modalOpen.set(false);
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      imageUrl: '',
      isActive: true
    });
  }

  openCreateModal(): void {
    this.editingProductId.set(null);
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      imageUrl: '',
      isActive: true
    });
    this.modalOpen.set(true);
  }

  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  updateSelectedCategory(value: string): void {
    this.selectedCategory.set(value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('all');
  }

  hasProductImage(product: ProductDto): boolean {
    return Boolean(product.imageUrl && !this.imageLoadErrors()[product.id]);
  }

  markImageError(productId: string): void {
    this.imageLoadErrors.update((current) => ({
      ...current,
      [productId]: true
    }));
  }

  getProductInitials(product: ProductDto): string {
    return product.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((chunk) => chunk[0]?.toUpperCase() ?? '')
      .join('');
  }
}
