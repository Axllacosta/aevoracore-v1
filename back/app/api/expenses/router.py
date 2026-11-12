from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.expenses import service
from app.api.expenses.schemas import ExpenseCategoryCreate, ExpenseCategoryResponse, ExpenseCreate, ExpenseResponse, MonthlySummary
from app.common.pagination import PaginatedResponse, PaginationParams, get_pagination_params
from app.database.connection import get_db
from app.database.models.security import Usuario
from app.api.auth.dependencies import require_roles

router = APIRouter(prefix="/expenses", tags=["Expenses"])
read_access = require_roles("ADMIN", "EMPLEADO")
admin_access = require_roles("ADMIN")


@router.get("/categories", response_model=list[ExpenseCategoryResponse])
def list_categories(db: Session = Depends(get_db), _: Usuario = Depends(read_access)):
    return service.list_categories(db)


@router.post("/categories", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(data: ExpenseCategoryCreate, db: Session = Depends(get_db), _: Usuario = Depends(admin_access)):
    return service.create_category(db, data)


@router.get("/summary", response_model=MonthlySummary)
def summary(anio: int = Query(ge=2000, le=2100), mes: int = Query(ge=1, le=12),
            db: Session = Depends(get_db), _: Usuario = Depends(read_access)):
    return service.monthly_summary(db, anio, mes)


@router.get("", response_model=PaginatedResponse[ExpenseResponse])
def list_expenses(anio: int = Query(ge=2000, le=2100), mes: int = Query(ge=1, le=12),
                  pagination: PaginationParams = Depends(get_pagination_params),
                  db: Session = Depends(get_db), _: Usuario = Depends(read_access)):
    return service.list_expenses(db, anio, mes, pagination)


@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), user: Usuario = Depends(admin_access)):
    return service.save_expense(db, data, user.id_usuario)


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: int, data: ExpenseCreate, db: Session = Depends(get_db), user: Usuario = Depends(admin_access)):
    return service.save_expense(db, data, user.id_usuario, expense_id)


@router.delete("/{expense_id}", response_model=ExpenseResponse)
def cancel_expense(expense_id: int, db: Session = Depends(get_db), _: Usuario = Depends(admin_access)):
    return service.cancel_expense(db, expense_id)
