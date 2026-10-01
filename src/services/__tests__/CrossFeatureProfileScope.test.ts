// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), session: vi.fn(), queue: vi.fn(async () => true), flush: vi.fn(async () => {}), memory: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: { from: mocks.from, auth: { getSession: mocks.session } } }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: mocks.queue, flushSyncOutbox: mocks.flush }));
vi.mock('../HealthMemory', () => ({ recordHealthMemory: mocks.memory }));
vi.mock('../storage', () => ({ getItemSync: (key: string) => localStorage.getItem(key), setItemSync: (key: string, value: string) => localStorage.setItem(key, value) }));
import { canUndo, getProfile, getProfileEngineState, getTodayCheckin, recordDailyCheckin, saveProfile, syncProfileFromSupabase, undoProfileEdit } from '../ProfileEngine';
const account = (id: string) => localStorage.setItem('hc_account', JSON.stringify({ id }));
function seed(id: string, profile: any = {}) {
  localStorage.setItem(`hc_unified_profile_${id}`, JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: { id: 'profile_1', profileName: id, demographics: {}, ...profile } } }));
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function remote(legacy: Promise<any> | any, snapshots: any[] = []) {
  const row: any = { select: () => row, eq: () => row, maybeSingle: () => Promise.resolve(legacy) };
  const profiles: any = { select: () => profiles, eq: () => profiles, order: async () => ({ data: snapshots, error: null }) };
  mocks.from.mockImplementation(table => table === 'profiles' ? row : profiles);
}
beforeEach(() => {
  localStorage.clear(); window.dispatchEvent(new Event('hc_logout')); account('account-a'); seed('account-a');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://fixture.invalid'); vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'fixture-key');
  mocks.from.mockReset(); mocks.session.mockReset(); mocks.queue.mockClear(); mocks.flush.mockClear(); mocks.memory.mockClear();
  mocks.session.mockResolvedValue({ data: { session: { user: { id: 'account-a' } } } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('shared profile ownership and corrections', () => {
  it('does not replace a newer local edit with an earlier download for the same account', async () => {
    const load = deferred<any>(); remote(load.promise);
    const pending = syncProfileFromSupabase('account-a');
    await saveProfile({ ...getProfile(), healthFocus: 'new local concern' });
    load.resolve({ data: { health_focus: 'older remote concern', updated_at: '2099-10-01T00:00:00Z' }, error: null });
    await pending;
    expect(getProfile().healthFocus).toBe('new local concern');
  });
  it('does not queue an older edit after a newer save finishes authentication', async () => {
    const auth = deferred<any>(); mocks.session.mockReturnValueOnce(auth.promise);
    const oldSave = saveProfile({ ...getProfile(), healthFocus: 'old local concern' });
    await saveProfile({ ...getProfile(), healthFocus: 'new local concern' });
    auth.resolve({ data: { session: { user: { id: 'account-a' } } } }); await oldSave;
    expect(mocks.queue).toHaveBeenCalledTimes(2);
    expect(mocks.queue.mock.calls.every((call: any[]) => !JSON.stringify(call).includes('old local concern'))).toBe(true);
  });
  it('does not queue account A profile under account B after delayed authentication', async () => {
    const auth = deferred<any>(); mocks.session.mockReturnValue(auth.promise);
    const save = saveProfile({ ...getProfile(), healthFocus: 'private A concern' });
    account('account-b'); seed('account-b');
    auth.resolve({ data: { session: { user: { id: 'account-b' } } } }); await save;
    expect(mocks.queue).not.toHaveBeenCalled(); expect(getProfile().healthFocus).not.toBe('private A concern');
  });
  it('discards a delayed account A download after switching to B', async () => {
    const load = deferred<any>(); remote(load.promise);
    const pending = syncProfileFromSupabase('account-a'); account('account-b'); seed('account-b');
    load.resolve({ data: { full_name: 'private account A', updated_at: '2026-10-01T00:00:00Z' }, error: null }); await pending;
    expect(getProfile().profileName).toBe('account-b'); expect(mocks.queue).not.toHaveBeenCalled();
  });
  it('rejects an A → logout → A response from the previous session epoch', async () => {
    const load = deferred<any>(); remote(load.promise); const pending = syncProfileFromSupabase('account-a');
    window.dispatchEvent(new Event('hc_logout'));
    load.resolve({ data: { full_name: 'stale response', updated_at: '2026-10-01T00:00:00Z' }, error: null }); await pending;
    expect(getProfile().profileName).toBe('account-a');
  });
  it('rejects a mismatched explicit download owner before querying', async () => {
    await syncProfileFromSupabase('account-b'); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('never uploads an explicit guest profile through a stale signed-in session', async () => {
    localStorage.setItem('hc_guest_mode', 'true'); await saveProfile(getProfile());
    await syncProfileFromSupabase('account-a'); expect(mocks.queue).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('respects newer explicitly empty medications, conditions and allergies', async () => {
    seed('account-a', { updatedAt: '2026-09-01T00:00:00Z', conditions: ['old'], allergies: ['old'], medications: [{ id: 'old', name: 'old', time: '' }] });
    remote({ data: { full_name: 'updated', updated_at: '2026-10-01T00:00:00Z', medications: [], conditions: [], allergies: [] }, error: null });
    await syncProfileFromSupabase('account-a'); const saved = getProfileEngineState().profiles.profile_1;
    expect(saved.medications).toEqual([]); expect(saved.conditions).toEqual([]); expect(saved.allergies).toEqual([]);
  });
  it('cannot undo account A edits into account B', async () => {
    await saveProfile(getProfile()); await saveProfile({ ...getProfile(), healthFocus: 'A' }); expect(canUndo()).toBe(true);
    account('account-b'); seed('account-b'); expect(canUndo()).toBe(false); undoProfileEdit(); expect(getProfile().profileName).toBe('account-b');
  });
  it('keeps yesterday when recording today and archives the check-in under a supported kind', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 1, 0, 10));
    seed('account-a', { dailyCheckins: [{ id: 'yesterday', localDate: '2026-09-30', date: '2026-09-30T18:50:00Z', symptom: 'yesterday' }] });
    expect(getTodayCheckin()).toBeUndefined(); recordDailyCheckin({ symptom: 'today', severity: 'Mild', score: 0, note: '', lifestyle: {} });
    expect(getProfile().dailyCheckins).toHaveLength(2); expect(getTodayCheckin()?.symptom).toBe('today');
    expect(mocks.memory).toHaveBeenCalledWith(expect.objectContaining({ kind: 'profile_event', source: 'daily_checkin', dedupeKey: 'daily_checkin:2026-10-01' }));
  });
});
