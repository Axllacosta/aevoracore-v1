from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel

from app.database.enums import CanalVenta


class MonthlyKpis(BaseModel):
    ventas_totales: int
    productos_vendidos: int
    ingresos: Decimal
    egresos: Decimal
    balance: Decimal


class ChannelRevenue(BaseModel):
    canal_venta: CanalVenta
    importe: Decimal
    porcentaje: Decimal


class TopProduct(BaseModel):
    id_producto: int
    sku: str
    nombre: str
    unidades_vendidas: int
    importe: Decimal


class MonthlyBalance(BaseModel):
    anio: int
    mes: int
    ingresos: Decimal
    egresos: Decimal
    balance: Decimal


class DashboardResponse(BaseModel):
    anio: int
    mes: int
    generado_en: datetime
    ranking_desde: date
    ranking_hasta: date
    kpis: MonthlyKpis
    canales: list[ChannelRevenue]
    productos_mas_vendidos: list[TopProduct]
    balance_mensual: list[MonthlyBalance]
