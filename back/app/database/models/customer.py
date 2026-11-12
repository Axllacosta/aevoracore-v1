from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.database.models.sales import Venta


class Cliente(Base, TimestampMixin):
    __tablename__ = "clientes"

    id_cliente: Mapped[int] = mapped_column(primary_key=True)
    tipo_persona: Mapped[str] = mapped_column(String(10), default="NATURAL", server_default="NATURAL")
    razon_social: Mapped[str | None] = mapped_column(String(200))
    direccion_fiscal: Mapped[str | None] = mapped_column(String(500))
    dni: Mapped[str | None] = mapped_column(String(8), unique=True)
    ruc: Mapped[str | None] = mapped_column(String(11), unique=True)
    correo: Mapped[str | None] = mapped_column(String(160))
    telefono: Mapped[str | None] = mapped_column(String(9))
    nombres: Mapped[str | None] = mapped_column(String(100))
    apellidos: Mapped[str | None] = mapped_column(String(100))
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    ventas: Mapped[list["Venta"]] = relationship(back_populates="cliente")
