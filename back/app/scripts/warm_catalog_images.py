from sqlalchemy import select

from app.database.connection import SessionLocal
from app.database.models.catalog import Categoria, Producto
from app.database.models.product_image import ImagenProducto
from app.infrastructure.storage.catalog_images import WIDTHS, get_variant


def main():
    with SessionLocal() as db:
        keys = db.scalars(select(ImagenProducto.url_imagen)
            .join(Producto, ImagenProducto.id_producto == Producto.id_producto)
            .join(Categoria, Producto.id_categoria == Categoria.id_categoria)
            .where(Producto.activo.is_(True), Categoria.activo.is_(True))).all()
    failed = 0
    total = {width: 0 for width in WIDTHS}
    for index, key in enumerate(keys, 1):
        try:
            for width in WIDTHS:
                total[width] += len(get_variant(key, width))
            print(f"Image {index}/{len(keys)} ready", flush=True)
        except Exception as exc:
            failed += 1
            print(f"Image {index}/{len(keys)} failed: {type(exc).__name__}", flush=True)
    print(f"Ready: {len(keys) - failed}; failed: {failed}; bytes by size: {total}")
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
