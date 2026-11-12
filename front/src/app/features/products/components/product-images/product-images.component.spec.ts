import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { ProductsFacade } from '../../data-access/products.facade';
import { ProductImages } from './product-images.component';

describe('Product image gallery', () => {
  it('shows the empty gallery after loading the selected product images', async () => {
    TestBed.configureTestingModule({
      imports: [ProductImages],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
        ProductsFacade,
      ],
    });
    const fixture = TestBed.createComponent(ProductImages);
    const requests = TestBed.inject(HttpTestingController);
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/categories')
      .flush({
        items: [],
        page: 1,
        page_size: 100,
        total: 0,
        total_pages: 0,
      });
    const facade = fixture.componentInstance.facade;
    const product = { id_producto: 7, nombre: 'Mesa' } as Parameters<typeof facade.loadImages>[0];
    const loading = facade.loadImages(product);
    requests.expectOne(API_BASE_URL + '/products/7/images').flush([]);
    await loading;
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Este producto todavía no tiene imágenes');
    expect(fixture.nativeElement.querySelector('h2')?.textContent).toContain('Mesa');
    requests.verify();
  });
});
