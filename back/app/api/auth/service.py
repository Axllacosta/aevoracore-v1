from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.auth import repository
from app.api.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.core.exceptions import AppException
from app.core.jwt import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.security import hash_password, verify_password
from app.database.models.security import Usuario


def _build_user_response(user: Usuario) -> UserResponse:
    return UserResponse(
        id_usuario=user.id_usuario,
        nombres=user.nombres,
        apellidos=user.apellidos,
        email=user.email,
        dni=user.dni,
        activo=user.activo,
        rol=user.rol.nombre,
    )


def register_user(db: Session, data: RegisterRequest) -> UserResponse:
    email = str(data.email).strip().lower()

    if repository.get_user_by_email(db, email):
        raise AppException(
            "No se pudo registrar el usuario con los datos proporcionados.",
            409,
            "USER_ALREADY_EXISTS",
        )

    role = repository.get_role_by_name(db, "EMPLEADO")

    if role is None or not role.activo:
        raise AppException(
            "El rol inicial no está disponible.",
            500,
            "DEFAULT_ROLE_UNAVAILABLE",
        )

    user = Usuario(
        id_rol=role.id_rol,
        nombres=data.nombres.strip(),
        apellidos=data.apellidos.strip(),
        email=email,
        dni=data.dni,
        password_hash=hash_password(data.password.get_secret_value()),
        activo=True,
    )

    try:
        repository.create_user(db, user)
        db.commit()
        db.refresh(user)
        return _build_user_response(user)
    except IntegrityError:
        db.rollback()
        raise AppException(
            "No se pudo registrar el usuario con los datos proporcionados.",
            409,
            "USER_DATA_CONFLICT",
        ) from None
    except Exception:
        db.rollback()
        raise


def login_user(db: Session, data: LoginRequest) -> LoginResponse:
    email = str(data.email).strip().lower()
    user = repository.get_user_by_email(db, email)

    if (
            user is None
            or not verify_password(
        data.password.get_secret_value(),
        user.password_hash,
    )
    ):
        raise AppException(
            "Correo o contraseña incorrectos.",
            401,
            "INVALID_CREDENTIALS",
        )

    if not user.activo or not user.rol.activo:
        raise AppException(
            "La cuenta está inactiva.",
            403,
            "USER_INACTIVE",
        )

    return LoginResponse(
        access_token=create_access_token(user.id_usuario, user.email),
        refresh_token=create_refresh_token(user.id_usuario),
        user=_build_user_response(user),
    )


def refresh_access_token(
        db: Session,
        data: RefreshRequest,
) -> TokenResponse:
    payload = decode_token(data.refresh_token)

    if (
            payload is None
            or payload.get("type") != "refresh"
            or not payload.get("sub")
    ):
        raise AppException(
            "El refresh token no es válido o ha expirado.",
            401,
            "INVALID_REFRESH_TOKEN",
        )

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise AppException(
            "El refresh token no es válido.",
            401,
            "INVALID_REFRESH_TOKEN",
        ) from None

    user = repository.get_user_by_id(db, user_id)

    if user is None or not user.activo or not user.rol.activo:
        raise AppException(
            "La cuenta no está disponible.",
            401,
            "USER_UNAVAILABLE",
        )

    return TokenResponse(
        access_token=create_access_token(user.id_usuario, user.email),
    )


def get_user_profile(user: Usuario) -> UserResponse:
    return _build_user_response(user)