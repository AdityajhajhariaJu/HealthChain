import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getItemSync, setItemSync } from './storage';
import { checkAndUpdateTimezone } from './NotificationEngine';
import { getVitaminSchedule, triggerPillNotification } from './VitaminScheduleService';
import { getActiveProfileScope, getScopedStorageKey } from './profileScope';
import { captureNotificationScope, coordinateNotifications, notificationFailure } from './NotificationCoordinator';
import { ensureNotificationChannel, NOTIFICATION_CHANNEL_ID, requestNotificationPermission } from './NotificationDeviceService';
export { NOTIFICATION_CHANNEL_ID, requestNotificationPermission, ensureNotificationChannel } from './NotificationDeviceService';

export interface DailyReminderConfig { enabled: boolean; time: string; lastScheduled?: string }
const ENABLED = 'hc_daily_checkin_reminder_enabled';
const TIME = 'hc_daily_checkin_reminder_time';
export const NOTIFICATION_ID = 1001;
export const DAILY_CHECKIN_REMINDER_ID = NOTIFICATION_ID;
export const CHANNEL_ID = NOTIFICATION_CHANNEL_ID;
export const isDailyReminderEnabled = () => getItemSync(getScopedStorageKey(ENABLED)) === 'true';
const validTime = (time: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
export function getDailyReminderTime() {
  const time = getItemSync(getScopedStorageKey(TIME));
  return time && validTime(time) ? time : '09:00';
}
export const supportsDailyReminders = () => Capacitor.isNativePlatform();
export function scheduleDailyReminder(time = getDailyReminderTime(), requestPermission = true): Promise<boolean> {
  const scope = captureNotificationScope();
  return coordinateNotifications(scope, async () => {
    if (!validTime(time) || !supportsDailyReminders()) return false;
    try {
      const permission = requestPermission ? await requestNotificationPermission()
        : (await LocalNotifications.checkPermissions()).display === 'granted';
      if (!scope.current() || !permission) return false;
      await ensureNotificationChannel();
      if (!scope.current()) return false;
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
      if (!scope.current()) return false;
      const [hour, minute] = time.split(':').map(Number);
      await LocalNotifications.schedule({ notifications: [{
        id: NOTIFICATION_ID, title: 'Daily Health Check-in',
        body: 'Your requested HealthChain reminder is ready. Open the app to continue.',
        channelId: NOTIFICATION_CHANNEL_ID,
        schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
        extra: { route: '/app/today', type: 'daily_checkin', scope: scope.profile },
      }] });
      if (!scope.current()) {
        await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] }); return false;
      }
      return true;
    } catch { if (scope.current()) notificationFailure('daily check-in'); return false; }
  }, false);
}
export function cancelDailyReminder(): Promise<boolean> {
  const scope = captureNotificationScope();
  return coordinateNotifications(scope, async () => {
    try {
      if (supportsDailyReminders()) await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
      return scope.current();
    } catch { notificationFailure('daily check-in'); return false; }
  }, false);
}
export async function setDailyReminderEnabled(enabled: boolean): Promise<boolean> {
  const scope = captureNotificationScope();
  const ok = enabled ? await scheduleDailyReminder() : await cancelDailyReminder();
  if (!scope.current()) return false;
  if (!enabled && !ok) return false;
  setItemSync(getScopedStorageKey(ENABLED), String(enabled && ok));
  window.dispatchEvent(new CustomEvent('hc_reminder_updated', { detail: { enabled: enabled && ok, time: getDailyReminderTime() } }));
  return ok;
}
export async function setDailyReminderTime(time: string): Promise<boolean> {
  if (!validTime(time)) return false;
  const scope = captureNotificationScope();
  if (isDailyReminderEnabled() && !await scheduleDailyReminder(time)) return false;
  if (!scope.current()) return false;
  setItemSync(getScopedStorageKey(TIME), time);
  window.dispatchEvent(new CustomEvent('hc_reminder_updated', { detail: { enabled: isDailyReminderEnabled(), time } }));
  return true;
}
export async function sendTestNotification(): Promise<boolean> {
  const scope = captureNotificationScope();
  if (supportsDailyReminders()) return coordinateNotifications(scope, async () => {
    try {
      if (!await requestNotificationPermission() || !scope.current()) return false;
      await ensureNotificationChannel();
      if (!scope.current()) return false;
      await LocalNotifications.schedule({ notifications: [{
        id: 9999, title: 'HealthChain test reminder', body: 'Open HealthChain to continue your daily log.',
        channelId: CHANNEL_ID, schedule: { at: new Date(Date.now() + 800) },
        extra: { route: '/app/today', type: 'daily_checkin', scope: scope.profile },
      }] });
      if (!scope.current()) { await LocalNotifications.cancel({ notifications: [{ id: 9999 }] }); return false; }
      return true;
    } catch { notificationFailure('test'); return false; }
  }, false);
  if (!await requestNotificationPermission() || !scope.current()) return false;
  try { new Notification('HealthChain test reminder', { body: 'Open HealthChain to continue your daily log.', icon: '/logo.png' }); return true; }
  catch { return false; }
}
let listenersSetUp = false;
export async function initDailyReminderService(onNotificationClick?: (route: string) => void): Promise<void> {
  if (!listenersSetUp) {
    listenersSetUp = true;
    if (supportsDailyReminders()) {
      await LocalNotifications.addListener('localNotificationActionPerformed', notification => {
        const extra = notification.notification?.extra;
        const routes: Record<string, string> = { daily_checkin: '/app/today', pill_reminder: '/app/today', hydration: '/app/today', meal_reminder: '/app/dietician' };
        // Every action is checked before navigation, including old unscoped alarms.
        if (!extra || extra.scope !== getActiveProfileScope() || !routes[extra.type]) return;
        const route = routes[extra.type];
        const scope = captureNotificationScope();
        if (!scope.current()) return;
        if (onNotificationClick) onNotificationClick(route); else window.location.href = route;
        if (extra.type === 'pill_reminder') {
          const medicine = getVitaminSchedule().find(item => item.id === extra.vitaminId && item.enabled && !item.takenToday);
          if (medicine) window.setTimeout(() => { if (scope.current()) triggerPillNotification(medicine); }, 0);
        }
      });
    }
  }
  checkAndUpdateTimezone();
  if (isDailyReminderEnabled()) await scheduleDailyReminder(undefined, false);
  else await cancelDailyReminder();
}
