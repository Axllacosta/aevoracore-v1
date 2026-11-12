from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.api.dashboard.schemas import DashboardResponse
from app.database.enums import CanalVenta, EstadoVenta
from app.database.models.catalog import Producto
from app.database.models.expense import Gasto
from app.database.models.sales import DetalleVenta, Venta

LIMA = timezone(timedelta(hours=-5))
ZERO = Decimal("0.00")


def shift_month(start: date, offset: int) -> date:
    index = start.year * 12 + start.month - 1 + offset
    year, month = divmod(index, 12)
    return date(year, month + 1, 1)


def utc_start(start: date) -> datetime:
    return datetime.combine(start, datetime.min.time(), tzinfo=LIMA).astimezone(timezone.utc)


def get_dashboard(db: Session, now: datetime | None = None) -> DashboardResponse:
    generated_at = now or datetime.now(timezone.utc)
    local_now = generated_at.astimezone(LIMA)
    current = date(local_now.year, local_now.month, 1)
    months = [shift_month(current, offset) for offset in range(-5, 1)]
    end = shift_month(current, 1)
    # Group sales before joining sale details or payments to avoid duplicated revenue.
    sale_bucket = case(*[
        (and_(Venta.fecha_hora >= utc_start(start), Venta.fecha_hora < utc_start(shift_month(start, 1))), index)
        for index, start in enumerate(months)
    ])
    sale_rows = db.execute(
        select(sale_bucket.label("month_index"), Venta.canal_venta, func.count(Venta.id_venta), func.sum(Venta.total))
        .where(Venta.estado == EstadoVenta.CONFIRMADA, Venta.fecha_hora >= utc_start(months[0]), Venta.fecha_hora < utc_start(end))
        .group_by(sale_bucket, Venta.canal_venta)
    ).all()
    revenues = [ZERO for _ in months]
    channels = {channel: ZERO for channel in CanalVenta}
    sale_count = 0
    for index, channel, count, revenue in sale_rows:
        revenues[index] += revenue
        if index == 5:
            sale_count += count
            channels[channel] += revenue

    expense_bucket = case(*[
        (and_(Gasto.fecha >= start, Gasto.fecha < shift_month(start, 1)), index)
        for index, start in enumerate(months)
    ])
    expense_rows = db.execute(
        select(expense_bucket.label("month_index"), func.sum(Gasto.importe))
        .where(Gasto.activo.is_(True), Gasto.fecha >= months[0], Gasto.fecha < end)
        .group_by(expense_bucket)
    ).all()
    expenses = [ZERO for _ in months]
    for index, amount in expense_rows:
        expenses[index] = amount

    units = db.scalar(select(func.coalesce(func.sum(DetalleVenta.cantidad), 0))
                      .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
                      .where(Venta.estado == EstadoVenta.CONFIRMADA,
                             Venta.fecha_hora >= utc_start(current), Venta.fecha_hora < utc_start(end)))
    ranking_start = shift_month(current, -2)
    top_products = db.execute(
        select(Producto.id_producto, Producto.sku, Producto.nombre,
               func.sum(DetalleVenta.cantidad).label("unidades_vendidas"),
               func.sum(DetalleVenta.total_linea).label("importe"))
        .join(DetalleVenta, DetalleVenta.id_producto == Producto.id_producto)
        .join(Venta, Venta.id_venta == DetalleVenta.id_venta)
        .where(Venta.estado == EstadoVenta.CONFIRMADA,
               Venta.fecha_hora >= utc_start(ranking_start), Venta.fecha_hora < utc_start(end))
        .group_by(Producto.id_producto, Producto.sku, Producto.nombre)
        .order_by(func.sum(DetalleVenta.cantidad).desc(), func.sum(DetalleVenta.total_linea).desc(), Producto.id_producto)
        .limit(10)
    ).mappings().all()

    channel_data = []
    assigned_percentage = ZERO
    for index, (channel, revenue) in enumerate(channels.items()):
        percentage = ZERO
        if revenues[5] > 0:
            percentage = ((revenue * 100 / revenues[5]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                          if index < len(channels) - 1 else Decimal("100.00") - assigned_percentage)
        assigned_percentage += percentage
        channel_data.append({"canal_venta": channel, "importe": revenue, "porcentaje": percentage})

    return DashboardResponse(
        anio=current.year, mes=current.month, generado_en=generated_at,
        ranking_desde=ranking_start, ranking_hasta=end - timedelta(days=1),
        kpis={"ventas_totales": sale_count, "productos_vendidos": units,
              "ingresos": revenues[5], "egresos": expenses[5], "balance": revenues[5] - expenses[5]},
        canales=channel_data, productos_mas_vendidos=top_products,
        balance_mensual=[{"anio": start.year, "mes": start.month, "ingresos": revenues[index],
                          "egresos": expenses[index], "balance": revenues[index] - expenses[index]}
                         for index, start in enumerate(months)],
    )
