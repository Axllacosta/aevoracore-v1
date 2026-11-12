import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ProductsApiService } from '../../../../core/api/products-api.service';
import { normalizeApiError } from '../../../../core/api/api-error';
import { ProductCreate, ProductResponse } from '../../../../core/models/product.model';
import { Field, FormValue } from '../../../../shared/catalog/catalog.models';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { ProductsFacade } from '../../data-access/products.facade';

interface SelectedImage {
  file: File;
  preview: string;
  uploaded: boolean;
}

@Component({
  selector: 'app-product-create-wizard',
  imports: UI,
  templateUrl: './product-create-wizard.component.html',
  styleUrl: './product-create-wizard.component.scss',
})
export class ProductCreateWizard implements OnDestroy {
  readonly facade = inject(ProductsFacade);
  private readonly api = inject(ProductsApiService);
  readonly form = input.required<FormRecord<FormControl<FormValue>>>();
  readonly fields = input.required<Field[]>();
  readonly buildPayload = input.required<(values: Record<string, FormValue>) => ProductCreate>();
  readonly close = input.required<() => void>();
  readonly step = signal(0);
  readonly completed = signal(false);
  readonly error = signal('');
  readonly imageError = signal('');
  readonly savedProduct = signal<ProductResponse | null>(null);
  readonly images = signal<SelectedImage[]>([]);
  private readonly heading = viewChild<ElementRef<HTMLElement>>('stepHeading');
  readonly steps = [
    { title: 'Información general', keys: ['id_categoria', 'sku', 'nombre', 'descripcion'] },
    { title: 'Características', keys: ['color', 'acabado', 'material'] },
    { title: 'Dimensiones', keys: ['alto', 'ancho', 'profundidad'] },
    {
      title: 'Información comercial',
      keys: ['precio_base', 'costo_referencia', 'controlar_stock'],
    },
    { title: 'Imágenes del producto', keys: [] },
  ];
  readonly activeFields = computed(() =>
    this.steps[this.step()].keys
      .map((key) => this.fields().find((field) => field.key === key)!)
      .filter(Boolean),
  );

  private validStep(step: number): boolean {
    let valid = true;
    for (const key of this.steps[step].keys) {
      const control = this.form().controls[key];
      control.markAsTouched();
      if (control.invalid) valid = false;
    }
    return valid;
  }

  goToStep(target: number): void {
    if (this.facade.saving() || this.savedProduct() || target < 0 || target >= this.steps.length)
      return;
    for (let index = this.step(); index < target; index++) {
      if (!this.validStep(index)) {
        this.step.set(index);
        this.focusHeading();
        return;
      }
    }
    this.step.set(target);
    this.focusHeading();
  }

  private focusHeading(): void {
    setTimeout(() => this.heading()?.nativeElement.focus());
  }

  selectImages(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.addImages(Array.from(input.files ?? []));
    input.value = '';
  }

  addImages(files: File[]): void {
    if (this.facade.saving()) return;
    this.imageError.set('');
    if (
      files.some(
        (file) =>
          !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          file.size > 5 * 1024 * 1024,
      )
    ) {
      this.imageError.set('Selecciona imágenes JPG, PNG o WebP de hasta 5 MB cada una.');
      return;
    }
    this.images.update((images) => [
      ...images,
      ...files.map((file) => ({ file, preview: URL.createObjectURL(file), uploaded: false })),
    ]);
  }

  removeImage(index: number): void {
    const image = this.images()[index];
    if (!image || image.uploaded || this.facade.saving()) return;
    URL.revokeObjectURL(image.preview);
    this.images.update((images) => images.filter((_, current) => current !== index));
  }

  async submit(): Promise<void> {
    if (this.facade.saving() || this.completed()) return;
    if (this.step() < this.steps.length - 1) {
      this.goToStep(this.step() + 1);
      return;
    }
    if (!this.savedProduct() && this.form().invalid) {
      const firstInvalid = this.steps.findIndex((step) =>
        step.keys.some((key) => this.form().controls[key].invalid),
      );
      this.form().markAllAsTouched();
      this.step.set(Math.max(0, firstInvalid));
      this.focusHeading();
      return;
    }
    this.facade.saving.set(true);
    this.error.set('');
    try {
      if (!this.savedProduct()) {
        this.savedProduct.set(
          await firstValueFrom(this.api.create(this.buildPayload()(this.form().getRawValue()))),
        );
        this.form().disable();
        this.facade.selected.set(this.savedProduct());
      }
      for (const image of this.images()) {
        if (image.uploaded) continue;
        await firstValueFrom(
          this.api.uploadImage(
            this.savedProduct()!.id_producto,
            image.file,
            !this.images().some((item) => item.uploaded),
          ),
        );
        this.images.update((images) =>
          images.map((item) => (item === image ? { ...item, uploaded: true } : item)),
        );
      }
      this.completed.set(true);
      this.focusHeading();
    } catch (error) {
      this.error.set(
        (this.savedProduct()
          ? 'El producto ya está creado. Reintenta las imágenes pendientes. '
          : '') + normalizeApiError(error).message,
      );
    } finally {
      if (this.savedProduct()) await this.facade.load();
      this.facade.saving.set(false);
    }
  }

  restart(): void {
    if (this.facade.saving()) return;
    this.clearPreviews();
    this.form().enable();
    this.form().reset();
    this.savedProduct.set(null);
    this.completed.set(false);
    this.error.set('');
    this.imageError.set('');
    this.step.set(0);
    this.focusHeading();
  }

  private clearPreviews(): void {
    for (const image of this.images()) URL.revokeObjectURL(image.preview);
    this.images.set([]);
  }

  ngOnDestroy(): void {
    this.clearPreviews();
    this.form().enable();
  }
}
