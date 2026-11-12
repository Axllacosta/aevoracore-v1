from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey, Text, Enum as SAEnum, Numeric, CheckConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import utc_now
from app.database.enums import MedioPago, EstadoPago

if TYPE_CHECKING:
    from app.database.models.sales import Venta


class Pago(Base):
    __tablename__ = "pagos"

    __table_args__ = (
        CheckConstraint(
            "importe > 0",
            name="ck_pago_importe_positivo",
        ),
    )

    id_pago: Mapped[int] = mapped_column(primary_key=True)
    id_venta: Mapped[int] = mapped_column(
        ForeignKey("ventas.id_venta"),
        index=True,
        nullable=False,
    )
    medio_pago: Mapped[MedioPago] = mapped_column(
        SAEnum(MedioPago, native_enum=False, create_constraint=True),
        nullable=False,
    )
    importe: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    estado: Mapped[EstadoPago] = mapped_column(
        SAEnum(EstadoPago, native_enum=False, create_constraint=True),
        default=EstadoPago.REGISTRADO,
        nullable=False,
    )
    fecha_hora: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    fecha_reversion: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    motivo_reversion: Mapped[str | None] = mapped_column(Text)

    venta: Mapped["Venta"] = relationship(back_populates="pagos")
