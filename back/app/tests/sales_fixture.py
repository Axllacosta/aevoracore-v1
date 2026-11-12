from decimal import Decimal
from unittest import TestCase

from sqlalchemy import create_engine, event, func, select
from sqlalchemy.orm import Session

from app.api.sales.schemas import SaleCreate
from app.database.base import Base
from app.database.models import Categoria, Cliente, Inventario, Producto, Rol, Usuario


class SaleTestCase(TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}
        )
        event.listen(self.engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        role = Rol(nombre="ADMIN")
        self.user = Usuario(rol=role, nombres="Ana", apellidos="Pérez", email="ana@example.com", password_hash="test")
        self.customer = Cliente(nombres="Cliente", dni="12345678")
        category = Categoria(nombre="Muebles")
        self.product = Producto(categoria=category, sku="MESA", nombre="Mesa", precio_base=Decimal("10.00"))
        self.other = Producto(categoria=category, sku="SILLA", nombre="Silla", precio_base=Decimal("10.00"))
        self.db.add_all([self.user, self.customer, self.product, self.other])
        self.db.flush()
        self.inventory = Inventario(id_producto=self.product.id_producto, stock_actual=1)
        self.db.add(self.inventory)
        self.db.commit()
        self.user_id = self.user.id_usuario
        self.customer_id = self.customer.id_cliente
        self.product_id = self.product.id_producto
        self.other_id = self.other.id_producto

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def payload(self, quantity=1, amounts=("10.00",), details=None):
        return SaleCreate(
            id_cliente=self.customer_id, canal_venta="PRESENCIAL",
            pagos=[{"medio_pago": "EFECTIVO" if i == 0 else "YAPE", "importe": amount} for i, amount in enumerate(amounts)],
            detalles=details or [{"id_producto": self.product_id, "cantidad": quantity}],
        )

    def count(self, model):
        return self.db.scalar(select(func.count()).select_from(model))
