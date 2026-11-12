
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import AppException
from app.database.enums import DireccionAjuste, TipoMovimiento
from app.database.models.catalog import Producto
from app.database.models.inventory import Inventario, MovimientoInventario


def lock_product_inventory(
        db: Session,
        product_id: int,
) -> tuple[Producto, Inventario]:

    product = db.scalar(
        select(Producto)
        .where(Producto.id_producto == product_id)
        .with_for_update()
    )

    if product is None:
        raise AppException(
            "El producto no existe.",
            404,
            "PRODUCT_NOT_FOUND",
        )

    inventory = db.scalar(
        select(Inventario)
        .where(Inventario.id_producto == product_id)
        .with_for_update()
    )

    if inventory is None:
        inventory = Inventario(
            id_producto=product_id,
            stock_actual=0,
            stock_minimo=0,
        )
        db.add(inventory)
        db.flush()

    return product, inventory


def apply_inventory_movement(
        db: Session,
        *,
        product_id: int,
        user_id: int,
        movement_type: TipoMovimiento,
        quantity: int,
        reason: str,
        adjustment_direction: DireccionAjuste | None = None,
        sale_detail_id: int | None = None,
        cancelled_sale_id: int | None = None,
        allow_inactive_product: bool = False,
) -> MovimientoInventario:
    # Actualiza el stock y registra el movimiento sin confirmar la transacción.

    if quantity <= 0:
        raise AppException(
            "La cantidad debe ser mayor que cero.",
            422,
            "INVALID_QUANTITY",
        )

    if not reason.strip():
        raise AppException(
            "El motivo del movimiento es obligatorio.",
            422,
            "INVALID_MOVEMENT_REASON",
        )

    if movement_type == TipoMovimiento.AJUSTE:
        if adjustment_direction is None:
            raise AppException(
                "El ajuste requiere una dirección.",
                422,
                "ADJUSTMENT_DIRECTION_REQUIRED",
            )
    elif adjustment_direction is not None:
        raise AppException(
            "La dirección solo se utiliza en ajustes.",
            422,
            "INVALID_ADJUSTMENT_DIRECTION",
        )

    if movement_type == TipoMovimiento.ENTRADA and sale_detail_id is not None:
        raise AppException(
            "Una entrada no puede vincularse a un detalle de venta.",
            422,
            "INVALID_MOVEMENT_REFERENCE",
        )

    if movement_type == TipoMovimiento.SALIDA and cancelled_sale_id is not None:
        raise AppException(
            "Una salida no puede vincularse a una venta cancelada.",
            422,
            "INVALID_MOVEMENT_REFERENCE",
        )

    if movement_type == TipoMovimiento.AJUSTE and (
            sale_detail_id is not None or cancelled_sale_id is not None
    ):
        raise AppException(
            "Un ajuste manual no puede vincularse a una venta.",
            422,
            "INVALID_MOVEMENT_REFERENCE",
        )

    product, inventory = lock_product_inventory(db, product_id)

    if not product.activo and not allow_inactive_product:
        raise AppException(
            "No se puede modificar el stock de un producto inactivo.",
            409,
            "PRODUCT_INACTIVE",
        )

    previous_stock = inventory.stock_actual

    if movement_type == TipoMovimiento.ENTRADA:
        new_stock = previous_stock + quantity

    elif movement_type == TipoMovimiento.SALIDA:
        new_stock = previous_stock - quantity

    elif movement_type == TipoMovimiento.AJUSTE:
        if adjustment_direction == DireccionAjuste.INCREMENTO:
            new_stock = previous_stock + quantity
        else:
            new_stock = previous_stock - quantity

    else:
        raise AppException(
            "El tipo de movimiento no es válido.",
            422,
            "INVALID_MOVEMENT_TYPE",
        )

    # Las entradas y reversiones pueden recuperar gradualmente un saldo negativo.
    unrestricted_sale = (
        movement_type == TipoMovimiento.SALIDA
        and sale_detail_id is not None
        and not product.controlar_stock
    )
    if new_stock < 0 and new_stock < previous_stock and not unrestricted_sale:
        raise AppException(
            (
                f"Stock insuficiente para el producto {product_id}. "
                f"Disponible: {previous_stock}; solicitado: {quantity}."
            ),
            409,
            "INSUFFICIENT_STOCK",
        )

    inventory.stock_actual = new_stock

    movement = MovimientoInventario(
        id_producto=product_id,
        id_usuario=user_id,
        id_detalle_venta=sale_detail_id,
        id_venta_cancelada=cancelled_sale_id,
        tipo_movimiento=movement_type,
        direccion_ajuste=adjustment_direction,
        cantidad=quantity,
        stock_anterior=previous_stock,
        stock_posterior=new_stock,
        motivo=reason.strip(),
    )

    db.add(movement)
    db.flush()

    return movement
