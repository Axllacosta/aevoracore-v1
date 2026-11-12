import { Component, inject, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ExpenseResponse } from '../../../../core/models/expense.model';
import { ExpensesFacade } from '../../data-access/expenses.facade';

@Component({
  selector: 'app-expenses',
  imports: UI,
  providers: [ExpensesFacade],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class Expenses {
  readonly facade = inject(ExpensesFacade);
  readonly user = inject(AuthStore).user;
  private readonly confirmation = inject(ConfirmationService);
  readonly editor = signal(false);
  readonly categoryEditor = signal(false);
  readonly categoryName = signal('');
  readonly minMonth = new Date(2000, 0, 1);
  readonly maxMonth = new Date(2100, 11, 31);
  startExpense(row?: ExpenseResponse) {
    this.facade.start(row);
    this.editor.set(true);
  }
  async save() {
    if (await this.facade.save()) this.editor.set(false);
  }
  async saveCategory() {
    if (await this.facade.addCategory(this.categoryName())) {
      this.categoryName.set('');
      this.categoryEditor.set(false);
    }
  }
  cancel(row: ExpenseResponse) {
    this.confirmation.confirm({
      acceptButtonProps: { severity: 'primary' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      header: 'Anular gasto',
      message: `Se excluirá el gasto #${row.id_gasto} del cálculo mensual y se conservará su registro.`,
      acceptLabel: 'Anular gasto',
      rejectLabel: 'Volver',
      accept: () => void this.facade.cancel(row),
    });
  }
  changeMonth(month: string) {
    this.facade.month.set(month);
    void this.facade.load(1);
  }
  paginate(event: { first?: number; rows?: number }) {
    void this.facade.load(Math.floor((event.first ?? 0) / 20) + 1);
  }
}
