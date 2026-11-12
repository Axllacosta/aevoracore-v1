from fastapi import APIRouter, Depends, File, Form, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.api.auth.dependencies import require_roles
from app.api.products import image_service, service
from app.api.products.catalog_router import router as catalog_router
from app.api.products.schemas import (
    ProductCreate,
    ProductImageResponse,
    ProductImageUpdate,
    ProductResponse,
    ProductUpdate,
)
from app.common.pagination import PaginatedResponse, PaginationParams, get_pagination_params
from app.database.connection import get_db
from app.database.models.security import Usuario

router = APIRouter(prefix="/products", tags=["Products"])
router.include_router(catalog_router)

read_access = require_roles("ADMIN", "EMPLEADO")
admin_access = require_roles("ADMIN")


@router.get(
    "",
    response_model=PaginatedResponse[ProductResponse],
)
def list_products(
        search: str | None = Query(None, max_length=160),
        category_id: int | None = Query(None, gt=0),
        activo: bool | None = Query(None),
        pagination: PaginationParams = Depends(get_pagination_params),
        db: Session = Depends(get_db),
        _: Usuario = Depends(read_access),
):
    return service.list_products(
        db, pagination, search, category_id, activo
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
        product_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(read_access),
):
    return service.get_product(db, product_id)


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
        data: ProductCreate,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.create_product(db, data)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
        product_id: int,
        data: ProductUpdate,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.update_product(db, product_id, data)


@router.delete("/{product_id}", response_model=ProductResponse)
def deactivate_product(
        product_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return service.deactivate_product(db, product_id)


@router.post(
    "/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_product_image(
        product_id: int,
        file: UploadFile = File(...),
        es_principal: bool = Form(False),
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return image_service.upload_product_image(
        db,
        product_id,
        file,
        es_principal,
    )


@router.get(
    "/{product_id}/images",
    response_model=list[ProductImageResponse],
)
def list_product_images(
        product_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(read_access),
):
    return image_service.list_product_images(db, product_id)


@router.patch(
    "/{product_id}/images/{image_id}",
    response_model=ProductImageResponse,
)
def update_product_image(
        product_id: int,
        image_id: int,
        data: ProductImageUpdate,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    return image_service.update_product_image(
        db,
        product_id,
        image_id,
        data,
    )


@router.delete(
    "/{product_id}/images/{image_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_product_image(
        product_id: int,
        image_id: int,
        db: Session = Depends(get_db),
        _: Usuario = Depends(admin_access),
):
    image_service.delete_product_image(
        db,
        product_id,
        image_id,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
