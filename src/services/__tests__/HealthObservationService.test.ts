// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ObservationDraft } from '../../domain/observations/types';

const state = vi.hoisted(() => ({
  records: new Map<string, unknown>(), owner: 'account-a', profile: 'profile_1', queueOk: true, idbWriteFail: false,
  queued: [] as Array<{ kind: string; userId: string; payload: any }>,
}));
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => state.records.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (state.idbWriteFail) throw new Error('IndexedDB unavailable');
    state.records.set(key, structuredClone(value));
  }),
}));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: state.owner ? { user: { id: state.owner } } : null } })) } } }));
vi.mock('../ProfileEngine', () => ({ getProfileEngineState: () => ({ activeId: state.profile }) }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: vi.fn(async (kind: string, userId: string, payload: any) => {
  state.queued.push({ kind, userId, payload }); return state.queueOk;
}) }));

import { createObservation, deleteObservation, listObservations, reviseObservation } from '../HealthObservationService';

const draft = (): ObservationDraft => ({
  ownerId: state.owner, profileId: state.profile, payload: { kind: 'meal', description: 'Rice and dal' },
  occurredAt: null, localDate: '2026-09-24', timezone: null, timePrecision: 'date_only',
  source: 'gut', evidenceType: 'user_report', idempotencyKey: 'meal-command-1',
});

describe('canonical observation local commands', () => {
  beforeEach(() => {
    state.records.clear(); state.queued = []; state.owner = 'account-a'; state.profile = 'profile_1'; state.queueOk = true; state.idbWriteFail = false;
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
});
