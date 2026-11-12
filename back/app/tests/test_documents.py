import unittest
from io import BytesIO
from uuid import uuid4

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.testclient import TestClient
from pypdf import PdfReader
from sqlalchemy import func, select

from app.api.sales import documents, service
from app.tests.sales_fixture import SaleTestCase
from app.api.sales.pdf import render_sale_pdf
from app.api.sales.router import router
from app.api.sales.schemas import SaleCancelRequest, SaleResponse
from app.core.exception_handlers import app_exception_handler, validation_exception_handler
from app.core.exceptions import AppException
from app.database.connection import get_db
from app.database.models.document import Comprobante, DetalleComprobante, SerieComprobante
from app.database.models.sales import Venta
from app.api.auth.dependencies import get_current_user


class DocumentTests(SaleTestCase):
    def configure(self):
        documents.save_config(self.db, documents.IssuerConfig(ruc="20123456789", razon_social="Muebles Perú SAC", direccion="Av. Los Álamos 123, Lima"))

    def issue(self, kind="BOLETA", key=None):
        payload = self.payload()
        payload.tipo_comprobante = kind
        payload.clave_idempotencia = key
        return service.create_sale(self.db, payload, self.user)

    def text(self, document):
        return "\n".join(page.extract_text() for page in PdfReader(BytesIO(render_sale_pdf(document))).pages)

    def test_no_issuer_rolls_back_sale_stock_and_document(self):
        with self.assertRaises(AppException) as error:
            self.issue()
        self.assertEqual(error.exception.code, "DOCUMENT_ISSUER_NOT_CONFIGURED")
        self.assertEqual(self.count(Venta), 0)
        self.assertEqual(self.count(Comprobante), 0)
        self.assertEqual(self.inventory.stock_actual, 1)

    def test_document_keeps_customer_product_and_issuer_history(self):
        self.configure()
        sale = self.issue()
        sale_id = sale.id_venta
        self.customer.nombres = "Otro nombre"
        self.product.nombre = "Nombre nuevo"
        self.product.sku = "OTRO"
        self.product.precio_base = 999
        self.db.commit()
        documents.save_config(self.db, documents.IssuerConfig(ruc="20123456789", razon_social="Nuevo nombre SAC", direccion="Otra dirección"))
        self.db.expire_all()
        document = documents.get_document(self.db, sale_id)
        text = self.text(document)
        self.assertIn("Cliente", text)
        self.assertIn("Mesa", text)
        self.assertIn("Muebles Perú SAC", text)
        self.assertIn("10.00", text)
        self.assertNotIn("Nombre nuevo", text)
        self.assertNotIn("Otro nombre", text)
        self.assertEqual(document.correlativo, 1)
        response = SaleResponse.model_validate(service.get_sale(self.db, sale_id))
        self.assertEqual(response.comprobante.tipo, "BOLETA")

    def test_factura_requires_billing_data_and_uses_independent_series(self):
        self.configure()
        with self.assertRaises(AppException) as error:
            self.issue("FACTURA")
        self.assertEqual(error.exception.code, "DOCUMENT_CUSTOMER_BILLING_MISSING")
        self.customer.ruc = "20987654321"
        self.customer.tipo_persona = "JURIDICA"
        self.customer.razon_social = "Cliente Empresa SAC"
        self.customer.direccion_fiscal = "Calle Empresa 20"
        self.db.commit()
        document = self.issue("FACTURA").comprobante
        self.assertEqual((document.serie, document.correlativo), ("F001", 1))
        self.assertIn("Cliente Empresa SAC", self.text(document))

    def test_retries_return_same_sale_and_pdf_does_not_write(self):
        self.configure()
        key = uuid4()
        first = self.issue(key=key)
        sale_id = first.id_venta
        repeated = self.issue(key=key)
        self.assertEqual(repeated.id_venta, sale_id)
        for _ in range(3):
            self.assertTrue(render_sale_pdf(documents.get_document(self.db, sale_id)).startswith(b"%PDF-"))
        self.assertEqual(self.count(Venta), 1)
        self.assertEqual(self.count(Comprobante), 1)
        self.assertEqual(self.count(DetalleComprobante), 1)
        self.assertEqual(self.inventory.stock_actual, 0)
        self.assertEqual(self.db.scalar(select(func.max(SerieComprobante.ultimo_correlativo))), 1)
        payload = self.payload()
        payload.tipo_comprobante = "FACTURA"
        payload.clave_idempotencia = key
        with self.assertRaises(AppException) as error:
            service.create_sale(self.db, payload, self.user)
        self.assertEqual(error.exception.code, "SALE_IDEMPOTENCY_CONFLICT")

    def test_cancelled_document_keeps_number_and_shows_administrative_mark(self):
        self.configure()
        sale = self.issue()
        service.cancel_sale(self.db, sale.id_venta, SaleCancelRequest(motivo_cancelacion="Venta equivocada"), self.user)
        document = documents.get_document(self.db, sale.id_venta)
        text = self.text(document)
        self.assertIn("VENTA CANCELADA", text)
        self.assertIn("B001-00000001", text)
        self.assertEqual(document.total, 10)

    def test_pdf_endpoint_permissions_headers_and_legacy_sale(self):
        self.configure()
        sale = self.issue()
        app = FastAPI()
        app.include_router(router)
        app.add_exception_handler(AppException, app_exception_handler)
        app.add_exception_handler(RequestValidationError, validation_exception_handler)
        app.dependency_overrides[get_db] = lambda: self.db
        with TestClient(app) as client:
            self.assertIn(client.get(f"/sales/{sale.id_venta}/pdf").status_code, (401, 403))
            app.dependency_overrides[get_current_user] = lambda: self.user
            pdf = client.get(f"/sales/{sale.id_venta}/pdf")
            self.assertEqual(pdf.status_code, 200)
            self.assertEqual(pdf.headers["content-type"], "application/pdf")
            self.assertEqual(pdf.headers["cache-control"], "no-store")
            self.assertIn("inline", pdf.headers["content-disposition"])
            self.assertTrue(pdf.content.startswith(b"%PDF-"))
            self.assertEqual(client.get("/sales/99999/pdf").status_code, 404)
            self.user.rol.nombre = "OTRO"
            self.assertEqual(client.get(f"/sales/{sale.id_venta}/pdf").status_code, 403)
            self.user.rol.nombre = "ADMIN"
            self.product.controlar_stock = False
            self.db.commit()
            legacy = service.create_sale(self.db, self.payload(), self.user)
            result = client.get(f"/sales/{legacy.id_venta}/pdf")
            self.assertEqual(result.status_code, 409)
            self.assertEqual(result.json()["error"]["code"], "SALE_DOCUMENT_MISSING")
            self.assertEqual(client.get("/sales/document-config").status_code, 200)
            invalid = client.put("/sales/document-config", json={"ruc": "bad", "razon_social": "", "direccion": ""})
            self.assertEqual(invalid.status_code, 422)
            self.assertTrue(invalid.json()["error"]["details"])

    def test_issuer_ruc_locked_after_document_and_names_can_change(self):
        self.configure()
        self.issue()
        with self.assertRaises(AppException):
            documents.save_config(self.db, documents.IssuerConfig(ruc="20999999999", razon_social="Otro negocio", direccion="Calle 1"))

    def test_document_preserves_discounted_amounts_and_mixed_payments(self):
        self.configure()
        payload = self.payload(amounts=("3.00", "6.00"), details=[{"id_producto": self.product_id, "cantidad": 1, "descuento_importe": "1.00"}])
        payload.tipo_comprobante = "BOLETA"
        document = service.create_sale(self.db, payload, self.user).comprobante
        self.assertEqual((document.subtotal, document.descuento_total, document.total), (10, 1, 9))
        self.assertEqual(document.detalles[0].total, 9)
        self.assertIn("9.00", self.text(document))


if __name__ == "__main__":
    unittest.main()
