from botocore.exceptions import BotoCoreError
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from fastapi import UploadFile

from app.api.products import image_repository as repository
from app.api.products.schemas import ProductImageUpdate
from app.core.exceptions import AppException
from app.database.models.product_image import ImagenProducto
from app.infrastructure.storage.image_storage import (
    upload_image,
    delete_image,
)


def _get_product_or_404(db: Session, product_id: int):
    product = repository.get_product(db, product_id)

    if product is None:
        raise AppException(
            "El producto no existe.",
            404,
            "PRODUCT_NOT_FOUND",
        )

    return product


def _get_image_or_404(
        db: Session,
        product_id: int,
        image_id: int,
) -> ImagenProducto:
    image = repository.get_image(db, image_id, product_id)

    if image is None:
        raise AppException(
            "La imagen no existe para este producto.",
            404,
            "PRODUCT_IMAGE_NOT_FOUND",
        )

    return image


def list_product_images(db: Session, product_id: int):
    _get_product_or_404(db, product_id)
    return repository.list_images(db, product_id)


def upload_product_image(
        db: Session,
        product_id: int,
        file: UploadFile,
        es_principal: bool = False,
):
    _get_product_or_404(db, product_id)

    try:
        object_key, _ = upload_image(
            file_obj=file.file,
            product_id=product_id,
        )

    except ValueError as exc:
        raise AppException(
            str(exc),
            422,
            "INVALID_PRODUCT_IMAGE",
        ) from exc

    except BotoCoreError as exc:
        raise AppException(
            "No se pudo almacenar la imagen.",
            502,
            "IMAGE_STORAGE_ERROR",
        ) from exc

    try:
        existing_images = repository.list_images(db, product_id)

        make_primary = es_principal or not existing_images

        if make_primary:
            repository.clear_primary(db, product_id)

        original_name = (
            (file.filename or "")
            .replace("\\", "/")
            .rsplit("/", 1)[-1]
        )

        if not original_name:
            original_name = object_key.rsplit("/", 1)[-1]

        image = ImagenProducto(
            id_producto=product_id,
            url_imagen=object_key,
            nombre_archivo=original_name[:255],
            orden=repository.get_next_order(db, product_id),
            es_principal=make_primary,
        )

        db.add(image)
        db.commit()
        db.refresh(image)

        return image

    except Exception as exc:
        db.rollback()

        try:
            delete_image(object_key)
        except BotoCoreError:
            pass

        if isinstance(exc, AppException):
            raise

        raise AppException(
            "No se pudo registrar la imagen del producto.",
            500,
            "PRODUCT_IMAGE_CREATE_ERROR",
        ) from exc


def update_product_image(
        db: Session,
        product_id: int,
        image_id: int,
        data: ProductImageUpdate,
):
    _get_product_or_404(db, product_id)
    image = _get_image_or_404(db, product_id, image_id)

    changes = data.model_dump(exclude_unset=True)

    if not changes:
        raise AppException(
            "Debes proporcionar al menos un campo para actualizar.",
            400,
            "EMPTY_UPDATE",
        )

    if any(value is None for value in changes.values()):
        raise AppException(
            "Los campos de actualización no pueden ser nulos.",
            422,
            "INVALID_IMAGE_UPDATE",
        )

    try:
        if changes.get("es_principal") is True:
            repository.clear_primary(
                db,
                product_id,
                exclude_image_id=image_id,
            )

        for field, value in changes.items():
            setattr(image, field, value)

        db.commit()
        db.refresh(image)

        return image

    except SQLAlchemyError as exc:
        db.rollback()
        raise AppException(
            "No se pudo actualizar la imagen.",
            500,
            "PRODUCT_IMAGE_UPDATE_ERROR",
        ) from exc

def delete_product_image(
        db: Session,
        product_id: int,
        image_id: int,
) -> None:
    _get_product_or_404(db, product_id)
    image = _get_image_or_404(db, product_id, image_id)

    object_key = image.url_imagen
    was_primary = image.es_principal

    try:
        db.delete(image)
        db.flush()

        remaining_images = repository.list_images(db, product_id)

        if was_primary and remaining_images:
            remaining_images[0].es_principal = True

        db.commit()

    except SQLAlchemyError as exc:
        db.rollback()
        raise AppException(
            "No se pudo eliminar el registro de la imagen.",
            500,
            "PRODUCT_IMAGE_DELETE_ERROR",
        ) from exc

    try:
        delete_image(object_key)

    except BotoCoreError as exc:
        raise AppException(
            "El registro fue eliminado, pero no se pudo eliminar el archivo del almacenamiento.",
            502,
            "IMAGE_STORAGE_DELETE_ERROR",
        ) from exc