import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { Customers } from './customers.component';
import { FormValue } from '../../../../shared/catalog/catalog.models';

const page = { items: [], page: 1, page_size: 20, total: 0, total_pages: 0 };

describe('Customer creation', () => {
  let fixture: ComponentFixture<Customers>;
  let component: Customers;
  let requests: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Customers],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
      ],
    });
    fixture = TestBed.createComponent(Customers);
    component = fixture.componentInstance;
    requests = TestBed.inject(HttpTestingController);
    requests.expectOne((request) => request.url === API_BASE_URL + '/customers').flush(page);
  });

  afterEach(() => requests.verify());

  it('requires DNI while allowing empty RUC and email', () => {
    component.form.patchValue({ nombres: 'Ana', apellidos: 'Pérez', telefono: '987654321' });
    expect(component.form.invalid).toBe(true);
    component.form.controls['dni'].setValue('12345678');
    expect(component.form.valid).toBe(true);
    expect(component.payload(component.form.getRawValue())).toEqual({
      tipo_persona: 'NATURAL',
      razon_social: null,
      direccion_fiscal: null,
      nombres: 'Ana',
      apellidos: 'Pérez',
      telefono: '987654321',
      dni: '12345678',
      ruc: null,
      correo: null,
    });
    const invalidValues: Record<string, FormValue>[] = [
      { dni: null },
      { dni: '' },
      { telefono: '9876543210' },
      { telefono: '987abc321' },
      { nombres: 'Ana2' },
      { apellidos: 'Pérez3' },
      { dni: '1234567a' },
      { ruc: '2012345678a' },
      { correo: 'incorrecto' },
    ];
    for (const fields of invalidValues) {
      component.form.reset();
      component.form.patchValue({
        nombres: 'Ana',
        apellidos: 'Pérez',
        telefono: '987654321',
        dni: '12345678',
        ...fields,
      });
      expect(component.form.invalid).toBe(true);
    }
  });

  it('opens a single-view form and filters invalid input before saving all contact fields', async () => {
    component.create();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('app-customer-create-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.wizard-progress')).toBeNull();
    const write = (key: string, value: string) => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        '#create-customer-' + key,
      );
      input.value = value;
      input.dispatchEvent(new Event('input'));
      return input.value;
    };
    expect(write('nombres', 'Ana2')).toBe('Ana');
    expect(write('apellidos', 'Pérez3')).toBe('Pérez');
    expect(write('telefono', '987abc6543210')).toBe('987654321');
    expect(write('dni', '1234a56789')).toBe('12345678');
    expect(fixture.nativeElement.querySelector('#create-customer-ruc')).toBeNull();
    expect(fixture.nativeElement.querySelector('#create-customer-correo')).toBeNull();
    fixture.nativeElement
      .querySelector('.customer-card')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    const post = requests.expectOne(
      (request) => request.method === 'POST' && request.url.endsWith('/customers'),
    );
    expect(post.request.body).toEqual({
      tipo_persona: 'NATURAL',
      razon_social: null,
      direccion_fiscal: null,
      nombres: 'Ana',
      apellidos: 'Pérez',
      telefono: '987654321',
      dni: '12345678',
      ruc: null,
      correo: null,
    });
    post.flush({
      id_cliente: 1,
      ...post.request.body,
      activo: true,
      created_at: '',
      updated_at: '',
    });
    await Promise.resolve();
    requests
      .expectOne((request) => request.method === 'GET' && request.url.endsWith('/customers'))
      .flush(page);
    await fixture.whenStable();
    expect(component.dialog()).toBe(false);
  });

  it('shows business fields only for companies and excludes hidden fields from validation', async () => {
    component.create();
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(component.form.controls['tipo_persona'].value).toBe('NATURAL');
    for (const key of ['razon_social', 'direccion_fiscal', 'ruc', 'correo']) {
      expect(root.querySelector('#create-customer-' + key)).toBeNull();
    }
    component.form.controls['tipo_persona'].setValue('JURIDICA');
    await fixture.whenStable();
    for (const key of component.fields.map((field) => field.key)) {
      expect(root.querySelector('#create-customer-' + key)).not.toBeNull();
    }
    component.form.patchValue({
      nombres: 'Ana',
      apellidos: 'Pérez',
      telefono: '987654321',
      dni: '12345678',
      ruc: 'incorrecto',
      correo: 'correo inválido',
    });
    expect(component.form.invalid).toBe(true);
    component.form.controls['tipo_persona'].setValue('NATURAL');
    await fixture.whenStable();
    expect(component.form.valid).toBe(true);
    expect(root.querySelector('#create-customer-ruc')).toBeNull();
    component.form.controls['tipo_persona'].setValue('JURIDICA');
    await fixture.whenStable();
    expect(component.form.controls['ruc'].enabled).toBe(true);
    expect(component.form.controls['ruc'].value).toBe('incorrecto');
  });

  it('keeps entered details visible after a backend error', async () => {
    component.create();
    component.form.patchValue({
      nombres: 'Ana',
      apellidos: 'Pérez',
      telefono: '987654321',
      dni: '12345678',
    });
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('.customer-card')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    requests
      .expectOne((request) => request.method === 'POST')
      .flush({}, { status: 409, statusText: 'Conflict' });
    await fixture.whenStable();
    expect(component.dialog()).toBe(true);
    expect(component.form.controls['nombres'].value).toBe('Ana');
    expect(fixture.nativeElement.querySelector('.customer-card [role="alert"]')).not.toBeNull();
  });
  it('registers companies with RUC and business name without a personal DNI', () => {
    component.form.patchValue({
      tipo_persona: 'JURIDICA',
      razon_social: 'Empresa SAC',
      ruc: '20123456789',
      direccion_fiscal: 'Calle 1',
    });
    expect(component.form.valid).toBe(true);
    expect(component.payload(component.form.getRawValue())).toMatchObject({
      tipo_persona: 'JURIDICA',
      razon_social: 'Empresa SAC',
      dni: null,
    });
    component.form.controls['ruc'].setValue(null);
    expect(component.form.invalid).toBe(true);
    component.form.controls['tipo_persona'].setValue('NATURAL');
    expect(component.form.invalid).toBe(true);
  });
});
