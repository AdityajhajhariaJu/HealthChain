// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  queue: new Map<string, unknown>(), owner: 'account-a', profile: 'profile_1',
  remoteRevision: 0, writes: [] as number[], idbWriteFail: false,
}));
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => state.queue.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (state.idbWriteFail) throw new Error('IndexedDB unavailable');
    state.queue.set(key, structuredClone(value));
  }),
  del: vi.fn(async (key: string) => { state.queue.delete(key); }),
}));
vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => `hc_unified_profile_${state.owner}`,
  getProfileEngineState: () => ({ activeId: state.profile }),
}));
vi.mock('../supabaseClient', () => ({ supabase: {
  auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: state.owner } } } })) },
  from: (table: string) => {
    if (table !== 'health_observations') throw new Error(`Unexpected table ${table}`);
    return {
      insert: async (row: any) => {
        if (state.remoteRevision) return { error: { code: '23505' } };
        state.remoteRevision = row.revision; state.writes.push(row.revision); return { error: null };
      },
      update: (row: any) => {
        const expected: { value?: number } = {};
        const builder: any = { eq: (name: string, value: unknown) => {
          if (name === 'revision') expected.value = Number(value);
          return builder;
        }, select: () => builder,
        maybeSingle: async () => {
          if (state.remoteRevision !== expected.value) return { data: null, error: null };
          state.remoteRevision = row.revision; state.writes.push(row.revision);
          return { data: { id: row.id }, error: null };
        } };
        return builder;
      },
      select: () => {
        const builder: any = { eq: () => builder,
          maybeSingle: async () => ({ data: state.remoteRevision ? { id: 'obs-1', revision: state.remoteRevision, idempotency_key: 'meal-1' } : null, error: null }) };
        return builder;
      },
    };
  },
} }));

import { enqueueSync, flushSyncOutbox, getPendingSyncCount } from '../SyncOutbox';

const row = (revision: number) => ({ id: 'obs-1', user_id: 'account-a', profile_id: 'profile_1',
  revision, expected_revision: revision - 1, idempotency_key: 'meal-1',
  updated_at: '2026-09-24T12:00:00Z', payload: { kind: 'meal', description: `Meal ${revision}` } });

describe('observation revision sync', () => {
  beforeEach(() => {
    state.queue.clear(); state.owner = 'account-a'; state.profile = 'profile_1'; state.remoteRevision = 0; state.writes = []; state.idbWriteFail = false;
    localStorage.clear();
  });

  it('keeps two offline revisions and replays them in order', async () => {
    await enqueueSync('health_observation_upsert', 'account-a', row(1));
    await enqueueSync('health_observation_upsert', 'account-a', row(2));
    expect(await getPendingSyncCount('account-a')).toBe(2);
    await flushSyncOutbox('account-a');
    expect(state.writes).toEqual([1, 2]);
    expect(await getPendingSyncCount('account-a')).toBe(0);
  });

  it('retains a stale update for explicit conflict handling', async () => {
    state.remoteRevision = 4;
    await enqueueSync('health_observation_upsert', 'account-a', row(2));
    await flushSyncOutbox('account-a');
    expect(state.remoteRevision).toBe(4);
    expect(state.writes).toEqual([]);
    expect(await getPendingSyncCount('account-a')).toBe(1);
  });

  it('reconciles a newer fallback queue with an older IndexedDB queue', async () => {
    await enqueueSync('health_observation_upsert', 'account-a', row(1));
    state.idbWriteFail = true;
    await enqueueSync('health_observation_upsert', 'account-a', row(2));
    state.idbWriteFail = false;
    expect(await getPendingSyncCount('account-a')).toBe(2);
    await flushSyncOutbox('account-a');
    expect(state.writes).toEqual([1, 2]);
    expect(await getPendingSyncCount('account-a')).toBe(0);
  });
});
