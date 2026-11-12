export interface CategoryCreate {
  nombre: string;
  descripcion?: string | null;
}

export interface CategoryUpdate {
  nombre?: string | null;
  descripcion?: string | null;
  activo?: boolean | null;
}

export interface CategoryResponse {
  id_categoria: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}
