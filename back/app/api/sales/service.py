from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from hashlib import sha256
from sqlalchemy import select

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.sales import repository
from app.api.sales import documents
from app.api.sales.schemas import SaleCancelRequest, SaleCreate
from app.api.inventory.operations import apply_inventory_movement
from app.core.exceptions import AppException
from app.database.enums import EstadoPago, EstadoVenta, TipoMovimiento
from app.database.models.payment import Pago
from app.database.models.sales import DetalleVenta, Venta
from app.database.models.security import Usuario


CENTAVOS = Decimal("0.01")
CIEN = Decimal("100")


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENTAVOS, rounding=ROUND_HALF_UP)


def _calculate_detail(
        price: Decimal,
        quantity: int,
        discount_percentage: Decimal | None = None,
        discount_amount: Decimal | None = None,
) -> dict[str, Decimal]:
    subtotal = _money(price * quantity)
    discount = (
        _money(discount_amount)
        if discount_amount is not None
        else _money(subtotal * (discount_percentage or Decimal("0.00")) / CIEN)
    )
    if discount < 0 or discount > subtotal:
        raise AppException(
            "El descuento debe estar entre cero y el subtotal del producto.",
            422,
            "INVALID_DETAIL_DISCOUNT",
        )
    total = _money(subtotal - discount)

    return {
        "subtotal_linea": subtotal,
        "descuento_importe": discount,
        "total_linea": total,
    }


def _handle_integrity_error(exc: IntegrityError) -> AppException:
    return AppException(
        "No se pudo completar la operación por un conflicto de datos.",
        409,
        "SALES_DATA_CONFLICT",
    )


def create_sale(
        db: Session,
        payload: SaleCreate,
        user: Usuario,
) -> Venta:
    """Crea venta, detalles, salidas de stock y pago en una transacción."""

    try:
        request_hash = sha256(payload.model_dump_json(exclude={"clave_idempotencia"}).encode()).hexdigest()
        key = str(payload.clave_idempotencia) if payload.clave_idempotencia else None
        if key:
            existing = db.scalar(select(Venta).where(Venta.clave_idempotencia == key))
            if existing is not None:
                if existing.hash_solicitud != request_hash:
                    raise AppException("La clave de reintento ya se usó con otra venta.", 409, "SALE_IDEMPOTENCY_CONFLICT")
                return existing
        # 1. Validar el cliente.
        customer = repository.get_customer(db, payload.id_cliente)

        if customer is None:
            raise AppException(
                "El cliente no existe.",
                404,
                "CUSTOMER_NOT_FOUND",
            )

        # 2. Bloquear productos en orden estable.
        requested_ids = [
            detail.id_producto for detail in payload.detalles
        ]

        products = repository.get_products_for_update(
            db,
            requested_ids,
        )
        products_by_id = {
            product.id_producto: product for product in products
        }

        if set(requested_ids) != set(products_by_id):
            raise AppException(
                "Uno o más productos no existen.",
                404,
                "PRODUCT_NOT_FOUND",
            )

        # 3. Validar productos y calcular importes en backend.
        calculated_details = []
        subtotal_sale = Decimal("0.00")
        discount_sale = Decimal("0.00")
        total_sale = Decimal("0.00")

        for requested_detail in payload.detalles:
            product = products_by_id[requested_detail.id_producto]

            if not product.activo:
                raise AppException(
                    f"El producto {product.id_producto} está inactivo.",
                    409,
                    "PRODUCT_INACTIVE",
                )

            if product.precio_base < 0:
                raise AppException(
                    "El precio del producto no es válido.",
                    409,
                    "INVALID_PRODUCT_PRICE",
                )

            unit_price = _money(Decimal(product.precio_base))

            amounts = _calculate_detail(
                price=unit_price,
                quantity=requested_detail.cantidad,
                discount_percentage=requested_detail.descuento_porcentaje,
                discount_amount=requested_detail.descuento_importe,
            )

            calculated_details.append({
                "id_producto": product.id_producto,
                "cantidad": requested_detail.cantidad,
                "precio_unitario_base": unit_price,
                **amounts,
            })

            subtotal_sale += amounts["subtotal_linea"]
            discount_sale += amounts["descuento_importe"]
            total_sale += amounts["total_linea"]

        subtotal_sale = _money(subtotal_sale)
        discount_sale = _money(discount_sale)
        total_sale = _money(total_sale)

        if total_sale <= 0:
            raise AppException(
                "El total de la venta debe ser mayor que cero.",
                422,
                "INVALID_SALE_TOTAL",
            )

        if sum((payment.importe for payment in payload.pagos), Decimal("0.00")) != total_sale:
            raise AppException(
                "La suma de los pagos debe coincidir exactamente con el total de la venta.",
                422,
                "SALE_PAYMENTS_TOTAL_MISMATCH",
            )

        # 4. Crear venta y detalles.
        sale = Venta(
            clave_idempotencia=key,
            hash_solicitud=request_hash if key else None,
            id_cliente=customer.id_cliente,
            id_usuario=user.id_usuario,
            canal_venta=payload.canal_venta,
            estado=EstadoVenta.CONFIRMADA,
            subtotal=subtotal_sale,
            descuento_total=discount_sale,
            total=total_sale,
        )
        repository.create_sale(db, sale)

        created_details = []

        for detail_data in calculated_details:
            detail = DetalleVenta(
                venta=sale,
                **detail_data,
            )
            repository.create_sale_detail(db, detail)
            created_details.append(detail)

        # 5. Descontar stock y registrar movimientos.
        for detail in created_details:
            apply_inventory_movement(
                db,
                product_id=detail.id_producto,
                user_id=user.id_usuario,
                movement_type=TipoMovimiento.SALIDA,
                quantity=detail.cantidad,
                reason=f"Venta #{sale.id_venta}",
                sale_detail_id=detail.id_detalle_venta,
            )

        # 6. Registrar todos los pagos, previamente validados contra el total.
        for requested_payment in payload.pagos:
            payment = Pago(
                venta=sale,
                medio_pago=requested_payment.medio_pago,
                importe=requested_payment.importe,
                estado=EstadoPago.REGISTRADO,
            )
            repository.create_payment(db, payment)

        if payload.tipo_comprobante:
            documents.create_document(db, sale, customer, payload.tipo_comprobante, products_by_id, created_details)

        # 7. Confirmar todos los cambios juntos.
        db.commit()
        return sale

    except AppException:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()
        if key:
            existing = db.scalar(select(Venta).where(Venta.clave_idempotencia == key))
            if existing is not None and existing.hash_solicitud == request_hash:
                return existing
        raise _handle_integrity_error(exc) from exc

    except Exception:
        db.rollback()
        raise


def get_sale(db: Session, sale_id: int) -> Venta:
    sale = repository.get_sale_by_id(db, sale_id)

    if sale is None:
        raise AppException(
            "La venta no existe.",
            404,
            "SALE_NOT_FOUND",
        )

    return sale


def get_sales(
        db: Session,
        *,
        limit: int = 50,
        offset: int = 0,
) -> list[Venta]:
    return repository.list_sales(
        db,
        limit=limit,
        offset=offset,
    )


def cancel_sale(
        db: Session,
        sale_id: int,
        payload: SaleCancelRequest,
        user: Usuario,
) -> Venta:
    """Cancela la venta, revierte su pago y restituye el stock."""

    try:
        # Bloquea la venta para impedir cancelaciones.
        sale = repository.get_sale_for_update(db, sale_id)

        if sale is None:
            raise AppException(
                "La venta no existe.",
                404,
                "SALE_NOT_FOUND",
            )

        if sale.estado != EstadoVenta.CONFIRMADA:
            raise AppException(
                "La venta ya está cancelada o no puede cancelarse.",
                409,
                "SALE_NOT_CANCELLABLE",
            )

        payments = sale.pagos

        if not payments:
            raise AppException(
                "La venta no tiene un pago registrado.",
                409,
                "SALE_PAYMENT_MISSING",
            )

        if any(payment.estado != EstadoPago.REGISTRADO for payment in payments):
            raise AppException(
                "El pago no se encuentra en estado registrable para reversión.",
                409,
                "PAYMENT_NOT_REVERSIBLE",
            )

        cancellation_time = datetime.now(timezone.utc)

        # Restituir una sola vez cada línea de la venta.
        for detail in sorted(sale.detalles, key=lambda detail: detail.id_producto):
            apply_inventory_movement(
                db,
                product_id=detail.id_producto,
                user_id=user.id_usuario,
                movement_type=TipoMovimiento.ENTRADA,
                quantity=detail.cantidad,
                reason=f"Cancelación de venta #{sale.id_venta}",
                cancelled_sale_id=sale.id_venta,
                allow_inactive_product=True,
            )

        # Revertir estados dentro de la misma transacción.
        sale.estado = EstadoVenta.CANCELADA
        sale.motivo_cancelacion = payload.motivo_cancelacion
        sale.fecha_cancelacion = cancellation_time

        for payment in payments:
            payment.estado = EstadoPago.REVERTIDO
            payment.fecha_reversion = cancellation_time
            payment.motivo_reversion = payload.motivo_cancelacion

        db.commit()
        return sale

    except AppException:
        db.rollback()
        raise

    except IntegrityError as exc:
        db.rollback()
        raise _handle_integrity_error(exc) from exc

    except Exception:
        db.rollback()
        raise
