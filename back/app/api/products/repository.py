from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database.models.catalog import Categoria, Producto


def get_by_id(db: Session, product_id: int) -> Producto | None:
    statement = (
        select(Producto)
        .options(selectinload(Producto.imagenes))
        .where(Producto.id_producto == product_id)
    )

    return db.scalar(statement)


def get_by_sku(
        db: Session,
        sku: str,
        exclude_id: int | None = None,
) -> Producto | None:
    statement = select(Producto).where(
        func.lower(Producto.sku) == sku.lower()
    )

    if exclude_id is not None:
        statement = statement.where(Producto.id_producto != exclude_id)

    return db.scalar(statement)


def get_category(db: Session, category_id: int) -> Categoria | None:
    return db.get(Categoria, category_id)


def list_products(
        search: str | None = None,
        category_id: int | None = None,
        activo: bool | None = None,
):
    statement = select(Producto).options(
        selectinload(Producto.imagenes)
    )

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Producto.nombre.ilike(term),
                Producto.sku.ilike(term),
            )
        )

    if category_id is not None:
        statement = statement.where(Producto.id_categoria == category_id)

    if activo is not None:
        statement = statement.where(Producto.activo == activo)

    return statement.order_by(Producto.nombre.asc())


def list_public_catalog(
        search: str | None = None,
        category_id: int | None = None,
):
    statement = (
        select(Producto)
        .options(selectinload(Producto.imagenes))
        .join(Categoria, Producto.id_categoria == Categoria.id_categoria)
        .where(
            Producto.activo.is_(True),
            Categoria.activo.is_(True),
        )
    )

    if search:
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Producto.nombre.ilike(term),
                Producto.sku.ilike(term),
                Categoria.nombre.ilike(term),
            )
        )

    if category_id is not None:
        statement = statement.where(Producto.id_categoria == category_id)

    return statement.order_by(Producto.nombre.asc())


def list_public_categories():
    has_public_products = select(Producto.id_producto).where(
        Producto.id_categoria == Categoria.id_categoria,
        Producto.activo.is_(True),
    ).exists()
    return (
        select(Categoria)
        .where(Categoria.activo.is_(True), has_public_products)
        .order_by(Categoria.nombre.asc())
    )


def create(db: Session, product: Producto) -> Producto:
    db.add(product)
    db.flush()
    return product
