import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { CustomerCreate, CustomerResponse } from '../../../../core/models/customer.model';
import { Field, FormValue } from '../../../../shared/catalog/catalog.models';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { CustomersFacade } from '../../data-access/customers.facade';

@Component({
  selector: 'app-customer-create-form',
  imports: UI,
  templateUrl: './customer-create-form.component.html',
  styleUrl: './customer-create-form.component.scss',
})
export class CustomerCreateForm {
  readonly facade = inject(CustomersFacade);
  readonly form = input.required<FormRecord<FormControl<FormValue>>>();
  readonly fields = input.required<Field[]>();
  readonly buildPayload = input.required<(values: Record<string, FormValue>) => CustomerCreate>();
  readonly close = input.required<() => void>();
  readonly created = output<CustomerResponse>();
  readonly company = signal(false);
  private readonly businessFields = ['razon_social', 'direccion_fiscal', 'ruc', 'correo'];
  readonly visibleFields = computed(() =>
    this.fields().filter((field) => this.company() || !this.businessFields.includes(field.key)),
  );

  constructor() {
    effect((onCleanup) => {
      const controls = this.form().controls;
      const updateType = (type: FormValue) => {
        const company = type === 'JURIDICA';
        this.company.set(company);
        for (const key of this.businessFields) {
          if (company) controls[key].enable({ emitEvent: false });
          else controls[key].disable({ emitEvent: false });
        }
      };
      updateType(controls['tipo_persona'].value);
      const subscription = controls['tipo_persona'].valueChanges.subscribe(updateType);
      onCleanup(() => {
        subscription.unsubscribe();
        for (const key of this.businessFields) controls[key].enable({ emitEvent: false });
      });
    });
  }

  async save(): Promise<void> {
    if (this.facade.saving()) return;
    if (this.form().invalid) {
      this.form().markAllAsTouched();
      return;
    }
    const values = this.form().getRawValue();
    if (!this.company()) {
      for (const key of this.businessFields) values[key] = null;
    }
    if (await this.facade.save(null, this.buildPayload()(values))) {
      const customer = this.facade.selected();
      if (customer) this.created.emit(customer);
      this.close()();
    }
  }
}
