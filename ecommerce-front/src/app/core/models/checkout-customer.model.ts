export interface CheckoutCustomer {
  name: string;
  phone: string;
  email: string;
  receiptType: 'none' | 'boleta' | 'factura';
  document: string;
}
