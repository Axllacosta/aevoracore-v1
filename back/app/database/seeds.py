from sqlalchemy import select

from app.core.config import settings
from app.database.connection import SessionLocal
from app.database.models.security import (
    Rol,
    Usuario,
    AutorizacionAjusteInventario,
)
from app.core.security import hash_password


ROLES_INICIALES = [
    {
        "nombre": "ADMIN",
        "descripcion": "Administrador del sistema",
    },
    {
        "nombre": "EMPLEADO",
        "descripcion": "Usuario operativo del sistema",
    },
]


def seed_roles(db):
    roles = {}

    for data in ROLES_INICIALES:
        rol = db.scalar(
            select(Rol).where(Rol.nombre == data["nombre"])
        )

        if rol is None:
            rol = Rol(**data)
            db.add(rol)
            db.flush()

        roles[rol.nombre] = rol

    return roles


def seed_admin(db, rol_admin):
    email = settings.SEED_ADMIN_EMAIL
    password = settings.SEED_ADMIN_PASSWORD

    if not email or not password:
        raise ValueError(
            "Configura SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD."
        )

    usuario = db.scalar(
        select(Usuario).where(Usuario.email == email)
    )

    if usuario is None:
        usuario = Usuario(
            id_rol=rol_admin.id_rol,
            nombres="Administrador",
            apellidos="Sistema",
            email=email,
            password_hash=hash_password(password),
            activo=True,
        )
        db.add(usuario)
        db.flush()

    elif usuario.id_rol != rol_admin.id_rol:
        raise ValueError(
            "El correo configurado ya existe con otro rol. "
            "No se modificó el usuario existente."
        )

    autorizacion = db.get(
        AutorizacionAjusteInventario,
        usuario.id_usuario,
    )

    if autorizacion is None:
        db.add(
            AutorizacionAjusteInventario(
                id_usuario=usuario.id_usuario,
                autorizado=True,
                actualizado_por=None,
            )
        )

    return usuario


def ejecutar_seeds():
    with SessionLocal() as db:
        try:
            roles = seed_roles(db)
            admin = seed_admin(db, roles["ADMIN"])
            db.commit()

            print("Seeds ejecutados correctamente.")
            print(f"Roles iniciales: {len(roles)}")
            print(f"Administrador: {admin.email}")

        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    ejecutar_seeds()
