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
  account: 'user_sync_concurrent',
  profile: 'profile_1',
};

vi.mock('../ProfileEngine', () => ({
  getProfileKey: vi.fn(() => profileScopeState.account),
  getProfileEngineState: vi.fn(() => ({ activeId: profileScopeState.profile })),
}));

import { enqueueSync, flushSyncOutbox, getPendingSyncCount } from '../SyncOutbox';
import { clearTombstones } from '../TombstoneManager';
import type { CaseItem } from '../CaseEngine';

describe('P1 Finding 2: Concurrent Case Sync Interleaved Writes & Overwrite Prevention', () => {
  const userId = 'user_sync_concurrent';
  const caseId = 'case_concurrent_interleaved_1';

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

  it('rejects stale revision write, performs 3-way merge of server state, and retries safely without overwrite', async () => {
    // Initial server state at revision 2 (committed by Device A earlier)
    const serverStateRev2: CaseItem = {
      id: caseId,
      title: 'Initial Case Title',
      revision: 2,
      updatedAt: '2026-09-11T10:00:00Z',
      events: [
        { id: 'ev_base', label: 'Base event', date: '2026-09-11T09:00:00Z', note: 'Base note' },
        { id: 'ev_device_a', label: 'Device A addition', date: '2026-09-11T09:30:00Z', note: 'Device A note' },
      ],
      questions: [],
      medicalRecords: [],
      appointmentBriefs: undefined,
      reviews: [],
      actions: [],
    } as unknown as CaseItem;

    // Device B read revision 1 previously and added a question locally
    const deviceBLocalCase: CaseItem = {
      id: caseId,
      title: 'Initial Case Title',
      revision: 1, // Stale!
      updatedAt: '2026-09-11T10:05:00Z',
      events: [
        { id: 'ev_base', label: 'Base event', date: '2026-09-11T09:00:00Z', note: 'Base note' },
      ],
      questions: [
        {
          id: 'q_device_b',
          questionText: 'Device B critical question?',
          raisedBySpecialty: 'Endocrinology',
          status: 'open',
          supportingEvidenceIds: [],
        },
      ],
      medicalRecords: [],
      appointmentBriefs: undefined,
      reviews: [],
      actions: [],
    } as unknown as CaseItem;

    let rpcCallCount = 0;
    let finalCommittedData: any = null;

    // Simulate server-side RPC behavior
    rpc.mockImplementation(async (fnName: string, args: any) => {
      if (fnName === 'sync_case_with_revision_check') {
        rpcCallCount++;
        const { p_expected_revision, p_payload } = args;

        // On first attempt by Device B with stale expected revision (1), RPC rejects with conflict
        if (p_expected_revision === 1) {
          return {
            data: {
              success: false,
              conflict: true,
              deleted: false,
              current_revision: 2,
              current_data: serverStateRev2,
            },
            error: null,
          };
        }

        // On merged retry with expected revision 2 (or higher), RPC succeeds
        if (p_expected_revision >= 2) {
          finalCommittedData = p_payload.data;
          return {
            data: {
              success: true,
              conflict: false,
              new_revision: p_expected_revision + 1,
            },
            error: null,
          };
        }
      }
      return { data: null, error: { message: 'Unknown RPC' } };
    });

    from.mockImplementation((table: string) => {
      if (table === 'cases') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                // Initial fetch saw revision 1
                maybeSingle: vi.fn(async () => ({
                  data: {
                    revision: 1,
                    deleted_at: null,
                    data: { id: caseId, revision: 1, events: [{ id: 'ev_base' }] },
                  },
                  error: null,
                })),
              })),
            })),
          })),
          upsert: vi.fn(async (payload: any) => {
            // Unconditional upsert would blindly overwrite!
            return { error: null };
          }),
        };
      }
      if (table === 'case_tombstones') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null })),
              })),
            })),
          })),
        };
      }
      return {};
    });

    // Device B enqueues sync with stale local state
    await enqueueSync('case_upsert', userId, {
      id: caseId,
      profile_id: 'profile_1',
      data: deviceBLocalCase,
      revision: 1,
      expected_revision: 1,
      updated_at: deviceBLocalCase.updatedAt,
    });

    // Flush outbox: Device B attempts sync -> gets conflict -> merges -> retains/schedules retry
    await flushSyncOutbox(userId);

    // After first flush, conflict must have triggered merge with server's revision 2 data
    expect(rpcCallCount).toBeGreaterThanOrEqual(1);

    // Now run second flush: retry should commit with merged data (Device A's event + Device B's question)
    await flushSyncOutbox(userId);

    expect(finalCommittedData).toBeDefined();
    // Both Device A event AND Device B question must exist!
    expect(finalCommittedData.events.some((e: any) => e.id === 'ev_device_a')).toBe(true);
    expect(finalCommittedData.questions.some((q: any) => q.id === 'q_device_b')).toBe(true);
    expect(await getPendingSyncCount(userId)).toBe(0);
  });
});
