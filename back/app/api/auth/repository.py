from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database.models.security import Rol, Usuario


def get_user_by_email(db: Session, email: str) -> Usuario | None:
    statement = (
        select(Usuario)
        .options(joinedload(Usuario.rol))
        .where(Usuario.email == email)
    )
    return db.scalar(statement)


def get_user_by_id(db: Session, user_id: int) -> Usuario | None:
    statement = (
        select(Usuario)
        .options(joinedload(Usuario.rol))
        .where(Usuario.id_usuario == user_id)
    )
    return db.scalar(statement)


def get_role_by_name(db: Session, role_name: str) -> Rol | None:
    statement = select(Rol).where(Rol.nombre == role_name)
    return db.scalar(statement)


def create_user(db: Session, user: Usuario) -> Usuario:
    db.add(user)
    db.flush()
    return user