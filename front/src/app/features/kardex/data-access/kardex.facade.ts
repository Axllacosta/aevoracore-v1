import { Injectable, inject } from '@angular/core';
import { InventoryApiService } from '../../../core/api/inventory-api.service';
import { MovementResponse } from '../../../core/models/movement.model';
import { ListState } from '../../../core/state/list-state';
@Injectable()
export class KardexFacade extends ListState<MovementResponse> {
  constructor() {
    const api = inject(InventoryApiService);
    super((query) => api.movements(query));
  }
}
