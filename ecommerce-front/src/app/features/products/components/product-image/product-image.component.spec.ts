import { TestBed } from '@angular/core/testing';
import { ProductImage } from './product-image.component';

describe('ProductImage optimized loading', () => {
  it('uses the thumbnail for cards and falls back to the detail image on error', async () => {
    const fixture = TestBed.createComponent(ProductImage);
    fixture.componentRef.setInput('images', [
      {
        id_imagen: 1,
        url_imagen: '/detail.webp',
        url_miniatura: '/small.webp',
        es_principal: true,
        orden: 1,
      },
    ]);
    fixture.componentRef.setInput('thumbnail', true);
    await fixture.whenStable();
    const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(image.getAttribute('src')).toBe('/small.webp');
    expect(image.getAttribute('loading')).toBe('lazy');
    image.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(image.getAttribute('src')).toBe('/detail.webp');
    image.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Imagen no disponible');
  });

  it('uses the larger image in details, preserves legacy URLs and prioritizes visible images', async () => {
    const fixture = TestBed.createComponent(ProductImage);
    fixture.componentRef.setInput('images', [
      { id_imagen: 1, url_imagen: '/original.jpg', es_principal: true, orden: 1 },
    ]);
    fixture.componentRef.setInput('priority', true);
    await fixture.whenStable();
    const image: HTMLImageElement = fixture.nativeElement.querySelector('img');
    expect(image.getAttribute('src')).toBe('/original.jpg');
    expect(image.getAttribute('loading')).toBe('eager');
    expect(image.getAttribute('fetchpriority')).toBe('high');
  });
});
