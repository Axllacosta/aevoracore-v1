import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { Kardex } from './kardex.component';

describe('Kardex page', () => {
  it('renders filters and rejects inverted dates without requesting movements', async () => {
    TestBed.configureTestingModule({
      imports: [Kardex],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(Kardex);
    const requests = TestBed.inject(HttpTestingController);
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/inventory/movements')
      .flush({
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 0,
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.kardex-filters')).not.toBeNull();
    fixture.componentInstance.from.set(new Date(2026, 10, 11));
    fixture.componentInstance.to.set(new Date(2026, 10, 10));
    fixture.componentInstance.filter();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('La fecha inicial debe ser anterior');
    requests.expectNone((r) => r.url === API_BASE_URL + '/inventory/movements');
    requests.verify();
  });
});
