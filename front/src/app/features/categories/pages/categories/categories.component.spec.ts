import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Category } from './categories.component';
import { AuthStore } from '../../../../core/auth/auth.store';
import { API_BASE_URL } from '../../../../core/api/api-url';
describe('Categories', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Category],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
      ],
    }),
  );
  it('rejects a whitespace-only category before making a write request', () => {
    const component = TestBed.createComponent(Category).componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/categories')
      .flush({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
    component.form.controls['nombre'].setValue('   ');
    void component.save();
    expect(component.form.invalid).toBe(true);
    requests.expectNone((r) => r.method === 'POST');
    requests.verify();
  });
  it('renders the category table and opens its form from the toolbar', async () => {
    TestBed.inject(AuthStore).setUser({
      id_usuario: 1,
      nombres: 'Admin',
      apellidos: '',
      email: 'admin@example.test',
      dni: null,
      activo: true,
      rol: 'ADMIN',
    });
    const fixture = TestBed.createComponent(Category);
    const requests = TestBed.inject(HttpTestingController);
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/categories')
      .flush({
        items: [{ id_categoria: 7, nombre: 'Sala', descripcion: 'Sofás y mesas', activo: true }],
        page: 1,
        page_size: 20,
        total: 1,
        total_pages: 1,
      });
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('tbody tr')?.textContent).toContain('Sala');
    expect(root.querySelector('tbody tr')?.textContent).toContain('Sofás y mesas');
    expect(
      Array.from(root.querySelectorAll('thead th')).map((cell) => cell.textContent?.trim()),
    ).toEqual(['ID', 'Nombre', 'Descripción', 'Estado', 'Acciones']);
    expect(root.querySelectorAll('tbody tr:first-child > td').length).toBe(5);
    const toolbarButtons = Array.from(root.querySelectorAll('p-toolbar button'));
    expect(toolbarButtons.at(-2)?.getAttribute('aria-label')).toBe('Actualizar listado');
    expect(toolbarButtons.at(-1)?.textContent).toContain('Crear categoría');
    (toolbarButtons.at(-1) as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('input[formControlName="nombre"]')).not.toBeNull();
    expect(root.querySelector('textarea[formControlName="descripcion"]')).not.toBeNull();
    expect(root.querySelector('[role="progressbar"]')).toBeNull();
    requests.verify();
  });
});
