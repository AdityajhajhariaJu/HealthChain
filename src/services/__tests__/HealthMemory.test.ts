// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { enqueueSync, upsert, from } = vi.hoisted(() => ({
  enqueueSync: vi.fn(async () => undefined),
  upsert: vi.fn(async () => ({ error: { code: 'PGRST205' } })),
  from: vi.fn(),
}));

vi.mock('../SyncOutbox', () => ({ enqueueSync }));
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'user-1' } } } })) },
    from,
  },
}));

import { getHealthMemory, recordHealthMemory } from '../HealthMemory';

describe('HealthMemory durability', () => {
  beforeEach(() => {
    enqueueSync.mockClear();
    upsert.mockClear();
    from.mockReset();
    from.mockReturnValue({ upsert });
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

  it('hydrates long histories in bounded pages', async () => {
    const { syncHealthMemoryFromSupabase } = await import('../HealthMemory');
    const rows = Array.from({ length: 501 }, (_, index) => ({
      id: `memory-${index}`,
      profile_id: 'profile_1',
      kind: 'quick_consult',
      source: 'quick_consult',
      title: `Memory ${index}`,
      occurred_at: new Date(2026, 0, 1, 0, index).toISOString(),
      created_at: new Date(2026, 0, 1, 0, index).toISOString(),
      updated_at: new Date(2026, 0, 1, 0, index).toISOString(),
      payload: { index },
    }));
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async (start: number) => ({ data: rows.slice(start, start + 500), error: null })),
    };
    from.mockReturnValue(query);

    await syncHealthMemoryFromSupabase();

    expect(query.range).toHaveBeenNthCalledWith(1, 0, 499);
    expect(query.range).toHaveBeenNthCalledWith(2, 500, 999);
  });

  it('reconciles a legacy duplicate by dedupe key', async () => {
    const query = {
      upsert: vi.fn(async () => ({ error: { code: '23505' } })),
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: { id: 'remote-uuid' }, error: null })),
      update: vi.fn(() => query),
    };
    from.mockReturnValue(query);

    const item = recordHealthMemory({
      id: 'evt_legacy_id',
      kind: 'profile_event',
      source: 'profile',
      title: 'Legacy profile event',
      payload: { value: true },
      dedupeKey: 'timeline:evt_legacy_id',
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(query.upsert).toHaveBeenCalledOnce();
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'remote-uuid' }));
    expect(getHealthMemory().find((entry) => entry.id === item.id)).toBeUndefined();
    expect(getHealthMemory().some((entry) => entry.id === 'remote-uuid')).toBe(true);
  });
});
