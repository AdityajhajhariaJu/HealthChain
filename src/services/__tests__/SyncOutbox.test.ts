// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const idbStore = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbStore.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { idbStore.set(key, value); }),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
  },
}));

import { enqueueSync, getPendingSyncCount } from '../SyncOutbox';

describe('SyncOutbox', () => {
  beforeEach(() => {
    idbStore.clear();
    window.localStorage.clear();
  });

  it('deduplicates pending updates for the same record', async () => {
    await enqueueSync('case_upsert', 'user-1', { id: 'case-1', data: { version: 1 } });
    await enqueueSync('case_upsert', 'user-1', { id: 'case-1', data: { version: 2 } });

    expect(await getPendingSyncCount('user-1')).toBe(1);
    expect(Array.from(idbStore.values())[0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'case_upsert', payload: { id: 'case-1', data: { version: 2 } } }),
    ]));
  });

  it('bounds a queue instead of allowing unbounded browser growth', async () => {
    for (let i = 0; i < 505; i += 1) {
      await enqueueSync('health_memory_upsert', 'user-2', { id: `memory-${i}` });
    }

    expect(await getPendingSyncCount('user-2')).toBe(500);
  });

  it('keeps account queues isolated', async () => {
    await enqueueSync('case_upsert', 'user-1', { id: 'private-case' });
    await enqueueSync('case_upsert', 'user-2', { id: 'other-case' });

    expect(await getPendingSyncCount('user-1')).toBe(1);
    expect(await getPendingSyncCount('user-2')).toBe(1);
    expect(idbStore.get('hc_sync_outbox_user-1')).not.toEqual(idbStore.get('hc_sync_outbox_user-2'));
  });
});
