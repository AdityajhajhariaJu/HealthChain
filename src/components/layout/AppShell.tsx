import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useOutlet } from 'react-router-dom';
import {
  Activity,
  Target,
  FolderHeart,
  MessageCircle,
  Pill,
  Archive,
  Heart,
  FileText,
  Settings,
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
  Bell,
  Stethoscope,
  ClipboardList
  ,Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveCase, getCases } from '../../services/CaseEngine';
import { getProfile } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { triggerHapticLight } from '../../services/haptics';
import Breadcrumbs from '../ui/Breadcrumbs';
import FeedbackWidget from '../ui/FeedbackWidget';
import { AuthModal } from '../ui/AuthModal';

function AnimatedOutlet() {
  const o = useOutlet();
  const [outlet] = useState(o);
  return outlet;
}

const links = [
  { to: '/app/today', label: 'Health Today', icon: LayoutDashboard },
  { to: '/app/consult', label: 'Quick Consult', icon: Stethoscope },
  { to: '/app/collab', label: 'Collaborative Specialists', icon: Brain },
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
  { to: '/app/case-prep', label: 'Prep', icon: ClipboardList },
  { to: '/app/my-cases', label: 'Cases', icon: Archive },
];

export default function AppShell() {
  const [history, setHistory] = useState<any[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [profile, setProfile] = useState(getProfile());

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
    const handleProfileUpdate = () => setProfile(getProfile());
    window.addEventListener('hc_cases_updated', loadHistory);
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('hc_cases_updated', loadHistory);
      window.removeEventListener('hc_profile_updated', handleProfileUpdate);
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

          <nav className="sidebar__nav" aria-label="Main navigation">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/app'}
                className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
              >
                <l.icon size={18} aria-hidden="true" />
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div
            style={{
              padding: '12px 20px 0',
              borderTop: '1px solid var(--border)',
              marginTop: '4px',
              flex: 1,
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '12px',
                fontWeight: 600,
              }}
            >
              Recents
            </div>
            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {history.slice(0, 5).map((h) => (
                  <NavLink
                    key={h.id}
                    to={`/app/cases/${h.id}`}
                    className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
                    style={{
                      fontSize: '13px',
                      padding: '8px 12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {h.title || 'Untitled Case'}
                  </NavLink>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  padding: '8px 12px',
                  fontStyle: 'italic',
                }}
              >
                No recent assessments
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
            <NavLink
              to="/app/settings"
              className={({ isActive }) => `sidebar__link ${isActive ? 'active' : ''}`}
            >
              <Settings size={18} />
              Settings
            </NavLink>

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
          <div style={{ display: (isMobile && ['/app/consult', '/app/dietician', '/app/pharmacy', '/app/reports', '/app/collab', '/app/settings', '/app/ava', '/app/trials', '/app/case-prep'].some(p => location.pathname.startsWith(p))) ? 'none' : 'block' }}>
            <BrandPulseBanner />
          </div>
          {!['/app/today', '/app/consult', '/app/dietician', '/app/pharmacy', '/app/reports', '/app/collab', '/app/case-prep', '/app/settings', '/app/ava', '/app/trials', '/app/profile', '/app/my-cases'].some(p => location.pathname.startsWith(p)) && (
            <ActiveCaseBar navigate={navigate} />
          )}
        <Breadcrumbs />
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
                <div className="mobile-top-bar__points">
                  <Trophy size={14} color="var(--teal)" />
                  <span>5 PTS</span>
                </div>
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
                  {links.filter(l => !mobileTabs.find(mt => mt.to === l.to)).map(l => (
                    <button
                      key={l.to}
                      onClick={() => navigate(l.to)}
                      className="more-menu-item"
                      style={{ border: 'none', background: 'none', outline: 'none' }}
                    >
                      <l.icon size={24} />
                      <span>{l.label}</span>
                    </button>
                  ))}
                  <button 
                    onClick={() => navigate('/app/settings')} 
                    className="more-menu-item"
                    style={{ border: 'none', background: 'none', outline: 'none' }}
                  >
                    <Settings size={24} />
                    <span>Settings</span>
                  </button>
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
