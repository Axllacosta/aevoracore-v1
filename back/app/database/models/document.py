from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import TimestampMixin, utc_now


class Emisor(Base, TimestampMixin):
    __tablename__ = "emisores"
    id_emisor: Mapped[int] = mapped_column(primary_key=True)
    ruc: Mapped[str] = mapped_column(String(11), unique=True)
    razon_social: Mapped[str] = mapped_column(String(200))
    direccion: Mapped[str] = mapped_column(String(500))


class TipoComprobante(Base):
    __tablename__ = "tipos_comprobante"
    __table_args__ = (CheckConstraint("codigo IN ('BOLETA', 'FACTURA')", name="ck_tipo_comprobante_codigo"),)
    id_tipo_comprobante: Mapped[int] = mapped_column(primary_key=True)
    codigo: Mapped[str] = mapped_column(String(20), unique=True)


class SerieComprobante(Base):
    __tablename__ = "series_comprobante"
    __table_args__ = (
        UniqueConstraint("id_emisor", "id_tipo_comprobante", name="uq_serie_emisor_tipo"),
        CheckConstraint("ultimo_correlativo >= 0", name="ck_serie_correlativo"),
    )
    id_serie: Mapped[int] = mapped_column(primary_key=True)
    id_emisor: Mapped[int] = mapped_column(ForeignKey("emisores.id_emisor"))
    id_tipo_comprobante: Mapped[int] = mapped_column(ForeignKey("tipos_comprobante.id_tipo_comprobante"))
    serie: Mapped[str] = mapped_column(String(20))
    ultimo_correlativo: Mapped[int] = mapped_column(default=0)
    tipo: Mapped[TipoComprobante] = relationship(lazy="joined")


class Comprobante(Base):
    __tablename__ = "comprobantes"
    __table_args__ = (
        UniqueConstraint("id_serie", "correlativo", name="uq_comprobante_numero"),
        CheckConstraint("correlativo > 0", name="ck_comprobante_correlativo"),
        CheckConstraint("subtotal >= 0 AND descuento_total >= 0 AND total > 0 AND total = subtotal - descuento_total", name="ck_comprobante_importes"),
    )
    id_comprobante: Mapped[int] = mapped_column(primary_key=True)
    id_venta: Mapped[int] = mapped_column(ForeignKey("ventas.id_venta"), unique=True)
    id_serie: Mapped[int] = mapped_column(ForeignKey("series_comprobante.id_serie"), index=True)
    id_usuario_emisor: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"))
    # Identity and presentation are copied, not resolved from current catalog data.
    tipo: Mapped[str] = mapped_column(String(20))
    serie: Mapped[str] = mapped_column(String(20))
    correlativo: Mapped[int]
    fecha_emision: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    moneda: Mapped[str] = mapped_column(String(3), default="PEN")
    emisor_ruc: Mapped[str] = mapped_column(String(11))
    emisor_razon_social: Mapped[str] = mapped_column(String(200))
    emisor_direccion: Mapped[str] = mapped_column(String(500))
    receptor_tipo_documento: Mapped[str] = mapped_column(String(10))
    receptor_numero_documento: Mapped[str | None] = mapped_column(String(20))
    receptor_nombre: Mapped[str] = mapped_column(String(200))
    receptor_direccion: Mapped[str | None] = mapped_column(String(500))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    descuento_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    version_plantilla: Mapped[str] = mapped_column(String(20), default="local-v1")
    venta: Mapped["Venta"] = relationship(back_populates="comprobante")
    detalles: Mapped[list["DetalleComprobante"]] = relationship(order_by="DetalleComprobante.numero_linea")


class DetalleComprobante(Base):
    __tablename__ = "detalles_comprobante"
    __table_args__ = (
        UniqueConstraint("id_comprobante", "numero_linea", name="uq_comprobante_linea"),
        CheckConstraint("cantidad > 0 AND numero_linea > 0", name="ck_comprobante_linea_cantidad"),
        CheckConstraint("precio_unitario >= 0 AND subtotal >= 0 AND descuento >= 0 AND total >= 0 AND total = subtotal - descuento", name="ck_comprobante_linea_importes"),
    )
    id_detalle_comprobante: Mapped[int] = mapped_column(primary_key=True)
    id_comprobante: Mapped[int] = mapped_column(ForeignKey("comprobantes.id_comprobante"), index=True)
    id_detalle_venta: Mapped[int] = mapped_column(ForeignKey("detalles_venta.id_detalle_venta"), unique=True)
    numero_linea: Mapped[int]
    sku: Mapped[str] = mapped_column(String(60))
    descripcion: Mapped[str] = mapped_column(Text)
    unidad_medida: Mapped[str] = mapped_column(String(20), default="UNIDAD")
    cantidad: Mapped[int]
    precio_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    descuento: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
