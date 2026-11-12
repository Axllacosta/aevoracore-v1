import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { EntityApi } from './entity-api';
import { CategoryResponse, CategoryCreate, CategoryUpdate } from '../models/category.model';
@Injectable({ providedIn: 'root' })
export class CategoriesApiService extends EntityApi<
  CategoryResponse,
  CategoryCreate,
  CategoryUpdate
> {
  constructor() {
    super(inject(ApiService), '/categories');
  }
}
