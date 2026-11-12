import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { App } from './app.component';
describe('Application shell', () => {
  it('keeps sale cancellation title and content aligned with compact spacing', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), MessageService, ConfirmationService],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    TestBed.inject(ConfirmationService).confirm({
      key: 'cancel-sale',
      header: 'Confirmar cancelación',
      message: 'Se cancelará la venta #4.',
    });
    await fixture.whenStable();
    const modal = document.body.querySelector('.sale-cancel-confirm') as HTMLElement;
    expect(modal).not.toBeNull();
    expect(modal.querySelector<HTMLElement>('.p-dialog-title')?.style.margin).toBe('0px');
    expect(modal.querySelector<HTMLElement>('.p-dialog-header')?.style.padding).toBe(
      '24px 24px 12px',
    );
    expect(modal.querySelector<HTMLElement>('.p-dialog-content')?.style.padding).toBe(
      '0px 24px 24px',
    );
    expect(modal.querySelector<HTMLElement>('.p-dialog-footer')?.style.padding).toBe(
      '0px 24px 24px',
    );
  });
  it('mounts route content, notifications and critical-action confirmation', async () => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), MessageService, ConfirmationService],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p-toast')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('p-confirmdialog')).toBeTruthy();
  });
});
