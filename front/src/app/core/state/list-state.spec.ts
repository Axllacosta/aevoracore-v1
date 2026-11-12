import { Subject } from 'rxjs';
import { ListState } from './list-state';
import { PaginatedResponse } from '../models/api-response.model';
describe('Server-side list state', () => {
  it('does not allow stale responses to replace the latest search', async () => {
    const first = new Subject<PaginatedResponse<string>>();
    const second = new Subject<PaginatedResponse<string>>();
    const fetch = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second);
    const state = new ListState<string>(fetch);
    const old = state.load({ search: 'old' }, 1);
    const current = state.load({ search: 'current' }, 1);
    second.next({ items: ['current'], total: 1, page: 1, page_size: 20, total_pages: 1 });
    await current;
    first.next({ items: ['old'], total: 1, page: 1, page_size: 20, total_pages: 1 });
    await old;
    expect(state.items()).toEqual(['current']);
    expect(state.query()).toEqual({ search: 'current' });
  });
});
