import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CartService } from '../services/cart.service';
import { ProductCatalogService } from '../services/product-catalog.service';
import { WhatsAppService } from '../services/whatsapp.service';

import type { ProductCatalogFilters } from '../services/product-catalog.service';
import type { PublicProduct } from '../models/public-product.model';
import type { CheckoutCustomer } from '../models/checkout-customer.model';

type CatalogStatus = 'idle' | 'loading' | 'success' | 'error';

@Injectable({
  providedIn: 'root',
})
export class EcommerceFacade {
  private readonly catalogService = inject(ProductCatalogService);
  private readonly cartService = inject(CartService);
  private readonly whatsappService = inject(WhatsAppService);
  private catalogRequest = 0;

  // Estado del catálogo

  private readonly productsState = signal<PublicProduct[]>([]);

  private readonly catalogStatusState = signal<CatalogStatus>('idle');

  private readonly catalogErrorState = signal<string | null>(null);

  private readonly catalogPageState = signal(1);
  private readonly catalogTotalPagesState = signal(0);
  private readonly catalogTotalState = signal(0);

  readonly products = this.productsState.asReadonly();

  readonly catalogError = this.catalogErrorState.asReadonly();

  readonly catalogPage = this.catalogPageState.asReadonly();

  readonly catalogTotalPages = this.catalogTotalPagesState.asReadonly();

  readonly catalogTotal = this.catalogTotalState.asReadonly();

  readonly isCatalogLoading = computed(() => this.catalogStatusState() === 'loading');

  readonly hasCatalogError = computed(() => this.catalogStatusState() === 'error');

  // Estado del carrito

  readonly cartItems = this.cartService.items;

  readonly cartTotalItems = this.cartService.totalItems;

  readonly cartSubtotal = this.cartService.subtotal;

  readonly isCartEmpty = this.cartService.isEmpty;

  // Catálogo

  async loadCatalog(filters: ProductCatalogFilters = {}): Promise<void> {
    const request = ++this.catalogRequest;
    this.catalogStatusState.set('loading');
    this.catalogErrorState.set(null);

    try {
      const response = await firstValueFrom(this.catalogService.getCatalog(filters));

      if (request !== this.catalogRequest) return;

      this.productsState.set(response.items);
      this.catalogPageState.set(response.page);
      this.catalogTotalPagesState.set(response.total_pages);
      this.catalogTotalState.set(response.total);

      this.catalogStatusState.set('success');
    } catch {
      if (request !== this.catalogRequest) return;
      this.catalogErrorState.set('No fue posible cargar el catálogo. Inténtalo nuevamente.');

      this.catalogStatusState.set('error');
    }
  }

  async loadProduct(productId: number): Promise<PublicProduct | null> {
    try {
      const response = await firstValueFrom(
        this.catalogService.getCatalog({ page: 1, page_size: 100 }),
      );

      return response.items.find((product) => product.id_producto === productId) ?? null;
    } catch {
      return null;
    }
  }

  // Operaciones del carrito

  addProduct(product: PublicProduct, quantity = 1): void {
    this.cartService.addProduct(product, quantity);
  }

  updateCartQuantity(productId: number, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  removeCartProduct(productId: number): void {
    this.cartService.removeProduct(productId);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  // Checkout por WhatsApp

  generateWhatsAppOrderUrl(customer?: CheckoutCustomer): string | null {
    return this.whatsappService.generateOrderUrl(this.cartItems(), this.cartSubtotal(), customer);
  }
}
