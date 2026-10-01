// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ disk: new Map<string, any>(), restoreQueue: vi.fn(async () => 2), requested: [] as string[] }));
vi.mock('idb-keyval', () => ({ get: async (key: string) => m.disk.get(key), keys: async () => [...m.disk.keys()], del: async (key: string) => { m.disk.delete(key); }, set: async (key: string, value: any) => { m.disk.set(key, value); } }));
vi.mock('../SyncOutbox', () => ({ restoreArchivedSyncQueue: m.restoreQueue, exportSyncQueue: async () => [] }));
vi.mock('../HealthObservationService', () => ({ listObservationHistory: async () => [] }));
vi.mock('../supabaseClient', () => ({ supabase: { from: (table: string) => {
  const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: null, error: null }), order: (column: string) => { m.requested.push(`${table}:${column}`); return q; }, range: async () => ({ data: [], error: null }) }; return q;
} } }));
import { validateHealthArchive, restoreHealthArchive, exportCloudArchive } from '../HealthArchive';
import { validateArchiveQueue, MAX_HEALTH_ARCHIVE_BYTES } from '../ArchiveRecoveryValidation';
beforeEach(() => { localStorage.clear(); m.disk.clear(); m.restoreQueue.mockClear(); m.restoreQueue.mockResolvedValue(2); m.requested = []; localStorage.setItem('hc_account', JSON.stringify({ id: 'archive-owner' })); });
const archive = () => ({ format: 'healthchain-user-data-v3', ownerId: 'archive-owner', localStorage: { hc_unified_profile_archive_owner: '{}' },
  pendingSync: { hc_sync_outbox_archive_owner: [] }, supabase: { userId: 'archive-owner', cases: [] } });
it('validates and recovers cloud snapshots and pending changes before reporting restore complete', async () => {
  const input = { ...archive(), localStorage: { 'hc_unified_profile_archive-owner': '{"profiles":{}}' }, pendingSync: { 'hc_sync_outbox_archive-owner': [{ id: 'pending-1', userId: 'archive-owner', kind: 'case_delete', attempts: 0, createdAt: '2026-10-01T00:00:00Z', payload: { id: 'case-1', profile_id: 'profile_1' } }] } };
  const checked = validateHealthArchive(input, []); expect(checked.pending).toHaveLength(1); expect(checked.cloud?.cases).toEqual([]);
  const result = await restoreHealthArchive(input, []); expect(result.queued).toBe(2);
  expect(m.restoreQueue).toHaveBeenCalledWith('archive-owner', checked.pending, checked.cloud);
});
it('rejects a foreign row, unknown mutation and mismatched counts before touching storage', async () => {
  expect(() => validateHealthArchive({ ...archive(), supabase: { userId: 'archive-owner', cases: [{ id: 'other', user_id: 'other' }] } }, [])).toThrow('Invalid cloud');
  expect(() => validateArchiveQueue({ 'hc_sync_outbox_archive-owner': [{ id: 'x', userId: 'archive-owner', kind: 'delete_everything', payload: {} }] }, 'archive-owner')).toThrow('Invalid unsent');
  expect(() => validateHealthArchive({ ...archive(), supabase: { userId: 'archive-owner', cases: [], counts: { cases: 4 } } }, [])).toThrow('count mismatch');
  expect(m.restoreQueue).not.toHaveBeenCalled();
});
it('rolls device records back if recovering the unsent queue fails', async () => {
  localStorage.setItem('hc_unified_profile_archive-owner', '{"before":true}'); m.restoreQueue.mockRejectedValueOnce(new Error('capacity'));
  await expect(restoreHealthArchive({ ...archive(), localStorage: { 'hc_unified_profile_archive-owner': '{"after":true}' }, pendingSync: {} }, [])).rejects.toThrow('capacity');
  expect(localStorage.getItem('hc_unified_profile_archive-owner')).toBe('{"before":true}');
});
it('uses the composite profile identity when exporting and includes all recovery collections', async () => {
  const result = await exportCloudArchive('archive-owner'); expect(m.requested).toContain('healthchain_profiles:profile_id');
  expect(m.requested).toContain('case_tombstones:id'); expect(result.user_body_measurements).toEqual([]); expect(result.user_fitness_history).toEqual([]);
  expect(MAX_HEALTH_ARCHIVE_BYTES).toBeGreaterThan(100 * 1024 * 1024 * 4 / 3);
});
