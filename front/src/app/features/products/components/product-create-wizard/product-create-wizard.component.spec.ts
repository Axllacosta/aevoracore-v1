import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FormControl, FormRecord, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { ProductResponse } from '../../../../core/models/product.model';
import { FormValue } from '../../../../shared/catalog/catalog.models';
import { ProductsFacade } from '../../data-access/products.facade';
import { ProductCreateWizard } from './product-create-wizard.component';

const product: ProductResponse = {
  id_producto: 8,
  id_categoria: 1,
  sku: 'ED-01',
  nombre: 'Mostrador',
  descripcion: null,
  color: null,
  acabado: null,
  material: null,
  alto: null,
  ancho: null,
  profundidad: null,
  precio_base: '100.00',
  costo_referencia: null,
  activo: true,
  controlar_stock: true,
  imagenes: [],
  created_at: '',
  updated_at: '',
};
const page = { items: [], page: 1, page_size: 20, total: 0, total_pages: 0 };

describe('ProductCreateWizard', () => {
  let wizard: ProductCreateWizard;
  let requests: HttpTestingController;
  let form: FormRecord<FormControl<FormValue>>;
  let close: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    let preview = 0;
    vi.stubGlobal(
      'URL',
      Object.assign(class extends URL {}, {
        createObjectURL: vi.fn(() => `blob:preview-${preview++}`),
        revokeObjectURL: vi.fn(),
      }),
    );
    TestBed.configureTestingModule({
      imports: [ProductCreateWizard],
      providers: [provideHttpClient(), provideHttpClientTesting(), ProductsFacade, MessageService],
    });
    const fixture = TestBed.createComponent(ProductCreateWizard);
    wizard = fixture.componentInstance;
    form = new FormRecord<FormControl<FormValue>>({});
    const keys = wizard.steps.flatMap((step) => step.keys);
    for (const key of keys)
      form.addControl(
        key,
        new FormControl<FormValue>(
          null,
          ['id_categoria', 'sku', 'nombre', 'precio_base'].includes(key) ? Validators.required : [],
        ),
      );
    close = vi.fn();
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput(
      'fields',
      keys.map((key) => ({ key, label: key })),
    );
    fixture.componentRef.setInput('buildPayload', () => ({
      id_categoria: 1,
      sku: 'ED-01',
      nombre: 'Mostrador',
      precio_base: 100,
    }));
    fixture.componentRef.setInput('close', close);
    requests = TestBed.inject(HttpTestingController);
    requests.expectOne((request) => request.url === API_BASE_URL + '/categories').flush(page);
  });

  afterEach(() => {
    requests.verify();
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });

  function fill(): void {
    form.patchValue({ id_categoria: 1, sku: 'ED-01', nombre: 'Mostrador', precio_base: 100 });
    wizard.goToStep(4);
  }

  async function tick(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('validates each intervening step and preserves entered values when going back', () => {
    wizard.goToStep(4);
    expect(wizard.step()).toBe(0);
    expect(form.controls['sku'].touched).toBe(true);
    form.patchValue({ id_categoria: 1, sku: 'ED-01', nombre: 'Mostrador' });
    wizard.goToStep(4);
    expect(wizard.step()).toBe(3);
    expect(form.controls['precio_base'].touched).toBe(true);
    wizard.goToStep(0);
    expect(form.controls['nombre'].value).toBe('Mostrador');
    requests.expectNone((request) => request.method === 'POST');
  });

  it('creates the product only at the last step and can start another product', async () => {
    fill();
    const saving = wizard.submit();
    requests
      .expectOne((request) => request.method === 'POST' && request.url.endsWith('/products'))
      .flush(product);
    await tick();
    requests
      .expectOne((request) => request.method === 'GET' && request.url.endsWith('/products'))
      .flush(page);
    await saving;
    expect(wizard.completed()).toBe(true);
    wizard.restart();
    expect(wizard.step()).toBe(0);
    expect(wizard.savedProduct()).toBeNull();
    expect(form.enabled).toBe(true);
    expect(form.controls['nombre'].value).toBeNull();
  });

  it('uploads selected images after creation and marks the first as principal', async () => {
    fill();
    wizard.addImages([
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.webp', { type: 'image/webp' }),
    ]);
    const saving = wizard.submit();
    requests
      .expectOne((request) => request.url.endsWith('/products') && request.method === 'POST')
      .flush(product);
    await tick();
    const first = requests.expectOne(API_BASE_URL + '/products/8/images');
    expect(first.request.body.get('es_principal')).toBe('true');
    first.flush({ id_imagen: 1 });
    await tick();
    const second = requests.expectOne(API_BASE_URL + '/products/8/images');
    expect(second.request.body.get('es_principal')).toBe('false');
    second.flush({ id_imagen: 2 });
    await tick();
    requests
      .expectOne((request) => request.method === 'GET' && request.url.endsWith('/products'))
      .flush(page);
    await saving;
    expect(wizard.images().every((image) => image.uploaded)).toBe(true);
    expect(wizard.completed()).toBe(true);
  });

  it('retries only pending images without creating a duplicate product', async () => {
    fill();
    wizard.addImages([
      new File(['one'], 'one.png', { type: 'image/png' }),
      new File(['two'], 'two.png', { type: 'image/png' }),
    ]);
    const saving = wizard.submit();
    requests
      .expectOne((request) => request.url.endsWith('/products') && request.method === 'POST')
      .flush(product);
    await tick();
    requests.expectOne(API_BASE_URL + '/products/8/images').flush({ id_imagen: 1 });
    await tick();
    requests
      .expectOne(API_BASE_URL + '/products/8/images')
      .flush({ detail: 'Error de carga' }, { status: 500, statusText: 'Error' });
    await tick();
    requests
      .expectOne((request) => request.method === 'GET' && request.url.endsWith('/products'))
      .flush(page);
    await saving;
    expect(wizard.savedProduct()?.id_producto).toBe(8);
    expect(wizard.completed()).toBe(false);
    expect(form.disabled).toBe(true);
    const retry = wizard.submit();
    requests.expectNone(
      (request) => request.url.endsWith('/products') && request.method === 'POST',
    );
    const upload = requests.expectOne(API_BASE_URL + '/products/8/images');
    expect(upload.request.body.get('file').name).toBe('two.png');
    expect(upload.request.body.get('es_principal')).toBe('false');
    upload.flush({ id_imagen: 2 });
    await tick();
    requests
      .expectOne((request) => request.method === 'GET' && request.url.endsWith('/products'))
      .flush(page);
    await retry;
    expect(wizard.completed()).toBe(true);
  });

  it('keeps the form editable after creation errors and rejects unsupported images', async () => {
    fill();
    wizard.addImages([new File(['bad'], 'file.pdf', { type: 'application/pdf' })]);
    expect(wizard.images()).toHaveLength(0);
    expect(wizard.imageError()).toContain('JPG');
    const saving = wizard.submit();
    requests
      .expectOne((request) => request.method === 'POST')
      .flush({ detail: 'SKU existente' }, { status: 409, statusText: 'Conflict' });
    await saving;
    expect(wizard.completed()).toBe(false);
    expect(wizard.savedProduct()).toBeNull();
    expect(form.enabled).toBe(true);
    expect(wizard.error()).toContain('SKU existente');
  });
});
