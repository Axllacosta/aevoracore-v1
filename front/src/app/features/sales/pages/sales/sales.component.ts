import { Component, inject, signal } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { trimmedRequired, trimmedMinLength } from '../../../../shared/validators/text.validators';
import { AuthStore } from '../../../../core/auth/auth.store';
import { SaleResponse } from '../../../../core/models/sale.model';
import { SalesFacade } from '../../data-access/sales.facade';
import { SalesApiService } from '../../../../core/api/sales-api.service';
import { errorMessage } from '../../../../core/api/api-error';
import { SaleSummary } from '../../components/sale-summary/sale-summary.component';
import { DocumentConfigForm } from '../../components/document-config-form/document-config-form.component';
@Component({
  selector: 'app-sales',
  imports: [...UI, RouterLink, SaleSummary, DocumentConfigForm],
  providers: [SalesFacade],
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
})
export class Sales {
  readonly pdfLoading = signal(false);
  readonly pdfError = signal('');
  private readonly api = inject(SalesApiService);
  readonly configOpen = signal(false);
  readonly facade = inject(SalesFacade);
  readonly user = inject(AuthStore).user;
  private readonly confirms = inject(ConfirmationService);
  readonly detailOpen = signal(false);
  readonly cancelOpen = signal(false);
  readonly cancelId = signal<number | null>(null);
  readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required,
      trimmedRequired,
      trimmedMinLength(3),
      Validators.maxLength(1000),
    ],
  });
  constructor() {
    void this.facade.load();
  }
  async openPdf(row: SaleResponse) {
    if (!row.comprobante || this.pdfLoading()) return;
    this.pdfError.set('');
    const pdfWindow = window.open('about:blank', '_blank');
    if (!pdfWindow) {
      this.pdfError.set('Permite abrir pestañas emergentes para visualizar el comprobante.');
      return;
    }
    pdfWindow.opener = null;
    pdfWindow.document.title = 'Comprobante PDF';
    pdfWindow.document.body.textContent = 'Generando comprobante PDF…';
    this.pdfLoading.set(true);
    let objectUrl: string | null = null;
    try {
      const blob = await firstValueFrom(this.api.pdf(row.id_venta));
      if (pdfWindow.closed) return;
      if (blob.type !== 'application/pdf')
        throw new Error('El servidor no devolvió un PDF válido.');
      objectUrl = URL.createObjectURL(blob);
      pdfWindow.location.replace(objectUrl);
      const pdfUrl = objectUrl;
      const timer = window.setInterval(() => {
        if (pdfWindow.closed) {
          URL.revokeObjectURL(pdfUrl);
          window.clearInterval(timer);
        }
      }, 1000);
    } catch (error: unknown) {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (!pdfWindow.closed) pdfWindow.close();
      this.pdfError.set(errorMessage(error));
    } finally {
      this.pdfLoading.set(false);
    }
  }
  async show(row: SaleResponse) {
    if (await this.facade.detail(row.id_venta)) this.detailOpen.set(true);
  }
  startCancel(row: SaleResponse) {
    this.cancelId.set(row.id_venta);
    this.reason.reset();
    this.facade.operation.error.set('');
    this.cancelOpen.set(true);
  }
  cancel() {
    if (this.reason.invalid) {
      this.reason.markAsTouched();
      return;
    }
    const id = this.cancelId();
    if (id === null) return;
    this.confirms.confirm({
      key: 'cancel-sale',
      acceptButtonProps: { severity: 'primary' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      header: 'Confirmar cancelación',
      message: `Se cancelará la venta #${id}, se repondrá el stock y se registrará la reversión administrativa del pago.\n\nMotivo: ${this.reason.value.trim()}`,
      acceptLabel: 'Cancelar venta',
      rejectLabel: 'Volver',
      accept: () => void this.saveCancellation(id),
    });
  }
  private async saveCancellation(id: number) {
    if (await this.facade.cancel(id, this.reason.value.trim())) {
      this.cancelOpen.set(false);
      this.detailOpen.set(true);
    }
  }
}
