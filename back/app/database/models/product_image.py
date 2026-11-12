from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import TimestampMixin


class ImagenProducto(Base, TimestampMixin):
    __tablename__ = "imagenes_productos"

    __table_args__ = ()

    id_imagen: Mapped[int] = mapped_column(primary_key=True)

    id_producto: Mapped[int] = mapped_column(
        ForeignKey("productos.id_producto", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    url_imagen: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    nombre_archivo: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    orden: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )

    es_principal: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    producto: Mapped["Producto"] = relationship(
        back_populates="imagenes",
    )