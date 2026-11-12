import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { BUSINESS_CONFIG } from './core/config/business.config';
import { EcommerceFacade } from './core/facades/ecommerce.facade';
import { Header } from './layout/header/header.component';
import { Footer } from './layout/footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class App {
  protected readonly ecommerce = inject(EcommerceFacade);

  protected readonly productInquiryUrl =
    `https://wa.me/${BUSINESS_CONFIG.whatsappPhone}?text=` +
    encodeURIComponent('¡Hola! ¿Me pueden dar más información sobre sus productos?');

  private readonly router = inject(Router);

  protected openCart(): void {
    void this.router.navigate(['/carrito']);
  }

  protected searchProducts(term: string): void {
    void this.router.navigate(['/productos'], {
      queryParams: { search: term.trim() || null, page: null },
      queryParamsHandling: 'merge',
    });
  }
}
