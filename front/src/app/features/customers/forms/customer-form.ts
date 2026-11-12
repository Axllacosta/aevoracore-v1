import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormRecord, Validators } from '@angular/forms';
import { CustomerCreate } from '../../../core/models/customer.model';
import { Field, FormValue } from '../../../shared/catalog/catalog.models';
import { trimmedRequired } from '../../../shared/validators/text.validators';

function optional(value: FormValue): string | null {
  return String(value ?? '').trim() || null;
}

export function createCustomerForm(fields: Field[]) {
  const form = new FormRecord<FormControl<FormValue>>({});
  for (const field of fields) {
    const validators = [];
    if (field.required) validators.push(Validators.required, trimmedRequired);
    if (field.max) validators.push(Validators.maxLength(field.max));
    if (field.pattern) validators.push(Validators.pattern(field.pattern));
    if (field.type === 'email') validators.push(Validators.email);
    form.addControl(field.key, new FormControl<FormValue>(null, validators));
  }
  return form;
}

export function configureCustomerType(
  form: FormRecord<FormControl<FormValue>>,
  fields: Field[],
  destroyRef: DestroyRef,
) {
  form.controls['tipo_persona'].valueChanges
    .pipe(takeUntilDestroyed(destroyRef))
    .subscribe((value) => {
      const company = value === 'JURIDICA';
      for (const key of ['nombres', 'apellidos', 'dni', 'telefono', 'ruc', 'razon_social']) {
        const required = ['ruc', 'razon_social'].includes(key) ? company : !company;
        fields.find((field) => field.key === key)!.required = required;
        const control = form.controls[key];
        if (required) control.addValidators([Validators.required, trimmedRequired]);
        else control.removeValidators([Validators.required, trimmedRequired]);
        control.updateValueAndValidity({ emitEvent: false });
      }
    });
}

export function customerFields(): Field[] {
  return [
    {
      key: 'tipo_persona',
      label: 'Tipo de cliente',
      type: 'select',
      options: () => [
        { label: 'Persona natural', value: 'NATURAL' },
        { label: 'Empresa', value: 'JURIDICA' },
      ],
    },
    { key: 'razon_social', label: 'Razón social', max: 200 },
    { key: 'direccion_fiscal', label: 'Dirección fiscal', max: 500 },
    {
      key: 'nombres',
      label: 'Nombres',
      required: true,
      max: 100,
      input: 'name',
      pattern: /^(?=.*\p{L})[\p{L}\p{M} '’-]+$/u,
    },
    {
      key: 'apellidos',
      label: 'Apellidos',
      required: true,
      max: 100,
      input: 'name',
      pattern: /^(?=.*\p{L})[\p{L}\p{M} '’-]+$/u,
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      type: 'tel',
      required: true,
      max: 9,
      input: 'digits',
      pattern: /^[0-9]{9}$/,
    },
    { key: 'correo', label: 'Correo electrónico (opcional)', type: 'email', max: 160 },
    { key: 'dni', label: 'DNI', required: true, max: 8, input: 'digits', pattern: /^[0-9]{8}$/ },
    { key: 'ruc', label: 'RUC', max: 11, input: 'digits', pattern: /^[0-9]{11}$/ },
  ];
}
export function customerPayload(v: Record<string, FormValue>): CustomerCreate {
  return {
    tipo_persona: v['tipo_persona'] === 'JURIDICA' ? 'JURIDICA' : 'NATURAL',
    razon_social: optional(v['razon_social']),
    direccion_fiscal: optional(v['direccion_fiscal']),
    nombres: optional(v['nombres']),
    apellidos: optional(v['apellidos']),
    dni: optional(v['dni']),
    ruc: optional(v['ruc']),
    correo: optional(v['correo']),
    telefono: optional(v['telefono']),
  };
}
