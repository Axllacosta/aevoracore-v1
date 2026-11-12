import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import { CartItem } from '../../../../core/models/cart-item.model';
import { ProductImage } from '../../../products/components/product-image/product-image.component';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, ProductImage],
  templateUrl: './cart-page.component.html',
  styleUrl: './cart-page.component.scss',
})
export class CartPage {
  protected readonly ecommerce = inject(EcommerceFacade);

  protected readonly maxQuantity = 99;

  increaseQuantity(item: CartItem): void {
    if (item.quantity >= this.maxQuantity) return;

    this.ecommerce.updateCartQuantity(item.product.id_producto, item.quantity + 1);
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity <= 1) return;

    this.ecommerce.updateCartQuantity(item.product.id_producto, item.quantity - 1);
  }

  removeProduct(item: CartItem): void {
    this.ecommerce.removeCartProduct(item.product.id_producto);
  }

  clearCart(): void {
    this.ecommerce.clearCart();
  }

  getLineSubtotal(item: CartItem): number {
    const price = Number(item.product.precio_base);

    if (!Number.isFinite(price)) return 0;

    return Math.round(price * 100 * item.quantity) / 100;
  }
}
