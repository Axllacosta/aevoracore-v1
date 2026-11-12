from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CategoryCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    descripcion: str | None = None

    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("El nombre no puede estar vacío.")
        return value

    @field_validator("descripcion")
    @classmethod
    def clean_descripcion(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class CategoryUpdate(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    descripcion: str | None = None
    activo: bool | None = None

    @field_validator("nombre")
    @classmethod
    def validate_nombre(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("El nombre no puede estar vacío.")
        return value

    @field_validator("descripcion")
    @classmethod
    def clean_descripcion(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class CategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_categoria: int
    nombre: str
    descripcion: str | None
    activo: bool
    created_at: datetime
    updated_at: datetime
