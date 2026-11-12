import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SalesApiService } from '../../../../core/api/sales-api.service';
import { DocumentConfigForm } from './document-config-form.component';

describe('Document configuration form', () => {
  it('loads issuer data and rejects an invalid RUC before saving', async () => {
    const data = {
      ruc: '20123456789',
      razon_social: 'Muebles de prueba',
      direccion: 'Av. Lima 123',
    };
    const api = {
      documentConfig: vi.fn(() => of(data)),
      saveDocumentConfig: vi.fn(() => of(data)),
    };
    TestBed.configureTestingModule({
      imports: [DocumentConfigForm],
      providers: [{ provide: SalesApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(DocumentConfigForm);
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('#issuer-ruc') as HTMLInputElement;
    expect(input.value).toBe(data.ruc);
    fixture.componentInstance.form.controls.ruc.setValue('123');
    await fixture.componentInstance.save();
    await fixture.whenStable();
    expect(api.saveDocumentConfig).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('un RUC de 11 dígitos');
  });
});
