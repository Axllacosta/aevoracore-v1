from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.products import repository
from app.api.products.schemas import ProductCreate, ProductUpdate
from app.common.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginate_query,
)
from app.core.exceptions import AppException
from app.database.models.catalog import Producto


def _get_or_404(db: Session, product_id: int) -> Producto:
    product = repository.get_by_id(db, product_id)
    if product is None:
        raise AppException(
            "El producto no existe.", 404, "PRODUCT_NOT_FOUND"
        )
    return product


def _validate_category(db: Session, category_id: int) -> None:
    category = repository.get_category(db, category_id)

    if category is None:
        raise AppException(
            "La categoría seleccionada no existe.",
            404,
            "CATEGORY_NOT_FOUND",
        )

    if not category.activo:
        raise AppException(
            "No puedes asignar un producto a una categoría inactiva.",
            409,
            "CATEGORY_INACTIVE",
        )


def list_products(
        db: Session,
        pagination: PaginationParams,
        search: str | None,
        category_id: int | None,
        activo: bool | None,
) -> PaginatedResponse:
    statement = repository.list_products(search, category_id, activo)
    return paginate_query(db, statement, pagination)


def list_public_catalog(
        db: Session,
        pagination: PaginationParams,
        search: str | None,
        category_id: int | None,
) -> PaginatedResponse:
    statement = repository.list_public_catalog(search, category_id)
    return paginate_query(db, statement, pagination)


def list_public_categories(db: Session):
    return list(db.scalars(repository.list_public_categories()).all())


def get_product(db: Session, product_id: int) -> Producto:
    return _get_or_404(db, product_id)


def create_product(db: Session, data: ProductCreate) -> Producto:
    _validate_category(db, data.id_categoria)

    if repository.get_by_sku(db, data.sku):
        raise AppException(
            "Ya existe un producto con ese SKU.",
            409,
            "PRODUCT_SKU_ALREADY_EXISTS",
        )

    product = Producto(**data.model_dump())

    try:
        repository.create(db, product)
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo crear el producto por un conflicto de datos.",
            409,
            "PRODUCT_DATA_CONFLICT",
        ) from None


def update_product(
        db: Session,
        product_id: int,
        data: ProductUpdate,
) -> Producto:
    product = _get_or_404(db, product_id)
    changes = data.model_dump(exclude_unset=True)

    if not changes:
        raise AppException(
            "Debes proporcionar al menos un campo para actualizar.",
            400,
            "EMPTY_UPDATE",
        )

    for field in ("id_categoria", "sku", "nombre", "precio_base", "controlar_stock"):
        if field in changes and changes[field] is None:
            raise AppException(
                f"El campo {field} no puede ser nulo.",
                422,
                "INVALID_PRODUCT_FIELD",
            )

    if "id_categoria" in changes:
        _validate_category(db, changes["id_categoria"])

    if "sku" in changes:
        existing = repository.get_by_sku(
            db, changes["sku"], exclude_id=product_id
        )
        if existing:
            raise AppException(
                "Ya existe un producto con ese SKU.",
                409,
                "PRODUCT_SKU_ALREADY_EXISTS",
            )

    for field, value in changes.items():
        setattr(product, field, value)

    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo actualizar el producto por un conflicto de datos.",
            409,
            "PRODUCT_DATA_CONFLICT",
        ) from None


def deactivate_product(db: Session, product_id: int) -> Producto:
    product = _get_or_404(db, product_id)

    if not product.activo:
        return product

    product.activo = False

    try:
        db.commit()
        db.refresh(product)
        return product
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo desactivar el producto.",
            409,
            "PRODUCT_DEACTIVATION_CONFLICT",
        ) from None
