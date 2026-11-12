from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.customers import service
from app.api.customers.schemas import (
    CustomerCreate,
    CustomerResponse,
    CustomerUpdate,
)
from app.common.pagination import (
    PaginatedResponse,
    PaginationParams,
    get_pagination_params,
)
from app.database.connection import get_db
from app.database.models.security import Usuario
from app.api.auth.dependencies import require_roles

router = APIRouter(prefix="/customers", tags=["Customers"])

read_access = require_roles("ADMIN", "EMPLEADO")
admin_access = require_roles("ADMIN")


@router.get(
    "",
    response_model=PaginatedResponse[CustomerResponse],
)
def list_customers(
        search: str | None = Query(None, max_length=100),
        activo: bool | None = Query(None),
        pagination: PaginationParams = Depends(get_pagination_params),
        db: Session = Depends(get_db),
        _: Usuario = Depends(read_access),
):
    return service.list_customers(db, pagination, search, activo)


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
        customer_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(read_access),
):
    return service.get_customer(db, customer_id)


@router.post(
    "",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_customer(
        data: CustomerCreate,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.create_customer(db, data)


@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer(
        customer_id: int,
        data: CustomerUpdate,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.update_customer(db, customer_id, data)


@router.delete("/{customer_id}", response_model=CustomerResponse)
def deactivate_customer(
        customer_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.deactivate_customer(db, customer_id)
