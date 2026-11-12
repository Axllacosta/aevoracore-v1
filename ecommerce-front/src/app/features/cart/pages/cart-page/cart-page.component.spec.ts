import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CartPage } from './cart-page.component';

describe('CartPage', () => {
  let component: CartPage;
  let fixture: ComponentFixture<CartPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CartPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CartPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('renders the empty cart and its catalog link', () => {
    expect(component).toBeTruthy();
    const emptyCart = fixture.nativeElement.querySelector('.empty-cart') as HTMLElement;
    expect(emptyCart.textContent).toContain('Tu carrito está vacío');
    expect(emptyCart.querySelector('a')?.getAttribute('href')).toBe('/productos');
  });
});
