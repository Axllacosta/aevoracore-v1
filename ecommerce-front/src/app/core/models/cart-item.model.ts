import type { PublicProduct } from './public-product.model';

export interface CartItem {
  product: PublicProduct;
  quantity: number;
}
