import { Component, inject } from '@angular/core';
import { ProductImages } from '../../components/product-images/product-images.component';
import { ProductCreateWizard } from '../../components/product-create-wizard/product-create-wizard.component';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { CatalogPage } from '../../../../shared/catalog/catalog-page.base';
import { Field, Column, FormValue, FieldGroup } from '../../../../shared/catalog/catalog.models';
import { ProductsFacade } from '../../data-access/products.facade';
import {
  ProductResponse,
  ProductCreate,
  ProductUpdate,
} from '../../../../core/models/product.model';
@Component({
  selector: 'app-product',
  imports: UI,
  providers: [ProductsFacade],
  templateUrl: '../../../../shared/catalog/catalog-page.html',
  styleUrl: './products.component.scss',
})
export class Products extends CatalogPage<ProductResponse, ProductCreate, ProductUpdate> {
  readonly facade = inject(ProductsFacade);
  override readonly extraView = ProductImages;
  override readonly createView = ProductCreateWizard;
  override readonly editorWidth = '1040px';
  override readonly fieldGroups: FieldGroup[] = [
    {
      id: 'general',
      label: 'Información general',
      description: 'Identificación, categoría y descripción del producto.',
      keys: ['nombre', 'sku', 'id_categoria', 'descripcion'],
    },
    {
      id: 'features',
      label: 'Características',
      description: 'Materiales, acabado, color y dimensiones en centímetros.',
      keys: ['material', 'acabado', 'color', 'alto', 'ancho', 'profundidad'],
    },
    {
      id: 'pricing',
      label: 'Precios e inventario',
      description: 'Precios en soles y configuración del control de existencias.',
      keys: ['precio_base', 'costo_referencia', 'controlar_stock'],
    },
  ];
  override readonly lookupError = this.facade.categoryError;
  override retryLookup() {
    void this.facade.loadCategories();
  }
  override readonly rowActions = [
    {
      icon: 'pi pi-images',
      label: 'Ver imágenes',
      run: (row: ProductResponse) => void this.facade.loadImages(row),
    },
  ];
  readonly title = 'Productos';
  readonly singular = 'producto';
  readonly description =
    'Administra el catálogo maestro, precios y características de tus muebles.';
  override categoryOptions() {
    return this.facade
      .categories()
      .map((c) => ({ label: c.nombre + (c.activo ? '' : ' (inactiva)'), value: c.id_categoria }));
  }
  readonly fields: Field[] = [
    {
      key: 'id_categoria',
      label: 'Categoría',
      type: 'select',
      required: true,
      options: () =>
        this.categoryOptions().map((option) => ({
          ...option,
          disabled: !this.facade
            .categories()
            .find((category) => category.id_categoria === option.value)?.activo,
        })),
    },
    { key: 'sku', label: 'SKU', required: true, max: 60 },
    { key: 'nombre', label: 'Nombre', required: true, max: 160 },
    { key: 'color', label: 'Color', max: 60 },
    { key: 'acabado', label: 'Acabado', max: 80 },
    { key: 'material', label: 'Material', max: 100 },
    { key: 'alto', label: 'Alto (cm)', type: 'number', min: 0.01, max: 999999.99 },
    { key: 'ancho', label: 'Ancho (cm)', type: 'number', min: 0.01, max: 999999.99 },
    { key: 'profundidad', label: 'Profundidad (cm)', type: 'number', min: 0.01, max: 999999.99 },
    {
      key: 'precio_base',
      label: 'Precio base (S/)',
      type: 'number',
      required: true,
      min: 0,
      max: 9999999999.99,
    },
    {
      key: 'costo_referencia',
      label: 'Costo de referencia (S/)',
      type: 'number',
      min: 0,
      max: 9999999999.99,
    },
    {
      key: 'controlar_stock',
      label: 'Controlar stock (por defecto habilitado)',
      type: 'select',
      options: () => [
        { label: 'Habilitado: exige stock disponible', value: '1' },
        { label: 'Deshabilitado: permite vender sin stock', value: '0' },
      ],
    },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' },
  ];
  readonly columns: Column[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'nombre', label: 'Producto' },
    { key: 'material', label: 'Material' },
    { key: 'precio_base', label: 'Precio base', money: true },
  ];
  constructor() {
    super();
    this.setup();
  }
  override value(row: ProductResponse, key: string): FormValue {
    if (key === 'controlar_stock') return row.controlar_stock ? '1' : '0';
    return super.value(row, key);
  }
  id(row: ProductResponse) {
    return row.id_producto;
  }
  payload(v: Record<string, FormValue>): ProductCreate {
    return {
      id_categoria: Number(v['id_categoria']),
      sku: this.text(v['sku']).toUpperCase(),
      nombre: this.text(v['nombre']),
      descripcion: this.optional(v['descripcion']),
      color: this.optional(v['color']),
      acabado: this.optional(v['acabado']),
      material: this.optional(v['material']),
      alto: this.number(v['alto']),
      ancho: this.number(v['ancho']),
      profundidad: this.number(v['profundidad']),
      precio_base: Number(v['precio_base']),
      costo_referencia: this.number(v['costo_referencia']),
      controlar_stock: v['controlar_stock'] !== '0',
    };
  }
}
