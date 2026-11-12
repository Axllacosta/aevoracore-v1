# EDITH · Ecommerce

Frontend público en Angular standalone, SCSS y Bootstrap. Catálogo, detalle de productos, carrito y consulta por WhatsApp.

## Desarrollo y validación

```powershell
npm ci
npm start
npm run build
npm test -- --watch=false
```

El servidor de desarrollo usa `http://localhost:4200`. Las URLs de API y los datos del negocio se configuran en `src/environments` y `src/app/core/config`.

## Estructura

```text
src/
  environments/              Configuración de desarrollo y producción
  styles.scss                Carga Bootstrap y el design system una sola vez
  styles/
    design-system.scss       Entrada del design system
    design-system/
      _tokens.scss           Colores, fuentes, radios y sombras compartidos
      _base.scss             Reset, tipografía, foco y reglas globales comunes
  app/
    app.component.*          Componente raíz y sus pruebas
    core/
      config/                Configuración de API y negocio
      facades/               Coordinación del catálogo, carrito y checkout
      models/                Contratos de datos
      services/              Acceso HTTP, carrito, voz y WhatsApp
    layout/
      announcement-bar/
      header/
      navigation/
      footer/
    shared/
      directives/            Directivas reutilizables de formularios
    features/
      home/
        pages/home-page/
        components/hero-banner/
        components/product-section/
      products/
        pages/product-list/
        pages/product-detail/
        components/product-card/
        components/product-gallery/
        components/product-image/
      cart/pages/cart-page/
      checkout/pages/whatsapp-checkout/
```

Cada componente agrupa sus archivos `*.component.ts`, `*.component.html`, `*.component.scss` y `*.component.spec.ts` en una misma carpeta. `pages` contiene las pantallas de las rutas; `components`, las piezas de cada funcionalidad; `layout`, la estructura común de la aplicación. Las carpetas se crean únicamente cuando se necesitan.

## Estilos

`src/styles/design-system.scss` es la única entrada de los estilos compartidos. Los tokens se declaran una sola vez como propiedades CSS en `_tokens.scss`. Los componentes consumen estas propiedades con `var(...)`; no deben importar Bootstrap ni emitir nuevamente los estilos globales. Las reglas propias de una pantalla permanecen en su SCSS.

Este refactor conserva la apariencia y los valores visuales actuales. La unificación visual de botones, tarjetas, formularios y demás elementos se realizará sobre esta base en la siguiente etapa. Se conserva el aviso de precios referenciales en el detalle de producto.

Para generar un componente con TS, HTML, SCSS y pruebas separados:

```powershell
npx ng g c features/products/components/nombre --skip-import
```

El proyecto configura por defecto SCSS, el sufijo `.component`, archivos separados y generación de pruebas.
