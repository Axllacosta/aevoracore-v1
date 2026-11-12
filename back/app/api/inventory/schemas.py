from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.database.enums import TipoMovimiento, DireccionAjuste


class InventoryItemResponse(BaseModel):
    id_producto: int
    sku: str
    nombre: str
    stock_actual: int
    stock_minimo: int
    fecha_actualizacion: datetime | None
    stock_bajo: bool


class ManualMovementCreate(BaseModel):
    id_producto: int = Field(gt=0)
    tipo_movimiento: TipoMovimiento
    cantidad: int = Field(gt=0)
    motivo: str = Field(min_length=3, max_length=1000)

    @field_validator("motivo")
    @classmethod
    def clean_motivo(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("El motivo debe tener al menos 3 caracteres.")
        return value

    @model_validator(mode="after")
    def validate_type(self):
        if self.tipo_movimiento == TipoMovimiento.AJUSTE:
            raise ValueError(
                "Los ajustes deben registrarse mediante el endpoint de ajustes."
            )
        return self


class InventoryAdjustmentCreate(BaseModel):
    id_producto: int = Field(gt=0)
    direccion_ajuste: DireccionAjuste
    cantidad: int = Field(gt=0)
    motivo: str = Field(min_length=3, max_length=1000)

    @field_validator("motivo")
    @classmethod
    def clean_motivo(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 3:
            raise ValueError("El motivo debe tener al menos 3 caracteres.")
        return value


class InventoryMinimumUpdate(BaseModel):
    stock_minimo: int = Field(ge=0)


class MovementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_movimiento: int
    id_producto: int
    id_usuario: int
    id_detalle_venta: int | None
    id_venta_cancelada: int | None
    tipo_movimiento: TipoMovimiento
    direccion_ajuste: DireccionAjuste | None
    cantidad: int
    stock_anterior: int
    stock_posterior: int
    motivo: str | None
    fecha_hora: datetime