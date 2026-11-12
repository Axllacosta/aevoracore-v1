import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DashboardApiService } from '../../../core/api/dashboard-api.service';
import { DashboardResponse } from '../../../core/models/dashboard.model';
import { errorMessage } from '../../../core/api/api-error';

@Injectable()
export class DashboardFacade {
  private readonly api = inject(DashboardApiService);
  readonly data = signal<DashboardResponse | null>(null);
  readonly error = signal('');
  readonly loading = signal(false);

  async load() {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    this.data.set(null);
    try {
      this.data.set(await firstValueFrom(this.api.get()));
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }
}
