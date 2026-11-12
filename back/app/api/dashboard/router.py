from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.dashboard.schemas import DashboardResponse
from app.api.dashboard.service import get_dashboard
from app.database.connection import get_db
from app.database.models.security import Usuario
from app.api.auth.dependencies import require_roles

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardResponse)
def dashboard(db: Session = Depends(get_db), _: Usuario = Depends(require_roles("ADMIN", "EMPLEADO"))):
    return get_dashboard(db)
