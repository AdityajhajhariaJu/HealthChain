import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// Android channel settings are immutable after creation. Use a fresh channel for
// the unified reminders so existing installs do not keep the old missing sound.
export const NOTIFICATION_CHANNEL_ID = 'healthchain_daily_reminders_v2';

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Capacitor.isNativePlatform()) {
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    }
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') return await Notification.requestPermission() === 'granted';
    }
  } catch (error) {
    console.warn('[Notifications] Permission request failed:', error);
  }
  return false;
}

export async function hasNativeNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try { return (await LocalNotifications.checkPermissions()).display === 'granted'; }
  catch { return false; }
}

export async function ensureNotificationChannel(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  await LocalNotifications.createChannel({
    id: NOTIFICATION_CHANNEL_ID,
    name: 'HealthChain daily reminders',
    description: 'Daily check-in, medicine, and hydration reminders.',
    importance: 4,
    visibility: 0,
    vibration: true,
    lights: true,
    lightColor: '#059669',
  });
}
