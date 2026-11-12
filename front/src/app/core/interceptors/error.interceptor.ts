import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, from, mergeMap, throwError } from 'rxjs';

import { normalizeApiError } from '../api/api-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.error instanceof Blob) {
        return from(error.error.text()).pipe(
          mergeMap((text) => {
            let body: unknown;
            try {
              body = JSON.parse(text);
            } catch {
              body = null;
            }
            return throwError(() =>
              normalizeApiError(
                new HttpErrorResponse({
                  error: body,
                  headers: error.headers,
                  status: error.status,
                  statusText: error.statusText,
                  url: error.url ?? undefined,
                }),
              ),
            );
          }),
          catchError((failure: unknown) => throwError(() => normalizeApiError(failure))),
        );
      }
      return throwError(() => normalizeApiError(error));
    }),
  );
