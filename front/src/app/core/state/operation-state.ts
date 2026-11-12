import { signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { MessageService } from 'primeng/api';
import { errorMessage } from '../api/api-error';
export class OperationState {
  readonly saving = signal(false);
  readonly error = signal('');
  constructor(private readonly messages: MessageService) {}
  async run<T>(
    request: () => Observable<T>,
    success: string,
    afterSuccess?: (result: T) => Promise<void>,
  ): Promise<T | null> {
    if (this.saving()) return null;
    this.saving.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(request());
      if (afterSuccess) await afterSuccess(result);
      this.messages.add({ severity: 'success', summary: success });
      return result;
    } catch (e) {
      this.error.set(errorMessage(e));
      return null;
    } finally {
      this.saving.set(false);
    }
  }
}
