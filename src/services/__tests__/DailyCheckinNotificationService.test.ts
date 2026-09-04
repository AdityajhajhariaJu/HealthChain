// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockSchedule,
  mockCancel,
  mockRequestPermissions,
  mockCheckPermissions,
  mockCreateChannel,
  mockAddListener,
} = vi.hoisted(() => ({
  mockSchedule: vi.fn(async () => {}),
  mockCancel: vi.fn(async () => {}),
  mockRequestPermissions: vi.fn(async () => ({ display: 'granted' })),
  mockCheckPermissions: vi.fn(async () => ({ display: 'granted' })),
  mockCreateChannel: vi.fn(async () => {}),
  mockAddListener: vi.fn(() => ({ remove: vi.fn() })),
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: mockSchedule,
    cancel: mockCancel,
    requestPermissions: mockRequestPermissions,
    checkPermissions: mockCheckPermissions,
    createChannel: mockCreateChannel,
    addListener: mockAddListener,
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    getPlatform: vi.fn(() => 'android'),
  },
}));

import {
  isDailyReminderEnabled,
  setDailyReminderEnabled,
  getDailyReminderTime,
  setDailyReminderTime,
  scheduleDailyReminder,
  cancelDailyReminder,
  DAILY_CHECKIN_REMINDER_ID,
  CHANNEL_ID,
} from '../DailyCheckinNotificationService';

describe('DailyCheckinNotificationService', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockSchedule.mockClear();
    mockCancel.mockClear();
    mockCreateChannel.mockClear();
  });

  it('defaults to enabled and 09:00 reminder time', () => {
    expect(isDailyReminderEnabled()).toBe(true);
    expect(getDailyReminderTime()).toBe('09:00');
  });

  it('updates reminder time and broadcasts hc_reminder_updated event', async () => {
    let capturedEvent: any = null;
    const listener = (e: any) => { capturedEvent = e.detail; };
    window.addEventListener('hc_reminder_updated', listener);

    await setDailyReminderTime('13:30');
    expect(getDailyReminderTime()).toBe('13:30');
    expect(capturedEvent).toEqual({ enabled: true, time: '13:30' });

    window.removeEventListener('hc_reminder_updated', listener);
  });

  it('schedules daily recurring notifications with correct parameters', async () => {
    const success = await scheduleDailyReminder('20:00');
    expect(success).toBe(true);
    expect(mockSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            id: DAILY_CHECKIN_REMINDER_ID,
            channelId: CHANNEL_ID,
            schedule: expect.objectContaining({
              on: { hour: 20, minute: 0 },
              repeats: true,
              allowWhileIdle: true,
            }),
          }),
        ]),
      })
    );
  });

  it('cancels notifications when disabled', async () => {
    await setDailyReminderEnabled(false);
    expect(isDailyReminderEnabled()).toBe(false);
    expect(mockCancel).toHaveBeenCalledWith({
      notifications: [{ id: DAILY_CHECKIN_REMINDER_ID }],
    });
  });
});
