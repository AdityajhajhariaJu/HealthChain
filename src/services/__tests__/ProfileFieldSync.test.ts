// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ disk: new Map<string, any>(), remote: {} as any, legacy: null as any, race: false, rpc: vi.fn() }));
vi.mock('idb-keyval', () => ({ get: async (key: string) => structuredClone(m.disk.get(key)), set: async (key: string, value: any) => { m.disk.set(key, structuredClone(value)); }, del: async (key: string) => { m.disk.delete(key); } }));
vi.mock('../supabaseClient', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'sync-owner' } } } }) },
  from: (table: string) => { const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: table === 'profiles' ? m.legacy : { data: structuredClone(m.remote), updated_at: '2026-10-01T00:00:00Z' }, error: null }) }; return query; }, rpc: m.rpc,
} }));
import { mergeProfileFields } from '../ProfileFieldMerge';
import { mergeConnectedProfiles } from '../ConnectedProfileMerge';
import { enqueueSync, flushSyncOutbox, getProfileConflicts, settleProfileConflict, getSyncStatus, exportSyncQueue, restoreArchivedSyncQueue } from '../SyncOutbox';
import { rememberProfileBaseline } from '../ProfileSyncBaseline';
beforeEach(() => {
  localStorage.clear(); m.disk.clear(); localStorage.setItem('hc_account', JSON.stringify({ id: 'sync-owner' }));
  m.remote = { id: 'profile_1', demographics: { weight: 70 }, allergies: [], conditions: [] }; m.legacy = null; m.race = false;
  rememberProfileBaseline('sync-owner', 'profile_1', m.remote);
  localStorage.setItem('hc_unified_profile_sync-owner', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: m.remote } }));
  m.rpc.mockReset(); m.rpc.mockImplementation(async (_name, args) => {
    if (m.race) { m.race = false; m.remote.conditions = ['new cloud condition']; return { data: { conflict: true }, error: null }; }
    expect(args.p_expected_data).toEqual(m.remote); m.remote = structuredClone(args.p_data); return { data: { success: true, data: m.remote }, error: null };
  });
});
const queue = (data: any) => enqueueSync('caregiver_profile_upsert', 'sync-owner', { user_id: 'sync-owner', profile_id: 'profile_1', data });
describe('concurrent profile facts and archive queues', () => {
  it('merges disjoint allergy and weight edits, retries a racing cloud condition and mirrors one acknowledged snapshot', async () => {
    const local = { ...m.remote, demographics: { weight: 73 } }; await queue(local);
    m.remote.allergies = ['peanut']; m.race = true;
    await flushSyncOutbox('sync-owner');
    expect(m.remote).toMatchObject({ demographics: { weight: 73 }, allergies: ['peanut'], conditions: ['new cloud condition'] });
    expect(m.rpc).toHaveBeenCalledTimes(2); expect((await getSyncStatus('sync-owner')).pendingCount).toBe(0);
  });
  it('preserves the oldest baseline while coalescing several offline edits', async () => {
    await queue({ ...m.remote, demographics: { weight: 73 } });
    rememberProfileBaseline('sync-owner', 'profile_1', { ...m.remote, allergies: ['remote'] });
    await queue({ ...m.remote, demographics: { weight: 73 }, allergies: ['local'] });
    const entries = await exportSyncQueue('sync-owner'); expect(entries).toHaveLength(1); expect(entries[0].payload._sync_base.allergies).toEqual([]);
  });
  it('rebases an edit made during a save onto its own acknowledgement without creating a false conflict', async () => {
    await queue({ ...m.remote, demographics: { weight: 73 } });
    let sent!: () => void, release!: () => void;
    const started = new Promise<void>(resolve => { sent = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    m.rpc.mockImplementationOnce(async (_name, args) => { sent(); await gate; m.remote = { ...args.p_data, allergies: ['remote'] }; return { data: { success: true, data: m.remote }, error: null }; });
    const flushing = flushSyncOutbox('sync-owner'); await started;
    await queue({ ...m.remote, demographics: { weight: 75 } }); release(); await flushing; await flushSyncOutbox('sync-owner');
    expect(m.remote.demographics.weight).toBe(75); expect(m.remote.allergies).toEqual(['remote']); expect(await getProfileConflicts('sync-owner')).toEqual([]);
  });
  it('pauses same-field conflicts and saves reviewed cloud choice without rolling it back locally', async () => {
    const local = { ...m.remote, demographics: { weight: 73 } }; localStorage.setItem('hc_unified_profile_sync-owner', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: local } }));
    await queue(local); m.remote.demographics.weight = 75; await flushSyncOutbox('sync-owner');
    expect((await getSyncStatus('sync-owner')).state).toBe('conflict_needs_review'); expect(m.rpc).not.toHaveBeenCalled();
    const reviewed = (await getProfileConflicts('sync-owner'))[0]; await flushSyncOutbox('sync-owner'); expect(m.rpc).not.toHaveBeenCalled();
    await settleProfileConflict('sync-owner', reviewed, { '["demographics","weight"]': 'remote' }); await flushSyncOutbox('sync-owner');
    expect(m.remote.demographics.weight).toBe(75); expect(JSON.parse(localStorage.getItem('hc_unified_profile_sync-owner')!).profiles.profile_1.demographics.weight).toBe(75);
  });
  it('rejects decisions after another local edit and retains both current and archived unsent data', async () => {
    await queue({ ...m.remote, allergies: ['A'] }); m.remote.allergies = ['B']; await flushSyncOutbox('sync-owner');
    const reviewed = (await getProfileConflicts('sync-owner'))[0]; await queue({ ...m.remote, allergies: ['C'] });
    await expect(settleProfileConflict('sync-owner', reviewed, { '["allergies"]': 'local' })).rejects.toThrow('changed during review');
    const old = { ...reviewed, payload: { ...reviewed.payload, data: { ...m.remote, allergies: ['A'] } } };
    await restoreArchivedSyncQueue('sync-owner', [old], null); expect(await exportSyncQueue('sync-owner')).toHaveLength(2);
  });
  it('treats zero, false, null and explicit removals as edits and never merges conflicting allergy arrays silently', () => {
    const b = { weight: 70, flag: true, note: 'x', allergies: ['A'] };
    const result = mergeProfileFields(b, { weight: 0, flag: false, note: null, allergies: [] }, { ...b, country: 'IN' });
    expect(result.conflicts).toEqual([]); expect(result.merged).toEqual({ weight: 0, flag: false, note: null, allergies: [], country: 'IN' });
    expect(mergeProfileFields(b, { ...b, allergies: [] }, { ...b, allergies: ['B'] }).conflicts[0].path).toEqual(['allergies']);
  });
  it('merges separate diet location and cuisine edits across canonical and legacy aliases', () => {
    const b = { dietProfile: { countryCode: 'IN', cuisine: 'North Indian', preferencesUpdatedAt: '2026-10-01T00:00:00Z' } };
    const local = { dietProfile: { ...b.dietProfile, countryCode: 'GB', preferencesUpdatedAt: '2026-10-01T01:00:00Z' } };
    const remote = { dietician: { profile: { ...b.dietProfile, cuisine: 'South Indian', preferencesUpdatedAt: '2026-10-01T02:00:00Z' } } };
    const result = mergeConnectedProfiles(b, local, remote, 'sync-owner', 'profile_1');
    expect(result.conflicts).toEqual([]); expect(result.merged.dietProfile).toMatchObject({ countryCode: 'GB', cuisine: 'South Indian' });
    expect(result.merged.dietician.profile).toEqual(result.merged.dietProfile);
    expect(mergeConnectedProfiles(b, local, { dietProfile: { ...b.dietProfile, countryCode: 'US' } }, 'sync-owner', 'profile_1').conflicts[0].path).toEqual(['dietProfile','countryCode']);
  });
});
