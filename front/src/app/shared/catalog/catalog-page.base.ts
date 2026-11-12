import { Directive, Type, inject, signal } from '@angular/core';
import { FormControl, FormRecord, ValidatorFn, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { AuthStore } from '../../core/auth/auth.store';
import { EntityFacade } from '../../core/state/entity.facade';
import { Column, Field, FieldGroup, FormValue, Option } from './catalog.models';
import { trimmedRequired } from '../validators/text.validators';

@Directive()
export abstract class CatalogPage<T extends { activo: boolean }, C, U> {
  readonly extraView: Type<unknown> | null = null;
  readonly createView: Type<unknown> | null = null;
  readonly createWidth: string = '920px';
  readonly editorWidth: string = '740px';
  readonly fieldGroups: FieldGroup[] = [];
  readonly editTab = signal<string | number | undefined>('general');
  readonly detailTab = signal<string | number | undefined>('general');
  groupFields(group: FieldGroup): Field[] {
    return group.keys.map((key) => this.fields.find((field) => field.key === key)!);
  }
  groupInvalid(group: FieldGroup): boolean {
    return group.keys.some(
      (key) => this.form.controls[key]?.touched && this.form.controls[key].invalid,
    );
  }
  readonly createPayload = (values: Record<string, FormValue>) => this.payload(values);
  readonly closeCreate = () => this.dialog.set(false);
  readonly rowActions: { icon: string; label: string; run: (row: T) => void }[] = [];
  readonly lookupError = signal('');
  retryLookup(): void {}
  readonly user = inject(AuthStore).user;
  private readonly confirmation = inject(ConfirmationService);
  abstract readonly title: string;
  abstract readonly singular: string;
  abstract readonly description: string;
  abstract readonly fields: Field[];
  abstract readonly columns: Column[];
  abstract readonly facade: EntityFacade<T, C, U>;
  abstract id(row: T): number;
  abstract payload(values: Record<string, FormValue>): C;
  readonly form = new FormRecord<FormControl<FormValue>>({});
  readonly dialog = signal(false);
  readonly detailOpen = signal(false);
  readonly editing = signal<number | null>(null);
  readonly search = signal('');
  readonly active = signal<boolean | null>(true);
  readonly category = signal<number | null>(null);
  readonly detail = signal<T | null>(null);
  readonly statuses = [
    { label: 'Activos', value: true },
    { label: 'Inactivos', value: false },
    { label: 'Todos', value: null },
  ];
  canManage() {
    return this.user()?.rol === 'ADMIN';
  }
  setup() {
    for (const f of this.fields) {
      const validators: ValidatorFn[] = [];
      if (f.required) validators.push(Validators.required, trimmedRequired);
      if (f.type === 'number') {
        if (f.min !== undefined) validators.push(Validators.min(f.min));
        if (f.max !== undefined) validators.push(Validators.max(f.max));
      } else if (f.max) validators.push(Validators.maxLength(f.max));
      if (f.pattern) validators.push(Validators.pattern(f.pattern));
      if (f.type === 'email') validators.push(Validators.email);
      this.form.addControl(f.key, new FormControl<FormValue>(null, validators));
    }
    void this.facade.load({ activo: true }, 1);
  }
  value(row: T, key: string): FormValue {
    const value = (row as Record<string, unknown>)[key];
    return typeof value === 'string' || typeof value === 'number' ? value : null;
  }
  displayValue(row: T, field: Field): FormValue {
    const value = this.value(row, field.key);
    return field.options?.().find((option) => option.value === value)?.label ?? value;
  }
  detailTitle(row: T): string {
    return String(
      this.value(row, 'nombre') ||
        this.value(row, 'razon_social') ||
        [this.value(row, 'nombres'), this.value(row, 'apellidos')].filter(Boolean).join(' ') ||
        this.title,
    );
  }
  categoryOptions(): Option[] {
    return [];
  }
  filter() {
    void this.facade.load(
      { search: this.search().trim(), activo: this.active(), category_id: this.category() },
      1,
    );
  }
  paginate(event: { first?: number; rows?: number }) {
    const size = event.rows ?? 20;
    void this.facade.load(this.facade.query(), Math.floor((event.first ?? 0) / size) + 1, size);
  }
  create() {
    this.editTab.set(this.fieldGroups[0]?.id);
    this.editing.set(null);
    this.form.reset();
    this.facade.operationError.set('');
    this.dialog.set(true);
  }
  async edit(row: T) {
    if (this.facade.saving()) return;
    if (!(await this.facade.detail(this.id(row)))) return;
    const current = this.facade.selected();
    if (!current) return;
    this.editTab.set(this.fieldGroups[0]?.id);
    this.editing.set(this.id(current));
    this.form.reset();
    for (const f of this.fields) {
      const raw = this.value(current, f.key);
      this.form.controls[f.key].setValue(f.type === 'number' && raw !== null ? Number(raw) : raw);
    }
    this.dialog.set(true);
  }
  async show(row: T) {
    if (await this.facade.detail(this.id(row))) {
      this.detail.set(this.facade.selected());
      this.detailTab.set(this.fieldGroups[0]?.id);
      this.detailOpen.set(true);
    }
  }
  deactivate(row: T) {
    this.confirmation.confirm({
      key: 'deactivate',
      header: 'Desactivar ' + this.singular,
      message: 'El registro quedará inactivo. Se conservará su información e historial.',
      acceptLabel: 'Desactivar',
      rejectLabel: 'Volver',
      acceptButtonProps: { severity: 'primary' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => void this.facade.deactivate(this.id(row)),
    });
  }
  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const invalidGroup = this.fieldGroups.find((group) => this.groupInvalid(group));
      if (invalidGroup) this.editTab.set(invalidGroup.id);
      return;
    }
    const payload = this.payload(this.form.getRawValue());
    if (await this.facade.save(this.editing(), payload)) {
      this.dialog.set(false);
    }
  }
  text(v: FormValue) {
    return String(v ?? '').trim();
  }
  optional(v: FormValue) {
    return this.text(v) || null;
  }
  number(v: FormValue) {
    return v === null || v === '' ? null : Number(v);
  }
}
