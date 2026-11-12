import unittest
from decimal import Decimal
from unittest.mock import patch

from pydantic import ValidationError
from sqlalchemy import select

from app.api.sales import service
from app.api.sales.schemas import PaymentCreate, SaleCreate, SaleCancelRequest, SaleResponse, SaleDetailCreate
from app.api.inventory.operations import apply_inventory_movement
from app.core.exceptions import AppException
from app.database.enums import TipoMovimiento, EstadoPago
from app.database.models import (
    Inventario, MovimientoInventario, Venta, Pago,
)

from app.tests.sales_fixture import SaleTestCase


class SaleStorageTests(SaleTestCase):
    def test_controlled_stock_rejects_sale_and_rolls_back_everything(self):
        with self.assertRaises(AppException) as error:
            service.create_sale(self.db, self.payload(2, ("20.00",)), self.user)
        self.assertEqual(error.exception.code, "INSUFFICIENT_STOCK")
        self.assertEqual(self.inventory.stock_actual, 1)
        self.assertEqual(self.count(Venta), 0)
        self.assertEqual(self.count(Pago), 0)
        self.assertEqual(self.count(MovimientoInventario), 0)

    def test_unrestricted_sale_multiple_payments_kardex_and_cancellation(self):
        self.product.controlar_stock = False
        self.db.commit()
        sale = service.create_sale(self.db, self.payload(3, ("12.50", "17.50")), self.user)
        sale_id = sale.id_venta
        self.assertEqual(self.inventory.stock_actual, -2)
        movement = self.db.scalar(select(MovimientoInventario))
        self.assertEqual((movement.stock_anterior, movement.stock_posterior), (1, -2))
        self.assertIsNotNone(movement.id_detalle_venta)
        self.db.expire_all()
        response = SaleResponse.model_validate(service.get_sale(self.db, sale_id))
        self.assertEqual(len(response.pagos), 2)
        self.assertEqual(sum(p.importe for p in response.pagos), response.total)
        service.cancel_sale(self.db, sale_id, SaleCancelRequest(motivo_cancelacion="Error de venta"), self.user)
        self.assertEqual(self.inventory.stock_actual, 1)
        self.assertTrue(all(p.estado == EstadoPago.REVERTIDO for p in sale.pagos))
        self.assertEqual(self.count(MovimientoInventario), 2)
        with self.assertRaises(AppException):
            service.cancel_sale(self.db, sale_id, SaleCancelRequest(motivo_cancelacion="Reintento"), self.user)
        self.assertEqual(self.inventory.stock_actual, 1)
        self.assertEqual(self.count(MovimientoInventario), 2)

    def test_payment_shortfall_and_overpayment_do_not_create_sale(self):
        for amounts in (("9.99",), ("10.01",), ("4.00", "5.00"), ("5.00", "6.00")):
            with self.subTest(amounts=amounts), self.assertRaises(AppException) as error:
                service.create_sale(self.db, self.payload(amounts=amounts), self.user)
            self.assertEqual(error.exception.code, "SALE_PAYMENTS_TOTAL_MISMATCH")
            self.assertEqual(self.count(Venta), 0)
            self.assertEqual(self.count(Pago), 0)
            self.assertEqual(self.inventory.stock_actual, 1)

    def test_later_product_failure_rolls_back_earlier_stock_movement(self):
        details = [{"id_producto": self.product_id, "cantidad": 1}, {"id_producto": self.other_id, "cantidad": 1}]
        with self.assertRaises(AppException):
            service.create_sale(self.db, self.payload(amounts=("20.00",), details=details), self.user)
        self.assertEqual(self.inventory.stock_actual, 1)
        self.assertEqual(self.count(MovimientoInventario), 0)
        self.assertEqual(self.count(Venta), 0)

    def test_payment_failure_rolls_back_stock_sale_and_previous_payment(self):
        original = service.repository.create_payment
        def fail_second(db, payment):
            if payment.medio_pago == "YAPE":
                raise RuntimeError("Simulated storage failure")
            return original(db, payment)
        with patch.object(service.repository, "create_payment", side_effect=fail_second):
            with self.assertRaises(RuntimeError):
                service.create_sale(self.db, self.payload(amounts=("5.00", "5.00")), self.user)
        self.assertEqual(self.inventory.stock_actual, 1)
        self.assertEqual(self.count(Venta), 0)
        self.assertEqual(self.count(Pago), 0)
        self.assertEqual(self.count(MovimientoInventario), 0)

    def test_entries_recover_negative_balance_and_manual_exit_is_rejected(self):
        self.product.controlar_stock = False
        self.db.commit()
        service.create_sale(self.db, self.payload(4, ("40.00",)), self.user)
        self.product.controlar_stock = True
        self.db.commit()
        apply_inventory_movement(self.db, product_id=self.product_id, user_id=self.user_id,
                                 movement_type=TipoMovimiento.ENTRADA, quantity=1, reason="Reposición")
        self.db.commit()
        self.assertEqual(self.inventory.stock_actual, -2)
        with self.assertRaises(AppException):
            service.create_sale(self.db, self.payload(), self.user)
        self.product.controlar_stock = False
        self.db.commit()
        with self.assertRaises(AppException):
            apply_inventory_movement(self.db, product_id=self.product_id, user_id=self.user_id,
                                     movement_type=TipoMovimiento.SALIDA, quantity=1, reason="Salida manual")
        self.db.rollback()
        self.assertEqual(self.inventory.stock_actual, -2)

    def test_inactive_product_cannot_be_sold_even_without_stock_control(self):
        self.product.controlar_stock = False
        self.product.activo = False
        self.db.commit()
        with self.assertRaises(AppException) as error:
            service.create_sale(self.db, self.payload(), self.user)
        self.assertEqual(error.exception.code, "PRODUCT_INACTIVE")

    def test_amount_discount_is_applied_once_to_the_product_line(self):
        self.inventory.stock_actual = 5
        self.db.commit()
        sale = service.create_sale(self.db, self.payload(amounts=("25.00",), details=[
            {"id_producto": self.product_id, "cantidad": 3, "descuento_importe": "5.00"},
        ]), self.user)
        self.assertEqual(sale.subtotal, Decimal("30.00"))
        self.assertEqual(sale.descuento_total, Decimal("5.00"))
        self.assertEqual(sale.total, Decimal("25.00"))
        detail = sale.detalles[0]
        self.assertIsNone(detail.descuento_porcentaje)
        self.assertEqual(detail.descuento_importe, Decimal("5.00"))
        self.assertEqual(detail.total_linea, Decimal("25.00"))
        response = SaleResponse.model_validate(sale).model_dump()
        self.assertNotIn("descuento_porcentaje", response["detalles"][0])
        self.assertEqual(response["detalles"][0]["descuento_importe"], Decimal("5.00"))

    def test_percentage_is_converted_to_amount_with_half_up_rounding(self):
        self.product.precio_base = Decimal("19.99")
        self.inventory.stock_actual = 5
        self.db.commit()
        sale = service.create_sale(self.db, self.payload(amounts=("52.47",), details=[
            {"id_producto": self.product_id, "cantidad": 3, "descuento_porcentaje": "12.50"},
        ]), self.user)
        self.assertEqual(sale.descuento_total, Decimal("7.50"))
        self.assertEqual(sale.total, Decimal("52.47"))
        self.assertIsNone(sale.detalles[0].descuento_porcentaje)
        self.assertEqual(service._calculate_detail(Decimal("0.10"), 1, Decimal("5"))["descuento_importe"], Decimal("0.01"))

    def test_excessive_amount_and_incorrect_payments_leave_no_sale(self):
        for discount, payment, code in (("10.01", "1.00", "INVALID_DETAIL_DISCOUNT"),
                                         ("1.00", "10.00", "SALE_PAYMENTS_TOTAL_MISMATCH")):
            with self.subTest(discount=discount), self.assertRaises(AppException) as error:
                service.create_sale(self.db, self.payload(amounts=(payment,), details=[
                    {"id_producto": self.product_id, "cantidad": 1, "descuento_importe": discount},
                ]), self.user)
            self.assertEqual(error.exception.code, code)
            self.assertEqual(self.count(Venta), 0)
            self.assertEqual(self.inventory.stock_actual, 1)

    def test_both_discount_modes_can_be_used_in_the_same_sale(self):
        self.db.add(Inventario(id_producto=self.other_id, stock_actual=1))
        self.db.commit()
        sale = service.create_sale(self.db, self.payload(amounts=("15.00",), details=[
            {"id_producto": self.product_id, "cantidad": 1, "descuento_importe": "2.00"},
            {"id_producto": self.other_id, "cantidad": 1, "descuento_porcentaje": "30.00"},
        ]), self.user)
        self.assertEqual(sale.descuento_total, Decimal("5.00"))
        self.assertEqual(sale.total, Decimal("15.00"))


class DiscountValidationTests(unittest.TestCase):
    def test_two_discount_modes_cannot_be_submitted_for_one_line(self):
        for percentage, amount in (("10", "1"), ("0", "0")):
            with self.subTest(percentage=percentage), self.assertRaises(ValidationError):
                SaleDetailCreate(id_producto=1, cantidad=1, descuento_porcentaje=percentage, descuento_importe=amount)

    def test_discounts_reject_negative_nonfinite_and_overprecise_values(self):
        for field in ("descuento_importe", "descuento_porcentaje"):
            for value in ("-1", "NaN", "Infinity", "1.001"):
                with self.subTest(field=field, value=value), self.assertRaises(ValidationError):
                    SaleDetailCreate(id_producto=1, cantidad=1, **{field: value})
        with self.assertRaises(ValidationError):
            SaleDetailCreate(id_producto=1, cantidad=1, descuento_porcentaje="100.01")


class PaymentValidationTests(unittest.TestCase):
    def test_payment_requires_positive_finite_amount_with_two_decimal_places(self):
        for amount in ("0", "-1", "1.001", "NaN", "Infinity"):
            with self.subTest(amount=amount), self.assertRaises(ValidationError):
                PaymentCreate(medio_pago="EFECTIVO", importe=amount)

    def test_payment_list_cannot_be_empty(self):
        with self.assertRaises(ValidationError):
            SaleCreate(id_cliente=1, canal_venta="PRESENCIAL", pagos=[], detalles=[{"id_producto": 1, "cantidad": 1}])
