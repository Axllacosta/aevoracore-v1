from typing import BinaryIO

from PIL import Image, UnidentifiedImageError


MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB

ALLOWED_FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}


def validate_image(file_obj: BinaryIO) -> tuple[str, str]:
    """
    Valida el tamaño y formato real de una imagen.

    Retorna:
        (content_type, extension)
    """

    try:
        file_obj.seek(0, 2)
        file_size = file_obj.tell()

        if file_size == 0:
            raise ValueError("El archivo está vacío.")

        if file_size > MAX_IMAGE_SIZE_BYTES:
            raise ValueError("La imagen supera el límite de 5 MB.")

        file_obj.seek(0)

        with Image.open(file_obj) as image:
            image_format = image.format

            if image_format not in ALLOWED_FORMATS:
                raise ValueError(
                    "Formato no permitido. Usa JPEG, PNG o WebP."
                )

            image.verify()

        content_type, extension = ALLOWED_FORMATS[image_format]

        return content_type, extension

    except UnidentifiedImageError as exc:
        raise ValueError("El archivo no es una imagen válida.") from exc

    except Image.DecompressionBombError as exc:
        raise ValueError("La imagen tiene dimensiones excesivamente grandes.") from exc

    except OSError as exc:
        raise ValueError("No se pudo procesar la imagen.") from exc

    finally:
        file_obj.seek(0)
