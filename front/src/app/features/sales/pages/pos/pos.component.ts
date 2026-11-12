import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { PosFacade } from '../../data-access/pos.facade';
import { SaleSummary } from '../../components/sale-summary/sale-summary.component';
import { CustomerCreateDialog } from '../../../customers/components/customer-create-dialog/customer-create-dialog.component';
import { CustomerResponse } from '../../../../core/models/customer.model';
@Component({
  selector: 'app-pos',
  imports: [...UI, RouterLink, SaleSummary, CustomerCreateDialog],
  providers: [PosFacade],
  templateUrl: './pos.component.html',
  styleUrl: './pos.component.scss',
})
export class Pos {
  readonly facade = inject(PosFacade);
  private readonly confirms = inject(ConfirmationService);
  readonly search = signal('');
  readonly reviewing = signal(false);
  readonly creatingCustomer = signal(false);
  customerCreated(customer: CustomerResponse) {
    this.facade.customers.update((customers) => [
      ...customers.filter((item) => item.id_cliente !== customer.id_cliente),
      customer,
    ]);
    this.facade.form.controls.id_cliente.setValue(customer.id_cliente);
    this.facade.operation.error.set('');
  }
  readonly channels = [
    { label: 'Presencial', value: 'PRESENCIAL' },
    { label: 'WhatsApp', value: 'WHATSAPP' },
  ];
  readonly discountModes = [
    { label: 'Porcentaje (%)', value: 'PORCENTAJE' },
    { label: 'Importe (S/)', value: 'IMPORTE' },
  ];
  readonly payments = ['EFECTIVO', 'TRANSFERENCIA', 'YAPE', 'PLIN', 'TARJETA'].map((value) => ({
    label: value.charAt(0) + value.slice(1).toLowerCase(),
    value,
  }));
  filter() {
    void this.facade.catalog.load({ search: this.search().trim() }, 1, 12);
  }
  paginate(event: { first?: number; rows?: number }) {
    void this.facade.catalog.load(
      this.facade.catalog.query(),
      Math.floor((event.first ?? 0) / 12) + 1,
      12,
    );
  }
  review() {
    if (!this.facade.operation.saving() && this.facade.validatePreparation())
      this.reviewing.set(true);
  }
  async confirm() {
    await this.facade.confirm();
    if (this.facade.result()) this.reviewing.set(false);
  }
  newSale() {
    if (this.facade.operation.saving()) return;
    this.facade.newSale();
    this.reviewing.set(false);
  }
  clear() {
    this.confirms.confirm({
      acceptButtonProps: { severity: 'primary' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      header: 'Vaciar venta',
      message: 'Se quitarán los productos de la venta en preparación.',
      acceptLabel: 'Vaciar',
      rejectLabel: 'Volver',
      accept: () => this.facade.clear(),
    });
  }
}
