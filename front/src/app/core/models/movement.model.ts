export type TipoMovimiento = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

export type DireccionAjuste = 'INCREMENTO' | 'DECREMENTO';

export interface ManualMovementCreate {
  id_producto: number;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  motivo: string;
}

export interface InventoryAdjustmentCreate {
  id_producto: number;
  direccion_ajuste: DireccionAjuste;
  cantidad: number;
  motivo: string;
}

export interface MovementResponse {
  id_movimiento: number;
  id_producto: number;
  id_usuario: number;
  id_detalle_venta: number | null;
  id_venta_cancelada: number | null;
  tipo_movimiento: TipoMovimiento;
  direccion_ajuste: DireccionAjuste | null;
  cantidad: number;
  stock_anterior: number;
  stock_posterior: number;
  motivo: string | null;
  fecha_hora: string;
}
