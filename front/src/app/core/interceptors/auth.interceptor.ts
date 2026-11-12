import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../api/api-url';
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const auth = inject(AuthService);
  const router = inject(Router);
  const isApi = req.url === API_BASE_URL || req.url.startsWith(API_BASE_URL + '/');
  const publicAuth = ['/auth/login', '/auth/register', '/auth/refresh'].some(
    (path) => req.url.split('?')[0] === API_BASE_URL + path,
  );
  if (!isApi || publicAuth) return next(req);
  const token = store.accessToken();
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401)
        return throwError(() => error);
      if (!store.refreshToken()) {
        store.clearSession();
        void router.navigate(['/login']);
        return throwError(() => error);
      }
      // Puede llegar una respuesta concurrente después de que otra solicitud ya haya renovado el token.
      const newer = store.accessToken();
      const retry = (access: string) =>
        next(req.clone({ setHeaders: { Authorization: `Bearer ${access}` } }));
      return (
        newer && newer !== token
          ? retry(newer)
          : auth.refreshAccessToken().pipe(switchMap((session) => retry(session.access_token)))
      ).pipe(
        catchError((failure: unknown) => {
          const status =
            typeof failure === 'object' && failure !== null && 'status' in failure
              ? failure.status
              : 0;
          if (status === 401 || !store.accessToken()) {
            store.clearSession();
            void router.navigate(['/login']);
          }
          return throwError(() => failure);
        }),
      );
    }),
  );
};
