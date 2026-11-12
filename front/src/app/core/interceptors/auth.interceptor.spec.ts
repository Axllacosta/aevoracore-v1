import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../auth/auth.store';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { API_BASE_URL } from '../api/api-url';
const user = {
  id_usuario: 1,
  nombres: 'Test',
  apellidos: 'Admin',
  email: 'test@example.com',
  dni: null,
  activo: true,
  rol: 'ADMIN',
};
describe('Authenticated HTTP requests', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  let store: AuthStore;
  beforeEach(() => {
    localStorage.removeItem('aevoracore_refresh_token');
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'login', children: [] }]),
        provideHttpClient(withInterceptors([errorInterceptor, authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AuthStore);
    store.setSession({ access_token: 'old', refresh_token: 'refresh', token_type: 'bearer', user });
  });
  afterEach(() => {
    requests.verify();
    localStorage.removeItem('aevoracore_refresh_token');
    sessionStorage.clear();
  });
  it('renews once for parallel 401 responses and retries each request', () => {
    const values: unknown[] = [];
    http.get(API_BASE_URL + '/products').subscribe((v) => values.push(v));
    http.get(API_BASE_URL + '/categories').subscribe((v) => values.push(v));
    const products = requests.expectOne(API_BASE_URL + '/products');
    const categories = requests.expectOne(API_BASE_URL + '/categories');
    expect(products.request.headers.get('Authorization')).toBe('Bearer old');
    products.flush({}, { status: 401, statusText: 'Unauthorized' });
    categories.flush({}, { status: 401, statusText: 'Unauthorized' });
    const refresh = requests.expectOne(API_BASE_URL + '/auth/refresh');
    expect(refresh.request.body).toEqual({ refresh_token: 'refresh' });
    refresh.flush({ access_token: 'new', token_type: 'bearer' });
    const retries = requests.match(
      (r) => r.url.endsWith('/products') || r.url.endsWith('/categories'),
    );
    expect(retries.length).toBe(2);
    for (const retry of retries) {
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
      retry.flush({ items: [] });
    }
    expect(values.length).toBe(2);
  });
  it('never sends a token to another origin', () => {
    http.get('https://external.example/test').subscribe();
    const request = requests.expectOne('https://external.example/test');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
  it('renews the token for PDF requests while preserving the blob response type', () => {
    let received: Blob | undefined;
    http
      .get(API_BASE_URL + '/sales/1/pdf', { responseType: 'blob' })
      .subscribe((pdf) => (received = pdf));
    requests
      .expectOne(API_BASE_URL + '/sales/1/pdf')
      .flush(new Blob(), { status: 401, statusText: 'Unauthorized' });
    requests
      .expectOne(API_BASE_URL + '/auth/refresh')
      .flush({ access_token: 'new', token_type: 'bearer' });
    const retry = requests.expectOne(API_BASE_URL + '/sales/1/pdf');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new');
    expect(retry.request.responseType).toBe('blob');
    retry.flush(new Blob(['%PDF'], { type: 'application/pdf' }));
    expect(received?.type).toBe('application/pdf');
  });
  it('extracts backend error messages from a JSON blob', async () => {
    let message = '';
    http
      .get(API_BASE_URL + '/sales/1/pdf', { responseType: 'blob' })
      .subscribe({ error: (error) => (message = error.message) });
    const text = JSON.stringify({ error: { message: 'Esta venta no tiene comprobante.' } });
    const blob = new Blob([text], { type: 'application/json' });
    // jsdom may not implement Blob.text, which browsers support.
    if (!blob.text) Object.defineProperty(blob, 'text', { value: async () => text });
    requests
      .expectOne(API_BASE_URL + '/sales/1/pdf')
      .flush(blob, { status: 409, statusText: 'Conflict' });
    await Promise.resolve();
    await Promise.resolve();
    expect(message).toBe('Esta venta no tiene comprobante.');
  });
  it('clears the session if refresh has expired', () => {
    const errors: unknown[] = [];
    http.get(API_BASE_URL + '/products').subscribe({ error: (e) => errors.push(e) });
    requests
      .expectOne(API_BASE_URL + '/products')
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    requests
      .expectOne(API_BASE_URL + '/auth/refresh')
      .flush(
        { error: { message: 'Refresh expirado' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(store.accessToken()).toBeNull();
    expect(store.refreshToken()).toBeNull();
    expect(errors.length).toBe(1);
  });
});
