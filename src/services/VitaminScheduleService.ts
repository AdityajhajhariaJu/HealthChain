import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getItemSync, setItemSync } from './storage';
import { requestNotificationPermission } from './DailyCheckinNotificationService';

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

const DEFAULT_VITAMINS: VitaminItem[] = [
  { id: 'vit_multi', name: 'Daily Multivitamin', dosage: '1 tablet with meal', time: '08:30', enabled: true },
  { id: 'vit_d3', name: 'Vitamin D3 & K2', dosage: '2000 IU', time: '09:00', enabled: true },
  { id: 'vit_omega', name: 'Omega-3 Fish Oil', dosage: '1000mg', time: '13:00', enabled: true },
  { id: 'vit_mag', name: 'Magnesium Glycinate', dosage: '200mg before sleep', time: '21:30', enabled: true }
];

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Retrieve the saved vitamins schedule, with today's taken status merged in.
 */
export function getVitaminSchedule(): VitaminItem[] {
  let list: VitaminItem[] = [];
  try {
    const raw = getItemSync(STORAGE_KEY_VITAMINS);
    if (raw) {
      list = JSON.parse(raw);
    } else {
      list = [...DEFAULT_VITAMINS];
      setItemSync(STORAGE_KEY_VITAMINS, JSON.stringify(list));
    }
  } catch (e) {
    list = [...DEFAULT_VITAMINS];
  }

  // Merge today's taken logs
  const today = getTodayDateString();
  let takenMap: Record<string, boolean> = {};
  try {
    const rawLogs = getItemSync(`${STORAGE_KEY_LOGS}_${today}`);
    if (rawLogs) takenMap = JSON.parse(rawLogs);
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
  setItemSync(STORAGE_KEY_VITAMINS, JSON.stringify(items));
  await rescheduleVitaminNotifications(items);
  window.dispatchEvent(new CustomEvent('hc_vitamins_updated', { detail: items }));
}

/**
 * Toggle a specific vitamin as taken for today.
 */
export function toggleVitaminTaken(id: string): boolean {
  const today = getTodayDateString();
  let takenMap: Record<string, boolean> = {};
  try {
    const raw = getItemSync(`${STORAGE_KEY_LOGS}_${today}`);
    if (raw) takenMap = JSON.parse(raw);
  } catch {}

  const nextState = !takenMap[id];
  takenMap[id] = nextState;
  setItemSync(`${STORAGE_KEY_LOGS}_${today}`, JSON.stringify(takenMap));

  // Check if all active vitamins are taken
  const all = getVitaminSchedule();
  const allTaken = all.filter(v => v.enabled).every(v => !!takenMap[v.id]);

  // Sync with main habit key if all vitamins are taken
  try {
    const habitRaw = getItemSync(`healthchain_habits_${today}`);
    const habits = habitRaw ? JSON.parse(habitRaw) : {};
    habits['vitamins'] = allTaken;
    setItemSync(`healthchain_habits_${today}`, JSON.stringify(habits));
  } catch {}

  window.dispatchEvent(new CustomEvent('hc_vitamins_updated', { detail: all }));
  return nextState;
}

/**
 * Mark all enabled vitamins as taken for today.
 */
export function markAllVitaminsTaken(): void {
  const today = getTodayDateString();
  const all = getVitaminSchedule();
  const takenMap: Record<string, boolean> = {};
  all.forEach(v => {
    if (v.enabled) takenMap[v.id] = true;
  });
  setItemSync(`${STORAGE_KEY_LOGS}_${today}`, JSON.stringify(takenMap));

  try {
    const habitRaw = getItemSync(`healthchain_habits_${today}`);
    const habits = habitRaw ? JSON.parse(habitRaw) : {};
    habits['vitamins'] = true;
    setItemSync(`healthchain_habits_${today}`, JSON.stringify(habits));
  } catch {}

  window.dispatchEvent(new CustomEvent('hc_vitamins_updated', { detail: all }));
}

/**
 * Reschedules native or web notifications for all enabled vitamins.
 */
export async function rescheduleVitaminNotifications(items?: VitaminItem[]): Promise<void> {
  const list = items || getVitaminSchedule();

  try {
    if (Capacitor.isNativePlatform()) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;

      // Cancel previous vitamin alarms (IDs 2000 to 2099)
      const cancelIds = Array.from({ length: 100 }, (_, i) => ({ id: NOTIFICATION_BASE_ID + i }));
      try {
        await LocalNotifications.cancel({ notifications: cancelIds });
      } catch {}

      // Schedule active vitamins
      const notificationsToSchedule: any[] = [];
      list.forEach((item, index) => {
        if (!item.enabled) return;
        const [hourStr, minuteStr] = (item.time || '09:00').split(':');
        const hour = parseInt(hourStr || '9', 10);
        const minute = parseInt(minuteStr || '0', 10);

        notificationsToSchedule.push({
          id: NOTIFICATION_BASE_ID + index,
          title: `Time for ${item.name} 💊`,
          body: `${item.dosage ? item.dosage + ' • ' : ''}Scheduled for ${item.time}. Tap to mark taken and earn +5 PTS.`,
          channelId: 'healthchain_daily_checkin',
          schedule: {
            on: { hour, minute },
            repeats: true,
            allowWhileIdle: true,
          },
          extra: {
            route: '/app/today',
            type: 'pill_reminder',
            vitaminId: item.id,
            vitaminName: item.name
          }
        });
      });

      if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
        console.info(`[VitaminSchedule] Scheduled ${notificationsToSchedule.length} native tablet alarms.`);
      }
    } else {
      // In web, request permission if available
      if (typeof window !== 'undefined' && 'Notification' in window) {
        await requestNotificationPermission();
      }
    }
  } catch (err) {
    console.warn('[VitaminSchedule] Failed to schedule tablet alarms:', err);
  }
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

/**
 * Synchronize prescription medications from the clinical health profile into the vitamins & medication schedule.
 */
export async function syncMedicationsFromProfile(medications: any[]): Promise<VitaminItem[]> {
  if (!Array.isArray(medications) || medications.length === 0) return getVitaminSchedule();

  const current = getVitaminSchedule();
  const existingNames = new Set(current.map(c => c.name.toLowerCase()));
  let hasChanges = false;
  const updated = [...current];

  medications.forEach((med, idx) => {
    let name = '';
    let dosage = '';
    let time = '09:00';
    let slot = 'morning';

    if (typeof med === 'string') {
      // Parse "Metformin (500mg daily)"
      const match = med.match(/^([^(]+)(?:\(([^)]+)\))?/);
      name = match ? match[1].trim() : med.trim();
      dosage = match && match[2] ? match[2].trim() : 'As prescribed';
    } else if (med && typeof med === 'object') {
      name = med.name || '';
      dosage = med.dosage || 'As directed';
      time = med.time || (med.circadianSlot === 'bedtime' ? '21:30' : med.circadianSlot === 'evening' ? '18:30' : med.circadianSlot === 'midday' ? '13:00' : '09:00');
      slot = med.circadianSlot || 'morning';
    }

    if (!name || existingNames.has(name.toLowerCase())) return;

    // Circadian default times if not provided
    if (!time) {
      if (slot === 'bedtime') time = '21:30';
      else if (slot === 'evening') time = '18:30';
      else if (slot === 'midday') time = '13:00';
      else time = '09:00';
    }

    const newItem: VitaminItem = {
      id: `rx_${Date.now()}_${idx}`,
      name,
      dosage,
      time,
      enabled: true
    };

    updated.push(newItem);
    existingNames.add(name.toLowerCase());
    hasChanges = true;
  });

  if (hasChanges) {
    await saveVitaminSchedule(updated);
  }

  return updated;
}
