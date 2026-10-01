import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { captureAccountScope, isAccountScopeCurrent, type AccountScope } from './AccountScope';
import { getItemSync, setItemSync, removeItemSync } from './storage';
import { ensureNotificationChannel } from './NotificationDeviceService';

let registrationScope: AccountScope | null = null;
let pushListenersSetUp = false;
let pushListenersReady: Promise<void> | null = null;
let pushNavigation: ((route: string) => void) | undefined;
const receivedIds = new Set<string>();
let queue: Promise<unknown> = Promise.resolve();
function installation() {
  let id = getItemSync('hc_push_installation_id');
  if (!id) { id = crypto.randomUUID(); setItemSync('hc_push_installation_id', id); }
  return id;
}
function key(ownerId: string) { return `hc_push_registration:${ownerId}:${installation()}`; }
export async function registerPushNotifications() {
  if (Capacitor.getPlatform() === 'web') return;
  const scope = captureAccountScope();
  if (scope.accountId === 'guest') return;
  const work = queue.catch(() => {}).then(async () => {
  if (!isAccountScopeCurrent(scope)) return;
  registrationScope = scope;
  try {
    let permission = await PushNotifications.checkPermissions();
    if (!isAccountScopeCurrent(scope)) return;
    if (permission.receive === 'prompt') permission = await PushNotifications.requestPermissions();
    if (!isAccountScopeCurrent(scope) || permission.receive !== 'granted') return;
    await setupPushListeners();
    await ensureNotificationChannel();
    if (!isAccountScopeCurrent(scope)) return;
    await PushNotifications.register();
  } catch (error) { console.warn('Push registration failed', error); }
  });
  queue = work.catch(() => {});
  await work;
}
export function unregisterPushDevice(scope = captureAccountScope()) {
  registrationScope = null;
  const result = queue.catch(() => {}).then(async () => {
    if (Capacitor.getPlatform() === 'web' || !isAccountScopeCurrent(scope)) return;
    let token: string | undefined;
    try { token = JSON.parse(getItemSync(key(scope.accountId)) || '{}').token; } catch {}
    const { data: { session } } = await supabase.auth.getSession();
    if (!isAccountScopeCurrent(scope)) return;
    // A missing installation token must never broaden deletion to other devices.
    if (typeof token === 'string' && token && session?.user.id === scope.accountId) {
      const { error } = await supabase.from('user_devices').delete()
        .eq('user_id', scope.accountId).eq('push_token', token);
      if (error) throw error;
    }
    if (!isAccountScopeCurrent(scope)) return;
    await PushNotifications.unregister();
    if (isAccountScopeCurrent(scope)) removeItemSync(key(scope.accountId));
  });
  queue = result.catch(() => {});
  return result;
}
export function setupPushListeners(navigate?: (route: string) => void) {
  if (navigate) pushNavigation = navigate;
  if (Capacitor.getPlatform() === 'web') return Promise.resolve();
  if (pushListenersSetUp) return pushListenersReady || Promise.resolve();
  pushListenersSetUp = true;
  const pending: Promise<{ remove: () => Promise<void> }>[] = [];
  const add = (event: string, callback: (payload: any) => void) => { pending.push((PushNotifications.addListener as any)(event, callback)); };
  add('registration', token => {
    const scope = registrationScope;
    if (!scope || !isAccountScopeCurrent(scope)) return;
    queue = queue.catch(() => {}).then(async () => {
      if (!isAccountScopeCurrent(scope)) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!isAccountScopeCurrent(scope) || session?.user.id !== scope.accountId) return;
      const { error } = await supabase.from('user_devices').upsert({
        user_id: scope.accountId, push_token: token.value, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,push_token' });
      if (error) throw error;
      if (isAccountScopeCurrent(scope)) setItemSync(key(scope.accountId), JSON.stringify({ token: token.value }));
    }).catch(error => console.warn('Push registration could not be saved', error));
  });
  add('registrationError', () => console.warn('Push registration failed. Check device permission.'));
  const accept = (notification: any, tapped: boolean) => {
    const data = notification.data || {}, scope = captureAccountScope();
    if (scope.accountId === 'guest' || data.ownerId !== scope.accountId || data.profileId !== scope.profileId || !isAccountScopeCurrent(scope)) return;
    if (data.type !== 'remote_test' || typeof data.requestId !== 'string') return;
    const id = scope.key + ':' + data.requestId;
    if (!receivedIds.has(id)) {
      receivedIds.add(id); if (receivedIds.size > 200) receivedIds.delete(receivedIds.values().next().value!);
      window.dispatchEvent(new CustomEvent('hc_remote_push_received', { detail: { requestId: data.requestId, ownerId: scope.accountId } }));
    }
    if (tapped && data.route === '/app/today') pushNavigation?.('/app/today');
  };
  add('pushNotificationReceived', notification => accept(notification, false));
  add('pushNotificationActionPerformed', action => accept(action.notification, true));
  pushListenersReady = Promise.all(pending).then(() => undefined).catch(async error => {
    const installed = await Promise.allSettled(pending);
    await Promise.allSettled(installed.filter(result => result.status === 'fulfilled').map(result => (result as PromiseFulfilledResult<{ remove: () => Promise<void> }>).value.remove()));
    pushListenersSetUp = false; pushListenersReady = null; throw error;
  });
  return pushListenersReady;
}
export async function testRemotePush(): Promise<string> {
  if (Capacitor.getPlatform() === 'web') throw new Error('Remote push testing requires the Android or iPhone app.');
  const scope = captureAccountScope();
  if (scope.accountId === 'guest') throw new Error('Sign in before testing remote notifications.');
  let token: string | undefined; try { token = JSON.parse(getItemSync(key(scope.accountId)) || '{}').token; } catch { /* No registered installation. */ }
  if (!token) { await registerPushNotifications(); throw new Error('Device registration is pending. Try again after registration finishes.'); }
  const { data: { session } } = await supabase.auth.getSession();
  if (!isAccountScopeCurrent(scope) || session?.user.id !== scope.accountId) throw new Error('Account changed.');
  const requestId = crypto.randomUUID();
  const response = await fetch('https://healthchain360.com/api/push-test', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ token, requestId }), signal: AbortSignal.timeout(25000) });
  const result = await response.json();
  if (!isAccountScopeCurrent(scope)) throw new Error('Account changed.');
  const messages: Record<string, string> = { remote_push_not_configured: 'The remote sending service still needs configuration.', device_not_registered: 'Register this phone again before testing.', device_registration_expired: 'This phone registration expired. Register again before testing.', test_rate_limited: 'Wait one minute before another remote test.' };
  if (!response.ok || !result.accepted) throw new Error(messages[result.error] || 'Remote notification could not be sent.');
  return requestId; // Acceptance is not delivery. Only the device listener confirms receipt.
}
