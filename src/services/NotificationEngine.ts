import { getItemSync, setItemSync } from './storage';
import { getProfileKey, getProfileEngineState } from './ProfileEngine';
import { getCases } from './CaseEngine';
import { getTodayCheckin } from './ProfileEngine';
import { getVitaminSchedule, getTodayDateString } from './VitaminScheduleService';

export type NotificationCategory =
  | 'clinical_alert'
  | 'appointment_prep'
  | 'medication_reminder'
  | 'daily_checkin'
  | 'hydration_check'
  | 'system_info';

export interface AppNotification {
  id: string; // Stable deterministic ID
  category: NotificationCategory;
  title: string;
  body: string;
  previewBody: string; // Privacy-safe text for lock screens / system notifications
  destination: string;
  fallbackDestination: string;
  actionLabel: string;
  createdAt: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  isRead: boolean;
  isDismissed: boolean;
  profileId: string;
  targetCaseId?: string;
  metadata?: Record<string, any>;
}

export interface NotificationStateEntry {
  isRead: boolean;
  isDismissed: boolean;
  readAt?: string;
  dismissedAt?: string;
}

export interface NotificationPreferences {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // "09:00"
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  maskSensitivePreviews: boolean; // default true
  enabledCategories: Record<NotificationCategory, boolean>;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyReminderEnabled: false,
  dailyReminderTime: '09:00',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  maskSensitivePreviews: true,
  enabledCategories: {
    clinical_alert: true,
    appointment_prep: true,
    medication_reminder: true,
    daily_checkin: true,
    hydration_check: true,
    system_info: true,
  },
};

// In-memory sliding window cache to deduplicate rapid repeated events/retries
const recentNotificationEventIds = new Map<string, number>();
const DEDUPLICATION_WINDOW_MS = 60_000;

/**
 * Returns active profile ID safely.
 */
export function getActiveProfileId(): string {
  try {
    const state = getProfileEngineState();
    if (state?.activeId) return state.activeId;
  } catch {}
  return 'profile_1';
}

/**
 * Gets storage scope key incorporating profile base and active profile ID.
 */
export function getNotificationStorageScope(profileId?: string): string {
  const pId = profileId || getActiveProfileId();
  return `${getProfileKey()}_${pId}`;
}

/**
 * Profile-isolated hydration keys to fix cross-profile hydration contamination.
 */
export function getWaterGlassesForDate(dateStr: string, profileId?: string): number {
  const pId = profileId || getActiveProfileId();
  const scopedKey = `hc_water_${dateStr}_${pId}`;
  const scopedVal = getItemSync(scopedKey);
  if (scopedVal !== null) {
    return parseInt(scopedVal, 10) || 0;
  }
  // Fallback to legacy un-scoped key if exists and profile is default
  const legacyVal = getItemSync(`hc_water_${dateStr}`);
  if (legacyVal !== null && pId === 'profile_1') {
    return parseInt(legacyVal, 10) || 0;
  }
  return 0;
}

export function setWaterGlassesForDate(dateStr: string, count: number, profileId?: string): void {
  const pId = profileId || getActiveProfileId();
  const scopedKey = `hc_water_${dateStr}_${pId}`;
  setItemSync(scopedKey, Math.max(0, count).toString());
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hc_water_updated'));
    window.dispatchEvent(new Event('hc_notifications_updated'));
  }
}

/**
 * Persisted state of notifications (read/dismissed) per profile.
 */
export function getNotificationStateMap(profileId?: string): Record<string, NotificationStateEntry> {
  const scope = getNotificationStorageScope(profileId);
  const raw = getItemSync(`hc_notifications_state_${scope}`);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveNotificationStateMap(map: Record<string, NotificationStateEntry>, profileId?: string): void {
  const scope = getNotificationStorageScope(profileId);
  setItemSync(`hc_notifications_state_${scope}`, JSON.stringify(map));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hc_notifications_updated'));
  }
}

/**
 * Notification preferences per profile.
 */
export function getNotificationPreferences(profileId?: string): NotificationPreferences {
  const scope = getNotificationStorageScope(profileId);
  const raw = getItemSync(`hc_notifications_prefs_${scope}`);
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  try {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export function saveNotificationPreferences(prefs: Partial<NotificationPreferences>, profileId?: string): void {
  const current = getNotificationPreferences(profileId);
  const updated = { ...current, ...prefs };
  const scope = getNotificationStorageScope(profileId);
  setItemSync(`hc_notifications_prefs_${scope}`, JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_notifications_prefs_updated', { detail: updated }));
    window.dispatchEvent(new Event('hc_notifications_updated'));
  }
}

/**
 * Checks if current time is within quiet hours.
 */
export function isQuietHoursActive(now: Date = new Date(), prefs?: NotificationPreferences): boolean {
  const p = prefs || getNotificationPreferences();
  if (!p.quietHoursEnabled) return false;
  
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotal = currentHours * 60 + currentMinutes;

  const [startH, startM] = (p.quietHoursStart || '22:00').split(':').map((v) => parseInt(v, 10) || 0);
  const [endH, endM] = (p.quietHoursEnd || '07:00').split(':').map((v) => parseInt(v, 10) || 0);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  if (startTotal > endTotal) {
    // Overnight quiet hours, e.g. 22:00 to 07:00
    return currentTotal >= startTotal || currentTotal < endTotal;
  } else {
    // Daytime quiet hours, e.g. 13:00 to 15:00
    return currentTotal >= startTotal && currentTotal < endTotal;
  }
}

/**
 * Deduplicates repeated events and retries.
 * Returns true if this event should be processed, false if it's a recent duplicate.
 */
export function checkAndRegisterEventDeduplication(id: string, now: number = Date.now()): boolean {
  // Prune expired entries
  for (const [key, ts] of recentNotificationEventIds.entries()) {
    if (now - ts > DEDUPLICATION_WINDOW_MS) {
      recentNotificationEventIds.delete(key);
    }
  }

  const lastSeen = recentNotificationEventIds.get(id);
  if (lastSeen && now - lastSeen < DEDUPLICATION_WINDOW_MS) {
    return false; // Duplicate within window
  }

  recentNotificationEventIds.set(id, now);
  return true;
}

/**
 * Clears deduplication cache (useful in tests).
 */
export function clearDeduplicationCache(): void {
  recentNotificationEventIds.clear();
}

/**
 * Resolves destination safely, guarding against deleted or inaccessible cases.
 */
export function resolveNotificationDestination(
  notification: AppNotification,
  activeCases: any[] = getCases()
): { valid: boolean; destination: string; message?: string } {
  if (notification.targetCaseId) {
    const caseExists = activeCases.some((c) => c && c.id === notification.targetCaseId);
    if (!caseExists) {
      return {
        valid: false,
        destination: notification.fallbackDestination || '/app/my-cases',
        message: 'The case file referenced by this notification is no longer active or was removed. Redirecting to your cases.',
      };
    }
  }

  return {
    valid: true,
    destination: notification.destination,
  };
}

/**
 * Synthesizes all active, classified notifications for the current profile.
 * Every notification has a stable ID, a typed purpose category, a verified destination,
 * and privacy-safe lock-screen text.
 */
export function getActiveNotifications(profileId?: string): AppNotification[] {
  const pId = profileId || getActiveProfileId();
  const stateMap = getNotificationStateMap(pId);
  const prefs = getNotificationPreferences(pId);
  const todayStr = getTodayDateString();
  const notifications: AppNotification[] = [];

  // 1. Daily Check-in Notification
  if (prefs.enabledCategories.daily_checkin) {
    const todayCheckin = getTodayCheckin();
    const id = `checkin_${todayStr}`;
    const state = stateMap[id];
    
    // If not checked in today, notification is relevant
    if (!todayCheckin) {
      notifications.push({
        id,
        category: 'daily_checkin',
        title: 'Daily Symptom & Energy Check-in',
        body: 'Log symptoms and energy when convenient to keep your health rhythm up to date. Missing a day never removes your history.',
        previewBody: 'HealthChain: Your daily health rhythm check-in is ready.',
        destination: '/app/today',
        fallbackDestination: '/app/today',
        actionLabel: 'Log Check-in',
        createdAt: `${todayStr}T09:00:00.000Z`,
        isRead: !!state?.isRead,
        isDismissed: !!state?.isDismissed,
        readAt: state?.readAt || null,
        dismissedAt: state?.dismissedAt || null,
        profileId: pId,
      });
    }
  }

  // 2. Clinical Alert Notifications from Active Cases
  if (prefs.enabledCategories.clinical_alert) {
    const cases = getCases();
    cases.forEach((caseItem) => {
      if (!caseItem || !caseItem.id) return;
      const pendingActions = (caseItem.actions || []).filter((a: any) => a && a.status !== 'completed');
      
      pendingActions.forEach((action: any) => {
        const actionId = action.id || encodeURIComponent(action.title || 'action');
        const id = `case_action_${caseItem.id}_${actionId}`;
        const state = stateMap[id];

        notifications.push({
          id,
          category: 'clinical_alert',
          title: `Action: ${caseItem.title || 'Clinical Case'}`,
          body: action.title || 'Review open clinical action item in your case file.',
          previewBody: 'HealthChain: An action item is pending in your care file.',
          destination: `/app/cases/${caseItem.id}`,
          fallbackDestination: '/app/my-cases',
          actionLabel: 'Review Action',
          createdAt: caseItem.updatedAt || new Date().toISOString(),
          isRead: !!state?.isRead,
          isDismissed: !!state?.isDismissed,
          readAt: state?.readAt || null,
          dismissedAt: state?.dismissedAt || null,
          profileId: pId,
          targetCaseId: caseItem.id,
          metadata: { actionId: action.id, caseTitle: caseItem.title },
        });
      });
    });
  }

  // 3. Appointment Preparation Briefs
  if (prefs.enabledCategories.appointment_prep) {
    const cases = getCases();
    cases.forEach((caseItem) => {
      if (!caseItem || !caseItem.id) return;
      const questions = ((caseItem.questions || (caseItem as any).clinicalQuestions || []) as any[]).filter((q: any) => q && q.status !== 'resolved');
      if (questions.length > 0) {
        const id = `prep_${caseItem.id}`;
        const state = stateMap[id];

        notifications.push({
          id,
          category: 'appointment_prep',
          title: `Appointment Brief: ${caseItem.title || 'Case'}`,
          body: `${questions.length} clinical questions ready for your upcoming clinician visit. Organize your briefing notes.`,
          previewBody: 'HealthChain: Clinical appointment preparation brief is ready for review.',
          destination: `/app/case-prep?caseId=${caseItem.id}`,
          fallbackDestination: '/app/case-prep',
          actionLabel: 'Prepare Brief',
          createdAt: caseItem.updatedAt || new Date().toISOString(),
          isRead: !!state?.isRead,
          isDismissed: !!state?.isDismissed,
          readAt: state?.readAt || null,
          dismissedAt: state?.dismissedAt || null,
          profileId: pId,
          targetCaseId: caseItem.id,
        });
      }
    });
  }

  // 4. Medication & Vitamin Schedule Reminders
  if (prefs.enabledCategories.medication_reminder) {
    try {
      const vitamins = getVitaminSchedule();
      vitamins.forEach((item) => {
        if (!item.enabled || item.takenToday) return;
        const id = `med_${item.id}_${todayStr}`;
        const state = stateMap[id];

        notifications.push({
          id,
          category: 'medication_reminder',
          title: `Scheduled: ${item.name}`,
          body: `Scheduled dose ${item.dosage ? `(${item.dosage}) ` : ''}for ${item.time || 'today'}. Tap to mark completed.`,
          previewBody: 'HealthChain: Scheduled medication reminder.',
          destination: '/app/today',
          fallbackDestination: '/app/today',
          actionLabel: 'Mark Taken',
          createdAt: `${todayStr}T${item.time || '09:00'}:00.000Z`,
          isRead: !!state?.isRead,
          isDismissed: !!state?.isDismissed,
          readAt: state?.readAt || null,
          dismissedAt: state?.dismissedAt || null,
          profileId: pId,
          metadata: { vitaminId: item.id },
        });
      });
    } catch {}
  }

  // 5. Hydration Check Notification
  if (prefs.enabledCategories.hydration_check) {
    const glasses = getWaterGlassesForDate(todayStr, pId);
    if (glasses < 8) {
      const id = `hydration_${todayStr}`;
      const state = stateMap[id];

      notifications.push({
        id,
        category: 'hydration_check',
        title: 'Cellular Hydration Rhythm',
        body: `${glasses}/8 glasses recorded today. Staying hydrated supports focus and energy.`,
        previewBody: 'HealthChain: Daily hydration check-in.',
        destination: '/app/today',
        fallbackDestination: '/app/today',
        actionLabel: '+1 Glass',
        createdAt: `${todayStr}T12:00:00.000Z`,
        isRead: !!state?.isRead,
        isDismissed: !!state?.isDismissed,
        readAt: state?.readAt || null,
        dismissedAt: state?.dismissedAt || null,
        profileId: pId,
      });
    }
  }

  // Load any user- or system-generated custom notifications stored under this profile scope
  const customKey = `hc_custom_notifications_${getNotificationStorageScope(pId)}`;
  const customRaw = getItemSync(customKey);
  if (customRaw) {
    try {
      const customList: AppNotification[] = JSON.parse(customRaw);
      customList.forEach((c) => {
        const state = stateMap[c.id];
        notifications.push({
          ...c,
          isRead: state?.isRead ?? c.isRead,
          isDismissed: state?.isDismissed ?? c.isDismissed,
          readAt: state?.readAt ?? c.readAt,
          dismissedAt: state?.dismissedAt ?? c.dismissedAt,
        });
      });
    } catch {}
  }

  return notifications;
}

/**
 * Calculates accurate unread badge count for the active profile.
 * An item only counts toward the badge if it is NOT read and NOT dismissed.
 */
export function getUnreadNotificationCount(profileId?: string): number {
  const activeList = getActiveNotifications(profileId);
  return activeList.filter((n) => !n.isRead && !n.isDismissed).length;
}

/**
 * Mark a single notification as read.
 */
export function markNotificationAsRead(id: string, profileId?: string): void {
  const pId = profileId || getActiveProfileId();
  const map = getNotificationStateMap(pId);
  map[id] = {
    ...map[id],
    isRead: true,
    readAt: new Date().toISOString(),
    isDismissed: map[id]?.isDismissed || false,
  };
  saveNotificationStateMap(map, pId);
}

/**
 * Mark a single notification as dismissed.
 */
export function markNotificationAsDismissed(id: string, profileId?: string): void {
  const pId = profileId || getActiveProfileId();
  const map = getNotificationStateMap(pId);
  map[id] = {
    ...map[id],
    isDismissed: true,
    dismissedAt: new Date().toISOString(),
    isRead: true,
  };
  saveNotificationStateMap(map, pId);
}

/**
 * Mark all active notifications as read.
 */
export function markAllNotificationsAsRead(profileId?: string): void {
  const pId = profileId || getActiveProfileId();
  const activeList = getActiveNotifications(pId);
  const map = getNotificationStateMap(pId);
  const now = new Date().toISOString();

  activeList.forEach((n) => {
    map[n.id] = {
      ...map[n.id],
      isRead: true,
      readAt: map[n.id]?.readAt || now,
      isDismissed: map[n.id]?.isDismissed || false,
    };
  });

  saveNotificationStateMap(map, pId);
}

/**
 * Dispatches or stores an ad-hoc custom notification.
 */
export function dispatchNotification(
  notification: Omit<AppNotification, 'createdAt' | 'isRead' | 'isDismissed' | 'profileId'>,
  profileId?: string
): boolean {
  if (!checkAndRegisterEventDeduplication(notification.id)) {
    return false; // Deduplicated
  }

  const pId = profileId || getActiveProfileId();
  const scope = getNotificationStorageScope(pId);
  const customKey = `hc_custom_notifications_${scope}`;
  let list: AppNotification[] = [];
  try {
    const raw = getItemSync(customKey);
    if (raw) list = JSON.parse(raw);
  } catch {}

  // Deduplicate against existing IDs in custom list
  if (list.some((item) => item.id === notification.id)) {
    return false;
  }

  const fullNotification: AppNotification = {
    ...notification,
    createdAt: new Date().toISOString(),
    isRead: false,
    isDismissed: false,
    profileId: pId,
  };

  list.unshift(fullNotification);
  setItemSync(customKey, JSON.stringify(list.slice(0, 50))); // Keep at most 50 custom notifications

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hc_notifications_updated'));
  }
  return true;
}

/**
 * Checks for timezone changes and returns true if timezone changed since last check.
 */
export function checkAndUpdateTimezone(storagePrefix: string = 'hc_notification_timezone'): boolean {
  try {
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const lastTimezone = getItemSync(storagePrefix);
    if (lastTimezone && lastTimezone !== currentTimezone) {
      setItemSync(storagePrefix, currentTimezone);
      return true;
    }
    if (!lastTimezone) {
      setItemSync(storagePrefix, currentTimezone);
    }
  } catch {}
  return false;
}
