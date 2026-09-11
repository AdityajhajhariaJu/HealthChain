// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ account: 'hc_unified_profile_a', read: vi.fn(), session: vi.fn() }));
vi.mock('../ProfileEngine', () => ({ getProfileKey: () => state.account }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: state.session } } }));
vi.mock('idb-keyval', () => ({ get: state.read, set: vi.fn(async () => {}), del: vi.fn() }));
vi.mock('../HealthMemory', () => ({ recordHealthMemory: vi.fn() }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: vi.fn(), flushSyncOutbox: vi.fn(), getPendingSyncCount: vi.fn(async () => 0) }));
import { getCases, initCaseEngine, clearCaseEngineCache } from '../CaseEngine';

describe('Case scope isolation', () => {
  beforeEach(() => {
    localStorage.clear(); clearCaseEngineCache(); state.account = 'hc_unified_profile_a';
    state.session.mockResolvedValue({ data: { session: null } });
    state.read.mockReset();
  });
  it('drops cached cases immediately when switching profiles', () => {
    localStorage.setItem('hc_cases_a_profile_1', JSON.stringify([{ id: 'a' }]));
    expect(getCases()[0].id).toBe('a');
    localStorage.setItem(state.account, JSON.stringify({ activeId: 'profile_2' }));
    expect(getCases()).toEqual([]);
  });
  it('does not import unscoped legacy cases into another account', () => {
    localStorage.setItem('hc_cases', JSON.stringify([{ id: 'legacy' }]));
    expect(getCases()).toEqual([]);
  });
  it('ignores a delayed IndexedDB response after a profile switch', async () => {
    state.read.mockImplementation(async () => {
      localStorage.setItem(state.account, JSON.stringify({ activeId: 'profile_2' }));
      return JSON.stringify([{ id: 'old-profile' }]);
    });
    await initCaseEngine();
    expect(getCases()).toEqual([]);
  });
  it('prefers a newer synchronous save over the earlier IndexedDB snapshot', async () => {
    state.read.mockImplementation(async () => {
      localStorage.setItem('hc_cases_a_profile_1', JSON.stringify([{ id: 'new-review' }]));
      return JSON.stringify([{ id: 'old-review' }]);
    });
    await initCaseEngine();
    expect(getCases()[0].id).toBe('new-review');
  });
});
