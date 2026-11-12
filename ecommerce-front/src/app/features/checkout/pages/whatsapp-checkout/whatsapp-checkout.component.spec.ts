import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EcommerceFacade } from '../../../../core/facades/ecommerce.facade';
import type { PublicProduct } from '../../../../core/models/public-product.model';
import { CartService } from '../../../../core/services/cart.service';
import { WhatsAppService } from '../../../../core/services/whatsapp.service';
import { WhatsappCheckout } from './whatsapp-checkout.component';

const product: PublicProduct = {
  id_producto: 1,
  id_categoria: 7,
  sku: 'ED-01',
  nombre: 'Mostrador',
  descripcion: null,
  color: null,
  acabado: null,
  material: null,
  alto: null,
  ancho: null,
  profundidad: null,
  precio_base: '120.50',
  imagenes: [],
};

describe('WhatsappCheckout steps', () => {
  let fixture: ComponentFixture<WhatsappCheckout>;
  let component: WhatsappCheckout;
  let cart: CartService;
  let generateUrl: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    registerLocaleData(localeEsPe);
    cart = new CartService();
    cart.addProduct(product, 2);
    const whatsapp = new WhatsAppService();
    generateUrl = vi.fn((customer) =>
      whatsapp.generateOrderUrl(cart.items(), cart.subtotal(), customer),
    );
    await TestBed.configureTestingModule({
      imports: [WhatsappCheckout],
      providers: [
        provideRouter([]),
        {
          provide: EcommerceFacade,
          useValue: {
            cartItems: cart.items,
            cartTotalItems: cart.totalItems,
            cartSubtotal: cart.subtotal,
            isCartEmpty: cart.isEmpty,
            updateCartQuantity: (id: number, quantity: number) => cart.updateQuantity(id, quantity),
            removeCartProduct: (id: number) => cart.removeProduct(id),
            generateWhatsAppOrderUrl: generateUrl,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WhatsappCheckout);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function fillContact(): void {
    component.customerForm.patchValue({
      name: ' Ana Pérez ',
      phone: '987654321',
      email: 'ana@example.com',
    });
  }

  function message(): string {
    return new URL(component.whatsappUrl!).searchParams.get('text')!;
  }

  it('confirms the cart, reviews the amount and shows customer details in sequence', async () => {
    component.goToStep(2);
    expect(component.step()).toBe(0);
    fixture.nativeElement.querySelector('.step-actions .primary-button').click();
    await fixture.whenStable();
    expect(component.step()).toBe(1);
    expect(fixture.nativeElement.querySelector('.summary-total').textContent).toContain('241.00');
    fixture.nativeElement.querySelector('.step-actions .primary-button').click();
    await fixture.whenStable();
    expect(component.step()).toBe(2);
    expect(fixture.nativeElement.querySelector('#customer-phone')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.coordination-notice').textContent).toContain(
      'WhatsApp',
    );
    expect(component.whatsappUrl).toBeNull();
  });

  it('updates quantities and returns to an empty state when the last product is removed', async () => {
    component.updateQuantity(cart.items()[0], 1);
    expect(cart.subtotal()).toBe(361.5);
    component.updateQuantity(cart.items()[0], -1);
    expect(cart.subtotal()).toBe(241);
    component.removeProduct(cart.items()[0]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.checkout-empty')).not.toBeNull();
    component.goToStep(1);
    expect(component.step()).toBe(0);
    expect(component.whatsappUrl).toBeNull();
  });

  it('shows validation errors and blocks WhatsApp for invalid contact details', async () => {
    component.goToStep(1);
    component.goToStep(2);
    await fixture.whenStable();
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.field-error').length).toBe(3);
    component.customerForm.patchValue({ name: ' ', phone: '123', email: 'incorrecto' });
    expect(component.customerForm.invalid).toBe(true);
    expect(component.whatsappUrl).toBeNull();
    expect(generateUrl).not.toHaveBeenCalled();
  });

  it('requires DNI for a boleta and RUC for a factura, clearing the previous document', async () => {
    component.goToStep(1);
    component.goToStep(2);
    fillContact();
    await fixture.whenStable();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('#receipt-type');
    select.value = 'boleta';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('label[for="customer-document"]').textContent).toBe(
      'DNI',
    );
    component.customerForm.controls.document.setValue('1234567');
    expect(component.whatsappUrl).toBeNull();
    component.customerForm.controls.document.setValue('12345678');
    expect(message()).toContain('DNI: 12345678');

    select.value = 'factura';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(component.customerForm.controls.document.value).toBe('');
    expect(fixture.nativeElement.querySelector('label[for="customer-document"]').textContent).toBe(
      'RUC',
    );
    component.customerForm.controls.document.setValue('12345678');
    expect(component.whatsappUrl).toBeNull();
    component.customerForm.controls.document.setValue('20123456789');
    expect(message()).toContain('RUC: 20123456789');
    expect(message()).not.toContain('DNI:');
  });

  it('includes customer details, products, amounts and coordination in the WhatsApp draft', async () => {
    component.goToStep(1);
    component.goToStep(2);
    fillContact();
    await fixture.whenStable();
    const text = message();
    expect(text).toContain('Nombre: Ana Pérez');
    expect(text).toContain('Teléfono: 987654321');
    expect(text).toContain('Correo: ana@example.com');
    expect(text).toContain('Comprobante: Sin comprobante');
    expect(text).toContain('Mostrador');
    expect(text).toContain('Cantidad: 2');
    expect(text).toContain('241.00');
    expect(text).toContain('El envío o recojo y el pago se coordinarán por WhatsApp');
    expect(text).not.toContain('DNI:');
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector('.step-actions a');
    expect(link.href).toBe(component.whatsappUrl);
    expect(link.target).toBe('_blank');
    expect(cart.items()).toHaveLength(1);
  });

  it('preserves customer details when going back and uses updated amounts', async () => {
    component.goToStep(1);
    component.goToStep(2);
    fillContact();
    component.goToStep(1);
    component.goToStep(0);
    component.updateQuantity(cart.items()[0], 1);
    component.goToStep(1);
    component.goToStep(2);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('#customer-email').value).toBe('ana@example.com');
    expect(message()).toContain('Cantidad: 3');
    expect(message()).toContain('361.50');
  });

  it('filters typed or pasted letters in phone and documents and numbers in names', async () => {
    component.goToStep(1);
    component.goToStep(2);
    await fixture.whenStable();
    const name: HTMLInputElement = fixture.nativeElement.querySelector('#customer-name');
    name.value = 'Ana2 Pérez3';
    name.dispatchEvent(new Event('input'));
    expect(name.value).toBe('Ana Pérez');
    expect(component.customerForm.controls.name.value).toBe('Ana Pérez');
    const phone: HTMLInputElement = fixture.nativeElement.querySelector('#customer-phone');
    phone.value = '987abc6543210';
    phone.dispatchEvent(new Event('input'));
    expect(phone.value).toBe('987654321');
    expect(component.customerForm.controls.phone.value).toBe('987654321');
    const receipt: HTMLSelectElement = fixture.nativeElement.querySelector('#receipt-type');
    receipt.value = 'boleta';
    receipt.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const dni: HTMLInputElement = fixture.nativeElement.querySelector('#customer-document');
    dni.value = '1234a56789';
    dni.dispatchEvent(new Event('input'));
    expect(dni.value).toBe('12345678');
    expect(component.customerForm.controls.document.value).toBe('12345678');
  });

  it('rejects invalid values even when input filtering is bypassed', () => {
    component.goToStep(1);
    component.goToStep(2);
    fillContact();
    for (const phone of ['98765432', '9876543210', '+51987654321', '987a54321']) {
      component.customerForm.controls.phone.setValue(phone);
      expect(component.whatsappUrl).toBeNull();
    }
    fillContact();
    component.customerForm.controls.name.setValue('Ana3');
    expect(component.whatsappUrl).toBeNull();
    fillContact();
    component.customerForm.controls.receiptType.setValue('boleta');
    component.changeReceipt();
    component.customerForm.controls.document.setValue('1234567a');
    expect(component.whatsappUrl).toBeNull();
    component.customerForm.controls.receiptType.setValue('factura');
    component.changeReceipt();
    component.customerForm.controls.document.setValue('2012345678a');
    expect(component.whatsappUrl).toBeNull();
  });

  it('removes the document requirement when no receipt is selected', () => {
    component.goToStep(1);
    component.goToStep(2);
    fillContact();
    component.customerForm.controls.receiptType.setValue('factura');
    component.changeReceipt();
    expect(component.whatsappUrl).toBeNull();
    component.customerForm.controls.receiptType.setValue('none');
    component.changeReceipt();
    expect(component.customerForm.valid).toBe(true);
    expect(message()).toContain('Comprobante: Sin comprobante');
    expect(message()).not.toContain('RUC:');
  });
});
