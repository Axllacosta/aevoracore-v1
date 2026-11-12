import { Component, DestroyRef, inject } from '@angular/core';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { CatalogPage } from '../../../../shared/catalog/catalog-page.base';
import { Column, FormValue, FieldGroup } from '../../../../shared/catalog/catalog.models';
import { CustomersFacade } from '../../data-access/customers.facade';
import { CustomerCreateForm } from '../../components/customer-create-form/customer-create-form.component';
import { customerFields, customerPayload, configureCustomerType } from '../../forms/customer-form';
import {
  CustomerResponse,
  CustomerCreate,
  CustomerUpdate,
} from '../../../../core/models/customer.model';
@Component({
  selector: 'app-customers',
  imports: UI,
  providers: [CustomersFacade],
  templateUrl: '../../../../shared/catalog/catalog-page.html',
  styleUrl: './customers.component.scss',
})
export class Customers extends CatalogPage<CustomerResponse, CustomerCreate, CustomerUpdate> {
  readonly facade = inject(CustomersFacade);
  override readonly createView = CustomerCreateForm;
  override readonly createWidth = '760px';
  override readonly editorWidth = '1040px';
  override readonly fieldGroups: FieldGroup[] = [
    {
      id: 'identity',
      label: 'Identificación',
      description: 'Tipo de cliente y datos de la persona de contacto.',
      keys: ['tipo_persona', 'nombres', 'apellidos', 'dni'],
    },
    {
      id: 'contact',
      label: 'Contacto',
      description: 'Teléfono y correo para comunicarte con el cliente.',
      keys: ['telefono', 'correo'],
    },
    {
      id: 'business',
      label: 'Datos fiscales',
      description: 'Información de la empresa y dirección para sus comprobantes.',
      keys: ['razon_social', 'ruc', 'direccion_fiscal'],
    },
  ];
  readonly title = 'Clientes';
  readonly singular = 'cliente';
  readonly description =
    'Registra personas y empresas, sus datos de contacto y la información para sus comprobantes.';
  readonly fields = customerFields();
  readonly columns: Column[] = [
    { key: 'id_cliente', label: 'ID' },
    { key: 'razon_social', label: 'Razón social' },
    { key: 'nombres', label: 'Nombres' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'dni', label: 'DNI' },
    { key: 'ruc', label: 'RUC' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'correo', label: 'Correo' },
  ];
  constructor() {
    super();
    this.setup();
    configureCustomerType(this.form, this.fields, inject(DestroyRef));
  }
  override create() {
    super.create();
    this.form.controls['tipo_persona'].setValue('NATURAL');
  }
  id(row: CustomerResponse) {
    return row.id_cliente;
  }
  payload(v: Record<string, FormValue>): CustomerCreate {
    return customerPayload(v);
  }
}
