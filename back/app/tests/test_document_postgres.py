import os
import unittest
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.schema import CreateSchema, DropSchema

from app.api.sales import documents, service
from app.api.sales.schemas import SaleCreate
from app.core.config import settings
from app.database.base import Base
from app.database.models import Categoria, Cliente, Producto, Rol, Usuario, Venta
from app.database.models.document import Comprobante


@unittest.skipUnless(os.environ.get("RUN_DOCUMENT_POSTGRES_TESTS") == "1", "Requires running PostgreSQL and explicit opt-in")
class PostgresDocumentConcurrencyTests(unittest.TestCase):
    def setUp(self):
        self.schema = "pdf_test_" + uuid4().hex
        self.admin = create_engine(settings.DATABASE_URL, connect_args={"connect_timeout": 5})
        with self.admin.begin() as connection:
            connection.execute(CreateSchema(self.schema))
        self.engine = create_engine(settings.DATABASE_URL, connect_args={"options": f"-csearch_path={self.schema}", "connect_timeout": 5})
        self.addCleanup(self.cleanup_schema)
        Base.metadata.create_all(self.engine)
        with Session(self.engine) as db:
            user = Usuario(rol=Rol(nombre="ADMIN"), nombres="Ana", apellidos="Pérez", email="qa@example.com", password_hash="test")
            customer = Cliente(nombres="Ana", apellidos="Pérez", dni="12345678", telefono="987654321")
            product = Producto(categoria=Categoria(nombre="Pruebas"), sku="QA", nombre="Mesa QA", precio_base=10, controlar_stock=False)
            db.add_all([user, customer, product])
            db.flush()
            self.user_id, self.customer_id, self.product_id = user.id_usuario, customer.id_cliente, product.id_producto
            documents.save_config(db, documents.IssuerConfig(ruc="20123456789", razon_social="Negocio QA", direccion="Calle QA"))

    def cleanup_schema(self):
        self.engine.dispose()
        with self.admin.begin() as connection:
            connection.execute(DropSchema(self.schema, cascade=True))
        self.admin.dispose()

    def issue_concurrently(self, same_request):
        barrier = Barrier(4)
        common_key = uuid4()
        def issue(index):
            barrier.wait(timeout=10)
            with Session(self.engine) as db:
                payload = SaleCreate(id_cliente=self.customer_id, canal_venta="PRESENCIAL", tipo_comprobante="BOLETA",
                                     clave_idempotencia=common_key if same_request else uuid4(),
                                     pagos=[{"medio_pago": "EFECTIVO", "importe": "10.00"}],
                                     detalles=[{"id_producto": self.product_id, "cantidad": 1}])
                sale = service.create_sale(db, payload, db.get(Usuario, self.user_id))
                return sale.id_venta, sale.comprobante.correlativo
        with ThreadPoolExecutor(max_workers=4) as executor:
            return list(executor.map(issue, range(4)))

    def test_same_request_creates_one_sale_and_one_document(self):
        result = self.issue_concurrently(same_request=True)
        self.assertEqual(len(set(result)), 1)
        with Session(self.engine) as db:
            self.assertEqual(db.scalar(select(func.count()).select_from(Venta)), 1)
            self.assertEqual(db.scalar(select(func.count()).select_from(Comprobante)), 1)

    def test_different_sales_get_distinct_consecutive_numbers(self):
        result = self.issue_concurrently(same_request=False)
        self.assertEqual(sorted(number for _, number in result), [1, 2, 3, 4])
        self.assertEqual(len({sale_id for sale_id, _ in result}), 4)
