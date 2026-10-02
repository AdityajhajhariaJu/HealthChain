import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HCLogo } from '../../components/ui/HCLogo';
import { useToast } from '../../components/ui/ToastProvider';
import type { LandingWorkflowScenario } from '../../data/LandingWorkflowScenarios';
import { useMountedRef } from '../../hooks/useMountedRef';
import { trackButtonClick, trackPageView } from '../../services/analytics';
import { getActiveSession } from '../../services/authSession';
import { triggerHapticLight } from '../../services/haptics';
import LandingBenefits from './components/LandingBenefits';
import LandingExamples from './components/LandingExamples';
import LandingHero from './components/LandingHero';
import LandingInformation, { LandingFooter } from './components/LandingInformation';
import LandingLaunchStatus from './components/LandingLaunchStatus';
import LandingVideos from './components/LandingVideos';
import LandingWorkflowOverview from './components/LandingWorkflowOverview';
import styles from './Landing.module.css';

const LandingWorkflowReasoningModal = lazy(() =>
  import('./components/LandingWorkflowReasoningModal').then((module) => ({
    default: module.LandingWorkflowReasoningModal,
  }))
);

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const { error: showError } = useToast();
  const navigationLocked = useRef(false);
  const mounted = useMountedRef();
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const isLoggedOut = !hasSession;

  useEffect(() => {
    trackPageView('/');
  }, []);

  // Redirect authenticated users away from landing page
  useEffect(() => {
    let cancelled = false;
    getActiveSession().then((session) => {
      if (!cancelled && session) {
        setHasSession(true);
        if (!navigationLocked.current) navigate('/app', { replace: true });
        return;
      }
      if (!cancelled) {
        setHasSession(false);
        try {
          setGuestMode(localStorage.getItem('hc_guest_mode') === 'true');
        } catch {
          setGuestMode(false);
        }
      }
    });

    let unsubscribe: (() => void) | undefined;
    void import('../../services/supabaseClient')
      .then(({ supabase }) => {
        if (cancelled) return;
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          if (
            (event === 'SIGNED_IN' ||
              event === 'TOKEN_REFRESHED' ||
              (event === 'INITIAL_SESSION' && session)) &&
            session
          ) {
            setHasSession(true);
            if (!navigationLocked.current) navigate('/app', { replace: true });
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      })
      .catch(() => {
        // Public content stays usable; protected routes verify session access.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [navigate]);

  const prepareWorkspaceLaunch = async () => {
    if (guestMode && !hasSession) return true;
    const session = await getActiveSession();
    if (!mounted.current) return false;
    if (session) {
      navigate('/app', { replace: true });
      return false;
    }
    try {
      localStorage.setItem('hc_guest_mode', 'true');
      setGuestMode(true);
    } catch {
      // The workspace will expose a storage error if device storage is blocked.
    }
    return true;
  };

  const handleStartInvestigation = async (
    context: string = 'landing_hero',
    presetSymptom?: string,
    presetSpecialist?: string
  ) => {
    if (navigationLocked.current) return;
    navigationLocked.current = true;
    triggerHapticLight();
    trackButtonClick('Get Started', context);
    setIsNavigating(true);

    try {
      if (!(await prepareWorkspaceLaunch())) return;
      if (presetSymptom) {
        try {
          sessionStorage.setItem('hc_preset_symptom', presetSymptom);
        } catch (e) {}
      }
      if (presetSpecialist) {
        try {
          sessionStorage.setItem('hc_preset_specialist', presetSpecialist);
        } catch (e) {}
      }

      const [{ setActiveCase }, { useMDTStore }] = await Promise.all([
        import('../../services/CaseEngine'),
        import('../../stores/useMDTStore'),
      ]);
      if (!mounted.current) return;
      setActiveCase(null);
      useMDTStore.getState().reset();
      navigate('/app/consult?new=true');
    } catch {
      if (mounted.current) {
        navigationLocked.current = false;
        setIsNavigating(false);
        showError('Workspace could not open', 'Check your connection and try again.');
      }
    }
  };

  const [inspectingScenario, setInspectingScenario] = useState<LandingWorkflowScenario | null>(
    null
  );

  const handleLaunchWorkflowScenario = async (scenarioId: string) => {
    if (navigationLocked.current) return;
    navigationLocked.current = true;
    triggerHapticLight();
    trackButtonClick('Launch Workflow Case', scenarioId);
    setIsNavigating(true);

    try {
      if (!(await prepareWorkspaceLaunch())) return;
      const { instantiateWorkflowCase } = await import('../../services/LandingCaseWorkflowEngine');
      if (!mounted.current) return;
      const newCase = instantiateWorkflowCase(scenarioId);
      navigate(`/app/cases/${encodeURIComponent(newCase.id)}`);
    } catch {
      if (mounted.current) {
        navigationLocked.current = false;
        setIsNavigating(false);
        showError('Example case could not open', 'Check your connection and try again.');
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      {isNavigating && <LandingLaunchStatus />}

      <nav className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <div className={styles.logoContainer}>
          <HCLogo size={32} />
          <span className={styles.logoText}>HealthChain360.ai</span>
        </div>
        <div className={styles.navActions}>
          {isLoggedOut ? (
            <>
              <button className={styles.navLoginButton} onClick={() => navigate('/login')}>
                Log In
              </button>
              <button
                className={styles.navButton}
                onClick={() => handleStartInvestigation('landing_nav')}
              >
                Get Started
              </button>
            </>
          ) : (
            <button className={styles.navButton} onClick={() => navigate('/app/today')}>
              Health Today →
            </button>
          )}
        </div>
      </nav>

      <main>
        <LandingHero onStart={handleStartInvestigation} />

        <LandingVideos onStart={handleStartInvestigation} />

        <LandingBenefits onStart={handleStartInvestigation} />

        <LandingWorkflowOverview onStart={handleStartInvestigation} />

        <LandingExamples
          onInspect={setInspectingScenario}
          onLaunch={handleLaunchWorkflowScenario}
          onStart={handleStartInvestigation}
        />

        <LandingInformation />
      </main>

      <LandingFooter />

      {inspectingScenario && (
        <Suspense fallback={null}>
          <LandingWorkflowReasoningModal
            scenario={inspectingScenario}
            onClose={() => setInspectingScenario(null)}
            onLaunchCase={handleLaunchWorkflowScenario}
          />
        </Suspense>
      )}
    </div>
  );
}
