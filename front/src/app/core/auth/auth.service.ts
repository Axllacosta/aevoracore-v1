import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { HttpBackend, HttpClient } from '@angular/common/http';
import {
  Observable,
  of,
  throwError,
  catchError,
  finalize,
  map,
  shareReplay,
  switchMap,
  tap,
} from 'rxjs';
import { AuthApiService } from '../api/auth-api.service';
import { apiUrl } from '../api/api-url';
import { normalizeApiError } from '../api/api-error';
import { AuthStore } from './auth.store';
import { LoginRequest, LoginResponse, TokenResponse } from '../models/auth.model';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly rawHttp = new HttpClient(inject(HttpBackend));
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private refreshRequest?: Observable<TokenResponse>;
  private initialization?: Observable<boolean>;
  constructor() {
    this.store.externalSessionChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.refreshRequest = undefined;
      this.initialization = undefined;
      void this.router.navigate(['/login']);
    });
  }
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.login(credentials).pipe(tap((session) => this.store.setSession(session)));
  }
  getCurrentUser() {
    const token = this.store.refreshToken();
    return this.api.me().pipe(
      tap((user) => {
        if (this.store.refreshToken() === token) this.store.setUser(user);
      }),
    );
  }
  refreshAccessToken(): Observable<TokenResponse> {
    if (this.refreshRequest) return this.refreshRequest;
    const token = this.store.refreshToken();
    if (!token) return throwError(() => new Error('La sesión ha expirado.'));
    const request = this.rawHttp
      .post<TokenResponse>(apiUrl('/auth/refresh'), { refresh_token: token })
      .pipe(
        tap((response) => {
          if (this.store.refreshToken() !== token) throw new Error('La sesión se cerró.');
          this.store.setAccessToken(response.access_token);
        }),
        catchError((error: unknown) => {
          const failure = normalizeApiError(error);
          if (this.store.refreshToken() === token && [401, 403].includes(failure.status))
            this.store.clearSession();
          return throwError(() => failure);
        }),
        finalize(() => {
          if (this.refreshRequest === request) this.refreshRequest = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    this.refreshRequest = request;
    return request;
  }
  initializeSession(): Observable<boolean> {
    if (this.store.isAuthenticated()) return of(true);
    const token = this.store.refreshToken();
    if (!token) return of(false);
    if (this.initialization) return this.initialization;
    const initialization = this.refreshAccessToken().pipe(
      switchMap(() =>
        this.store.refreshToken() === token
          ? this.getCurrentUser()
          : throwError(() => new Error('La sesión cambió.')),
      ),
      map(() => this.store.refreshToken() === token && this.store.isAuthenticated()),
      catchError((error: unknown) => {
        if (
          this.store.refreshToken() === token &&
          [401, 403].includes(normalizeApiError(error).status)
        )
          this.store.clearSession();
        return of(false);
      }),
      finalize(() => {
        if (this.initialization === initialization) this.initialization = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.initialization = initialization;
    return initialization;
  }
  logout() {
    this.store.clearSession();
  }
}
