import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EntityFacade } from '../../../core/state/entity.facade';
import { ProductsApiService } from '../../../core/api/products-api.service';
import { CategoriesApiService } from '../../../core/api/categories-api.service';
import { allPages } from '../../../core/api/all-pages';
import { errorMessage } from '../../../core/api/api-error';
import {
  ProductResponse,
  ProductCreate,
  ProductUpdate,
  ProductImageResponse,
} from '../../../core/models/product.model';
import { CategoryResponse } from '../../../core/models/category.model';
@Injectable()
export class ProductsFacade extends EntityFacade<ProductResponse, ProductCreate, ProductUpdate> {
  private readonly products = inject(ProductsApiService);
  private readonly categoriesApi = inject(CategoriesApiService);
  readonly categories = signal<CategoryResponse[]>([]);
  readonly images = signal<ProductImageResponse[]>([]);
  readonly imageProduct = signal<ProductResponse | null>(null);
  readonly imageBusy = signal(false);
  readonly imageError = signal('');
  readonly categoryError = signal('');
  constructor() {
    super(inject(ProductsApiService), inject(MessageService));
    void this.loadCategories();
  }
  override save(id: number | null, body: ProductCreate | ProductUpdate) {
    if (id !== null && body.id_categoria === this.selected()?.id_categoria) {
      const changes: ProductUpdate = { ...body };
      delete changes.id_categoria;
      return super.save(id, changes);
    }
    return super.save(id, body);
  }
  async loadCategories() {
    this.categoryError.set('');
    try {
      this.categories.set(
        await allPages((page) => this.categoriesApi.list({ page, page_size: 100 })),
      );
    } catch (e) {
      this.categoryError.set(errorMessage(e));
    }
  }
  async loadImages(row: ProductResponse) {
    this.imageProduct.set(row);
    this.imageError.set('');
    this.images.set([]);
    this.imageBusy.set(true);
    try {
      this.images.set(await firstValueFrom(this.products.images(row.id_producto)));
    } catch (e) {
      this.imageError.set(errorMessage(e));
    } finally {
      this.imageBusy.set(false);
    }
  }
  async upload(files: File[]) {
    const product = this.imageProduct();
    if (!product || this.imageBusy()) return;
    this.imageBusy.set(true);
    this.imageError.set('');
    try {
      for (const file of files) {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
          throw new Error('Usa imágenes JPG, PNG o WebP.');
        const image = await firstValueFrom(
          this.products.uploadImage(product.id_producto, file, this.images().length === 0),
        );
        this.images.update((images) => [...images, image]);
      }
      this.messages.add({ severity: 'success', summary: 'Imágenes guardadas' });
      await this.load();
    } catch (e) {
      this.imageError.set(errorMessage(e));
    } finally {
      this.imageBusy.set(false);
    }
  }
  async imageAction(image: ProductImageResponse, remove = false) {
    const product = this.imageProduct();
    if (!product || this.imageBusy()) return;
    this.imageBusy.set(true);
    this.imageError.set('');
    try {
      if (remove)
        await firstValueFrom(this.products.deleteImage(product.id_producto, image.id_imagen));
      else
        await firstValueFrom(
          this.products.updateImage(product.id_producto, image.id_imagen, { es_principal: true }),
        );
      this.images.set(await firstValueFrom(this.products.images(product.id_producto)));
      await this.load();
    } catch (e) {
      this.imageError.set(errorMessage(e));
    } finally {
      this.imageBusy.set(false);
    }
  }
}
