from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.database.models.catalog import Categoria, Producto
from app.database.models.product_image import ImagenProducto


def get_product(db: Session, product_id: int):
    return db.get(Producto, product_id)


def get_image(db: Session, image_id: int, product_id: int):
    statement = select(ImagenProducto).where(
        ImagenProducto.id_imagen == image_id,
        ImagenProducto.id_producto == product_id,
        )

    return db.scalar(statement)


def list_images(db: Session, product_id: int):
    statement = (
        select(ImagenProducto)
        .where(ImagenProducto.id_producto == product_id)
        .order_by(ImagenProducto.orden, ImagenProducto.id_imagen)
    )

    return list(db.scalars(statement).all())


def get_next_order(db: Session, product_id: int) -> int:
    statement = select(
        func.coalesce(func.max(ImagenProducto.orden), 0)
    ).where(
        ImagenProducto.id_producto == product_id
    )

    return db.scalar(statement) + 1


def clear_primary(
        db: Session,
        product_id: int,
        exclude_image_id: int | None = None,
) -> None:
    statement = update(ImagenProducto).where(
        ImagenProducto.id_producto == product_id
    )

    if exclude_image_id is not None:
        statement = statement.where(
            ImagenProducto.id_imagen != exclude_image_id
        )

    db.execute(
        statement.values(es_principal=False)
    )


def get_public_image(db: Session, image_id: int) -> ImagenProducto | None:
    return db.scalar(
        select(ImagenProducto)
        .join(Producto, ImagenProducto.id_producto == Producto.id_producto)
        .join(Categoria, Producto.id_categoria == Categoria.id_categoria)
        .where(
            ImagenProducto.id_imagen == image_id,
            Producto.activo.is_(True),
            Categoria.activo.is_(True),
        )
    )
