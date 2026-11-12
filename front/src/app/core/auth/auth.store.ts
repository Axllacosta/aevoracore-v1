import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { LoginResponse } from '../models/auth.model';
import type { UserResponse } from '../models/user.model';

export const REFRESH_TOKEN_STORAGE_KEY = 'aevoracore_refresh_token';

@Injectable({
  providedIn: 'root',
})
export class AuthStore {
  private readonly accessTokenState = signal<string | null>(null);
  private readonly refreshTokenState = signal<string | null>(this.readRefreshToken());
  private readonly userState = signal<UserResponse | null>(null);
  private readonly externalChanges = new Subject<void>();
  readonly externalSessionChanges = this.externalChanges.asObservable();

  readonly accessToken = this.accessTokenState.asReadonly();
  readonly refreshToken = this.refreshTokenState.asReadonly();
  readonly user = this.userState.asReadonly();

  readonly isAuthenticated = computed(
    () => this.accessTokenState() !== null && this.userState() !== null,
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (typeof window === 'undefined') return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== REFRESH_TOKEN_STORAGE_KEY && event.key !== null) return;
      if (event.storageArea !== window.localStorage) return;
      const token = event.key === null ? null : event.newValue;
      if (token === this.refreshTokenState()) return;
      this.accessTokenState.set(null);
      this.userState.set(null);
      this.refreshTokenState.set(token);
      this.removeStoredToken('sessionStorage');
      this.externalChanges.next();
    };
    window.addEventListener('storage', onStorage);
    destroyRef.onDestroy(() => {
      window.removeEventListener('storage', onStorage);
      this.externalChanges.complete();
    });
  }

  setSession(session: LoginResponse): void {
    this.accessTokenState.set(session.access_token);
    this.refreshTokenState.set(session.refresh_token);
    this.userState.set(session.user);

    this.persistRefreshToken(session.refresh_token);
  }

  setAccessToken(accessToken: string): void {
    this.accessTokenState.set(accessToken);
  }

  setUser(user: UserResponse): void {
    this.userState.set(user);
  }

  clearSession(): void {
    this.accessTokenState.set(null);
    this.refreshTokenState.set(null);
    this.userState.set(null);

    this.removeStoredToken('localStorage');
    this.removeStoredToken('sessionStorage');
  }

  private readRefreshToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const token = this.readStoredToken('localStorage');
    if (token) {
      this.removeStoredToken('sessionStorage');
      return token;
    }
    // Migrar las sesiones que ya estaban abiertas antes de la introducción del almacenamiento persistente.
    const legacy = this.readStoredToken('sessionStorage');
    if (legacy) this.persistRefreshToken(legacy);
    return legacy;
  }

  private persistRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      this.removeStoredToken('sessionStorage');
    } catch {
      // Las restricciones de almacenamiento no deben impedir el inicio de sesión dentro de esta ventana.
      try {
        window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      } catch {}
    }
  }

  private readStoredToken(storage: 'localStorage' | 'sessionStorage'): string | null {
    try {
      return window[storage].getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private removeStoredToken(storage: 'localStorage' | 'sessionStorage'): void {
    if (typeof window === 'undefined') return;
    try {
      window[storage].removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {}
  }
}
