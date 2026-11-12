from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.product_categories import service
from app.api.product_categories.schemas import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
)
from app.common.pagination import (
    PaginatedResponse,
    PaginationParams,
    get_pagination_params,
)
from app.database.connection import get_db
from app.database.models.security import Usuario
from app.api.auth.dependencies import require_roles

router = APIRouter(prefix="/categories", tags=["Categories"])

read_access = require_roles("ADMIN", "EMPLEADO")
admin_access = require_roles("ADMIN")


@router.get(
    "",
    response_model=PaginatedResponse[CategoryResponse],
)
def list_categories(
        search: str | None = Query(None, max_length=100),
        activo: bool | None = Query(None),
        pagination: PaginationParams = Depends(get_pagination_params),
        db: Session = Depends(get_db),
        _: Usuario = Depends(read_access),
):
    return service.list_categories(db, pagination, search, activo)


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
        category_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(read_access),
):
    return service.get_category(db, category_id)


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
        data: CategoryCreate,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.create_category(db, data)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
        category_id: int,
        data: CategoryUpdate,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.update_category(db, category_id, data)


@router.delete("/{category_id}", response_model=CategoryResponse)
def deactivate_category(
        category_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.deactivate_category(db, category_id)
