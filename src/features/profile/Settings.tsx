import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings as SettingsIcon, ChevronDown, Plus } from 'lucide-react';
import { getAllProfiles, switchActiveProfile, createNewProfile, getProfileEngineState } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MonetizationService } from '../../services/MonetizationService';
import { Star } from 'lucide-react';

export default function Settings() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    MonetizationService.isPremium().then(setIsPremium);
    
    const handlePremiumUnlock = () => setIsPremium(true);
    window.addEventListener('hc_premium_unlocked', handlePremiumUnlock);
    const loadProfiles = () => {
      setProfiles(getAllProfiles());
      setActiveProfileId(getProfileEngineState().activeId);
    };
    loadProfiles();
    window.addEventListener('hc_profile_updated', loadProfiles);
    return () => {
      window.removeEventListener('hc_profile_updated', loadProfiles);
      window.removeEventListener('hc_premium_unlocked', handlePremiumUnlock);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
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
              fontSize: '24px',
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



      <div className="card" style={{ padding: '32px' }}>
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
            background: isPremium ? 'var(--teal-light)' : '#FEF3C7',
            borderRadius: 'var(--radius-lg)',
            border: `1px solid ${isPremium ? 'var(--teal)' : '#F59E0B'}`,
            marginBottom: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: isPremium ? 'var(--teal)' : '#B45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Star size={18} />
              {isPremium ? 'HealthChain Premium Active' : 'Upgrade to Premium'}
            </div>
            <div style={{ fontSize: '13px', color: isPremium ? 'var(--teal)' : '#B45309', opacity: 0.8 }}>
              {isPremium ? 'You have access to all advanced diagnostic tools.' : 'Unlock unlimited parallel MDT consultations and detailed PDF analysis.'}
            </div>
          </div>
          {!isPremium && (
            <button
              className="btn btn-primary"
              onClick={() => MonetizationService.purchaseSubscription('yearly')}
              style={{ padding: '8px 16px', fontSize: '14px', background: '#F59E0B', color: '#fff', border: 'none' }}
            >
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
            marginBottom: '32px',
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
                  localStorage.setItem('hc_theme', 'dark');
                } else {
                  document.documentElement.classList.remove('dark-theme');
                  localStorage.setItem('hc_theme', 'light');
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
                  Patient User
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>user@example.com</div>
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
              padding: '32px',
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
      </div>
    </div>
  );
}
