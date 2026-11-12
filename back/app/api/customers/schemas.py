from datetime import datetime
from unicodedata import category
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class CustomerFields(BaseModel):
    tipo_persona: Literal["NATURAL", "JURIDICA"] = "NATURAL"
    razon_social: str | None = Field(default=None, min_length=1, max_length=200)
    direccion_fiscal: str | None = Field(default=None, min_length=1, max_length=500)
    dni: str | None = Field(default=None, pattern=r"^[0-9]{8}$")
    ruc: str | None = Field(default=None, pattern=r"^[0-9]{11}$")
    correo: EmailStr | None = Field(default=None, max_length=160)
    telefono: str | None = Field(default=None, pattern=r"^[0-9]{9}$")

    @field_validator("dni", "ruc", "correo", "telefono", "razon_social", "direccion_fiscal", mode="before")
    @classmethod
    def clean_optional(cls, value):
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("nombres", "apellidos", mode="before", check_fields=False)
    @classmethod
    def clean_name(cls, value):
        if value is None or not isinstance(value, str):
            return value
        value = value.strip()
        if not value or not any(char.isalpha() for char in value):
            raise ValueError("Ingresa un nombre válido.")
        if any(not (char.isalpha() or category(char).startswith("M") or char in " '’-") for char in value):
            raise ValueError("Los nombres y apellidos solo pueden contener letras, espacios, guiones y apóstrofes.")
        return value


class CustomerCreate(CustomerFields):
    nombres: str | None = Field(default=None, min_length=1, max_length=100)
    apellidos: str | None = Field(default=None, min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_identity(self):
        if self.tipo_persona == "JURIDICA":
            if not self.ruc or not self.razon_social:
                raise ValueError("Una empresa requiere RUC y razón social.")
        elif not all((self.dni, self.nombres, self.apellidos, self.telefono)):
            raise ValueError("Una persona natural requiere DNI, nombres, apellidos y teléfono.")
        return self


class CustomerUpdate(CustomerFields):
    tipo_persona: Literal["NATURAL", "JURIDICA"] | None = None
    nombres: str | None = Field(default=None, min_length=1, max_length=100)
    apellidos: str | None = Field(default=None, min_length=1, max_length=100)
    activo: bool | None = None

class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_cliente: int
    tipo_persona: str
    razon_social: str | None
    direccion_fiscal: str | None
    dni: str | None
    ruc: str | None
    correo: str | None
    telefono: str | None
    nombres: str | None
    apellidos: str | None
    activo: bool
    created_at: datetime
    updated_at: datetime
