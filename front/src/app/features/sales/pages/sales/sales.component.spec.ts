import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { Sales } from './sales.component';
import { SaleResponse } from '../../../../core/models/sale.model';
import { API_BASE_URL } from '../../../../core/api/api-url';

describe('Opening sale PDFs in a new tab', () => {
  let component: Sales;
  let requests: HttpTestingController;
  const sale = { id_venta: 12, comprobante: { tipo: 'FACTURA' } } as SaleResponse;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Sales],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
      ],
    });
    component = TestBed.createComponent(Sales).componentInstance;
    requests = TestBed.inject(HttpTestingController);
    requests.expectOne((r) => r.url === API_BASE_URL + '/sales').flush([]);
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:sale-pdf');
        static override revokeObjectURL = vi.fn();
      },
    );
  });
  afterEach(() => {
    requests.verify();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function mockTab() {
    const tab = {
      opener: window,
      document: { title: '', body: { textContent: '' } },
      location: { replace: vi.fn() },
      closed: false,
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    return tab;
  }

  it('opens immediately and retains the PDF until its tab closes', async () => {
    const tab = mockTab();
    let checkClosed = () => {};
    vi.spyOn(window, 'setInterval').mockImplementation((callback) => {
      checkClosed = callback as () => void;
      return 42;
    });
    const clear = vi.spyOn(window, 'clearInterval');
    const pending = component.openPdf(sale);
    expect(window.open).toHaveBeenCalledWith('about:blank', '_blank');
    expect(tab.opener).toBeNull();
    expect(tab.document.body.textContent).toContain('Generando');
    const request = requests.expectOne(API_BASE_URL + '/sales/12/pdf');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await pending;
    expect(tab.location.replace).toHaveBeenCalledWith('blob:sale-pdf');
    expect(component.pdfLoading()).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    tab.closed = true;
    checkClosed();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:sale-pdf');
    expect(clear).toHaveBeenCalledWith(42);
  });

  it('reports blocked tabs without requesting a PDF', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    await component.openPdf(sale);
    expect(component.pdfError()).toContain('Permite abrir');
    requests.expectNone(API_BASE_URL + '/sales/12/pdf');
  });

  it('closes the blank tab if the response is not a PDF', async () => {
    const tab = mockTab();
    const pending = component.openPdf(sale);
    requests
      .expectOne(API_BASE_URL + '/sales/12/pdf')
      .flush(new Blob(['invalid'], { type: 'text/html' }));
    await pending;
    expect(tab.close).toHaveBeenCalled();
    expect(tab.location.replace).not.toHaveBeenCalled();
    expect(component.pdfError()).toContain('PDF válido');
    expect(component.pdfLoading()).toBe(false);
  });
});
