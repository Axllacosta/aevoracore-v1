import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { DashboardResponse } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly api = inject(ApiService);
  get() {
    return this.api.get<DashboardResponse>('/dashboard');
  }
}
