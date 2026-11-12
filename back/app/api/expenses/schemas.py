from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ExpenseCategoryCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)

    @field_validator("nombre")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split()).upper()
        if not value:
            raise ValueError("El nombre de la categoría es obligatorio.")
        return value


class ExpenseCategoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_categoria_gasto: int
    nombre: str
    requiere_descripcion: bool


class ExpenseCreate(BaseModel):
    id_categoria_gasto: int = Field(gt=0)
    fecha: date
    importe: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    descripcion: str | None = Field(default=None, max_length=1000)

    @field_validator("descripcion")
    @classmethod
    def clean_description(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class ExpenseResponse(ExpenseCreate):
    model_config = ConfigDict(from_attributes=True)
    id_gasto: int
    id_usuario: int
    activo: bool
    categoria: ExpenseCategoryResponse
    created_at: datetime
    updated_at: datetime


class CategoryTotal(BaseModel):
    id_categoria_gasto: int
    nombre: str
    total: Decimal


class MonthlySummary(BaseModel):
    anio: int
    mes: int
    ventas_confirmadas: Decimal
    gastos: Decimal
    resultado_estimado: Decimal
    cantidad_gastos: int
    por_categoria: list[CategoryTotal]
