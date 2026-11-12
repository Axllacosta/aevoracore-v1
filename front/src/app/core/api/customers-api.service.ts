import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { EntityApi } from './entity-api';
import { CustomerResponse, CustomerCreate, CustomerUpdate } from '../models/customer.model';
@Injectable({ providedIn: 'root' })
export class CustomersApiService extends EntityApi<
  CustomerResponse,
  CustomerCreate,
  CustomerUpdate
> {
  constructor() {
    super(inject(ApiService), '/customers');
  }
}
