import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Query, queryParams } from './query';
import { PaginatedResponse } from '../models/api-response.model';
import {
  ExpenseCategory,
  ExpenseCreate,
  ExpenseResponse,
  MonthlyExpenseSummary,
} from '../models/expense.model';

@Injectable({ providedIn: 'root' })
export class ExpensesApiService {
  private readonly api = inject(ApiService);
  list(query: Query) {
    return this.api.get<PaginatedResponse<ExpenseResponse>>('/expenses', queryParams(query));
  }
  summary(query: Query) {
    return this.api.get<MonthlyExpenseSummary>('/expenses/summary', queryParams(query));
  }
  categories() {
    return this.api.get<ExpenseCategory[]>('/expenses/categories');
  }
  createCategory(nombre: string) {
    return this.api.post<ExpenseCategory>('/expenses/categories', { nombre });
  }
  create(body: ExpenseCreate) {
    return this.api.post<ExpenseResponse>('/expenses', body);
  }
  update(id: number, body: ExpenseCreate) {
    return this.api.put<ExpenseResponse>(`/expenses/${id}`, body);
  }
  cancel(id: number) {
    return this.api.delete<ExpenseResponse>(`/expenses/${id}`);
  }
}
