// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, enqueueSync, flushSyncOutbox } = vi.hoisted(() => ({
  from: vi.fn(), enqueueSync: vi.fn(async () => true), flushSyncOutbox: vi.fn(async () => undefined),
}));
vi.mock('../supabaseClient', () => ({ supabase: { from, auth: { getSession: vi.fn() } } }));
vi.mock('../SyncOutbox', () => ({ enqueueSync, flushSyncOutbox }));
vi.mock('../storage', () => ({
  getItemSync: (key: string) => window.localStorage.getItem(key),
  setItemSync: (key: string, value: string) => window.localStorage.setItem(key, value),
}));
vi.mock('../HealthMemory', () => ({ recordHealthMemory: vi.fn() }));

import { getProfileEngineState, syncProfileFromSupabase } from '../ProfileEngine';

describe('Gut questions during profile download', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('hc_account', JSON.stringify({ id: 'account-a' }));
    from.mockReset();
    enqueueSync.mockClear();
    flushSyncOutbox.mockClear();
  });

  it('keeps a local offline question when a newer cloud profile arrives and queues the union', async () => {
    const ownerKey = 'hc_unified_profile_account-a';
    const question = (id: string, updatedAt: string) => ({
      id, schemaVersion: 1, ownerKey, profileId: 'profile_1', intent: 'understand',
      question: id, focus: 'chai', symptom: 'bloating', status: 'open', selectedStep: null,
      reflection: null, excludedMealIds: [], reviewedEvidence: null, createdAt: updatedAt, updatedAt,
    });
    const local = question('local', '2026-09-23T10:00:00.000Z');
    const remote = question('remote', '2026-09-23T11:00:00.000Z');
    window.localStorage.setItem(ownerKey, JSON.stringify({
      activeId: 'profile_1', profiles: { profile_1: { id: 'profile_1', profileName: 'Local',
        updatedAt: '2026-09-23T10:00:00.000Z', gutResolutionThreads: [local] } },
    }));
    const legacy = { select: vi.fn(() => legacy), eq: vi.fn(() => legacy),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })) };
    const snapshot = { select: vi.fn(() => snapshot), eq: vi.fn(() => snapshot),
      order: vi.fn(async () => ({ data: [{ profile_id: 'profile_1', profile_name: 'Remote',
        updated_at: '2026-09-23T11:00:00.000Z', data: { id: 'profile_1', profileName: 'Remote',
          updatedAt: '2026-09-23T11:00:00.000Z', gutResolutionThreads: [remote] } }], error: null })) };
    from.mockImplementation((table: string) => table === 'profiles' ? legacy : snapshot);

    await syncProfileFromSupabase('account-a');

    const saved = getProfileEngineState().profiles.profile_1;
    expect(saved.gutResolutionThreads.map((item: { id: string }) => item.id)).toEqual(['remote', 'local']);
    expect(enqueueSync).toHaveBeenCalledWith('caregiver_profile_upsert', 'account-a',
      expect.objectContaining({ data: expect.objectContaining({ gutResolutionThreads: saved.gutResolutionThreads }) }));
    expect(flushSyncOutbox).toHaveBeenCalledWith('account-a');
  });
});
