import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductSection } from './product-section.component';

describe('ProductSection', () => {
  let component: ProductSection;
  let fixture: ComponentFixture<ProductSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductSection],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductSection);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('products', []);
    await fixture.whenStable();
  });

  it('renders the empty catalog state', () => {
    expect(fixture.nativeElement.textContent).toContain('Estamos preparando nuestro catálogo');
    expect(fixture.nativeElement.querySelector('.view-all')?.getAttribute('href')).toBe(
      '/productos',
    );
  });

  it('allows retrying when the catalog cannot be loaded', async () => {
    const retry = vi.fn();
    component.retry.subscribe(retry);
    fixture.componentRef.setInput('error', 'No se pudo conectar');
    await fixture.whenStable();
    fixture.nativeElement.querySelector('.catalog-message button').click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
