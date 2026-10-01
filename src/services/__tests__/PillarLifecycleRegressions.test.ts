// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ disk: new Map<string, any>(), profile: { id: 'profile_1', demographics: {}, medications: [], allergies: [], conditions: [] } as any }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }));
vi.mock('../SyncOutbox', () => ({ enqueueSync: async () => true }));
vi.mock('../ProfileEngine', () => ({ getProfile: () => state.profile, getProfileEngineState: () => ({ activeId: 'profile_1' }), getProfileKey: () => 'hc_unified_profile_guest' }));
vi.mock('../storage', () => ({ getItemSync: (key: string) => localStorage.getItem(key), setItemSync: (key: string, value: string) => localStorage.setItem(key, value), removeItemSync: (key: string) => localStorage.removeItem(key) }));
vi.mock('idb-keyval', () => ({ get: async (key: string) => state.disk.get(key), set: async (key: string, value: any) => { state.disk.set(key, value); }, del: async (key: string) => { state.disk.delete(key); }, keys: async () => [...state.disk.keys()] }));
vi.mock('../HealthObservationService', () => ({ listObservationHistory: async () => [] }));
import { isDurableHealthStorageKey } from '../DurableHealthStorage';
import { key, cleanupCaseOriginalFiles } from '../caseRecordFiles';
import { validateHealthArchive, restoreHealthArchive } from '../HealthArchive';
import { recordHealthMemory, getHealthMemory, flushHealthMemory } from '../HealthMemory';

beforeEach(() => { localStorage.clear(); state.disk.clear(); window.dispatchEvent(new Event('hc_logout')); localStorage.setItem('hc_guest_mode', 'true'); });
describe('pillar lifecycle regression checks', () => {
  it('DA-01: original files survive logout', () => {
    const originalKey = key('synthetic-case', 'synthetic-record');
    expect(originalKey).toBe('hc_original_record:hc_unified_profile_guest:profile_1:synthetic-case:synthetic-record');
    expect(isDurableHealthStorageKey(originalKey)).toBe(true);
    expect(isDurableHealthStorageKey('hc_cases_guest_profile_1')).toBe(true);
  });
  it('DA-02: plain-text active-case exports restore without coercion', () => {
    const archive = { format: 'healthchain-user-data-v2', ownerId: 'guest', localStorage: { hc_active_case_guest_profile_1: 'de305d54-75b4-431b-adb2-eb6b9e546014', hc_cases_guest_profile_1: '[]' } };
    expect(validateHealthArchive(archive, ['hc_active_case_guest', 'hc_cases_guest']).entries.hc_active_case_guest_profile_1).toBe(archive.localStorage.hc_active_case_guest_profile_1);
  });
  it('DA-03: cloud snapshots are explicitly separate from local restore', async () => {
    const result = await restoreHealthArchive({ format: 'healthchain-user-data-v2', ownerId: 'guest', localStorage: { hc_unified_profile_guest: '{"profiles":{}}' }, supabase: { cases: [{ id: 'cloud-only-case', data: { title: 'SYNTHETIC_CLOUD_ONLY' } }] } }, ['hc_unified_profile_guest', 'hc_cases_guest']);
    expect(result.count).toBe(1);
    expect(localStorage.getItem('hc_cases_guest_profile_1')).toBeNull();
    expect(JSON.stringify([...state.disk.values()])).not.toContain('SYNTHETIC_CLOUD_ONLY');
  });
  it('DA-04: caller, result and reader mutation cannot change saved memory', async () => {
    const payload = { value: 12, unit: 'synthetic-unit' };
    const saved = recordHealthMemory({ kind: 'lab_report', source: 'audit', title: 'Synthetic memory', occurredAt: '2026-10-01T00:00:00Z', payload });
    await flushHealthMemory();
    payload.value = 99; saved.payload.value = 88;
    getHealthMemory().find(item => item.id === saved.id)!.payload.value = 77;
    const current = getHealthMemory().find(item => item.id === saved.id)!;
    expect(current.payload.value).toBe(12);
    expect(current.updatedAt).toBe(saved.updatedAt);
  });
  it('DA-05: case cleanup preserves other owners originals with the same case ID', async () => {
    const a = key('shared-case', 'record');
    const b = 'hc_original_record:hc_unified_profile_owner-b:profile_1:shared-case:record';
    state.disk.set(a, 'A-original'); state.disk.set(b, 'B-original');
    await cleanupCaseOriginalFiles('shared-case');
    expect(state.disk.has(a)).toBe(false); expect(state.disk.has(b)).toBe(true);
  });
});
