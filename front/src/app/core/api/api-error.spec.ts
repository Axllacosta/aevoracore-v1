import { HttpErrorResponse } from '@angular/common/http';
import { normalizeApiError } from './api-error';
describe('API error contract', () => {
  it('reads the current backend error envelope', () => {
    const error = normalizeApiError(
      new HttpErrorResponse({
        status: 409,
        error: { error: { code: 'DUPLICATE', message: 'El SKU ya existe.' } },
      }),
    );
    expect(error.message).toBe('El SKU ya existe.');
    expect(error.status).toBe(409);
  });
  it('preserves field validation information', () => {
    const detail = {
      loc: ['body', 'detalles', 0, 'cantidad'],
      msg: 'Debe ser mayor a cero',
      type: 'greater_than',
    };
    const error = normalizeApiError(
      new HttpErrorResponse({
        status: 422,
        error: { error: { message: 'Datos inválidos', details: [detail] } },
      }),
    );
    expect(error.message).toContain('detalles.0.cantidad');
    expect(error.validationErrors).toEqual([detail]);
  });
});
