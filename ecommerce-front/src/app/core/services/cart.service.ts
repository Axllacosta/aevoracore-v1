import { computed, Injectable, signal } from '@angular/core';

import type { CartItem } from '../models/cart-item.model';
import type { PublicProduct } from '../models/public-product.model';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly itemsState = signal<CartItem[]>([]);

  readonly items = this.itemsState.asReadonly();

  readonly totalItems = computed(() =>
    this.itemsState().reduce((total, item) => total + item.quantity, 0),
  );

  readonly subtotal = computed(() => {
    const totalInCents = this.itemsState().reduce(
      (total, item) => total + this.toCents(item.product.precio_base) * item.quantity,
      0,
    );

    return totalInCents / 100;
  });

  readonly isEmpty = computed(() => this.itemsState().length === 0);

  addProduct(product: PublicProduct, quantity = 1): void {
    if (!Number.isInteger(quantity) || quantity < 1) {
      return;
    }

    this.itemsState.update((items) => {
      const existingItem = items.find((item) => item.product.id_producto === product.id_producto);

      if (existingItem) {
        return items.map((item) =>
          item.product.id_producto === product.id_producto
            ? {
                ...item,
                quantity: item.quantity + quantity,
              }
            : item,
        );
      }

      return [
        ...items,
        {
          product,
          quantity,
        },
      ];
    });
  }

  updateQuantity(productId: number, quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      this.removeProduct(productId);
      return;
    }

    this.itemsState.update((items) =>
      items.map((item) => (item.product.id_producto === productId ? { ...item, quantity } : item)),
    );
  }

  removeProduct(productId: number): void {
    this.itemsState.update((items) =>
      items.filter((item) => item.product.id_producto !== productId),
    );
  }

  clearCart(): void {
    this.itemsState.set([]);
  }

  private toCents(price: string): number {
    const value = Number(price);

    if (!Number.isFinite(value)) {
      return 0;
    }

    return Math.round(value * 100);
  }
}
