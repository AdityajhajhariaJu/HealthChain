// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ scope: 'one', profiles: {} as Record<string, any>, native: false, permission: true }));
const notifications = vi.hoisted(() => ({ schedule: vi.fn(), cancel: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native, getPlatform: () => 'web' } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: notifications }));
vi.mock('../DailyCheckinNotificationService', () => ({ requestNotificationPermission: async () => state.permission }));
vi.mock('../haptics', () => ({ triggerHapticLight: vi.fn(), triggerHapticSuccess: vi.fn() }));
vi.mock('../VitalityPointsEngine', () => ({ awardPoints: vi.fn() }));
vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => 'account', getProfileEngineState: () => ({ activeId: state.scope }),
  getProfile: () => structuredClone(state.profiles[state.scope] || { medications: [] }),
  saveProfile: async (profile: any) => { state.profiles[state.scope] = structuredClone(profile); },
}));
import { addWaterLog, adjustWaterAmount, getHydrationData, removeWaterLog, setHydrationReminders, setHydrationTarget } from '../HydrationService';
import { getVitaminSchedule, saveVitaminSchedule, toggleVitaminTaken, markAllVitaminsTaken, rescheduleVitaminNotifications } from '../VitaminScheduleService';
import { mergeLegacyMedicationSchedule, normalizeMedications } from '../MedicationScheduleModel';
import { getHabitStorageKey, getScopedStorageKey } from '../profileScope';

beforeEach(() => {
  localStorage.clear(); state.scope = 'one'; state.profiles = {}; state.native = false; state.permission = true;
  vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 29, 10));
  notifications.schedule.mockReset().mockResolvedValue(undefined); notifications.cancel.mockReset().mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());
const med = (id = 'a', enabled = true) => ({ id, name: `Medicine ${id}`, dosage: 'User directions', time: '08:30', enabled });

describe('shared medication inventory and daily adherence', () => {
  it('preserves legacy IDs and profile metadata without duplicating a matching medicine', () => {
    const list = mergeLegacyMedicationSchedule([{ name: 'Medicine a', source: 'manual' }], [med()]);
    expect(list).toHaveLength(1); expect(list[0]).toMatchObject({ id: 'a', source: 'manual', time: '08:30' });
  });
  it('never invents an exact time for baseline-only medications', () => {
    expect(normalizeMedications(['A', { name: 'B', circadianSlot: 'morning' }]).every(m => !m.enabled && m.time === '')).toBe(true);
  });
  it('preserves distinct reminder entries for the same medicine during migration', () => {
    const list = mergeLegacyMedicationSchedule(['Medicine a'], [med(), { ...med(), id: 'evening', time: '20:30' }]);
    expect(list.map(m => [m.id, m.time])).toEqual([['a', '08:30'], ['evening', '20:30']]);
  });
  it('saves additions, timing, pauses and deletion into the shared profile', async () => {
    await saveVitaminSchedule([med()]); expect(state.profiles.one.medications[0].time).toBe('08:30');
    await saveVitaminSchedule([{ ...med(), time: '21:30', enabled: false }]);
    expect(getVitaminSchedule()[0]).toMatchObject({ time: '21:30', circadianSlot: 'bedtime', enabled: false });
    await saveVitaminSchedule([]); expect(state.profiles.one.medications).toEqual([]);
  });
  it('preserves clinical metadata when the schedule changes', async () => {
    state.profiles.one = { medications: [{ ...med(), source: 'baseline', addedAt: 'original' }] };
    await saveVitaminSchedule([{ ...med(), time: '12:30' }]);
    expect(state.profiles.one.medications[0]).toMatchObject({ source: 'baseline', addedAt: 'original' });
  });
  it('syncs completion, supports undo, excludes paused entries, and resets on a new day', async () => {
    await saveVitaminSchedule([med(), med('b', false)]);
    expect(toggleVitaminTaken('b')).toBe(false); expect(toggleVitaminTaken('missing')).toBe(false);
    expect(toggleVitaminTaken('a')).toBe(true);
    expect(JSON.parse(localStorage.getItem(getHabitStorageKey('2026-09-29'))!).vitamins).toBe(true);
    expect(toggleVitaminTaken('a')).toBe(false); markAllVitaminsTaken();
    expect(getVitaminSchedule()[0].takenToday).toBe(true);
    vi.setSystemTime(new Date(2026, 8, 30, 0, 1)); expect(getVitaminSchedule()[0].takenToday).toBe(false);
  });
  it('isolates medication inventory and adherence by profile', async () => {
    await saveVitaminSchedule([med()]); markAllVitaminsTaken(); state.scope = 'two';
    expect(getVitaminSchedule()).toEqual([]); await saveVitaminSchedule([med('b')]);
    state.scope = 'one'; expect(getVitaminSchedule()[0]).toMatchObject({ id: 'a', takenToday: true });
  });
  it('handles malformed medication inventories and invalid times', () => {
    state.profiles.one = { medications: {} }; expect(getVitaminSchedule()).toEqual([]);
    expect(normalizeMedications([null, {}, { name: 'A', time: '99:00' }])).toMatchObject([{ name: 'A', enabled: false }]);
  });
  it('cancels old native medication alarms even when permission is denied', async () => {
    state.native = true; state.permission = false; await rescheduleVitaminNotifications([med()]);
    expect(notifications.cancel).toHaveBeenCalled(); expect(notifications.schedule).not.toHaveBeenCalled();
  });
});

describe('hydration consistency and reminders', () => {
  it('keeps quick add, adjustment, undo and habit goal in sync', () => {
    setHydrationTarget(500); addWaterLog(250); const data = addWaterLog(250);
    expect(JSON.parse(localStorage.getItem(getHabitStorageKey(data.date))!).hydration).toBe(true);
    removeWaterLog(data.logs[0].id); expect(getHydrationData().currentMl).toBe(250);
    expect(JSON.parse(localStorage.getItem(getHabitStorageKey(data.date))!).hydration).toBe(false);
    adjustWaterAmount(-100); expect(getHydrationData().logs[0].amountMl).toBe(150);
    adjustWaterAmount(-1000); expect(getHydrationData().currentMl).toBe(0); expect(getHydrationData().logs).toEqual([]);
  });
  it('rejects invalid amounts and targets', () => {
    for (const amount of [-1, NaN, Infinity, 0]) addWaterLog(amount);
    adjustWaterAmount(NaN); setHydrationTarget(0); setHydrationTarget(Infinity);
    expect(getHydrationData()).toMatchObject({ currentMl: 0, targetMl: 2000, logs: [] });
  });
  it('keeps the chosen target across midnight while resetting intake', () => {
    setHydrationTarget(2500); addWaterLog(500); vi.setSystemTime(new Date(2026, 8, 30));
    expect(getHydrationData()).toMatchObject({ currentMl: 0, targetMl: 2500 });
    expect(getHydrationData('2026-09-29').currentMl).toBe(500);
  });
  it('isolates target and intake by profile', () => {
    setHydrationTarget(1500); addWaterLog(750); state.scope = 'two';
    expect(getHydrationData()).toMatchObject({ currentMl: 0, targetMl: 2000 });
    state.scope = 'one'; expect(getHydrationData()).toMatchObject({ currentMl: 750, targetMl: 1500 });
  });
  it('survives malformed stored data', () => {
    localStorage.setItem(getScopedStorageKey('healthchain_hydration_data_2026-09-29'), '{"currentMl":-5,"logs":{}}');
    expect(getHydrationData()).toMatchObject({ currentMl: 0, logs: [] });
  });
  it('does not claim background reminders work on web or without permission', async () => {
    expect(await setHydrationReminders(true)).toBe(false); expect(getHydrationData().remindersEnabled).toBe(false);
    state.native = true; state.permission = false;
    expect(await setHydrationReminders(true)).toBe(false); expect(getHydrationData().remindersEnabled).toBe(false);
  });
  it('honors the reminder interval and persists only successful scheduling', async () => {
    state.native = true; expect(await setHydrationReminders(true, 3)).toBe(true);
    expect(notifications.schedule.mock.calls[0][0].notifications.map((n: any) => n.schedule.on.hour)).toEqual([9, 12, 15, 18, 21]);
    expect(getHydrationData().remindersEnabled).toBe(true);
    notifications.schedule.mockRejectedValueOnce(new Error('Device scheduling failure'));
    expect(await setHydrationReminders(true)).toBe(false); expect(getHydrationData().remindersEnabled).toBe(false);
  });
});
