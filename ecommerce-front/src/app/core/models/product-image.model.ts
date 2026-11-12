export interface ProductImage {
  id_imagen: number;
  url_imagen: string;
  url_miniatura?: string;
  nombre_archivo: string;
  orden: number;
  es_principal: boolean;
}
