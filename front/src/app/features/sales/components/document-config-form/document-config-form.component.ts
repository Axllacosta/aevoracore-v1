import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { SalesApiService } from '../../../../core/api/sales-api.service';
import { errorMessage } from '../../../../core/api/api-error';
import { trimmedRequired } from '../../../../shared/validators/text.validators';
import { UI } from '../../../../shared/ui/prime-ng.imports';

@Component({
  selector: 'app-document-config',
  imports: UI,
  templateUrl: './document-config-form.component.html',
  styleUrl: './document-config-form.component.scss',
})
export class DocumentConfigForm {
  private readonly api = inject(SalesApiService);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    ruc: ['', [Validators.required, Validators.pattern(/^[0-9]{11}$/)]],
    razon_social: ['', [Validators.required, trimmedRequired, Validators.maxLength(200)]],
    direccion: ['', [Validators.required, trimmedRequired, Validators.maxLength(500)]],
  });
  readonly busy = signal(false);
  readonly loadFailed = signal(false);
  readonly error = signal('');
  readonly saved = signal(false);
  constructor() {
    void this.load();
  }
  async load() {
    this.busy.set(true);
    this.error.set('');
    this.loadFailed.set(false);
    try {
      const config = await firstValueFrom(this.api.documentConfig());
      if (config) this.form.patchValue(config);
    } catch (error) {
      this.error.set(errorMessage(error));
      this.loadFailed.set(true);
    } finally {
      this.busy.set(false);
    }
  }
  async save() {
    if (this.busy() || this.loadFailed()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.busy.set(true);
    this.error.set('');
    this.saved.set(false);
    try {
      this.form.patchValue(
        await firstValueFrom(this.api.saveDocumentConfig(this.form.getRawValue())),
      );
      this.saved.set(true);
    } catch (error) {
      this.error.set(errorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }
}
