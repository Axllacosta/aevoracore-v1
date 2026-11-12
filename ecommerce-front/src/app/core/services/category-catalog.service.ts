import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import type { PublicCategory } from '../models/public-category.model';

@Injectable({ providedIn: 'root' })
export class CategoryCatalogService {
  private readonly http = inject(HttpClient);
  private readonly categoriesState = signal<PublicCategory[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal(false);
  private request?: Promise<void>;
  private loaded = false;

  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): Promise<void> {
    if (this.loaded) return Promise.resolve();
    return (this.request ??= this.fetchCategories());
  }

  private async fetchCategories(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(false);
    try {
      const categories = await firstValueFrom(
        this.http.get<PublicCategory[]>(
          `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.publicCategories}`,
        ),
      );
      this.categoriesState.set(categories);
      this.loaded = true;
    } catch {
      this.errorState.set(true);
    } finally {
      this.loadingState.set(false);
      this.request = undefined;
    }
  }
}
