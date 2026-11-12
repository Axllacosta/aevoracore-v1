import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { SalesApiService } from '../../../core/api/sales-api.service';
import { SaleResponse } from '../../../core/models/sale.model';
import { OperationState } from '../../../core/state/operation-state';
import { errorMessage } from '../../../core/api/api-error';
@Injectable()
export class SalesFacade {
  private readonly api = inject(SalesApiService);
  readonly operation = new OperationState(inject(MessageService));
  readonly items = signal<SaleResponse[]>([]);
  readonly selected = signal<SaleResponse | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly error = signal('');
  readonly page = signal(1);
  readonly more = signal(false);
  private request = 0;
  async load(page = this.page()) {
    const request = ++this.request;
    this.loading.set(true);
    this.error.set('');
    this.page.set(page);
    try {
      const rows = await firstValueFrom(this.api.list(21, (page - 1) * 20));
      if (request === this.request) {
        this.items.set(rows.slice(0, 20));
        this.more.set(rows.length > 20);
      }
    } catch (e) {
      if (request === this.request) {
        this.items.set([]);
        this.more.set(false);
        this.error.set(errorMessage(e));
      }
    } finally {
      if (request === this.request) this.loading.set(false);
    }
  }
  async detail(id: number) {
    this.detailLoading.set(true);
    this.operation.error.set('');
    try {
      this.selected.set(await firstValueFrom(this.api.get(id)));
      return true;
    } catch (e) {
      this.operation.error.set(errorMessage(e));
      return false;
    } finally {
      this.detailLoading.set(false);
    }
  }
  async cancel(id: number, reason: string) {
    const result = await this.operation.run(
      () => this.api.cancel(id, { motivo_cancelacion: reason }),
      'Venta cancelada y existencias revertidas',
      async (result) => {
        this.selected.set(result);
        await this.load();
      },
    );
    return !!result;
  }
}
