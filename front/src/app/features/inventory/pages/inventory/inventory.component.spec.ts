import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { Inventory } from './inventory.component';

describe('Inventory page', () => {
  it('renders stock and rejects outbound quantities above available stock', async () => {
    TestBed.configureTestingModule({
      imports: [Inventory],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
      ],
    });
    const fixture = TestBed.createComponent(Inventory);
    const requests = TestBed.inject(HttpTestingController);
    const row = {
      id_producto: 7,
      sku: 'M-7',
      nombre: 'Mesa',
      stock_actual: 2,
      stock_minimo: 1,
      fecha_actualizacion: null,
      stock_bajo: false,
    };
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/inventory')
      .flush({
        items: [row],
        page: 1,
        page_size: 20,
        total: 1,
        total_pages: 1,
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('tbody')?.textContent).toContain('Mesa');
    const component = fixture.componentInstance;
    component.show(row, 'SALIDA');
    component.form.patchValue({ cantidad: 3, motivo: 'Despacho de prueba' });
    const confirm = vi.spyOn(TestBed.inject(ConfirmationService), 'confirm');
    component.submit();
    expect(component.facade.operation.error()).toContain('supera el stock');
    expect(confirm).not.toHaveBeenCalled();
    requests.expectNone((r) => r.method === 'POST');
    requests.verify();
  });
});
