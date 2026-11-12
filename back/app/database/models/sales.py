from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.enums import CanalVenta, EstadoVenta
from app.database.mixins import utc_now, TimestampMixin

if TYPE_CHECKING:
    from app.database.models.catalog import Producto
    from app.database.models.security import Usuario
    from app.database.models.inventory import MovimientoInventario
    from app.database.models.customer import Cliente
    from app.database.models.payment import Pago

class Venta(Base, TimestampMixin):
    __tablename__ = "ventas"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_venta_subtotal_no_negativo"),
        CheckConstraint("descuento_total >= 0", name="ck_venta_descuento_no_negativo"),
        CheckConstraint("total >= 0", name="ck_venta_total_no_negativo"),
        CheckConstraint(
            "descuento_total <= subtotal",
            name="ck_venta_descuento_no_supera_subtotal",
        ),
        CheckConstraint(
            "total = subtotal - descuento_total",
            name="ck_venta_total_consistente",
        ),
    )

    id_venta: Mapped[int] = mapped_column(primary_key=True)
    clave_idempotencia: Mapped[str | None] = mapped_column(String(36), unique=True)
    hash_solicitud: Mapped[str | None] = mapped_column(String(64))
    id_cliente: Mapped[int] = mapped_column(ForeignKey("clientes.id_cliente"), nullable=False)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    canal_venta: Mapped[CanalVenta] = mapped_column(
        SAEnum(CanalVenta, native_enum=False, create_constraint=True),
        nullable=False,
    )
    estado: Mapped[EstadoVenta] = mapped_column(
        SAEnum(EstadoVenta, native_enum=False, create_constraint=True),
        default=EstadoVenta.CONFIRMADA,
        nullable=False,
    )
    fecha_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    descuento_total: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    motivo_cancelacion: Mapped[str | None] = mapped_column(Text)
    fecha_cancelacion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    cliente: Mapped["Cliente"] = relationship(back_populates="ventas")
    usuario: Mapped["Usuario"] = relationship()
    detalles: Mapped[list["DetalleVenta"]] = relationship(
        back_populates="venta",
        cascade="save-update, merge",
        passive_deletes=True,
    )
    pagos: Mapped[list["Pago"]] = relationship(back_populates="venta", order_by="Pago.id_pago")
    comprobante: Mapped["Comprobante | None"] = relationship(back_populates="venta", uselist=False)
    movimientos_reversion: Mapped[list["MovimientoInventario"]] = relationship(
        back_populates="venta_cancelada",
        foreign_keys="MovimientoInventario.id_venta_cancelada",
    )


class DetalleVenta(Base):
    __tablename__ = "detalles_venta"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_detalle_cantidad_positiva"),
        CheckConstraint("precio_unitario_base >= 0", name="ck_detalle_precio_no_negativo"),
        CheckConstraint("descuento_porcentaje >= 0 AND descuento_porcentaje <= 100", name="ck_detalle_porcentaje_descuento"),
        CheckConstraint("descuento_importe >= 0", name="ck_detalle_descuento_no_negativo"),
        CheckConstraint("subtotal_linea >= 0 AND total_linea >= 0", name="ck_detalle_importes_no_negativos"),
        CheckConstraint(
            "descuento_importe <= subtotal_linea",
            name="ck_detalle_descuento_no_supera_subtotal",
        ),
        CheckConstraint(
            "total_linea = subtotal_linea - descuento_importe",
            name="ck_detalle_total_consistente",
        ),
    )

    id_detalle_venta: Mapped[int] = mapped_column(primary_key=True)
    id_venta: Mapped[int] = mapped_column(ForeignKey("ventas.id_venta"), nullable=False)
    id_producto: Mapped[int] = mapped_column(ForeignKey("productos.id_producto"), nullable=False)
    cantidad: Mapped[int] = mapped_column(nullable=False)
    precio_unitario_base: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    # Referencia histórica; las nuevas ventas persisten solo descuento_importe.
    descuento_porcentaje: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    descuento_importe: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    subtotal_linea: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    total_linea: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    venta: Mapped["Venta"] = relationship(back_populates="detalles")
    producto: Mapped["Producto"] = relationship(back_populates="detalles_venta")
    movimientos_inventario: Mapped[list["MovimientoInventario"]] = relationship(
        back_populates="detalle_venta",
        foreign_keys="MovimientoInventario.id_detalle_venta",
    )
