import { previewTotals } from './sale-calculations';
describe('Sale preview in cents', () => {
  it('rounds the discount per line and totals integer cents', () => {
    expect(
      previewTotals([
        { price: '19.99', quantity: 3, discount: 12.5 },
        { price: '0.10', quantity: 1, discount: 0 },
      ]),
    ).toEqual({ subtotal: 6007, discount: 750, total: 5257 });
  });
  it('supports a fully discounted line', () => {
    expect(previewTotals([{ price: '100.00', quantity: 1, discount: 100 }]).total).toBe(0);
  });
  it('applies an amount discount once to the entire line, including multiple units', () => {
    expect(
      previewTotals([{ price: '100.00', quantity: 3, discount: 20, discountType: 'IMPORTE' }]),
    ).toEqual({ subtotal: 30000, discount: 2000, total: 28000 });
  });
  it('combines both discount modes and preserves cent rounding', () => {
    expect(
      previewTotals([
        { price: '19.99', quantity: 3, discount: 12.5, discountType: 'PORCENTAJE' },
        { price: '10.00', quantity: 2, discount: 0.01, discountType: 'IMPORTE' },
      ]),
    ).toEqual({ subtotal: 7997, discount: 751, total: 7246 });
  });
});
