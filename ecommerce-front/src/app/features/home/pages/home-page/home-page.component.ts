import { Component, OnInit, inject } from '@angular/core';

import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';

import { HeroBanner } from '../../components/hero-banner/hero-banner.component';
import { ProductSection } from '../../components/product-section/product-section.component';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [HeroBanner, ProductSection],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePage implements OnInit {
  readonly ecommerce = inject(EcommerceFacade);

  ngOnInit(): void {
    void this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    await this.ecommerce.loadCatalog({
      page: 1,
      page_size: 8,
    });
  }
}
