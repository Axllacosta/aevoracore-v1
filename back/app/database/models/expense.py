from datetime import date
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import TimestampMixin


class CategoriaGasto(Base, TimestampMixin):
    __tablename__ = "categorias_gasto"

    id_categoria_gasto: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    requiere_descripcion: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Gasto(Base, TimestampMixin):
    __tablename__ = "gastos"
    __table_args__ = (CheckConstraint("importe > 0", name="ck_gasto_importe_positivo"),)

    id_gasto: Mapped[int] = mapped_column(primary_key=True)
    id_categoria_gasto: Mapped[int] = mapped_column(ForeignKey("categorias_gasto.id_categoria_gasto"), nullable=False)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario"), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    importe: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    categoria: Mapped[CategoriaGasto] = relationship()
