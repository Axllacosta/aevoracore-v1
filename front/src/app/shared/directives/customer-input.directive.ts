import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({ selector: 'input[appCustomerInput]' })
export class CustomerInputDirective {
  readonly appCustomerInput = input<'digits' | 'name' | null>(null);
  private readonly element = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly control = inject(NgControl, { optional: true });

  @HostListener('input', ['$event'])
  onInput(event: InputEvent): void {
    if (!event.isComposing) this.clean();
  }

  @HostListener('compositionend')
  clean(): void {
    const kind = this.appCustomerInput();
    if (!kind) return;
    const element = this.element.nativeElement;
    const value =
      kind === 'digits'
        ? element.value.replace(/[^0-9]/g, '')
        : element.value.replace(/[^\p{L}\p{M} '’-]/gu, '');
    const cleaned = element.maxLength >= 0 ? value.slice(0, element.maxLength) : value;
    if (cleaned !== element.value) {
      element.value = cleaned;
      this.control?.control?.setValue(cleaned);
    }
  }
}
