import { signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { PaginatedResponse } from '../models/api-response.model';
import { Query } from '../api/query';
import { errorMessage } from '../api/api-error';

export class ListState<T> {
  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly query = signal<Query>({});
  private request = 0;
  constructor(private readonly fetch: (query: Query) => Observable<PaginatedResponse<T>>) {}
  async load(
    query: Query = this.query(),
    page = this.page(),
    pageSize = this.pageSize(),
  ): Promise<void> {
    const request = ++this.request;
    this.query.set(query);
    this.page.set(page);
    this.pageSize.set(pageSize);
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(this.fetch({ ...query, page, page_size: pageSize }));
      if (request === this.request) {
        if (page > 1 && page > result.total_pages) {
          await this.load(query, Math.max(1, result.total_pages), pageSize);
          return;
        }
        this.items.set(result.items);
        this.total.set(result.total);
      }
    } catch (error) {
      if (request === this.request) {
        this.items.set([]);
        this.total.set(0);
        this.error.set(errorMessage(error));
      }
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
}
