import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, ElementRef, ViewChild, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import gsap from 'gsap';
import {
  InventoryAiAnalysisDto,
  InventoryAiCommitRequest,
  InventoryAiDetectedItemDto,
  ProductDto
} from '../core/models';
import { getApiErrorMessage } from '../core/api-error.util';
import { shakeInvalidFormControls } from '../core/form-error-shake.util';
import { NotificationUiService } from '../core/notification-ui.service';
import { StoreAdminApiService } from '../services/store-admin-api.service';

type InventoryAction = 'adjust' | 'link' | 'create' | 'ignore';

interface InventoryAiCreateDraft {
  name: string;
  description: string;
  category: string;
  price: number | null;
  imageUrl: string;
  isActive: boolean;
}

interface InventoryAiReviewItem {
  id: string;
  rawLabel: string;
  detectedQuantity: number;
  editedQuantity: number;
  confidence: 'high' | 'medium' | 'low';
  matchStatus: 'matched' | 'needs_review' | 'missing_from_catalog';
  matchedProductId: string | null;
  matchedProductName: string | null;
  selectedAction: InventoryAction;
  selectedProductId: string | null;
  notes: string | null;
  suggestedCategory: string | null;
  suggestedDescription: string | null;
  suggestedImageUrl: string | null;
  createDraft: InventoryAiCreateDraft;
}

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, DatePipe],
  templateUrl: './catalog-page.component.html',
  styleUrl: './catalog-page.component.css'
})
export class CatalogPageComponent {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly storeAdminApi = inject(StoreAdminApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly notifications = inject(NotificationUiService);
  private inventoryOverlayTimeline: gsap.core.Timeline | null = null;

  @ViewChild('inventoryLoadingOverlay', { read: ElementRef }) private readonly inventoryLoadingOverlay?: ElementRef<HTMLElement>;
  @ViewChild('inventoryLoadingGlow', { read: ElementRef }) private readonly inventoryLoadingGlow?: ElementRef<HTMLElement>;
  @ViewChild('inventoryLoadingTitle', { read: ElementRef }) private readonly inventoryLoadingTitle?: ElementRef<HTMLElement>;
  @ViewChild('inventoryLoadingSubtitle', { read: ElementRef }) private readonly inventoryLoadingSubtitle?: ElementRef<HTMLElement>;
  @ViewChild('inventoryLoadingScan', { read: ElementRef }) private readonly inventoryLoadingScan?: ElementRef<HTMLElement>;
  @ViewChild('inventoryLoadingDots', { read: ElementRef }) private readonly inventoryLoadingDots?: ElementRef<HTMLElement>;

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
  readonly productModalActive = signal(false);
  readonly productModalClosing = signal(false);

  readonly inventoryAiModalOpen = signal(false);
  readonly inventoryAiModalActive = signal(false);
  readonly inventoryAiModalClosing = signal(false);
  readonly inventoryAiLoading = signal(false);
  readonly inventoryAiSubmitting = signal(false);
  readonly inventoryAiError = signal<string | null>(null);
  readonly inventoryAiAnalysis = signal<InventoryAiAnalysisDto | null>(null);
  readonly inventoryAiSelectedFile = signal<File | null>(null);
  readonly inventoryAiPreviewUrl = signal<string | null>(null);
  readonly inventoryAiReviewItems = signal<InventoryAiReviewItem[]>([]);

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
  readonly linkableProducts = computed(() =>
    [...this.products()].sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }))
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
  readonly inventoryAiProgress = computed(() => {
    const analysis = this.inventoryAiAnalysis();
    const items = this.inventoryAiReviewItems();

    return {
      totalDetections: analysis?.summary.totalDetections ?? 0,
      matchedCount: items.filter((item) => item.selectedAction === 'adjust').length,
      reviewCount: items.filter((item) => item.selectedAction === 'link').length,
      createCount: items.filter((item) => item.selectedAction === 'create').length,
      ignoredCount: items.filter((item) => item.selectedAction === 'ignore').length
    };
  });
  readonly canCommitInventoryAi = computed(() => {
    if (!this.inventoryAiAnalysis() || this.inventoryAiSubmitting()) {
      return false;
    }

    const items = this.inventoryAiReviewItems();
    const actionableItems = items.filter((item) => item.selectedAction !== 'ignore');

    if (!actionableItems.length) {
      return false;
    }

    return actionableItems.every((item) => {
      if (item.editedQuantity <= 0) {
        return false;
      }

      if (item.selectedAction === 'create') {
        return Boolean(
          item.createDraft.name.trim() &&
          item.createDraft.description.trim().length >= 6 &&
          item.createDraft.category.trim() &&
          item.createDraft.price !== null &&
          item.createDraft.price > 0
        );
      }

      return Boolean(item.selectedProductId);
    });
  });

  constructor() {
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.stopInventoryOverlayAnimation();
    this.revokeInventoryPreviewUrl();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);

    this.storeAdminApi.getProducts(200).subscribe({
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
    if (this.productForm.invalid) {
      shakeInvalidFormControls(this.host.nativeElement);
      return;
    }

    if (this.submitting()) {
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
    this.openAnimatedModal(this.modalOpen, this.productModalActive, this.productModalClosing);
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
    this.closeAnimatedModal(this.modalOpen, this.productModalActive, this.productModalClosing, () => {
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
    this.openAnimatedModal(this.modalOpen, this.productModalActive, this.productModalClosing);
  }

  openInventoryAiModal(): void {
    this.openAnimatedModal(this.inventoryAiModalOpen, this.inventoryAiModalActive, this.inventoryAiModalClosing);
    this.inventoryAiError.set(null);
  }

  closeInventoryAiModal(): void {
    this.closeAnimatedModal(this.inventoryAiModalOpen, this.inventoryAiModalActive, this.inventoryAiModalClosing, () => {
      this.resetInventoryAiState();
    });
  }

  updateInventoryImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    if (!file) {
      return;
    }

    this.revokeInventoryPreviewUrl();
    this.inventoryAiSelectedFile.set(file);
    this.inventoryAiPreviewUrl.set(URL.createObjectURL(file));
    this.inventoryAiAnalysis.set(null);
    this.inventoryAiReviewItems.set([]);
    this.inventoryAiError.set(null);
  }

  analyzeInventoryImage(): void {
    const file = this.inventoryAiSelectedFile();
    if (!file || this.inventoryAiLoading()) {
      return;
    }

    this.inventoryAiLoading.set(true);
    this.inventoryAiError.set(null);
    window.setTimeout(() => this.startInventoryOverlayAnimation());

    this.storeAdminApi.analyzeInventoryImage(file).subscribe({
      next: (response) => {
        this.inventoryAiAnalysis.set(response.data);
        this.inventoryAiReviewItems.set(response.data.detectedItems.map((item, index) => this.toReviewItem(item, index)));
        this.inventoryAiLoading.set(false);
        this.stopInventoryOverlayAnimation();
        this.notifications.success({ summary: `Analisis listo: ${response.data.summary.totalDetections} hallazgos detectados.` });
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible analizar la imagen.');
        this.inventoryAiError.set(message);
        this.inventoryAiLoading.set(false);
        this.stopInventoryOverlayAnimation();
        this.notifications.error({ summary: message });
      }
    });
  }

  applyInventoryAi(): void {
    const analysis = this.inventoryAiAnalysis();
    if (!analysis || !this.canCommitInventoryAi()) {
      this.notifyInventoryAiValidationIssue();
      return;
    }

    this.inventoryAiSubmitting.set(true);
    this.inventoryAiError.set(null);

    const request = this.buildInventoryAiCommitRequest(analysis.scanId);

    this.storeAdminApi.commitInventoryAi(request).subscribe({
      next: (response) => {
        const summary = response.data;
        const message = [
          summary.adjustedProductsCount ? `${summary.adjustedProductsCount} existentes ajustados` : null,
          summary.createdProductsCount ? `${summary.createdProductsCount} nuevos agregados` : null
        ].filter(Boolean).join(' · ') || 'Inventario actualizado';

        this.notifications.success({ summary: `${message}. ${summary.totalUnitsAdded} unidades agregadas.` });
        this.closeInventoryAiModal();
        this.loadProducts();
      },
      error: (error) => {
        const message = getApiErrorMessage(error, 'No fue posible aplicar los cambios del inventario con IA.');
        this.inventoryAiError.set(message);
        this.inventoryAiSubmitting.set(false);
        this.notifications.error({ summary: message });
      }
    });
  }

  setInventoryAction(itemId: string, action: InventoryAction): void {
    this.updateInventoryReviewItem(itemId, (item) => {
      const next: InventoryAiReviewItem = { ...item, selectedAction: action };

      if (action === 'adjust') {
        next.selectedProductId = item.matchedProductId ?? item.selectedProductId;
      }

      if (action === 'link' && !next.selectedProductId) {
        next.selectedProductId = item.matchedProductId;
      }

      return next;
    });
  }

  updateInventoryQuantity(itemId: string, value: string): void {
    this.updateInventoryReviewItem(itemId, (item) => ({
      ...item,
      editedQuantity: Math.max(0, Number.parseInt(value, 10) || 0)
    }));
  }

  updateInventorySelectedProduct(itemId: string, productId: string): void {
    this.updateInventoryReviewItem(itemId, (item) => ({
      ...item,
      selectedProductId: productId || null
    }));
  }

  updateInventoryCreateDraft(itemId: string, field: keyof InventoryAiCreateDraft, value: string | boolean): void {
    this.updateInventoryReviewItem(itemId, (item) => ({
      ...item,
      createDraft: {
        ...item.createDraft,
        [field]: field === 'price'
          ? this.parseOptionalNumber(String(value))
          : value
      } as InventoryAiCreateDraft
    }));
  }

  async pasteInventoryImageUrl(itemId: string): Promise<void> {
    if (!navigator.clipboard?.readText) {
      this.notifications.warning({ summary: 'Tu navegador no permite leer el portapapeles en este contexto.' });
      return;
    }

    try
    {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) {
        this.notifications.warning({ summary: 'El portapapeles está vacío.' });
        return;
      }

      this.updateInventoryCreateDraft(itemId, 'imageUrl', text);
      this.notifications.success({ summary: 'URL de imagen pegada desde el portapapeles.' });
    }
    catch
    {
      this.notifications.warning({ summary: 'No fue posible leer el portapapeles. Revisa permisos del navegador.' });
    }
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

  getInventoryConfidenceLabel(confidence: InventoryAiReviewItem['confidence']): string {
    return confidence === 'high' ? 'Alta' : confidence === 'medium' ? 'Media' : 'Baja';
  }

  getInventoryStatusLabel(status: InventoryAiReviewItem['matchStatus']): string {
    return status === 'matched'
      ? 'Ya existe'
      : status === 'needs_review'
        ? 'Revisar'
        : 'Fuera de catalogo';
  }

  openGoogleImagesSearch(query: string): void {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(trimmedQuery)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  getProductNameById(productId: string | null): string {
    if (!productId) {
      return '';
    }

    return this.products().find((product) => product.id === productId)?.name ?? '';
  }

  getInventorySearchQuery(item: InventoryAiReviewItem): string {
    if (item.selectedAction === 'create') {
      return item.createDraft.name.trim() || item.rawLabel;
    }

    return this.getProductNameById(item.selectedProductId) || item.matchedProductName || item.rawLabel;
  }

  hasMissingCreatePrice(item: InventoryAiReviewItem): boolean {
    return item.selectedAction === 'create' && (item.createDraft.price === null || item.createDraft.price <= 0);
  }

  hasBase64ImageUrl(item: InventoryAiReviewItem): boolean {
    return item.createDraft.imageUrl.trim().startsWith('data:');
  }

  hasImageUrlTooLong(item: InventoryAiReviewItem): boolean {
    return item.createDraft.imageUrl.trim().length > 500;
  }

  private buildInventoryAiCommitRequest(scanId: string): InventoryAiCommitRequest {
    const stockAdjustments = this.inventoryAiReviewItems()
      .filter((item) => item.selectedAction === 'adjust' || item.selectedAction === 'link')
      .map((item) => ({
        productId: item.selectedProductId!,
        increaseBy: item.editedQuantity,
        sourceLabel: item.rawLabel
      }));

    const newProducts = this.inventoryAiReviewItems()
      .filter((item) => item.selectedAction === 'create')
      .map((item) => ({
        name: item.createDraft.name.trim(),
        description: item.createDraft.description.trim(),
        price: item.createDraft.price!,
        stock: item.editedQuantity,
        category: item.createDraft.category.trim(),
        imageUrl: item.createDraft.imageUrl.trim() || null,
        isActive: item.createDraft.isActive,
        sourceLabel: item.rawLabel
      }));

    return {
      scanId,
      stockAdjustments,
      newProducts
    };
  }

  private toReviewItem(item: InventoryAiDetectedItemDto, index: number): InventoryAiReviewItem {
    const selectedAction: InventoryAction =
      item.matchStatus === 'matched'
        ? 'adjust'
        : item.matchStatus === 'needs_review'
          ? 'link'
          : 'create';

    return {
      id: `${index}-${item.rawLabel}-${item.matchedProductId ?? 'new'}`,
      rawLabel: item.rawLabel,
      detectedQuantity: item.detectedQuantity,
      editedQuantity: item.detectedQuantity,
      confidence: item.confidence,
      matchStatus: item.matchStatus,
      matchedProductId: item.matchedProductId,
      matchedProductName: item.matchedProductName,
      selectedAction,
      selectedProductId: item.matchedProductId,
      notes: item.notes,
      suggestedCategory: item.suggestedCategory,
      suggestedDescription: item.suggestedDescription,
      suggestedImageUrl: item.suggestedImageUrl,
      createDraft: {
        name: item.rawLabel,
        description: item.suggestedDescription ?? `Producto detectado por IA: ${item.rawLabel}`,
        category: item.suggestedCategory ?? '',
        price: null,
        imageUrl: item.suggestedImageUrl ?? '',
        isActive: true
      }
    };
  }

  private updateInventoryReviewItem(itemId: string, updater: (item: InventoryAiReviewItem) => InventoryAiReviewItem): void {
    this.inventoryAiReviewItems.update((items) =>
      items.map((item) => item.id === itemId ? updater(item) : item)
    );
  }

  private parseOptionalNumber(value: string): number | null {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
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
    afterClose?: () => void
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
    }, this.getModalCloseDurationMs());
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

  private resetInventoryAiState(): void {
    this.inventoryAiLoading.set(false);
    this.inventoryAiSubmitting.set(false);
    this.inventoryAiError.set(null);
    this.inventoryAiAnalysis.set(null);
    this.inventoryAiSelectedFile.set(null);
    this.inventoryAiReviewItems.set([]);
    this.stopInventoryOverlayAnimation();
    this.revokeInventoryPreviewUrl();
  }

  private revokeInventoryPreviewUrl(): void {
    const currentPreviewUrl = this.inventoryAiPreviewUrl();
    if (currentPreviewUrl) {
      URL.revokeObjectURL(currentPreviewUrl);
      this.inventoryAiPreviewUrl.set(null);
    }
  }

  private startInventoryOverlayAnimation(): void {
    this.stopInventoryOverlayAnimation();

    const overlay = this.inventoryLoadingOverlay?.nativeElement;
    const glow = this.inventoryLoadingGlow?.nativeElement;
    const title = this.inventoryLoadingTitle?.nativeElement;
    const subtitle = this.inventoryLoadingSubtitle?.nativeElement;
    const scan = this.inventoryLoadingScan?.nativeElement;
    const dots = this.inventoryLoadingDots?.nativeElement?.children;

    if (!overlay || !glow || !title || !subtitle || !scan || !dots?.length) {
      return;
    }

    gsap.set(overlay, { opacity: 1 });
    gsap.set(glow, { scale: 0.88, opacity: 0.55 });
    gsap.set(title, { y: 20, opacity: 0, filter: 'blur(10px)' });
    gsap.set(subtitle, { y: 12, opacity: 0, filter: 'blur(6px)' });
    gsap.set(scan, { xPercent: -220, opacity: 0 });
    gsap.set(dots, { y: 0, opacity: 0.4, scale: 0.84 });

    const timeline = gsap.timeline({ defaults: { ease: 'power2.out' } });
    timeline
      .to(title, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.55 })
      .to(subtitle, { y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.45 }, '-=0.32')
      .to(scan, { xPercent: 240, opacity: 0.9, duration: 1.32, repeat: -1, ease: 'none', repeatDelay: 0.18 }, 0.1)
      .to(glow, { scale: 1.06, opacity: 0.92, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 0)
      .to(title, { y: -5, duration: 1.1, repeat: -1, yoyo: true, ease: 'sine.inOut' }, 0.2)
      .to(dots, { y: -7, opacity: 1, scale: 1, duration: 0.44, repeat: -1, yoyo: true, stagger: 0.12, ease: 'sine.inOut' }, 0.24);

    this.inventoryOverlayTimeline = timeline;
  }

  private stopInventoryOverlayAnimation(): void {
    this.inventoryOverlayTimeline?.kill();
    this.inventoryOverlayTimeline = null;
  }

  private notifyInventoryAiValidationIssue(): void {
    const items = this.inventoryAiReviewItems();
    const missingPriceItem = items.find((item) => this.hasMissingCreatePrice(item));
    if (missingPriceItem) {
      this.notifications.warning({ summary: `Falta capturar el precio de "${missingPriceItem.createDraft.name || missingPriceItem.rawLabel}".` });
      return;
    }

    const missingProductItem = items.find((item) =>
      (item.selectedAction === 'adjust' || item.selectedAction === 'link') && !item.selectedProductId
    );
    if (missingProductItem) {
      this.notifications.warning({ summary: `Selecciona un producto del catálogo para "${missingProductItem.rawLabel}".` });
      return;
    }

    const invalidQuantityItem = items.find((item) => item.selectedAction !== 'ignore' && item.editedQuantity <= 0);
    if (invalidQuantityItem) {
      this.notifications.warning({ summary: `La cantidad de "${invalidQuantityItem.rawLabel}" debe ser mayor a cero.` });
      return;
    }

    this.notifications.warning({ summary: 'Completa los campos pendientes antes de confirmar.' });
  }
}
