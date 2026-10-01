import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { getActiveProfileScope } from './profileScope';

let queue: Promise<unknown> = Promise.resolve();
export function captureNotificationScope() {
  const account = captureAccountScope(), profile = getActiveProfileScope();
  return { account, profile, current: () => isAccountScopeCurrent(account) && profile === getActiveProfileScope() };
}
export type NotificationScope = ReturnType<typeof captureNotificationScope>;
/** All native schedules and cancellation share a device-wide serial queue. */
export function coordinateNotifications<T>(scope: NotificationScope, work: () => Promise<T>, stale: T): Promise<T> {
  const result = queue.catch(() => {}).then(() => scope.current() ? work() : stale);
  queue = result.catch(() => {});
  return result;
}
export function notificationFailure(area: string) {
  window.dispatchEvent(new CustomEvent('hc_notification_error', { detail: { area, message: 'Device reminders could not be updated. Check notification permission and try again.' } }));
}
// Legacy meals occupied 3000–3023; hydration owns 3000–3012. Reconcile once
// before any new scheduling so old meal alarms cannot survive the ID migration.
let reconciled = false;
export async function reconcileLegacyNotificationIds() {
  if (reconciled || !Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: Array.from({ length: 24 }, (_, i) => ({ id: 3000 + i })) });
  reconciled = true;
}
export function cancelAccountNotifications() {
  const scope = captureNotificationScope();
  return coordinateNotifications(scope, async () => {
    if (!Capacitor.isNativePlatform()) return;
    const ids = [1001, 9999, ...Array.from({ length: 100 }, (_, i) => 2000 + i),
      ...Array.from({ length: 24 }, (_, i) => 3000 + i), ...Array.from({ length: 24 }, (_, i) => 4000 + i)];
    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  }, undefined);
}
if (typeof window !== 'undefined') window.addEventListener('hc_logout', () => { void cancelAccountNotifications().catch(() => notificationFailure('logout')); });
