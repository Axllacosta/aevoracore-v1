from enum import Enum


class TipoMovimiento(str, Enum):
    ENTRADA = "ENTRADA"
    SALIDA = "SALIDA"
    AJUSTE = "AJUSTE"


class DireccionAjuste(str, Enum):
    INCREMENTO = "INCREMENTO"
    DECREMENTO = "DECREMENTO"


class CanalVenta(str, Enum):
    PRESENCIAL = "PRESENCIAL"
    WHATSAPP = "WHATSAPP"


class EstadoVenta(str, Enum):
    CONFIRMADA = "CONFIRMADA"
    CANCELADA = "CANCELADA"


class MedioPago(str, Enum):
    EFECTIVO = "EFECTIVO"
    TRANSFERENCIA = "TRANSFERENCIA"
    YAPE = "YAPE"
    PLIN = "PLIN"
    TARJETA = "TARJETA"


class EstadoPago(str, Enum):
    REGISTRADO = "REGISTRADO"
    REVERTIDO = "REVERTIDO"
