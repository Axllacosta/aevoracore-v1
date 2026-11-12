import unittest
from datetime import date, datetime, timezone
from decimal import Decimal

from pydantic import ValidationError
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from app.api.expenses import service
from app.api.expenses.schemas import ExpenseCategoryCreate, ExpenseCreate, ExpenseResponse
from app.common.pagination import PaginationParams
from app.core.exceptions import AppException
from app.database.base import Base
from app.database.enums import EstadoVenta
from app.database.models import CategoriaGasto, Gasto, Rol, Usuario, Cliente, Venta, Inventario, MovimientoInventario


class ExpenseTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        event.listen(self.engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = Usuario(rol=Rol(nombre="ADMIN"), nombres="Ana", apellidos="Pérez", email="ana@example.com", password_hash="test")
        self.customer = Cliente(nombres="Cliente")
        self.db.add_all([self.user, self.customer])
        self.db.commit()
        self.category = service.create_category(self.db, ExpenseCategoryCreate(nombre="Luz"))
        self.other = service.create_category(self.db, ExpenseCategoryCreate(nombre="Otros"))

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def expense(self, **values):
        data = ExpenseCreate(**({"id_categoria_gasto": self.category.id_categoria_gasto, "fecha": "2026-11-08", "importe": "10.25"} | values))
        return service.save_expense(self.db, data, self.user.id_usuario)

    def sale(self, timestamp, total="100.00", status=EstadoVenta.CONFIRMADA):
        self.db.add(Venta(id_cliente=self.customer.id_cliente, id_usuario=self.user.id_usuario,
                          canal_venta="PRESENCIAL", estado=status, fecha_hora=datetime.fromisoformat(timestamp),
                          subtotal=Decimal(total), descuento_total=Decimal("0.00"), total=Decimal(total)))
        self.db.commit()

    def test_other_requires_description_on_create_and_edit(self):
        with self.assertRaises(AppException) as error:
            self.expense(id_categoria_gasto=self.other.id_categoria_gasto, descripcion="  ")
        self.assertEqual(error.exception.code, "EXPENSE_DESCRIPTION_REQUIRED")
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Gasto)), 0)
        expense = self.expense(id_categoria_gasto=self.other.id_categoria_gasto, descripcion="  Reparación urgente  ")
        self.assertEqual(ExpenseResponse.model_validate(expense).descripcion, "Reparación urgente")
        with self.assertRaises(AppException):
            service.save_expense(self.db, ExpenseCreate(id_categoria_gasto=self.other.id_categoria_gasto,
                fecha=expense.fecha, importe="20.00", descripcion=""), self.user.id_usuario, expense.id_gasto)
        self.assertEqual(expense.importe, Decimal("10.25"))
        self.assertEqual(expense.descripcion, "Reparación urgente")

    def test_edit_revalidates_changed_category_and_normal_categories_allow_blank(self):
        expense = self.expense(descripcion="  ")
        self.assertIsNone(expense.descripcion)
        with self.assertRaises(AppException):
            service.save_expense(self.db, ExpenseCreate(id_categoria_gasto=self.other.id_categoria_gasto,
                fecha=expense.fecha, importe="20.00"), self.user.id_usuario, expense.id_gasto)
        updated = service.save_expense(self.db, ExpenseCreate(id_categoria_gasto=self.other.id_categoria_gasto,
            fecha="2026-10-30", importe="20.00", descripcion="Incidencia"), self.user.id_usuario, expense.id_gasto)
        self.assertEqual(updated.categoria.nombre, "OTROS")
        self.assertEqual(service.monthly_summary(self.db, 2026, 11).gastos, Decimal("0.00"))
        self.assertEqual(service.monthly_summary(self.db, 2026, 10).gastos, Decimal("20.00"))

    def test_cancel_preserves_record_and_excludes_it_from_kpi(self):
        expense = self.expense()
        service.cancel_expense(self.db, expense.id_gasto)
        summary = service.monthly_summary(self.db, 2026, 11)
        self.assertEqual(summary.gastos, Decimal("0.00"))
        self.assertEqual(summary.cantidad_gastos, 0)
        self.assertEqual(summary.por_categoria, [])
        page = service.list_expenses(self.db, 2026, 11, PaginationParams())
        self.assertEqual(page.total, 1)
        self.assertFalse(page.items[0].activo)
        with self.assertRaises(AppException):
            service.save_expense(self.db, ExpenseCreate(id_categoria_gasto=self.category.id_categoria_gasto,
                fecha="2026-11-08", importe="20"), self.user.id_usuario, expense.id_gasto)

    def test_summary_uses_lima_month_full_data_and_excludes_cancelled_sales(self):
        self.sale("2026-11-01T04:59:59+00:00", "999")  # October in Lima.
        self.sale("2026-11-01T05:00:00+00:00", "100")
        self.sale("2026-12-01T04:59:59+00:00", "200")  # November in Lima.
        self.sale("2026-12-01T05:00:00+00:00", "999")
        self.sale("2026-11-08T12:00:00+00:00", "999", EstadoVenta.CANCELADA)
        for _ in range(105):
            self.db.add(Gasto(id_categoria_gasto=self.category.id_categoria_gasto, id_usuario=self.user.id_usuario,
                              fecha=date(2026, 11, 8), importe=Decimal("0.10")))
        self.db.commit()
        self.expense(fecha="2026-10-31", importe="999")
        self.expense(fecha="2026-12-01", importe="999")
        summary = service.monthly_summary(self.db, 2026, 11)
        self.assertEqual(summary.ventas_confirmadas, Decimal("300.00"))
        self.assertEqual(summary.gastos, Decimal("10.50"))
        self.assertEqual(summary.resultado_estimado, Decimal("289.50"))
        self.assertEqual(summary.cantidad_gastos, 105)
        self.assertEqual(summary.por_categoria[0].total, Decimal("10.50"))
        self.assertEqual(len(service.list_expenses(self.db, 2026, 11, PaginationParams()).items), 20)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(Inventario)), 0)
        self.assertEqual(self.db.scalar(select(func.count()).select_from(MovimientoInventario)), 0)

    def test_missing_category_and_expense_are_rejected(self):
        with self.assertRaises(AppException) as error:
            self.expense(id_categoria_gasto=999)
        self.assertEqual(error.exception.code, "EXPENSE_CATEGORY_NOT_FOUND")
        with self.assertRaises(AppException) as error:
            service.cancel_expense(self.db, 999)
        self.assertEqual(error.exception.code, "EXPENSE_NOT_FOUND")

    def test_categories_are_normalized_and_duplicates_rejected(self):
        with self.assertRaises(AppException):
            service.create_category(self.db, ExpenseCategoryCreate(nombre="  luz  "))
        self.assertTrue(self.other.requiere_descripcion)
        self.assertEqual(len(service.list_categories(self.db)), 2)

    def test_empty_month_and_december_boundaries(self):
        summary = service.monthly_summary(self.db, 2026, 12)
        self.assertEqual(summary.resultado_estimado, Decimal("0.00"))
        self.assertEqual(service.month_bounds(2026, 12), (date(2026, 12, 1), date(2027, 1, 1)))

    def test_invalid_amounts_dates_and_blank_category_names_are_rejected(self):
        for amount in ("0", "-1", "1.001", "NaN", "Infinity"):
            with self.subTest(amount=amount), self.assertRaises(ValidationError):
                ExpenseCreate(id_categoria_gasto=1, fecha="2026-11-08", importe=amount)
        with self.assertRaises(ValidationError):
            ExpenseCategoryCreate(nombre="   ")
        with self.assertRaises(ValidationError):
            ExpenseCreate(id_categoria_gasto=1, fecha="2026-02-30", importe="10")
