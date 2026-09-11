// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ account: 'account_a', profile: 'profile_a', get: vi.fn(), set: vi.fn(), del: vi.fn(), keys: vi.fn() }));
vi.mock('idb-keyval', () => ({ get: state.get, set: state.set, del: state.del, keys: state.keys }));
vi.mock('../ProfileEngine', () => ({ getProfileKey: () => state.account, getProfileEngineState: () => ({ activeId: state.profile }) }));
import { loadOriginalCaseFile, saveOriginalCaseFile } from '../caseRecordFiles';

describe('Original case file isolation', () => {
  beforeEach(() => { vi.clearAllMocks(); state.account = 'account_a'; state.profile = 'profile_a'; });
  it('stores originals under the account, profile, case and record', async () => {
    const file = new File(['source'], 'report.pdf');
    await saveOriginalCaseFile('case_a', 'record_a', file);
    expect(state.set).toHaveBeenCalledWith('hc_original_record:account_a:profile_a:case_a:record_a', file);
  });
  it('rejects missing case identifiers', async () => {
    await expect(saveOriginalCaseFile('', 'record_a', new File([], 'report.pdf'))).rejects.toThrow();
    expect(state.set).not.toHaveBeenCalled();
  });
  it('does not expose an original after the profile changes during retrieval', async () => {
    state.get.mockImplementationOnce(async () => { state.profile = 'profile_b'; return new Blob(['source']); });
    expect(await loadOriginalCaseFile('case_a', 'record_a')).toBeNull();
  });
  it('returns an available original without inventing a missing file', async () => {
    const file = new Blob(['source']);
    state.get.mockResolvedValueOnce(file).mockResolvedValueOnce(undefined);
    expect(await loadOriginalCaseFile('case_a', 'record_a')).toBe(file);
    expect(await loadOriginalCaseFile('case_a', 'record_b')).toBeNull();
  });
});
