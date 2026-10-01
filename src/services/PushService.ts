import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { captureAccountScope, isAccountScopeCurrent, type AccountScope } from './AccountScope';
import { getItemSync, setItemSync, removeItemSync } from './storage';

let registrationScope: AccountScope | null = null;
let pushListenersSetUp = false;
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
export function setupPushListeners() {
  if (Capacitor.getPlatform() === 'web' || pushListenersSetUp) return;
  pushListenersSetUp = true;
  void PushNotifications.addListener('registration', token => {
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
  void PushNotifications.addListener('registrationError', () => console.warn('Push registration failed. Check device permission.'));
}
