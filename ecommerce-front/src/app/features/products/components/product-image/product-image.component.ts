import { Component, computed, input, linkedSignal } from '@angular/core';
import type { ProductImage as ProductImageData } from '../../../../core/models/product-image.model';

@Component({
  selector: 'app-product-image',
  standalone: true,
  templateUrl: './product-image.component.html',
  styleUrl: './product-image.component.scss',
})
export class ProductImage {
  readonly images = input<ProductImageData[]>([]);
  readonly alt = input('Imagen del producto');
  readonly fit = input<'cover' | 'contain'>('cover');
  readonly priority = input(false);
  readonly selectedUrl = input<string | null>(null);
  readonly thumbnail = input(false);

  private readonly failedImages = linkedSignal({
    source: () =>
      `${this.thumbnail()}|${this.selectedUrl() ?? ''}|${this.images()
        .map((image) => `${image.url_imagen}:${image.url_miniatura ?? ''}`)
        .join('|')}`,
    computation: () => 0,
  });
  private readonly candidates = computed(() =>
    [...this.images()]
      .filter((image) => !!image.url_imagen?.trim())
      .sort((a, b) => Number(b.es_principal) - Number(a.es_principal) || a.orden - b.orden),
  );
  readonly currentUrl = computed(() => {
    const images = this.candidates();
    const selected = this.selectedUrl();
    const ordered = selected
      ? [
          ...images.filter((image) => image.url_imagen === selected),
          ...images.filter((image) => image.url_imagen !== selected),
        ]
      : images;
    const urls = ordered.flatMap((image) =>
      this.thumbnail() && image.url_miniatura
        ? [image.url_miniatura, image.url_imagen]
        : [image.url_imagen],
    );
    return [...new Set(urls)][this.failedImages()] ?? null;
  });

  tryNextImage(): void {
    this.failedImages.update((index) => index + 1);
  }
}
