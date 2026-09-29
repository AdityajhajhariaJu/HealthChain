import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getItemSync, setItemSync } from './storage';
import { triggerHapticLight, triggerHapticSuccess } from './haptics';
import { awardPoints } from './VitalityPointsEngine';
import { requestNotificationPermission } from './DailyCheckinNotificationService';
import { getHabitStorageKey, getScopedStorageKey } from './profileScope';

export interface HydrationLogItem {
  id: string;
  amountMl: number;
  timestamp: string; // e.g. "09:15 AM"
  type: 'water' | 'electrolyte' | 'tea' | 'lemon' | 'coconut' | 'sparkling';
}

export interface HydrationDayData {
  date: string;
  currentMl: number;
  targetMl: number;
  logs: HydrationLogItem[];
  reminderIntervalHours: number;
  remindersEnabled: boolean;
}

const STORAGE_PREFIX = 'healthchain_hydration_data_';
const STORAGE_KEY_TARGET = 'healthchain_hydration_target_ml';
const STORAGE_KEY_INTERVAL = 'healthchain_hydration_reminder_interval';
const STORAGE_KEY_REMINDERS = 'healthchain_hydration_reminders_enabled';
const NOTIFICATION_BASE_ID = 3000;

const scopedKey = getScopedStorageKey;

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function formatTimeAmPm(date: Date = new Date()): string {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${strMinutes} ${ampm}`;
}

/**
 * Retrieve current hydration state for a date, auto-syncing with Dietician storage if present.
 */
export function getHydrationData(date: string = getTodayDateString()): HydrationDayData {
  const savedTarget = Number(getItemSync(scopedKey(STORAGE_KEY_TARGET)));
  const targetMl = Number.isFinite(savedTarget) && savedTarget > 0 ? savedTarget : 2000;
  const remindersEnabled = Capacitor.isNativePlatform() && getItemSync(scopedKey(STORAGE_KEY_REMINDERS)) === 'true';
  const interval = Number(getItemSync(scopedKey(STORAGE_KEY_INTERVAL))) || 2;

  let currentData: HydrationDayData = {
    date,
    currentMl: 0,
    targetMl,
    logs: [],
    reminderIntervalHours: interval,
    remindersEnabled
  };

  try {
    const raw = getItemSync(scopedKey(`${STORAGE_PREFIX}${date}`));
    if (raw) {
      const saved = JSON.parse(raw);
      const logs = Array.isArray(saved?.logs) ? saved.logs.filter((log: any) => log && typeof log.id === 'string' && Number.isFinite(log.amountMl) && log.amountMl > 0) : [];
      currentData = { ...currentData, logs,
        currentMl: Number.isFinite(saved?.currentMl) && saved.currentMl >= 0 ? saved.currentMl : logs.reduce((sum: number, log: HydrationLogItem) => sum + log.amountMl, 0),
        targetMl: date === getTodayDateString() ? targetMl : (Number.isFinite(saved?.targetMl) && saved.targetMl > 0 ? saved.targetMl : targetMl),
      };
    }
  } catch (err) {
    // fallback to default
  }

  return currentData;
}

/**
 * Save day hydration data and broadcast changes
 */
export function saveHydrationData(data: HydrationDayData): void {
  try {
    setItemSync(scopedKey(`${STORAGE_PREFIX}${data.date}`), JSON.stringify(data));

    // Habit sync: habit is achieved for today when currentMl >= targetMl
    const habitKey = getHabitStorageKey(data.date);
    const habitRaw = getItemSync(habitKey);
    const habits = habitRaw ? JSON.parse(habitRaw) : {};
    const target = data.targetMl > 0 ? data.targetMl : 2000;
    const isNowDone = data.currentMl >= target;
    
    habits['hydration'] = isNowDone;
    setItemSync(habitKey, JSON.stringify(habits));

    // Dispatch update events for reactive UI
    window.dispatchEvent(new CustomEvent('hc_hydration_updated', { detail: data }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('[HydrationService] Failed to save hydration data:', e);
  }
}

/**
 * Add a water drink log entry (e.g. +250ml, +500ml)
 */
export function addWaterLog(
  amountMl: number, 
  type: HydrationLogItem['type'] = 'water',
  date: string = getTodayDateString()
): HydrationDayData {
  if (!Number.isFinite(amountMl) || amountMl <= 0) return getHydrationData(date);
  const current = getHydrationData(date);
  const wasBelowTarget = current.currentMl < current.targetMl;

  const newLog: HydrationLogItem = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    amountMl,
    timestamp: formatTimeAmPm(),
    type
  };

  const updatedLogs = [newLog, ...current.logs];
  const updatedMl = Math.max(0, current.currentMl + amountMl);

  const updatedData: HydrationDayData = {
    ...current,
    currentMl: updatedMl,
    logs: updatedLogs
  };

  saveHydrationData(updatedData);
  triggerHapticSuccess();

  // Award Vitality points:
  // 1. First 500ml threshold hit
  if (current.currentMl < 500 && updatedMl >= 500) {
    awardPoints(2, 'Morning Hydration (500ml)', 'lifestyle', `hydration_500_${date}`);
  }
  // 2. Full daily target achieved
  if (wasBelowTarget && updatedMl >= current.targetMl) {
    awardPoints(3, 'Daily Optimal Hydration Target Met 💧', 'lifestyle', `hydration_target_met_${date}`);
  }

  return updatedData;
}

/**
 * Remove a specific drink log entry
 */
export function removeWaterLog(logId: string, date: string = getTodayDateString()): HydrationDayData {
  const current = getHydrationData(date);
  const removedItem = current.logs.find(l => l.id === logId);
  const amountToDeduct = removedItem ? removedItem.amountMl : 0;

  const updatedLogs = current.logs.filter(l => l.id !== logId);
  const updatedMl = Math.max(0, current.currentMl - amountToDeduct);

  const updatedData: HydrationDayData = {
    ...current,
    currentMl: updatedMl,
    logs: updatedLogs
  };

  saveHydrationData(updatedData);
  triggerHapticLight();
  return updatedData;
}

/** Adjust hydration without manufacturing negative drink entries. */
export function adjustWaterAmount(
  deltaMl: number,
  type: HydrationLogItem['type'] = 'water',
  date: string = getTodayDateString()
): HydrationDayData {
  if (!Number.isFinite(deltaMl) || deltaMl === 0) return getHydrationData(date);
  if (deltaMl >= 0) return addWaterLog(deltaMl, type, date);

  const current = getHydrationData(date);
  let remaining = Math.min(Math.abs(deltaMl), current.currentMl);
  const logs = current.logs.map((log) => ({ ...log }));
  for (let index = 0; index < logs.length && remaining > 0;) {
    const reducible = Math.min(logs[index].amountMl, remaining);
    logs[index].amountMl -= reducible;
    remaining -= reducible;
    if (logs[index].amountMl <= 0) logs.splice(index, 1);
    else index += 1;
  }

  const updated = { ...current, currentMl: Math.max(0, current.currentMl - Math.abs(deltaMl)), logs };
  saveHydrationData(updated);
  triggerHapticLight();
  return updated;
}

/**
 * Update daily hydration target (e.g. 2000ml, 2500ml, 3000ml)
 */
export function setHydrationTarget(targetMl: number): void {
  if (!Number.isFinite(targetMl) || targetMl <= 0) return;
  setItemSync(scopedKey(STORAGE_KEY_TARGET), targetMl.toString());
  const today = getTodayDateString();
  const current = getHydrationData(today);
  const updated: HydrationDayData = { ...current, targetMl };
  saveHydrationData(updated);
}

/**
 * Schedule recurring hydration reminders throughout daytime hours (09:00 - 21:00)
 */
let reminderQueue: Promise<unknown> = Promise.resolve();
export function setHydrationReminders(enabled: boolean, intervalHours: number = 2): Promise<boolean> {
  const scope = scopedKey(STORAGE_KEY_REMINDERS);
  const run = async () => {
    if (scope !== scopedKey(STORAGE_KEY_REMINDERS)) return false;
    const interval = Number.isInteger(intervalHours) && intervalHours >= 1 && intervalHours <= 12 ? intervalHours : 2;
    let active = false;
    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.cancel({ notifications: Array.from({ length: 13 }, (_, i) => ({ id: NOTIFICATION_BASE_ID + i })) });
        if (enabled && await requestNotificationPermission() && scope === scopedKey(STORAGE_KEY_REMINDERS)) {
          const hours = Array.from({ length: Math.floor(12 / interval) + 1 }, (_, i) => 9 + i * interval);
          await LocalNotifications.schedule({ notifications: hours.map((hour, index) => ({
            id: NOTIFICATION_BASE_ID + index, title: 'Hydration reminder',
            body: 'Open HealthChain to review your water log.',
            schedule: { on: { hour, minute: 0 }, repeats: true, allowWhileIdle: true },
            extra: { type: 'hydration', scope },
          })) });
          active = true;
        }
      }
    } catch (error) { console.warn('[HydrationService] Could not schedule reminders', error); }
    if (scope !== scopedKey(STORAGE_KEY_REMINDERS)) { await cancelHydrationNotifications(); return false; }
    setItemSync(scope, String(active));
    setItemSync(scopedKey(STORAGE_KEY_INTERVAL), String(interval));
    saveHydrationData({ ...getHydrationData(), remindersEnabled: active, reminderIntervalHours: interval });
    return active;
  };
  const result = reminderQueue.then(run, run);
  reminderQueue = result;
  return result;
}

export async function cancelHydrationNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const notifications = Array.from({ length: 13 }, (_, index) => ({ id: NOTIFICATION_BASE_ID + index }));
  try {
    await LocalNotifications.cancel({ notifications });
  } catch (error) {
    console.warn('[HydrationService] Failed to cancel scheduled reminders:', error);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('hc_logout', () => { reminderQueue = reminderQueue.then(cancelHydrationNotifications); });
  let lastScope = '';
  window.addEventListener('hc_profile_updated', () => {
    const nextScope = scopedKey(STORAGE_KEY_REMINDERS);
    if (nextScope !== lastScope) {
      lastScope = nextScope;
      const data = getHydrationData();
      void setHydrationReminders(data.remindersEnabled, data.reminderIntervalHours);
    }
  });
}
