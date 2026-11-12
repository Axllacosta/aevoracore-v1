import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Pos } from './pos.component';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { ProductResponse } from '../../../../core/models/product.model';
import { SaleResponse } from '../../../../core/models/sale.model';
import { CustomerResponse } from '../../../../core/models/customer.model';
import { CustomerCreateDialog } from '../../../customers/components/customer-create-dialog/customer-create-dialog.component';

describe('POS payment flow', () => {
  it('creates a company from the customer picker and selects it without losing the sale', async () => {
    TestBed.configureTestingModule({
      imports: [Pos],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ConfirmationService,
        MessageService,
      ],
    });
    const fixture = TestBed.createComponent(Pos);
    const component = fixture.componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    const page = { items: [], total: 0, page: 1, page_size: 100, total_pages: 0 };
    for (const request of requests.match((r) => r.method === 'GET')) request.flush(page);
    component.facade.add({
      id_producto: 10,
      nombre: 'Mesa',
      sku: 'MESA',
      precio_base: '100.00',
      controlar_stock: false,
    } as ProductResponse);
    component.facade.form.controls.tipo_comprobante.setValue('FACTURA');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('button[aria-label="Crear cliente"]')!.click();
    await fixture.whenStable();
    const dialog = fixture.debugElement.query(By.directive(CustomerCreateDialog))
      .componentInstance as CustomerCreateDialog;
    expect(dialog.form.controls['tipo_persona'].value).toBe('JURIDICA');
    expect(root.querySelector('#create-customer-ruc')).not.toBeNull();
    dialog.form.patchValue({
      razon_social: 'Empresa SAC',
      ruc: '20123456789',
      direccion_fiscal: 'Calle 1',
    });
    root.querySelector('.customer-card')!.dispatchEvent(new Event('submit', { cancelable: true }));
    const post = requests.expectOne(
      (r) => r.method === 'POST' && r.url === API_BASE_URL + '/customers',
    );
    expect(post.request.body).toMatchObject({
      tipo_persona: 'JURIDICA',
      razon_social: 'Empresa SAC',
      ruc: '20123456789',
    });
    const customer = {
      id_cliente: 42,
      tipo_persona: 'JURIDICA',
      razon_social: 'Empresa SAC',
      direccion_fiscal: 'Calle 1',
      ruc: '20123456789',
      nombres: null,
      apellidos: null,
      telefono: null,
      dni: null,
      correo: null,
      activo: true,
      created_at: '',
      updated_at: '',
    } satisfies CustomerResponse;
    post.flush(customer);
    await Promise.resolve();
    requests
      .expectOne((r) => r.method === 'GET' && r.url === API_BASE_URL + '/customers')
      .flush({ ...page, items: [customer], total: 1, total_pages: 1 });
    await fixture.whenStable();
    expect(component.creatingCustomer()).toBe(false);
    expect(component.facade.form.controls.id_cliente.value).toBe(42);
    expect(component.facade.customerOptions().find((item) => item.value === 42)?.label).toContain(
      'Empresa SAC',
    );
    expect(component.facade.lines.length).toBe(1);
    component.review();
    expect(component.reviewing()).toBe(true);
    requests.verify();
  });
  it('collects payment in a modal, registers the sale and starts a fresh sale', async () => {
    TestBed.configureTestingModule({
      imports: [Pos],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        ConfirmationService,
        MessageService,
      ],
    });
    const fixture = TestBed.createComponent(Pos);
    const component = fixture.componentInstance;
    const requests = TestBed.inject(HttpTestingController);
    const page = { items: [], total: 0, page: 1, page_size: 100, total_pages: 0 };
    for (const request of requests.match((r) => r.method === 'GET')) request.flush(page);
    component.facade.add({
      id_producto: 10,
      nombre: 'Mesa',
      sku: 'MESA',
      precio_base: '100.00',
      controlar_stock: false,
    } as ProductResponse);
    component.facade.form.controls.id_cliente.setValue(3);
    component.facade.form.controls.canal_venta.setValue('WHATSAPP');
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const button = (label: string) => {
      const found = Array.from(root.querySelectorAll('button')).find(
        (element) => element.textContent?.trim() === label,
      );
      expect(found, label).toBeTruthy();
      return found!;
    };
    expect(root.querySelector('p-toolbar')).toBeNull();
    expect(root.querySelector('.payment-fields')).toBeNull();
    button('Procesar pago').click();
    await fixture.whenStable();
    expect(component.reviewing()).toBe(true);
    expect(root.querySelector('.payment-fields')).not.toBeNull();
    expect(button('Generar comprobante').disabled).toBe(true);
    requests.expectNone((request) => request.method === 'POST');
    button('Completar saldo').click();
    await fixture.whenStable();
    expect(component.facade.paymentBalance()).toBe(0);
    expect(button('Generar comprobante').disabled).toBe(false);
    button('Generar comprobante').click();
    const post = requests.expectOne(
      (r) => r.method === 'POST' && r.url === API_BASE_URL + '/sales',
    );
    expect(post.request.body.pagos).toEqual([{ medio_pago: 'EFECTIVO', importe: '100.00' }]);
    post.flush({
      id_venta: 20,
      id_cliente: 3,
      id_usuario: 1,
      canal_venta: 'WHATSAPP',
      estado: 'CONFIRMADA',
      fecha_hora: '2026-11-10T12:00:00',
      subtotal: '100.00',
      descuento_total: '0.00',
      total: '100.00',
      detalles: [],
      pagos: [],
      motivo_cancelacion: null,
      fecha_cancelacion: null,
      comprobante: {
        id_comprobante: 1,
        tipo: 'BOLETA',
        serie: 'B001',
        correlativo: 1,
        fecha_emision: '2026-11-10',
        receptor_nombre: 'Ana',
      },
    } satisfies SaleResponse);
    await Promise.resolve();
    requests.expectOne((r) => r.url === API_BASE_URL + '/inventory').flush(page);
    await fixture.whenStable();
    expect(component.reviewing()).toBe(false);
    expect(component.facade.result()?.id_venta).toBe(20);
    expect(button('Ir al historial de ventas')).toBeTruthy();
    button('Generar nueva venta').click();
    await fixture.whenStable();
    expect(component.facade.result()).toBeNull();
    expect(component.facade.lines.length).toBe(0);
    expect(component.facade.form.controls.id_cliente.value).toBeNull();
    expect(component.facade.form.controls.canal_venta.value).toBe('PRESENCIAL');
    expect(component.facade.form.controls.tipo_comprobante.value).toBe('BOLETA');
    expect(component.facade.payments.length).toBe(1);
    expect(component.facade.payments.at(0).controls.importe.value).toBe(0);
    expect(component.facade.form.pristine).toBe(true);
    requests.verify();
  });
});
