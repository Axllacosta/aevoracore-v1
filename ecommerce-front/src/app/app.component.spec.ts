import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { EcommerceFacade } from './core/facades/ecommerce.facade';
import { CategoryCatalogService } from './core/services/category-catalog.service';
import { App } from './app.component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: 'productos', children: [] }]),
        { provide: EcommerceFacade, useValue: { cartTotalItems: signal(0) } },
        {
          provide: CategoryCatalogService,
          useValue: {
            categories: signal([{ id_categoria: 7, nombre: 'Mostrador comercial' }]),
            loading: signal(false),
            error: signal(false),
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('clears the header search while preserving the selected category and resetting the page', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/productos?search=hogar&category_id=7&page=2');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input.value).toBe('hogar');

    input.value = '';
    compiled.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(router.parseUrl(router.url).queryParams).toEqual({ category_id: '7' });
    expect(input.value).toBe('');

    input.value = '  mesa  ';
    input.dispatchEvent(new Event('input'));
    compiled.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();

    expect(router.parseUrl(router.url).queryParams).toEqual({ category_id: '7', search: 'mesa' });
    expect(input.value).toBe('mesa');
  });
});
