// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({
  native: false,
  scope: 'account:profile_1',
  config: {} as any,
  prefs: {} as any,
  permission: true,
  sent: new Set<string>(),
  pendingCancel: null as null | (() => Promise<void>),
}));
const mocks = vi.hoisted(() => ({ cancel: vi.fn(), schedule: vi.fn(), permission: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => state.native } }));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: { cancel: mocks.cancel, schedule: mocks.schedule },
}));
vi.mock('../dietEveryday', () => ({ getDietEveryday: () => state.config }));
vi.mock('../profileScope', () => ({ getActiveProfileScope: () => state.scope }));
vi.mock('../NotificationDeviceService', () => ({
  hasNativeNotificationPermission: mocks.permission,
  ensureNotificationChannel: vi.fn(),
  NOTIFICATION_CHANNEL_ID: 'healthchain-alerts',
}));
vi.mock('../NotificationEngine', () => ({
  getNotificationPreferences: () => state.prefs,
  dispatchNotification: (entry: any) => {
    if (state.sent.has(entry.id)) return false;
    state.sent.add(entry.id);
    return true;
  },
}));
describe('optional meal reminder connections', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    state.native = false;
    state.scope = 'account:profile_1';
    state.permission = true;
    state.sent.clear();
    state.pendingCancel = null;
    state.config = {
      reminders: [
        {
          id: 'breakfast',
          label: 'Private breakfast name',
          time: '08:00',
          enabled: true,
          prepMinutes: 30,
        },
      ],
    };
    state.prefs = { enabledCategories: { meal_reminder: true }, quietHoursEnabled: false };
    mocks.cancel.mockImplementation(async () => {
      if (state.pendingCancel) await state.pendingCancel();
    });
    mocks.schedule.mockResolvedValue(undefined);
    mocks.permission.mockImplementation(async () => state.permission);
  });
  it('deduplicates web reminders by account/date/type and suppresses quiet hours', async () => {
    const service = await import('../DietMealReminderService');
    const now = new Date(2026, 8, 30, 8, 1);
    expect(service.checkInAppMealReminders(now)).toBe(1);
    expect(service.checkInAppMealReminders(now)).toBe(0);
    state.scope = 'other:profile_1';
    expect(service.checkInAppMealReminders(now)).toBe(1);
    state.config.quietStart = '07:00';
    state.config.quietEnd = '09:00';
    state.scope = 'third:profile_1';
    expect(service.checkInAppMealReminders(now)).toBe(0);
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('replaces native alarms in a separate id range with private lock-screen text', async () => {
    state.native = true;
    const service = await import('../DietMealReminderService');
    expect(await service.reconcileDietMealReminders()).toBe(true);
    const pending = mocks.schedule.mock.calls[0][0].notifications;
    expect(pending).toHaveLength(2);
    expect(pending.map((item: any) => item.id)).toEqual([3000, 3001]);
    expect(pending[0].body).not.toContain('Private');
    expect(pending[0].extra.scope).toBe('account:profile_1');
    await service.reconcileDietMealReminders();
    expect(mocks.schedule).toHaveBeenCalledTimes(1);
    state.prefs.enabledCategories.meal_reminder = false;
    await service.reconcileDietMealReminders();
    expect(mocks.cancel).toHaveBeenCalledTimes(2);
    expect(mocks.schedule).toHaveBeenCalledTimes(1);
  });
  it('reports denied permission and never schedules the previous account after a change', async () => {
    state.native = true;
    state.permission = false;
    const service = await import('../DietMealReminderService');
    expect(await service.reconcileDietMealReminders()).toBe(false);
    expect(mocks.schedule).not.toHaveBeenCalled();
    state.permission = true;
    state.pendingCancel = async () => {
      state.scope = 'new:profile_1';
    };
    expect(await service.reconcileDietMealReminders(true)).toBe(false);
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it('cancels alarms at logout and ignores later visibility events', async () => {
    state.native = true;
    const service = await import('../DietMealReminderService');
    const cleanup = service.initDietMealReminderService();
    await service.reconcileDietMealReminders(true);
    window.dispatchEvent(new Event('hc_logout'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    mocks.schedule.mockClear();
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.schedule).not.toHaveBeenCalled();
    expect(mocks.cancel).toHaveBeenCalled();
    cleanup();
  });
});
