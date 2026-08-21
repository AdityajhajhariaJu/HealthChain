import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings as SettingsIcon, ChevronDown, Plus } from 'lucide-react';
import { getAllProfiles, switchActiveProfile, createNewProfile, getProfileEngineState, verifyProStatus, isProUser } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Star, AlertTriangle, Trash2, X, ShieldCheck, Lock } from 'lucide-react';
import { useToast } from '../../components/ui/ToastProvider';
import { supabase } from '../../services/supabaseClient';
import FocusTrap from '../../components/ui/FocusTrap';

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
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast, success, error: toastError } = useToast();

  const accountStr = localStorage.getItem('hc_account');
  const account = accountStr ? JSON.parse(accountStr) : null;
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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    const theme = localStorage.getItem('hc_theme');
    const consent = localStorage.getItem('hc_consent');
    localStorage.clear();
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
          <div style={{ position: 'relative', width: '200px' }}>
            <button 
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#334155'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} />
                <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profiles.find(p => p.id === activeProfileId)?.profileName || 'My Profile'}
                </span>
              </div>
              <ChevronDown size={14} />
            </button>

            {isProfileDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                width: '240px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                zIndex: 50,
                overflow: 'hidden'
              }}>
                {profiles.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      switchActiveProfile(p.id);
                      setIsProfileDropdownOpen(false);
                      navigate('/app/today');
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      background: p.id === activeProfileId ? '#F8FAFC' : 'transparent',
                      fontWeight: p.id === activeProfileId ? 600 : 400,
                      color: p.id === activeProfileId ? 'var(--teal)' : '#334155',
                      borderBottom: '1px solid #F1F5F9'
                    }}
                  >
                    {p.profileName}
                  </div>
                ))}
                {profiles.length < 3 && (
                  <div
                    onClick={() => {
                      const name = prompt("Enter name for new profile:");
                      if (name && name.trim()) {
                        createNewProfile(name.trim());
                        setIsProfileDropdownOpen(false);
                        navigate('/app/profile');
                      }
                    }}
                    style={{
                      padding: '10px 12px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: 'var(--teal)',
                      fontWeight: 500
                    }}
                  >
                    <Plus size={14} /> Add Dependent
                  </div>
                )}
              </div>
            )}
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
              {isPremium ? 'You have access to all advanced diagnostic tools.' : 'Unlock unlimited parallel board consultations and detailed PDF analysis.'}
            </div>
          </div>
          {!isPremium && (
            <button
              className="btn btn-primary"
              disabled
              style={{ padding: '8px 16px', fontSize: '14px', background: '#E9D5FF', color: '#6B21A8', border: 'none', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Lock size={14} />
              Upgrade Now
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
            onClick={() => {
              const exportedData = Object.keys(localStorage).reduce<Record<string, string>>((data, key) => {
                if (EXPORTABLE_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
                  const value = localStorage.getItem(key);
                  if (value !== null) data[key] = value;
                }
                return data;
              }, {});
              const dataStr = JSON.stringify({
                exportedAt: new Date().toISOString(),
                format: 'healthchain-user-data-v1',
                data: exportedData,
              }, null, 2);
              const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
              const exportFileDefaultName = 'healthchain_export.json';
              const linkElement = document.createElement('a');
              linkElement.setAttribute('href', dataUri);
              linkElement.setAttribute('download', exportFileDefaultName);
              linkElement.click();
              success('Export Complete', 'Your data has been successfully downloaded.');
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
                    const ALLOWED_PREFIXES = [...EXPORTABLE_STORAGE_PREFIXES, 'hc_theme'];

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
