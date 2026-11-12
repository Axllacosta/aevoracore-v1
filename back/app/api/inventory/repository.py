from datetime import datetime

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database.models.catalog import Producto
from app.database.models.inventory import Inventario, MovimientoInventario
from app.database.models.security import AutorizacionAjusteInventario, Usuario


def get_inventory_statement(
        db: Session,
        search: str | None = None,
        stock_bajo: bool | None = None,
):
    statement = (
        select(Producto)
        .outerjoin(Inventario, Inventario.id_producto == Producto.id_producto)
        .where(Producto.activo.is_(True))
    )

    if search and search.strip():
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Producto.nombre.ilike(term),
                Producto.sku.ilike(term),
            )
        )

    if stock_bajo is True:
        statement = statement.where(
            or_(
                Inventario.id_inventario.is_(None),
                Inventario.stock_actual <= Inventario.stock_minimo,
                )
        )
    elif stock_bajo is False:
        statement = statement.where(
            Inventario.id_inventario.is_not(None),
            Inventario.stock_actual > Inventario.stock_minimo,
            )

    return statement.order_by(Producto.nombre.asc())


def get_product_for_update(db: Session, product_id: int):
    return db.scalar(
        select(Producto)
        .where(Producto.id_producto == product_id)
        .with_for_update()
    )


def get_inventory_for_update(db: Session, product_id: int):
    return db.scalar(
        select(Inventario)
        .where(Inventario.id_producto == product_id)
        .with_for_update()
    )


def get_or_create_inventory(db: Session, product_id: int) -> Inventario:
    inventory = get_inventory_for_update(db, product_id)

    if inventory is None:
        inventory = Inventario(
            id_producto=product_id,
            stock_actual=0,
            stock_minimo=0,
        )
        db.add(inventory)
        db.flush()

    return inventory


def get_adjustment_authorization(db: Session, user_id: int):
    return db.get(AutorizacionAjusteInventario, user_id)


def create_movement(
        db: Session,
        *,
        product_id: int,
        user_id: int,
        movement_type,
        quantity: int,
        previous_stock: int,
        new_stock: int,
        reason: str,
        adjustment_direction=None,
) -> MovimientoInventario:
    movement = MovimientoInventario(
        id_producto=product_id,
        id_usuario=user_id,
        tipo_movimiento=movement_type,
        direccion_ajuste=adjustment_direction,
        cantidad=quantity,
        stock_anterior=previous_stock,
        stock_posterior=new_stock,
        motivo=reason,
    )
    db.add(movement)
    db.flush()
    return movement


def get_movement_statement(
        db: Session,
        *,
        product_id: int | None = None,
        user_id: int | None = None,
        movement_type=None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
):
    statement = select(MovimientoInventario)

    if product_id is not None:
        statement = statement.where(
            MovimientoInventario.id_producto == product_id
        )

    if user_id is not None:
        statement = statement.where(
            MovimientoInventario.id_usuario == user_id
        )

    if movement_type is not None:
        statement = statement.where(
            MovimientoInventario.tipo_movimiento == movement_type
        )

    if date_from is not None:
        statement = statement.where(
            MovimientoInventario.fecha_hora >= date_from
        )

    if date_to is not None:
        statement = statement.where(
            MovimientoInventario.fecha_hora <= date_to
        )

    return statement.order_by(MovimientoInventario.fecha_hora.desc())


def update_minimum_stock(
        db: Session,
        inventory: Inventario,
        minimum_stock: int,
) -> Inventario:
    inventory.stock_minimo = minimum_stock
    db.flush()
    return inventory