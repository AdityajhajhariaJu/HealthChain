import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, CheckCircle2, Clock, Droplets, BriefcaseBusiness, 
  HeartPulse, Sparkles, ArrowRight, Plus, BellRing, Send, Check,
  Pill, Moon, CheckCheck, Info, ShieldCheck, Inbox, AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTodayCheckin, recordDailyCheckin } from '../../services/ProfileEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';
import DailySymptomCheckinWidget from '../../features/dashboard/DailySymptomCheckinWidget';
import { triggerHapticLight, triggerHapticMedium, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useToast } from '../ui/ToastProvider';
import { 
  isDailyReminderEnabled, 
  getDailyReminderTime, 
  setDailyReminderEnabled, 
  setDailyReminderTime, 
  sendTestNotification,
  supportsDailyReminders
} from '../../services/DailyCheckinNotificationService';
import {
  AppNotification,
  NotificationCategory,
  getActiveNotifications,
  markNotificationAsRead,
  markNotificationAsDismissed,
  markAllNotificationsAsRead,
  resolveNotificationDestination,
  getWaterGlassesForDate,
  setWaterGlassesForDate,
  getNotificationPreferences,
  saveNotificationPreferences,
  getActiveProfileId
} from '../../services/NotificationEngine';

const REMINDER_PRESETS = [
  { label: '9:00 AM (Morning)', value: '09:00' },
  { label: '1:00 PM (Midday)', value: '13:00' },
  { label: '8:00 PM (Evening)', value: '20:00' },
];

const QUICK_SEVERITIES = [
  { label: 'None', desc: 'Zero', score: 0, color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  { label: 'Mild', desc: 'Slight', score: 1, color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  { label: 'Moderate', desc: 'Noticeable', score: 2, color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { label: 'Severe', desc: 'Intense', score: 3, color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
];

function formatReminderTime(t: string): string {
  try {
    const parts = t.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  } catch {
    return t;
  }
}

function getCategoryConfig(category: NotificationCategory) {
  switch (category) {
    case 'clinical_alert':
      return {
        label: 'Clinical Alert',
        icon: BriefcaseBusiness,
        color: '#2563EB',
        bg: '#EFF6FF',
        border: '#BFDBFE',
      };
    case 'appointment_prep':
      return {
        label: 'Appointment Prep',
        icon: Sparkles,
        color: '#7C3AED',
        bg: '#F5F3FF',
        border: '#DDD6FE',
      };
    case 'medication_reminder':
      return {
        label: 'Medication',
        icon: Pill,
        color: '#D97706',
        bg: '#FEF3C7',
        border: '#FDE68A',
      };
    case 'daily_checkin':
      return {
        label: 'Care Rhythm',
        icon: HeartPulse,
        color: '#059669',
        bg: '#ECFDF5',
        border: '#A7F3D0',
      };
    case 'hydration_check':
      return {
        label: 'Hydration',
        icon: Droplets,
        color: '#0284C7',
        bg: '#E0F2FE',
        border: '#BAE6FD',
      };
    case 'system_info':
    default:
      return {
        label: 'System Update',
        icon: Bell,
        color: '#475569',
        bg: '#F1F5F9',
        border: '#CBD5E1',
      };
  }
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [todayCheckin, setTodayCheckin] = useState<any>(null);
  const [activeCase, setActiveCase] = useState<any>(null);
  const [waterGlasses, setWaterGlasses] = useState<number>(0);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(isDailyReminderEnabled());
  const [reminderTime, setReminderTime] = useState<string>(getDailyReminderTime());
  const [testAlertStatus, setTestAlertStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [isSavingReminder, setIsSavingReminder] = useState<boolean>(false);
  const [reminderError, setReminderError] = useState('');
  const [showDetailedWidget, setShowDetailedWidget] = useState<boolean>(false);

  // Active notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'rhythm'>('all');

  // Quiet hours state
  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(false);
  const [quietHoursStart, setQuietHoursStart] = useState<string>('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState<string>('07:00');

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = () => {
    try {
      const pId = getActiveProfileId();
      setTodayCheckin(getTodayCheckin());
      setActiveCase(getUnifiedCaseScope().caseItem);
      
      // Verified profile-isolated hydration read
      setWaterGlasses(getWaterGlassesForDate(todayStr, pId));

      setReminderEnabled(isDailyReminderEnabled());
      setReminderTime(getDailyReminderTime());

      // Fetch classified notifications
      const activeList = getActiveNotifications(pId);
      setNotifications(activeList);

      // Load quiet hours preferences
      const prefs = getNotificationPreferences(pId);
      setQuietHoursEnabled(prefs.quietHoursEnabled);
      setQuietHoursStart(prefs.quietHoursStart);
      setQuietHoursEnd(prefs.quietHoursEnd);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, todayStr]);

  useEffect(() => {
    const handleReminderUpdated = (e: any) => {
      if (e.detail) {
        setReminderEnabled(e.detail.enabled);
        setReminderTime(e.detail.time);
      }
    };
    const handleCheckinCompleted = () => {
      loadData();
    };
    const handleNotificationsUpdated = () => {
      loadData();
    };
    const handleWaterUpdated = () => {
      setWaterGlasses(getWaterGlassesForDate(todayStr, getActiveProfileId()));
    };

    window.addEventListener('hc_reminder_updated', handleReminderUpdated);
    window.addEventListener('hc_daily_checkin_completed', handleCheckinCompleted);
    window.addEventListener('hc_notifications_updated', handleNotificationsUpdated);
    window.addEventListener('hc_water_updated', handleWaterUpdated);
    window.addEventListener('hc_profile_updated', loadData);
    window.addEventListener('hc_cases_updated', loadData);

    return () => {
      window.removeEventListener('hc_reminder_updated', handleReminderUpdated);
      window.removeEventListener('hc_daily_checkin_completed', handleCheckinCompleted);
      window.removeEventListener('hc_notifications_updated', handleNotificationsUpdated);
      window.removeEventListener('hc_water_updated', handleWaterUpdated);
      window.removeEventListener('hc_profile_updated', loadData);
      window.removeEventListener('hc_cases_updated', loadData);
    };
  }, [todayStr]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleAddWater = () => {
    triggerHapticLight();
    const next = waterGlasses + 1;
    setWaterGlasses(next);
    // Verified profile-isolated hydration write
    setWaterGlassesForDate(todayStr, next);
    if (next === 4 || next === 8) {
      awardPoints(5, 'Hydration Target Milestone 💧', 'lifestyle');
    }
  };

  const handleNavigate = (route: string) => {
    triggerHapticMedium();
    onClose();
    navigate(route);
  };

  const handleNotificationClick = (item: AppNotification) => {
    triggerHapticMedium();
    markNotificationAsRead(item.id);
    const resolved = resolveNotificationDestination(item);
    if (!resolved.valid) {
      toast('Case Unavailable', resolved.message || 'Redirecting to your cases.', 'info');
    }
    onClose();
    navigate(resolved.destination);
  };

  const handleDismissNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHapticLight();
    markNotificationAsDismissed(id);
    loadData();
  };

  const handleMarkAllRead = () => {
    triggerHapticSuccess();
    markAllNotificationsAsRead();
    loadData();
  };

  const handleToggleQuietHours = (enabled: boolean) => {
    triggerHapticLight();
    setQuietHoursEnabled(enabled);
    saveNotificationPreferences({ quietHoursEnabled: enabled });
  };

  const handleUpdateQuietHours = (start: string, end: string) => {
    setQuietHoursStart(start);
    setQuietHoursEnd(end);
    saveNotificationPreferences({ quietHoursStart: start, quietHoursEnd: end });
  };

  const handleQuickLog = (sevItem: typeof QUICK_SEVERITIES[0]) => {
    triggerHapticSuccess();
    try {
      const entry = recordDailyCheckin({
        symptom: 'General Wellbeing',
        severity: sevItem.label,
        score: sevItem.score,
        note: `Quick 1-tap check-in via Health Alerts drawer (${sevItem.label})`,
        lifestyle: {},
      });
      awardPoints(2, 'Daily Check-in (1-Tap Alert)', 'checkin', `checkin_${todayStr}`);
      markNotificationAsRead(`checkin_${todayStr}`);
      setTodayCheckin(entry);
      window.dispatchEvent(new CustomEvent('hc_daily_checkin_completed', { detail: entry }));
      window.dispatchEvent(new Event('hc_profile_updated'));
      loadData();
    } catch (err) {
      console.error('Failed to quick log check-in:', err);
    }
  };

  const handleToggleReminder = async (enabled: boolean) => {
    triggerHapticMedium();
    setIsSavingReminder(true);
    setReminderError('');
    try {
      const ok = await setDailyReminderEnabled(enabled);
      setReminderEnabled(isDailyReminderEnabled());
      if (!ok) setReminderError(!enabled
        ? 'The reminder could not be cancelled. Please try again or manage HealthChain notifications in device settings.'
        : supportsDailyReminders()
        ? 'The reminder could not be enabled. Check notification permissions and try again.'
        : 'Scheduled reminders are available in the mobile app. This browser cannot deliver a daily reminder when HealthChain is closed.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleSelectReminderTime = async (time: string) => {
    triggerHapticLight();
    setIsSavingReminder(true);
    setReminderError('');
    try {
      const ok = await setDailyReminderTime(time);
      setReminderTime(getDailyReminderTime());
      setReminderEnabled(isDailyReminderEnabled());
      if (!ok) setReminderError('The new time could not be scheduled. Check the time and notification permissions, then enable the reminder again.');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingReminder(false);
    }
  };

  const handleTestNotification = async () => {
    triggerHapticMedium();
    setTestAlertStatus('sending');
    try {
      const ok = await sendTestNotification();
      setTestAlertStatus(ok ? 'sent' : 'error');
      setTimeout(() => setTestAlertStatus('idle'), 3500);
    } catch (e) {
      console.error(e);
      setTestAlertStatus('error');
      setTimeout(() => setTestAlertStatus('idle'), 3500);
    }
  };

  if (!isOpen) return null;

  const pendingActionsCount = (activeCase?.actions || []).filter((a: any) => a.status !== 'completed').length;
  const isCheckinPending = !todayCheckin;

  // Filter notifications based on active tab
  const undismissedNotifications = notifications.filter((n) => !n.isDismissed);
  const unreadCount = undismissedNotifications.filter((n) => !n.isRead).length;

  const displayedNotifications = undismissedNotifications.filter((n) => {
    if (activeFilter === 'unread') return !n.isRead;
    return true;
  });

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: isMobile ? 'flex-end' : 'stretch',
        }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Daily Notifications and Care Reminders"
          initial={isMobile ? { y: '100%' } : { x: '100%' }}
          animate={isMobile ? { y: 0 } : { x: 0 }}
          exit={isMobile ? { y: '100%' } : { x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            width: isMobile ? '100%' : '440px',
            maxHeight: isMobile ? '90vh' : '100vh',
            height: isMobile ? 'auto' : '100%',
            borderRadius: isMobile ? '24px 24px 0 0' : '0',
            boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <Bell size={20} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                    Health Alerts & Pulse
                  </h3>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: '#EF4444',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '1px 6px',
                        borderRadius: '999px',
                        lineHeight: 1.3,
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                  Active context & daily actions
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#0F766E',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck size={14} />
                  <span>Mark Read</span>
                </button>
              )}
              <button
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
                aria-label="Close notifications"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Segmented Filter Bar */}
          <div
            style={{
              padding: '8px 20px',
              background: '#F8FAFC',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              gap: '6px',
            }}
          >
            {[
              { key: 'all', label: `All Alerts (${undismissedNotifications.length})` },
              { key: 'unread', label: `Unread (${unreadCount})` },
              { key: 'rhythm', label: 'Care Rhythm' },
            ].map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    triggerHapticLight();
                    setActiveFilter(tab.key as any);
                  }}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: active ? 700 : 500,
                    background: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#0F172A' : '#64748B',
                    border: active ? '1px solid #CBD5E1' : '1px solid transparent',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Scrollable Body */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {/* SECTION A: Classified Notifications Feed (Shown for 'all' and 'unread' tabs) */}
            {activeFilter !== 'rhythm' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Active Health Alerts
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>
                    {displayedNotifications.length} items
                  </span>
                </div>

                {displayedNotifications.length === 0 ? (
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '14px',
                      padding: '24px 16px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: '#ECFDF5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669',
                      }}
                    >
                      <CheckCircle2 size={20} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      All Caught Up!
                    </span>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748B', maxWidth: '280px', lineHeight: 1.4 }}>
                      No active alerts pending. Your case context, medications, and wellness rhythm are up to date.
                    </p>
                  </div>
                ) : (
                  displayedNotifications.map((notif) => {
                    const cfg = getCategoryConfig(notif.category);
                    const IconComp = cfg.icon;

                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          background: notif.isRead ? '#FFFFFF' : '#F8FAFC',
                          border: notif.isRead ? '1px solid #E2E8F0' : `1.5px solid ${cfg.border}`,
                          borderRadius: '14px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          position: 'relative',
                          boxShadow: notif.isRead ? 'none' : '0 2px 8px rgba(0,0,0,0.03)',
                          transition: 'background 0.15s ease, border-color 0.15s ease',
                        }}
                      >
                        {/* Top row: Category Badge, Timestamp, Unread Indicator, Dismiss Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                                padding: '2px 7px',
                                borderRadius: '6px',
                                background: cfg.bg,
                                color: cfg.color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <IconComp size={11} />
                              {cfg.label}
                            </span>
                            {!notif.isRead && (
                              <span
                                style={{
                                  width: '7px',
                                  height: '7px',
                                  borderRadius: '50%',
                                  background: '#F59E0B',
                                  display: 'inline-block',
                                }}
                                title="Unread"
                              />
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={(e) => handleDismissNotification(e, notif.id)}
                              title="Dismiss"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              aria-label={`Dismiss notification: ${notif.title}`}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Middle: Title & Body */}
                        <div>
                          <h4 style={{ margin: '0 0 3px', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                            {notif.title}
                          </h4>
                          <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                            {notif.body}
                          </p>
                        </div>

                        {/* Bottom: Action Button */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '2px' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: cfg.color,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {notif.actionLabel || 'View'} <ArrowRight size={12} />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}

            {/* SECTION B: Daily Care Rhythm Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: activeFilter !== 'rhythm' ? '8px' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Daily Care Rhythm
                </span>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                  24/7 Context Engine
                </span>
              </div>

              {/* 1. Daily Symptom Check-in Card */}
              <div
                style={{
                  border: isCheckinPending ? '1.5px solid #FCD34D' : '1.5px solid #A7F3D0',
                  background: isCheckinPending ? '#FFFBEB' : '#F0FDF4',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                  position: 'relative',
                }}
              >
                {/* Header Status & Everyday Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isCheckinPending ? '#FEF3C7' : '#DCFCE7',
                      color: isCheckinPending ? '#B45309' : '#15803D',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {isCheckinPending ? '⚡ Action Available · +2 PTS' : '✓ Completed Today · +2 PTS'}
                  </span>

                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: reminderEnabled ? '#ECFDF5' : '#F1F5F9',
                      border: `1px solid ${reminderEnabled ? '#A7F3D0' : '#CBD5E1'}`,
                      color: reminderEnabled ? '#059669' : '#64748B',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <BellRing size={11} />
                    <span>{reminderEnabled ? `Everyday: ${formatReminderTime(reminderTime)}` : 'Alerts Paused'}</span>
                  </div>
                </div>

                {/* Title and description */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isCheckinPending ? '#FDE68A' : '#BBF7D0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isCheckinPending ? '#B45309' : '#15803D',
                    }}
                  >
                    {isCheckinPending ? <HeartPulse size={19} /> : <CheckCircle2 size={19} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      {isCheckinPending ? 'Daily Symptom & Energy Check-in' : "Today's Check-in Logged"}
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                      {isCheckinPending
                        ? "Log symptoms and energy when convenient to keep your health rhythm up to date. Missing a day never removes your history."
                        : `Recorded: ${todayCheckin?.symptom || 'General wellbeing'} (${todayCheckin?.severity || 'Normal'}). Your case context is up to date.`}
                    </p>
                  </div>
                </div>

                {/* Quick 1-Tap Log if Pending */}
                {isCheckinPending && (
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #FDE68A',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#78350F', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        1-Tap Quick Fill:
                      </span>
                      <button
                        onClick={() => {
                          triggerHapticLight();
                          setShowDetailedWidget(!showDetailedWidget);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#D97706',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          padding: 0,
                        }}
                      >
                        {showDetailedWidget ? 'Simple View ▲' : 'Detailed Log ▾'}
                      </button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {QUICK_SEVERITIES.map((sev) => (
                        <button
                          key={sev.label}
                          onClick={() => handleQuickLog(sev)}
                          title={`Quick check-in as ${sev.label}`}
                          style={{
                            background: sev.bg,
                            border: `1px solid ${sev.border}`,
                            borderRadius: '8px',
                            padding: '6px 4px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '2px',
                            cursor: 'pointer',
                            transition: 'transform 0.1s ease',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 800, color: sev.color }}>
                            {sev.label}
                          </span>
                          <span style={{ fontSize: '10px', color: '#64748B', fontWeight: 500 }}>
                            +{sev.score === 0 ? '2 pts' : `${sev.score}`}
                          </span>
                        </button>
                      ))}
                    </div>

                    {showDetailedWidget && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #FDE68A' }}>
                        <DailySymptomCheckinWidget
                          hideAlertsShortcut={true}
                          onCheckinComplete={(entry) => {
                            setTodayCheckin(entry);
                            setShowDetailedWidget(false);
                            loadData();
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {!isCheckinPending && (
                  <div style={{ marginBottom: '12px' }}>
                    <button
                      onClick={() => {
                        triggerHapticLight();
                        setShowDetailedWidget(!showDetailedWidget);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        background: '#16A34A',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {showDetailedWidget ? 'Hide 7-Day Rhythm ▲' : 'View 7-Day Rhythm & Log ▾'}
                    </button>
                    {showDetailedWidget && (
                      <div style={{ marginTop: '12px' }}>
                        <DailySymptomCheckinWidget
                          hideAlertsShortcut={true}
                          onCheckinComplete={(entry) => {
                            setTodayCheckin(entry);
                            loadData();
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Everyday Recurring Notification Settings Box */}
                <div
                  style={{
                    borderTop: isCheckinPending ? '1px dashed #FCD34D' : '1px dashed #86EFAC',
                    paddingTop: '12px',
                    marginTop: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Bell size={13} color="#0F172A" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                        Everyday Reminder
                      </span>
                    </div>

                    {/* Toggle Switch */}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: reminderEnabled ? '#059669' : '#64748B' }}>
                        {reminderEnabled ? 'Enabled' : 'Off'}
                      </span>
                      <input
                        type="checkbox"
                        checked={reminderEnabled}
                        onChange={(e) => handleToggleReminder(e.target.checked)}
                        disabled={isSavingReminder}
                        aria-label="Toggle everyday daily check-in reminder"
                        style={{ display: 'none' }}
                      />
                      <div
                        style={{
                          width: '38px',
                          height: '20px',
                          background: reminderEnabled ? '#10B981' : '#CBD5E1',
                          borderRadius: '999px',
                          position: 'relative',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            background: '#FFFFFF',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '2px',
                            left: reminderEnabled ? '20px' : '2px',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                          }}
                        />
                      </div>
                    </label>
                  </div>

                  <p style={{ margin: '0 0 10px', fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>
                    HealthChain sends a daily reminder to this device. Lock-screen previews are privacy-safe.
                  </p>

                  {reminderError && <p role="alert" style={{ fontSize: '12px', color: '#9F1239', lineHeight: 1.5 }}>{reminderError}</p>}
                  {reminderEnabled && (
                    <div>
                      {/* Presets and Custom Time Selector */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                        {REMINDER_PRESETS.map((preset) => {
                          const isSelected = reminderTime === preset.value;
                          return (
                            <button
                              key={preset.value}
                              onClick={() => handleSelectReminderTime(preset.value)}
                              disabled={isSavingReminder}
                              style={{
                                padding: '5px 9px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: isSelected ? 700 : 500,
                                background: isSelected ? '#0F172A' : '#FFFFFF',
                                color: isSelected ? '#FFFFFF' : '#334155',
                                border: isSelected ? '1px solid #0F172A' : '1px solid #CBD5E1',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {preset.label}
                            </button>
                          );
                        })}

                        {/* Custom Time Picker */}
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '7px',
                            padding: '3px 8px',
                          }}
                        >
                          <Clock size={11} color="#64748B" />
                          <input
                            type="time"
                            value={reminderTime}
                            onChange={(e) => handleSelectReminderTime(e.target.value)}
                            aria-label="Custom everyday reminder time"
                            style={{
                              border: 'none',
                              outline: 'none',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#0F172A',
                              background: 'transparent',
                              cursor: 'pointer',
                            }}
                          />
                        </div>
                      </div>

                      {/* Test alert trigger button */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <button
                          onClick={handleTestNotification}
                          disabled={testAlertStatus === 'sending'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#334155',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: testAlertStatus === 'sending' ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          }}
                        >
                          {testAlertStatus === 'sent' ? (
                            <>
                              <Check size={12} color="#059669" />
                              <span style={{ color: '#059669', fontWeight: 700 }}>Alert Dispatched!</span>
                            </>
                          ) : (
                            <>
                              <Send size={11} />
                              <span>{testAlertStatus === 'sending' ? 'Sending...' : 'Send Test Alert'}</span>
                            </>
                          )}
                        </button>

                        <span style={{ fontSize: '10.5px', color: '#64748B' }}>
                          {testAlertStatus === 'sent' ? 'Check your notifications bar' : 'Repeats everyday'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Quiet Hours Settings Subsection */}
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Moon size={13} color="#64748B" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                          Quiet Hours
                        </span>
                      </div>
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <span style={{ fontSize: '11px', color: quietHoursEnabled ? '#059669' : '#64748B', fontWeight: 600 }}>
                          {quietHoursEnabled ? 'Active' : 'Off'}
                        </span>
                        <input
                          type="checkbox"
                          checked={quietHoursEnabled}
                          onChange={(e) => handleToggleQuietHours(e.target.checked)}
                          style={{ display: 'none' }}
                          aria-label="Toggle quiet hours"
                        />
                        <div
                          style={{
                            width: '32px',
                            height: '18px',
                            background: quietHoursEnabled ? '#10B981' : '#CBD5E1',
                            borderRadius: '999px',
                            position: 'relative',
                            transition: 'background 0.2s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              background: '#FFFFFF',
                              borderRadius: '50%',
                              position: 'absolute',
                              top: '2px',
                              left: quietHoursEnabled ? '16px' : '2px',
                              transition: 'left 0.2s ease',
                            }}
                          />
                        </div>
                      </label>
                    </div>
                    {quietHoursEnabled && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>Suppress non-urgent alerts from:</span>
                        <input
                          type="time"
                          value={quietHoursStart}
                          onChange={(e) => handleUpdateQuietHours(e.target.value, quietHoursEnd)}
                          style={{
                            fontSize: '11px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '2px 4px',
                            color: '#0F172A',
                          }}
                          aria-label="Quiet hours start time"
                        />
                        <span style={{ fontSize: '11px', color: '#64748B' }}>to</span>
                        <input
                          type="time"
                          value={quietHoursEnd}
                          onChange={(e) => handleUpdateQuietHours(quietHoursStart, e.target.value)}
                          style={{
                            fontSize: '11px',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '2px 4px',
                            color: '#0F172A',
                          }}
                          aria-label="Quiet hours end time"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Active Case Context Card */}
              <div
                style={{
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: activeCase ? '#EFF6FF' : '#F1F5F9',
                      color: activeCase ? '#2563EB' : '#64748B',
                    }}
                  >
                    {activeCase ? 'Active Clinical Case' : 'Clinical Focus'}
                  </span>
                  <BriefcaseBusiness size={14} color={activeCase ? '#2563EB' : '#64748B'} />
                </div>

                {activeCase ? (
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      {activeCase.title}
                    </h4>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                      {(activeCase.medicalRecords || []).length} medical records · {pendingActionsCount} pending actions
                    </p>
                    <button
                      onClick={() => handleNavigate('/app/cases/' + activeCase.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        background: '#F1F5F9',
                        color: '#0F172A',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: '1px solid #CBD5E1',
                        cursor: 'pointer',
                      }}
                    >
                      Open Case File <ArrowRight size={13} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                      No Active Case in Focus
                    </h4>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#64748B', lineHeight: 1.4 }}>
                      Structure your complex symptoms and lab reports into an integrated multi-specialist file.
                    </p>
                    <button
                      onClick={() => handleNavigate('/app/consult?new=true')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        background: '#0F8B7E',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Start Quick Consult <ArrowRight size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* 3. Cellular Hydration Pulse (Verified Profile-Isolated) */}
              <div
                style={{
                  border: '1px solid #BAE6FD',
                  background: '#F0F9FF',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#E0F2FE',
                      color: '#0284C7',
                    }}
                  >
                    Hydration Target · {waterGlasses}/8 Glasses
                  </span>
                  <Droplets size={14} color="#0284C7" />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div
                    style={{
                      height: '6px',
                      width: '100%',
                      background: '#BAE6FD',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: Math.min(100, (waterGlasses / 8) * 100) + '%',
                        background: 'linear-gradient(90deg, #38BDF8, #0284C7)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#0369A1', fontWeight: 600 }}>
                    {waterGlasses >= 8 ? 'Daily hydration goal reached! 🎉' : (8 - waterGlasses) + ' glasses remaining today'}
                  </span>
                  <button
                    onClick={handleAddWater}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: '6px',
                      background: '#0284C7',
                      color: '#FFFFFF',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} /> +1 Glass
                  </button>
                </div>
              </div>

              {/* 4. Ava Medical Buddy Card */}
              <div
                style={{
                  border: '1px solid #FBCFE8',
                  background: '#FDF2F8',
                  borderRadius: '16px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#FCE7F3',
                      color: '#BE185D',
                    }}
                  >
                    Ava Clinical Buddy · Available 24/7
                  </span>
                  <Sparkles size={14} color="#BE185D" />
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  Ask questions regarding medication interactions, lab interpretations, or symptom escalations anytime.
                </p>

                <button
                  onClick={() => handleNavigate('/app/ava')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    background: '#BE185D',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Chat with Ava <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 20px',
              borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <ShieldCheck size={14} color="#059669" />
              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                Privacy-guarded lock screen
              </span>
            </div>

            <button
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                padding: '7px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
