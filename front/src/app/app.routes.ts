import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
export const routes: Routes = [
  {
    path: 'login',
    title: 'AevoraCore | EDITH',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/pages/login/login.component').then((m) => m.Login),
  },
  {
    path: '',
    title: 'AevoraCore | EDITH',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then((m) => m.AdminLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard.component').then(
            (m) => m.Dashboard,
          ),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/pages/categories/categories.component').then(
            (m) => m.Category,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/pages/products/products.component').then((m) => m.Products),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./features/customers/pages/customers/customers.component').then(
            (m) => m.Customers,
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/pages/inventory/inventory.component').then(
            (m) => m.Inventory,
          ),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./features/expenses/pages/expenses/expenses.component').then((m) => m.Expenses),
      },
      {
        path: 'kardex',
        loadComponent: () =>
          import('./features/kardex/pages/kardex/kardex.component').then((m) => m.Kardex),
      },
      {
        path: 'pos',
        loadComponent: () => import('./features/sales/pages/pos/pos.component').then((m) => m.Pos),
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./features/sales/pages/sales/sales.component').then((m) => m.Sales),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
