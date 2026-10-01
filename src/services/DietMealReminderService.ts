import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { mealReminderEvents, quietMealMinute } from '../../shared/diet-reminders';
import { getDietEveryday } from './dietEveryday';
import {
  captureNotificationScope,
  coordinateNotifications,
  notificationFailure,
  reconcileLegacyNotificationIds,
} from './NotificationCoordinator';
import {
  ensureNotificationChannel,
  hasNativeNotificationPermission,
  NOTIFICATION_CHANNEL_ID,
} from './NotificationDeviceService';
import { dispatchNotification, getNotificationPreferences } from './NotificationEngine';
import { getActiveProfileScope } from './profileScope';
const ids = Array.from({ length: 24 }, (_, i) => ({ id: 4000 + i }));
let signature = '';
export const supportsNativeMealReminders = () => Capacitor.isNativePlatform();
export function reconcileDietMealReminders(force = false): Promise<boolean> {
  const owner = captureNotificationScope();
  const scope = owner.profile;
  const config = getDietEveryday(),
    preferences = getNotificationPreferences();
  const next = JSON.stringify([
    scope,
    config.reminders,
    config.quietStart,
    config.quietEnd,
    preferences.quietHoursEnabled,
    preferences.quietHoursStart,
    preferences.quietHoursEnd,
    preferences.enabledCategories.meal_reminder,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]);
  if (!force && signature === next) return Promise.resolve(true);
  let success = true;
  const result = coordinateNotifications(owner, async () => {
      if (!supportsNativeMealReminders()) {
        signature = next;
        return;
      }
      try {
        await reconcileLegacyNotificationIds();
        if (!owner.current()) { success = false; return; }
        await LocalNotifications.cancel({ notifications: ids });
        if (!owner.current()) {
          success = false;
          return;
        }
        const events =
          preferences.enabledCategories.meal_reminder === false
            ? []
            : mealReminderEvents(config.reminders, config.quietStart, config.quietEnd).filter(
                (event) =>
                  !preferences.quietHoursEnabled ||
                  !quietMealMinute(
                    event.minute,
                    preferences.quietHoursStart,
                    preferences.quietHoursEnd
                  )
              );
        if (events.length && !(await hasNativeNotificationPermission())) {
          success = false;
          return;
        }
        if (events.length) {
          await ensureNotificationChannel();
          if (!owner.current()) {
            success = false;
            return;
          }
          await LocalNotifications.schedule({
            notifications: events.map((event) => ({
              id: event.id,
              title: 'HealthChain food reminder',
              body: 'Your requested food reminder is ready. Open HealthChain to review it.',
              channelId: NOTIFICATION_CHANNEL_ID,
              schedule: {
                on: { hour: Math.floor(event.minute / 60), minute: event.minute % 60 },
                repeats: true,
                allowWhileIdle: true,
              },
              extra: { route: '/app/dietician', type: 'meal_reminder', scope },
            })),
          });
        }
        if (!owner.current()) { await LocalNotifications.cancel({ notifications: ids }); success = false; return; }
        signature = next;
      } catch {
        if (owner.current()) notificationFailure('meals');
        success = false;
      }
    }, undefined);
  return result.then(() => success);
}
export function checkInAppMealReminders(now = new Date()): number {
  if (supportsNativeMealReminders()) return 0;
  const config = getDietEveryday(),
    preferences = getNotificationPreferences();
  if (preferences.enabledCategories.meal_reminder === false) return 0;
  const minute = now.getHours() * 60 + now.getMinutes(),
    date = now.toLocaleDateString('en-CA'),
    scope = getActiveProfileScope();
  const events = mealReminderEvents(config.reminders, config.quietStart, config.quietEnd);
  let count = 0;
  for (const event of events)
    if (event.minute <= minute && minute - event.minute <= 5) {
      if (
        preferences.quietHoursEnabled &&
        quietMealMinute(minute, preferences.quietHoursStart, preferences.quietHoursEnd)
      )
        continue;
      if (
        dispatchNotification({
          id: `meal:${scope}:${date}:${event.reminderId}:${event.kind}`,
          category: 'meal_reminder',
          title: 'Requested food reminder',
          body: `${event.kind === 'prep' ? 'Preparation' : 'Meal'} reminder: ${event.label}. You can skip or adjust it.`,
          previewBody: 'Your requested food reminder is ready.',
          destination: '/app/dietician',
          fallbackDestination: '/app/today',
          actionLabel: 'Open food planner',
        })
      )
        count++;
    }
  return count;
}
export function initDietMealReminderService() {
  let loggedOut = false;
  const refresh = () => {
    if (!loggedOut) {
      void reconcileDietMealReminders();
      checkInAppMealReminders();
    }
  };
  const logout = () => {
    loggedOut = true;
    signature = '';

  };
  const visible = () => {
    if (!loggedOut && document.visibilityState === 'visible') {
      void reconcileDietMealReminders(true);
      checkInAppMealReminders();
    }
  };
  refresh();
  const timer = window.setInterval(() => {
    if (!loggedOut) checkInAppMealReminders();
  }, 30000);
  for (const name of ['hc_profile_updated', 'hc_notifications_prefs_updated'])
    window.addEventListener(name, refresh);
  window.addEventListener('hc_logout', logout);
  document.addEventListener('visibilitychange', visible);
  return () => {
    window.clearInterval(timer);
    for (const name of ['hc_profile_updated', 'hc_notifications_prefs_updated'])
      window.removeEventListener(name, refresh);
    window.removeEventListener('hc_logout', logout);
    document.removeEventListener('visibilitychange', visible);
  };
}
