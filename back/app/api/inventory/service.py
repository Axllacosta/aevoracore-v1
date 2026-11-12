from datetime import datetime

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.exceptions import AppException
from app.common.pagination import PaginatedResponse, PaginationParams, paginate_query
from app.api.inventory.operations import apply_inventory_movement
from app.database.enums import TipoMovimiento, DireccionAjuste
from app.database.models.inventory import Inventario
from app.database.models.security import Usuario
from app.api.inventory import repository
from app.api.inventory.schemas import InventoryItemResponse



def list_inventory(
        db,
        pagination: PaginationParams,
        search: str | None = None,
        stock_bajo: bool | None = None,
):
    statement = repository.get_inventory_statement(
        db, search=search, stock_bajo=stock_bajo
    )
    result = paginate_query(db, statement, pagination)

    items = []
    for product in result.items:
        inventory = product.inventario
        current_stock = inventory.stock_actual if inventory else 0
        minimum_stock = inventory.stock_minimo if inventory else 0

        items.append(
            InventoryItemResponse(
                id_producto=product.id_producto,
                sku=product.sku,
                nombre=product.nombre,
                stock_actual=current_stock,
                stock_minimo=minimum_stock,
                fecha_actualizacion=(
                    inventory.fecha_actualizacion if inventory else None
                ),
                stock_bajo=current_stock <= minimum_stock,
            )
        )

    return PaginatedResponse[InventoryItemResponse](
        items=items,
        total=result.total,
        page=result.page,
        page_size=result.page_size,
        total_pages=result.total_pages,
    )


def _validate_adjustment_permission(db, user: Usuario) -> None:
    if user.rol.nombre == "ADMIN":
        return

    authorization = repository.get_adjustment_authorization(
        db, user.id_usuario
    )

    if authorization is None or not authorization.autorizado:
        raise AppException(
            "No tienes autorización para realizar ajustes de inventario.",
            403,
            "INVENTORY_ADJUSTMENT_FORBIDDEN",
        )



def _perform_movement(
        db,
        *,
        product_id: int,
        user: Usuario,
        movement_type: TipoMovimiento,
        quantity: int,
        reason: str,
        adjustment_direction: DireccionAjuste | None = None,
):
    try:
        # Los ajustes requieren autorización adicional.
        if movement_type == TipoMovimiento.AJUSTE:
            _validate_adjustment_permission(db, user)

        # El helper valida, bloquea, actualiza el stock
        # y registra el movimiento sin hacer commit.
        movement = apply_inventory_movement(
            db,
            product_id=product_id,
            user_id=user.id_usuario,
            movement_type=movement_type,
            quantity=quantity,
            reason=reason,
            adjustment_direction=adjustment_direction,
        )

        # El servicio controla la transacción completa.
        db.commit()
        db.refresh(movement)

        return movement

    except AppException:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()
        raise AppException(
            "No se pudo registrar el movimiento por un conflicto de datos.",
            409,
            "INVENTORY_DATA_CONFLICT",
        ) from exc

    except Exception:
        db.rollback()
        raise



def register_manual_movement(db, payload, user: Usuario):
    if payload.tipo_movimiento == TipoMovimiento.AJUSTE:
        raise AppException(
            "Utiliza el endpoint de ajustes para modificar existencias.",
            422,
            "INVALID_MOVEMENT_TYPE",
        )

    return _perform_movement(
        db,
        product_id=payload.id_producto,
        user=user,
        movement_type=payload.tipo_movimiento,
        quantity=payload.cantidad,
        reason=payload.motivo,
    )


def register_adjustment(db, payload, user: Usuario):
    return _perform_movement(
        db,
        product_id=payload.id_producto,
        user=user,
        movement_type=TipoMovimiento.AJUSTE,
        quantity=payload.cantidad,
        reason=payload.motivo,
        adjustment_direction=payload.direccion_ajuste,
    )


def list_movements(
        db,
        pagination: PaginationParams,
        *,
        product_id: int | None = None,
        user_id: int | None = None,
        movement_type: TipoMovimiento | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
):
    if date_from and date_to and date_from > date_to:
        raise AppException(
            "La fecha inicial no puede ser posterior a la fecha final.",
            422,
            "INVALID_DATE_RANGE",
        )

    statement = repository.get_movement_statement(
        db,
        product_id=product_id,
        user_id=user_id,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
    )

    return paginate_query(db, statement, pagination)


def set_minimum_stock(db, product_id: int, minimum_stock: int):
    try:
        product = repository.get_product_for_update(db, product_id)

        if product is None:
            raise AppException(
                "El producto no existe.", 404, "PRODUCT_NOT_FOUND"
            )

        inventory = repository.get_or_create_inventory(db, product_id)

        repository.update_minimum_stock(db, inventory, minimum_stock)

        db.commit()
        db.refresh(inventory)
        return inventory

    except AppException:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()
        raise AppException(
            "No se pudo actualizar el stock mínimo.",
            409,
            "INVENTORY_DATA_CONFLICT",
        ) from exc

    except Exception:
        db.rollback()
        raise