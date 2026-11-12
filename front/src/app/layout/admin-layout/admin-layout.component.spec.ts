import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AdminLayout } from './admin-layout.component';
import { AuthService } from '../../core/auth/auth.service';
import { AuthStore } from '../../core/auth/auth.store';

describe('Admin layout navigation', () => {
  const viewport = new BehaviorSubject<BreakpointState>({ matches: false, breakpoints: {} });
  const logout = vi.fn();
  beforeEach(() => {
    viewport.next({ matches: false, breakpoints: {} });
    logout.mockClear();
    TestBed.configureTestingModule({
      imports: [AdminLayout],
      providers: [
        provideRouter([]),
        { provide: BreakpointObserver, useValue: { observe: () => viewport.asObservable() } },
        { provide: AuthService, useValue: { logout } },
      ],
    });
    TestBed.inject(AuthStore).setUser({
      id_usuario: 1,
      nombres: 'Ana',
      apellidos: 'Pérez',
      email: 'ana@example.test',
      dni: null,
      activo: true,
      rol: 'ADMIN',
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('keeps user and logout in the sidebar and supports collapsing and expanding', async () => {
    const fixture = TestBed.createComponent(AdminLayout);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('p-sidebar-main > header')).toBeNull();
    expect(root.querySelector('p-sidebar .sidebar-user')?.textContent).toContain('Ana Pérez');
    expect(root.querySelector('p-sidebar-footer .sidebar-logout')).not.toBeNull();
    expect(root.textContent).not.toContain('Un almacén');
    const toggle = root.querySelector<HTMLButtonElement>('.sidebar-toggle')!;
    toggle.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sidebarOpen).toBe(false);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('p-sidebar')?.getAttribute('data-collapsible')).toBe('icon');
    toggle.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.sidebarOpen).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a mobile opener available after closing the sidebar', async () => {
    viewport.next({ matches: true, breakpoints: {} });
    const fixture = TestBed.createComponent(AdminLayout);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.mobile-menu-trigger')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.mobileOpen).toBe(true);
    expect(root.querySelector('.mobile-menu-trigger')).toBeNull();
    root.querySelector<HTMLButtonElement>('.sidebar-toggle')!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.mobileOpen).toBe(false);
    expect(root.querySelector('.mobile-menu-trigger')).not.toBeNull();
  });

  it('logs out from the sidebar footer and returns to login', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminLayout);
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.sidebar-logout').click();
    expect(logout).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
