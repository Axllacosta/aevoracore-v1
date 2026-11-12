import { ApiService } from './api.service';
import { Query, queryParams } from './query';
import { PaginatedResponse } from '../models/api-response.model';
export class EntityApi<T, C, U> {
  constructor(
    protected readonly api: ApiService,
    private readonly path: string,
  ) {}
  list(query: Query = {}) {
    return this.api.get<PaginatedResponse<T>>(this.path, queryParams(query));
  }
  get(id: number) {
    return this.api.get<T>(`${this.path}/${id}`);
  }
  create(body: C) {
    return this.api.post<T, C>(this.path, body);
  }
  update(id: number, body: U) {
    return this.api.patch<T, U>(`${this.path}/${id}`, body);
  }
  deactivate(id: number) {
    return this.api.delete<T>(`${this.path}/${id}`);
  }
}
