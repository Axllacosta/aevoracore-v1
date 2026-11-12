import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { CustomersFacade } from '../../data-access/customers.facade';
import { createCustomerForm, customerFields, customerPayload } from '../../forms/customer-form';
import { CustomerCreateForm } from './customer-create-form.component';

describe('Customer creation form', () => {
  it('shows business fields for companies and restores controls when destroyed', async () => {
    TestBed.configureTestingModule({
      imports: [CustomerCreateForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService, CustomersFacade],
    });
    const fixture = TestBed.createComponent(CustomerCreateForm);
    const fields = customerFields();
    const form = createCustomerForm(fields);
    form.controls['tipo_persona'].setValue('NATURAL');
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('fields', fields);
    fixture.componentRef.setInput('buildPayload', customerPayload);
    fixture.componentRef.setInput('close', vi.fn());
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#create-customer-ruc')).toBeNull();
    expect(form.controls['ruc'].disabled).toBe(true);
    form.controls['tipo_persona'].setValue('JURIDICA');
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#create-customer-ruc')).not.toBeNull();
    expect(form.controls['ruc'].enabled).toBe(true);
    form.controls['tipo_persona'].setValue('NATURAL');
    fixture.destroy();
    expect(form.controls['ruc'].enabled).toBe(true);
  });
});
