// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObservationDraft } from '../../domain/observations/types';

const state = vi.hoisted(() => ({
  records: new Map<string, unknown>(), owner: 'account-a', profile: 'profile_1', queueOk: true, idbWriteFail: false,
  queued: [] as Array<{ kind: string; userId: string; payload: any }>,
  remoteRows: [] as any[], remoteError: null as null | { code: string }, pendingIds: new Set<string>(),
}));
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => state.records.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (state.idbWriteFail) throw new Error('IndexedDB unavailable');
    state.records.set(key, structuredClone(value));
  }),
}));
vi.mock('../supabaseClient', () => ({ supabase: {
  auth: { getSession: vi.fn(async () => ({ data: { session: state.owner ? { user: { id: state.owner } } : null } })) },
  from: () => {
    const builder: any = { select: () => builder, eq: () => builder, order: () => builder,
      range: async (start: number, end: number) => ({ data: state.remoteRows.slice(start, end + 1), error: state.remoteError }) };
    return builder;
  },
} }));
vi.mock('../ProfileEngine', () => ({ getProfileEngineState: () => ({ activeId: state.profile }) }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: vi.fn(async (kind: string, userId: string, payload: any) => {
  state.queued.push({ kind, userId, payload }); return state.queueOk;
}), getPendingObservationIds: vi.fn(async () => state.pendingIds) }));

import { createObservation, deleteObservation, listObservations, loadObservationsFromCloud, reviseObservation } from '../HealthObservationService';

const draft = (): ObservationDraft => ({
  ownerId: state.owner, profileId: state.profile, payload: { kind: 'meal', description: 'Rice and dal' },
  occurredAt: null, localDate: '2026-09-24', timezone: null, timePrecision: 'date_only',
  source: 'gut', evidenceType: 'user_report', idempotencyKey: 'meal-command-1',
});

describe('canonical observation local commands', () => {
  beforeEach(() => {
    state.records.clear(); state.queued = []; state.owner = 'account-a'; state.profile = 'profile_1'; state.queueOk = true; state.idbWriteFail = false;
    state.remoteRows = []; state.remoteError = null; state.pendingIds = new Set();
    localStorage.clear();
  });

  it('saves once for the same command and keeps revisions in order', async () => {
    const first = await createObservation(draft());
    expect(first.ok).toBe(true);
    const repeat = await createObservation(draft());
    expect(repeat.ok).toBe(true);
    expect(await listObservations()).toHaveLength(1);
    expect(state.queued).toHaveLength(2);
    if (!first.ok) return;
    const revised = await reviseObservation(first.observation.id, 1, { ...draft(), payload: { kind: 'meal', description: 'Rice, dal and curd' } });
    expect(revised.ok).toBe(true);
    expect(state.queued.map((item) => item.payload.revision)).toEqual([1, 1, 2]);
    const stale = await reviseObservation(first.observation.id, 1, draft());
    expect(stale).toMatchObject({ ok: false, error: 'revision_conflict' });
  });

  it('isolates accounts and profiles after a switch', async () => {
    await createObservation(draft());
    state.owner = 'account-b';
    expect(await listObservations()).toHaveLength(0);
    expect(await createObservation({ ...draft(), ownerId: 'account-a' })).toMatchObject({ ok: false, error: 'scope_changed' });
    state.owner = 'account-a'; state.profile = 'profile_2';
    expect(await listObservations()).toHaveLength(0);
  });

  it('keeps a locally saved observation visible when the sync queue is full', async () => {
    state.queueOk = false;
    const result = await createObservation(draft());
    expect(result).toMatchObject({ ok: true, sync: 'queue_failed' });
    expect(await listObservations()).toHaveLength(1);
    state.queueOk = true;
    const retry = await createObservation(draft());
    expect(retry).toMatchObject({ ok: true, sync: 'pending' });
    expect(await listObservations()).toHaveLength(1);
    expect(state.queued.map((item) => item.payload.revision)).toEqual([1, 1]);
  });

  it('reconciles a newer fallback revision over a stale IndexedDB copy', async () => {
    const first = await createObservation(draft());
    if (!first.ok) throw new Error('Expected a saved observation');
    state.idbWriteFail = true;
    const revised = await reviseObservation(first.observation.id, 1, { ...draft(), payload: { kind: 'meal', description: 'Rice and dal, corrected' } });
    expect(revised).toMatchObject({ ok: true, observation: { revision: 2 } });
    state.idbWriteFail = false;
    const visible = await listObservations();
    expect(visible).toHaveLength(1);
    expect(visible[0].revision).toBe(2);
    expect(visible[0].payload).toMatchObject({ description: 'Rice and dal, corrected' });
    expect(localStorage.getItem('hc_observations_v1:account-a:profile_1')).toBeNull();
  });

  it('keeps a deletion tombstone while hiding the record from ordinary history', async () => {
    const saved = await createObservation(draft());
    if (!saved.ok) throw new Error('Expected a saved observation');
    const deleted = await deleteObservation(saved.observation.id, 1);
    expect(deleted).toMatchObject({ ok: true, observation: { revision: 2 } });
    expect(await listObservations()).toHaveLength(0);
    expect(state.queued.map((item) => item.payload.revision)).toEqual([1, 2]);
    expect(state.queued[1].payload.deleted_at).not.toBeNull();
  });

  it('loads an account-owned remote record once without inventing another local command', async () => {
    state.remoteRows = [{ id: 'remote-1', user_id: 'account-a', profile_id: 'profile_1',
      payload: { kind: 'meal', description: 'Rice and dal' }, occurred_at: null, local_date: '2026-09-24',
      timezone: null, time_precision: 'date_only', source: 'gut', evidence_type: 'user_report',
      source_record_id: null, source_locator: null, idempotency_key: 'remote-meal-1', revision: 1,
      recorded_at: '2026-09-24T12:00:00Z', created_at: '2026-09-24T12:00:00Z', updated_at: '2026-09-24T12:00:00Z', deleted_at: null }];
    expect(await loadObservationsFromCloud()).toMatchObject({ status: 'loaded', imported: 1, conflicts: 0 });
    expect(await loadObservationsFromCloud()).toMatchObject({ status: 'loaded', imported: 0, conflicts: 0 });
    expect((await listObservations()).map((item) => item.id)).toEqual(['remote-1']);
    expect(state.queued).toHaveLength(0);
  });

  it('preserves an unsent local revision and reports an unavailable remote relation', async () => {
    const saved = await createObservation(draft());
    if (!saved.ok) throw new Error('Expected local record');
    state.remoteRows = [{ id: saved.observation.id, user_id: 'account-a', profile_id: 'profile_1',
      payload: { kind: 'meal', description: 'Older remote text' }, occurred_at: null, local_date: '2026-09-24',
      timezone: null, time_precision: 'date_only', source: 'gut', evidence_type: 'user_report',
      source_record_id: null, source_locator: null, idempotency_key: 'meal-command-1', revision: 2,
      recorded_at: saved.observation.recordedAt, created_at: saved.observation.createdAt,
      updated_at: '2026-09-25T12:00:00Z', deleted_at: null }];
    state.pendingIds.add(saved.observation.id);
    expect(await loadObservationsFromCloud()).toMatchObject({ status: 'conflict', imported: 0, conflicts: 1 });
    expect((await listObservations())[0].payload).toMatchObject({ description: 'Rice and dal' });
    state.remoteError = { code: 'PGRST205' };
    expect(await loadObservationsFromCloud()).toMatchObject({ status: 'unavailable', imported: 0 });
    expect((await listObservations())[0].payload).toMatchObject({ description: 'Rice and dal' });
  });

  it('applies a newer cloud deletion without resurrecting the local record', async () => {
    const saved = await createObservation(draft());
    if (!saved.ok) throw new Error('Expected local record');
    state.remoteRows = [{ id: saved.observation.id, user_id: 'account-a', profile_id: 'profile_1',
      payload: saved.observation.payload, occurred_at: null, local_date: '2026-09-24', timezone: null,
      time_precision: 'date_only', source: 'gut', evidence_type: 'user_report', source_record_id: null,
      source_locator: null, idempotency_key: 'meal-command-1', revision: 2,
      recorded_at: saved.observation.recordedAt, created_at: saved.observation.createdAt,
      updated_at: '2026-09-25T12:00:00Z', deleted_at: '2026-09-25T12:00:00Z' }];
    expect(await loadObservationsFromCloud()).toMatchObject({ status: 'loaded', imported: 1 });
    expect(await listObservations()).toHaveLength(0);
  });
});
