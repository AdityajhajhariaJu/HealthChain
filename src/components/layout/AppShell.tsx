import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import {
  BrainCircuit, Activity,
  Target,
  FolderHeart,
  MessageCircle,
  Pill,
  Archive,
  Heart,
  FileText,
  Settings,
  Lock,
  Apple,
  Network,
  LayoutDashboard,
  Quote,
  Sparkles,
  BriefcaseBusiness,
  ArrowRight,
  FlaskConical,
  Grid,
  X,
  Bot,
  Trophy,
  Flame,
  Bell,
  Stethoscope,
  ClipboardList
  ,Brain
} from 'lucide-react';
import { NetworkHubIcon } from '../ui/NetworkHubIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveCase, getCases } from '../../services/CaseEngine';
import { getProfile } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { triggerHapticLight } from '../../services/haptics';
import Breadcrumbs from '../ui/Breadcrumbs';
import FeedbackWidget from '../ui/FeedbackWidget';
import { AuthModal } from '../ui/AuthModal';
import VitalityPointsModal from '../ui/VitalityPointsModal';
import PointsAwardedToast from '../ui/PointsAwardedToast';
import { getVitalityPoints, getVitalityState, TIERS } from '../../services/VitalityPointsEngine';

function AnimatedOutlet() {
  const o = useOutlet();
  const [outlet] = useState(o);
  return outlet;
}

const links: any[] = [
  { to: '/app/today', label: 'Health Today', icon: LayoutDashboard },
  { to: '/app/consult', label: 'Quick Consult', icon: Stethoscope },
  { to: '/app/collab', label: 'Collaborative Specialists', icon: Brain },
  { to: '/app/jarvis', label: 'J.A.R.V.I.S.', icon: NetworkHubIcon },
  { to: '/app/case-prep', label: 'Case Prep', icon: ClipboardList },
  { to: '/app/trials', label: 'Clinical Trials', icon: FlaskConical },
  { to: '/app/my-cases', label: 'My Cases', icon: Archive },
  { to: '/app/profile', label: 'Medical Profile', icon: FolderHeart },
  { to: '/app/dietician', label: 'Dietician', icon: Apple },
  { to: '/app/ava', label: 'Ava Health Buddy', icon: Heart },
  { to: '/app/pharmacy', label: 'Pharmacy Hub', icon: Pill },
  { to: '/app/reports', label: 'Lab Report Analyzer', icon: FileText },
];

const mobileTabs = [
  { to: '/app/today', label: 'Today', icon: LayoutDashboard },
  { to: '/app/consult', label: 'Quick', icon: Stethoscope },
  { to: '/app/collab', label: 'Deep', icon: Brain },
  { to: '/app/jarvis', label: 'JARVIS', icon: NetworkHubIcon },
  { to: '/app/my-cases', label: 'Cases', icon: Archive },
];

export default function AppShell() {
  const [history, setHistory] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [profile, setProfile] = useState(getProfile());
  const [points, setPoints] = useState(getVitalityPoints());
  const [vitalityState, setVitalityState] = useState(() => getVitalityState());
  const currentTierBadge = TIERS.find(t => t.name === vitalityState.tier)?.badge || '🥉';

  const handleNavClick = (path: string) => {
    triggerHapticLight();
    navigate(path);
    setShowMoreMenu(false);
  };

  // Scroll to top on route change
  useEffect(() => {
    setShowMoreMenu(false);
    const scrollContainer = document.querySelector('.app-shell__content');
    if (scrollContainer) {
      scrollContainer.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadHistory = () => {
      // Load recent cases, sorted by updated date
      const cases = getCases().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
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

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      {!isMobile && (
        <aside className="sidebar">
          <div className="sidebar__logo">
            <div className="sidebar__logo-icon">
              <Activity size={20} color="var(--teal)" />
            </div>
            <div>
              <span className="sidebar__logo-text">HealthChain</span>
              <span className="sidebar__logo-sub">Health Assessment & Case Prep</span>
            </div>
          </div>

          {/* Desktop Vitality Rewards Pill */}
          <button
            onClick={() => {
              triggerHapticLight();
              window.dispatchEvent(new Event('hc_open_points_modal'));
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              margin: '0 16px 14px',
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

          <nav className="sidebar__nav" aria-label="Main navigation">
            {links.map((l) => {
              const isLocked = l.locked || (l.proOnly && !profile?.isPro);
              return (
              <NavLink
                key={l.to}
                to={isLocked ? '#' : l.to}
                end={l.to === '/app'}
                onClick={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    if (l.proOnly && !profile?.isPro) navigate('/pricing');
                    else alert(l.label + ' is coming soon!');
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
              <strong>Disclaimer:</strong> HealthChain is an AI Navigational and Researcher tool, not a doctor. It is not a substitute for professional medical advice.
            </div>
          </div>
        </aside>
      )}

        <main className={`app-shell__content ${isMobile ? 'mobile' : ''}`} id="main-content">
          {!location.pathname.startsWith('/app/jarvis') && (
            <div style={{ display: (isMobile && ['/app/consult', '/app/dietician', '/app/pharmacy', '/app/reports', '/app/collab', '/app/settings', '/app/ava', '/app/trials', '/app/case-prep'].some(p => location.pathname.startsWith(p))) ? 'none' : 'block' }}>
              <BrandPulseBanner />
            </div>
          )}
          {!['/app/today', '/app/consult', '/app/dietician', '/app/pharmacy', '/app/reports', '/app/collab', '/app/case-prep', '/app/settings', '/app/ava', '/app/trials', '/app/profile', '/app/my-cases', '/app/jarvis'].some(p => location.pathname.startsWith(p)) && (
            <ActiveCaseBar navigate={navigate} />
          )}
          {!location.pathname.startsWith('/app/jarvis') && <Breadcrumbs />}
        <div style={{ minHeight: 'calc(100% - 104px)' }}>
          <Outlet />
        </div>
      </main>

      {isMobile && (
        <>
          <div className="mobile-top-bar">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.demographics?.name || 'User')}&background=0F8B7E&color=fff`}
              alt="Profile" 
              className="mobile-top-bar__profile" 
              onClick={() => navigate('/app/today')} 
            />
              <button className="mobile-top-bar__search" onClick={() => navigate('/app/ava')} aria-label="Search or Ask Ava Health Buddy" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingRight: '6px', borderRight: '1px solid #e2e8f0', color: '#475569' }}>
                  <Heart size={12} />
                  <span style={{ fontWeight: 600, fontSize: '11px' }}>Ava</span>
                </div>
                <Bot size={14} style={{ color: 'var(--teal)', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ask anything...</span>
              </button>
              <div className="mobile-top-bar__actions">
                <button
                  className="mobile-top-bar__points"
                  onClick={() => {
                    triggerHapticLight();
                    window.dispatchEvent(new Event('hc_open_points_modal'));
                  }}
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    background: '#ffffff',
                    padding: '5px 9px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderRadius: '20px',
                  }}
                  aria-label="View Vitality Points & Daily Rewards"
                >
                  <Trophy size={14} color="var(--teal)" />
                  <span style={{ fontWeight: 800 }}>{points} PTS</span>
                  <span style={{ fontSize: '13px', lineHeight: 1 }}>{currentTierBadge}</span>
                </button>
                <button className="mobile-top-bar__bell" aria-label="View notifications">
                  <Bell size={18} aria-hidden="true" />
                </button>
              </div>
          </div>
          <nav className="mobile-tab-bar">
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

          <AnimatePresence>
            {showMoreMenu && (
              <>
                <motion.div
                  className="mobile-more-menu-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMoreMenu(false)}
                />
                <motion.div 
                  className="mobile-more-menu"
                  initial={{ opacity: 0, y: '100%' }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
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
                    const isLocked = l.locked || (l.proOnly && !profile?.isPro);
                    return (
                    <button
                      key={l.to}
                      onClick={() => {
                        if (isLocked) {
                          if (l.proOnly && !profile?.isPro) {
                            setShowMoreMenu(false);
                            navigate('/pricing');
                          } else {
                            alert(l.label + ' is coming soon!');
                          }
                          return;
                        }
                        navigate(l.to);
                        setShowMoreMenu(false);
                      }}
                      className="more-menu-item"
                      style={{ border: 'none', background: 'none', outline: 'none', position: 'relative', opacity: isLocked ? 0.6 : 1 }}
                    >
                      <l.icon size={24} />
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
                    <Settings size={24} />
                    <span>Settings</span>
                  </button>
                </div>

                <div style={{ padding: '0 20px 24px 20px', marginTop: 'auto' }}>
                  {!profile?.isPro ? (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        triggerHapticLight();
                        setShowMoreMenu(false);
                        navigate('/pricing');
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #0F172A 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        boxShadow: '0 10px 25px -5px rgba(4, 120, 87, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                        color: '#FFFFFF',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-20px',
                          right: '-20px',
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.4) 0%, transparent 70%)',
                          filter: 'blur(10px)',
                          pointerEvents: 'none',
                        }}
                      />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
                            color: '#FFFFFF',
                            flexShrink: 0,
                          }}
                        >
                          <Sparkles size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>Upgrade to Pro</span>
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                padding: '2px 6px',
                                borderRadius: '999px',
                                background: 'rgba(245, 158, 11, 0.25)',
                                border: '1px solid rgba(245, 158, 11, 0.5)',
                                color: '#FDE68A',
                                letterSpacing: '0.5px',
                              }}
                            >
                              Pro
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255, 255, 255, 0.75)', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            Unlock MDT consensus & clinical tools
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFFFFF',
                          flexShrink: 0,
                          zIndex: 1,
                          marginLeft: '8px',
                        }}
                      >
                        <ArrowRight size={15} />
                      </div>
                    </motion.button>
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)',
                        border: '1px solid rgba(5, 150, 105, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#047857',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                          }}
                        >
                          <Sparkles size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#065F46' }}>HealthChain Pro Active</div>
                          <div style={{ fontSize: '11px', color: '#047857' }}>All clinical tools & quota unlocked</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          navigate('/pricing');
                        }}
                        style={{
                          border: 'none',
                          background: '#047857',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                        }}
                      >
                        Manage
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}

      {(location.pathname === '/app/today' || location.pathname === '/app/profile') && (
        <FeedbackWidget />
      )}
      <AuthModal />
      <VitalityPointsModal />
      <PointsAwardedToast />
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
        'You’ve explained your symptoms to five different doctors. Your labs come back “normal,” but you still feel terrible.',
      sub: 'Your experience is real. HealthChain helps you organise the full picture for the next conversation.',
    },
    {
      quote: 'When symptoms do not fit neatly into one box, one perspective may not be enough.',
      sub: 'Bring relevant AI specialist perspectives together before you decide what to ask next.',
    },
    {
      quote: 'Parallel investigation. Connected evidence. Clearer next steps.',
      sub: 'HealthChain turns your symptoms, records, and answers into one evolving case.',
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
      quote: 'HealthChain isn\'t a one-off search engine.',
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
    <section className="brand-pulse" aria-label="What makes HealthChain different">
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
            <strong>“{message.quote}”</strong>
            <span>{message.sub}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="brand-pulse__meta">
        <Sparkles size={15} />
        <span>HEALTHCHAIN METHOD</span>
        <div className="brand-pulse__dots">
          {messages.map((_, index) => (
            <i key={index} className={index === active ? 'active' : ''} />
          ))}
        </div>
      </div>
    </section>
  );
}

