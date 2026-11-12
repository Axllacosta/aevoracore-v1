import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Query, queryParams } from './query';
import { PaginatedResponse } from '../models/api-response.model';
import { InventoryItemResponse, InventoryMinimumUpdate } from '../models/inventory.model';
import {
  MovementResponse,
  ManualMovementCreate,
  InventoryAdjustmentCreate,
} from '../models/movement.model';
@Injectable({ providedIn: 'root' })
export class InventoryApiService {
  private readonly api = inject(ApiService);
  list(query: Query = {}) {
    return this.api.get<PaginatedResponse<InventoryItemResponse>>('/inventory', queryParams(query));
  }
  movements(query: Query = {}) {
    return this.api.get<PaginatedResponse<MovementResponse>>(
      '/inventory/movements',
      queryParams(query),
    );
  }
  minimum(id: number, body: InventoryMinimumUpdate) {
    return this.api.patch<{ id_producto: number; stock_minimo: number }, InventoryMinimumUpdate>(
      `/inventory/${id}/minimum-stock`,
      body,
    );
  }
  movement(body: ManualMovementCreate) {
    return this.api.post<MovementResponse, ManualMovementCreate>('/inventory/movements', body);
  }
  adjustment(body: InventoryAdjustmentCreate) {
    return this.api.post<MovementResponse, InventoryAdjustmentCreate>(
      '/inventory/adjustments',
      body,
    );
  }
}
