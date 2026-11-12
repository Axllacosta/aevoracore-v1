import unittest
from io import BytesIO
from unittest.mock import patch

from botocore.exceptions import ClientError
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.infrastructure.storage import catalog_images as images
from app.api.products.router import router
from app.api.products.schemas import PublicProductImageResponse, ProductImageResponse
from app.database.base import Base
from app.database.connection import get_db
from app.database.models import Categoria, Producto
from app.database.models.product_image import ImagenProducto


def png(size=(2000, 1000)):
    data = BytesIO()
    Image.new("RGB", size, "blue").save(data, format="PNG")
    data.seek(0)
    return data


class CatalogImageTests(unittest.TestCase):
    def test_upload_prepares_variants_and_cleans_up_if_storage_fails(self):
        from app.infrastructure.storage import image_storage
        with patch.object(image_storage, "minio_client"), patch.object(image_storage, "save_variants") as save:
            key, content_type = image_storage.upload_image(png(), 1)
            self.assertEqual(content_type, "image/png")
            self.assertEqual(set(save.call_args.args[1]), {480, 1200})
            self.assertEqual(save.call_args.args[0], key)
        with patch.object(image_storage, "minio_client"), patch.object(image_storage, "save_variants", side_effect=RuntimeError("storage failed")), patch.object(image_storage, "delete_image") as delete:
            with self.assertRaises(RuntimeError):
                image_storage.upload_image(png(), 1)
            delete.assert_called_once()

    def test_webp_sizes_aspect_ratio_and_no_upscaling(self):
        for source, expected in [(png(), {480: (480, 240), 1200: (1200, 600)}),
                                 (png((100, 50)), {480: (100, 50), 1200: (100, 50)})]:
            for width, data in images.encode_variants(source).items():
                with Image.open(BytesIO(data)) as image:
                    self.assertEqual(image.format, "WEBP")
                    self.assertEqual(image.size, expected[width])
            self.assertEqual(source.tell(), 0)

    def test_existing_images_are_generated_once_then_read_from_storage(self):
        key = "products/1/original.png"
        objects = {key: png().getvalue()}

        def get_object(**kwargs):
            if kwargs["Key"] not in objects:
                raise ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
            return {"Body": BytesIO(objects[kwargs["Key"]])}

        def put_object(**kwargs):
            self.assertEqual(kwargs["CacheControl"], images.CACHE_CONTROL)
            objects[kwargs["Key"]] = kwargs["Body"]

        with patch.object(images, "minio_client") as storage, patch.object(images, "encode_variants", wraps=images.encode_variants) as encode:
            storage.get_object.side_effect = get_object
            storage.put_object.side_effect = put_object
            first = images.get_variant(key, 480)
            self.assertEqual(first, images.get_variant(key, 480))
            images.get_variant(key, 1200)
            self.assertEqual(encode.call_count, 1)

    def test_public_urls_are_stable_and_internal_urls_still_signed(self):
        fields = dict(id_imagen=1, url_imagen="products/1/a.png", nombre_archivo="a.png", orden=1, es_principal=True)
        public = PublicProductImageResponse(**fields).model_dump()
        self.assertEqual(public, PublicProductImageResponse(**fields).model_dump())
        self.assertTrue(public["url_miniatura"].endswith("/480.webp"))
        with patch("app.infrastructure.storage.image_storage.get_image_url", return_value="signed"):
            self.assertEqual(ProductImageResponse(**fields).model_dump()["url_imagen"], "signed")


class CatalogImageHttpTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        Base.metadata.create_all(self.engine)
        self.db = Session(self.engine)
        self.category = Categoria(nombre="Muebles")
        self.product = Producto(categoria=self.category, sku="M1", nombre="Mesa", precio_base=10)
        self.image = ImagenProducto(producto=self.product, url_imagen="products/1/a.png", nombre_archivo="a.png", orden=1, es_principal=True)
        self.db.add(self.image)
        self.db.commit()
        app = FastAPI()
        app.include_router(router)
        app.dependency_overrides[get_db] = lambda: self.db
        self.client = TestClient(app)
        self.url = images.public_image_url(self.image.id_imagen, self.image.url_imagen, 480)

    def tearDown(self):
        self.client.close()
        self.db.close()
        self.engine.dispose()

    def test_http_cache_and_conditional_get_skip_storage(self):
        with patch("app.api.products.catalog_router.get_variant", return_value=b"webp") as get:
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.headers["content-type"], "image/webp")
            self.assertEqual(response.headers["cache-control"], images.CACHE_CONTROL)
            get.assert_called_once_with(self.image.url_imagen, 480)
            response = self.client.get(self.url, headers={"If-None-Match": response.headers["etag"]})
            self.assertEqual(response.status_code, 304)
            self.assertEqual(get.call_count, 1)

    def test_non_public_images_wrong_versions_and_invalid_sizes_are_rejected(self):
        with patch("app.api.products.catalog_router.get_variant") as get:
            self.assertEqual(self.client.get(self.url.replace("480.webp", "999.webp")).status_code, 422)
            self.assertEqual(self.client.get(self.url.replace(images.image_version(self.image.url_imagen), "wrong")).status_code, 404)
            self.category.activo = False
            self.db.commit()
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, 404)
            self.assertEqual(response.headers["cache-control"], "no-store")
            get.assert_not_called()
