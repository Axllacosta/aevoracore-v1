from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.api.expenses.schemas import ExpenseCategoryCreate, ExpenseCreate, MonthlySummary
from app.common.pagination import PaginationParams, paginate_query
from app.core.exceptions import AppException
from app.database.enums import EstadoVenta
from app.database.models.expense import CategoriaGasto, Gasto
from app.database.models.sales import Venta

LIMA = timezone(timedelta(hours=-5))


def month_bounds(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year + (month == 12), month % 12 + 1, 1)


def list_categories(db: Session):
    return list(db.scalars(select(CategoriaGasto).order_by(CategoriaGasto.nombre)).all())


def create_category(db: Session, data: ExpenseCategoryCreate):
    category = CategoriaGasto(nombre=data.nombre, requiere_descripcion=data.nombre == "OTROS")
    try:
        db.add(category)
        db.commit()
        db.refresh(category)
        return category
    except IntegrityError as exc:
        db.rollback()
        raise AppException("Ya existe una categoría con ese nombre.", 409, "EXPENSE_CATEGORY_CONFLICT") from exc


def list_expenses(db: Session, year: int, month: int, pagination: PaginationParams):
    start, end = month_bounds(year, month)
    statement = (select(Gasto).options(selectinload(Gasto.categoria))
                 .where(Gasto.fecha >= start, Gasto.fecha < end)
                 .order_by(Gasto.fecha.desc(), Gasto.id_gasto.desc()))
    return paginate_query(db, statement, pagination)


def save_expense(db: Session, data: ExpenseCreate, user_id: int, expense_id: int | None = None):
    try:
        expense = None
        if expense_id is not None:
            expense = db.scalar(select(Gasto).where(Gasto.id_gasto == expense_id).with_for_update())
            if expense is None:
                raise AppException("El gasto no existe.", 404, "EXPENSE_NOT_FOUND")
            if not expense.activo:
                raise AppException("No se puede editar un gasto anulado.", 409, "EXPENSE_CANCELLED")
        category = db.get(CategoriaGasto, data.id_categoria_gasto)
        if category is None:
            raise AppException("La categoría de gasto no existe.", 404, "EXPENSE_CATEGORY_NOT_FOUND")
        if category.requiere_descripcion and not data.descripcion:
            raise AppException("La categoría Otros requiere una descripción.", 422, "EXPENSE_DESCRIPTION_REQUIRED")
        if expense is None:
            expense = Gasto(id_usuario=user_id)
            db.add(expense)
        for key, value in data.model_dump().items():
            setattr(expense, key, value)
        expense.categoria = category
        db.commit()
        db.refresh(expense)
        return expense
    except Exception:
        db.rollback()
        raise


def cancel_expense(db: Session, expense_id: int):
    try:
        expense = db.scalar(select(Gasto).where(Gasto.id_gasto == expense_id).with_for_update())
        if expense is None:
            raise AppException("El gasto no existe.", 404, "EXPENSE_NOT_FOUND")
        expense.activo = False
        db.commit()
        db.refresh(expense)
        return expense
    except Exception:
        db.rollback()
        raise


def monthly_summary(db: Session, year: int, month: int) -> MonthlySummary:
    start, end = month_bounds(year, month)
    start_time = datetime.combine(start, datetime.min.time(), tzinfo=LIMA).astimezone(timezone.utc)
    end_time = datetime.combine(end, datetime.min.time(), tzinfo=LIMA).astimezone(timezone.utc)
    revenue = db.scalar(select(func.coalesce(func.sum(Venta.total), 0)).where(
        Venta.estado == EstadoVenta.CONFIRMADA, Venta.fecha_hora >= start_time, Venta.fecha_hora < end_time,
    )) or Decimal("0.00")
    expense_filter = (Gasto.activo.is_(True), Gasto.fecha >= start, Gasto.fecha < end)
    total, count = db.execute(select(func.coalesce(func.sum(Gasto.importe), 0), func.count(Gasto.id_gasto)).where(*expense_filter)).one()
    categories = db.execute(select(CategoriaGasto.id_categoria_gasto, CategoriaGasto.nombre, func.sum(Gasto.importe).label("total"))
                            .join(Gasto, Gasto.id_categoria_gasto == CategoriaGasto.id_categoria_gasto)
                            .where(*expense_filter).group_by(CategoriaGasto.id_categoria_gasto, CategoriaGasto.nombre)
                            .order_by(func.sum(Gasto.importe).desc(), CategoriaGasto.nombre)).mappings().all()
    return MonthlySummary(anio=year, mes=month, ventas_confirmadas=revenue, gastos=total,
                          resultado_estimado=revenue - total, cantidad_gastos=count, por_categoria=categories)
