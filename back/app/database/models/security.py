from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.database.mixins import TimestampMixin


class Rol(Base):
    __tablename__ = "roles"

    id_rol: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    usuarios: Mapped[list["Usuario"]] = relationship(back_populates="rol")


class Usuario(Base, TimestampMixin):
    __tablename__ = "usuarios"

    id_usuario: Mapped[int] = mapped_column(primary_key=True)
    id_rol: Mapped[int] = mapped_column(ForeignKey("roles.id_rol"), nullable=False)
    dni: Mapped[str | None] = mapped_column(String(8), unique=True)
    nombres: Mapped[str] = mapped_column(String(100), nullable=False)
    apellidos: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    rol: Mapped["Rol"] = relationship(back_populates="usuarios")
    autorizacion_ajuste: Mapped["AutorizacionAjusteInventario | None"] = relationship(
        back_populates="usuario",
        uselist=False,
        foreign_keys="AutorizacionAjusteInventario.id_usuario",
    )


class AutorizacionAjusteInventario(Base, TimestampMixin):
    __tablename__ = "autorizaciones_ajuste_inventario"

    id_usuario: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id_usuario", ondelete="CASCADE"),
        primary_key=True,
    )
    autorizado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    actualizado_por: Mapped[int | None] = mapped_column(
        ForeignKey("usuarios.id_usuario"),
        nullable=True,
    )

    usuario: Mapped["Usuario"] = relationship(
        back_populates="autorizacion_ajuste",
        foreign_keys=[id_usuario],
    )
    administrador_actualizador: Mapped["Usuario | None"] = relationship(
        foreign_keys=[actualizado_por],
    )
