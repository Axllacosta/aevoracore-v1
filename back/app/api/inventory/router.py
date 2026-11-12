from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.inventory import service
from app.api.inventory.schemas import (
    InventoryAdjustmentCreate,
    InventoryItemResponse,
    InventoryMinimumUpdate,
    ManualMovementCreate,
    MovementResponse,
)
from app.common.pagination import (
    PaginatedResponse,
    PaginationParams,
    get_pagination_params,
)
from app.database.connection import get_db
from app.database.enums import TipoMovimiento
from app.database.models.security import Usuario
from app.api.auth.dependencies import get_current_user, require_roles


router = APIRouter(prefix="/inventory", tags=["Inventory"])

read_access = require_roles("ADMIN", "EMPLEADO")


@router.get("", response_model=PaginatedResponse[InventoryItemResponse])
def get_inventory(
        search: str | None = Query(default=None, max_length=160),
        stock_bajo: bool | None = None,
        pagination: PaginationParams = Depends(get_pagination_params),
        db: Session = Depends(get_db),
        _: None = Depends(read_access),
):
    return service.list_inventory(
        db,
        pagination,
        search=search,
        stock_bajo=stock_bajo,
    )


@router.patch("/{product_id}/minimum-stock")
def update_minimum_stock(
        product_id: int,
        payload: InventoryMinimumUpdate,
        db: Session = Depends(get_db),
        _: None = Depends(require_roles("ADMIN")),
):
    inventory = service.set_minimum_stock(
        db,
        product_id,
        payload.stock_minimo,
    )
    return {
        "id_producto": inventory.id_producto,
        "stock_minimo": inventory.stock_minimo,
    }


@router.post("/movements", response_model=MovementResponse, status_code=201)
def create_manual_movement(
        payload: ManualMovementCreate,
        db: Session = Depends(get_db),
        user: Usuario = Depends(get_current_user),
        _: None = Depends(read_access),
):
    return service.register_manual_movement(db, payload, user)


@router.post("/adjustments", response_model=MovementResponse, status_code=201)
def create_adjustment(
        payload: InventoryAdjustmentCreate,
        db: Session = Depends(get_db),
        user: Usuario = Depends(get_current_user),
        _: None = Depends(read_access),
):
    return service.register_adjustment(db, payload, user)


@router.get("/movements", response_model=PaginatedResponse[MovementResponse])
def get_movements(
        product_id: int | None = Query(default=None, gt=0),
        user_id: int | None = Query(default=None, gt=0),
        movement_type: TipoMovimiento | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        pagination: PaginationParams = Depends(get_pagination_params),
        db: Session = Depends(get_db),
        _: None = Depends(read_access),
):
    return service.list_movements(
        db,
        pagination,
        product_id=product_id,
        user_id=user_id,
        movement_type=movement_type,
        date_from=date_from,
        date_to=date_to,
    )