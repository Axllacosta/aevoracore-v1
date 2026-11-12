export interface ExpenseCategory {
  id_categoria_gasto: number;
  nombre: string;
  requiere_descripcion: boolean;
}
export interface ExpenseCreate {
  id_categoria_gasto: number;
  fecha: string;
  importe: string;
  descripcion: string | null;
}
export interface ExpenseResponse extends ExpenseCreate {
  id_gasto: number;
  id_usuario: number;
  activo: boolean;
  categoria: ExpenseCategory;
  created_at: string;
  updated_at: string;
}
export interface MonthlyExpenseSummary {
  anio: number;
  mes: number;
  ventas_confirmadas: string;
  gastos: string;
  resultado_estimado: string;
  cantidad_gastos: number;
  por_categoria: { id_categoria_gasto: number; nombre: string; total: string }[];
}
