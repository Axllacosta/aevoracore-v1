import { Component, input } from '@angular/core';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { SaleResponse } from '../../../../core/models/sale.model';
@Component({
  selector: 'app-sale-summary',
  imports: UI,
  templateUrl: './sale-summary.component.html',
  styleUrl: './sale-summary.component.scss',
})
export class SaleSummary {
  readonly sale = input.required<SaleResponse>();
}
