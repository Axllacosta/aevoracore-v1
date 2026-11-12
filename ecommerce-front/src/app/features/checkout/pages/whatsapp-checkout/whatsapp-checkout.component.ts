import { CurrencyPipe } from '@angular/common';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import type { CartItem } from '../../../../core/models/cart-item.model';
import type { CheckoutCustomer } from '../../../../core/models/checkout-customer.model';
import { ProductImage } from '../../../products/components/product-image/product-image.component';
import { CustomerInputDirective } from '../../../../shared/directives/customer-input.directive';

@Component({
  selector: 'app-whatsapp-checkout',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, ProductImage, ReactiveFormsModule, CustomerInputDirective],
  templateUrl: './whatsapp-checkout.component.html',
  styleUrl: './whatsapp-checkout.component.scss',
})
export class WhatsappCheckout {
  protected readonly ecommerce = inject(EcommerceFacade);
  readonly step = signal(0);
  readonly steps = ['Confirma tu carrito', 'Revisa el resumen', 'Datos del cliente'];
  private readonly stepHeading = viewChild<ElementRef<HTMLElement>>('stepHeading');

  readonly customerForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^(?=.*\p{L})[\p{L}\p{M} '’-]+$/u),
        Validators.maxLength(120),
      ],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^[0-9]{9}$/)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(160)],
    }),
    receiptType: new FormControl<CheckoutCustomer['receiptType']>('none', { nonNullable: true }),
    document: new FormControl('', { nonNullable: true }),
  });

  goToStep(step: number): void {
    if (this.ecommerce.isCartEmpty() || step < 0 || step > 2 || step > this.step() + 1) return;
    this.step.set(step);
    setTimeout(() => this.stepHeading()?.nativeElement.focus());
  }

  changeReceipt(): void {
    const type = this.customerForm.controls.receiptType.value;
    const document = this.customerForm.controls.document;
    document.reset('');
    document.setValidators(
      type === 'none'
        ? []
        : [
            Validators.required,
            Validators.pattern(type === 'factura' ? /^[0-9]{11}$/ : /^[0-9]{8}$/),
          ],
    );
    document.updateValueAndValidity();
  }

  showErrors(): void {
    this.customerForm.markAllAsTouched();
  }

  get whatsappUrl(): string | null {
    if (this.step() !== 2 || this.customerForm.invalid || this.ecommerce.isCartEmpty()) return null;
    return this.ecommerce.generateWhatsAppOrderUrl(this.customerForm.getRawValue());
  }

  updateQuantity(item: CartItem, delta: number): void {
    const quantity = item.quantity + delta;
    if (quantity < 1 || quantity > 99) return;
    this.ecommerce.updateCartQuantity(item.product.id_producto, quantity);
  }

  removeProduct(item: CartItem): void {
    this.ecommerce.removeCartProduct(item.product.id_producto);
    if (this.ecommerce.isCartEmpty()) this.step.set(0);
  }

  getLineSubtotal(item: CartItem): number {
    const price = Number(item.product.precio_base);
    return Number.isFinite(price) ? (Math.round(price * 100) * item.quantity) / 100 : 0;
  }
}
