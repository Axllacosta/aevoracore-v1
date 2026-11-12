import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { API_BASE_URL } from '../../../core/api/api-url';
import { ExpensesFacade } from './expenses.facade';

const categories = [
  { id_categoria_gasto: 1, nombre: 'LUZ', requiere_descripcion: false },
  { id_categoria_gasto: 2, nombre: 'OTROS', requiere_descripcion: true },
];
const page = { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
describe('Company expenses', () => {
  let facade: ExpensesFacade;
  let requests: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService, ExpensesFacade],
    });
    facade = TestBed.inject(ExpensesFacade);
    requests = TestBed.inject(HttpTestingController);
    requests.expectOne(API_BASE_URL + '/expenses/categories').flush(categories);
    requests.expectOne((r) => r.url === API_BASE_URL + '/expenses').flush(page);
  });
  afterEach(() => requests.verify());
  function fill(category = 1) {
    facade.start();
    facade.form.patchValue({ id_categoria_gasto: category, fecha: '2026-11-08', importe: 25 });
  }
  it('requires a nonblank description for Others before sending a request', async () => {
    await Promise.resolve();
    fill(2);
    facade.form.controls.descripcion.setValue('   ');
    expect(facade.requiresDescription()).toBe(true);
    expect(await facade.save()).toBe(false);
    expect(facade.operation.error()).toContain('Otros');
    requests.expectNone((r) => r.method === 'POST');
  });
  it('sends a dated expense without inventory fields and refreshes the expense list', async () => {
    await Promise.resolve();
    fill();
    const pending = facade.save();
    const request = requests.expectOne(API_BASE_URL + '/expenses');
    expect(request.request.body).toEqual({
      id_categoria_gasto: 1,
      fecha: '2026-11-08',
      importe: '25.00',
      descripcion: null,
    });
    request.flush({ id_gasto: 3 });
    await Promise.resolve();
    requests.expectOne((r) => r.url === API_BASE_URL + '/expenses').flush(page);
    expect(await pending).toBe(true);
    requests.expectNone(API_BASE_URL + '/expenses/summary');
  });
  it('preserves the expense draft on server rejection', async () => {
    await Promise.resolve();
    fill();
    const pending = facade.save();
    requests
      .expectOne(API_BASE_URL + '/expenses')
      .flush({}, { status: 409, statusText: 'Conflict' });
    expect(await pending).toBe(false);
    expect(facade.form.controls.importe.value).toBe(25);
    expect(facade.operation.error()).not.toBe('');
  });
  it('uses the selected month for the paginated list', async () => {
    await Promise.resolve();
    facade.month.set('2025-12');
    const pending = facade.load(2);
    const records = requests.expectOne((r) => r.url === API_BASE_URL + '/expenses');
    expect(records.request.params.get('anio')).toBe('2025');
    expect(records.request.params.get('mes')).toBe('12');
    expect(records.request.params.get('page')).toBe('2');
    records.flush({ ...page, page: 2, total_pages: 2 });
    await pending;
    expect(facade.list.page()).toBe(2);
    requests.expectNone(API_BASE_URL + '/expenses/summary');
  });
});
