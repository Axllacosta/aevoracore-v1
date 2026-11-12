from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database.models.customer import Cliente


def get_by_id(db: Session, customer_id: int) -> Cliente | None:
    return db.get(Cliente, customer_id)


def get_by_dni(
        db: Session,
        dni: str,
        exclude_id: int | None = None,
) -> Cliente | None:
    statement = select(Cliente).where(Cliente.dni == dni)

    if exclude_id is not None:
        statement = statement.where(Cliente.id_cliente != exclude_id)

    return db.scalar(statement)


def get_by_ruc(db: Session, ruc: str, exclude_id: int | None = None) -> Cliente | None:
    statement = select(Cliente).where(Cliente.ruc == ruc)
    if exclude_id is not None:
        statement = statement.where(Cliente.id_cliente != exclude_id)
    return db.scalar(statement)


def list_customers(
        search: str | None = None,
        activo: bool | None = None,
):
    statement = select(Cliente)

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Cliente.dni.ilike(term),
                Cliente.ruc.ilike(term),
                Cliente.telefono.ilike(term),
                Cliente.correo.ilike(term),
                Cliente.nombres.ilike(term),
                Cliente.razon_social.ilike(term),
                Cliente.apellidos.ilike(term),
            )
        )

    if activo is not None:
        statement = statement.where(Cliente.activo == activo)

    return statement.order_by(
        Cliente.apellidos.asc(),
        Cliente.nombres.asc(),
    )


def create(db: Session, customer: Cliente) -> Cliente:
    db.add(customer)
    db.flush()
    return customer
