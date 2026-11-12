from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.customers import repository
from app.api.customers.schemas import CustomerCreate, CustomerUpdate
from app.common.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginate_query,
)
from app.core.exceptions import AppException
from app.database.models.customer import Cliente


def _get_or_404(db: Session, customer_id: int) -> Cliente:
    customer = repository.get_by_id(db, customer_id)

    if customer is None:
        raise AppException(
            "El cliente no existe.", 404, "CUSTOMER_NOT_FOUND"
        )

    return customer


def list_customers(
        db: Session,
        pagination: PaginationParams,
        search: str | None,
        activo: bool | None,
) -> PaginatedResponse:
    statement = repository.list_customers(search, activo)
    return paginate_query(db, statement, pagination)


def get_customer(db: Session, customer_id: int) -> Cliente:
    return _get_or_404(db, customer_id)


def create_customer(db: Session, data: CustomerCreate) -> Cliente:
    if data.dni and repository.get_by_dni(db, data.dni):
        raise AppException(
            "Ya existe un cliente con ese DNI.",
            409,
            "CUSTOMER_DNI_ALREADY_EXISTS",
        )

    if data.ruc and repository.get_by_ruc(db, data.ruc):
        raise AppException(
            "Ya existe un cliente con ese RUC.", 409, "CUSTOMER_RUC_ALREADY_EXISTS"
        )

    customer = Cliente(
        tipo_persona=data.tipo_persona,
        razon_social=data.razon_social,
        direccion_fiscal=data.direccion_fiscal,
        dni=data.dni,
        ruc=data.ruc,
        correo=str(data.correo) if data.correo is not None else None,
        telefono=data.telefono,
        nombres=data.nombres,
        apellidos=data.apellidos,
        activo=True,
    )

    try:
        repository.create(db, customer)
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo crear el cliente por un conflicto de datos.",
            409,
            "CUSTOMER_DATA_CONFLICT",
        ) from None


def update_customer(
        db: Session,
        customer_id: int,
        data: CustomerUpdate,
) -> Cliente:
    customer = _get_or_404(db, customer_id)
    changes = data.model_dump(exclude_unset=True)

    if not changes:
        raise AppException(
            "Debes proporcionar al menos un campo para actualizar.",
            400,
            "EMPTY_UPDATE",
        )

    if changes.get("tipo_persona", customer.tipo_persona) is None:
        raise AppException("Indica el tipo de persona.", 422, "INVALID_CUSTOMER_FIELD")
    from pydantic import ValidationError
    try:
        CustomerCreate.model_validate({
            field: changes.get(field, getattr(customer, field))
            for field in CustomerCreate.model_fields
        })
    except ValidationError as exc:
        raise AppException("Revisa los datos obligatorios del cliente según su tipo de persona.", 422, "INVALID_CUSTOMER_FIELD") from exc

    if changes.get("dni"):
        existing = repository.get_by_dni(
            db,
            changes["dni"],
            exclude_id=customer_id,
        )
        if existing:
            raise AppException(
                "Ya existe un cliente con ese DNI.",
                409,
                "CUSTOMER_DNI_ALREADY_EXISTS",
            )

    if changes.get("ruc") and repository.get_by_ruc(db, changes["ruc"], exclude_id=customer_id):
        raise AppException(
            "Ya existe un cliente con ese RUC.", 409, "CUSTOMER_RUC_ALREADY_EXISTS"
        )

    for field, value in changes.items():
        setattr(customer, field, value)

    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo actualizar el cliente por un conflicto de datos.",
            409,
            "CUSTOMER_DATA_CONFLICT",
        ) from None


def deactivate_customer(db: Session, customer_id: int) -> Cliente:
    customer = _get_or_404(db, customer_id)

    if not customer.activo:
        return customer

    customer.activo = False

    try:
        db.commit()
        db.refresh(customer)
        return customer
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo desactivar el cliente.",
            409,
            "CUSTOMER_DEACTIVATION_CONFLICT",
        ) from None
