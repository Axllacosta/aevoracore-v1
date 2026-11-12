import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { PosFacade } from './pos.facade';
import { ProductResponse } from '../../../core/models/product.model';
import { CustomerResponse } from '../../../core/models/customer.model';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../../core/api/api-url';
const product: ProductResponse = {
  id_producto: 10,
  id_categoria: 1,
  sku: 'MESA',
  nombre: 'Mesa',
  descripcion: null,
  color: null,
  acabado: null,
  material: 'Melamina',
  alto: null,
  ancho: null,
  profundidad: null,
  precio_base: '199.90',
  costo_referencia: null,
  activo: true,
  controlar_stock: true,
  imagenes: [],
  created_at: '',
  updated_at: '',
};
describe('POS transaction', () => {
  let facade: PosFacade;
  let requests: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService, PosFacade],
    });
    facade = TestBed.inject(PosFacade);
    requests = TestBed.inject(HttpTestingController);
    for (const request of requests.match((r) => r.method === 'GET'))
      request.flush({ items: [], total: 0, page: 1, page_size: 100, total_pages: 0 });
  });
  afterEach(() => requests.verify());
  it('blocks invoices without customer RUC with a toast and allows the operation after adding it', () => {
    const toast = vi.spyOn(TestBed.inject(MessageService), 'add');
    facade.add(product);
    facade.customers.set([{ id_cliente: 3, ruc: null } as CustomerResponse]);
    facade.form.patchValue({ id_cliente: 3, tipo_comprobante: 'FACTURA' });
    expect(facade.validatePreparation()).toBe(false);
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'warn',
        summary: 'Cliente sin RUC',
        detail: expect.stringContaining('selecciona un cliente que tenga RUC o agrega el RUC'),
      }),
    );
    requests.expectNone((request) => request.method === 'POST');
    facade.customers.update((customers) =>
      customers.map((customer) => ({ ...customer, ruc: '20123456789' })),
    );
    expect(facade.validatePreparation()).toBe(true);
    facade.customers.update((customers) =>
      customers.map((customer) => ({ ...customer, ruc: null })),
    );
    facade.form.controls.tipo_comprobante.setValue('BOLETA');
    expect(facade.validatePreparation()).toBe(true);
  });
  it('allows preparing a valid cart before entering payments', () => {
    facade.add(product);
    facade.form.controls.id_cliente.setValue(3);
    expect(facade.validatePreparation()).toBe(true);
    expect(facade.payments.at(0).controls.importe.value).toBe(0);
    expect(facade.paymentReady()).toBe(false);
    expect(facade.validate()).toBe(false);
    requests.expectNone((r) => r.method === 'POST');
  });
  it('merges repeated products and rejects invalid stock or discount before writing', () => {
    facade.add(product);
    facade.add(product);
    expect(facade.lines.length).toBe(1);
    expect(facade.lines.at(0).controls.cantidad.value).toBe(2);
    facade.form.controls.id_cliente.setValue(1);
    facade.stocks.set({ 10: 1 });
    expect(facade.validate()).toBe(false);
    facade.stocks.set({ 10: 5 });
    facade.lines.at(0).controls.descuento.setValue(101);
    expect(facade.validate()).toBe(false);
    requests.expectNone((r) => r.method === 'POST');
  });
  it('sends the real sale contract and clears the cart only after confirmation', async () => {
    facade.add(product);
    facade.form.controls.id_cliente.setValue(3);
    facade.lines.at(0).controls.descuento.setValue(10);
    facade.completePayment(0);
    const pending = facade.confirm();
    const sale = requests.expectOne(API_BASE_URL + '/sales');
    expect(sale.request.body).toEqual({
      tipo_comprobante: 'BOLETA',
      clave_idempotencia: expect.any(String),
      id_cliente: 3,
      canal_venta: 'PRESENCIAL',
      pagos: [{ medio_pago: 'EFECTIVO', importe: '179.91' }],
      detalles: [{ id_producto: 10, cantidad: 1, descuento_porcentaje: 10 }],
    });
    expect(facade.lines.length).toBe(1);
    sale.flush({ id_venta: 20, estado: 'CONFIRMADA' });
    await Promise.resolve();
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/inventory')
      .flush({ items: [], total: 0, page: 1, page_size: 100, total_pages: 0 });
    await pending;
    expect(facade.lines.length).toBe(0);
    expect(facade.result()?.id_venta).toBe(20);
    expect(facade.operation.saving()).toBe(false);
  });
  it('accepts negative stock only when product stock control is disabled', () => {
    facade.add({ ...product, controlar_stock: false });
    facade.form.controls.id_cliente.setValue(1);
    facade.stocks.set({ 10: -5 });
    facade.completePayment(0);
    expect(facade.validate()).toBe(true);
    facade.lines.at(0).controls.product.setValue(product);
    expect(facade.validate()).toBe(false);
  });
  it('requires exact payment coverage and rejects shortfalls and overpayments', () => {
    facade.add(product);
    facade.form.controls.id_cliente.setValue(1);
    facade.payments.at(0).controls.importe.setValue(100);
    facade.addPayment();
    facade.payments.at(1).controls.medio_pago.setValue('YAPE');
    facade.payments.at(1).controls.importe.setValue(99.89);
    expect(facade.paymentBalance()).toBe(1);
    expect(facade.paymentReady()).toBe(false);
    expect(facade.validate()).toBe(false);
    facade.payments.at(1).controls.importe.setValue(99.91);
    expect(facade.paymentBalance()).toBe(-1);
    expect(facade.paymentReady()).toBe(false);
    expect(facade.validate()).toBe(false);
    facade.completePayment(1);
    expect(facade.payments.at(1).controls.importe.value).toBe(99.9);
    expect(facade.validate()).toBe(true);
    expect(facade.paymentReady()).toBe(true);
    facade.lines.at(0).controls.cantidad.setValue(2);
    expect(facade.paymentReady()).toBe(false);
    requests.expectNone((r) => r.method === 'POST');
  });
  it('preserves a draft if the API rejects a sale', async () => {
    facade.add(product);
    facade.form.controls.id_cliente.setValue(3);
    facade.completePayment(0);
    const pending = facade.confirm();
    const first = requests.expectOne(API_BASE_URL + '/sales');
    const key = first.request.body.clave_idempotencia;
    first.flush({}, { status: 409, statusText: 'Conflict' });
    await pending;
    expect(facade.lines.length).toBe(1);
    expect(facade.result()).toBeNull();
    expect(facade.operation.error()).toBeTruthy();
    const retry = facade.confirm();
    const second = requests.expectOne(API_BASE_URL + '/sales');
    expect(second.request.body.clave_idempotencia).toBe(key);
    second.flush({}, { status: 409, statusText: 'Conflict' });
    await retry;
  });
  it('rejects amount discounts above the line subtotal and discounts with extra decimals', () => {
    facade.add(product);
    facade.form.controls.id_cliente.setValue(1);
    const line = facade.lines.at(0);
    line.controls.tipo_descuento.setValue('IMPORTE');
    line.controls.descuento.setValue(199.91);
    expect(facade.validate()).toBe(false);
    line.controls.descuento.setValue(1.001);
    expect(facade.validate()).toBe(false);
    requests.expectNone((r) => r.method === 'POST');
  });
  it('sends only the selected discount mode and keeps a fixed discount when quantity changes', async () => {
    facade.add(product);
    facade.form.controls.id_cliente.setValue(3);
    const line = facade.lines.at(0);
    line.controls.tipo_descuento.setValue('IMPORTE');
    line.controls.descuento.setValue(20);
    line.controls.cantidad.setValue(3);
    expect(facade.lineTotal(0)).toBe(579.7);
    facade.completePayment(0);
    const pending = facade.confirm();
    const request = requests.expectOne(API_BASE_URL + '/sales');
    expect(request.request.body.detalles).toEqual([
      { id_producto: 10, cantidad: 3, descuento_importe: '20.00' },
    ]);
    expect(request.request.body.pagos).toEqual([{ medio_pago: 'EFECTIVO', importe: '579.70' }]);
    request.flush({}, { status: 409, statusText: 'Conflict' });
    await pending;
    expect(line.controls.descuento.value).toBe(20);
  });
});
