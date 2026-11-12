import { Component, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { SalesApiService } from '../../../../core/api/sales-api.service';
import { errorMessage } from '../../../../core/api/api-error';
import { SaleResponse } from '../../../../core/models/sale.model';
import { UI } from '../../../../shared/ui/prime-ng.imports';

@Component({
  selector: 'app-sale-pdf-viewer',
  imports: UI,
  templateUrl: './sale-pdf-viewer.component.html',
  styleUrl: './sale-pdf-viewer.component.scss',
})
export class SalePdfViewer {
  private readonly api = inject(SalesApiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly sale = input.required<SaleResponse>();
  readonly loading = signal(false);
  readonly error = signal('');
  readonly objectUrl = signal('');
  readonly safeUrl = signal<SafeResourceUrl | null>(null);
  readonly retry = signal(0);
  readonly increment = (value: number) => value + 1;
  filename() {
    const doc = this.sale().comprobante;
    return doc
      ? `${doc.tipo}-${doc.serie}-${String(doc.correlativo).padStart(8, '0')}.pdf`
      : 'comprobante.pdf';
  }
  constructor() {
    effect((onCleanup) => {
      const id = this.sale().id_venta;
      this.retry();
      this.loading.set(true);
      this.error.set('');
      this.safeUrl.set(null);
      this.objectUrl.set('');
      let objectUrl = '';
      const subscription = this.api.pdf(id).subscribe({
        next: (blob) => {
          if (blob.type !== 'application/pdf') {
            this.error.set('El servidor no devolvió un PDF válido.');
          } else {
            objectUrl = URL.createObjectURL(blob);
            this.objectUrl.set(objectUrl);
            this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
          }
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.error.set(errorMessage(error));
          this.loading.set(false);
        },
      });
      onCleanup(() => {
        subscription.unsubscribe();
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      });
    });
  }
}
