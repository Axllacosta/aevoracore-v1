import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { API_BASE_URL } from '../../../../core/api/api-url';
import { Expenses } from './expenses.component';

describe('Expenses page', () => {
  it('renders the empty month and keeps invalid expenses open without writing', async () => {
    TestBed.configureTestingModule({
      imports: [Expenses],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConfirmationService,
        MessageService,
      ],
    });
    const fixture = TestBed.createComponent(Expenses);
    const requests = TestBed.inject(HttpTestingController);
    requests.expectOne(API_BASE_URL + '/expenses/categories').flush([]);
    requests
      .expectOne((r) => r.url === API_BASE_URL + '/expenses')
      .flush({
        items: [],
        page: 1,
        page_size: 20,
        total: 0,
        total_pages: 0,
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No hay compras o gastos');
    fixture.componentInstance.startExpense();
    await fixture.componentInstance.save();
    expect(fixture.componentInstance.editor()).toBe(true);
    expect(fixture.componentInstance.facade.form.touched).toBe(true);
    requests.expectNone((r) => r.method === 'POST');
    requests.verify();
  });
});
