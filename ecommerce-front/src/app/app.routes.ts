import { Routes } from '@angular/router';

import { HomePage } from './features/home/pages/home-page/home-page.component';
import { ProductList } from './features/products/pages/product-list/product-list.component';
import { ProductDetail } from './features/products/pages/product-detail/product-detail.component';
import { CartPage } from './features/cart/pages/cart-page/cart-page.component';
import { WhatsappCheckout } from './features/checkout/pages/whatsapp-checkout/whatsapp-checkout.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePage,
    title: 'Inicio | EDITH',
  },
  {
    path: 'productos',
    component: ProductList,
    title: 'Products | EDITH',
  },
  {
    path: 'productos/:id',
    component: ProductDetail,
    title: 'Detalle del producto | EDITH',
  },
  {
    path: 'products',
    redirectTo: 'productos',
  },
  {
    path: 'carrito',
    component: CartPage,
  },
  {
    path: 'checkout',
    component: WhatsappCheckout,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
