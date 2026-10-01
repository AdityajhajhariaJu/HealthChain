// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ handlers: {} as Record<string, Function>, registered: vi.fn(async () => {}), upsert: vi.fn(async () => ({ error: null })) }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android' } }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: { checkPermissions: async () => ({ receive: 'granted' }), register: m.registered, addListener: async (name: string, handler: Function) => { m.handlers[name] = handler; return { remove: async () => {} }; } } }));
vi.mock('../NotificationDeviceService', () => ({ ensureNotificationChannel: async () => {} }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'push-owner' } } } }) }, from: () => ({ upsert: m.upsert }) } }));
beforeEach(() => { vi.resetModules(); localStorage.clear(); localStorage.setItem('hc_account', JSON.stringify({ id: 'push-owner' })); m.handlers = {}; m.registered.mockClear(); m.upsert.mockClear(); });
it('waits for registration listeners and ignores foreign, stale and duplicate delivery events', async () => {
  const push = await import('../PushService'); const navigate = vi.fn(), received = vi.fn(); window.addEventListener('hc_remote_push_received', received);
  try {
    await push.setupPushListeners(navigate); await push.registerPushNotifications(); expect(m.registered).toHaveBeenCalledOnce(); expect(m.handlers.registration).toBeTypeOf('function');
    const notification = { data: { ownerId: 'push-owner', profileId: 'profile_1', type: 'remote_test', requestId: 'request-1', route: '/app/today' } };
    m.handlers.pushNotificationReceived({ data: { ...notification.data, ownerId: 'other' } }); expect(received).not.toHaveBeenCalled();
    m.handlers.pushNotificationReceived(notification); m.handlers.pushNotificationReceived(notification); expect(received).toHaveBeenCalledOnce();
    m.handlers.pushNotificationActionPerformed({ notification }); expect(navigate).toHaveBeenCalledWith('/app/today');
    localStorage.setItem('hc_account', JSON.stringify({ id: 'other' })); m.handlers.pushNotificationActionPerformed({ notification }); expect(navigate).toHaveBeenCalledTimes(1);
  } finally { window.removeEventListener('hc_remote_push_received', received); }
});
