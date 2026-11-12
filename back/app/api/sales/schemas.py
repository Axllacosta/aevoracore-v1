from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.database.enums import (
    CanalVenta,
    EstadoVenta,
    EstadoPago,
    MedioPago,
)


# DETALLES DE LA VENTA

class SaleDetailCreate(BaseModel):
    # Datos que el cliente envía para cada producto vendido.

    id_producto: int = Field(gt=0)
    cantidad: int = Field(gt=0)
    descuento_porcentaje: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
        max_digits=5,
        decimal_places=2,
    )

    descuento_importe: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)

    @model_validator(mode="after")
    def validate_discount_mode(self):
        if self.descuento_porcentaje is not None and self.descuento_importe is not None:
            raise ValueError("Indica el descuento como porcentaje o como importe, no ambos.")
        return self


class SaleDetailResponse(BaseModel):
    # Detalle calculado y persistido por el backend.

    model_config = ConfigDict(from_attributes=True)

    id_detalle_venta: int
    id_producto: int
    cantidad: int
    precio_unitario_base: Decimal
    descuento_importe: Decimal
    subtotal_linea: Decimal
    total_linea: Decimal


# CREACIÓN DE VENTAS

class PaymentCreate(BaseModel):
    medio_pago: MedioPago
    importe: Decimal = Field(gt=0, max_digits=12, decimal_places=2)


class SaleCreate(BaseModel):
    # Solicitud para crear y confirmar una venta.

    id_cliente: int = Field(gt=0)
    tipo_comprobante: Literal["BOLETA", "FACTURA"] | None = None
    clave_idempotencia: UUID | None = None
    canal_venta: CanalVenta
    pagos: list[PaymentCreate] = Field(min_length=1, max_length=100)
    detalles: list[SaleDetailCreate] = Field(
        min_length=1,
        max_length=100,
    )

    @model_validator(mode="after")
    def validate_unique_products(self):
        product_ids = [
            detail.id_producto
            for detail in self.detalles
        ]

        if len(product_ids) != len(set(product_ids)):
            raise ValueError(
                "Cada producto debe aparecer una sola vez "
                "en los detalles de la venta."
            )

        return self


# PAGOS

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pago: int
    id_venta: int
    medio_pago: MedioPago
    importe: Decimal
    estado: EstadoPago
    fecha_hora: datetime
    fecha_reversion: datetime | None
    motivo_reversion: str | None


# RESPUESTA COMPLETA DE UNA VENTA

class SaleDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id_comprobante: int
    tipo: str
    serie: str
    correlativo: int
    fecha_emision: datetime
    receptor_nombre: str


class SaleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_venta: int
    id_cliente: int
    id_usuario: int
    canal_venta: CanalVenta
    estado: EstadoVenta
    fecha_hora: datetime

    subtotal: Decimal
    descuento_total: Decimal
    total: Decimal

    motivo_cancelacion: str | None
    fecha_cancelacion: datetime | None

    detalles: list[SaleDetailResponse]
    pagos: list[PaymentResponse]
    comprobante: SaleDocumentResponse | None = None


# CANCELACIÓN DE VENTAS

class SaleCancelRequest(BaseModel):
    motivo_cancelacion: str = Field(
        min_length=3,
        max_length=1000,
    )

    @field_validator("motivo_cancelacion")
    @classmethod
    def clean_cancellation_reason(cls, value: str) -> str:
        value = value.strip()

        if len(value) < 3:
            raise ValueError(
                "El motivo de cancelación debe tener "
                "al menos 3 caracteres."
            )

        return value
