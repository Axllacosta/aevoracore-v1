import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CategoryCatalogService } from '../../core/services/category-catalog.service';
import { Navigation } from './navigation.component';

describe('Navigation', () => {
  it('links real categories by id and keeps only the selected category active while paging', async () => {
    await TestBed.configureTestingModule({
      imports: [Navigation],
      providers: [
        provideRouter([{ path: 'productos', children: [] }]),
        {
          provide: CategoryCatalogService,
          useValue: {
            categories: signal([
              { id_categoria: 7, nombre: 'Hogar' },
              { id_categoria: 9, nombre: 'Comercial' },
            ]),
            loading: signal(false),
            error: signal(false),
            load: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Navigation);
    await fixture.whenStable();
    await TestBed.inject(Router).navigateByUrl('/productos?category_id=7&page=2&search=mesa');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    expect(
      Array.from(element.querySelectorAll('a.active')).map((link) => link.textContent?.trim()),
    ).toEqual(['Hogar']);
    expect(element.querySelector('a[href="/productos?category_id=9"]')).not.toBeNull();
    await TestBed.inject(Router).navigateByUrl('/productos?search=mesa&page=2');
    await fixture.whenStable();
    expect(
      Array.from(element.querySelectorAll('a.active')).map((link) => link.textContent?.trim()),
    ).toEqual(['Todos los productos']);
  });
});
