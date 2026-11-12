import { firstValueFrom, Observable } from 'rxjs';
import { PaginatedResponse } from '../models/api-response.model';

export async function allPages<T>(
  fetch: (page: number) => Observable<PaginatedResponse<T>>,
): Promise<T[]> {
  const first = await firstValueFrom(fetch(1));
  const items = [...first.items];
  for (let page = 2; page <= first.total_pages; page++) {
    const next = await firstValueFrom(fetch(page));
    items.push(...next.items);
  }
  return items;
}
