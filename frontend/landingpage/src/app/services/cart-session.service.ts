import { computed, Injectable, signal } from '@angular/core';
import { PromotionValidationDto } from '../core/models';

interface CartSessionState {
  items: Record<string, number>;
  promoCode: string;
  appliedPromotion: PromotionValidationDto | null;
}

const EMPTY_STATE: CartSessionState = {
  items: {},
  promoCode: '',
  appliedPromotion: null
};

@Injectable({ providedIn: 'root' })
export class CartSessionService {
  private readonly activeSlug = signal<string | null>(null);
  private readonly state = signal<CartSessionState>(EMPTY_STATE);

  readonly items = computed(() => this.state().items);
  readonly promoCode = computed(() => this.state().promoCode);
  readonly appliedPromotion = computed(() => this.state().appliedPromotion);
  readonly cartCount = computed(() =>
    Object.values(this.state().items).reduce((total, quantity) => total + quantity, 0)
  );

  loadForSlug(slug: string): void {
    const normalizedSlug = slug.trim().toLowerCase();
    if (this.activeSlug() === normalizedSlug) {
      return;
    }

    this.activeSlug.set(normalizedSlug);
    this.state.set(this.readState(normalizedSlug));
  }

  addItem(productId: string, quantity = 1, stockLimit?: number): void {
    const current = this.state();
    const nextQuantity = (current.items[productId] ?? 0) + quantity;
    const cappedQuantity = typeof stockLimit === 'number' ? Math.min(stockLimit, nextQuantity) : nextQuantity;
    this.updateState({
      items: { ...current.items, [productId]: Math.max(0, cappedQuantity) },
      promoCode: current.promoCode,
      appliedPromotion: current.appliedPromotion
    }, true);
  }

  setQuantity(productId: string, quantity: number): void {
    const current = this.state();
    const nextItems = { ...current.items };
    if (quantity <= 0) {
      delete nextItems[productId];
    } else {
      nextItems[productId] = quantity;
    }

    this.updateState({
      items: nextItems,
      promoCode: current.promoCode,
      appliedPromotion: current.appliedPromotion
    }, true);
  }

  removeItem(productId: string): void {
    this.setQuantity(productId, 0);
  }

  setPromoCode(code: string): void {
    const current = this.state();
    const normalizedCode = code.trim().toUpperCase();
    const appliedPromotion = current.appliedPromotion?.code === normalizedCode ? current.appliedPromotion : null;

    this.updateState({
      items: current.items,
      promoCode: normalizedCode,
      appliedPromotion
    });
  }

  applyPromotion(promotion: PromotionValidationDto): void {
    const current = this.state();
    this.updateState({
      items: current.items,
      promoCode: promotion.code,
      appliedPromotion: promotion
    });
  }

  clearPromotion(resetCode = false): void {
    const current = this.state();
    this.updateState({
      items: current.items,
      promoCode: resetCode ? '' : current.promoCode,
      appliedPromotion: null
    });
  }

  clearCart(): void {
    this.updateState(EMPTY_STATE);
  }

  private updateState(nextState: CartSessionState, invalidatePromotion = false): void {
    const finalState = invalidatePromotion
      ? {
          items: nextState.items,
          promoCode: nextState.promoCode,
          appliedPromotion: null
        }
      : nextState;

    this.state.set(finalState);
    this.persist();
  }

  private persist(): void {
    const slug = this.activeSlug();
    if (!slug) {
      return;
    }

    sessionStorage.setItem(this.getStorageKey(slug), JSON.stringify(this.state()));
  }

  private readState(slug: string): CartSessionState {
    const rawState = sessionStorage.getItem(this.getStorageKey(slug));
    if (!rawState) {
      return EMPTY_STATE;
    }

    try {
      const parsed = JSON.parse(rawState) as Partial<CartSessionState>;
      return {
        items: parsed.items ?? {},
        promoCode: parsed.promoCode ?? '',
        appliedPromotion: parsed.appliedPromotion ?? null
      };
    } catch {
      return EMPTY_STATE;
    }
  }

  private getStorageKey(slug: string): string {
    return `bien-helodias-cart:${slug}`;
  }
}
