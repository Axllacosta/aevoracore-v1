import { Component, computed, input, linkedSignal } from '@angular/core';
import { ProductImage } from '../product-image/product-image.component';
import type { ProductImage as ProductImageData } from '../../../../core/models/product-image.model';

@Component({
  selector: 'app-product-gallery',
  imports: [ProductImage],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.scss',
})
export class ProductGallery {
  readonly images = input<ProductImageData[]>([]);
  readonly name = input('Imagen del producto');

  readonly sortedImages = computed(() =>
    [...this.images()]
      .filter((image) => image.url_imagen?.trim())
      .sort((a, b) => a.orden - b.orden),
  );

  readonly selectedImage = linkedSignal(() => {
    const images = this.sortedImages();
    return (images.find((image) => image.es_principal) ?? images[0])?.url_imagen ?? null;
  });
}
