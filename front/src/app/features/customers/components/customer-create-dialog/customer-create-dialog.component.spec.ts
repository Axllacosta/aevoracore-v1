import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService } from 'primeng/api';
import { CustomerCreateDialog } from './customer-create-dialog.component';

describe('Customer creation dialog', () => {
  it('opens the requested type and prevents closing while saving', async () => {
    TestBed.configureTestingModule({
      imports: [CustomerCreateDialog],
      providers: [provideHttpClient(), provideHttpClientTesting(), MessageService],
    });
    const fixture = TestBed.createComponent(CustomerCreateDialog);
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('initialType', 'JURIDICA');
    await fixture.whenStable();
    expect(component.form.controls['tipo_persona'].value).toBe('JURIDICA');
    expect(fixture.nativeElement.querySelector('app-customer-create-form')).not.toBeNull();
    const closed = vi.fn();
    component.closed.subscribe(closed);
    component.facade.saving.set(true);
    component.closeDialog();
    expect(closed).not.toHaveBeenCalled();
    component.facade.saving.set(false);
    component.closeDialog();
    expect(closed).toHaveBeenCalledOnce();
  });
});
