import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { InventoryApiService } from '../../../core/api/inventory-api.service';
import { ListState } from '../../../core/state/list-state';
import { OperationState } from '../../../core/state/operation-state';
import { InventoryItemResponse } from '../../../core/models/inventory.model';
import {
  ManualMovementCreate,
  InventoryAdjustmentCreate,
} from '../../../core/models/movement.model';
@Injectable()
export class InventoryFacade extends ListState<InventoryItemResponse> {
  private readonly api = inject(InventoryApiService);
  readonly operation = new OperationState(inject(MessageService));
  constructor() {
    const api = inject(InventoryApiService);
    super((query) => api.list(query));
  }
  async minimum(id: number, value: number) {
    const result = await this.operation.run(
      () => this.api.minimum(id, { stock_minimo: value }),
      'Stock mínimo actualizado',
      () => this.load(),
    );
    return !!result;
  }
  async movement(body: ManualMovementCreate | InventoryAdjustmentCreate) {
    const result = await this.operation.run(
      () => ('direccion_ajuste' in body ? this.api.adjustment(body) : this.api.movement(body)),
      'Movimiento registrado',
      () => this.load(),
    );
    return !!result;
  }
}
