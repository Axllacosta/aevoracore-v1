import unittest

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api.customers.schemas import CustomerCreate, CustomerResponse, CustomerUpdate
from app.api.customers import service, repository
from app.core.exceptions import AppException
from app.database.models.customer import Cliente


class CustomerValidationTests(unittest.TestCase):
    def test_ruc_and_email_are_optional_and_blank_values_become_null(self):
        data = CustomerCreate(nombres=" Ana ", apellidos="Pérez", telefono="987654321", dni="12345678", ruc="", correo="")
        self.assertEqual(data.nombres, "Ana")
        self.assertEqual(data.dni, "12345678")
        self.assertIsNone(data.ruc)
        self.assertIsNone(data.correo)

    def test_phone_requires_nine_ascii_digits(self):
        for value in (None, "", "12345678", "1234567890", "987a54321", "+51987654321", "９８７６５４３２１"):
            with self.subTest(phone=value), self.assertRaises(ValidationError):
                CustomerCreate(nombres="Ana", apellidos="Pérez", dni="12345678", telefono=value)

    def test_names_and_documents_reject_invalid_characters(self):
        for fields in ({"nombres": "Ana1"}, {"apellidos": "Pérez2"}, {"nombres": "---"}, {"dni": "1234567a"}, {"ruc": "2012345678a"}, {"correo": "incorrecto"}):
            with self.subTest(fields=fields), self.assertRaises(ValidationError):
                CustomerCreate(**({"nombres": "Ana", "apellidos": "Pérez", "dni": "12345678", "telefono": "987654321"} | fields))

    def test_update_distinguishes_omitted_fields_from_explicit_null(self):
        self.assertEqual(CustomerUpdate(nombres="José").model_dump(exclude_unset=True), {"nombres": "José"})
        self.assertEqual(CustomerUpdate(ruc="", correo=" ").model_dump(exclude_unset=True), {"ruc": None, "correo": None})

    def test_dni_is_required_on_creation_and_cannot_be_cleared_on_update(self):
        contact = {"nombres": "Ana", "apellidos": "Pérez", "telefono": "987654321"}
        with self.assertRaises(ValidationError):
            CustomerCreate(**contact)
        for value in (None, "", " ", "1234567", "1234567a"):
            with self.subTest(dni=value), self.assertRaises(ValidationError):
                CustomerCreate(**contact, dni=value)
            if value and value.strip():
                with self.subTest(update_dni=value), self.assertRaises(ValidationError):
                    CustomerUpdate(dni=value)

    def test_company_identity_does_not_require_personal_dni(self):
        company = CustomerCreate(tipo_persona="JURIDICA", ruc="20123456789", razon_social="Empresa SAC")
        self.assertIsNone(company.dni)
        with self.assertRaises(ValidationError):
            CustomerCreate(tipo_persona="JURIDICA", razon_social="Empresa SAC")


class CustomerStorageTests(unittest.TestCase):
    def setUp(self):
        self.next_dni = 10000000
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Cliente.__table__.create(self.engine)
        self.db = Session(self.engine)

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def create(self, **values):
        self.next_dni += 1
        return service.create_customer(self.db, CustomerCreate(**({"nombres": "Ana", "apellidos": "Pérez", "telefono": "987654321", "dni": str(self.next_dni)} | values)))

    def test_saves_contact_details_and_multiple_customers_with_required_dni(self):
        first = self.create()
        second = self.create(ruc="20123456789", correo="ana@example.com")
        response = CustomerResponse.model_validate(second)
        self.assertNotEqual(first.id_cliente, second.id_cliente)
        self.assertEqual(response.ruc, "20123456789")
        self.assertEqual(response.correo, "ana@example.com")
        self.assertEqual(response.telefono, "987654321")
        self.assertEqual(len(self.db.scalars(repository.list_customers("20123456789")).all()), 1)

    def test_duplicate_documents_are_rejected_and_optional_ruc_can_be_cleared(self):
        first = self.create(dni="12345678", ruc="20123456789")
        for values in ({"dni": "12345678"}, {"ruc": "20123456789"}):
            with self.subTest(values=values), self.assertRaises(AppException):
                self.create(**values)
        second = self.create()
        with self.assertRaises(AppException):
            service.update_customer(self.db, second.id_cliente, CustomerUpdate(ruc="20123456789"))
        updated = service.update_customer(self.db, first.id_cliente, CustomerUpdate(ruc=None, correo=None))
        self.assertEqual(updated.dni, "12345678")
        self.assertIsNone(updated.ruc)
        self.assertEqual(updated.telefono, "987654321")
        self.create(ruc="20123456789")

    def test_natural_identity_cannot_be_cleared_but_company_dni_can(self):
        natural = self.create()
        with self.assertRaises(AppException):
            service.update_customer(self.db, natural.id_cliente, CustomerUpdate(dni=None))
        company = service.create_customer(self.db, CustomerCreate(tipo_persona="JURIDICA", razon_social="Empresa SAC", ruc="20123456789"))
        updated = service.update_customer(self.db, company.id_cliente, CustomerUpdate(dni=None))
        self.assertIsNone(updated.dni)
        self.assertEqual(len(self.db.scalars(repository.list_customers("Empresa SAC")).all()), 1)


if __name__ == "__main__":
    unittest.main()
