// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), db: new Map<string, string>() }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: mocks.session } } }));
vi.mock('../ProfileEngine', () => ({ getProfileKey: () => 'hc_unified_profile_test' }));
vi.mock('../HealthMemory', () => ({ recordHealthMemory: vi.fn() }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: vi.fn(), flushSyncOutbox: vi.fn(), getPendingSyncCount: vi.fn() }));
vi.mock('idb-keyval', () => ({ get: async (key: string) => mocks.db.get(key), set: async (key: string, value: string) => { mocks.db.set(key, value); }, del: async (key: string) => { mocks.db.delete(key); } }));
import { createCaseDraft, clearCaseEngineCache, getCases, initCaseEngine } from '../CaseEngine';

beforeEach(() => { localStorage.clear(); mocks.db.clear(); clearCaseEngineCache(); mocks.session.mockResolvedValue({ data: { session: null } }); });
describe('case durability', () => {
  it('writes a recoverable local snapshot before auth resolves', () => {
    mocks.session.mockReturnValue(new Promise(() => {}));
    const draft = createCaseDraft({ title: 'Save before reload' });
    const saved = JSON.parse(localStorage.getItem('hc_cases_test_profile_1') || '[]');
    expect(saved[0].id).toBe(draft.id);
  });
  it('restores all guest drafts, including more than three cases', async () => {
    for (let index = 0; index < 5; index++) createCaseDraft({ title: `Case ${index}` });
    await Promise.resolve();
    clearCaseEngineCache();
    await initCaseEngine();
    expect(getCases()).toHaveLength(5);
  });
});
