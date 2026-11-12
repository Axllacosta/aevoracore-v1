from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.exceptions import AppException
from app.database.models.customer import Cliente
from app.database.models.document import Comprobante, DetalleComprobante, Emisor, SerieComprobante, TipoComprobante
from app.database.models.sales import Venta


class IssuerConfig(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    ruc: str = Field(pattern=r"^[0-9]{11}$")
    razon_social: str = Field(min_length=1, max_length=200)
    direccion: str = Field(min_length=1, max_length=500)

    @field_validator("ruc", "razon_social", "direccion", mode="before")
    @classmethod
    def trim(cls, value):
        return value.strip() if isinstance(value, str) else value


def get_config(db: Session) -> Emisor | None:
    return db.get(Emisor, 1)


def save_config(db: Session, payload: IssuerConfig) -> Emisor:

    issuer = db.scalar(select(Emisor).where(Emisor.id_emisor == 1).with_for_update())
    if issuer is None:
        issuer = Emisor(id_emisor=1, **payload.model_dump())
        db.add(issuer)
        db.flush()
        for code, prefix in (("BOLETA", "B001"), ("FACTURA", "F001")):
            kind = TipoComprobante(codigo=code)
            db.add(kind)
            db.flush()
            db.add(SerieComprobante(id_emisor=1, id_tipo_comprobante=kind.id_tipo_comprobante, serie=prefix, ultimo_correlativo=0))
    else:
        if issuer.ruc != payload.ruc and db.scalar(select(Comprobante.id_comprobante).limit(1)) is not None:
            raise AppException("El RUC del emisor no puede cambiar después de generar comprobantes.", 409, "ISSUER_IDENTITY_LOCKED")
        for key, value in payload.model_dump().items():
            setattr(issuer, key, value)
    db.commit()
    return issuer


def validate_receiver(customer: Cliente, kind: str) -> tuple[str, str | None, str]:
    name = customer.razon_social if customer.tipo_persona == "JURIDICA" else " ".join(filter(None, (customer.nombres, customer.apellidos)))
    if not name or not name.strip():
        raise AppException("Completa el nombre o razón social del cliente.", 422, "DOCUMENT_CUSTOMER_NAME_MISSING")
    if kind == "FACTURA":
        if not customer.ruc or not customer.direccion_fiscal:
            raise AppException("Para generar una factura local, completa el RUC y la dirección fiscal del cliente.", 422, "DOCUMENT_CUSTOMER_BILLING_MISSING")
        return "RUC", customer.ruc, name
    if customer.tipo_persona == "JURIDICA":
        return "RUC", customer.ruc, name
    return ("DNI", customer.dni, name) if customer.dni else ("SIN_DOC", None, name)


def create_document(db: Session, sale: Venta, customer: Cliente, kind: str, products: dict, details: list) -> Comprobante:
    document_type, document_number, name = validate_receiver(customer, kind)
    issuer = db.scalar(select(Emisor).where(Emisor.id_emisor == 1).with_for_update())
    if issuer is None:
        raise AppException("Configura los datos del negocio desde el historial de ventas antes de generar comprobantes.", 409, "DOCUMENT_ISSUER_NOT_CONFIGURED")
    series = db.scalar(
        select(SerieComprobante).join(TipoComprobante)
        .where(SerieComprobante.id_emisor == issuer.id_emisor, TipoComprobante.codigo == kind)
        .with_for_update(of=SerieComprobante)
    )
    if series is None:
        raise AppException("No hay una serie configurada para este tipo de comprobante.", 409, "DOCUMENT_SERIES_MISSING")
    series.ultimo_correlativo += 1
    document = Comprobante(
        venta=sale, id_serie=series.id_serie, id_usuario_emisor=sale.id_usuario,
        tipo=kind, serie=series.serie, correlativo=series.ultimo_correlativo,
        moneda="PEN", emisor_ruc=issuer.ruc, emisor_razon_social=issuer.razon_social,
        emisor_direccion=issuer.direccion, receptor_tipo_documento=document_type,
        receptor_numero_documento=document_number, receptor_nombre=name,
        receptor_direccion=customer.direccion_fiscal,
        subtotal=sale.subtotal, descuento_total=sale.descuento_total, total=sale.total,
        version_plantilla="local-v1",
    )
    db.add(document)
    for number, detail in enumerate(details, start=1):
        product = products[detail.id_producto]
        document.detalles.append(DetalleComprobante(
            id_detalle_venta=detail.id_detalle_venta, numero_linea=number,
            sku=product.sku, descripcion=product.nombre, unidad_medida="UNIDAD",
            cantidad=detail.cantidad, precio_unitario=detail.precio_unitario_base,
            subtotal=detail.subtotal_linea, descuento=detail.descuento_importe, total=detail.total_linea,
        ))
    db.flush()
    return document


def get_document(db: Session, sale_id: int) -> Comprobante:
    document = db.scalar(select(Comprobante).where(Comprobante.id_venta == sale_id).options(selectinload(Comprobante.detalles), selectinload(Comprobante.venta)))
    if document is None:
        if db.get(Venta, sale_id) is None:
            raise AppException("La venta no existe.", 404, "SALE_NOT_FOUND")
        raise AppException("Esta venta no tiene comprobante registrado.", 409, "SALE_DOCUMENT_MISSING")
    return document
