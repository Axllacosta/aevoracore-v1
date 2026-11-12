export interface ProductImageUpdate {
  orden?: number | null;
  es_principal?: boolean | null;
}

export interface ProductImageResponse {
  id_imagen: number;
  url_imagen: string;
  nombre_archivo: string;
  orden: number;
  es_principal: boolean;
}

export interface ProductCreate {
  id_categoria: number;
  sku: string;
  nombre: string;
  descripcion?: string | null;
  color?: string | null;
  acabado?: string | null;
  material?: string | null;
  alto?: number | string | null;
  ancho?: number | string | null;
  profundidad?: number | string | null;
  precio_base: number | string;
  costo_referencia?: number | string | null;
  controlar_stock?: boolean;
}

export interface ProductUpdate {
  id_categoria?: number | null;
  sku?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  color?: string | null;
  acabado?: string | null;
  material?: string | null;
  alto?: number | string | null;
  ancho?: number | string | null;
  profundidad?: number | string | null;
  precio_base?: number | string | null;
  costo_referencia?: number | string | null;
  controlar_stock?: boolean;
  activo?: boolean | null;
}

export interface ProductResponse {
  id_producto: number;
  id_categoria: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  acabado: string | null;
  material: string | null;
  alto: string | null;
  ancho: string | null;
  profundidad: string | null;
  precio_base: string;
  costo_referencia: string | null;
  activo: boolean;
  controlar_stock: boolean;
  imagenes: ProductImageResponse[];
  created_at: string;
  updated_at: string;
}

export interface PublicProductResponse {
  id_producto: number;
  id_categoria: number;
  sku: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  acabado: string | null;
  material: string | null;
  alto: string | null;
  ancho: string | null;
  profundidad: string | null;
  precio_base: string;
  imagenes: ProductImageResponse[];
}
