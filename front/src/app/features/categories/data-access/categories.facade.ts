import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EntityFacade } from '../../../core/state/entity.facade';
import { CategoriesApiService } from '../../../core/api/categories-api.service';
import {
  CategoryResponse,
  CategoryCreate,
  CategoryUpdate,
} from '../../../core/models/category.model';
@Injectable()
export class CategoriesFacade extends EntityFacade<
  CategoryResponse,
  CategoryCreate,
  CategoryUpdate
> {
  constructor() {
    super(inject(CategoriesApiService), inject(MessageService));
  }
}
