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

export interface DrugInteractionAlert {
  id: string;
  severity: 'contraindication' | 'timing_buffer' | 'depletion' | 'bioavailability';
  title: string;
  medication1: string;
  medication2?: string;
  message: string;
  recommendation: string;
  bufferHours?: number;
}

/**
 * Clinical Chronotherapy & Drug-Nutrient Interaction Checker
 */
export function detectDrugNutrientInteractions(vitamins: VitaminItem[]): DrugInteractionAlert[] {
  const alerts: DrugInteractionAlert[] = [];
  const active = vitamins.filter(v => v.enabled);

  const findMed = (keywords: string[]) => active.find(v => {
    const n = (v.name || '').toLowerCase();
    return keywords.some(k => n.includes(k));
  });

  const parseHour = (timeStr: string) => {
    const h = parseInt((timeStr || '09:00').split(':')[0], 10);
    const m = parseInt((timeStr || '09:00').split(':')[1] || '0', 10);
    return h + m / 60;
  };

  // 1. Levothyroxine + Calcium/Iron/Multivitamins (Severe Chelation)
  const levo = findMed(['levothyroxine', 'synthroid', 'eltroxin', 'thyronorm']);
  const calciumOrIron = findMed(['calcium', 'iron', 'ferrous', 'multivitamin', 'multi']);
  if (levo && calciumOrIron) {
    const hourLevo = parseHour(levo.time);
    const hourMineral = parseHour(calciumOrIron.time);
    const diff = Math.abs(hourLevo - hourMineral);
    if (diff < 4) {
      alerts.push({
        id: 'chelation_levo_minerals',
        severity: 'timing_buffer',
        title: 'Cation Chelation & Thyroxine Malabsorption',
        medication1: levo.name,
        medication2: calciumOrIron.name,
        message: `${calciumOrIron.name} chelates synthetic ${levo.name} in the intestinal lumen, drastically suppressing bioavailability and provoking subclinical hypothyroidism.`,
        recommendation: 'Separate dosing times by at least 4 hours. Take Levothyroxine 60 min before breakfast, and minerals at Midday or Bedtime.',
        bufferHours: 4
      });
    }
  }

  // 2. Metformin + B12 Depletion
  const metformin = findMed(['metformin', 'glycomet', 'glucophage']);
  const b12 = findMed(['b12', 'cobalamin', 'b-complex', 'multivitamin']);
  if (metformin && !b12) {
    alerts.push({
      id: 'depletion_metformin_b12',
      severity: 'depletion',
      title: 'Metformin-Induced Vitamin B12 Depletion',
      medication1: metformin.name,
      message: 'Chronic Metformin therapy impairs calcium-dependent ileal absorption of Vitamin B12 in up to 30% of patients, frequently manifesting as unexplained fatigue and numbness.',
      recommendation: 'Consider co-supplementation with Methylcobalamin (Active B12, 1000mcg) or check annual serum B12 and homocysteine levels.'
    });
  }

  // 3. PPIs + Magnesium / Mineral Depletion
  const ppi = findMed(['omeprazole', 'pantoprazole', 'esomeprazole', 'rabeprazole', 'pan']);
  const mag = findMed(['magnesium', 'mag']);
  if (ppi && !mag) {
    alerts.push({
      id: 'depletion_ppi_magnesium',
      severity: 'depletion',
      title: 'Hypochlorhydria Magnesium & Mineral Depletion',
      medication1: ppi.name,
      message: 'Proton Pump Inhibitors drastically suppress gastric acidity, impairing the ionization and intestinal absorption of dietary Magnesium and Calcium.',
      recommendation: 'Periodically monitor serum magnesium. Consider supplementing with highly bioavailable Magnesium Glycinate before sleep.'
    });
  }

  // 4. Statins + CoQ10 Depletion
  const statin = findMed(['atorvastatin', 'rosuvastatin', 'simvastatin', 'atorva', 'lipitor']);
  const coq10 = findMed(['coq10', 'ubiquinol', 'coenzyme']);
  if (statin && !coq10) {
    alerts.push({
      id: 'depletion_statin_coq10',
      severity: 'depletion',
      title: 'Mitochondrial CoQ10 (Ubiquinol) Depletion',
      medication1: statin.name,
      message: 'HMG-CoA reductase inhibitors block the mevalonate synthesis pathway, depleting muscle mitochondrial Coenzyme Q10 and triggering myalgia or exercise fatigue.',
      recommendation: 'Co-supplementation with Ubiquinol (100–200mg) with your evening meal supports mitochondrial electron transport and muscle recovery.'
    });
  }

  // 5. Lipophilic Vitamins Fasting Warning
  const fatSoluble = findMed(['d3', 'k2', 'vitamin d', 'omega-3', 'fish oil']);
  if (fatSoluble) {
    const hour = parseHour(fatSoluble.time);
    if (hour < 10) {
      alerts.push({
        id: 'bioavailability_fat_soluble',
        severity: 'bioavailability',
        title: 'Lipid Vehicle Required for Bioavailability',
        medication1: fatSoluble.name,
        message: 'Vitamins D3, K2, and Omega-3 are lipophilic. Bioavailability drops by up to 50% when taken during morning fasting without dietary lipids.',
        recommendation: 'Schedule with your largest fat-containing meal (e.g. Lunch or Dinner with avocado, olive oil, eggs, or nuts).'
      });
    }
  }

  return alerts;
}
