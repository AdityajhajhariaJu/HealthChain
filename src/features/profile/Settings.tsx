import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings as SettingsIcon } from 'lucide-react';
import { getAllProfiles, getProfileEngineState, verifyProStatus, isProUser } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Star, AlertTriangle, Trash2, X, ShieldCheck, Lock } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import { supabase } from '../../services/supabaseClient';
import { clearSyncOutbox } from '../../services/SyncOutbox';
import FocusTrap from '../../components/ui/FocusTrap';
import { getActiveSession } from '../../services/authSession';

const EXPORTABLE_STORAGE_PREFIXES = [
  'hc_unified_profile',
  'hc_cases',
  'hc_diet_profile',
  'hc_active_case',
  'hc_ava_vault',
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
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, success, error: toastError } = useToast();

  useEffect(() => {
    let cancelled = false;
    getActiveSession().then((session) => {
      if (!cancelled) setIsAuthenticated(Boolean(session));
    });
    return () => { cancelled = true; };
  }, []);

  const accountStr = localStorage.getItem('hc_account');
  let account: any = null;
  try { account = accountStr ? JSON.parse(accountStr) : null; } catch {}
  const storageScope = account?.id || 'guest';
  const scopedExportPrefixes = EXPORTABLE_STORAGE_PREFIXES.map((prefix) => `${prefix}_${storageScope}`);
  const userEmail = account?.email || account?.user?.email || 'user@example.com';

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

  const handleLogout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const { getPendingSyncCount } = await import('../../services/SyncOutbox');
      const pending = await getPendingSyncCount(session.user.id);
      if (pending > 0) {
        if (!window.confirm('You have offline work that has not been saved to the cloud yet. Logging out will delete it permanently from this device. Are you sure you want to log out?')) {
          return;
        }
      }
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    const theme = localStorage.getItem('hc_theme');
    const consent = localStorage.getItem('hc_consent');
    localStorage.clear();
    
    try {
      const idb = await import('idb-keyval');
      const keys = await idb.keys();
      for (const k of keys) {
        if (typeof k === 'string' && k.startsWith('hc_sync_outbox_')) continue;
        await idb.del(k);
      }
    } catch (e) {}

    if (theme) localStorage.setItem('hc_theme', theme);
    if (consent) localStorage.setItem('hc_consent', consent);
    sessionStorage.clear();
    window.dispatchEvent(new Event('hc_logout'));
    navigate('/', { replace: true });
  };


  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setIsDeleting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const response = await fetch('/api/delete-account', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.success) {
          throw new Error(body.error || 'The secure deletion service could not complete the request. Your data was not cleared locally.');
        }
        await clearSyncOutbox(session.user.id);
      }
      
      sessionStorage.clear();
      window.dispatchEvent(new Event('hc_logout'));

      localStorage.clear();
      await supabase.auth.signOut();
      success('Health data removed', 'Your HealthChain account and user-owned data have been permanently deleted.');
      navigate('/');
    } catch (err: any) {
      toastError('Error deleting account', err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
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
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Manage your account and preferences.
          </p>
        </div>
      </div>



      <div className="card" style={{ padding: '20px' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC', color: '#64748B', fontSize: '13px' }} aria-label="Caregiver Mode temporarily locked">
            <User size={16} />
            <span>Temporarily locked</span>
          </div>
        </div>

        {/* Premium Section */}
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: isMobile ? 12 : 0,
            padding: '16px',
            background: isPremium ? 'var(--teal-light)' : '#F3E8FF',
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${isPremium ? 'var(--teal)' : '#D8B4FE'}`,
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: isPremium ? 'var(--teal)' : '#6B21A8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} />
              {isPremium ? 'HealthChain Premium Active' : 'Upgrade to Premium'}
            </div>
            <div style={{ fontSize: '13px', color: isPremium ? 'var(--teal)' : '#7E22CE', opacity: 0.8 }}>
              {isPremium ? 'You have access to advanced assessment and case-organization tools.' : 'Unlock expanded collaborative assessments and detailed PDF organization.'}
            </div>
          </div>
          {!isPremium && (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/pricing')} style={{ padding: '8px 16px', fontSize: '14px', background: '#9333EA', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Star size={14} />Upgrade to Premium
            </button>
          )}
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
              Dark Mode (X-Ray)
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              High-contrast radiology theme.
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              style={{ display: 'none' }}
              checked={document.documentElement.classList.contains('dark-theme')}
              onChange={(e) => {
                const isDark = e.target.checked;
                if (isDark) {
                  document.documentElement.classList.add('dark-theme');
                  try { localStorage.setItem('hc_theme', 'dark'); } catch(e) {}
                } else {
                  document.documentElement.classList.remove('dark-theme');
                  try { localStorage.setItem('hc_theme', 'light'); } catch(e) {}
                }
                // Force re-render to update the checkbox visually
                navigate('.', { replace: true });
              }}
            />
            <div
              style={{
                width: '44px',
                height: '24px',
                background: document.documentElement.classList.contains('dark-theme') ? '#10B981' : '#E2E8F0',
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
                  left: document.documentElement.classList.contains('dark-theme') ? '22px' : '2px',
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
            </div>
          </label>
        </div>

        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: '24px',
            marginTop: '40px',
          }}
        >
          Growth & Rewards
        </h2>
        


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
            <button className="btn btn-outline" onClick={handleLogout} style={{ gap: '8px' }}>
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
              <span style={{ color: '#B45309', fontSize: '13px' }}>Your data is currently stored locally in this browser. If you clear your browser cache or switch devices, your data will be permanently lost. Create an account to securely back up your data.</span>
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
          Privacy & Data Handling
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
              Your Data, Your Control
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
          Data Portability
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
              Download a copy of your profiles, cases, and settings as JSON.
            </div>
          </div>
          <button
            className="btn btn-outline"
            onClick={async () => {
              const exportedData = Object.keys(localStorage).reduce<Record<string, string>>((data, key) => {
                if (scopedExportPrefixes.some((prefix) => key.startsWith(prefix))) {
                  const value = localStorage.getItem(key);
                  if (value !== null) data[key] = value;
                }
                return data;
              }, {});

              let cloudData: Record<string, unknown> | null = null;
              if (isAuthenticated) {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session?.user) {
                  toastError('Export Incomplete', 'Your sign-in session expired. Sign in again before exporting cloud data.');
                  return;
                }
                const [profileResult, casesResult, memoryResult, caregiverResult] = await Promise.all([
                  supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
                  supabase.from('cases').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false }),
                  supabase.from('health_memory').select('*').eq('user_id', session.user.id).order('occurred_at', { ascending: false }),
                  supabase.from('healthchain_profiles').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false }),
                ]);
                const snapshotUnavailable = caregiverResult.error?.code === 'PGRST205' || caregiverResult.error?.code === '42P01';
                const remoteError = profileResult.error || casesResult.error || memoryResult.error ||
                  (snapshotUnavailable ? null : caregiverResult.error);
                if (remoteError) {
                  toastError('Export Incomplete', 'Cloud records could not be read. Nothing was downloaded so you do not receive a partial backup.');
                  return;
                }
                cloudData = {
                  userId: session.user.id,
                  profile: profileResult.data,
                  cases: casesResult.data || [],
                  healthMemory: memoryResult.data || [],
                  caregiverProfiles: snapshotUnavailable ? [] : (caregiverResult.data || []),
                };
              }

              const dataStr = JSON.stringify({
                exportedAt: new Date().toISOString(),
                format: 'healthchain-user-data-v2',
                scope: cloudData ? 'local-cache-and-supabase-records' : 'local-cache-only',
                localStorage: exportedData,
                supabase: cloudData,
              }, null, 2);
              const blobUrl = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', blobUrl);
              linkElement.setAttribute('download', 'healthchain_export.json');
              linkElement.click();
              window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
              success('Export Complete', cloudData ? 'Your local cache and cloud records were downloaded.' : 'Your local data was downloaded. Sign in to include cloud records.');
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
              style={{ display: 'none' }} 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const parsed = JSON.parse(ev.target?.result as string);
                    const result = parsed?.data && typeof parsed.data === 'object' ? parsed.data : parsed;
                    if (!result || typeof result !== 'object') {
                      throw new Error('Invalid JSON format');
                    }
                    const FORBIDDEN_KEYS = ['isAuthenticated', 'hc_account', 'hc_remember', 'hc_guest_mode', 'hc_premium_status'];
                    const ALLOWED_PREFIXES = [...scopedExportPrefixes, 'hc_theme'];

                    let importedCount = 0;
                    Object.keys(result).forEach(key => {
                      if (FORBIDDEN_KEYS.includes(key)) return;
                      const isAllowed = ALLOWED_PREFIXES.some(prefix => key.startsWith(prefix));
                      if (isAllowed) {
                        const val = typeof result[key] === 'string' ? result[key] : JSON.stringify(result[key]);
                        try { localStorage.setItem(key, val); } catch(e) {}
                        importedCount++;
                      }
                    });
                    success('Import Complete', `Successfully restored ${importedCount} data entries. Refreshing...`);
                    setTimeout(() => window.location.reload(), 1500);
                  } catch (err) {
                    toastError('Import Failed', 'Invalid or unverified JSON file.');
                  }
                };
                reader.onerror = () => toastError('Import Failed', 'Failed to read file.');
                reader.readAsText(file);
              }}
            />
          </label>
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
      {showDeleteModal && (
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
          <FocusTrap isActive={showDeleteModal}>
            <div
              className="card"
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '24px',
              position: 'relative',
            }}
          >
            <button
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
      )}
    </div>
  );
}



