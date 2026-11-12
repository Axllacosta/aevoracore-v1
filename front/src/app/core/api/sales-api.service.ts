import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { queryParams } from './query';
import { SaleResponse, SaleCreate, SaleCancelRequest, DocumentConfig } from '../models/sale.model';
@Injectable({ providedIn: 'root' })
export class SalesApiService {
  private readonly api = inject(ApiService);
  list(limit = 20, offset = 0) {
    return this.api.get<SaleResponse[]>('/sales', queryParams({ limit, offset }));
  }
  get(id: number) {
    return this.api.get<SaleResponse>(`/sales/${id}`);
  }
  pdf(id: number) {
    return this.api.getBlob(`/sales/${id}/pdf`);
  }
  documentConfig() {
    return this.api.get<DocumentConfig | null>('/sales/document-config');
  }
  saveDocumentConfig(config: DocumentConfig) {
    return this.api.put<DocumentConfig>('/sales/document-config', config);
  }
  create(body: SaleCreate) {
    return this.api.post<SaleResponse, SaleCreate>('/sales', body);
  }
  cancel(id: number, body: SaleCancelRequest) {
    return this.api.post<SaleResponse, SaleCancelRequest>(`/sales/${id}/cancel`, body);
  }
}
