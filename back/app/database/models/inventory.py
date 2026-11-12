from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer, Enum as SAEnum, Text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import TimestampMixin, utc_now
from app.database.enums import DireccionAjuste, TipoMovimiento

if TYPE_CHECKING:
    from app.database.models.catalog import Producto
    from app.database.models.sales import Venta, DetalleVenta
    from app.database.models.security import Usuario


class Inventario(Base, TimestampMixin):
    __tablename__ = "inventarios"
    __table_args__ = (
        CheckConstraint("stock_minimo >= 0", name="ck_inventario_stock_minimo_no_negativo"),
    )

    id_inventario: Mapped[int] = mapped_column(primary_key=True)
    id_producto: Mapped[int] = mapped_column(
        ForeignKey("productos.id_producto"),
        unique=True,
        nullable=False,
    )
    stock_actual: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stock_minimo: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    producto: Mapped["Producto"] = relationship(back_populates="inventario")


class MovimientoInventario(Base):
    __tablename__ = "movimientos_inventario"
    __table_args__ = (
        CheckConstraint("cantidad > 0", name="ck_movimiento_cantidad_positiva"),
        CheckConstraint(
            """
            (
                tipo_movimiento = 'AJUSTE'
                AND direccion_ajuste IS NOT NULL
            )
            OR
            (
                tipo_movimiento IN ('ENTRADA', 'SALIDA')
                AND direccion_ajuste IS NULL
            )
            """,
            name="ck_movimiento_direccion_segun_tipo",
        ),
        CheckConstraint(
            """
            (
                tipo_movimiento = 'AJUSTE'
                AND id_detalle_venta IS NULL
            )
            OR tipo_movimiento <> 'AJUSTE'
            """,
            name="ck_movimiento_ajuste_sin_detalle_venta",
        ),
    )

    id_movimiento: Mapped[int] = mapped_column(primary_key=True)
    id_producto: Mapped[int] = mapped_column(ForeignKey("productos.id_producto"), nullable=False)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    id_detalle_venta: Mapped[int | None] = mapped_column(
        ForeignKey("detalles_venta.id_detalle_venta"),
        nullable=True,
    )
    id_venta_cancelada: Mapped[int | None] = mapped_column(
        ForeignKey("ventas.id_venta"),
        nullable=True,
    )
    tipo_movimiento: Mapped[TipoMovimiento] = mapped_column(
        SAEnum(TipoMovimiento, native_enum=False, create_constraint=True),
        nullable=False,
    )
    direccion_ajuste: Mapped[DireccionAjuste | None] = mapped_column(
        SAEnum(DireccionAjuste, native_enum=False, create_constraint=True),
        nullable=True,
    )
    cantidad: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_anterior: Mapped[int] = mapped_column(Integer, nullable=False)
    stock_posterior: Mapped[int] = mapped_column(Integer, nullable=False)
    motivo: Mapped[str | None] = mapped_column(Text)
    fecha_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    producto: Mapped["Producto"] = relationship(back_populates="movimientos")
    usuario: Mapped["Usuario"] = relationship()
    detalle_venta: Mapped["DetalleVenta | None"] = relationship(
        back_populates="movimientos_inventario",
        foreign_keys=[id_detalle_venta],
    )
    venta_cancelada: Mapped["Venta | None"] = relationship(
        back_populates="movimientos_reversion",
        foreign_keys=[id_venta_cancelada],
    )