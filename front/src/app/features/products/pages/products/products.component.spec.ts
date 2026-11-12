import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Products } from './products.component';
import { ProductCreateWizard } from '../../components/product-create-wizard/product-create-wizard.component';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { vi } from 'vitest';
describe('Product validation', () => {
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [Products],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
      ],
    }),
  );
  it('opens the product wizard with the existing form and preserves the editor separately', async () => {
    const fixture = TestBed.createComponent(Products);
    const component = fixture.componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    for (const request of requests.match((r) => r.method === 'GET'))
      request.flush({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
    component.create();
    await fixture.whenStable();
    const wizard = fixture.debugElement.query(By.directive(ProductCreateWizard))
      .componentInstance as ProductCreateWizard;
    expect(wizard.form()).toBe(component.form);
    expect(wizard.steps).toHaveLength(5);
    expect(fixture.nativeElement.querySelector('.wizard-card')).not.toBeNull();
    requests.verify();
  });
  it('rejects non-positive dimensions and negative prices', () => {
    const component = TestBed.createComponent(Products).componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    for (const request of requests.match((r) => r.method === 'GET'))
      request.flush({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
    component.form.patchValue({
      id_categoria: 1,
      sku: 'TEST',
      nombre: 'Mesa',
      alto: 0,
      precio_base: -1,
    });
    expect(component.form.invalid).toBe(true);
    component.form.patchValue({ alto: 1, precio_base: 0 });
    expect(component.form.valid).toBe(true);
    requests.verify();
  });
  it('keeps edits across tabs and reveals the tab with invalid fields when saving', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const fixture = TestBed.createComponent(Products);
    const component = fixture.componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    for (const request of requests.match((r) => r.method === 'GET'))
      request.flush({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
    component.editing.set(1);
    component.form.patchValue({ id_categoria: 1, sku: 'MESA', nombre: 'Mesa' });
    component.dialog.set(true);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const name = root.querySelector('input#nombre') as HTMLInputElement;
    name.value = 'Mesa actualizada';
    name.dispatchEvent(new Event('input'));
    const tabs = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual([
      'Información general',
      'Características',
      'Precios e inventario',
    ]);
    tabs[1].click();
    await fixture.whenStable();
    expect(component.editTab()).toBe('features');
    tabs[0].click();
    await fixture.whenStable();
    expect(component.form.controls['nombre'].value).toBe('Mesa actualizada');
    await component.save();
    await fixture.whenStable();
    expect(component.editTab()).toBe('pricing');
    expect(root.querySelector('.tab-error')?.textContent).toContain('Revisar');
    expect(component.dialog()).toBe(true);
    requests.expectNone((request) => request.method === 'PATCH');
    requests.verify();
  });
});

describe('Editing a product in a subsequently deactivated category', () => {
  it('does not reassign the unchanged category when saving other fields', async () => {
    TestBed.configureTestingModule({
      imports: [Products],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
      ],
    });
    const component = TestBed.createComponent(Products).componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    for (const request of requests.match((r) => r.method === 'GET'))
      request.flush({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
    const row = {
      id_producto: 1,
      id_categoria: 2,
      sku: 'MESA',
      nombre: 'Mesa',
      descripcion: null,
      color: null,
      acabado: null,
      material: null,
      alto: null,
      ancho: null,
      profundidad: null,
      precio_base: '199.90',
      costo_referencia: null,
      activo: true,
      controlar_stock: true,
      imagenes: [],
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    const editing = component.edit(row);
    requests.expectOne(API_BASE_URL + '/products/1').flush(row);
    await editing;
    component.form.controls['nombre'].setValue('Mesa actualizada');
    const saving = component.save();
    const patch = requests.expectOne((r) => r.method === 'PATCH');
    expect(patch.request.body.id_categoria).toBeUndefined();
    expect(patch.request.body.nombre).toBe('Mesa actualizada');
    patch.flush({ ...row, nombre: 'Mesa actualizada' });
    await Promise.resolve();
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/products')
      .flush({ items: [], page: 1, page_size: 20, total: 0, total_pages: 0 });
    await saving;
    expect(component.dialog()).toBe(false);
    requests.verify();
  });
});
