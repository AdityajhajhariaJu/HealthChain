import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { getItemSync, setItemSync } from './storage';

export interface DailyReminderConfig {
  enabled: boolean;
  time: string; // "HH:MM" 24h format, e.g. "09:00"
  lastScheduled?: string;
}

const STORAGE_KEY_ENABLED = 'hc_daily_checkin_reminder_enabled';
const STORAGE_KEY_TIME = 'hc_daily_checkin_reminder_time';
export const NOTIFICATION_ID = 1001;
export const NOTIFICATION_CHANNEL_ID = 'healthchain_daily_checkin';
export const DAILY_CHECKIN_REMINDER_ID = NOTIFICATION_ID;
export const CHANNEL_ID = NOTIFICATION_CHANNEL_ID;

/**
 * Checks whether the daily check-in reminder notification is enabled.
 * Defaults to true for health engagement.
 */
export function isDailyReminderEnabled(): boolean {
  const stored = getItemSync(STORAGE_KEY_ENABLED);
  return stored !== null ? stored === 'true' : true;
}

/**
 * Gets the preferred time for the daily reminder (24h format "HH:MM").
 * Defaults to 09:00 AM.
 */
export function getDailyReminderTime(): string {
  return getItemSync(STORAGE_KEY_TIME) || '09:00';
}

/**
 * Requests notification permissions across platforms (Capacitor Native or Web Notification API).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') {
        perm = await LocalNotifications.requestPermissions();
      }
      return perm.display === 'granted';
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
    }
  } catch (e) {
    console.warn('[DailyReminder] Permission request warning:', e);
  }
  return false;
}

/**
 * Initializes notification channels on Android.
 */
async function ensureNotificationChannel(): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    try {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'Daily Health Rhythm Check-in',
        description: 'Daily reminder alerts to log your symptoms, energy, and wellness.',
        importance: 4, // High importance
        visibility: 1, // Public
        sound: 'beep.wav',
        vibration: true,
        lights: true,
        lightColor: '#059669',
      });
    } catch (e) {
      console.warn('[DailyReminder] Error creating Android notification channel:', e);
    }
  }
}

/**
 * Schedules or re-schedules the everyday recurring check-in notification.
 */
export async function scheduleDailyReminder(time?: string): Promise<boolean> {
  const targetTime = time || getDailyReminderTime();
  const [hourStr, minuteStr] = targetTime.split(':');
  const hour = parseInt(hourStr || '9', 10);
  const minute = parseInt(minuteStr || '0', 10);

  try {
    if (Capacitor.isNativePlatform()) {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        console.warn('[DailyReminder] Cannot schedule: permission not granted.');
        return false;
      }

      await ensureNotificationChannel();

      // Cancel previous scheduled reminder
      try {
        await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
      } catch {}

      // Schedule recurring daily reminder at specified hour and minute
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_ID,
            title: 'Daily Health Check-in 🌿',
            body: 'How are you feeling today? Tap to record your symptoms and claim +2 Vitality Points.',
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              on: {
                hour,
                minute,
              },
              repeats: true,
              allowWhileIdle: true,
            },
            actionTypeId: 'DAILY_CHECKIN',
            extra: {
              route: '/app/today',
              type: 'daily_checkin',
            },
          },
        ],
      });

      console.info(`[DailyReminder] Native reminder successfully scheduled for ${targetTime} daily.`);
      return true;
    } else {
      // Web browser environment
      if (typeof window !== 'undefined' && 'Notification' in window) {
        await requestNotificationPermission();
      }
      console.info(`[DailyReminder] Web reminder set for ${targetTime} daily.`);
      return true;
    }
  } catch (err) {
    console.warn('[DailyReminder] Error scheduling daily notification:', err);
    return false;
  }
}

/**
 * Cancels the daily check-in reminder notification.
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
    }
    console.info('[DailyReminder] Daily reminder cancelled.');
  } catch (e) {
    console.warn('[DailyReminder] Error cancelling reminder:', e);
  }
}

/**
 * Updates the enabled state of the daily reminder and schedules/cancels accordingly.
 */
export async function setDailyReminderEnabled(enabled: boolean): Promise<boolean> {
  setItemSync(STORAGE_KEY_ENABLED, enabled ? 'true' : 'false');
  if (enabled) {
    const success = await scheduleDailyReminder();
    window.dispatchEvent(new CustomEvent('hc_reminder_updated', { detail: { enabled: true, time: getDailyReminderTime() } }));
    return success;
  } else {
    await cancelDailyReminder();
    window.dispatchEvent(new CustomEvent('hc_reminder_updated', { detail: { enabled: false, time: getDailyReminderTime() } }));
    return true;
  }
}

/**
 * Updates the preferred reminder time and re-schedules if currently enabled.
 */
export async function setDailyReminderTime(time: string): Promise<boolean> {
  setItemSync(STORAGE_KEY_TIME, time);
  if (isDailyReminderEnabled()) {
    const success = await scheduleDailyReminder(time);
    window.dispatchEvent(new CustomEvent('hc_reminder_updated', { detail: { enabled: true, time } }));
    return success;
  }
  window.dispatchEvent(new CustomEvent('hc_reminder_updated', { detail: { enabled: false, time } }));
  return true;
}

/**
 * Fires an immediate test notification so the user can verify delivery on device or desktop.
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      await ensureNotificationChannel();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: 9999,
            title: 'HealthChain Alert: Daily Check-in 🌿',
            body: 'How are your symptoms today? Tap to record your daily log and claim +2 Vitality Points.',
            channelId: NOTIFICATION_CHANNEL_ID,
            schedule: {
              at: new Date(Date.now() + 800), // Fire in 800ms
            },
            extra: {
              route: '/app/today',
              type: 'daily_checkin',
            },
          },
        ],
      });
      return true;
    } else if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('HealthChain Alert: Daily Check-in 🌿', {
          body: 'How are your symptoms today? Tap to record your daily log and claim +2 Vitality Points.',
          icon: '/logo.png',
        });
        return true;
      } else {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification('HealthChain Alert: Daily Check-in 🌿', {
            body: 'How are your symptoms today? Tap to record your daily log and claim +2 Vitality Points.',
            icon: '/logo.png',
          });
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('[DailyReminder] Error sending test notification:', err);
  }
  return false;
}

/**
 * Sets up global listeners for local notification action clicks and initializes the reminder on startup.
 */
let listenersSetUp = false;

export async function initDailyReminderService(onNotificationClick?: (route: string) => void): Promise<void> {
  if (listenersSetUp) return;
  listenersSetUp = true;

  if (Capacitor.isNativePlatform()) {
    try {
      await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const route = notification.notification?.extra?.route || '/app/today';
        if (onNotificationClick) {
          onNotificationClick(route);
        } else {
          window.location.href = route;
        }
      });
    } catch (e) {
      console.warn('[DailyReminder] Listener setup warning:', e);
    }
  }

  // If enabled, ensure the schedule is active
  if (isDailyReminderEnabled()) {
    await scheduleDailyReminder();
  }
}
