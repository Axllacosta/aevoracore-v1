from hashlib import sha256
from io import BytesIO
from threading import Lock

from botocore.exceptions import ClientError
from PIL import Image, ImageOps

from app.core.config import settings
from app.infrastructure.storage.minio_client import minio_client

WIDTHS = (480, 1200)
CACHE_CONTROL = "public, max-age=86400, immutable"
_locks = [Lock() for _ in range(32)]


def image_version(object_key: str) -> str:
    # Actualiza el perfil al modificar la configuración de codificación para invalidar las URL antiguas.
    return sha256(f"webp-v1:{object_key}".encode()).hexdigest()[:24]


def variant_key(object_key: str, width: int) -> str:
    if width not in WIDTHS:
        raise ValueError("Unsupported image size")
    return f"catalog-variants/{image_version(object_key)}/{width}.webp"


def public_image_url(image_id: int, object_key: str, width: int) -> str:
    return f"/products/catalog/images/{image_id}/{image_version(object_key)}/{width}.webp"


def encode_variants(file_obj) -> dict[int, bytes]:
    file_obj.seek(0)
    try:
        with Image.open(file_obj) as source:
            source.seek(0)
            oriented = ImageOps.exif_transpose(source)
            variants = {}
            for width in WIDTHS:
                image = oriented.copy()
                image.thumbnail((width, width), Image.Resampling.LANCZOS, reducing_gap=3.0)
                image = image.convert("RGBA" if "A" in image.getbands() or "transparency" in image.info else "RGB")
                output = BytesIO()
                image.save(output, format="WEBP", quality=80, method=4)
                variants[width] = output.getvalue()
            return variants
    except (OSError, Image.DecompressionBombError) as exc:
        raise ValueError("No se pudo optimizar la imagen.") from exc
    finally:
        file_obj.seek(0)


def save_variants(object_key: str, variants: dict[int, bytes]) -> None:
    for width, data in variants.items():
        minio_client.put_object(
            Bucket=settings.MINIO_BUCKET, Key=variant_key(object_key, width),
            Body=data, ContentType="image/webp", CacheControl=CACHE_CONTROL,
        )


def _read(key: str) -> bytes:
    response = minio_client.get_object(Bucket=settings.MINIO_BUCKET, Key=key)
    body = response["Body"]
    try:
        return body.read()
    finally:
        body.close()


def get_variant(object_key: str, width: int) -> bytes:
    key = variant_key(object_key, width)
    # Evita la duplicación durante la generación inicial dentro de este proceso. MinIO conserva el
    # resultado entre los distintos trabajadores y reinicios; no se acumula caché de bytes de imágenes en la memoria RAM.
    with _locks[int(image_version(object_key)[:8], 16) % len(_locks)]:
        try:
            return _read(key)
        except ClientError as exc:
            if exc.response["Error"]["Code"] not in ("NoSuchKey", "404", "NotFound"):
                raise
        variants = encode_variants(BytesIO(_read(object_key)))
        save_variants(object_key, variants)
        return variants[width]
