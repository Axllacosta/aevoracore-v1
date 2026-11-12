import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { EntityFacade } from '../../../core/state/entity.facade';
import { CustomersApiService } from '../../../core/api/customers-api.service';
import {
  CustomerResponse,
  CustomerCreate,
  CustomerUpdate,
} from '../../../core/models/customer.model';
@Injectable()
export class CustomersFacade extends EntityFacade<
  CustomerResponse,
  CustomerCreate,
  CustomerUpdate
> {
  constructor() {
    super(inject(CustomersApiService), inject(MessageService));
  }
}
