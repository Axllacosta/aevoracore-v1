import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { provideRouter } from '@angular/router';
import { ProductCard } from './product-card.component';

describe('ProductCard', () => {
  let component: ProductCard;
  let fixture: ComponentFixture<ProductCard>;

  beforeEach(async () => {
    registerLocaleData(localeEsPe);
    await TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('product', {
      id_producto: 7,
      nombre: 'Mesa de prueba',
      precio_base: '120.00',
      imagenes: [],
    });
    await fixture.whenStable();
  });

  it('renders the product name and links to its detail', () => {
    expect(component).toBeTruthy();
    const link = fixture.nativeElement.querySelector('.product-name') as HTMLAnchorElement;
    expect(link.textContent).toContain('Mesa de prueba');
    expect(link.getAttribute('href')).toBe('/productos/7');
  });
});
