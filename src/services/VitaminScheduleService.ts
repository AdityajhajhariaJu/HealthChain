import { getProfile, saveProfile } from './ProfileEngine';
import { isMedicationTime, normalizeMedications } from './MedicationScheduleModel';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getItemSync, setItemSync } from './storage';
import { requestNotificationPermission } from './DailyCheckinNotificationService';
import { getHabitStorageKey, getScopedStorageKey } from './profileScope';

export interface VitaminItem {
  id: string;
  name: string;
  dosage: string;
  time: string; // 24h format "HH:MM", e.g. "08:30"
  enabled: boolean;
  takenToday?: boolean;
}

const STORAGE_KEY_VITAMINS = 'healthchain_vitamins_schedule_v2';
const STORAGE_KEY_LOGS = 'healthchain_vitamins_taken_logs';
const NOTIFICATION_BASE_ID = 2000;

const scopedKey = getScopedStorageKey;


export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Retrieve the saved vitamins schedule, with today's taken status merged in.
 */
export function getVitaminSchedule(): VitaminItem[] {
  const list: VitaminItem[] = normalizeMedications(getProfile().medications);

  // Merge today's taken logs
  const today = getTodayDateString();
  let takenMap: Record<string, boolean> = {};
  try {
    const rawLogs = getItemSync(scopedKey(`${STORAGE_KEY_LOGS}_${today}`));
    if (rawLogs) { const parsed = JSON.parse(rawLogs); if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') takenMap = parsed; }
  } catch {}

  return list.map(item => ({
    ...item,
    takenToday: !!takenMap[item.id]
  }));
}

/**
 * Save the updated vitamins schedule and re-schedule alarms.
 */
export async function saveVitaminSchedule(items: VitaminItem[]): Promise<void> {
  const profile = getProfile();
  const normalized = normalizeMedications(items);
  profile.medications = normalized.map(item => ({
    ...(profile.medications || []).find((med: any) => med.id === item.id), ...item,
  }));
  // saveProfile writes locally and broadcasts before its optional cloud work.
  void saveProfile(profile);
  items = normalized;

  // Sync today's completion state
  const today = getTodayDateString();
  let takenMap: Record<string, boolean> = {};
  try {
    const rawLogs = getItemSync(scopedKey(`${STORAGE_KEY_LOGS}_${today}`));
    if (rawLogs) { const parsed = JSON.parse(rawLogs); if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') takenMap = parsed; }
  } catch {}

  const enabledItems = items.filter(v => v.enabled !== false);
  const allTaken = enabledItems.length > 0 && enabledItems.every(v => !!takenMap[v.id]);

  try {
    const habitKey = getHabitStorageKey(today);
    const habitRaw = getItemSync(habitKey);
    const habits = habitRaw ? JSON.parse(habitRaw) : {};
    habits['vitamins'] = allTaken;
    setItemSync(habitKey, JSON.stringify(habits));
  } catch {}

  void rescheduleVitaminNotifications(items);

  // Read the current daily status after the profile update has been broadcast.
  try {
    const latestRawLogs = getItemSync(scopedKey(`${STORAGE_KEY_LOGS}_${today}`));
    if (latestRawLogs) { const parsed = JSON.parse(latestRawLogs); if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') takenMap = parsed; }
  } catch {}

  const updatedWithLogs = items.map(item => ({
    ...item,
    takenToday: !!takenMap[item.id]
  }));
  window.dispatchEvent(new CustomEvent('hc_vitamins_updated', { detail: updatedWithLogs }));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Toggle a specific vitamin as taken for today.
 */
export function toggleVitaminTaken(id: string): boolean {
  const today = getTodayDateString();
  let takenMap: Record<string, boolean> = {};
  try {
    const rawLogs = getItemSync(scopedKey(`${STORAGE_KEY_LOGS}_${today}`));
    if (rawLogs) { const parsed = JSON.parse(rawLogs); if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') takenMap = parsed; }
  } catch {}

  if (!getVitaminSchedule().some(item => item.id === id && item.enabled && isMedicationTime(item.time))) return false;
  const nextState = !takenMap[id];
  takenMap[id] = nextState;
  setItemSync(scopedKey(`${STORAGE_KEY_LOGS}_${today}`), JSON.stringify(takenMap));

  // Check if all active vitamins are taken
  const all = getVitaminSchedule();
  const enabledItems = all.filter(v => v.enabled !== false);
  const allTaken = enabledItems.length > 0 && enabledItems.every(v => !!takenMap[v.id]);

  // Sync with main habit key if all vitamins are taken
  try {
    const habitKey = getHabitStorageKey(today);
    const habitRaw = getItemSync(habitKey);
    const habits = habitRaw ? JSON.parse(habitRaw) : {};
    habits['vitamins'] = allTaken;
    setItemSync(habitKey, JSON.stringify(habits));
  } catch {}

  window.dispatchEvent(new CustomEvent('hc_vitamins_updated', { detail: all }));
  window.dispatchEvent(new Event('storage'));
  return nextState;
}

/**
 * Mark all enabled vitamins as taken for today.
 */
export function markAllVitaminsTaken(): void {
  const today = getTodayDateString();
  const all = getVitaminSchedule();
  let takenMap: Record<string, boolean> = {};
  try { const parsed = JSON.parse(getItemSync(scopedKey(`${STORAGE_KEY_LOGS}_${today}`)) || '{}'); if (parsed && !Array.isArray(parsed) && typeof parsed === 'object') takenMap = parsed; } catch {}
  all.forEach(v => {
    if (v.enabled !== false) takenMap[v.id] = true;
  });
  setItemSync(scopedKey(`${STORAGE_KEY_LOGS}_${today}`), JSON.stringify(takenMap));

  const enabledItems = all.filter(v => v.enabled !== false);
  const hasEnabled = enabledItems.length > 0;

  try {
    const habitKey = getHabitStorageKey(today);
    const habitRaw = getItemSync(habitKey);
    const habits = habitRaw ? JSON.parse(habitRaw) : {};
    habits['vitamins'] = hasEnabled;
    setItemSync(habitKey, JSON.stringify(habits));
  } catch {}

  const updated = getVitaminSchedule();
  window.dispatchEvent(new CustomEvent('hc_vitamins_updated', { detail: updated }));
  window.dispatchEvent(new Event('storage'));
}

/**
 * Reschedules native notifications for enabled medicines with valid reminder times.
 */
let notificationQueue: Promise<void> = Promise.resolve();
export function rescheduleVitaminNotifications(items?: VitaminItem[]): Promise<void> {
  const scope = scopedKey(STORAGE_KEY_VITAMINS);
  const list = items || getVitaminSchedule();
  const run = async () => {
    if (scope !== scopedKey(STORAGE_KEY_VITAMINS)) return;
    await scheduleNativeVitamins(list, scope);
  };
  notificationQueue = notificationQueue.then(run, run);
  return notificationQueue;
}

async function scheduleNativeVitamins(list: VitaminItem[], scope: string): Promise<void> {

  try {
    if (Capacitor.isNativePlatform()) {

      // Cancel previous vitamin alarms (IDs 2000 to 2099)
      const cancelIds = Array.from({ length: 100 }, (_, i) => ({ id: NOTIFICATION_BASE_ID + i }));
      try {
        await LocalNotifications.cancel({ notifications: cancelIds });
      } catch {}

      if (!list.some(item => item.enabled && isMedicationTime(item.time))) return;
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission || scope !== scopedKey(STORAGE_KEY_VITAMINS)) return;

      // Schedule active vitamins
      const notificationsToSchedule: any[] = [];
      list.forEach((item, index) => {
        if (!item.enabled || !isMedicationTime(item.time) || index >= 100) return;
        const [hourStr, minuteStr] = (item.time || '09:00').split(':');
        const hour = parseInt(hourStr || '9', 10);
        const minute = parseInt(minuteStr || '0', 10);

        notificationsToSchedule.push({
          id: NOTIFICATION_BASE_ID + index,
          title: 'HealthChain reminder',
          body: 'A scheduled health reminder is ready. Open HealthChain to review it.',
          channelId: 'healthchain_daily_checkin',
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          extra: {
            route: '/app/today',
            type: 'pill_reminder',
            vitaminId: item.id
          }
        });
      });

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.info(`[VitaminSchedule] Scheduled ${notificationsToSchedule.length} native tablet alarms.`);
      }
    }
  } catch (err) {
    console.warn('[VitaminSchedule] Failed to schedule tablet alarms:', err);
  }
}

export async function cancelVitaminNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const notifications = Array.from({ length: 100 }, (_, index) => ({ id: NOTIFICATION_BASE_ID + index }));
  try { await LocalNotifications.cancel({ notifications }); } catch (error) {
    console.warn('[VitaminSchedule] Failed to cancel scheduled reminders:', error);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hc_logout', () => { notificationQueue = notificationQueue.then(cancelVitaminNotifications); });
  let lastSignature = '';
  const refreshNotifications = () => {
    const schedule = getVitaminSchedule();
    // Baseline edits also change daily completion; recompute the shared habit immediately.
    try {
      const key = getHabitStorageKey(getTodayDateString());
      const habits = JSON.parse(getItemSync(key) || '{}') || {};
      const active = schedule.filter(item => item.enabled);
      habits.vitamins = active.length > 0 && active.every(item => item.takenToday);
      setItemSync(key, JSON.stringify(habits));
    } catch { /* The schedule remains usable if old habit storage is malformed. */ }
    const signature = JSON.stringify([scopedKey(STORAGE_KEY_VITAMINS), schedule.map(({ takenToday, ...item }) => item)]);
    if (signature !== lastSignature) { lastSignature = signature; void rescheduleVitaminNotifications(schedule); }
  };
  window.addEventListener('hc_profile_updated', refreshNotifications);
  window.addEventListener('storage', refreshNotifications);
}

/**
 * Triggers an immediate in-app Pill Notification banner (for test preview or timer event).
 */
export function triggerPillNotification(item?: Partial<VitaminItem>): void {
  const payload = item || {
    id: 'vit_test',
    name: 'Daily Multivitamin & Omega-3',
    dosage: '1 capsule with water',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  window.dispatchEvent(new CustomEvent('hc_pill_reminder_triggered', { detail: payload }));
}

export interface DrugInteractionAlert {
  id: string;
  severity: 'contraindication' | 'timing_buffer' | 'depletion' | 'bioavailability';
  title: string;
  medication1: string;
  medication2?: string;
  message: string;
  recommendation: string;
  bufferHours?: number;
  sourceUrl?: string;
}

/** A narrow label-backed schedule question. Saved schedules do not prove ingestion. */
export function detectDrugNutrientInteractions(vitamins: VitaminItem[]): DrugInteractionAlert[] {
  const alerts: DrugInteractionAlert[] = [];
  const active = vitamins.filter(v => v.enabled);

  const findMed = (keywords: string[]) => active.find(v => {
    const n = (v.name || '').toLowerCase();
    return keywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(n));
  });

  const parseMinutes = (timeStr: string): number | null => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeStr || '')) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // This label covers levothyroxine sodium tablets and calcium carbonate or ferrous sulfate.
  // A brand, liquid/capsule formulation, or unspecified multivitamin needs manual verification.
  const levo = findMed(['levothyroxine']);
  const mineral = findMed(['calcium carbonate', 'ferrous sulfate']);
  if (levo && mineral && /tablet/i.test(levo.name)) {
    const first = parseMinutes(levo.time);
    const second = parseMinutes(mineral.time);
    if (first !== null && second !== null) {
      const difference = Math.abs(first - second);
      const shortest = Math.min(difference, 1440 - difference);
      if (shortest < 240) {
      alerts.push({
        id: 'label_levo_calcium_iron_schedule',
        severity: 'timing_buffer',
        title: 'Review saved medicine timing',
        medication1: levo.name,
        medication2: mineral.name,
        message: `Your saved schedules for ${levo.name} and ${mineral.name} are less than four hours apart. This does not confirm either dose was taken.`,
        recommendation: 'The linked levothyroxine sodium tablet label describes four-hour spacing for calcium carbonate and ferrous sulfate. Ask your pharmacist whether it applies to your exact products before changing a schedule.',
        bufferHours: 4,
        sourceUrl: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d5f5465f-61bb-7aaa-e053-2a95a90a8c3d'
      });
      }
    }
  }

  return alerts;
}
