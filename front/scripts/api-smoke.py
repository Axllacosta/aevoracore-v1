#Verificación de integración local. La opción «--write» utiliza entornos de prueba (fixtures) aislados y genera un registro de auditoría.
#Ejecutar con el virtualenv del backend. No se imprimen ni se almacenan credenciales ni tokens.
import argparse
import json
import uuid
import urllib.error
import urllib.request
from pathlib import Path
from dotenv import dotenv_values

BASE = "http://127.0.0.1:8000"
parser = argparse.ArgumentParser()
parser.add_argument("--write", action="store_true", help="Exercise create, stock, sale and cancellation using isolated fixtures")
args = parser.parse_args()
settings = dotenv_values(Path(__file__).resolve().parents[2] / "back" / ".env")
token = None

def call(path, body=None, method=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    request = urllib.request.Request(BASE + path, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response) if response.status != 204 else None
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"{request.method} {path}: HTTP {error.code}: {error.read().decode()}") from None

assert call("/health")["status"] == "healthy"
email, password = settings.get("SEED_ADMIN_EMAIL"), settings.get("SEED_ADMIN_PASSWORD")
if not email or not password:
    raise SystemExit("Configure SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD locally for authenticated checks.")
session = call("/auth/login", {"email": email, "password": password})
token = session["access_token"]
assert call("/auth/me")["activo"]
for route in ["/categories", "/products", "/customers", "/inventory", "/inventory/movements"]:
    page = call(route + "?page=1&page_size=1")
    assert "items" in page and "total" in page
    print("PASS", route)
assert isinstance(call("/sales?limit=1&offset=0"), list)
assert call("/auth/refresh", {"refresh_token": session["refresh_token"]})["access_token"]
print("PASS authentication, refresh and sales pagination")
if not args.write:
    raise SystemExit(0)

suffix = uuid.uuid4().hex[:10].upper()
category = product = customer = sale = None
try:
    category = call("/categories", {"nombre": "TEST " + suffix, "descripcion": "Isolated frontend integration fixture"})
    category = call(f"/categories/{category['id_categoria']}", {"descripcion": "Frontend integration verified"}, "PATCH")
    product = call("/products", {"id_categoria": category["id_categoria"], "sku": "TEST-" + suffix, "nombre": "TEST Mesa " + suffix, "precio_base": "199.90", "alto": "75.00"})
    product = call(f"/products/{product['id_producto']}", {"material": "Melamina"}, "PATCH")
    customer = call("/customers", {"nombres": "TEST", "apellidos": suffix})
    pid = product["id_producto"]
    reason = "TEST frontend integration " + suffix
    movement = call("/inventory/movements", {"id_producto": pid, "tipo_movimiento": "ENTRADA", "cantidad": 5, "motivo": reason})
    assert movement["stock_anterior"] == 0 and movement["stock_posterior"] == 5
    call(f"/inventory/{pid}/minimum-stock", {"stock_minimo": 2}, "PATCH")
    adjustment = call("/inventory/adjustments", {"id_producto": pid, "direccion_ajuste": "INCREMENTO", "cantidad": 1, "motivo": reason})
    assert adjustment["stock_posterior"] == 6
    sale = call("/sales", {"id_cliente": customer["id_cliente"], "canal_venta": "PRESENCIAL", "medio_pago": "EFECTIVO", "detalles": [{"id_producto": pid, "cantidad": 2, "descuento_porcentaje": "10.00"}]})
    assert sale["estado"] == "CONFIRMADA" and sale["total"] == "359.82"
    inventory = call("/inventory?search=TEST-" + suffix)["items"][0]
    assert inventory["stock_actual"] == 4
    detail = call(f"/sales/{sale['id_venta']}")
    assert detail["pago"]["estado"] == "REGISTRADO"
    sale = call(f"/sales/{sale['id_venta']}/cancel", {"motivo_cancelacion": reason})
    assert sale["estado"] == "CANCELADA" and sale["pago"]["estado"] == "REVERTIDO"
    assert call("/inventory?search=TEST-" + suffix)["items"][0]["stock_actual"] == 6
    movements = call(f"/inventory/movements?product_id={pid}")
    assert movements["total"] >= 4
    print("PASS category/product/customer writes, stock entry/adjustment, sale, payment, kardex and cancellation")
    print("Audit fixture:", suffix, "product", pid, "sale", sale["id_venta"])
finally:

    if sale and sale["estado"] == "CONFIRMADA":
        call(f"/sales/{sale['id_venta']}/cancel", {"motivo_cancelacion": "TEST integration cleanup " + suffix})
    if product:
        pid = product["id_producto"]
        rows = call("/inventory?search=TEST-" + suffix)["items"]
        if rows and rows[0]["stock_actual"]:
            call("/inventory/movements", {"id_producto": pid, "tipo_movimiento": "SALIDA", "cantidad": rows[0]["stock_actual"], "motivo": "TEST integration cleanup " + suffix})
        call(f"/products/{pid}", method="DELETE")
    if customer:
        call(f"/customers/{customer['id_cliente']}", method="DELETE")
    if category:
        call(f"/categories/{category['id_categoria']}", method="DELETE")
    print("Fixture catalog records deactivated; stock cleared. Historical audit entries remain.")
