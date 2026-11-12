import unittest
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from app.api.dashboard.service import get_dashboard
from app.database.base import Base
from app.database.models import Categoria, CategoriaGasto, Cliente, DetalleVenta, Gasto, Pago, Producto, Rol, Usuario, Venta

NOW = datetime.fromisoformat("2026-11-08T18:00:00+00:00")


class DashboardTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        event.listen(self.engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.user = Usuario(rol=Rol(nombre="ADMIN"), nombres="Ana", apellidos="Pérez", email="ana@example.com", password_hash="test")
        self.customer = Cliente(nombres="Cliente")
        category = Categoria(nombre="Muebles")
        self.table = Producto(categoria=category, sku="MESA", nombre="Mesa", precio_base=Decimal("10"))
        self.chair = Producto(categoria=category, sku="SILLA", nombre="Silla", precio_base=Decimal("10"))
        self.expense_category = CategoriaGasto(nombre="LUZ")
        self.db.add_all([self.user, self.customer, self.table, self.chair, self.expense_category])
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def sale(self, timestamp="2026-11-08T18:00:00+00:00", quantity=1, product=None, channel="PRESENCIAL", status="CONFIRMADA", split_payment=False):
        total = Decimal("10.00") * quantity
        sale = Venta(id_cliente=self.customer.id_cliente, id_usuario=self.user.id_usuario,
                     canal_venta=channel, estado=status, fecha_hora=datetime.fromisoformat(timestamp),
                     subtotal=total, descuento_total=Decimal("0.00"), total=total)
        sale.detalles.append(DetalleVenta(producto=product or self.table, cantidad=quantity,
                            precio_unitario_base=Decimal("10.00"), subtotal_linea=total, descuento_importe=Decimal("0"), total_linea=total))
        for method in (["EFECTIVO", "YAPE"] if split_payment else ["EFECTIVO"]):
            sale.pagos.append(Pago(medio_pago=method, importe=total / (2 if split_payment else 1)))
        self.db.add(sale)
        self.db.commit()
        return sale

    def expense(self, day="2026-11-08", amount="3.00", active=True):
        self.db.add(Gasto(id_categoria_gasto=self.expense_category.id_categoria_gasto,
                         id_usuario=self.user.id_usuario, fecha=date.fromisoformat(day), importe=Decimal(amount), activo=active))
        self.db.commit()

    def test_empty_dashboard_has_zero_kpis_two_channels_and_six_months(self):
        data = get_dashboard(self.db, NOW)
        self.assertEqual(data.kpis.ventas_totales, 0)
        self.assertEqual(data.kpis.productos_vendidos, 0)
        self.assertEqual(data.kpis.balance, Decimal("0.00"))
        self.assertEqual(len(data.canales), 2)
        self.assertTrue(all(channel.porcentaje == 0 for channel in data.canales))
        self.assertEqual(len(data.balance_mensual), 6)
        self.assertEqual([(month.anio, month.mes) for month in data.balance_mensual], [(2026, m) for m in range(6, 12)])
        self.assertEqual(data.productos_mas_vendidos, [])

    def test_kpis_count_all_sales_and_units_without_duplicating_split_payments(self):
        for _ in range(105):
            self.sale(quantity=2, split_payment=True)
        self.expense(amount="100.50")
        self.expense(amount="999", active=False)
        self.sale(quantity=99, status="CANCELADA")
        data = get_dashboard(self.db, NOW)
        self.assertEqual(data.kpis.ventas_totales, 105)
        self.assertEqual(data.kpis.productos_vendidos, 210)
        self.assertEqual(data.kpis.ingresos, Decimal("2100.00"))
        self.assertEqual(data.kpis.egresos, Decimal("100.50"))
        self.assertEqual(data.kpis.balance, Decimal("1999.50"))
        self.assertEqual(data.productos_mas_vendidos[0].unidades_vendidas, 210)
        self.assertEqual(data.balance_mensual[-1].balance, data.kpis.balance)

    def test_current_month_uses_peru_boundaries_for_all_indicators(self):
        self.sale("2026-11-01T04:59:59+00:00", quantity=50)
        self.sale("2026-11-01T05:00:00+00:00", quantity=2)
        self.sale("2026-12-01T04:59:59+00:00", quantity=3)
        self.sale("2026-12-01T05:00:00+00:00", quantity=100)
        self.expense(day="2026-10-31", amount="900")
        self.expense(day="2026-11-01", amount="5")
        self.expense(day="2026-11-30", amount="8")
        self.expense(day="2026-12-01", amount="900")
        data = get_dashboard(self.db, NOW)
        self.assertEqual(data.kpis.ventas_totales, 2)
        self.assertEqual(data.kpis.productos_vendidos, 5)
        self.assertEqual(data.kpis.ingresos, Decimal("50.00"))
        self.assertEqual(data.kpis.egresos, Decimal("13.00"))

    def test_channel_amounts_and_percentages_reconcile_to_current_revenue(self):
        self.sale(channel="WHATSAPP", quantity=1)
        self.sale(channel="PRESENCIAL", quantity=2)
        self.sale(channel="WHATSAPP", quantity=10, status="CANCELADA")
        self.sale("2026-10-08T18:00:00+00:00", channel="WHATSAPP", quantity=10)
        data = get_dashboard(self.db, NOW)
        channels = {channel.canal_venta: channel for channel in data.canales}
        self.assertEqual(channels["WHATSAPP"].importe, Decimal("10.00"))
        self.assertEqual(channels["WHATSAPP"].porcentaje, Decimal("33.33"))
        self.assertEqual(channels["PRESENCIAL"].porcentaje, Decimal("66.67"))
        self.assertEqual(sum(c.porcentaje for c in data.canales), Decimal("100.00"))
        self.assertEqual(sum(c.importe for c in data.canales), data.kpis.ingresos)

    def test_top_products_use_three_calendar_months_and_rank_by_units(self):
        self.sale("2026-09-01T04:59:59+00:00", quantity=100)
        self.sale("2026-09-01T05:00:00+00:00", quantity=4, product=self.chair)
        self.sale("2026-10-08T18:00:00+00:00", quantity=3, product=self.chair)
        for _ in range(3):
            self.sale(quantity=1, product=self.table)
        self.sale(quantity=100, product=self.table, status="CANCELADA")
        self.chair.activo = False
        self.db.commit()
        data = get_dashboard(self.db, NOW)
        self.assertEqual(data.ranking_desde, date(2026, 9, 1))
        self.assertEqual(data.ranking_hasta, date(2026, 11, 30))
        self.assertEqual([p.sku for p in data.productos_mas_vendidos], ["SILLA", "MESA"])
        self.assertEqual([p.unidades_vendidas for p in data.productos_mas_vendidos], [7, 3])

    def test_monthly_balance_fills_missing_months_and_supports_negative_balance(self):
        self.sale("2026-06-01T04:59:59+00:00", quantity=100)
        self.sale("2026-06-01T05:00:00+00:00", quantity=5)
        self.expense(day="2026-06-30", amount="60")
        self.expense(day="2026-08-01", amount="12.50")
        self.sale(quantity=2)
        self.expense(amount="5")
        data = get_dashboard(self.db, NOW)
        self.assertEqual([m.balance for m in data.balance_mensual], list(map(Decimal, ["-10", "0", "-12.50", "0", "0", "15"])))

    def test_year_rollover_and_current_month_are_determined_in_lima(self):
        data = get_dashboard(self.db, datetime.fromisoformat("2027-01-01T04:59:59+00:00"))
        self.assertEqual((data.anio, data.mes), (2026, 12))
        data = get_dashboard(self.db, datetime.fromisoformat("2027-01-01T05:00:00+00:00"))
        self.assertEqual((data.anio, data.mes), (2027, 1))
        self.assertEqual(data.ranking_desde, date(2026, 11, 1))
        self.assertEqual([(m.anio, m.mes) for m in data.balance_mensual], [(2026, m) for m in range(8, 13)] + [(2027, 1)])
