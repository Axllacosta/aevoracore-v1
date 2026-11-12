import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SalePdfViewer } from './sale-pdf-viewer.component';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { SaleResponse } from '../../../../core/models/sale.model';

describe('Sale PDF viewer', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('loads a PDF on demand and releases its object URL on close', async () => {
    const revoke = vi.fn();
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = vi.fn(() => 'blob:document-preview');
        static override revokeObjectURL = revoke;
      },
    );
    TestBed.configureTestingModule({
      imports: [SalePdfViewer],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(SalePdfViewer);
    fixture.componentRef.setInput('sale', {
      id_venta: 12,
      comprobante: {
        tipo: 'FACTURA',
        serie: 'F001',
        correlativo: 3,
      },
    } as SaleResponse);
    fixture.detectChanges();
    const requests = TestBed.inject(HttpTestingController);
    const request = requests.expectOne(API_BASE_URL + '/sales/12/pdf');
    expect(request.request.responseType).toBe('blob');
    request.flush(new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await fixture.whenStable();
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('a');
    expect(link.download).toBe('FACTURA-F001-00000003.pdf');
    expect(fixture.nativeElement.querySelector('iframe')).not.toBeNull();
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:document-preview');
    requests.verify();
  });
});
