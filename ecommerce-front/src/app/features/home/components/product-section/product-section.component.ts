import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductCard } from '../../../products/components/product-card/product-card.component';
import type { PublicProduct } from '../../../../core/models/public-product.model';

@Component({
  selector: 'app-product-section',
  standalone: true,
  imports: [RouterLink, ProductCard],
  templateUrl: './product-section.component.html',
  styleUrl: './product-section.component.scss',
})
export class ProductSection {
  products = input.required<PublicProduct[]>();

  loading = input(false);
  error = input<string | null>(null);

  retry = output<void>();
}
