import { createPortal } from 'react-dom';
import { addDurableArchiveData, restoreHealthArchive, validateHealthArchive, exportCloudArchive } from '../../services/HealthArchive';
import { MAX_HEALTH_ARCHIVE_BYTES } from '../../services/ArchiveRecoveryValidation';
import { testRemotePush } from '../../services/PushService';
import { Capacitor } from '@capacitor/core';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import { getAllProfiles, getProfileEngineState, verifyProStatus, isProUser } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Star, AlertTriangle, Trash2, X, ShieldCheck, Lock, Trophy, Zap, ChevronRight, Award, Bell, Clock, Send, Check } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import { supabase } from '../../services/supabaseClient';
import { eraseOwnerHealthData, recordConfirmedAccountErasure } from '../../services/AccountErasure';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { cancelAccountNotifications } from '../../services/NotificationCoordinator';
import { unregisterPushDevice } from '../../services/PushService';
import FocusTrap from '../../components/ui/FocusTrap';
import { getActiveSession } from '../../services/authSession';
import UpgradeToProCard from '../../components/ui/UpgradeToProCard';
import { HealthDeviceIntegrations } from '../../components/ui/HealthDeviceIntegrations';
import { getVitalityPoints, getVitalityState, awardPoints, TIERS } from '../../services/VitalityPointsEngine';
import { triggerHapticLight } from '../../services/haptics';
import { getItemSync, setItemSync, removeItemSync } from '../../services/storage';
import {
  isDailyReminderEnabled,
  getDailyReminderTime,
  setDailyReminderEnabled,
  setDailyReminderTime,
  sendTestNotification
} from '../../services/DailyCheckinNotificationService';

const BACKEND_BASE = ((import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/+$/, '')) || '';

const EXPORTABLE_STORAGE_PREFIXES = [
  'hc_unified_profile',
  'hc_cases',
  'hc_diet_profile',
  'hc_active_case',
  'hc_ava_vault',
  'hc_ava_messages',
  'hc_food_logs',
  'hc_hydration',
  'hc_meal_plan',
  'hc_diet_advice',
  'hc_plan',
  'hc_health_memory',
];

export default function Settings() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isPremium, setIsPremium] = useState(isProUser());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [archivePreview,setArchivePreview]=useState<{raw:any;count:number;skipped:number}|null>(null);
  const [restoring,setRestoring]=useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [hapticsEnabled, setHapticsEnabled] = useState(() => getItemSync('hc_haptics_enabled') !== 'false');
  const [isDarkMode, setIsDarkMode] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark-theme'));
  const [points, setPoints] = useState(getVitalityPoints());
  const [vitalityState, setVitalityState] = useState(() => getVitalityState());
  const currentTierBadge = TIERS.find(t => t.name === vitalityState.tier)?.badge || '🥉';
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, success, error: toastError } = useToast();
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(isDailyReminderEnabled());
  const [reminderTime, setReminderTime] = useState<string>(getDailyReminderTime());
  const [testAlertStatus, setTestAlertStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  useEffect(() => {
    const handleReminderUpdated = (e: any) => {
      if (e.detail) {
        setReminderEnabled(e.detail.enabled);
        setReminderTime(e.detail.time);
      }
    };
    window.addEventListener('hc_reminder_updated', handleReminderUpdated);
    return () => window.removeEventListener('hc_reminder_updated', handleReminderUpdated);
  }, []);

  const handleToggleReminder = async (enabled: boolean) => {
    triggerHapticLight();
    setReminderEnabled(enabled);
    await setDailyReminderEnabled(enabled);
    setReminderEnabled(isDailyReminderEnabled());
  };

  const handleSelectReminderTime = async (time: string) => {
    triggerHapticLight();
    setReminderTime(time);
    await setDailyReminderTime(time);
    setReminderTime(getDailyReminderTime());
  };

  const handleTestAlert = async () => {
    triggerHapticLight();
    setTestAlertStatus('sending');
    try {
      const ok = await sendTestNotification();
      setTestAlertStatus(ok ? 'sent' : 'error');
      setTimeout(() => setTestAlertStatus('idle'), 3500);
    } catch {
      setTestAlertStatus('error');
      setTimeout(() => setTestAlertStatus('idle'), 3500);
    }
  };

  useEffect(() => {
    const handlePoints = () => {
      setPoints(getVitalityPoints());
      setVitalityState(getVitalityState());
    };
    window.addEventListener('hc_points_updated', handlePoints);
    return () => window.removeEventListener('hc_points_updated', handlePoints);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getActiveSession().then((session) => {
      if (!cancelled) setIsAuthenticated(Boolean(session));
    });
    return () => { cancelled = true; };
  }, []);

  const accountStr = getItemSync('hc_account');
  let account: any = null;
  try { account = accountStr ? JSON.parse(accountStr) : null; } catch {}
  const storageScope = getItemSync('hc_guest_mode')==='true'?'guest':account?.id || 'guest';
  const scopedExportPrefixes = EXPORTABLE_STORAGE_PREFIXES.map((prefix) => `${prefix}_${storageScope}`);
  const userEmail = account?.email || account?.user?.email || 'No email linked';

  useEffect(() => {
    verifyProStatus().then(setIsPremium).catch(() => {});
    
    const handleProfileUpdate = () => {
      setIsPremium(isProUser());
      setProfiles(getAllProfiles());
      setActiveProfileId(getProfileEngineState().activeId);
    };

    const loadProfiles = () => {
      setProfiles(getAllProfiles());
      setActiveProfileId(getProfileEngineState().activeId);
    };
    loadProfiles();
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('hc_profile_updated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (!showDeleteModal && !showLogoutConfirm) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteModal(false);
        setDeleteConfirmation('');
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal, showLogoutConfirm]);

  const executeLogout = async () => {
    try {
      window.dispatchEvent(new Event('hc_logout'));
    } catch (e) {
      console.error('Logout error:', e);
      navigate('/', { replace: true });
    }
  };

  const handleLogout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { getPendingSyncCount } = await import('../../services/SyncOutbox');
      const pending = await getPendingSyncCount(session.user.id);
      if (pending > 0) {
        setShowLogoutConfirm(true);
        return;
      }
    }
    await executeLogout();
  };


  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);
    const scope = captureAccountScope();
    let remoteDeleted = false;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (scope.accountId === 'guest' || !session?.access_token || session.user.id !== scope.accountId)
        throw new Error('Sign in again before deleting your account. No deletion has been performed.');
      if (!isAccountScopeCurrent(scope)) throw new Error('Account changed. Open deletion from the intended account.');
      if (session?.user?.id) {
        const deleteController = new AbortController();
        const deleteTimeout = setTimeout(() => deleteController.abort(), 15000);

        const response = await fetch(`${BACKEND_BASE}/api/delete-account`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session?.access_token}` },
          signal: deleteController.signal
        }).finally(() => clearTimeout(deleteTimeout));

        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.success) {
          throw new Error(body.error || 'The secure deletion service could not complete the request. Your data was not cleared locally.');
        }
        remoteDeleted = true;
        // Device alarms must be cancelled before invalidating the erased scope.
        if (isAccountScopeCurrent(scope)) {
          await cancelAccountNotifications().catch(() => {});
          await unregisterPushDevice(scope).catch(() => {});
        }
        await recordConfirmedAccountErasure(session.user.id);
        await eraseOwnerHealthData(session.user.id);
      }
      if (captureAccountScope().accountId !== scope.accountId) {
        success('Account deleted', 'The requested account was deleted. Your current account was left open.');
        setIsDeleting(false);
        return;
      }
      try { sessionStorage.clear(); } catch {}
      window.dispatchEvent(new CustomEvent('hc_logout', { detail: { accountDeleted: true, ownerId: scope.accountId } }));
      await supabase.auth.signOut();
      if (captureAccountScope().accountId !== scope.accountId) return;
      for (const key of ['hc_account', 'hc_guest_mode', 'hc_user_email']) removeItemSync(key);
      success('Health data removed', 'Your HealthChain account and user-owned data have been permanently deleted.');
      navigate('/');
    } catch (err: any) {
      toastError('Error deleting account', err.message);
      if (remoteDeleted && captureAccountScope().accountId === scope.accountId) {
        window.dispatchEvent(new CustomEvent('hc_logout', { detail: { accountDeleted: true, ownerId: scope.accountId } }));
        for (const key of ['hc_account', 'hc_guest_mode', 'hc_user_email']) removeItemSync(key);
        await supabase.auth.signOut().catch(() => {});
        navigate('/');
      }
      setIsDeleting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFAFA 40%, #FFF7F8 100%)',
      paddingBottom: '60px',
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: isMobile ? '0 12px' : '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--teal-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--teal)',
          }}
        >
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1
            style={{
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 700,
              color: 'var(--text-main)',
              margin: '0 0 4px 0',
            }}
          >
            Settings
          </h1>
        </div>
      </div>



      <div className="card" style={{ padding: '20px', background: '#FFFFFF', border: '1px solid #F1E5E7' }}>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '24px',
          }}
        >
          Preferences
        </h2>

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 0,
            padding: '16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Caregiver Mode
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Manage health profiles for dependents.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', border: '1px solid #F1E5E7', borderRadius: '8px', background: '#FFFAFA', color: '#64748B', fontSize: '13px' }} aria-label="Caregiver Mode temporarily locked">
            <User size={16} />
            <span>Temporarily locked</span>
          </div>
        </div>

        {/* Premium Section */}
        <UpgradeToProCard isPro={isPremium} style={{ marginBottom: '16px' }} />

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 0,
            padding: '16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Dark Mode (X-Ray)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              High-contrast radiology theme.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              aria-label="Dark Mode high-contrast radiology theme"
              style={{ display: 'none' }}
              checked={isDarkMode}
              onChange={(e) => {
                triggerHapticLight();
                const isDark = e.target.checked;
                setIsDarkMode(isDark);
                if (isDark) {
                  document.documentElement.classList.add('dark-theme');
                  setItemSync('hc_theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark-theme');
                  setItemSync('hc_theme', 'light');
                }
              }}
            />
            <div
              style={{
                width: '44px',
                height: '24px',
                background: isDarkMode ? '#10B981' : '#E2E8F0',
                borderRadius: '999px',
                position: 'relative',
                transition: 'background 0.3s ease',
              }}
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  background: '#FFF',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: isDarkMode ? '22px' : '2px',
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </label>
        </div>

          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              justifyContent: 'space-between',
              gap: isMobile ? 12 : 0,
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              marginBottom: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                Haptic Feedback
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Subtle vibrations for a premium tactile feel.
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                aria-label="Subtle vibrations haptic feedback"
                style={{ display: 'none' }}
                checked={hapticsEnabled}
                onChange={(e) => {
                  const isEnabled = e.target.checked;
                  if (isEnabled) {
                    removeItemSync('hc_haptics_enabled');
                    setHapticsEnabled(true);
                  } else {
                    setItemSync('hc_haptics_enabled', 'false');
                    setHapticsEnabled(false);
                  }
                }}
              />
              <div
                style={{
                  width: '44px',
                  height: '24px',
                  background: hapticsEnabled ? '#10B981' : '#E2E8F0',
                  borderRadius: '999px',
                  position: 'relative',
                  transition: 'background 0.3s ease',
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    background: '#FFF',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: hapticsEnabled ? '22px' : '2px',
                    transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                />
              </div>
            </label>
          </div>

          {/* Daily Check-in Everyday Reminder Card */}
          <div
            style={{
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'space-between',
                gap: isMobile ? 12 : 0,
                marginBottom: reminderEnabled ? '14px' : '0',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <Bell size={16} color="#059669" />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Daily Check-in Reminder
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  An optional reminder to record symptoms and energy. Missing a day never removes progress.
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  aria-label="Daily Check-in everyday notification reminder"
                  style={{ display: 'none' }}
                  checked={reminderEnabled}
                  onChange={(e) => handleToggleReminder(e.target.checked)}
                />
                <div
                  style={{
                    width: '44px',
                    height: '24px',
                    background: reminderEnabled ? '#10B981' : '#E2E8F0',
                    borderRadius: '999px',
                    position: 'relative',
                    transition: 'background 0.3s ease',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      background: '#FFF',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '2px',
                      left: reminderEnabled ? '22px' : '2px',
                      transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  />
                </div>
              </label>
            </div>

            {reminderEnabled && (
              <div
                style={{
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-main)' }}>
                    Scheduled Everyday At:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      { label: '9:00 AM', val: '09:00' },
                      { label: '1:00 PM', val: '13:00' },
                      { label: '8:00 PM', val: '20:00' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleSelectReminderTime(p.val)}
                        style={{
                          padding: '8px 14px',
                          minHeight: '44px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: reminderTime === p.val ? 700 : 500,
                          background: reminderTime === p.val ? 'var(--text-main)' : 'transparent',
                          color: reminderTime === p.val ? 'var(--bg)' : 'var(--text-muted)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {p.label}
                      </button>
                    ))}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        minHeight: '44px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <Clock size={14} color="var(--text-muted)" />
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={(e) => handleSelectReminderTime(e.target.value)}
                        aria-label="Custom daily check-in time"
                        style={{
                          border: 'none',
                          outline: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          background: 'transparent',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={handleTestAlert}
                    disabled={testAlertStatus === 'sending'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 12px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: '1px solid var(--border)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text-main)',
                      cursor: testAlertStatus === 'sending' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {testAlertStatus === 'sent' ? (
                      <>
                        <Check size={13} color="#10B981" />
                        <span style={{ color: '#10B981' }}>Alert Sent!</span>
                      </>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>{testAlertStatus === 'sending' ? 'Sending...' : 'Send Test Alert'}</span>
                      </>
                    )}
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Local device reminder
                  </span>
                </div>
                {Capacitor.isNativePlatform() && <button type="button" className="btn btn-outline" onClick={async () => {
                  try { await testRemotePush(); success('Remote test accepted', 'The provider accepted the test. Confirm receipt on this phone; acceptance does not confirm delivery.'); }
                  catch (error) { toastError('Remote test unavailable', error instanceof Error ? error.message : 'Please try again.'); }
                }} style={{ marginTop: 12 }}>Test remote push connection</button>}
              </div>
            )}
          </div>

        <div style={{ marginTop: '24px' }}>
          <HealthDeviceIntegrations />
        </div>

        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '16px',
            marginTop: '40px',
          }}
        >
          Activity
        </h2>

        <div
          style={{
            padding: '20px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 95, 70, 0.03) 100%)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            marginBottom: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Trophy size={22} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{points} points</span>
                  <span>{currentTierBadge}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Tier: <strong style={{ color: '#059669' }}>{vitalityState.tier}</strong>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                triggerHapticLight();
                window.dispatchEvent(new Event('hc_open_points_modal'));
              }}
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              View Quests
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
            <button
              onClick={() => {
                triggerHapticLight();
                navigate('/app/trophies');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={18} color="#059669" />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Trophy Cabinet</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>

            <button
              onClick={() => {
                triggerHapticLight();
                window.dispatchEvent(new Event('hc_open_points_modal'));
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={18} color="#D97706" />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-main)' }}>Activity history</span>
              </div>
              <ChevronRight size={16} color="var(--text-muted)" />
            </button>
          </div>
        </div>

        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '24px',
            marginTop: '16px',
          }}
        >
          Account
        </h2>

        {isAuthenticated ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'var(--teal)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={20} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
                  {account?.name || profiles.find(p => p.id === activeProfileId)?.demographics?.name || profiles.find(p => p.id === activeProfileId)?.profileName || 'Patient User'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{userEmail}</div>
              </div>
            </div>
            <button className="btn btn-outline" onClick={handleLogout} aria-label="Log out of HealthChain account" style={{ gap: '8px' }}>
              <LogOut size={16} /> Log Out
            </button>
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
              background: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
            }}
          >
            <User size={32} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-main)',
                marginBottom: '8px',
              }}
            >
              You are not logged in
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
              Create an account to save your medical history and access premium features.
            </p>
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', padding: '12px', borderRadius: '8px', marginBottom: '24px', textAlign: 'left' }}>
              <strong style={{ color: '#D97706', fontSize: '14px', display: 'block', marginBottom: '4px' }}>Warning: Guest Mode</strong>
              <span style={{ color: '#B45309', fontSize: '13px' }}>Data is stored locally in this browser. Clearing browser cache or switching devices will erase local records. Create an account to back up data securely.</span>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-navy" onClick={() => navigate('/login')}>
                Log In
              </button>
              <button className="btn btn-primary" onClick={() => navigate('/signup')}>
                Sign Up
              </button>
            </div>
          </div>
        )}

          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-main)',
              marginBottom: '24px',
              marginTop: '40px',
            }}
          >
          Privacy
          </h2>
        
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ShieldCheck size={18} color="var(--teal)" />
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Data use and storage
            </div>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            Your health information is used to provide the features you choose, such as case organization and AI-assisted assessment. Guest-mode information remains in this browser; signed-in information may sync with our service providers. We do not sell personal health information. HealthChain is not a covered healthcare provider, and this product is not presented as HIPAA-certified or GDPR-certified.
          </div>
        </div>

        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '24px',
            marginTop: '16px',
          }}
        >
          Your data
        </h2>
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 0,
            padding: '16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Export Data
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Download profiles, cases, daily logs, settings and original documents as JSON.
            </div>
          </div>
          <button
            className="btn btn-outline"
            onClick={async () => {
              try {
                const allKeys = (() => { try { return Object.keys(localStorage); } catch { return []; } })();
                const exportedData = allKeys.reduce<Record<string, string>>((data, key) => {
                  if (scopedExportPrefixes.some((prefix) => key === prefix || key.startsWith(prefix+'_'))) {
                    const value = getItemSync(key);
                    if (value !== null) data[key] = value;
                  }
                  return data;
                }, {});

                const durable=await addDurableArchiveData(exportedData);
                let cloudData: Record<string, unknown> | null = null;
                if (isAuthenticated) {
                  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                  if (sessionError || !session?.user) {
                    toastError('Export Incomplete', 'Your sign-in session expired. Sign in again before exporting cloud data.');
                    return;
                  }
                  cloudData = await exportCloudArchive(session.user.id);
                }

                const dataStr = JSON.stringify({
                  ...durable,
                  exportedAt: new Date().toISOString(),
                  format: 'healthchain-user-data-v3',
                  scope: cloudData ? 'local-cache-and-supabase-records' : 'local-cache-only',
                  localStorage: exportedData,
                  supabase: cloudData,
                }, null, 2);
                if (new Blob([dataStr]).size > MAX_HEALTH_ARCHIVE_BYTES) throw new Error('Archive exceeds the 160 MB restore limit. Use support-assisted export.');
                const blobUrl = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', blobUrl);
                linkElement.setAttribute('download', 'healthchain_export.json');
                linkElement.click();
                window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                awardPoints(10, 'Exported Patient Health Archive', 'research');
                success('Export Complete', cloudData ? 'Your local cache and cloud records were downloaded (+10 Vitality Points).' : 'Your local data was downloaded (+10 Vitality Points).');
              } catch (err: any) {
                console.error('Export failed:', err);
                toastError('Export Failed', err?.message || 'An error occurred while compiling your health archive.');
              }
            }}
          >
            Export JSON
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 0,
            padding: '16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Import Data
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Restore data from a previously exported JSON file.
            </div>
          </div>
          <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
            Import JSON
            <input 
              type="file" 
              accept=".json" 
              aria-label="Import health record JSON backup file"
              style={{ display: 'none' }} 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if(file.size>MAX_HEALTH_ARCHIVE_BYTES){toastError('Import Failed','Archive exceeds the 160 MB limit.');return;}
                const reader = new FileReader();
                reader.onerror = () => {
                  toastError('Import Failed', 'Failed to read the backup file.');
                };
                reader.onload = async (ev) => {
                  try {
                    const parsed = JSON.parse(ev.target?.result as string);
                    const checked=validateHealthArchive(parsed,scopedExportPrefixes);
                    setArchivePreview({raw:parsed,count:Object.keys(checked.entries).length+Object.keys(checked.indexed).length+Object.keys(checked.originals).length,skipped:checked.skipped});
                  } catch (err:any) {
                    toastError('Import Failed', err?.message || 'Invalid or unverified JSON file.');
                  }
                };
                reader.readAsText(file);
                if (e.target) e.target.value = '';
              }}
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 0,
            padding: '16px',
            background: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>
              Help & User Feedback
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Share feature ideas, report issues, or contact support directly at healthchain360@gmail.com.
            </div>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => navigate('/help')}
          >
            Help & Feedback Center
          </button>
        </div>

        {/* Danger Zone */}
        {isAuthenticated && (
          <>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#EF4444',
                marginBottom: '24px',
                marginTop: '40px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={18} /> Danger Zone
            </h2>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                background: '#FEF2F2',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #FECACA',
              }}
            >
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#B91C1C' }}>
                  Delete Account
                </div>
                <div style={{ fontSize: '13px', color: '#B91C1C', opacity: 0.8 }}>
                  Permanently remove your account and all health data. This cannot be undone.
                </div>
              </div>
              <button
                className="btn"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Trash2 size={16} /> Delete Account
              </button>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
        >
          <FocusTrap isActive={showDeleteModal} onEscape={() => { if (!isDeleting) { setShowDeleteModal(false); setDeleteConfirmation(''); } }}>
            <div
              className="card"
              role="dialog"
              aria-modal="true"
              aria-label="Delete Account Confirmation"
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '24px',
                position: 'relative',
                background: '#FFFFFF',
                border: '1px solid #F1E5E7',
              }}
            >
            <button
              type="button"
              aria-label="Close delete account modal"
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
              }}
            >
              <X size={20} />
            </button>
            
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', margin: '0 0 8px 0' }}>
              Delete Account
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: '1.5' }}>
              This action is permanent and irreversible. All your health profiles, cases, and associated data will be deleted immediately.
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
              To confirm, please type <strong>DELETE</strong> below:
            </p>

            <input
              type="text"
              aria-label="Type DELETE to confirm account deletion"
              placeholder="DELETE"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-hover)',
                marginBottom: '24px',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmation('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  flex: 1,
                  background: '#EF4444',
                  color: 'white',
                  border: 'none',
                  opacity: deleteConfirmation === 'DELETE' && !isDeleting ? 1 : 0.5,
                  cursor: deleteConfirmation === 'DELETE' && !isDeleting ? 'pointer' : 'not-allowed',
                }}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                onClick={handleDeleteAccount}
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
          </FocusTrap>
        </div>
      , document.body)}

      {/* Offline Unsynced Changes Logout Confirmation Modal */}
      {archivePreview && <div style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(15,23,42,.55)',display:'grid',placeItems:'center',padding:16}}>
        <FocusTrap onEscape={()=>{if(!restoring)setArchivePreview(null);}}>
          <div role="dialog" aria-modal="true" aria-label="Review backup restore" style={{background:'white',color:'#0f172a',borderRadius:24,padding:24,maxWidth:480}}>
            <h3>Review backup restore</h3>
            <p>{archivePreview.count} local data stores can be restored. {archivePreview.skipped} unsupported or other-account entries will be skipped.</p>
            {(archivePreview.raw?.supabase || Object.keys(archivePreview.raw?.pendingSync || {}).length > 0) && <p>Unsent changes will be recovered. Missing cloud records will be restored after reconnecting; existing cloud records and deletions are preserved.</p>}
            <p>This replaces matching data on this device. Your current unsent changes will also be kept for synchronization.</p>
            <button className="btn btn-outline" disabled={restoring} onClick={()=>setArchivePreview(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={restoring} onClick={async()=>{
              setRestoring(true);
              try{
                const result=await restoreHealthArchive(archivePreview.raw,scopedExportPrefixes);
                success('Import Complete',result.count+' local data stores restored. Refreshing…');
                setArchivePreview(null);setTimeout(()=>window.location.reload(),1500);
              }catch(error:any){toastError('Import Failed',error.message || 'The backup could not be restored.');}
              finally{setRestoring(false);}
            }}>{restoring?'Restoring…':'Restore backup'}</button>
          </div>
        </FocusTrap>
      </div>}
      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
          onClick={() => setShowLogoutConfirm(false)}
        >
          <FocusTrap>
            <div
              className="card"
              role="dialog"
              aria-modal="true"
              aria-label="Unsynced Offline Changes Confirmation"
              style={{
                maxWidth: '440px',
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '24px',
                padding: '28px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700 }}>
                Unsynced Offline Changes
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
                You have offline consultations or profile updates that have not synced to the cloud yet. Logging out will clear local session storage.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '12px' }}
                  onClick={() => setShowLogoutConfirm(false)}
                >
                  Stay Logged In
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '12px',
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    fontWeight: 650,
                    cursor: 'pointer',
                  }}
                  onClick={async () => {
                    try {
                      setShowLogoutConfirm(false);
                      await executeLogout();
                    } catch (err) {
                      console.error('Logout error:', err);
                    }
                  }}
                >
                  Log Out Anyway
                </button>
              </div>
            </div>
          </FocusTrap>
        </div>
      )}
      </div>
    </div>
  );
}



