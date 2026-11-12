from datetime import timedelta, timezone
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import KeepTogether, LongTable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.core.exceptions import AppException
from app.database.enums import EstadoVenta


FONT_DIR = Path(reportlab.__file__).parent / "fonts"
pdfmetrics.registerFont(TTFont("DocumentVera", str(FONT_DIR / "Vera.ttf")))
pdfmetrics.registerFont(TTFont("DocumentVera-Bold", str(FONT_DIR / "VeraBd.ttf")))
pdfmetrics.registerFontFamily("DocumentVera", normal="DocumentVera", bold="DocumentVera-Bold")
LIMA = timezone(timedelta(hours=-5))
INK = colors.HexColor("#17334b")


def local_date(value):
    return value.replace(tzinfo=value.tzinfo or timezone.utc).astimezone(LIMA).strftime("%d/%m/%Y %H:%M")


def render_sale_pdf(document) -> bytes:
    if document.version_plantilla != "local-v1":
        raise AppException("La versión de este comprobante no está soportada.", 409, "DOCUMENT_TEMPLATE_UNSUPPORTED")
    output = BytesIO()
    number = f"{document.serie}-{document.correlativo:08d}"
    pdf = SimpleDocTemplate(output, pagesize=A4, rightMargin=36, leftMargin=36, topMargin=88, bottomMargin=48,
                            title=f"{document.tipo} {number}", author=document.emisor_razon_social)
    body = ParagraphStyle("body", fontName="DocumentVera", fontSize=9, leading=14, textColor=INK, wordWrap="CJK")
    small = ParagraphStyle("small", parent=body, fontSize=8, leading=12)
    right = ParagraphStyle("right", parent=small, alignment=TA_RIGHT)
    title = ParagraphStyle("title", parent=body, fontName="DocumentVera-Bold", fontSize=17, leading=22)
    def p(text, style=body):
        return Paragraph(escape(str(text or "")).replace("\n", "<br/>"), style)
    money = lambda amount: f"{amount:,.2f}"
    sale = document.venta
    cancelled = sale.estado == EstadoVenta.CANCELADA

    def page(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(INK)
        canvas.setFont("DocumentVera-Bold", 11)
        canvas.drawString(36, A4[1] - 36, "COMPROBANTE LOCAL")
        canvas.setFont("DocumentVera", 9)
        canvas.drawRightString(A4[0] - 36, A4[1] - 36, f"{document.tipo} {number}")
        canvas.setStrokeColor(colors.HexColor("#d9e2e9"))
        canvas.line(36, A4[1] - 51, A4[0] - 36, A4[1] - 51)
        if cancelled:
            canvas.setFillColor(colors.HexColor("#b42318"))
            canvas.drawString(36, A4[1] - 69, "VENTA CANCELADA - " + local_date(sale.fecha_cancelacion))
        canvas.setFillColor(colors.HexColor("#526779"))
        canvas.setFont("DocumentVera", 8)
        canvas.drawString(36, 26, "Generado localmente por AevoraCore")
        canvas.drawRightString(A4[0] - 36, 26, f"Página {doc.page}")
        canvas.restoreState()

    story = [p(document.emisor_razon_social, title), Spacer(1, 8),
             p(f"RUC: {document.emisor_ruc}"), p(document.emisor_direccion), Spacer(1, 16),
             p(f"{document.tipo} {number}", title), Spacer(1, 8),
             p(f"Fecha de emisión: {local_date(document.fecha_emision)} · Moneda: {document.moneda}"),
             p(f"Cliente: {document.receptor_nombre}"),
             p(f"{document.receptor_tipo_documento}: {document.receptor_numero_documento or 'Sin documento'}")]
    if document.receptor_direccion:
        story.append(p(f"Dirección: {document.receptor_direccion}"))
    story.extend([p(f"Venta #{document.id_venta} · Pago al contado"), Spacer(1, 18)])
    headers = ["Producto / SKU", "Cant.", "P. unitario", "Descuento", "Total"]
    rows = [[p(label, small) for label in headers]]
    for line in document.detalles:
        rows.append([p(f"{line.descripcion}\nSKU: {line.sku} · {line.unidad_medida}", small),
                     p(line.cantidad, right), p(money(line.precio_unitario), right),
                     p(money(line.descuento), right), p(money(line.total), right)])
    table = LongTable(rows, colWidths=[263, 38, 78, 72, 72], repeatRows=1, splitInRow=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#edf2f6")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, colors.HexColor("#aebfce")),
        ("LINEBELOW", (0, 1), (-1, -1), 0.3, colors.HexColor("#d9e2e9")),
    ]))
    story.append(table)
    totals = Table([[p(label), p(f"S/ {money(amount)}", right)] for label, amount in (
        ("Subtotal", document.subtotal), ("Descuentos", document.descuento_total), ("TOTAL", document.total))],
        colWidths=[140, 130], hAlign="RIGHT")
    totals.setStyle(TableStyle([("TOPPADDING", (0, 0), (-1, -1), 7),
                               ("BACKGROUND", (0, 2), (-1, 2), colors.HexColor("#edf2f6"))]))
    story.append(KeepTogether([Spacer(1, 16), totals]))
    story.extend([Spacer(1, 16), p("Documento generado localmente. No enviado a un sistema de emisión electrónica.", small)])
    pdf.build(story, onFirstPage=page, onLaterPages=page)
    return output.getvalue()
