import { HttpErrorResponse } from '@angular/common/http';
import type { ValidationError } from '../models/api-error.model';
export interface ApiError {
  status: number;
  message: string;
  validationErrors: ValidationError[];
  originalError: unknown;
}
export function normalizeApiError(error: unknown): ApiError {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    'message' in error &&
    typeof error.message === 'string' &&
    'validationErrors' in error &&
    Array.isArray(error.validationErrors) &&
    'originalError' in error
  )
    return error as ApiError;
  if (!(error instanceof HttpErrorResponse))
    return {
      status: 0,
      message: error instanceof Error ? error.message : 'Ocurrió un error inesperado.',
      validationErrors: [],
      originalError: error,
    };
  const body = error.error as {
    error?: { message?: string; details?: ValidationError[] };
    detail?: string | ValidationError[];
    message?: string;
  } | null;
  const details = body?.error?.details ?? (Array.isArray(body?.detail) ? body.detail : []);
  const message = details.length
    ? details.map((v) => `${v.loc.filter((s) => s !== 'body').join('.')}: ${v.msg}`).join(' · ')
    : (body?.error?.message ??
      (typeof body?.detail === 'string' ? body.detail : body?.message) ??
      (error.status === 0
        ? 'No se pudo conectar con el servidor.'
        : error.status === 401
          ? 'La sesión ha expirado. Inicia sesión nuevamente.'
          : error.status === 403
            ? 'No tienes permiso para realizar esta acción.'
            : 'No se pudo completar la solicitud.'));
  return { status: error.status, message, validationErrors: details, originalError: error };
}
export function errorMessage(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : 'No se pudo completar la operación.';
}
