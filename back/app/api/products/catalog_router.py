from typing import Literal

from botocore.exceptions import BotoCoreError, ClientError
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.api.products import image_repository, service
from app.api.products.schemas import PublicCategoryResponse, PublicProductResponse
from app.common.pagination import PaginatedResponse, PaginationParams, get_pagination_params
from app.database.connection import get_db
from app.infrastructure.storage.catalog_images import CACHE_CONTROL, get_variant, image_version

router = APIRouter(prefix="/catalog")


@router.get("/categories", response_model=list[PublicCategoryResponse])
def public_categories(db: Session = Depends(get_db)):
    return service.list_public_categories(db)


@router.get("/images/{image_id}/{version}/{width}.webp", response_class=Response)
def public_catalog_image(
        image_id: int, version: str, width: Literal["480", "1200"], request: Request,
        db: Session = Depends(get_db),
):
    image = image_repository.get_public_image(db, image_id)
    if image is None or version != image_version(image.url_imagen):
        raise HTTPException(404, "Imagen no disponible", headers={"Cache-Control": "no-store"})
    etag = f'"{version}-{width}"'
    headers = {"Cache-Control": CACHE_CONTROL, "ETag": etag, "X-Content-Type-Options": "nosniff"}
    validators = request.headers.get("if-none-match", "").split(",")
    if any(value.strip().removeprefix("W/") in (etag, "*") for value in validators):
        return Response(status_code=304, headers=headers)
    try:
        data = get_variant(image.url_imagen, int(width))
    except ClientError as exc:
        missing = exc.response["Error"]["Code"] in ("NoSuchKey", "404", "NotFound")
        raise HTTPException(404 if missing else 503, "Imagen no disponible", headers={"Cache-Control": "no-store"}) from exc
    except (BotoCoreError, ValueError) as exc:
        raise HTTPException(503, "No pudimos cargar la imagen", headers={"Cache-Control": "no-store"}) from exc
    return Response(data, media_type="image/webp", headers=headers)


@router.get(
    "",
    response_model=PaginatedResponse[PublicProductResponse],
)
def public_catalog(
        search: str | None = Query(None, max_length=160),
        category_id: int | None = Query(None, gt=0),
        pagination: PaginationParams = Depends(get_pagination_params),
        db: Session = Depends(get_db),
):
    return service.list_public_catalog(
        db, pagination, search, category_id
    )
