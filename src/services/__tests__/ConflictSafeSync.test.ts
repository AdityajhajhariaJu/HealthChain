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
  del: vi.fn(async (key: string) => { idbStore.delete(key); }),
}));

vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: { getSession },
    from,
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

import { mergeCaseItems } from '../CaseMergeEngine';
import { recordTombstone, isTombstoned, clearTombstones } from '../TombstoneManager';
import { enqueueSync, flushSyncOutbox, getPendingSyncCount, getSyncStatus } from '../SyncOutbox';
import { CaseItem } from '../CaseEngine';

describe('Package 3: Conflict-Safe Cloud Synchronization Suite', () => {
  beforeEach(async () => {
    idbStore.clear();
    window.localStorage.clear();
    profileScopeState.account = 'user-default';
    profileScopeState.profile = 'profile_1';
    await clearTombstones('user-tombstone-test');
    getSession.mockResolvedValue({ data: { session: null } });
    from.mockReset();
  });

  // Scenario 1: Device A adds a note; Device B adds a question -> Both survive
  it('Scenario 1: Merges concurrent additions (Device A note, Device B question) so both survive', () => {
    const baseCase: CaseItem = {
      id: 'case_concurrent_1',
      title: 'Thyroid Investigation',
      updatedAt: '2026-09-01T10:00:00Z',
      revision: 1,
      events: [
        { id: 'ev_base_1', title: 'Initial symptom check', timestamp: '2026-09-01T09:00:00Z', note: 'Fatigue noted' }
      ],
      questions: [
        { id: 'q_base_1', question: 'Should we test Free T3?', status: 'open' }
      ],
    };

    // Device A adds an observation note
    const deviceACase: CaseItem = {
      ...baseCase,
      revision: 2,
      updatedAt: '2026-09-01T10:05:00Z',
      events: [
        ...baseCase.events!,
        { id: 'ev_device_a_1', title: 'Temperature spike', timestamp: '2026-09-01T10:05:00Z', note: 'Body temp 38.2C' }
      ]
    };

    // Device B adds a clinical question
    const deviceBCase: CaseItem = {
      ...baseCase,
      revision: 2,
      updatedAt: '2026-09-01T10:06:00Z',
      questions: [
        ...baseCase.questions!,
        { id: 'q_device_b_1', question: 'Dose adjustment needed for Levothyroxine?', status: 'open' }
      ]
    };

    const { merged, conflicts } = mergeCaseItems(deviceACase, deviceBCase);

    expect(conflicts).toHaveLength(0);
    // Both independent sub-entities survived without loss
    expect(merged.events).toHaveLength(2);
    expect(merged.events?.some((e) => e.id === 'ev_device_a_1')).toBe(true);
    expect(merged.questions).toHaveLength(2);
    expect(merged.questions?.some((q) => q.id === 'q_device_b_1')).toBe(true);
    // Revision monotonic ordering
    expect(merged.revision).toBe(3);
  });

  // Scenario 2: Both edit the same question -> Explicit conflict recorded
  it('Scenario 2: Detects competing modifications to the same question and records an explicit conflict', () => {
    const baseCase: CaseItem = {
      id: 'case_competing_1',
      title: 'Cardiology Review',
      updatedAt: '2026-09-01T10:00:00Z',
      revision: 1,
      questions: [
        { id: 'q_shared_1', question: 'Is Beta Blocker indicated?', status: 'open', outcomeNote: 'Pending consultation' }
      ]
    };

    const deviceACase: CaseItem = {
      ...baseCase,
      revision: 2,
      updatedAt: '2026-09-01T10:10:00Z',
      questions: [
        { id: 'q_shared_1', question: 'Is Beta Blocker indicated?', status: 'answered', outcomeNote: 'Dr Smith approved Metoprolol 25mg' }
      ]
    };

    const deviceBCase: CaseItem = {
      ...baseCase,
      revision: 2,
      updatedAt: '2026-09-01T10:12:00Z',
      questions: [
        { id: 'q_shared_1', question: 'Is Beta Blocker indicated?', status: 'deferred', outcomeNote: 'Hold pending 24h Holter monitor results' }
      ]
    };

    const { merged, conflicts } = mergeCaseItems(deviceACase, deviceBCase);

    expect(conflicts.length).toBeGreaterThan(0);
    const questionConflict = conflicts.find((c) => c.entityId === 'q_shared_1');
    expect(questionConflict).toBeDefined();
    expect(questionConflict?.entityType).toBe('question');
    expect(questionConflict?.resolved).toBe(false);
    expect(questionConflict?.localValue.outcomeNote).toBe('Dr Smith approved Metoprolol 25mg');
    expect(questionConflict?.remoteValue.outcomeNote).toBe('Hold pending 24h Holter monitor results');
    // Conflict recorded on merged case for review UI
    expect(merged.conflicts).toHaveLength(conflicts.length);
  });

  // Scenario 3: Offline device reconnects after deletion -> Tombstone prevents silent resurrection
  it('Scenario 3: Purges stale offline case when reconnecting to a tombstoned case', async () => {
    const caseId = 'case_deleted_remotely_1';
    const userId = 'user-tombstone-test';
    const profileId = 'profile_1';

    // Record tombstone on this device
    await recordTombstone({
      id: caseId,
      entityType: 'case',
      deletedAt: '2026-09-02T12:00:00Z',
      userId,
      profileId,
    });

    const isDeleted = await isTombstoned(caseId, userId, profileId);
    expect(isDeleted).toBe(true);

    // Mock Supabase
    const query = {
      upsert: vi.fn(async () => ({ error: null })),
      delete: vi.fn(async () => ({ error: null })),
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    };
    from.mockReturnValue(query);
    getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } });

    // Enqueue an upsert for the tombstoned case
    await enqueueSync('case_upsert', userId, {
      id: caseId,
      profile_id: profileId,
      data: { id: caseId, title: 'Resurrected Zombie Case' },
      updated_at: '2026-09-01T00:00:00Z', // older than deletion
    });

    await flushSyncOutbox(userId);

    // Outbox should NOT call upsert on cases for a tombstoned record!
    expect(query.upsert).not.toHaveBeenCalled();
    // Outbox item is safely removed without error
    expect(await getPendingSyncCount(userId)).toBe(0);
  });

  // Scenario 4: User changes profile during sync -> Scope guard aborts write
  it('Scenario 4: Scope guard protects against cross-profile writes during asynchronous sync', async () => {
    const userId = 'user_scope_guard';
    profileScopeState.account = userId;
    profileScopeState.profile = 'profile_patient_A';

    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        // Simulate profile switch mid-request!
        profileScopeState.profile = 'profile_patient_B';
        return { data: null, error: null };
      }),
      upsert: vi.fn(async () => ({ error: null })),
    };
    from.mockReturnValue(query);
    getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } });

    await enqueueSync('case_upsert', userId, {
      id: 'case_scope_test',
      profile_id: 'profile_patient_A',
      data: { id: 'case_scope_test', title: 'Profile A Case' },
      updated_at: '2026-09-01T12:00:00Z',
    });

    await flushSyncOutbox(userId);

    // Because profile switched mid-sync, remaining queue keeps the item safely
    expect(await getPendingSyncCount(userId)).toBe(1);
  });

  // Scenario 5: Authentication expires -> Local work retained, no attempt penalty
  it('Scenario 5: Preserves queued work without attempt penalty when auth expires', async () => {
    const userId = 'user_auth_exp';
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        const err: any = new Error('JWT expired');
        err.code = 'PGRST301';
        err.status = 401;
        throw err;
      }),
      upsert: vi.fn(async () => ({ error: null })),
    };
    from.mockReturnValue(query);
    getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } });

    let authExpiredEventFired = false;
    const onAuthExpired = () => { authExpiredEventFired = true; };
    window.addEventListener('hc_sync_auth_expired', onAuthExpired);

    await enqueueSync('case_upsert', userId, {
      id: 'case_auth_exp_1',
      data: { id: 'case_auth_exp_1', title: 'Protected Offline Case' },
      updated_at: '2026-09-01T12:00:00Z',
    });

    await flushSyncOutbox(userId);

    window.removeEventListener('hc_sync_auth_expired', onAuthExpired);

    expect(authExpiredEventFired).toBe(true);
    expect(await getPendingSyncCount(userId)).toBe(1);

    // Verify status returns sync_failed with details
    const status = await getSyncStatus(userId);
    expect(status.state).toBe('sync_failed');
    expect(status.pendingCount).toBe(1);
  });

  // Scenario 6: Server request fails -> Outbox retains pending operation
  it('Scenario 6: Retains pending operation in outbox when server request fails with network error', async () => {
    const userId = 'user_server_fail';
    const query = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => {
        throw new Error('Failed to fetch (connection refused)');
      }),
    };
    from.mockReturnValue(query);
    getSession.mockResolvedValue({ data: { session: { user: { id: userId } } } });

    await enqueueSync('case_upsert', userId, {
      id: 'case_fail_1',
      data: { id: 'case_fail_1', title: 'Pending Case' },
      updated_at: '2026-09-01T12:00:00Z',
    });

    await flushSyncOutbox(userId);

    expect(await getPendingSyncCount(userId)).toBe(1);
    const status = await getSyncStatus(userId);
    expect(status.state).toBe('sync_failed');
    expect(status.lastError).toContain('Failed to fetch');
  });

  // Scenario 7: Retry repeats a request -> Deduplication prevents duplicate events
  it('Scenario 7: Deduplicates repeated enqueue requests and merges entity arrays cleanly without duplicates', async () => {
    const userId = 'user_dedupe';

    // Enqueue twice with the same case ID
    await enqueueSync('case_upsert', userId, {
      id: 'case_dedupe_1',
      data: {
        id: 'case_dedupe_1',
        title: 'Case Deduplication Test',
        events: [{ id: 'ev_1', title: 'Symptom', timestamp: '2026-09-01T10:00:00Z' }]
      },
    });

    await enqueueSync('case_upsert', userId, {
      id: 'case_dedupe_1',
      data: {
        id: 'case_dedupe_1',
        title: 'Case Deduplication Test Updated',
        events: [{ id: 'ev_1', title: 'Symptom', timestamp: '2026-09-01T10:00:00Z' }]
      },
    });

    // Outbox queue itself is deduplicated by record ID
    expect(await getPendingSyncCount(userId)).toBe(1);

    // Merge engine also deduplicates events by ID
    const local = {
      id: 'case_dedupe_1',
      title: 'Version A',
      events: [{ id: 'ev_1', title: 'Symptom', timestamp: '2026-09-01T10:00:00Z' }],
      updatedAt: '2026-09-01T10:00:00Z',
      revision: 1
    };
    const remote = {
      id: 'case_dedupe_1',
      title: 'Version B',
      events: [{ id: 'ev_1', title: 'Symptom', timestamp: '2026-09-01T10:00:00Z' }],
      updatedAt: '2026-09-01T10:05:00Z',
      revision: 2
    };

    const { merged } = mergeCaseItems(local, remote);
    expect(merged.events).toHaveLength(1);
  });

  // Scenario 8: Server timestamp differs from device clock -> Clock-skew immunity
  it('Scenario 8: Relies on monotonic revisions rather than device clocks to prevent clock-skew drops', () => {
    // Local device clock is 2 years behind server time
    const localSkewedCase: CaseItem = {
      id: 'case_clock_skew',
      title: 'Thyroid Investigation',
      updatedAt: '2024-01-01T00:00:00Z', // old clock!
      revision: 3,
      events: [
        { id: 'ev_skew_1', title: 'New observation on client with skewed clock', timestamp: '2024-01-01T00:00:00Z' }
      ]
    };

    // Server time is 2026
    const serverCase: CaseItem = {
      id: 'case_clock_skew',
      title: 'Thyroid Investigation',
      updatedAt: '2026-09-11T12:00:00Z',
      revision: 2,
      events: [
        { id: 'ev_server_1', title: 'Server recorded event', timestamp: '2026-09-11T12:00:00Z' }
      ]
    };

    // Under naive timestamp comparison, localSkewedCase would have been discarded because 2024 < 2026.
    // Under mergeCaseItems, both events survive and revision increments monotonically!
    const { merged, conflicts } = mergeCaseItems(localSkewedCase, serverCase);

    expect(conflicts).toHaveLength(0);
    expect(merged.events).toHaveLength(2);
    expect(merged.events?.some((e) => e.id === 'ev_skew_1')).toBe(true);
    expect(merged.events?.some((e) => e.id === 'ev_server_1')).toBe(true);
    expect(merged.revision).toBe(4); // max(3, 2) + 1
  });
});
