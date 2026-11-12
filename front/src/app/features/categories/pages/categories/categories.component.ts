import { Component, inject } from '@angular/core';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { CatalogPage } from '../../../../shared/catalog/catalog-page.base';
import { Field, Column, FormValue } from '../../../../shared/catalog/catalog.models';
import { CategoriesFacade } from '../../data-access/categories.facade';
import {
  CategoryResponse,
  CategoryCreate,
  CategoryUpdate,
} from '../../../../core/models/category.model';
@Component({
  selector: 'app-category',
  imports: UI,
  providers: [CategoriesFacade],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
})
export class Category extends CatalogPage<CategoryResponse, CategoryCreate, CategoryUpdate> {
  readonly facade = inject(CategoriesFacade);
  readonly title = 'Categorías';
  readonly singular = 'categoría';
  readonly description = 'Organiza el catálogo de muebles de tu negocio.';
  readonly fields: Field[] = [
    { key: 'nombre', label: 'Nombre', required: true, max: 100 },
    { key: 'descripcion', label: 'Descripción', type: 'textarea' as const },
  ];
  readonly columns: Column[] = [
    { key: 'id_categoria', label: 'ID' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
  ];
  constructor() {
    super();
    this.setup();
  }
  id(row: CategoryResponse) {
    return row.id_categoria;
  }
  payload(v: Record<string, FormValue>): CategoryCreate {
    return { nombre: this.text(v['nombre']), descripcion: this.optional(v['descripcion']) };
  }
}
