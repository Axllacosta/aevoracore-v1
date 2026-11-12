import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';

import { API_CONFIG } from '../config/api.config';
import type { PaginatedResponse } from '../models/pagination.model';
import type { PublicProduct } from '../models/public-product.model';

export interface ProductCatalogFilters {
  search?: string;
  category_id?: number;
  page?: number;
  page_size?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProductCatalogService {
  private readonly http = inject(HttpClient);

  private readonly endpoint = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.publicCatalog}`;

  getCatalog(filters: ProductCatalogFilters = {}): Observable<PaginatedResponse<PublicProduct>> {
    let params = new HttpParams();

    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }

    if (filters.category_id !== undefined) {
      params = params.set('category_id', filters.category_id);
    }

    if (filters.page !== undefined) {
      params = params.set('page', filters.page);
    }

    if (filters.page_size !== undefined) {
      params = params.set('page_size', filters.page_size);
    }

    return this.http.get<PaginatedResponse<PublicProduct>>(this.endpoint, { params }).pipe(
      map((response) => ({
        ...response,
        items: response.items.map((product) => ({
          ...product,
          imagenes: (product.imagenes ?? []).map((image) => ({
            ...image,
            url_imagen: this.resolveImageUrl(image.url_imagen),
            url_miniatura: image.url_miniatura
              ? this.resolveImageUrl(image.url_miniatura)
              : undefined,
          })),
        })),
      })),
    );
  }

  private resolveImageUrl(url: string): string {
    if (!url?.trim()) return '';

    try {
      return new URL(url, `${API_CONFIG.baseUrl}/`).toString();
    } catch {
      return url;
    }
  }
}
