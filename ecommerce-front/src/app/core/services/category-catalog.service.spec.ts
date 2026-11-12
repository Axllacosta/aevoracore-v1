import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../config/api.config';
import { CategoryCatalogService } from './category-catalog.service';

describe('CategoryCatalogService', () => {
  let service: CategoryCatalogService;
  let http: HttpTestingController;
  const endpoint = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.publicCategories}`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryCatalogService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('shares the category request between navigation and catalog and caches the result', async () => {
    const first = service.load();
    const second = service.load();
    expect(first).toBe(second);
    http.expectOne(endpoint).flush([{ id_categoria: 7, nombre: 'Hogar' }]);
    await Promise.all([first, second]);
    await service.load();
    http.expectNone(endpoint);
    expect(service.categories()).toEqual([{ id_categoria: 7, nombre: 'Hogar' }]);
  });

  it('allows retrying a failed category request', async () => {
    const first = service.load();
    http.expectOne(endpoint).flush({}, { status: 503, statusText: 'Unavailable' });
    await first;
    expect(service.error()).toBe(true);
    const retry = service.load();
    http.expectOne(endpoint).flush([]);
    await retry;
    expect(service.error()).toBe(false);
    expect(service.loading()).toBe(false);
  });
});
