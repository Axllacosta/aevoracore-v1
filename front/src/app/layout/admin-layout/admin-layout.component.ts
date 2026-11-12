import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { SidebarModule } from 'primeng/sidebar';
import { AvatarModule } from 'primeng/avatar';
import { TooltipModule } from 'primeng/tooltip';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SidebarModule, AvatarModule, TooltipModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayout {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  readonly user = inject(AuthStore).user;
  readonly isMobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 1000px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  sidebarOpen = true;
  mobileOpen = false;
  readonly groups = [
    {
      label: 'General',
      items: [{ label: 'Dashboard', icon: 'pi pi-chart-bar', routerLink: '/dashboard' }],
    },
    {
      label: 'Catálogo',
      items: [
        { label: 'Productos', icon: 'pi pi-box', routerLink: '/products' },
        { label: 'Categorías', icon: 'pi pi-tags', routerLink: '/categories' },
      ],
    },
    {
      label: 'Operaciones',
      items: [
        { label: 'Inventario', icon: 'pi pi-warehouse', routerLink: '/inventory' },
        { label: 'Kardex', icon: 'pi pi-history', routerLink: '/kardex' },
        { label: 'Compras y gastos', icon: 'pi pi-wallet', routerLink: '/expenses' },
      ],
    },
    {
      label: 'Comercial',
      items: [
        { label: 'Punto de venta', icon: 'pi pi-shopping-cart', routerLink: '/pos' },
        { label: 'Ventas', icon: 'pi pi-receipt', routerLink: '/sales' },
        { label: 'Clientes', icon: 'pi pi-users', routerLink: '/customers' },
      ],
    },
  ];

  setOpen(open: boolean) {
    if (this.isMobile()) this.mobileOpen = open;
    else this.sidebarOpen = open;
  }

  closeNavigation() {
    if (this.isMobile()) this.mobileOpen = false;
  }

  logout() {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
