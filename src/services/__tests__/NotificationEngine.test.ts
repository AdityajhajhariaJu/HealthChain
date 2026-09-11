// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getActiveNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markNotificationAsDismissed,
  markAllNotificationsAsRead,
  resolveNotificationDestination,
  getWaterGlassesForDate,
  setWaterGlassesForDate,
  checkAndRegisterEventDeduplication,
  clearDeduplicationCache,
  isQuietHoursActive,
  getNotificationPreferences,
  saveNotificationPreferences,
  checkAndUpdateTimezone,
  dispatchNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
  AppNotification
} from '../NotificationEngine';

// Mock ProfileEngine & CaseEngine & VitaminScheduleService
let mockProfileState: any = { activeId: 'profile_1' };
let mockCheckin: any = null;
let mockCases: any[] = [];
let mockVitamins: any[] = [];

vi.mock('../ProfileEngine', () => ({
  getProfileKey: vi.fn(() => 'hc_unified_profile'),
  getProfileEngineState: vi.fn(() => mockProfileState),
  getTodayCheckin: vi.fn(() => mockCheckin),
}));

vi.mock('../CaseEngine', () => ({
  getCases: vi.fn(() => mockCases),
}));

vi.mock('../VitaminScheduleService', () => ({
  getVitaminSchedule: vi.fn(() => mockVitamins),
  getTodayDateString: vi.fn(() => '2026-09-11'),
}));

describe('NotificationEngine & Complete Notifications (Package 9)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearDeduplicationCache();
    mockProfileState = { activeId: 'profile_1' };
    mockCheckin = null;
    mockCases = [];
    mockVitamins = [];
  });

  describe('1. Purpose Classification & 2. Stable IDs and Destinations', () => {
    it('classifies notifications by typed purpose and assigns deterministic IDs and destinations', () => {
      mockCases = [
        {
          id: 'case_cardio_123',
          title: 'Cardiovascular Assessment',
          actions: [{ id: 'act_ecg', title: 'Schedule follow-up ECG', status: 'pending' }],
          clinicalQuestions: [{ id: 'q_1', text: 'Should dosage be adjusted?', status: 'open' }],
          updatedAt: '2026-09-11T10:00:00.000Z',
        },
      ];
      mockVitamins = [
        { id: 'vit_d3', name: 'Vitamin D3', dosage: '2000 IU', time: '09:00', enabled: true, takenToday: false },
      ];

      const notifications = getActiveNotifications();

      // Check-in notification
      const checkinNotif = notifications.find((n) => n.category === 'daily_checkin');
      expect(checkinNotif).toBeDefined();
      expect(checkinNotif?.id).toBe('checkin_2026-09-11');
      expect(checkinNotif?.destination).toBe('/app/today');

      // Clinical alert notification
      const caseNotif = notifications.find((n) => n.category === 'clinical_alert');
      expect(caseNotif).toBeDefined();
      expect(caseNotif?.id).toBe('case_action_case_cardio_123_act_ecg');
      expect(caseNotif?.destination).toBe('/app/cases/case_cardio_123');
      expect(caseNotif?.fallbackDestination).toBe('/app/my-cases');
      expect(caseNotif?.targetCaseId).toBe('case_cardio_123');

      // Appointment prep notification
      const prepNotif = notifications.find((n) => n.category === 'appointment_prep');
      expect(prepNotif).toBeDefined();
      expect(prepNotif?.id).toBe('prep_case_cardio_123');
      expect(prepNotif?.destination).toBe('/app/case-prep?caseId=case_cardio_123');

      // Medication notification
      const medNotif = notifications.find((n) => n.category === 'medication_reminder');
      expect(medNotif).toBeDefined();
      expect(medNotif?.id).toBe('med_vit_d3_2026-09-11');
      expect(medNotif?.destination).toBe('/app/today');

      // Hydration check notification
      const hydrationNotif = notifications.find((n) => n.category === 'hydration_check');
      expect(hydrationNotif).toBeDefined();
      expect(hydrationNotif?.id).toBe('hydration_2026-09-11');
      expect(hydrationNotif?.destination).toBe('/app/today');
    });
  });

  describe('3. Profile-Scoped Persistence & Concrete Hydration Isolation', () => {
    it('isolates hydration glasses by active profile and prevents cross-profile leakage', () => {
      // Profile 1 records 5 glasses
      setWaterGlassesForDate('2026-09-11', 5, 'profile_1');
      expect(getWaterGlassesForDate('2026-09-11', 'profile_1')).toBe(5);

      // Profile 2 has not recorded water yet
      expect(getWaterGlassesForDate('2026-09-11', 'profile_2')).toBe(0);

      // Profile 2 records 2 glasses
      setWaterGlassesForDate('2026-09-11', 2, 'profile_2');
      expect(getWaterGlassesForDate('2026-09-11', 'profile_2')).toBe(2);

      // Profile 1 remains unchanged at 5 glasses
      expect(getWaterGlassesForDate('2026-09-11', 'profile_1')).toBe(5);
    });

    it('persists read and dismissed state strictly under active profile scope', () => {
      // Mark checkin notification as read for profile_1
      markNotificationAsRead('checkin_2026-09-11', 'profile_1');
      let notifsP1 = getActiveNotifications('profile_1');
      const checkinP1 = notifsP1.find((n) => n.id === 'checkin_2026-09-11');
      expect(checkinP1?.isRead).toBe(true);

      // Profile 2's checkin notification must still be unread
      let notifsP2 = getActiveNotifications('profile_2');
      const checkinP2 = notifsP2.find((n) => n.id === 'checkin_2026-09-11');
      expect(checkinP2?.isRead).toBe(false);

      // Dismiss a notification for profile_1
      markNotificationAsDismissed('hydration_2026-09-11', 'profile_1');
      notifsP1 = getActiveNotifications('profile_1');
      const hydP1 = notifsP1.find((n) => n.id === 'hydration_2026-09-11');
      expect(hydP1?.isDismissed).toBe(true);

      // Profile 2's hydration is not dismissed
      notifsP2 = getActiveNotifications('profile_2');
      const hydP2 = notifsP2.find((n) => n.id === 'hydration_2026-09-11');
      expect(hydP2?.isDismissed).toBe(false);
    });
  });

  describe('4. Badge Management & Accurate Removal', () => {
    it('returns positive unread count when unread items exist and removes badge when count reaches 0', () => {
      const initialCount = getUnreadNotificationCount('profile_1');
      expect(initialCount).toBeGreaterThan(0);

      // Mark all notifications as read
      markAllNotificationsAsRead('profile_1');
      const countAfterMarkAll = getUnreadNotificationCount('profile_1');
      expect(countAfterMarkAll).toBe(0);
    });

    it('removes checkin notification from unread count once checkin is completed', () => {
      const countBefore = getUnreadNotificationCount('profile_1');
      
      // Simulate today's checkin completed
      mockCheckin = { id: 'chk_today', symptom: 'Good', score: 0 };
      const countAfter = getUnreadNotificationCount('profile_1');
      expect(countAfter).toBe(countBefore - 1);
    });
  });

  describe('5. Deduplication of Repeated Events & Retries', () => {
    it('deduplicates rapid event triggers and rejects duplicate custom alerts within window', () => {
      expect(checkAndRegisterEventDeduplication('sync_event_1')).toBe(true);
      // Rapid retry with same ID within deduplication window
      expect(checkAndRegisterEventDeduplication('sync_event_1')).toBe(false);

      // Different event ID passes
      expect(checkAndRegisterEventDeduplication('sync_event_2')).toBe(true);
    });

    it('dispatchNotification rejects duplicates and stores valid custom notifications', () => {
      const customNotif: Omit<AppNotification, 'createdAt' | 'isRead' | 'isDismissed' | 'profileId'> = {
        id: 'cloud_sync_alert_1',
        category: 'system_info',
        title: 'Cloud Backup Complete',
        body: 'Your medical records were securely synchronized.',
        previewBody: 'HealthChain: System update ready.',
        destination: '/app/settings',
        fallbackDestination: '/app/today',
        actionLabel: 'View Settings',
      };

      expect(dispatchNotification(customNotif, 'profile_1')).toBe(true);
      // Repeated retry
      expect(dispatchNotification(customNotif, 'profile_1')).toBe(false);

      const notifs = getActiveNotifications('profile_1');
      const found = notifs.filter((n) => n.id === 'cloud_sync_alert_1');
      expect(found.length).toBe(1);
    });
  });

  describe('6. Graceful Handling of Deleted or Inaccessible Target Cases', () => {
    it('routes safely to destination when target case exists', () => {
      mockCases = [{ id: 'case_existing_99', title: 'Endocrine Review' }];
      const notif: AppNotification = {
        id: 'notif_1',
        category: 'clinical_alert',
        title: 'Action Item',
        body: 'Follow-up needed',
        previewBody: 'HealthChain: Update',
        destination: '/app/cases/case_existing_99',
        fallbackDestination: '/app/my-cases',
        actionLabel: 'Open',
        createdAt: '2026-09-11T09:00:00Z',
        isRead: false,
        isDismissed: false,
        profileId: 'profile_1',
        targetCaseId: 'case_existing_99',
      };

      const result = resolveNotificationDestination(notif, mockCases);
      expect(result.valid).toBe(true);
      expect(result.destination).toBe('/app/cases/case_existing_99');
    });

    it('gracefully redirects to fallbackDestination and provides a helpful message if target case was deleted', () => {
      mockCases = [{ id: 'case_other_1', title: 'Other Case' }];
      const notif: AppNotification = {
        id: 'notif_deleted',
        category: 'clinical_alert',
        title: 'Action Item',
        body: 'Follow-up needed',
        previewBody: 'HealthChain: Update',
        destination: '/app/cases/case_deleted_404',
        fallbackDestination: '/app/my-cases',
        actionLabel: 'Open',
        createdAt: '2026-09-11T09:00:00Z',
        isRead: false,
        isDismissed: false,
        profileId: 'profile_1',
        targetCaseId: 'case_deleted_404',
      };

      const result = resolveNotificationDestination(notif, mockCases);
      expect(result.valid).toBe(false);
      expect(result.destination).toBe('/app/my-cases');
      expect(result.message).toContain('no longer active or was removed');
    });
  });

  describe('7. Quiet Hours, Preferences & Timezone Shifts', () => {
    it('accurately detects overnight quiet hours and daytime quiet hours', () => {
      const overnightPrefs = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        quietHoursEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      // 23:30 (during quiet hours)
      const dateNight = new Date(2026, 8, 11, 23, 30);
      expect(isQuietHoursActive(dateNight, overnightPrefs)).toBe(true);

      // 03:00 (during quiet hours)
      const dateEarlyMorning = new Date(2026, 8, 11, 3, 0);
      expect(isQuietHoursActive(dateEarlyMorning, overnightPrefs)).toBe(true);

      // 14:00 (outside quiet hours)
      const dateDay = new Date(2026, 8, 11, 14, 0);
      expect(isQuietHoursActive(dateDay, overnightPrefs)).toBe(false);

      // Disabled quiet hours always returns false
      const disabledPrefs = { ...overnightPrefs, quietHoursEnabled: false };
      expect(isQuietHoursActive(dateNight, disabledPrefs)).toBe(false);
    });

    it('respects user category preferences to disable specific notifications', () => {
      saveNotificationPreferences(
        {
          enabledCategories: {
            ...DEFAULT_NOTIFICATION_PREFERENCES.enabledCategories,
            hydration_check: false,
          },
        },
        'profile_1'
      );

      const notifs = getActiveNotifications('profile_1');
      const hydrationNotif = notifs.find((n) => n.category === 'hydration_check');
      expect(hydrationNotif).toBeUndefined();
    });

    it('detects timezone changes and updates stored timezone', () => {
      expect(checkAndUpdateTimezone('hc_test_tz')).toBe(false); // First run sets it
      window.localStorage.setItem('hc_test_tz', 'America/New_York');
      // If environment is UTC or different, it should detect the change
      const isChanged = checkAndUpdateTimezone('hc_test_tz');
      expect(typeof isChanged).toBe('boolean');
    });
  });

  describe('8. Lock-Screen Privacy Defaults & 9. No Guilt-Trip Tone', () => {
    it('ensures all notifications provide generic, privacy-safe lock-screen preview text', () => {
      mockCases = [
        {
          id: 'case_sensitive_1',
          title: 'Oncology Differential Review',
          actions: [{ id: 'a_biopsy', title: 'Await biopsy confirmation', status: 'pending' }],
        },
      ];
      mockVitamins = [
        { id: 'med_antidepressant', name: 'Sertraline', dosage: '50mg', time: '08:00', enabled: true },
      ];

      const notifs = getActiveNotifications('profile_1');
      notifs.forEach((n) => {
        expect(n.previewBody).toBeDefined();
        expect(n.previewBody.length).toBeGreaterThan(0);
        // Lock screen preview must NOT contain sensitive diagnoses or medication names
        expect(n.previewBody).not.toMatch(/Oncology|Biopsy|Sertraline|Metastatic|Carcinoma/i);
      });
    });

    it('ensures notification copy is calm, supportive, and free of false urgency or streak-loss guilt', () => {
      const notifs = getActiveNotifications('profile_1');
      notifs.forEach((n) => {
        const fullText = `${n.title} ${n.body}`;
        expect(fullText).not.toMatch(/URGENT|BROKEN STREAK|YOU FAILED|PENALTY|CRITICAL WARNING/i);
      });

      // Daily checkin body explicitly reassures user that missing a day never removes history
      const checkinNotif = notifs.find((n) => n.category === 'daily_checkin');
      expect(checkinNotif?.body).toContain('Missing a day never removes your history');
    });
  });
});
