import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { EntityApi } from './entity-api';
import {
  ProductResponse,
  ProductCreate,
  ProductUpdate,
  ProductImageResponse,
  ProductImageUpdate,
} from '../models/product.model';
@Injectable({ providedIn: 'root' })
export class ProductsApiService extends EntityApi<ProductResponse, ProductCreate, ProductUpdate> {
  constructor() {
    super(inject(ApiService), '/products');
  }

  images(id: number) {
    return this.api.get<ProductImageResponse[]>(`/products/${id}/images`);
  }
  uploadImage(id: number, file: File, principal = false) {
    const body = new FormData();
    body.append('file', file);
    body.append('es_principal', String(principal));
    return this.api.post<ProductImageResponse, FormData>(`/products/${id}/images`, body);
  }
  updateImage(id: number, imageId: number, body: ProductImageUpdate) {
    return this.api.patch<ProductImageResponse, ProductImageUpdate>(
      `/products/${id}/images/${imageId}`,
      body,
    );
  }
  deleteImage(id: number, imageId: number) {
    return this.api.delete<void>(`/products/${id}/images/${imageId}`);
  }
}
