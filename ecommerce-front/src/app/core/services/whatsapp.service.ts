import { Injectable } from '@angular/core';

import { BUSINESS_CONFIG } from '../config/business.config';
import type { CartItem } from '../models/cart-item.model';
import type { CheckoutCustomer } from '../models/checkout-customer.model';

@Injectable({
  providedIn: 'root',
})
export class WhatsAppService {
  private readonly currencyFormatter = new Intl.NumberFormat(BUSINESS_CONFIG.locale, {
    style: 'currency',
    currency: BUSINESS_CONFIG.currency,
  });

  generateOrderUrl(
    items: CartItem[],
    subtotal: number,
    customer?: CheckoutCustomer,
  ): string | null {
    const phone = BUSINESS_CONFIG.whatsappPhone;

    if (!/^\d{8,15}$/.test(phone) || items.length === 0) {
      return null;
    }

    const message = this.generateMessage(items, subtotal, customer);

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  private generateMessage(
    items: CartItem[],
    subtotal: number,
    customer?: CheckoutCustomer,
  ): string {
    const productLines = items.map((item, index) => {
      const unitPrice = Number(item.product.precio_base);

      const lineTotalInCents = Math.round(unitPrice * 100) * item.quantity;

      const lineTotal = lineTotalInCents / 100;

      return [
        `${index + 1}. ${item.product.nombre}`,
        `   SKU: ${item.product.sku}`,
        `   Cantidad: ${item.quantity}`,
        `   Precio unitario: ${this.formatCurrency(unitPrice)}`,
        `   Importe: ${this.formatCurrency(lineTotal)}`,
      ].join('\n');
    });

    return [
      `Hola, quisiera realizar el siguiente pedido en ${BUSINESS_CONFIG.name}:`,
      '',
      ...productLines,
      '',
      `Subtotal: ${this.formatCurrency(subtotal)}`,
      '',
      ...(customer
        ? [
            'Datos del cliente:',
            `Nombre: ${customer.name.trim()}`,
            `Teléfono: ${customer.phone.trim()}`,
            `Correo: ${customer.email.trim()}`,
            `Comprobante: ${customer.receiptType === 'none' ? 'Sin comprobante' : customer.receiptType === 'factura' ? 'Factura' : 'Boleta'}`,
            ...(customer.receiptType === 'none'
              ? []
              : [
                  `${customer.receiptType === 'factura' ? 'RUC' : 'DNI'}: ${customer.document.trim()}`,
                ]),
            '',
          ]
        : []),
      'El envío o recojo y el pago se coordinarán por WhatsApp. El subtotal no incluye envío.',
      '',
      'Quedo atento/a a la confirmación de mi pedido.',
    ].join('\n');
  }

  private formatCurrency(amount: number): string {
    return this.currencyFormatter.format(amount);
  }
}
