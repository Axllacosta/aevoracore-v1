import { Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { UI } from '../../../../shared/ui/prime-ng.imports';
import { ProductsFacade } from '../../data-access/products.facade';
import { AuthStore } from '../../../../core/auth/auth.store';
import { ProductImageResponse } from '../../../../core/models/product.model';
@Component({
  selector: 'app-product-images',
  imports: UI,
  templateUrl: './product-images.component.html',
  styleUrl: './product-images.component.scss',
})
export class ProductImages {
  readonly facade = inject(ProductsFacade);
  private readonly confirms = inject(ConfirmationService);
  readonly user = inject(AuthStore).user;
  canManage() {
    return this.user()?.rol === 'ADMIN';
  }
  upload(event: { files: File[] }) {
    void this.facade.upload(event.files);
  }
  removeImage(image: ProductImageResponse) {
    this.confirms.confirm({
      acceptButtonProps: { severity: 'primary' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      header: 'Eliminar imagen',
      message: 'La imagen se eliminará del producto. ¿Continuar?',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Volver',
      accept: () => void this.facade.imageAction(image, true),
    });
  }
}
