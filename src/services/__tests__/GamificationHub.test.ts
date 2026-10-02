// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  completeActivity,
  getGamificationHub,
  importEarnedTrophies,
  reportLegacyActivity,
  setIslandTheme,
  tendIsland,
} from '../GamificationHub';
import { mergeConnectedProfiles } from '../ConnectedProfileMerge';
import { createLedger, recordActivity } from '../gamification/model';
const state = vi.hoisted(() => ({
  owner: 'guest',
  profile: 'profile_1',
  records: {} as Record<string, any>,
  write: true,
}));
vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => `hc_unified_profile_${state.owner}`,
  getProfileEngineState: () => ({ activeId: state.profile }),
  getProfile: () => structuredClone(state.records[`${state.owner}:${state.profile}`] || {}),
  saveProfile: vi.fn(async (profile) => {
    if (state.write) state.records[`${state.owner}:${state.profile}`] = structuredClone(profile);
  }),
}));
beforeEach(() => {
  state.owner = crypto.randomUUID();
  state.profile = 'profile_1';
  state.records = {};
  state.write = true;
  localStorage.clear();
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
});
afterEach(() => vi.useRealTimers());
describe('shared rewards hub', () => {
  it('refreshes an open garden budget at midnight while retaining earned growth', () => {
    expect(tendIsland().growth).toBe(3);
    expect(getGamificationHub()).toMatchObject({
      todayGrowth: 3,
      tendedToday: true,
      participationDays: 1,
    });
    vi.setSystemTime(new Date('2026-01-02T12:00:00Z'));
    expect(getGamificationHub()).toMatchObject({
      todayGrowth: 0,
      tendedToday: false,
      growth: 3,
      participationDays: 1,
    });
    expect(tendIsland()).toMatchObject({ points: 5, growth: 3 });
    expect(getGamificationHub()).toMatchObject({ growth: 6, participationDays: 2, points: 15 });
  });
  it('preserves points, imported badges and legacy deduplication on repeated migration', () => {
    state.records[`${state.owner}:profile_1`] = {
      points: 70,
      pointsHistory: [{ amount: 5, dedupeKey: 'trial_save_123' }],
    };
    expect(getGamificationHub().points).toBe(70);
    expect(reportLegacyActivity('Saved research', 'research', 'trial_save_123').points).toBe(0);
    importEarnedTrophies(['iron_lungs'], `hc_unified_profile_${state.owner}:profile_1`);
    expect(getGamificationHub().trophies).toContain('iron_lungs');
    expect(getGamificationHub().points).toBe(70);
  });
  it('does not reward generated AI outputs, repeated calls, food scoring or volume targets', () => {
    for (const [reason, category, key] of [
      ['Generated Physician Appointment Brief', 'consult', 'brief_gen_x'],
      ['AI Synthesis', 'research', 'profile_synth_1'],
      ['Daily Optimal Hydration Target', 'lifestyle', 'hydration_target_met_today'],
      ['Clinical Review Investigation', 'checkin', 'review'],
      ['Rainbow', 'lifestyle', 'phyto_today'],
    ])
      expect(reportLegacyActivity(reason, category, key).growth).toBe(0);
    expect(getGamificationHub()).toMatchObject({ growth: 0, points: 5 });
  });
  it('shares calm tending and completed sessions while keeping their distinct trophy evidence', () => {
    expect(tendIsland()).toMatchObject({ saved: true, points: 5, growth: 3 });
    expect(tendIsland().growth).toBe(0);
    expect(completeActivity('calm.completed', 'actual-session').points).toBe(0);
    expect(getGamificationHub().trophies).toContain('mindful_master');
    expect(getGamificationHub()).toMatchObject({ tendedToday: true, growth: 3, points: 10 });
  });
  it('rejects a delayed completion after an account or profile change', () => {
    const old = `hc_unified_profile_${state.owner}:profile_1`;
    getGamificationHub();
    state.profile = 'profile_2';
    expect(completeActivity('record.saved', 'late', old)).toMatchObject({
      saved: false,
      points: 0,
    });
    expect(getGamificationHub().growth).toBe(0);
    state.owner = 'other';
    expect(getGamificationHub().points).toBe(5);
  });
  it('does not display or announce rewards when persistent storage fails', () => {
    getGamificationHub();
    state.write = false;
    const awarded = vi.fn();
    window.addEventListener('hc_points_awarded', awarded);
    expect(tendIsland()).toMatchObject({ saved: false, points: 0, growth: 0 });
    expect(awarded).not.toHaveBeenCalled();
    expect(getGamificationHub().growth).toBe(0);
    window.removeEventListener('hc_points_awarded', awarded);
  });
  it('persists theme choice and generates sanitized explanations instead of medical text', () => {
    expect(setIslandTheme('blossom')).toBe(true);
    reportLegacyActivity('Daily Log: PRIVATE SYMPTOM', 'checkin', 'checkin_today');
    expect(getGamificationHub()).toMatchObject({ theme: 'blossom', growth: 3 });
    expect(JSON.stringify(state.records)).not.toContain('PRIVATE SYMPTOM');
  });
  it('merges reward receipts through the existing profile sync without field conflicts', () => {
    const base = createLedger();
    base.timezone = 'UTC';
    const a = recordActivity(base, 'record.saved', 'a', new Date()).ledger,
      b = recordActivity(base, 'garden.tended', 'b', new Date()).ledger;
    const merged = mergeConnectedProfiles(
      { gamification: base },
      { gamification: a },
      { gamification: b },
      'owner',
      'profile_1'
    );
    expect(merged.conflicts).toEqual([]);
    expect(Object.keys(merged.merged.gamification.receipts)).toHaveLength(2);
  });
});
