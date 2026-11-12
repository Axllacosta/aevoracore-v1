
from typing import BinaryIO
from uuid import uuid4

from app.core.config import settings
from app.infrastructure.storage.minio_client import minio_client
from app.infrastructure.storage.image_validator import validate_image
from app.infrastructure.storage.catalog_images import WIDTHS, encode_variants, save_variants, variant_key


def upload_image(
        file_obj: BinaryIO,
        product_id: int,
) -> tuple[str, str]:
    """
    Valida y sube una imagen de producto.

    Retorna:
        (object_key, content_type)
    """

    content_type, extension = validate_image(file_obj)
    variants = encode_variants(file_obj)

    object_key = (
        f"products/{product_id}/{uuid4().hex}.{extension}"
    )

    try:
        minio_client.upload_fileobj(
            Fileobj=file_obj,
            Bucket=settings.MINIO_BUCKET,
            Key=object_key,
            ExtraArgs={"ContentType": content_type},
        )
        save_variants(object_key, variants)
    except Exception:
        try:
            delete_image(object_key)
        except Exception:
            pass
        raise

    return object_key, content_type


def get_image_url(
        object_key: str,
        expires_in: int = 3600,
) -> str:
    """Genera una URL temporal para visualizar una imagen."""

    return minio_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": settings.MINIO_BUCKET,
            "Key": object_key,
        },
        ExpiresIn=expires_in,
    )


def delete_image(object_key: str) -> None:
    """Elimina una imagen de MinIO."""

    minio_client.delete_object(
        Bucket=settings.MINIO_BUCKET,
        Key=object_key,
    )
    for width in WIDTHS:
        minio_client.delete_object(Bucket=settings.MINIO_BUCKET, Key=variant_key(object_key, width))
