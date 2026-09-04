// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const idbStore = new Map<string, unknown>();
const { getSession, from } = vi.hoisted(() => ({
  getSession: vi.fn(async (): Promise<any> => ({ data: { session: null } })),
  from: vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbStore.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { idbStore.set(key, value); }),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession },
    from,
  },
}));

import { enqueueSync, flushSyncOutbox, getPendingSyncCount } from '../SyncOutbox';

describe('SyncOutbox', () => {
  beforeEach(() => {
    idbStore.clear();
    window.localStorage.clear();
    getSession.mockResolvedValue({ data: { session: null } });
    from.mockReset();
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

  it('uses the profile id owner key when flushing profile snapshots', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      upsert: vi.fn(async () => ({ error: null })),
    };
    from.mockReturnValue(query);
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } });

    await enqueueSync('profile_upsert', 'user-1', {
      id: 'user-1',
      full_name: 'Test user',
      updated_at: '2026-08-21T00:00:00.000Z',
    });
    await flushSyncOutbox('user-1');

    expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
    expect(query.eq).not.toHaveBeenCalledWith('user_id', 'user-1');
    expect(query.upsert).toHaveBeenCalledOnce();
    expect(await getPendingSyncCount('user-1')).toBe(0);
  });

  it('recovers a fallback localStorage queue when IndexedDB is empty', async () => {
    idbStore.set('hc_sync_outbox_user-3', []);
    window.localStorage.setItem('hc_sync_outbox_user-3', JSON.stringify([
      { id: 'queued-1', kind: 'case_upsert', userId: 'user-3', payload: { id: 'case-1' }, attempts: 0, createdAt: '2026-08-21T00:00:00.000Z' },
    ]));

    expect(await getPendingSyncCount('user-3')).toBe(1);
    expect(idbStore.get('hc_sync_outbox_user-3')).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'queued-1' }),
    ]));
  });

  it('preserves outbox items without incrementing attempts on network errors', async () => {
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
      upsert: vi.fn(async () => {
        throw new Error('Failed to fetch (network drop)');
      }),
    };
    from.mockReturnValue(query);
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-network' } } } });

    await enqueueSync('profile_upsert', 'user-network', {
      id: 'user-network',
      full_name: 'Offline User',
    });

    await flushSyncOutbox('user-network');

    expect(await getPendingSyncCount('user-network')).toBe(1);
    const queue = idbStore.get('hc_sync_outbox_user-network') as any[];
    expect(queue[0].attempts).toBe(0); // Kept at 0 attempts, not incremented!
    expect(queue[0].lastError).toContain('Failed to fetch');
  });

  it('skips flushing if navigator is offline', async () => {
    const query = {
      upsert: vi.fn(async () => ({ error: null })),
    };
    from.mockReturnValue(query);
    getSession.mockResolvedValue({ data: { session: { user: { id: 'user-offline' } } } });

    await enqueueSync('profile_upsert', 'user-offline', {
      id: 'user-offline',
      full_name: 'Offline User',
    });

    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    try {
      await flushSyncOutbox('user-offline');
      // Should not have called upsert because navigator is offline
      expect(query.upsert).not.toHaveBeenCalled();
      expect(await getPendingSyncCount('user-offline')).toBe(1);
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
    }
  });
});

