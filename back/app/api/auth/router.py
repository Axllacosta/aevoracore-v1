from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.auth import service
from app.api.auth.schemas import (
    LoginRequest,
    LoginResponse,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.database.connection import get_db
from app.database.models.security import Usuario
from app.api.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
        data: RegisterRequest,
        db: Session = Depends(get_db),
):
    return service.register_user(db, data)


@router.post("/login", response_model=LoginResponse)
def login(
        data: LoginRequest,
        db: Session = Depends(get_db),
):
    return service.login_user(db, data)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
        data: RefreshRequest,
        db: Session = Depends(get_db),
):
    return service.refresh_access_token(db, data)


@router.get("/me", response_model=UserResponse)
def me(
        current_user: Usuario = Depends(get_current_user),
):
    return service.get_user_profile(current_user)