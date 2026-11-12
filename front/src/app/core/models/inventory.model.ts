export interface InventoryItemResponse {
  id_producto: number;
  sku: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  fecha_actualizacion: string | null;
  stock_bajo: boolean;
}

export interface InventoryMinimumUpdate {
  stock_minimo: number;
}
