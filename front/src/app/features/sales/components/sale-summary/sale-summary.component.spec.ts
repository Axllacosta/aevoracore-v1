import { TestBed } from '@angular/core/testing';
import { SaleResponse } from '../../../../core/models/sale.model';
import { SaleSummary } from './sale-summary.component';

describe('Sale summary', () => {
  it('renders cancellation information and keeps sale details visible', async () => {
    TestBed.configureTestingModule({ imports: [SaleSummary] });
    const fixture = TestBed.createComponent(SaleSummary);
    const sale: SaleResponse = {
      id_venta: 8,
      id_cliente: 2,
      id_usuario: 1,
      canal_venta: 'PRESENCIAL',
      estado: 'CANCELADA',
      fecha_hora: '2026-11-11T12:00:00',
      subtotal: '100.00',
      descuento_total: '0.00',
      total: '100.00',
      motivo_cancelacion: 'Pedido duplicado',
      fecha_cancelacion: '2026-11-11T13:00:00',
      detalles: [],
      pagos: [],
    };
    fixture.componentRef.setInput('sale', sale);
    await fixture.whenStable();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('#8');
    expect(text).toContain('CANCELADA');
    expect(text).toContain('Pedido duplicado');
    expect(fixture.nativeElement.querySelector('p-table')).not.toBeNull();
  });
});
