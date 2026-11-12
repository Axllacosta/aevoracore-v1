import { signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MessageService } from 'primeng/api';
import { EntityApi } from '../api/entity-api';
import { errorMessage } from '../api/api-error';
import { ListState } from './list-state';
export class EntityFacade<T, C, U> extends ListState<T> {
  readonly saving = signal(false);
  readonly operationError = signal('');
  readonly selected = signal<T | null>(null);
  constructor(
    protected readonly api: EntityApi<T, C, U>,
    protected readonly messages: MessageService,
  ) {
    super((query) => api.list(query));
  }
  async detail(id: number) {
    this.operationError.set('');
    try {
      this.selected.set(await firstValueFrom(this.api.get(id)));
      return true;
    } catch (e) {
      this.operationError.set(errorMessage(e));
      return false;
    }
  }
  async save(id: number | null, body: C | U) {
    if (this.saving()) return false;
    this.saving.set(true);
    this.operationError.set('');
    try {
      this.selected.set(
        await firstValueFrom(
          id === null ? this.api.create(body as C) : this.api.update(id, body as U),
        ),
      );
      this.messages.add({
        severity: 'success',
        summary: 'Guardado',
        detail: 'Los cambios se guardaron correctamente.',
      });
      await this.load();
      return true;
    } catch (e) {
      this.operationError.set(errorMessage(e));
      return false;
    } finally {
      this.saving.set(false);
    }
  }
  async deactivate(id: number) {
    if (this.saving()) return;
    this.saving.set(true);
    this.operationError.set('');
    try {
      await firstValueFrom(this.api.deactivate(id));
      this.messages.add({ severity: 'success', summary: 'Registro desactivado' });
      await this.load();
    } catch (e) {
      this.operationError.set(errorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
