from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database.models.catalog import Producto
from app.database.models.customer import Cliente
from app.database.models.inventory import Inventario
from app.database.models.payment import Pago
from app.database.models.sales import DetalleVenta, Venta


def get_customer(db: Session, customer_id: int) -> Cliente | None:
    return db.get(Cliente, customer_id)


def get_products_for_update(
        db: Session,
        product_ids: list[int],
) -> list[Producto]:
    if not product_ids:
        return []

    statement = (
        select(Producto)
        .where(Producto.id_producto.in_(set(product_ids)))
        .order_by(Producto.id_producto)
        .with_for_update()
    )
    return list(db.scalars(statement).all())


def get_inventories_for_update(
        db: Session,
        product_ids: list[int],
) -> list[Inventario]:
    if not product_ids:
        return []

    statement = (
        select(Inventario)
        .where(Inventario.id_producto.in_(set(product_ids)))
        .order_by(Inventario.id_producto)
        .with_for_update()
    )
    return list(db.scalars(statement).all())


def create_inventory(db: Session, product_id: int) -> Inventario:
    inventory = Inventario(
        id_producto=product_id,
        stock_actual=0,
        stock_minimo=0,
    )
    db.add(inventory)
    db.flush()
    return inventory


def create_sale(db: Session, sale: Venta) -> Venta:
    db.add(sale)
    db.flush()
    return sale


def create_sale_detail(
        db: Session,
        detail: DetalleVenta,
) -> DetalleVenta:
    db.add(detail)
    db.flush()
    return detail


def get_sale_by_id(db: Session, sale_id: int) -> Venta | None:
    statement = (
        select(Venta)
        .where(Venta.id_venta == sale_id)
        .options(
            selectinload(Venta.detalles),
            selectinload(Venta.pagos),
            selectinload(Venta.comprobante),
        )
    )
    return db.scalar(statement)


def get_sale_for_update(db: Session, sale_id: int) -> Venta | None:
    statement = (
        select(Venta)
        .where(Venta.id_venta == sale_id)
        .with_for_update()
        .options(
            selectinload(Venta.detalles),
            selectinload(Venta.pagos),
            selectinload(Venta.comprobante),
        )
    )
    return db.scalar(statement)


def list_sales(
        db: Session,
        *,
        limit: int,
        offset: int,
) -> list[Venta]:
    statement = (
        select(Venta)
        .options(
            selectinload(Venta.detalles),
            selectinload(Venta.pagos),
            selectinload(Venta.comprobante),
        )
        .order_by(Venta.fecha_hora.desc(), Venta.id_venta.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement).all())


def create_payment(db: Session, payment: Pago) -> Pago:
    db.add(payment)
    db.flush()
    return payment
