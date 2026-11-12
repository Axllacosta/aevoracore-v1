from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.product_categories import repository
from app.api.product_categories.schemas import CategoryCreate, CategoryUpdate
from app.common.pagination import (
    PaginatedResponse,
    PaginationParams,
    paginate_query,
)
from app.core.exceptions import AppException
from app.database.models.catalog import Categoria


def _get_or_404(db: Session, category_id: int) -> Categoria:
    category = repository.get_by_id(db, category_id)
    if category is None:
        raise AppException(
            "La categoría no existe.", 404, "CATEGORY_NOT_FOUND"
        )
    return category


def list_categories(
        db: Session,
        pagination: PaginationParams,
        search: str | None,
        activo: bool | None,
) -> PaginatedResponse:
    statement = repository.list_categories(db, search, activo)
    return paginate_query(db, statement, pagination)


def get_category(db: Session, category_id: int) -> Categoria:
    return _get_or_404(db, category_id)


def create_category(db: Session, data: CategoryCreate) -> Categoria:
    if repository.get_by_name(db, data.nombre):
        raise AppException(
            "Ya existe una categoría con ese nombre.",
            409,
            "CATEGORY_ALREADY_EXISTS",
        )

    category = Categoria(
        nombre=data.nombre,
        descripcion=data.descripcion,
        activo=True,
    )

    try:
        repository.create(db, category)
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo crear la categoría por un conflicto de datos.",
            409,
            "CATEGORY_DATA_CONFLICT",
        ) from None


def update_category(
        db: Session,
        category_id: int,
        data: CategoryUpdate,
) -> Categoria:
    category = _get_or_404(db, category_id)
    changes = data.model_dump(exclude_unset=True)

    if not changes:
        raise AppException(
            "Debes proporcionar al menos un campo para actualizar.",
            400,
            "EMPTY_UPDATE",
        )

    if "nombre" in changes:
        if changes["nombre"] is None:
            raise AppException(
                "El nombre no puede ser nulo.",
                422,
                "INVALID_CATEGORY_NAME",
            )

        existing = repository.get_by_name(db, changes["nombre"])
        if existing and existing.id_categoria != category_id:
            raise AppException(
                "Ya existe una categoría con ese nombre.",
                409,
                "CATEGORY_ALREADY_EXISTS",
            )

    if (
            changes.get("activo") is False
            and category.activo
            and repository.has_active_products(db, category_id)
    ):
        raise AppException(
            "No puedes desactivar una categoría con productos activos.",
            409,
            "CATEGORY_HAS_ACTIVE_PRODUCTS",
        )

    for field, value in changes.items():
        setattr(category, field, value)

    try:
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo actualizar la categoría por un conflicto de datos.",
            409,
            "CATEGORY_DATA_CONFLICT",
        ) from None


def deactivate_category(db: Session, category_id: int) -> Categoria:
    category = _get_or_404(db, category_id)

    if not category.activo:
        return category

    if repository.has_active_products(db, category_id):
        raise AppException(
            "No puedes desactivar una categoría con productos activos.",
            409,
            "CATEGORY_HAS_ACTIVE_PRODUCTS",
        )

    category.activo = False
    db.commit()
    db.refresh(category)
    return category
