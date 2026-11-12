import { Injectable, inject, computed, signal } from '@angular/core';
import { FormArray, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { ProductsApiService } from '../../../core/api/products-api.service';
import { CustomersApiService } from '../../../core/api/customers-api.service';
import { SalesApiService } from '../../../core/api/sales-api.service';
import { InventoryApiService } from '../../../core/api/inventory-api.service';
import { ProductResponse } from '../../../core/models/product.model';
import { CustomerResponse } from '../../../core/models/customer.model';
import {
  SaleResponse,
  SaleCreate,
  CanalVenta,
  MedioPago,
  TipoComprobante,
} from '../../../core/models/sale.model';
import { ListState } from '../../../core/state/list-state';
import { OperationState } from '../../../core/state/operation-state';
import { allPages } from '../../../core/api/all-pages';
import { errorMessage } from '../../../core/api/api-error';
import { previewTotals, previewLine } from '../utils/sale-calculations';
function lineGroup(product: ProductResponse, fb: FormBuilder) {
  return fb.nonNullable.group(
    {
      product: [product],
      cantidad: [1, [Validators.required, Validators.min(1), Validators.pattern(/^\d+$/)]],
      tipo_descuento: fb.nonNullable.control<'PORCENTAJE' | 'IMPORTE'>(
        'PORCENTAJE',
        Validators.required,
      ),
      descuento: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.max(9999999999.99),
          Validators.pattern(/^\d+(\.\d{1,2})?$/),
        ],
      ],
    },
    {
      validators: (control) => {
        const value = control.getRawValue();
        const maximum =
          value.tipo_descuento === 'PORCENTAJE'
            ? 100
            : Number(value.product.precio_base) * value.cantidad;
        return value.descuento > maximum ? { discountLimit: true } : null;
      },
    },
  );
}
function paymentGroup(fb: FormBuilder) {
  return fb.nonNullable.group({
    medio_pago: fb.nonNullable.control<MedioPago>('EFECTIVO', Validators.required),
    importe: [
      0,
      [
        Validators.required,
        Validators.min(0.01),
        Validators.max(9999999999.99),
        Validators.pattern(/^\d+(\.\d{1,2})?$/),
      ],
    ],
  });
}
@Injectable()
export class PosFacade {
  private readonly products = inject(ProductsApiService);
  private readonly customersApi = inject(CustomersApiService);
  private readonly sales = inject(SalesApiService);
  private readonly inventory = inject(InventoryApiService);
  private readonly fb = inject(FormBuilder);
  readonly catalog = new ListState<ProductResponse>((query) =>
    this.products.list({ ...query, activo: true }),
  );
  private readonly messages = inject(MessageService);
  readonly operation = new OperationState(this.messages);
  readonly customers = signal<CustomerResponse[]>([]);
  readonly customerError = signal('');
  readonly loadingCustomers = signal(false);
  readonly result = signal<SaleResponse | null>(null);
  readonly stocks = signal<Record<number, number>>({});
  readonly stockError = signal('');
  readonly lines = new FormArray<ReturnType<typeof lineGroup>>([]);
  readonly payments = new FormArray([paymentGroup(this.fb)]);
  readonly form = this.fb.group({
    tipo_comprobante: this.fb.nonNullable.control<TipoComprobante>('BOLETA', Validators.required),
    id_cliente: this.fb.control<number | null>(null, Validators.required),
    canal_venta: this.fb.nonNullable.control<CanalVenta>('PRESENCIAL', Validators.required),
    pagos: this.payments,
    detalles: this.lines,
  });
  private readonly changes = toSignal(this.lines.valueChanges, { initialValue: [] });
  private readonly paymentChanges = toSignal(this.payments.valueChanges, { initialValue: [] });
  readonly paid = computed(() => {
    this.paymentChanges();
    return this.payments
      .getRawValue()
      .reduce(
        (sum, payment) =>
          sum + (Number.isFinite(payment.importe) ? Math.round(payment.importe * 100) : 0),
        0,
      );
  });
  readonly paymentBalance = computed(() => this.totals().total - this.paid());
  readonly paymentReady = computed(() => {
    this.paymentChanges();
    return (
      this.payments.length > 0 &&
      this.payments.valid &&
      this.totals().total > 0 &&
      this.paymentBalance() === 0
    );
  });
  readonly totals = computed(() => {
    this.changes();
    return previewTotals(
      this.lines.getRawValue().map((line) => ({
        price: line.product.precio_base,
        quantity: line.cantidad || 0,
        discount: line.descuento || 0,
        discountType: line.tipo_descuento,
      })),
    );
  });
  readonly customerOptions = computed(() =>
    this.customers().map((c) => ({
      label:
        `${c.razon_social || [c.nombres, c.apellidos].filter(Boolean).join(' ')} · ${c.ruc || c.dni || ''} (#${c.id_cliente})`.trim(),
      value: c.id_cliente,
    })),
  );
  constructor() {
    void this.catalog.load({}, 1, 12);
    void this.loadCustomers();
    void this.loadStocks();
  }
  addPayment() {
    if (!this.operation.saving() && this.payments.length < 100)
      this.payments.push(paymentGroup(this.fb));
  }
  removePayment(index: number) {
    if (!this.operation.saving() && this.payments.length > 1) this.payments.removeAt(index);
  }
  completePayment(index: number) {
    if (this.operation.saving()) return;
    const other = this.payments
      .getRawValue()
      .reduce((sum, p, i) => sum + (i === index ? 0 : Math.round(p.importe * 100)), 0);
    this.payments
      .at(index)
      .controls.importe.setValue(Math.max(0, this.totals().total - other) / 100);
  }
  async loadCustomers() {
    this.loadingCustomers.set(true);
    this.customerError.set('');
    try {
      this.customers.set(
        await allPages((page) => this.customersApi.list({ activo: true, page, page_size: 100 })),
      );
    } catch (e) {
      this.customerError.set(errorMessage(e));
    } finally {
      this.loadingCustomers.set(false);
    }
  }
  async loadStocks() {
    this.stockError.set('');
    try {
      const rows = await allPages((page) => this.inventory.list({ page, page_size: 100 }));
      this.stocks.set(Object.fromEntries(rows.map((row) => [row.id_producto, row.stock_actual])));
    } catch (e) {
      this.stockError.set(errorMessage(e));
    }
  }
  add(product: ProductResponse) {
    if (this.operation.saving()) return;
    const existing = this.lines.controls.find(
      (line) => line.controls.product.value.id_producto === product.id_producto,
    );
    if (existing) existing.controls.cantidad.setValue(existing.controls.cantidad.value + 1);
    else if (this.lines.length < 100) this.lines.push(lineGroup(product, this.fb));
    this.operation.error.set('');
  }
  remove(index: number) {
    if (!this.operation.saving()) this.lines.removeAt(index);
  }
  resetDiscount(index: number) {
    this.lines.at(index).controls.descuento.setValue(0);
  }
  lineTotal(index: number) {
    const line = this.lines.at(index).getRawValue();
    return (
      previewLine({
        price: line.product.precio_base,
        quantity: line.cantidad || 0,
        discount: line.descuento || 0,
        discountType: line.tipo_descuento,
      }).total / 100
    );
  }
  validatePreparation() {
    const { id_cliente, tipo_comprobante, canal_venta } = this.form.controls;
    for (const control of [id_cliente, tipo_comprobante, canal_venta, this.lines])
      control.markAllAsTouched();
    this.operation.error.set('');
    if (
      id_cliente.invalid ||
      tipo_comprobante.invalid ||
      canal_venta.invalid ||
      this.lines.invalid ||
      !this.lines.length
    ) {
      this.operation.error.set(
        'Revisa el cliente, las cantidades y los descuentos. El descuento no puede superar el 100% o el subtotal de la línea; usa hasta dos decimales.',
      );
      return false;
    }
    if (tipo_comprobante.value === 'FACTURA') {
      const customer = this.customers().find((item) => item.id_cliente === id_cliente.value);
      if (!customer?.ruc?.trim()) {
        this.messages.add({
          severity: 'warn',
          summary: 'Cliente sin RUC',
          detail:
            'Para generar una factura, selecciona un cliente que tenga RUC o agrega el RUC al cliente actual para continuar con la operación.',
        });
        return false;
      }
    }
    for (const line of this.lines.getRawValue()) {
      const stock = this.stocks()[line.product.id_producto];
      if (line.product.controlar_stock && stock !== undefined && line.cantidad > stock) {
        this.operation.error.set(
          `Stock insuficiente para ${line.product.nombre}: disponible ${stock}. Actualiza las existencias para comprobar cambios recientes.`,
        );
        return false;
      }
    }
    if (this.totals().total <= 0) {
      this.operation.error.set(
        'El total de la venta debe ser mayor a cero. Revisa los descuentos.',
      );
      return false;
    }
    return true;
  }
  validate() {
    if (!this.validatePreparation()) return false;
    this.payments.markAllAsTouched();
    if (!this.paymentReady()) {
      this.operation.error.set(
        'Los pagos deben sumar exactamente el total de la venta. Completa o corrige los importes.',
      );
      return false;
    }
    return true;
  }
  async confirm() {
    if (this.operation.saving() || !this.validate()) return;
    const values = this.form.getRawValue();
    const customer = values.id_cliente;
    if (customer === null) return;
    const payload: SaleCreate = {
      tipo_comprobante: values.tipo_comprobante,
      id_cliente: customer,
      canal_venta: values.canal_venta,
      pagos: values.pagos.map((p) => ({
        medio_pago: p.medio_pago,
        importe: p.importe.toFixed(2),
      })),
      detalles: this.lines.getRawValue().map((line) => ({
        id_producto: line.product.id_producto,
        cantidad: line.cantidad,
        ...(line.tipo_descuento === 'IMPORTE'
          ? { descuento_importe: line.descuento.toFixed(2) }
          : { descuento_porcentaje: line.descuento }),
      })),
    };
    const signature = JSON.stringify(payload);
    if (this.lastSignature !== signature) {
      this.lastSignature = signature;
      this.requestKey = crypto.randomUUID();
    }
    const result = await this.operation.run(
      () => this.sales.create({ ...payload, clave_idempotencia: this.requestKey }),
      'Venta confirmada',
      async (result) => {
        await this.loadStocks();
        this.result.set(result);
        this.lastSignature = '';
        this.lines.clear();
        this.payments.clear();
        this.payments.push(paymentGroup(this.fb));
        this.form.controls.id_cliente.reset(null);
      },
    );
    if (result) {
      this.operation.error.set('');
    } else if (this.operation.error().includes('conectar')) {
      this.operation.error.update(
        (message) =>
          message +
          ' Antes de volver a confirmar, revisa el historial para comprobar si se registró la operación.',
      );
    }
  }
  clear() {
    if (this.operation.saving()) return;
    this.lines.clear();
    this.operation.error.set('');
  }
  newSale() {
    if (this.operation.saving()) return;
    this.result.set(null);
    this.lines.clear();
    this.payments.clear();
    this.payments.push(paymentGroup(this.fb));
    this.form.reset({
      id_cliente: null,
      tipo_comprobante: 'BOLETA',
      canal_venta: 'PRESENCIAL',
      pagos: [{ medio_pago: 'EFECTIVO', importe: 0 }],
      detalles: [],
    });
    this.operation.error.set('');
    this.lastSignature = '';
    this.requestKey = '';
  }
  private lastSignature = '';
  private requestKey = '';
}
