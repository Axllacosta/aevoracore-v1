from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database.models.catalog import Categoria, Producto


def get_by_id(db: Session, category_id: int) -> Categoria | None:
    return db.get(Categoria, category_id)


def get_by_name(db: Session, nombre: str) -> Categoria | None:
    statement = select(Categoria).where(
        func.lower(Categoria.nombre) == nombre.lower()
    )
    return db.scalar(statement)


def list_categories(
        db: Session,
        search: str | None = None,
        activo: bool | None = None,
):
    statement = select(Categoria)

    if search:
        statement = statement.where(
            Categoria.nombre.ilike(f"%{search.strip()}%")
        )

    if activo is not None:
        statement = statement.where(Categoria.activo == activo)

    return statement.order_by(Categoria.nombre.asc())


def has_active_products(db: Session, category_id: int) -> bool:
    statement = select(Producto.id_producto).where(
        Producto.id_categoria == category_id,
        Producto.activo.is_(True),
        ).limit(1)

    return db.scalar(statement) is not None


def create(db: Session, category: Categoria) -> Categoria:
    db.add(category)
    db.flush()
    return category
