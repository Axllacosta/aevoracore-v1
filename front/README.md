# AevoraCore · Sistema interno

Frontend del MVP administrativo. Angular 22 standalone, TypeScript y templates estrictos, Reactive Forms, facades con signals, PrimeNG 22 y Bootstrap 5 (grid y utilidades). No usa Tailwind ni una plantilla administrativa externa.

## Arranque

Desde `C:\projects\aevoracore-v1\front`:

```powershell
npm ci
npm start
```

Panel interno: **http://localhost:4201**. API de desarrollo: **http://127.0.0.1:8000**. El backend debe estar ejecutándose con PostgreSQL; las imágenes requieren su almacenamiento MinIO.

Para ejecutar los dos fronts con un solo comando:

```powershell
npm run start:all
```

Este comando inicia el ecommerce existente en **4200** y el sistema interno en **4201**, sin editar el ecommerce. Instala previamente las dependencias en ambas carpetas y detén servidores que ocupen esos puertos. Ctrl+C detiene ambos procesos. El backend se ejecuta por separado. La configuración base de CORS del backend admite ambos orígenes; un valor distinto en su `.env` puede reemplazarla.

## Configuración

- `src/environments/development.ts`: URL de desarrollo.
- `src/environments/production.ts`: usa `/api`; configura un reverse proxy hacia FastAPI o cambia la URL por la del despliegue. El reemplazo de entorno ocurre durante el build de producción.
- `primeLicense`: configura tu clave PrimeUI válida en cada entorno. PrimeNG 22 muestra **Invalid PrimeUI License** mientras no haya una clave. No se ha registrado ninguna cuenta ni contratado servicios. Revisa los términos de la versión instalada en `node_modules/primeng/LICENSE.md` y la [documentación oficial](https://primeng.dev/installation).
- El access token vive en memoria; el refresh token, en `sessionStorage`. No se almacenan contraseñas.

## Arquitectura

```text
src/
  environments/       Configuración de desarrollo y producción
  styles.scss         Entrada única de estilos
  styles/
    _shared.scss      Bases y clases que se reutilizan en varias pantallas
    _primeng.scss     Ajustes comunes de PrimeNG y diálogos de la aplicación
  app/
    app.component.*   Componente raíz: TS, HTML, SCSS y pruebas
    core/
      api/            Clientes HTTP y normalización de errores
      auth/           Sesión y renovación de tokens
      config/         Tema de PrimeNG
      guards/         Protección de rutas
      interceptors/   Autorización y errores HTTP
      models/         Contratos de la API
      state/          Estado compartido de operaciones y listados
    layout/
      admin-layout/   Navegación y estructura del panel
    shared/
      catalog/        Controlador base, contratos y plantilla común de catálogos
      directives/     Directivas reutilizables de formularios
      ui/             Imports compartidos de Angular y PrimeNG
      validators/     Validaciones compartidas de texto
    features/
      auth/
      categories/
      customers/
      dashboard/
      expenses/
      inventory/
      kardex/
      products/
      sales/
        pages/        Pantallas que se cargan desde las rutas
        components/   Componentes propios del módulo
        data-access/  Estado y coordinación con los servicios API
        utils/        Funciones de cálculo sin dependencias de la vista
```

Cada módulo utiliza únicamente las subcarpetas que necesita. Los formularios compartidos de clientes están en `customers/forms`. Cada componente agrupa sus archivos `*.component.ts`, `*.component.html`, `*.component.scss` y `*.component.spec.ts` en una carpeta. Productos y clientes reutilizan intencionalmente `shared/catalog/catalog-page.html`, para evitar duplicar la misma tabla y sus diálogos; sus estilos y pruebas permanecen junto a cada página.

Los estilos propios de una pantalla van en su SCSS. Los archivos globales contienen las bases reutilizadas y los ajustes de componentes PrimeNG que renderizan contenido u overlays fuera de la vista. No se agregan mixins ni capas de estilos para reglas de un solo uso.

Para generar un componente con archivos separados y SCSS:

```powershell
npx ng g c features/products/components/nombre --skip-import
```

La configuración del proyecto genera también `spec.ts`, usa el sufijo `.component` y mantiene las plantillas y estilos en archivos separados.

Las páginas coordinan la interacción y los formularios. Las facades exponen estado y operaciones; los servicios API conservan los nombres y tipos del backend. Las operaciones críticas usan confirmación PrimeNG, bloqueo de envíos repetidos y errores visibles. Los listados se paginan en el servidor; los selectores recorren todas las páginas necesarias para no truncarse en 100 registros.

Los clientes y los catálogos se modifican sólo desde la interfaz del administrador; la API aplica la autorización definitiva. Los empleados pueden registrar ventas y movimientos manuales. Los ajustes requieren la autorización adicional existente en el backend; una respuesta 403 se muestra al usuario. La cancelación de ventas y el cambio de stock mínimo requieren ADMIN.

## Consideraciones de integración

- No se encontró `endpoints-doc.txt`: se contrastaron routers y schemas del backend existente sin modificarlo.
- Los errores se interpretan desde `error.message` y `error.details`, además del formato `detail` de FastAPI.
- Productos, categorías, clientes, inventario y kardex usan `page/page_size`. Ventas usa `limit/offset`, devuelve un arreglo y no informa un total; su navegación indica la página y si hay más resultados.
- El POS envía `id_cliente`, `canal_venta`, `medio_pago` y detalles con `descuento_porcentaje`. Sólo la API confirma precios, stock e importes. El borrador no persiste entre sesiones.
- No existe un identificador contractual que marque al cliente general. Selecciona su registro real en el POS; no se asume un ID ni se crea automáticamente. Si aún no existe, un administrador puede registrarlo con los nombres acordados por el negocio.
- Los movimientos y detalles de venta exponen IDs de productos/usuarios. Se muestran como IDs para conservar la información histórica sin inventar nombres.
- El dashboard muestra totales paginados reales para productos y stock bajo. Ventas e ingresos se limitan explícitamente a **las últimas 100 operaciones**; no representan estadísticas globales. No se inventaron endpoints de estadísticas.
- El presupuesto inicial heredado es de 500 kB y actualmente genera una advertencia con PrimeNG 22. El límite de error de 1 MB se mantiene. Las páginas se cargan de forma diferida.

## Validación

```powershell
npm run build
npm test
```

Las pruebas cubren sesión y refresh concurrente, aislamiento del token por origen, errores del backend, carreras entre búsquedas, formularios, indicadores incompletos y el contrato del POS, incluidos errores que deben conservar el borrador.

Prueba de integración contra el backend local (usa la cuenta seed configurada en su `.env`, sin mostrar ni persistir las credenciales):

```powershell
..\back\.venv\Scripts\python.exe scripts/api-smoke.py
```

Para comprobar también operaciones de escritura con registros aislados:

```powershell
..\back\.venv\Scripts\python.exe scripts/api-smoke.py --write
```

`--write` crea registros con prefijo TEST, valida entrada y ajuste de inventario, venta con descuento, pago, kardex y cancelación. Al finalizar cancela su venta si es necesario, deja stock cero y desactiva sus registros. **Los asientos históricos de prueba permanecen** por diseño del backend. Nunca modifica registros comerciales preexistentes.

La verificación visual realizada cubre el login y sus validaciones; la prueba de API cubre los flujos de escritura. Aún conviene realizar la aceptación visual autenticada con los roles reales del negocio y comprobar los tamaños de pantalla usados por el personal.
