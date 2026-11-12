import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ProductImage } from '../../../../core/models/product-image.model';
import { ProductGallery } from './product-gallery.component';

const images: ProductImage[] = [
  {
    id_imagen: 1,
    url_imagen: '/first.jpg',
    nombre_archivo: 'first.jpg',
    orden: 1,
    es_principal: false,
  },
  {
    id_imagen: 2,
    url_imagen: '/main.jpg',
    nombre_archivo: 'main.jpg',
    orden: 2,
    es_principal: true,
  },
];

describe('ProductGallery', () => {
  let fixture: ComponentFixture<ProductGallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProductGallery] }).compileComponents();
    fixture = TestBed.createComponent(ProductGallery);
    fixture.componentRef.setInput('images', images);
    fixture.componentRef.setInput('name', 'Estante');
    await fixture.whenStable();
  });

  it('selects the principal image and switches images from thumbnails', async () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.main-image img')?.getAttribute('src')).toBe('/main.jpg');
    expect(element.querySelector('.thumbnail.active img')?.getAttribute('src')).toBe('/main.jpg');
    element.querySelector<HTMLButtonElement>('.thumbnail')!.click();
    await fixture.whenStable();
    expect(element.querySelector('.main-image img')?.getAttribute('src')).toBe('/first.jpg');
    expect(element.querySelector('.thumbnail')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('resets the selection when a different product is loaded', async () => {
    fixture.componentInstance.selectedImage.set('/first.jpg');
    fixture.componentRef.setInput('images', [{ ...images[1], url_imagen: '/other.jpg' }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.main-image img')?.getAttribute('src')).toBe(
      '/other.jpg',
    );
    expect(fixture.nativeElement.querySelector('.image-thumbnails')).toBeNull();
  });

  it('shows the fallback when the product has no images', async () => {
    fixture.componentRef.setInput('images', []);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.image-placeholder')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.image-thumbnails')).toBeNull();
  });
});
