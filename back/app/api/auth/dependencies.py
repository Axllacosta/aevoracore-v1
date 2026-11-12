from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.auth import repository
from app.core.exceptions import AppException
from app.core.jwt import decode_token
from app.database.connection import get_db
from app.database.models.security import Usuario

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
        db: Session = Depends(get_db),
) -> Usuario:
    if credentials is None:
        raise AppException(
            "Se requiere autenticación.",
            401,
            "AUTHENTICATION_REQUIRED",
        )

    payload = decode_token(credentials.credentials)

    if (
            payload is None
            or payload.get("type") != "access"
            or not payload.get("sub")
    ):
        raise AppException(
            "El token de acceso no es válido o ha expirado.",
            401,
            "INVALID_ACCESS_TOKEN",
        )

    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise AppException(
            "El token de acceso no es válido.",
            401,
            "INVALID_ACCESS_TOKEN",
        ) from None

    user = repository.get_user_by_id(db, user_id)

    if user is None or not user.activo or not user.rol.activo:
        raise AppException(
            "La cuenta no está disponible.",
            401,
            "USER_UNAVAILABLE",
        )

    return user


def require_roles(*allowed_roles: str):
    def role_checker(
            user: Usuario = Depends(get_current_user),
    ) -> Usuario:
        if user.rol.nombre not in allowed_roles:
            raise AppException(
                "No tienes permisos para realizar esta operación.",
                403,
                "INSUFFICIENT_ROLE",
            )

        return user

    return role_checker