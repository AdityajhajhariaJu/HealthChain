// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const idbStore = new Map<string, unknown>();
const { getSession, from, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(async (): Promise<any> => ({ data: { session: null } })),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idbStore.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { idbStore.set(key, value); }),
  del: vi.fn(async (key: string) => { idbStore.delete(key); }),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession },
    from,
    rpc,
  },
}));

const profileScopeState = {
  account: 'user-default',
  profile: 'profile_1',
};

vi.mock('../ProfileEngine', () => ({
  getProfileKey: vi.fn(() => profileScopeState.account),
  getProfileEngineState: vi.fn(() => ({ activeId: profileScopeState.profile })),
}));

import { enqueueSync, flushSyncOutbox, getPendingSyncCount } from '../SyncOutbox';
import { clearTombstones } from '../TombstoneManager';

describe('P1 Finding 7: Case Deletion Tombstone Safety & Durability', () => {
  const userId = 'user_tombstone_safety_test';

  beforeEach(async () => {
    idbStore.clear();
    window.localStorage.clear();
    profileScopeState.account = userId;
    profileScopeState.profile = 'profile_1';
    await clearTombstones(userId);
    getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } });
    from.mockReset();
    rpc.mockReset();
  });

  it('aborts case deletion and retains outbox entry if tombstone insertion fails', async () => {
    const caseId = 'case_delete_fail_tomb';
    let caseDeleted = false;

    // Simulate tombstone table failure (e.g. lock contention or network error)
    from.mockImplementation((table: string) => {
      if (table === 'case_tombstones') {
        return {
          upsert: vi.fn(async () => ({
            error: { message: 'relation "case_tombstones" is locked', code: '55P03' },
          })),
        };
      }
      if (table === 'cases') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => {
                caseDeleted = true;
                return { error: null };
              }),
            })),
          })),
        };
      }
      return {};
    });

    // Make RPC call indicate failure or not configured so it tests tombstone fallback
    rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist', code: '42883' } });

    await enqueueSync('case_delete', userId, {
      id: caseId,
      profile_id: 'profile_1',
      updated_at: '2026-09-11T12:00:00Z',
    });

    await flushSyncOutbox(userId);

    // CRITICAL: The case MUST NOT be deleted from the cases table when tombstone fails!
    expect(caseDeleted).toBe(false);

    // CRITICAL: The deletion request must remain queued in outbox for automatic retry
    const pending = await getPendingSyncCount(userId);
    expect(pending).toBe(1);
  });

  it('drops in-flight case_upsert if case was already deleted locally or tombstone exists', async () => {
    const caseId = 'case_race_past_delete';
    let upsertExecuted = false;

    from.mockImplementation((table: string) => {
      if (table === 'case_tombstones') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: { id: caseId } })),
              })),
            })),
          })),
        };
      }
      if (table === 'cases') {
        return {
          upsert: vi.fn(async () => {
            upsertExecuted = true;
            return { error: null };
          }),
        };
      }
      return {};
    });

    await enqueueSync('case_upsert', userId, {
      id: caseId,
      profile_id: 'profile_1',
      data: { id: caseId, title: 'Old Case Racing Past Deletion' },
      updated_at: '2026-09-11T12:00:00Z',
    });

    await flushSyncOutbox(userId);

    // The upsert must be dropped and never written to cases
    expect(upsertExecuted).toBe(false);
  });
});
