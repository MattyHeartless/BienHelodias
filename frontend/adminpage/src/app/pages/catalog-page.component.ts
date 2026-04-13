import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductDto } from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
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

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly feedback = signal<string | null>(null);
  readonly products = signal<ProductDto[]>([]);
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

  constructor() {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.storeAdminApi.getProducts().subscribe({
      next: (response) => {
        this.products.set(response.data.items);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible cargar el catalogo.'));
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
        this.feedback.set(this.isEditing() ? `Producto actualizado: ${response.data.name}` : `Producto creado: ${response.data.name}`);
        this.resetForm();
        this.loadProducts();
        this.submitting.set(false);
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, this.isEditing() ? 'No fue posible actualizar el producto.' : 'No fue posible crear el producto.'));
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
        this.feedback.set(`Producto eliminado: ${product.name}`);
        if (this.editingProductId() === product.id) {
          this.resetForm();
        }
        this.loadProducts();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible eliminar el producto.'));
      }
    });
  }

  toggleProduct(product: ProductDto): void {
    this.storeAdminApi.updateProductStatus(product.id, !product.isActive).subscribe({
      next: (response) => {
        this.feedback.set(`Estado actualizado: ${response.data.name}`);
        this.loadProducts();
      },
      error: (error) => {
        this.error.set(getApiErrorMessage(error, 'No fue posible actualizar el estado del producto.'));
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
}
