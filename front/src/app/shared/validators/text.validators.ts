import { ValidatorFn } from '@angular/forms';

export const trimmedRequired: ValidatorFn = (control) =>
  typeof control.value === 'string' && !control.value.trim() ? { required: true } : null;
export const trimmedMinLength =
  (length: number): ValidatorFn =>
  (control) =>
    typeof control.value === 'string' && control.value.trim().length < length
      ? { minlength: { requiredLength: length, actualLength: control.value.trim().length } }
      : null;
