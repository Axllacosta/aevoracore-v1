import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { ProductCatalogService } from '../../../../core/services/product-catalog.service';
import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import { CategoryCatalogService } from '../../../../core/services/category-catalog.service';
import { ProductList } from './product-list.component';

describe('ProductList category filters', () => {
  let fixture: ComponentFixture<ProductList>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let loadCatalog: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    params = new BehaviorSubject(
      convertToParamMap({ category_id: '7', search: 'mesa', page: '2' }),
    );
    loadCatalog = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [ProductList],
      providers: [
        {
          provide: ProductCatalogService,
          useValue: { getCatalog: vi.fn().mockReturnValue(of({ items: [], total: 0 })) },
        },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { queryParamMap: params.asObservable() } },
        {
          provide: CategoryCatalogService,
          useValue: {
            categories: signal([{ id_categoria: 7, nombre: 'Hogar' }]),
            loading: signal(false),
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: EcommerceFacade,
          useValue: {
            loadCatalog,
            products: signal([]),
            catalogPage: signal(2),
            catalogTotalPages: signal(3),
            catalogTotal: signal(0),
            isCatalogLoading: signal(false),
            hasCatalogError: signal(false),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProductList);
    await fixture.whenStable();
  });

  it('combines category, search and pagination from the URL', () => {
    expect(loadCatalog).toHaveBeenLastCalledWith({
      search: 'mesa',
      category_id: 7,
      page: 2,
      page_size: 12,
    });
    expect(fixture.nativeElement.querySelector('h1').textContent).toBe('Hogar');
    expect(fixture.nativeElement.querySelector('select').value).toBe('7');
  });

  it('shows the empty search state without a duplicate search form', () => {
    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.catalog-state h2').textContent).toContain(
      'No encontramos resultados',
    );
    expect(fixture.nativeElement.querySelector('.catalog-state p').textContent).toContain(
      'Prueba con otro término',
    );
  });

  it('changes category without carrying over the page and clears all filters on request', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const select = document.createElement('select');
    select.add(new Option('Comercial', '9'));
    fixture.componentInstance.changeCategory({ target: select } as unknown as Event);
    expect(navigate).toHaveBeenLastCalledWith(
      [],
      expect.objectContaining({
        queryParams: { category_id: '9', page: null },
        queryParamsHandling: 'merge',
      }),
    );
    fixture.componentInstance.clearFilters();
    expect(navigate).toHaveBeenLastCalledWith(['/productos']);
  });

  it('ignores invalid category and page parameters', async () => {
    params.next(convertToParamMap({ category_id: '-1', page: 'bad' }));
    await fixture.whenStable();
    expect(loadCatalog).toHaveBeenLastCalledWith({
      search: undefined,
      category_id: undefined,
      page: 1,
      page_size: 12,
    });
  });

  it('requests alternatives only within the selected category and preserves the original search', async () => {
    expect(TestBed.inject(ProductCatalogService).getCatalog).toHaveBeenCalledWith({
      category_id: 7,
      page: 1,
      page_size: 4,
    });
    expect(fixture.componentInstance.appliedSearch()).toBe('mesa');
    expect(fixture.componentInstance.suggestionCategory()?.id_categoria).toBe(7);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture.componentInstance.viewSuggestionCategory();
    expect(navigate).toHaveBeenCalledWith(['/productos'], { queryParams: { category_id: 7 } });
  });

  it('does not guess a category for an unrelated search', async () => {
    const catalog = TestBed.inject(ProductCatalogService);
    vi.mocked(catalog.getCatalog).mockClear();
    params.next(convertToParamMap({ search: 'azul' }));
    await fixture.whenStable();
    expect(catalog.getCatalog).not.toHaveBeenCalled();
    expect(fixture.componentInstance.suggestionCategory()).toBeNull();
  });
});
