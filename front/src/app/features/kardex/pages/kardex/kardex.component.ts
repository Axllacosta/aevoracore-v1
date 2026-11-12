import { Component, ViewEncapsulation, inject, signal } from '@angular/core';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { KardexFacade } from '../../data-access/kardex.facade';
@Component({
  selector: 'app-kardex',
  encapsulation: ViewEncapsulation.None,
  imports: UI,
  providers: [KardexFacade],
  templateUrl: './kardex.component.html',
  styleUrl: './kardex.component.scss',
})
export class Kardex {
  readonly facade = inject(KardexFacade);
  readonly product = signal<number | null>(null);
  readonly user = signal<number | null>(null);
  readonly type = signal<string | null>(null);
  readonly from = signal<Date | null>(null);
  readonly to = signal<Date | null>(null);
  readonly filterError = signal('');
  readonly types = [
    { label: 'Entrada', value: 'ENTRADA' },
    { label: 'Salida', value: 'SALIDA' },
    { label: 'Ajuste', value: 'AJUSTE' },
  ];
  constructor() {
    void this.facade.load();
  }
  filter() {
    this.filterError.set('');
    const from = this.from();
    const to = this.to();
    if (from && to && from > to) {
      this.filterError.set('La fecha inicial debe ser anterior a la final.');
      return;
    }
    const end = to ? new Date(to) : null;
    end?.setHours(23, 59, 59, 999);
    void this.facade.load(
      {
        product_id: this.product(),
        user_id: this.user(),
        movement_type: this.type(),
        date_from: from?.toISOString(),
        date_to: end?.toISOString(),
      },
      1,
    );
  }
  paginate(e: { first?: number; rows?: number }) {
    const size = e.rows ?? 20;
    void this.facade.load(this.facade.query(), Math.floor((e.first ?? 0) / size) + 1, size);
  }
}
