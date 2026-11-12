import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ExpensesApiService } from '../../../core/api/expenses-api.service';
import { errorMessage } from '../../../core/api/api-error';
import {
  ExpenseCategory,
  ExpenseCreate,
  ExpenseResponse,
} from '../../../core/models/expense.model';
import { ListState } from '../../../core/state/list-state';
import { OperationState } from '../../../core/state/operation-state';

export function limaDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
@Injectable()
export class ExpensesFacade {
  private readonly api = inject(ExpensesApiService);
  private readonly fb = inject(FormBuilder);
  readonly operation = new OperationState(inject(MessageService));
  readonly list = new ListState((query) => this.api.list(query));
  readonly month = signal(limaDate().slice(0, 7));
  readonly categories = signal<ExpenseCategory[]>([]);
  readonly categoryError = signal('');
  readonly editing = signal<number | null>(null);
  readonly form = this.fb.group({
    id_categoria_gasto: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.nonNullable.control(limaDate(), Validators.required),
    importe: this.fb.control<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.max(9999999999.99),
      Validators.pattern(/^\d+(\.\d{1,2})?$/),
    ]),
    descripcion: this.fb.nonNullable.control('', Validators.maxLength(1000)),
  });
  constructor() {
    void this.loadCategories();
    void this.load(1);
  }
  private monthQuery() {
    const [anio, mes] = this.month().split('-').map(Number);
    return { anio, mes };
  }
  async load(page = this.list.page()) {
    if (!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(this.month())) return;
    const query = this.monthQuery();
    await this.list.load(query, page);
  }
  async loadCategories() {
    this.categoryError.set('');
    try {
      this.categories.set(await firstValueFrom(this.api.categories()));
    } catch (error) {
      this.categoryError.set(errorMessage(error));
    }
  }
  requiresDescription() {
    return (
      this.categories().find(
        (c) => c.id_categoria_gasto === this.form.controls.id_categoria_gasto.value,
      )?.requiere_descripcion ?? false
    );
  }
  start(row?: ExpenseResponse) {
    this.editing.set(row?.id_gasto ?? null);
    this.operation.error.set('');
    this.form.reset({
      id_categoria_gasto: row?.id_categoria_gasto ?? null,
      fecha:
        row?.fecha ?? (this.month() === limaDate().slice(0, 7) ? limaDate() : `${this.month()}-01`),
      importe: row ? Number(row.importe) : null,
      descripcion: row?.descripcion ?? '',
    });
  }
  async save(): Promise<boolean> {
    this.form.markAllAsTouched();
    this.operation.error.set('');
    if (this.form.invalid) {
      this.operation.error.set(
        'Completa la fecha, categoría e importe positivo con hasta dos decimales.',
      );
      return false;
    }
    const value = this.form.getRawValue();
    const description = value.descripcion.trim() || null;
    if (this.requiresDescription() && !description) {
      this.operation.error.set('La categoría Otros requiere una descripción.');
      return false;
    }
    const body: ExpenseCreate = {
      id_categoria_gasto: value.id_categoria_gasto!,
      fecha: value.fecha,
      importe: value.importe!.toFixed(2),
      descripcion: description,
    };
    const id = this.editing();
    return !!(await this.operation.run(
      () => (id === null ? this.api.create(body) : this.api.update(id, body)),
      id === null ? 'Gasto registrado' : 'Gasto actualizado',
      async () => {
        await this.load();
      },
    ));
  }
  async addCategory(name: string) {
    const normalized = name.trim();
    if (!normalized || normalized.length > 100) {
      this.operation.error.set('Escribe un nombre de categoría de hasta 100 caracteres.');
      return false;
    }
    return !!(await this.operation.run(
      () => this.api.createCategory(normalized),
      'Categoría creada',
      async (category) => {
        this.categories.update((items) =>
          [...items, category].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        );
        this.form.controls.id_categoria_gasto.setValue(category.id_categoria_gasto);
      },
    ));
  }
  async cancel(row: ExpenseResponse) {
    await this.operation.run(
      () => this.api.cancel(row.id_gasto),
      'Gasto anulado',
      async () => {
        await this.load();
      },
    );
  }
}
