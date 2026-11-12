export type CanalVenta = 'PRESENCIAL' | 'WHATSAPP';

export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE' | 'PLIN' | 'TARJETA';

export type EstadoVenta = 'CONFIRMADA' | 'CANCELADA';

export type EstadoPago = 'REGISTRADO' | 'REVERTIDO';
export type TipoComprobante = 'BOLETA' | 'FACTURA';
export interface DocumentConfig {
  ruc: string;
  razon_social: string;
  direccion: string;
}
export interface SaleDocument {
  id_comprobante: number;
  tipo: TipoComprobante;
  serie: string;
  correlativo: number;
  fecha_emision: string;
  receptor_nombre: string;
}

export interface SaleDetailCreate {
  id_producto: number;
  cantidad: number;
  descuento_porcentaje?: number | string;
  descuento_importe?: number | string;
}

export interface PaymentCreate {
  medio_pago: MedioPago;
  importe: number | string;
}

export interface SaleCreate {
  tipo_comprobante?: TipoComprobante;
  clave_idempotencia?: string;
  id_cliente: number;
  canal_venta: CanalVenta;
  pagos: PaymentCreate[];
  detalles: SaleDetailCreate[];
}

export interface SaleCancelRequest {
  motivo_cancelacion: string;
}

export interface SaleDetailResponse {
  id_detalle_venta: number;
  id_producto: number;
  cantidad: number;
  precio_unitario_base: string;
  descuento_importe: string;
  subtotal_linea: string;
  total_linea: string;
}

export interface PaymentResponse {
  id_pago: number;
  id_venta: number;
  medio_pago: MedioPago;
  importe: string;
  estado: EstadoPago;
  fecha_hora: string;
  fecha_reversion: string | null;
  motivo_reversion: string | null;
}

export interface SaleResponse {
  comprobante?: SaleDocument | null;
  id_venta: number;
  id_cliente: number;
  id_usuario: number;
  canal_venta: CanalVenta;
  estado: EstadoVenta;
  fecha_hora: string;
  subtotal: string;
  descuento_total: string;
  total: string;
  motivo_cancelacion: string | null;
  fecha_cancelacion: string | null;
  detalles: SaleDetailResponse[];
  pagos: PaymentResponse[];
}
