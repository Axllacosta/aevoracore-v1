import { Component, OnInit, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { CategoryCatalogService } from '../../core/services/category-catalog.service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navigation',
  styleUrl: './navigation.component.scss',
  templateUrl: './navigation.component.html',
})
export class Navigation implements OnInit {
  readonly catalog = inject(CategoryCatalogService);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.parseUrl(this.router.url)),
    ),
    { initialValue: this.router.parseUrl(this.router.url) },
  );
  readonly allProductsActive = computed(() => {
    const url = this.currentUrl();
    return (
      url.root.children['primary']?.segments.map((segment) => segment.path).join('/') ===
        'productos' && !url.queryParams['category_id']
    );
  });

  ngOnInit(): void {
    void this.catalog.load();
  }
}
