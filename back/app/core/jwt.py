from datetime import timedelta, datetime, timezone
from jose import jwt, JWTError
from app.core.config import settings


def create_token(payload: dict, expires_delta: timedelta) -> str:
    data = payload.copy()
    expire = datetime.now(timezone.utc) + expires_delta

    data.update({"exp": expire})

    return jwt.encode(data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

def create_access_token(user_id: int, email: str) -> str:
    return create_token({
        "sub": str(user_id),
        "email": email,
        "type": "access"
    },
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

def create_refresh_token(user_id: int) -> str:
    return create_token({
        "sub": str(user_id),
        "type": "refresh",
    },
        timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES)
    )

def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload

    except JWTError:
        return None