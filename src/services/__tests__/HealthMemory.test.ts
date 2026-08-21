// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueSync, upsert } = vi.hoisted(() => ({
  enqueueSync: vi.fn(async () => undefined),
  upsert: vi.fn(async () => ({ error: { code: 'PGRST205' } })),
}));

vi.mock('../SyncOutbox', () => ({ enqueueSync }));
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-1' } } } })) },
    from: vi.fn(() => ({ upsert })),
  },
}));

import { recordHealthMemory } from '../HealthMemory';

describe('HealthMemory durability', () => {
  beforeEach(() => {
    enqueueSync.mockClear();
    upsert.mockClear();
    window.localStorage.clear();
    window.localStorage.setItem('hc_account', JSON.stringify({ id: 'user-1' }));
  });

  it('queues structured output when the remote table is not deployed yet', async () => {
    const item = recordHealthMemory({
      kind: 'quick_consult',
      source: 'quick_consult',
      title: 'Consult summary',
      occurredAt: '2026-08-21T00:00:00.000Z',
      payload: { questions: ['What should I discuss?'] },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(upsert).toHaveBeenCalledOnce();
    expect(enqueueSync).toHaveBeenCalledWith(
      'health_memory_upsert',
      'user-1',
      expect.objectContaining({ id: item.id, payload: item.payload }),
    );
  });
});
