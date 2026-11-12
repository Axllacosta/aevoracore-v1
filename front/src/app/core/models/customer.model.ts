export interface CustomerCreate {
  tipo_persona?: 'NATURAL' | 'JURIDICA';
  razon_social?: string | null;
  direccion_fiscal?: string | null;
  dni: string | null;
  ruc?: string | null;
  correo?: string | null;
  telefono: string | null;
  nombres: string | null;
  apellidos: string | null;
}

export interface CustomerUpdate {
  tipo_persona?: 'NATURAL' | 'JURIDICA';
  razon_social?: string | null;
  direccion_fiscal?: string | null;
  dni?: string;
  ruc?: string | null;
  correo?: string | null;
  telefono?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  activo?: boolean | null;
}

export interface CustomerResponse {
  tipo_persona?: 'NATURAL' | 'JURIDICA';
  razon_social?: string | null;
  direccion_fiscal?: string | null;
  id_cliente: number;
  dni: string | null;
  ruc: string | null;
  correo: string | null;
  telefono: string | null;
  nombres: string | null;
  apellidos: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
