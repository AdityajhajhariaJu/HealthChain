import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import { Brain, BrainCircuit, LineChart, Activity, Target, FolderHeart, MessageCircle, Pill, Archive, Heart, FileText, Settings, Lock, Apple, Network, LayoutDashboard, ArrowLeft, Quote, Sparkles, BriefcaseBusiness, ArrowRight, FlaskConical, Grid, X, Bot, Trophy, Flame, Bell, Stethoscope, ClipboardList, Menu, Plus, Clock, Search, ChevronRight, Shield, Zap, Play, CheckCircle2, Home, User } from 'lucide-react';
import { NetworkHubIcon } from '../ui/NetworkHubIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveCase, getCases } from '../../services/CaseEngine';
import { getProfile } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { triggerHapticLight } from '../../services/haptics';

import { AuthModal } from '../ui/AuthModal';
import { GuestStickyBanner } from '../ui/GuestStickyBanner';
import { AmbientGyroBackground } from '../ui/AmbientGyroBackground';
import { MedicalActionIsland } from '../ui/MedicalActionIsland';
import VitalityPointsModal from '../ui/VitalityPointsModal';
import PointsAwardedToast from '../ui/PointsAwardedToast';
import UpgradeToProCard from '../ui/UpgradeToProCard';
import { TrialFeaturesModal } from '../ui/TrialFeaturesModal';
import { openTrialModal } from '../../services/TrialEngine';
import { getVitalityPoints, getVitalityState, TIERS } from '../../services/VitalityPointsEngine';
import { trackPageView, trackButtonClick } from '../../services/analytics';
import { useToast } from '../ui/ToastProvider';
import FeedbackWidget from '../ui/FeedbackWidget';
import NotificationPanel from '../ui/NotificationPanel';

function AnimatedOutlet() {
  const o = useOutlet();
  const [outlet] = useState(o);
  return outlet;
}

const links: any[] = [
  { to: '/app/today', label: 'Health Today', icon: LayoutDashboard },
  { to: '/app/consult', label: 'Consult', icon: Stethoscope },
  { to: '/app/jarvis', label: 'J.A.R.V.I.S.', icon: BrainCircuit },
  { to: '/app/case-prep', label: 'Case Prep', icon: ClipboardList },
  { to: '/app/trials', label: 'Clinical Trials', icon: FlaskConical },
  { to: '/app/my-cases', label: 'My Cases', icon: Archive },
  { to: '/app/profile', label: 'Medical Profile', icon: FolderHeart },
  { to: '/app/dietician', label: 'Diet Plan', icon: Apple },
  { to: '/app/progress', label: 'Vitality Progress', icon: Activity },
  { to: '/app/trophies', label: 'Trophy Cabinet', icon: Trophy },
  { to: '/app/ava', label: 'Ava Health Buddy', icon: Heart },
  { to: '/app/medicine-lab', label: 'Medicine & Lab Reports', icon: Pill },
];

const mobileTabs = [
  { to: '/app/today', label: 'Today', icon: LayoutDashboard },
  { to: '/app/consult', label: 'Consult', icon: Stethoscope },
  { to: '/app/ava', label: 'Ava', icon: Heart },
  { to: '/app/dietician', label: 'Diet', icon: Apple },
];

export default function AppShell() {
  const [history, setHistory] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { 
    try {
      if (localStorage.getItem('hc_onboarded') !== 'true') {
        const prof = getProfile();
        if (prof?.demographics?.onboardingCompletedAt || (prof?.demographics?.name && prof?.demographics?.age)) {
          localStorage.setItem('hc_onboarded', 'true');
          return;
        }
        if (location.pathname !== '/app/onboarding') {
          navigate('/app/onboarding', { replace: true });
        }
      }
    } catch(e) {}
  }, [location.pathname, navigate]);
  const toast = useToast();
  const isMobile = useIsMobile();
    const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [hasPendingCheckin, setHasPendingCheckin] = useState(false);
  const [profile, setProfile] = useState(getProfile());
  const [isScrolling, setIsScrolling] = useState(false);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<any>(null);

  useEffect(() => {
    const checkCheckin = () => {
      try {
        const todayKey = new Date().toISOString().split('T')[0];
        const prof = getProfile();
        const done = (prof?.dailyCheckins || []).some((c: any) => c.date && c.date.startsWith(todayKey));
        setHasPendingCheckin(!done);
      } catch (e) {
        setHasPendingCheckin(false);
      }
    };
    checkCheckin();
    window.addEventListener('hc_daily_checkin_completed', checkCheckin);
    window.addEventListener('hc_profile_updated', checkCheckin);
    return () => {
      window.removeEventListener('hc_daily_checkin_completed', checkCheckin);
      window.removeEventListener('hc_profile_updated', checkCheckin);
    };
  }, []);

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    // Always show if at the very top
    if (currentScrollY < 50) {
      setIsScrolling(false);
      lastScrollY.current = currentScrollY;
      return;
    }

    // Hide on scroll down, show on scroll up
    if (currentScrollY > lastScrollY.current + 12) {
      setIsScrolling(true);
      lastScrollY.current = currentScrollY;
    } else if (currentScrollY < lastScrollY.current - 12) {
      setIsScrolling(false);
      lastScrollY.current = currentScrollY;
    }
  };

  useEffect(() => {
    const onCustomScroll = (e: any) => {
      const currentScrollY = e.detail.scrollTop;
      if (currentScrollY < 50) {
        setIsScrolling(false);
        lastScrollY.current = currentScrollY;
        return;
      }
      if (currentScrollY > lastScrollY.current + 12) {
        setIsScrolling(true);
        lastScrollY.current = currentScrollY;
      } else if (currentScrollY < lastScrollY.current - 12) {
        setIsScrolling(false);
        lastScrollY.current = currentScrollY;
      }
    };
    window.addEventListener('hc_scroll_intent', onCustomScroll);
    return () => window.removeEventListener('hc_scroll_intent', onCustomScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMoreMenu) setShowMoreMenu(false);
        if (showProfileMenu) setShowProfileMenu(false);
        if (showNotifications) setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMoreMenu, showProfileMenu, showNotifications]);

  const [points, setPoints] = useState(getVitalityPoints());
  const [vitalityState, setVitalityState] = useState(() => getVitalityState());
  const currentTierBadge = TIERS.find(t => t.name === vitalityState.tier)?.badge || '🥉';

  const handleNavClick = (path: string, label?: string) => {
    triggerHapticLight();
    trackButtonClick(label || path, 'navigation');
    navigate(path);
    setShowMoreMenu(false);
    setShowProfileMenu(false);
  };


  // Scroll to top on route change & track page view
  useEffect(() => {
    // Dynamic Theme Color for Android/PWA Status Bar
    const metaThemeColor = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (location.pathname.startsWith('/app/ava')) {
        metaThemeColor.setAttribute('content', '#FDE4D3'); // Soft sunset peach
      } else if (location.pathname.startsWith('/app/jarvis')) {
        metaThemeColor.setAttribute('content', '#F1F5F9'); // Slate
      } else {
        metaThemeColor.setAttribute('content', '#F0FDFA'); // Light teal default
      }
    }

    setShowMoreMenu(false);
    setShowProfileMenu(false);
    trackPageView(location.pathname);
    const scrollContainer = document.querySelector('.app-shell__content');
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadHistory = () => {
      // Load recent cases, sorted by updated date
      const cases = [...getCases()].sort((a, b) => (new Date(b?.updatedAt || 0).getTime() || 0) - (new Date(a?.updatedAt || 0).getTime() || 0));
      setHistory(cases);
    };
    loadHistory();
    const handleProfileUpdate = () => {
      setProfile(getProfile());
      setPoints(getVitalityPoints());
      setVitalityState(getVitalityState());
    };
    const handlePointsUpdate = () => {
      setPoints(getVitalityPoints());
      setVitalityState(getVitalityState());
    };
    window.addEventListener('hc_cases_updated', loadHistory);
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    window.addEventListener('hc_points_updated', handlePointsUpdate);
    return () => {
      window.removeEventListener('hc_cases_updated', loadHistory);
      window.removeEventListener('hc_profile_updated', handleProfileUpdate);
      window.removeEventListener('hc_points_updated', handlePointsUpdate);
    };
  }, []);

  // Enforce a minimum safe area for Capacitor/WKWebView bugs
  useEffect(() => {
const enforceSafeArea = () => {
      const div = document.createElement('div');
      div.style.paddingTop = 'env(safe-area-inset-top)';
      document.body.appendChild(div);
      const computedTop = parseInt(getComputedStyle(div).paddingTop, 10) || 0;
      document.body.removeChild(div);
      
      let finalTop = computedTop;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // If on a real mobile device and env() returns 0 (e.g. Android WebView / PWA),
      // we must fallback to 44px to prevent the OS status bar from overlapping the UI.
      // This will not trigger on Desktop browsers resized to mobile width.
      if (isMobileDevice && computedTop === 0) {
        finalTop = 44;
      }
      
      document.documentElement.style.setProperty('--safe-area-top', `${finalTop}px`);
    };
    enforceSafeArea();
    setTimeout(enforceSafeArea, 150);
  }, []);

  const isPeachPage = location.pathname.startsWith('/app/today') || location.pathname.startsWith('/app/consult');

  return (
    <div className="app-shell" style={{ backgroundColor: isPeachPage ? '#FFF2E8' : undefined, transition: 'background-color 0.3s ease' }}>
      
      <MedicalActionIsland />
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {!isMobile && (
        <aside className="sidebar">
          <div className="sidebar__logo">
            <img src="/logo.png" alt="HealthChain360.ai" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
            <div>
              <span className="sidebar__logo-text">HealthChain360.ai</span>
              <span className="sidebar__logo-sub">Health Assessment & Case Prep</span>
            </div>
          </div>

          {/* Desktop Vitality Rewards & Notifications Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 16px 14px' }}>
            <button
              onClick={() => {
                triggerHapticLight();
                window.dispatchEvent(new Event('hc_open_points_modal'));
              }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                border: '1px solid #A7F3D0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="View Vitality Points & Daily Rewards"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trophy size={15} color="#059669" />
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#065F46' }}>{points} PTS</span>
                <span style={{ fontSize: '13px', lineHeight: 1 }}>{currentTierBadge}</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>Rewards →</span>
            </button>
            <button
              onClick={() => {
                triggerHapticLight();
                setShowNotifications(true);
              }}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#475569',
                position: 'relative',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
              title="View Health Alerts & Notifications"
              aria-label="View notifications"
            >
              <Bell size={17} />
              {hasPendingCheckin && (
                <span 
                  style={{ 
                    position: 'absolute', 
                    top: '8px', 
                    right: '8px', 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    backgroundColor: '#F59E0B', 
                    border: '1.5px solid #FFFFFF' 
                  }} 
                />
              )}
            </button>
          </div>

          <nav className="sidebar__nav" aria-label="Main navigation">
            {links.map((l) => {
              const isLocked = l.locked;
              return (
              <NavLink
                key={l.to}
                to={isLocked ? '#' : l.to}
                end={l.to === '/app'}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    toast.info('Coming Soon', `${l.label} is currently in development.`);
                  }
                }}
                className={({ isActive }) => `sidebar__link ${isActive && !isLocked ? 'active' : ''}`}
                style={{ opacity: isLocked ? 0.6 : 1, position: 'relative' }}
              >
                <l.icon size={18} aria-hidden="true" />
                {l.label}
                {isLocked && <Lock size={14} style={{ position: 'absolute', right: '20px' }} />}
              </NavLink>
            )})}
            <NavLink
              to="/app/settings"
              className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
            >
              <Settings size={18} />
              Settings
            </NavLink>
          </nav>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', padding: '0 20px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
              <NavLink to="/changelog" style={{ color: 'inherit', textDecoration: 'none' }}>What's New</NavLink>
              <NavLink to="/help" style={{ color: 'inherit', textDecoration: 'none' }}>Help</NavLink>
              <NavLink to="/pricing" style={{ color: 'inherit', textDecoration: 'none' }}>Pricing</NavLink>
              <NavLink to="/privacy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</NavLink>
              <NavLink to="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</NavLink>
            </div>
            <div className="sidebar__footer" style={{ padding: '12px 20px', fontSize: '10px', lineHeight: '1.4', color: 'var(--text-muted)' }}>
              <strong>Disclaimer:</strong> HealthChain360.ai is an AI Navigational and Researcher tool, not a doctor. It is not a substitute for professional medical advice.
            </div>
          </div>
        </aside>
      )}

        <motion.main className={`app-shell__content ${isMobile ? 'mobile' : ''}`} id="main-content" style={{ backgroundColor: isPeachPage ? '#FFF2E8' : undefined, overflowY: isMobile && (location.pathname.startsWith('/app/ava') || location.pathname.startsWith('/app/onboarding')) ? 'hidden' : 'auto', paddingTop: location.pathname.startsWith('/app/onboarding') ? '0px' : undefined, paddingBottom: location.pathname.startsWith('/app/onboarding') ? '0px' : (isMobile && location.pathname.startsWith('/app/ava') ? '0px' : undefined), transformOrigin: 'top center', borderRadius: showMoreMenu || showProfileMenu ? '16px' : '0px' }} onScroll={handleMainScroll} animate={{ scale: showMoreMenu || showProfileMenu ? 0.93 : 1, opacity: showMoreMenu || showProfileMenu ? 0.5 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          {/* Hardware-accelerated structural wrapper to force standard document flow and prevent flex-overlap bugs */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
            {!(location.pathname.startsWith('/app/jarvis') || location.pathname.startsWith('/app/consult') || location.pathname.startsWith('/app/progress') || location.pathname.startsWith('/app/trophies') || location.pathname.startsWith('/app/onboarding') || location.pathname.startsWith('/app/war-room')) && (
              <div style={{ flexShrink: 0, display: (isMobile && ['/app/dietician', '/app/medicine-lab', '/app/settings', '/app/ava', '/app/trials', '/app/case-prep'].some(p => location.pathname.startsWith(p))) ? 'none' : 'block', position: 'relative', zIndex: 1 }}>
                <BrandPulseBanner />
              </div>
            )}
            {!['/app/today', '/app/consult', '/app/dietician', '/app/medicine-lab', '/app/collab', '/app/case-prep', '/app/settings', '/app/ava', '/app/trials', '/app/profile', '/app/my-cases', '/app/cases', '/app/jarvis', '/app/progress', '/app/trophies', '/app/war-room'].some(p => location.pathname.startsWith(p)) && (
              <ActiveCaseBar navigate={navigate} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, width: '100%' }}>
              <Outlet />
            </div>
          </div>
        </motion.main>

      {isMobile && !location.pathname.startsWith("/app/onboarding") && (
          <>
            <div className="mobile-top-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {location.pathname.startsWith('/app/ava') && (
                <button
                  onClick={() => window.history.back()}
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(244, 63, 94, 0.2)',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.15)',
                    color: '#F43F5E',
                  }}
                  aria-label="Go back"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
              )}
            {!(location.pathname.startsWith('/app/ava') || location.pathname.startsWith('/app/war-room')) && (
              <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setShowProfileMenu(!showProfileMenu);
                }}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block', borderRadius: '50%' }}
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
                aria-label="Open profile menu"
              >
                <img 
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.demographics?.name || 'User')}&background=0F8B7E&color=fff`}
                  alt={`${profile?.demographics?.name || 'User'} profile avatar`} 
                  className="mobile-top-bar__profile" 
                  style={{ display: 'block' }}
                />
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                    <motion.div key="profile-backdrop"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'transparent' }}
                      onClick={() => setShowProfileMenu(false)}
                    />
                )}
                {showProfileMenu && (
                    <motion.div key="profile-menu"
                      role="menu"
                      aria-label="User Profile Menu"
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: '0',
                        zIndex: 999,
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 12px 32px rgba(15, 23, 42, 0.14), 0 2px 6px rgba(15, 23, 42, 0.04)',
                        padding: '6px',
                        minWidth: '190px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #F1F5F9', marginBottom: '4px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {profile?.demographics?.name || 'My Health'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>
                          {profile?.isPro ? '✨ Pro Member' : 'Free Starter'}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/app/today');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'transparent',
                          color: '#0F172A',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Home size={16} color="#059669" />
                        <span>Health Today</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/app/profile');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'transparent',
                          color: '#0F172A',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <FolderHeart size={16} color="#0D9488" />
                        <span>Medical Profile</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/app/settings');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'transparent',
                          color: '#0F172A',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Settings size={16} color="#64748B" />
                        <span>Settings</span>
                      </button>
                    </motion.div>
            )}
          </AnimatePresence>
            </div>
            )}
            </div>
              {!location.pathname.startsWith('/app/ava') ? (
                <button 
                  className="mobile-top-bar__search" 
                  onClick={() => navigate('/app/ava')} 
                  aria-label="Search or Ask Ava Health Buddy" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '0 10px',
                    minWidth: 0,
                    flex: 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F43F5E', flexShrink: 0 }}>
                    <Heart size={13} fill="#F43F5E" color="#F43F5E" />
                    <span style={{ fontWeight: 800, fontSize: '12px', letterSpacing: '-0.2px' }}>Ava</span>
                  </div>
                  <span style={{ 
                    fontSize: '13px', 
                    color: '#94A3B8', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    fontWeight: 500
                  }}>
                    Ask anything...
                  </span>
                </button>
              ) : (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Ava Pro <span style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, verticalAlign: 'middle', marginLeft: '2px' }}>Plus</span>
                  </span>
                </div>
              )}
              <div className="mobile-top-bar__actions">
                    <button
                      className="mobile-top-bar__points sparkly-gold-pill"
                      onClick={() => {
                        triggerHapticLight();
                        window.dispatchEvent(new Event('hc_open_points_modal'));
                      }}
                      style={{
                        cursor: 'pointer',
                        padding: '5px 9px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        borderRadius: '20px',
                      }}
                      aria-label="View Vitality Points & Daily Rewards"
                    >
                      <Trophy size={14} color="#059669" />
                      <span style={{ fontWeight: 900, color: '#065F46' }}>{points} PTS</span>
                      <span style={{ fontSize: '13px', lineHeight: 1 }}>{currentTierBadge}</span>
                    </button>
                <button 
                  className="mobile-top-bar__bell" 
                  aria-label="View notifications"
                  onClick={() => {
                    triggerHapticLight();
                    setShowNotifications(true);
                  }}
                  style={{ position: 'relative', cursor: 'pointer' }}
                >
                  <Bell size={18} aria-hidden="true" />
                  {hasPendingCheckin && (
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: '6px', 
                        right: '6px', 
                        width: '7px', 
                        height: '7px', 
                        borderRadius: '50%', 
                        backgroundColor: '#F59E0B', 
                        border: '1.5px solid #FFFFFF' 
                      }} 
                    />
                  )}
                </button>
              </div>
          </div>
          {!(location.pathname.startsWith('/app/ava') || location.pathname.startsWith('/app/war-room')) && (
          <nav className={`mobile-tab-bar ${isScrolling ? 'scrolling' : ''}`}>
            {mobileTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
                onClick={() => {
                  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                  setShowMoreMenu(false);
                }}
              >
                <tab.icon size={22} />
                <span>{tab.label}</span>
              </NavLink>
            ))}
            <button
              className={`mobile-tab ${showMoreMenu ? 'active' : ''}`}
              aria-label="More Menu"
              aria-expanded={showMoreMenu}
              onClick={() => {
                Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
                setShowMoreMenu(!showMoreMenu);
              }}
            >
              <Grid size={22} />
              <span>More</span>
            </button>
            </nav>
          )}

          <AnimatePresence>
            {showMoreMenu && (
                <motion.div
                  key="more-backdrop"
                  className="mobile-more-menu-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  onClick={() => setShowMoreMenu(false)}
                />
            )}
            {showMoreMenu && (
                <motion.div
                  key="more-menu"
                  role="dialog"
                  aria-modal="true"
                  aria-label="More Health Tools"
                  className="mobile-more-menu" style={{ background: 'linear-gradient(rgba(255,255,255,0.65), rgba(255,255,255,0.85)), url(/ava-floral-bg.jpg) center/cover no-repeat' }}
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ y: { type: 'spring', damping: 30, stiffness: 300 }, opacity: { duration: 0.2 } }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.8 }}
                  onDragEnd={(e, { offset, velocity }) => {
                    if (offset.y > 100 || velocity.y > 500) {
                      setShowMoreMenu(false);
                    }
                  }}
                >
                <div className="mobile-more-menu__header">
                  <h3>More Tools</h3>
                  <button onClick={() => setShowMoreMenu(false)} className="close-btn" aria-label="Close More Menu">
                    <X size={24} aria-hidden="true" />
                  </button>
                </div>
                <div className="mobile-more-menu__grid">
                  {links.filter(l => !mobileTabs.find(mt => mt.to === l.to)).map((l) => {
                    const isLocked = l.locked;
                    return (
                    <button
                      key={l.to}
                      onClick={() => {
                        if (isLocked) {
                          toast.info('Coming Soon', `${l.label} is currently in development.`);
                          return;
                        }
                        navigate(l.to);
                        setShowMoreMenu(false);
                      }}
                      className="more-menu-item"
                      style={{ border: 'none', background: 'none', outline: 'none', position: 'relative', opacity: isLocked ? 0.6 : 1 }}
                    >
                      <div className="more-menu-icon">
                        <l.icon size={22} />
                      </div>
                      <span>{l.label}</span>
                      {isLocked && <Lock size={16} style={{ position: 'absolute', top: '12px', right: '12px', opacity: 0.5 }} />}
                    </button>
                  )})}
                  <button 
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate('/app/settings');
                    }} 
                    className="more-menu-item"
                    style={{ border: 'none', background: 'none', outline: 'none' }}
                  >
                    <div className="more-menu-icon">
                      <Settings size={22} />
                    </div>
                    <span>Settings</span>
                  </button>
                </div>

                <div style={{ padding: '0 16px 18px 16px', marginTop: 'auto' }}>
                  <UpgradeToProCard
                    compact
                    isPro={!!profile?.isPro}
                    onNavigate={() => setShowMoreMenu(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}


      <AuthModal />
      <VitalityPointsModal />
      <PointsAwardedToast />
      <TrialFeaturesModal />
      <FeedbackWidget />
      <NotificationPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
    </div>
  );
}

export function ActiveCaseBar({ navigate }: any) {
  const [activeCase, setActiveCase] = useState(getActiveCase());
  const [profile, setProfile] = useState(getProfile());


  useEffect(() => {
    const refresh = () => {
      setActiveCase(getActiveCase());
      setProfile(getProfile());
    };
    window.addEventListener('hc_active_case_updated', refresh);
    window.addEventListener('hc_cases_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    return () => {
      window.removeEventListener('hc_active_case_updated', refresh);
      window.removeEventListener('hc_cases_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
    };
  }, []);
  if (!activeCase)
    return (
      <div className="active-case-bar active-case-bar--empty">
        <div>
          <span>YOUR CASE CONTEXT</span>
          <strong>
            {profile?.demographics?.name
              ? `${(profile?.demographics?.name || '').split(' ')[0] || 'User'}, start where your story is most complex.`
              : 'Start a case so HealthChain can keep your story connected.'}
          </strong>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/app/consult?new=true')}>
          Start a Quick Consult <ArrowRight size={15} />
        </button>
      </div>
    );
  const pending = (activeCase.actions || []).filter(
    (action: any) => action.status !== 'completed'
  ).length;
  return (
    <div className="active-case-bar">
      <div className="active-case-bar__icon">
        <BriefcaseBusiness size={18} />
      </div>
      <div className="active-case-bar__copy">
        <span>ACTIVE CASE · {profile?.demographics?.name || 'Your health record'}</span>
        <strong>{activeCase.title}</strong>
        <small>
          {(activeCase.medicalRecords || []).length} evidence items · {pending} open actions ·
          Updated {new Date(activeCase.updatedAt).toLocaleDateString()}
        </small>
      </div>
      <button
        className="btn btn-outline btn-sm"
        onClick={() => navigate(`/app/cases/${activeCase.id}`)}
      >
        Open case <ArrowRight size={15} />
      </button>
    </div>
  );
}

function BrandPulseBanner() {
  const messages = [
    {
      quote: 'One health story. Multiple specialist perspectives.',
      sub: 'Multiple-Specialists investigates your case from more than one clinical angle.',
    },
    {
      quote:
        "You've explained your symptoms to five different doctors. Your labs come back 'normal,' but you still feel terrible.",
      sub: 'Your experience is real. HealthChain360.ai helps you organise the full picture for the next conversation.',
    },
    {
      quote: 'When symptoms do not fit neatly into one box, one perspective may not be enough.',
      sub: 'Bring relevant AI specialist perspectives together before you decide what to ask next.',
    },
    {
      quote: 'Parallel investigation. Connected evidence. Clearer next steps.',
      sub: 'HealthChain360.ai turns your symptoms, records, and answers into one evolving case.',
    },
    {
      quote: 'You should not have to repeat your health story from the beginning every time.',
      sub: 'Keep your records, patterns, questions, and next actions connected in one case file.',
    },
    {
      quote: 'Your case should not restart every time new evidence arrives.',
      sub: 'Reopen your review when a report, appointment, or symptom changes.',
    },
    {
      quote: 'The goal is not more noise. It is better questions for the right clinician.',
      sub: 'Use your case brief to make the next appointment more focused and productive.',
    },
    {
      quote: 'Better clinical conversations start with a better-organised case.',
      sub: 'Bring an evidence-led brief, the right questions, and your next actions to your clinician.',
    },
    {
      quote: 'HealthChain360.ai isn\'t a one-off search engine.',
      sub: 'It is a persistent, AI-driven medical detective that stays on the case until the mystery is actually solved.',
    },
  ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((current) => (current + 1) % messages.length), 10000);
    return () => clearInterval(timer);
  }, []);
  const message = messages[active];
  return (
    <section className="brand-pulse" aria-label="What makes HealthChain360.ai different">
      <div className="brand-pulse__mark">
        <Quote size={20} />
      </div>
      <div className="brand-pulse__copy">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32 }}
          >
            <strong>"{message.quote}"</strong>
            <span>{message.sub}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="brand-pulse__meta">
        <Sparkles size={15} />
        <span>HEALTHCHAIN360.AI METHOD</span>
        <div className="brand-pulse__dots">
          {messages.map((_, index) => (
            <i key={index} className={index === active ? 'active' : ''} />
          ))}
        </div>
      </div>
    </section>
  );
}










