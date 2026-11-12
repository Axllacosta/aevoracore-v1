from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.database.models.inventory import Inventario, MovimientoInventario
    from app.database.models.sales import DetalleVenta
    from app.database.models.product_image import ImagenProducto


class Categoria(Base, TimestampMixin):
    __tablename__ = "categorias"

    id_categoria: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    productos: Mapped[list["Producto"]] = relationship(back_populates="categoria")

class Producto(Base, TimestampMixin):
    __tablename__ = "productos"

    __table_args__ = (
        CheckConstraint(
            "precio_base >= 0",
            name="ck_producto_precio_no_negativo",
        ),
        CheckConstraint(
            "costo_referencia IS NULL OR costo_referencia >= 0",
            name="ck_producto_costo_no_negativo",
        ),
        CheckConstraint(
            "(alto IS NULL OR alto > 0) "
            "AND (ancho IS NULL OR ancho > 0) "
            "AND (profundidad IS NULL OR profundidad > 0)",
            name="ck_producto_dimensiones_positivas",
        ),
    )

    id_producto: Mapped[int] = mapped_column(primary_key=True)
    id_categoria: Mapped[int] = mapped_column(ForeignKey("categorias.id_categoria"), nullable=False)
    controlar_stock: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    sku: Mapped[str] = mapped_column(String(60), unique=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(160), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str | None] = mapped_column(String(60))
    acabado: Mapped[str | None] = mapped_column(String(80))
    material: Mapped[str | None] = mapped_column(String(100))
    alto: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    ancho: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    profundidad: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    precio_base: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    costo_referencia: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    categoria: Mapped["Categoria"] = relationship(back_populates="productos")
    inventario: Mapped["Inventario | None"] = relationship(
        back_populates="producto",
        uselist=False,
    )
    detalles_venta: Mapped[list["DetalleVenta"]] = relationship(back_populates="producto")
    movimientos: Mapped[list["MovimientoInventario"]] = relationship(back_populates="producto")
    imagenes: Mapped[list["ImagenProducto"]] = relationship(
        back_populates="producto",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="ImagenProducto.orden",
    )

