import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import { HomePage } from './home-page.component';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideRouter([]),
        {
          provide: EcommerceFacade,
          useValue: {
            products: signal([]),
            isCatalogLoading: signal(false),
            catalogError: signal(null),
            loadCatalog: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('loads the featured products and renders the home sections', () => {
    expect(component).toBeTruthy();
    expect(TestBed.inject(EcommerceFacade).loadCatalog).toHaveBeenCalledWith({
      page: 1,
      page_size: 8,
    });
    expect(fixture.nativeElement.querySelector('app-hero-banner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-product-section')).not.toBeNull();
  });
});
