# AevoraCore

AevoraCore reúne el sistema de gestión interna y la tienda de muebles. Ambos frontends consultan la misma API. PostgreSQL guarda los datos del negocio y MinIO almacena las imágenes del catálogo.

| Carpeta | Componente | Dirección local |
| --- | --- | --- |
| `back/` | API FastAPI y documentación interactiva | [Swagger UI](http://127.0.0.1:8000/docs) |
| `front/` | Sistema de gestión interna en Angular | [Panel interno](http://localhost:4201) |
| `ecommerce-front/` | Tienda y catálogo en Angular | [Tienda](http://localhost:4200) |

## Requisitos

- Python 3.12 con pip y venv. El entorno de desarrollo del proyecto usa Python 3.12.7.
- Node.js 24.15.0 o superior dentro de la rama 24 y npm 11.5.2. Esta combinación es compatible con Angular 22 y la versión de npm declarada por ambos frontends.
- Docker con el complemento Docker Compose v2 y el motor en ejecución. El archivo [docker-compose.yml](back/docker-compose.yml) proporciona PostgreSQL 16 y MinIO.
- Puertos locales disponibles: 4200 y 4201 para Angular, 8000 para la API, 5432 para PostgreSQL y 9000 y 9001 para la API y la consola de MinIO.

Los comandos siguientes usan **PowerShell en Windows**. Cada terminal nueva comienza en la raíz del repositorio.

## 1. Configurar el backend

En la primera terminal, crea el entorno virtual e instala las [dependencias de Python](back/app/requirements.txt).

```powershell
cd back
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r app/requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edita `back/.env` antes del primer arranque. La [plantilla](back/.env.example) contiene las variables de PostgreSQL, MinIO, autenticación y CORS. Configura las contraseñas locales y genera un valor para `JWT_SECRET_KEY` con este comando:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"
```

Para acceder por primera vez al panel interno, descomenta `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` y escribe el correo y la contraseña que usarás para iniciar sesión. Guarda el archivo. Git excluye el `.env` local.

## 2. Iniciar PostgreSQL y MinIO

Desde la misma terminal, en `back/`, ejecuta:

```powershell
docker compose up -d --wait
docker compose ps
```

En una instalación nueva, abre la [consola de MinIO](http://localhost:9001), inicia sesión con `MINIO_ROOT_USER` y `MINIO_ROOT_PASSWORD` de tu archivo `.env` y crea el bucket indicado por `MINIO_BUCKET`. La plantilla usa `aevora-products`. El catálogo utiliza ese bucket para guardar y leer imágenes.

## 3. Preparar la base e iniciar la API

En la misma terminal, aplica las migraciones. En la primera instalación, ejecuta también el comando de datos iniciales para crear los roles y la cuenta administradora.

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.database.seeds
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Deja la terminal abierta. En [salud de la API](http://127.0.0.1:8000/health), los valores `healthy` y `connected` confirman que la API responde y tiene conexión con PostgreSQL.

## 4. Iniciar el panel interno y la tienda

Abre una **segunda terminal en la raíz**. Cada frontend tiene su propio archivo de bloqueo y necesita su propia instalación de dependencias.

```powershell
npm.cmd --prefix ecommerce-front ci
npm.cmd --prefix front ci
npm.cmd --prefix front run start:all
```

Abre el [panel interno](http://localhost:4201) e inicia sesión con la cuenta creada en el paso 3. La [tienda](http://localhost:4200) muestra el catálogo público. Para trabajar con una sola interfaz, ejecuta `npm.cmd --prefix front start` o `npm.cmd --prefix ecommerce-front start` desde la raíz.

## Detener y volver a iniciar

Pulsa `Ctrl+C` en la terminal de Angular y en la de Uvicorn. Desde `back/`, ejecuta `docker compose down` para detener los contenedores y conservar los volúmenes de PostgreSQL y MinIO.

En la siguiente sesión, desde `back/`, ejecuta `docker compose up -d --wait`, `.\.venv\Scripts\python.exe -m alembic upgrade head` y el comando de Uvicorn del paso 3. En otra terminal, desde la raíz, ejecuta `npm.cmd --prefix front run start:all`. Vuelve a instalar dependencias cuando cambien sus archivos de requisitos o bloqueo.

Para más detalles de cada interfaz, consulta las guías del [sistema interno](front/README.md) y del [ecommerce](ecommerce-front/README.md).
