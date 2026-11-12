
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace as Row

from app.api.sales.pdf import render_sale_pdf
from app.database.enums import EstadoVenta


def main():
    output = Path(__file__).resolve().parents[1] / "tmp" / "pdfs"
    output.mkdir(parents=True, exist_ok=True)
    for kind, count in (("BOLETA", 2), ("FACTURA", 65)):
        lines = [Row(descripcion=f"Mesa de comedor en melamina - diseño número {i + 1}, acabado roble y protección en bordes",
                     sku=f"MUEBLE-{i + 1}", unidad_medida="UNIDAD", cantidad=2,
                     precio_unitario=Decimal("125.50"), subtotal=Decimal("251.00"),
                     descuento=Decimal("10.00"), total=Decimal("241.00")) for i in range(count)]
        document = Row(version_plantilla="local-v1", tipo=kind, serie="B001" if kind == "BOLETA" else "F001", correlativo=1,
                       id_venta=123, fecha_emision=datetime(2026, 11, 10, 20, 0, tzinfo=timezone.utc), moneda="PEN",
                       emisor_ruc="20123456789", emisor_razon_social="Mueblería Ejemplo Perú SAC",
                       emisor_direccion="Av. Los Álamos 123, distrito de Jesús María, Lima",
                       receptor_tipo_documento="RUC" if kind == "FACTURA" else "DNI",
                       receptor_numero_documento="20987654321" if kind == "FACTURA" else "12345678",
                       receptor_nombre="Comercial Diseño & Espacios SAC" if kind == "FACTURA" else "María Pérez Ñañez",
                       receptor_direccion="Jr. José Olaya 456 - Lima",
                       subtotal=Decimal("251.00") * count, descuento_total=Decimal("10.00") * count,
                       total=Decimal("241.00") * count, detalles=lines,
                       venta=Row(estado=EstadoVenta.CANCELADA if kind == "FACTURA" else EstadoVenta.CONFIRMADA,
                                 fecha_cancelacion=datetime(2026, 11, 11, 16, 0, tzinfo=timezone.utc)))
        (output / f"{kind.lower()}-ejemplo.pdf").write_bytes(render_sale_pdf(document))
    print(output)


if __name__ == "__main__":
    main()
