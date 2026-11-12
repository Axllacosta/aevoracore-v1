import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { AuthStore } from '../../../../core/auth/auth.store';
import { InventoryItemResponse } from '../../../../core/models/inventory.model';
import { DireccionAjuste } from '../../../../core/models/movement.model';
import { InventoryFacade } from '../../data-access/inventory.facade';
import { trimmedRequired, trimmedMinLength } from '../../../../shared/validators/text.validators';
@Component({
  selector: 'app-inventory',
  imports: UI,
  providers: [InventoryFacade],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss',
})
export class Inventory {
  readonly facade = inject(InventoryFacade);
  readonly user = inject(AuthStore).user;
  private readonly confirms = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  readonly search = signal('');
  readonly low = signal<boolean | null>(null);
  readonly selected = signal<InventoryItemResponse | null>(null);
  readonly mode = signal<'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MINIMO'>('ENTRADA');
  readonly open = signal(false);
  readonly stocks = [
    { label: 'Todos', value: null },
    { label: 'Stock bajo', value: true },
    { label: 'Stock suficiente', value: false },
  ];
  readonly directions = [
    { label: 'Incrementar', value: 'INCREMENTO' },
    { label: 'Disminuir', value: 'DECREMENTO' },
  ];
  readonly form = this.fb.nonNullable.group({
    cantidad: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
    motivo: [
      '',
      [Validators.required, trimmedRequired, trimmedMinLength(3), Validators.maxLength(1000)],
    ],
    direccion_ajuste: ['INCREMENTO' as DireccionAjuste, Validators.required],
  });
  constructor() {
    void this.facade.load();
  }
  filter() {
    void this.facade.load({ search: this.search().trim(), stock_bajo: this.low() }, 1);
  }
  paginate(e: { first?: number; rows?: number }) {
    const size = e.rows ?? 20;
    void this.facade.load(this.facade.query(), Math.floor((e.first ?? 0) / size) + 1, size);
  }
  show(row: InventoryItemResponse, mode: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MINIMO') {
    this.selected.set(row);
    this.mode.set(mode);
    this.facade.operation.error.set('');
    this.form.reset({
      cantidad: mode === 'MINIMO' ? row.stock_minimo : 1,
      motivo: '',
      direccion_ajuste: 'INCREMENTO',
    });
    this.form.controls.cantidad.setValidators([
      Validators.required,
      Validators.min(mode === 'MINIMO' ? 0 : 1),
      Validators.pattern(/^\d+$/),
    ]);
    this.form.controls.motivo.setValidators(
      mode === 'MINIMO'
        ? []
        : [Validators.required, trimmedRequired, trimmedMinLength(3), Validators.maxLength(1000)],
    );
    this.form.controls.cantidad.updateValueAndValidity();
    this.form.controls.motivo.updateValueAndValidity();
    this.open.set(true);
  }
  submit() {
    if (this.facade.operation.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const row = this.selected();
    if (!row) return;
    const v = this.form.getRawValue();
    if (
      (this.mode() === 'SALIDA' ||
        (this.mode() === 'AJUSTE' && v.direccion_ajuste === 'DECREMENTO')) &&
      v.cantidad > row.stock_actual
    ) {
      this.facade.operation.error.set(
        'La cantidad supera el stock disponible. Actualiza el inventario si cambió recientemente.',
      );
      return;
    }
    this.confirms.confirm({
      acceptButtonProps: { severity: 'primary' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      header: 'Confirmar operación de inventario',
      message:
        this.mode() === 'MINIMO'
          ? `Se establecerá un stock mínimo de ${v.cantidad} para ${row.nombre}.`
          : `Se registrará ${this.mode().toLowerCase()} de ${v.cantidad} unidades de ${row.nombre}. Motivo: ${v.motivo.trim()}`,
      acceptLabel: 'Confirmar',
      rejectLabel: 'Revisar',
      accept: () => void this.save(),
    });
  }
  private async save() {
    const row = this.selected();
    if (!row) return;
    const v = this.form.getRawValue();
    const result =
      this.mode() === 'MINIMO'
        ? await this.facade.minimum(row.id_producto, v.cantidad)
        : await this.facade.movement(
            this.mode() === 'AJUSTE'
              ? {
                  id_producto: row.id_producto,
                  direccion_ajuste: v.direccion_ajuste,
                  cantidad: v.cantidad,
                  motivo: v.motivo.trim(),
                }
              : {
                  id_producto: row.id_producto,
                  tipo_movimiento: this.mode() === 'ENTRADA' ? 'ENTRADA' : 'SALIDA',
                  cantidad: v.cantidad,
                  motivo: v.motivo.trim(),
                },
          );
    if (result) this.open.set(false);
  }
}
