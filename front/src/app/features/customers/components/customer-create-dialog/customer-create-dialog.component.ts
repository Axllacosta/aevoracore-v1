import { Component, DestroyRef, effect, inject, input, output } from '@angular/core';
import { CustomerResponse } from '../../../../core/models/customer.model';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { CustomerCreateForm } from '../customer-create-form/customer-create-form.component';
import { CustomersFacade } from '../../data-access/customers.facade';
import {
  configureCustomerType,
  createCustomerForm,
  customerFields,
  customerPayload,
} from '../../forms/customer-form';

@Component({
  selector: 'app-customer-create-dialog',
  imports: [...UI, CustomerCreateForm],
  providers: [CustomersFacade],
  templateUrl: './customer-create-dialog.component.html',
  styleUrl: './customer-create-dialog.component.scss',
})
export class CustomerCreateDialog {
  readonly facade = inject(CustomersFacade);
  readonly initialType = input<'NATURAL' | 'JURIDICA'>('NATURAL');
  readonly created = output<CustomerResponse>();
  readonly closed = output<void>();
  readonly fields = customerFields();
  readonly form = createCustomerForm(this.fields);
  readonly buildPayload = customerPayload;
  readonly closeDialog = () => {
    if (!this.facade.saving()) this.closed.emit();
  };

  constructor() {
    configureCustomerType(this.form, this.fields, inject(DestroyRef));
    effect(() => this.form.controls['tipo_persona'].setValue(this.initialType()));
  }
}
