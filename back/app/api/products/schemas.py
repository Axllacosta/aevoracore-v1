from datetime import datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    computed_field,
)


class ProductCreate(BaseModel):
    controlar_stock: bool = True
    id_categoria: int = Field(gt=0)
    sku: str = Field(min_length=1, max_length=60)
    nombre: str = Field(min_length=1, max_length=160)
    descripcion: str | None = None
    color: str | None = Field(default=None, max_length=60)
    acabado: str | None = Field(default=None, max_length=80)
    material: str | None = Field(default=None, max_length=100)
    alto: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    ancho: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    profundidad: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    precio_base: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    costo_referencia: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, value: str) -> str:
        value = value.strip().upper()
        if not value:
            raise ValueError("El SKU no puede estar vacío.")
        return value

    @field_validator("nombre")
    @classmethod
    def normalize_nombre(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El nombre no puede estar vacío.")
        return value

    @field_validator("descripcion", "color", "acabado", "material")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class ProductUpdate(BaseModel):
    controlar_stock: bool | None = None
    id_categoria: int | None = Field(default=None, gt=0)
    sku: str | None = Field(default=None, min_length=1, max_length=60)
    nombre: str | None = Field(default=None, min_length=1, max_length=160)
    descripcion: str | None = None
    color: str | None = Field(default=None, max_length=60)
    acabado: str | None = Field(default=None, max_length=80)
    material: str | None = Field(default=None, max_length=100)
    alto: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    ancho: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    profundidad: Decimal | None = Field(default=None, gt=0, max_digits=8, decimal_places=2)
    precio_base: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    costo_referencia: Decimal | None = Field(
        default=None, ge=0, max_digits=12, decimal_places=2
    )
    activo: bool | None = None

    @field_validator("sku")
    @classmethod
    def normalize_sku(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip().upper()
        if not value:
            raise ValueError("El SKU no puede estar vacío.")
        return value

    @field_validator("nombre")
    @classmethod
    def normalize_nombre(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("El nombre no puede estar vacío.")
        return value

    @field_validator("descripcion", "color", "acabado", "material")
    @classmethod
    def clean_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class ProductImageUpdate(BaseModel):
    orden: int | None = Field(default=None, ge=1)
    es_principal: bool | None = None


class ProductImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_imagen: int
    url_imagen: str
    nombre_archivo: str
    orden: int
    es_principal: bool

    @field_serializer("url_imagen")
    def serialize_url_imagen(self, object_key: str) -> str:
        from app.infrastructure.storage.image_storage import get_image_url

        return get_image_url(object_key)


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_producto: int
    id_categoria: int
    sku: str
    nombre: str
    descripcion: str | None
    color: str | None
    acabado: str | None
    material: str | None
    alto: Decimal | None
    ancho: Decimal | None
    profundidad: Decimal | None
    precio_base: Decimal
    costo_referencia: Decimal | None
    activo: bool
    controlar_stock: bool
    imagenes: list[ProductImageResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class PublicProductImageResponse(ProductImageResponse):
    @field_serializer("url_imagen")
    def serialize_url_imagen(self, object_key: str) -> str:
        from app.infrastructure.storage.catalog_images import public_image_url
        return public_image_url(self.id_imagen, object_key, 1200)

    @computed_field
    @property
    def url_miniatura(self) -> str:
        from app.infrastructure.storage.catalog_images import public_image_url
        return public_image_url(self.id_imagen, self.url_imagen, 480)


class PublicProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_producto: int
    id_categoria: int
    sku: str
    nombre: str
    descripcion: str | None
    color: str | None
    acabado: str | None
    material: str | None
    alto: Decimal | None
    ancho: Decimal | None
    profundidad: Decimal | None
    precio_base: Decimal
    imagenes: list[PublicProductImageResponse] = Field(default_factory=list)



class PublicCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_categoria: int
    nombre: str
