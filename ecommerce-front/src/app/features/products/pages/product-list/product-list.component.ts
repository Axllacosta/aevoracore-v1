import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import { ProductCard } from '../../components/product-card/product-card.component';
import { CategoryCatalogService } from '../../../../core/services/category-catalog.service';
import { ProductCatalogService } from '../../../../core/services/product-catalog.service';
import { matchingCategories } from '../../../../core/services/voice-navigation.service';
import { firstValueFrom } from 'rxjs';
import type { PublicProduct } from '../../../../core/models/public-product.model';
import type { PublicCategory } from '../../../../core/models/public-category.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [ProductCard],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
})
export class ProductList implements OnInit {
  readonly ecommerce = inject(EcommerceFacade);
  readonly categories = inject(CategoryCatalogService);
  readonly categoryId = signal<number | null>(null);
  readonly activeCategory = computed(() =>
    this.categories.categories().find((category) => category.id_categoria === this.categoryId()),
  );
  readonly appliedSearch = signal('');
  readonly suggestions = signal<PublicProduct[]>([]);
  readonly suggestionCategory = signal<PublicCategory | null>(null);
  readonly suggestionsLoading = signal(false);
  readonly suggestionsError = signal(false);
  private readonly catalogService = inject(ProductCatalogService);
  private request = 0;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly pageSize = 12;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => ++this.request);
    void this.categories.load();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const search = params.get('search') ?? '';
      const page = Number(params.get('page') ?? 1);
      const categoryId = Number(params.get('category_id'));
      this.categoryId.set(Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null);
      this.appliedSearch.set(search);

      void this.loadProducts(search, Number.isInteger(page) && page > 0 ? page : 1);
    });
  }

  async loadProducts(search: string, page: number): Promise<void> {
    const request = ++this.request;
    const categoryId = this.categoryId();
    this.suggestions.set([]);
    this.suggestionCategory.set(null);
    this.suggestionsLoading.set(false);
    this.suggestionsError.set(false);
    await this.ecommerce.loadCatalog({
      search: search.trim() || undefined,
      page,
      page_size: this.pageSize,
      category_id: this.categoryId() ?? undefined,
    });
    if (
      request !== this.request ||
      !search.trim() ||
      this.ecommerce.hasCatalogError() ||
      this.ecommerce.catalogTotal() !== 0
    )
      return;
    await this.categories.load();
    if (request !== this.request) return;
    const matches = categoryId
      ? this.categories.categories().filter((c) => c.id_categoria === categoryId)
      : matchingCategories(search, this.categories.categories());
    if (matches.length !== 1) return;
    this.suggestionCategory.set(matches[0]);
    this.suggestionsLoading.set(true);
    try {
      const response = await firstValueFrom(
        this.catalogService.getCatalog({
          category_id: matches[0].id_categoria,
          page: 1,
          page_size: 4,
        }),
      );
      if (request === this.request) this.suggestions.set(response.items);
    } catch {
      if (request === this.request) this.suggestionsError.set(true);
    } finally {
      if (request === this.request) this.suggestionsLoading.set(false);
    }
  }

  viewSuggestionCategory(): void {
    const category = this.suggestionCategory();
    if (category)
      void this.router.navigate(['/productos'], {
        queryParams: { category_id: category.id_categoria },
      });
  }

  editSearch(): void {
    document.querySelector<HTMLInputElement>('input[name="search"]')?.focus();
  }

  changeCategory(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { category_id: value || null, page: null },
      queryParamsHandling: 'merge',
    });
  }

  clearFilters(): void {
    void this.router.navigate(['/productos']);
  }

  changePage(page: number): void {
    if (
      page < 1 ||
      page > this.ecommerce.catalogTotalPages() ||
      page === this.ecommerce.catalogPage()
    ) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  get pages(): number[] {
    const totalPages = this.ecommerce.catalogTotalPages();

    const count = Math.min(totalPages, 5);
    const first = Math.max(1, Math.min(this.ecommerce.catalogPage() - 2, totalPages - count + 1));
    return Array.from({ length: count }, (_, index) => first + index);
  }
}
