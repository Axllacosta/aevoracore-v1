import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import { CategoryCatalogService } from '../../../../core/services/category-catalog.service';
import type { PublicProduct } from '../../../../core/models/public-product.model';
import { ProductDetail } from './product-detail.component';

const product: PublicProduct = {
  id_producto: 1,
  id_categoria: 1,
  sku: 'AE-01',
  nombre: 'Estante',
  descripcion: 'Estante para el hogar',
  precio_base: '120.00',
  material: 'Madera',
  color: null,
  acabado: ' ',
  alto: '80',
  ancho: null,
  profundidad: '30',
  imagenes: [],
};

describe('ProductDetail', () => {
  let fixture: ComponentFixture<ProductDetail>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let ecommerce: { loadProduct: ReturnType<typeof vi.fn>; addProduct: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    registerLocaleData(localeEsPe);
    params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    ecommerce = { loadProduct: vi.fn().mockResolvedValue(product), addProduct: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: params.asObservable() } },
        { provide: EcommerceFacade, useValue: ecommerce },
        {
          provide: CategoryCatalogService,
          useValue: {
            categories: signal([{ id_categoria: 1, nombre: 'Mostrador comercial' }]),
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductDetail);
  });

  it('shows the category in the breadcrumb and links to its catalog', async () => {
    await fixture.whenStable();
    const breadcrumb: HTMLElement = fixture.nativeElement.querySelector('.product-breadcrumb');
    expect(breadcrumb.textContent).toContain('Mostrador comercial');
    expect(breadcrumb.textContent).not.toContain(product.nombre);
    expect(breadcrumb.querySelector('.breadcrumb-current')?.getAttribute('href')).toBe(
      '/productos?category_id=1',
    );
    expect(fixture.nativeElement.querySelector('h1').textContent).toContain(product.nombre);
  });

  it('places populated specifications below the gallery, outside purchase information', async () => {
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const table = element.querySelector('table');
    expect(element.querySelector('app-product-gallery')?.nextElementSibling?.contains(table)).toBe(
      true,
    );
    expect(element.querySelector('.product-information table')).toBeNull();
    expect(
      Array.from(element.querySelectorAll('tbody tr')).map((row) => row.textContent?.trim()),
    ).toEqual(['MaterialMadera', 'Alto80 cm', 'Profundidad30 cm']);
    expect(element.querySelector('.add-to-cart-button')).not.toBeNull();
  });

  it('keeps the referential price notice visible beside the price', async () => {
    await fixture.whenStable();
    const note = fixture.nativeElement.querySelector('.product-heading .price-note') as HTMLElement;
    expect(note.textContent).toContain('Precios referenciales');
    expect(note.textContent).toContain('Confirmamos el precio al consultar por WhatsApp');
  });

  it('omits the table when no specifications are provided', async () => {
    ecommerce.loadProduct.mockResolvedValue({
      ...product,
      material: null,
      acabado: null,
      alto: null,
      profundidad: null,
    });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('keeps an invalid route unavailable when an older request finishes', async () => {
    let resolveProduct!: (value: PublicProduct) => void;
    ecommerce.loadProduct.mockReturnValue(
      new Promise<PublicProduct>((resolve) => {
        resolveProduct = resolve;
      }),
    );
    fixture.detectChanges();
    params.next(convertToParamMap({ id: 'invalid' }));
    resolveProduct(product);
    await fixture.whenStable();
    expect(fixture.componentInstance.product()).toBeNull();
    expect(fixture.nativeElement.querySelector('.product-unavailable')).not.toBeNull();
  });

  it('adds the selected quantity to the cart', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('[aria-label="Aumentar cantidad"]')!.click();
    element.querySelector<HTMLButtonElement>('.add-to-cart-button')!.click();
    expect(ecommerce.addProduct).toHaveBeenCalledWith(product, 2);
    expect(navigate).toHaveBeenCalledWith(['/carrito']);
  });
});
