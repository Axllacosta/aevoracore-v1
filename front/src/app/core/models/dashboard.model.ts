import { CanalVenta } from './sale.model';

export interface DashboardResponse {
  anio: number;
  mes: number;
  generado_en: string;
  ranking_desde: string;
  ranking_hasta: string;
  kpis: {
    ventas_totales: number;
    productos_vendidos: number;
    ingresos: string;
    egresos: string;
    balance: string;
  };
  canales: { canal_venta: CanalVenta; importe: string; porcentaje: string }[];
  productos_mas_vendidos: {
    id_producto: number;
    sku: string;
    nombre: string;
    unidades_vendidas: number;
    importe: string;
  }[];
  balance_mensual: {
    anio: number;
    mes: number;
    ingresos: string;
    egresos: string;
    balance: string;
  }[];
}
