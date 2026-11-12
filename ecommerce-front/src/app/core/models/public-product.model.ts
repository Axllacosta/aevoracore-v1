import type { ProductImage } from './product-image.model';

export interface PublicProduct {
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
  imagenes: ProductImage[];
}
