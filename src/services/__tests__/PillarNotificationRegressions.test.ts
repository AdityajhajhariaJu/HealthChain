// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  owner: 'A', getSession: vi.fn(), from: vi.fn(), scheduled: vi.fn(async () => {}),
  createChannel: vi.fn(async () => {}), handlers: {} as Record<string, Function>, unregister: vi.fn(async () => {}),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: {
  checkPermissions: async () => ({ display: 'granted' }), cancel: async () => {}, schedule: m.scheduled,
  createChannel: m.createChannel, addListener: async (name: string, handler: Function) => { m.handlers[name] = handler; },
} }));
vi.mock('@capacitor/push-notifications', () => ({ PushNotifications: { unregister: m.unregister } }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: m.getSession }, from: m.from } }));
vi.mock('../ProfileEngine', () => ({ getProfile: () => ({ medications: [] }), saveProfile: async () => {}, getProfileKey: () => 'hc_unified_profile_' + m.owner, getProfileEngineState: () => ({ activeId: 'profile_1' }) }));
vi.mock('../storage', () => ({ getItemSync: (key: string) => localStorage.getItem(key), setItemSync: (key: string, value: string) => localStorage.setItem(key, value), removeItemSync: (key: string) => localStorage.removeItem(key) }));
vi.mock('../NotificationEngine', () => ({ checkAndUpdateTimezone: () => false }));
import { unregisterPushDevice } from '../PushService';
import { rescheduleVitaminNotifications } from '../VitaminScheduleService';
import { initDailyReminderService } from '../DailyCheckinNotificationService';
beforeEach(() => { localStorage.clear(); m.owner = 'A'; localStorage.setItem('hc_account',JSON.stringify({id:'A'})); m.getSession.mockReset(); m.from.mockReset(); m.scheduled.mockClear(); m.createChannel.mockReset().mockResolvedValue(undefined); });
describe('notification ownership regressions (SDK boundary)', () => {
  it('DA-06: a missing installation token never deletes all account devices', async () => {
    const filters: any[] = [];
    const query: any = { delete: () => query, eq: (k: string, v: string) => { filters.push([k, v]); return query; }, then: (resolve: Function) => resolve({ error: null }) };
    m.from.mockReturnValue(query); m.getSession.mockResolvedValue({ data: { session: { user: { id: 'A' } } } });
    await unregisterPushDevice();
    expect(filters).toEqual([]);
  });
  it('DA-07: delayed unregister never targets the next account', async () => {
    let resolveSession!: Function;
    m.getSession.mockImplementation(() => new Promise(resolve => { resolveSession = resolve; }));
    const filters: any[] = [];
    const query: any = { delete: () => query, eq: (k: string, v: string) => { filters.push([k, v]); return query; }, then: (resolve: Function) => resolve({ error: null }) };
    m.from.mockReturnValue(query);
    const result = unregisterPushDevice(); await vi.waitFor(()=>expect(m.getSession).toHaveBeenCalled()); m.owner = 'B'; localStorage.setItem('hc_account',JSON.stringify({id:'B'}));
    resolveSession({ data: { session: { user: { id: 'B' } } } }); await result;
    expect(filters).toEqual([]);
  });
  it('DA-08: channel creation cannot schedule a previous owners medicine', async () => {
    let entered!: Function, release!: Function;
    const started = new Promise(resolve => { entered = resolve; });
    m.createChannel.mockImplementation(async () => { entered(); await new Promise(resolve => { release = resolve; }); });
    const result = rescheduleVitaminNotifications([{ id: 'A-medicine', name: 'Synthetic A medicine', dosage: '', time: '08:30', enabled: true }]);
    await started; m.owner = 'B'; localStorage.setItem('hc_account',JSON.stringify({id:'B'})); release(); await result;
    expect(m.scheduled).not.toHaveBeenCalled();
  });
  it('DA-09: foreign pill and meal actions are rejected before navigation', async () => {
    const navigate = vi.fn(); await initDailyReminderService(navigate); m.owner = 'B'; localStorage.setItem('hc_account',JSON.stringify({id:'B'}));
    m.handlers.localNotificationActionPerformed({ notification: { extra: { type: 'pill_reminder', scope: 'hc_unified_profile_A:profile_1', route: '/app/today', vitaminId: 'A-medicine' } } });
    expect(navigate).not.toHaveBeenCalled();
    m.handlers.localNotificationActionPerformed({ notification: { extra: { type: 'meal_reminder', scope: 'hc_unified_profile_A:profile_1', route: '/app/dietician' } } });
    expect(navigate).not.toHaveBeenCalled();
  });
});
