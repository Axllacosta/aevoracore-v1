import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import { CategoryCatalogService } from '../../../../core/services/category-catalog.service';
import { ProductGallery } from '../../components/product-gallery/product-gallery.component';

import type { PublicProduct } from '../../../../core/models/public-product.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, ProductGallery],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.scss',
})
export class ProductDetail implements OnInit {
  private readonly ecommerce = inject(EcommerceFacade);
  private readonly categories = inject(CategoryCatalogService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly product = signal<PublicProduct | null>(null);
  readonly category = computed(() =>
    this.categories
      .categories()
      .find((category) => category.id_categoria === this.product()?.id_categoria),
  );

  readonly quantity = signal(1);
  readonly loading = signal(true);
  readonly unavailable = signal(false);
  private productRequest = 0;

  readonly specifications = computed(() => {
    const product = this.product();
    if (!product) return [];

    return [
      { label: 'Material', value: product.material },
      { label: 'Color', value: product.color },
      { label: 'Acabado', value: product.acabado },
      { label: 'Alto', value: product.alto?.trim() ? `${product.alto} cm` : null },
      { label: 'Ancho', value: product.ancho?.trim() ? `${product.ancho} cm` : null },
      {
        label: 'Profundidad',
        value: product.profundidad?.trim() ? `${product.profundidad} cm` : null,
      },
    ].filter((specification) => specification.value?.trim());
  });

  ngOnInit(): void {
    void this.categories.load();
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const productId = Number(params.get('id'));

      if (!Number.isInteger(productId) || productId <= 0) {
        ++this.productRequest;
        this.product.set(null);
        this.loading.set(false);
        this.unavailable.set(true);
        return;
      }

      void this.loadProduct(productId);
    });
  }

  private async loadProduct(productId: number): Promise<void> {
    const request = ++this.productRequest;
    this.loading.set(true);
    this.unavailable.set(false);
    this.product.set(null);
    this.quantity.set(1);

    const foundProduct = await this.ecommerce.loadProduct(productId);
    if (request !== this.productRequest) return;

    if (!foundProduct) {
      this.unavailable.set(true);
      this.loading.set(false);
      return;
    }

    this.product.set(foundProduct);

    this.loading.set(false);
  }

  increaseQuantity(): void {
    this.quantity.update((value) => Math.min(value + 1, 99));
  }

  decreaseQuantity(): void {
    this.quantity.update((value) => Math.max(value - 1, 1));
  }

  addToCart(): void {
    const currentProduct = this.product();

    if (!currentProduct) {
      return;
    }

    this.ecommerce.addProduct(currentProduct, this.quantity());

    void this.router.navigate(['/carrito']);
  }
}
