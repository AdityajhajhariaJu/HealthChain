import React, { Suspense, useEffect } from 'react';
import { trackButtonClick, trackEvent } from './services/analytics';
import { registerPushNotifications, setupPushListeners, unregisterPushDevice } from './services/PushService';
import { syncProfileFromSupabase, getProfileKey, getProfileEngineState, backfillHealthMemoryFromProfile, getProfile } from './services/ProfileEngine';
import { ensureWelcomeGrant } from './services/VitalityPointsEngine';
import { initGlobalHaptics } from './services/haptics';
import { initNativeLifecycle } from './services/NativeLifecycle';
import { installNativeAuthCallbacks } from './services/NativeAuth';
import { initCaseEngine, clearCaseEngineCache, backfillCaseHealthMemory, getActiveCaseId } from './services/CaseEngine';
import { syncHealthMemoryFromSupabase } from './services/HealthMemory';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { setItemSync, getItemSync, removeItemSync } from './services/storage';
import { clearPersistedMDTSession } from './stores/useMDTStore';
import { flushSyncOutbox } from './services/SyncOutbox';
import { captureAccountScope, isAccountScopeCurrent, invalidateAccountScope } from './services/AccountScope';
import { loadObservationsFromCloud, retryFailedObservationQueues } from './services/HealthObservationService';
import { isDurableHealthStorageKey, retainHealthStorage } from './services/DurableHealthStorage';
import { flushDailyTrackerLedger, migrateDailyTrackerHistory, hydrateDailyTrackerProjections } from './services/DailyTrackerLedger';

import Landing from './features/auth/Landing';
import Auth from './features/auth/Auth';
import AuthCallback from './features/auth/AuthCallback';
import AppShell from './components/layout/AppShell';
import { AdminContentDashboard } from './features/admin/AdminContentDashboard';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ProfileOnboarding from './features/profile/ProfileOnboarding';
import { ErrorBoundary } from 'react-error-boundary';
import FallbackError from './components/ui/FallbackError';
import NotFound from './components/ui/NotFound';
import { useToast } from './components/ui/ToastProvider';
import OfflineBanner from './components/ui/OfflineBanner';
import ConsentManager from './components/ui/ConsentManager';
import ObservationConflictReview from './components/ui/ObservationConflictReview';
import ProfileConflictReview from './components/ui/ProfileConflictReview';
import DeviceErasureRecovery from './components/ui/DeviceErasureRecovery';

import ProductTour from './components/ui/ProductTour';
import TopUpModal from './features/brand/TopUpModal';

// Lazy load heavy components
const MedicalProfile = React.lazy(() => import('./features/profile/MedicalProfile'));
const ConsultPage = React.lazy(() => import('./features/consultation/ConsultPage'));
const MyCases = React.lazy(() => import('./features/dashboard/MyCases'));
const AvaHealthBuddy = React.lazy(() => import('./features/consultation/AvaHealthBuddy'));

const Settings = React.lazy(() => import('./features/profile/Settings'));
const Dietician = React.lazy(() => import('./features/dietician/Dietician'));
const CaseDashboard = React.lazy(() => import('./features/dashboard/CaseDashboard'));
const ProgressGallery = React.lazy(() => import('./features/dashboard/ProgressGallery'));
const TrophyCabinet = React.lazy(() => import('./features/dashboard/TrophyCabinet'));
const ClinicalTrialsMatcher = React.lazy(() => import('./features/tools/ClinicalTrialsMatcher'));
const PrivacyPolicy = React.lazy(() => import('./features/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./features/legal/TermsOfService'));
const ReviewerDemo = React.lazy(() => import('./features/legal/ReviewerDemo'));
const UpdatePassword = React.lazy(() => import('./features/auth/UpdatePassword'));

const Changelog = React.lazy(() => import('./features/brand/Changelog'));
const HelpCenter = React.lazy(() => import('./features/brand/HelpCenter'));
const Pricing = React.lazy(() => import('./features/brand/Pricing'));
const CasePrep = React.lazy(() => import('./features/experience/CasePrep'));
const HealthMemory = React.lazy(() => import('./features/experience/HealthMemory'));
const OnboardingFlow = React.lazy(() => import('./features/onboarding/OnboardingFlow'));
const NutritionInterceptor = React.lazy(() => import('./features/dietician/NutritionInterceptor').then(m => ({ default: m.NutritionInterceptor })));
const CaseDetail = React.lazy(() => import('./features/dashboard/CaseDetail'));

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2 }}
    style={{ height: '100%' }}
  >
    {children}
  </motion.div>
);

const FallbackLoader = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--teal)',
    }}
  >
    <Loader2 className="typing-dot" style={{ width: 32, height: 32 }} />
  </div>
);

const SafeRoute = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary FallbackComponent={FallbackError}>
    <Suspense fallback={<FallbackLoader />}>{children}</Suspense>
  </ErrorBoundary>
);

import { openTrialModal } from './services/TrialEngine';

const ProRoute = ({ children, featureName = 'Premium Features' }: { children: React.ReactNode; featureName?: string }) => {
  const profile = getProfile();
  if (!profile?.isPro) {
    setTimeout(() => openTrialModal(featureName), 80);
    return <Navigate to="/app/today" replace />;
  }
  return <SafeRoute>{children}</SafeRoute>;
};

/**
 * Route redirector that preserves URL query parameters and hashes across legacy route aliases.
 * Fulfills Package 4 requirement: preserve context through redirects and direct links.
 */
const PreservedNavigate: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  const target = `${to}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
};

const RetiredMedicineLabRedirect: React.FC = () => {
  const location = useLocation();
  const caseId = new URLSearchParams(location.search).get('caseId');
  if (caseId) return <Navigate to={`/app/cases/${encodeURIComponent(caseId)}?tab=records`} replace />;
  return <Navigate to={location.pathname === '/app/pharmacy' || (!location.hash && location.pathname === '/app/medicine-lab') ? '/app/profile' : '/app/my-cases'} replace />;
};

/**
 * War Room & Cases redirector that routes to the active Health Canvas (/app/cases/:id)
 * if an active case exists, or falls back to /app/my-cases. Does not invent a competing canvas.
 */
const WarRoomRedirect: React.FC = () => {
  const location = useLocation();
  const activeCaseId = getActiveCaseId();
  const targetPath = activeCaseId ? `/app/cases/${activeCaseId}` : '/app/my-cases';
  return <Navigate to={`${targetPath}${location.search}${location.hash}`} replace />;
};

const VIP_HASH = 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a';

async function sha256Hex(str: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return '';
  }
}

export default function App() {
  useEffect(() => {
    if (getItemSync('hc_guest_mode') === 'true') {
      void initCaseEngine().catch(error => console.warn('Guest case recovery failed', error));
    }
  }, []);

  // Global User Activity Tracker (Clicks & Inputs)
  useEffect(() => {
    // 1. Track Clicks
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest('button, a, [role="button"]') as HTMLElement;
      if (clickable) {
        let name: string | null = clickable.getAttribute('aria-label') || clickable.innerText;
        if (!name && clickable.tagName === 'A') name = clickable.getAttribute('href') || '';
        if (name && typeof name === 'string' && name.trim()) {
          trackButtonClick(name.trim().substring(0, 60));
        }
      }
    };

    // 2. Track Searches and Chat Prompts (on Enter key)
    const handleGlobalInput = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          if (target.type === 'password') return; // NEVER track passwords
          const val = target.value.trim();
          if (val.length > 0) {
             const isSearch = target.type === 'search' || (target.placeholder && target.placeholder.toLowerCase().includes('search'));
             trackEvent(isSearch ? 'search_query' : 'chat_prompt', { 
               inputLength: val.length,
               path: window.location.pathname
             });
          }
        }
      }
    };
    
    document.addEventListener('click', handleGlobalClick, { capture: true, passive: true });
    document.addEventListener('keydown', handleGlobalInput, { capture: true, passive: true });
    
    return () => {
      document.removeEventListener('click', handleGlobalClick, { capture: true });
      document.removeEventListener('keydown', handleGlobalInput, { capture: true });
    };
  }, []);

  const location = useLocation();
  const navigate = useNavigate();
  const { info } = useToast();
  const [topUpFeature, setTopUpFeature] = React.useState<any>(null);

  useEffect(() => installNativeAuthCallbacks(navigate), [navigate]);

  useEffect(() => {
    const checkVip = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const vipPass = params.get('vip_pass') || params.get('tester') || params.get('test_pass');
        if (vipPass) {
          const passHash = await sha256Hex(vipPass);
          if (passHash === VIP_HASH) {
            localStorage.setItem('hc_vp_sig', VIP_HASH);
            localStorage.setItem('hc_vip_tester', 'true');
            localStorage.setItem('hc_guest_mode', 'false');
            window.dispatchEvent(new Event('hc_profile_updated'));
            info('🎉 VIP Tester Pass Activated! All 16 AI Specialists & Pro features are unlocked.');
            params.delete('vip_pass');
            params.delete('tester');
            params.delete('test_pass');
            const newSearch = params.toString() ? `?${params.toString()}` : '';
            window.history.replaceState({}, '', `${window.location.pathname}${newSearch}`);
          }
        }
      } catch (e) {}
    };
    checkVip();
  }, [info]);

  useEffect(() => {
    const handleQuota = (e: any) => {
      const profile = getProfile();
      if (!profile?.isPro) {
        navigate('/pricing');
        return;
      }
      // Map API operations to TopUpModal features
      const op = e.detail?.operation || '';
      if (op.includes('ava') || op.includes('buddy')) setTopUpFeature('ava_replies');
      else if (op.includes('quick')) setTopUpFeature('quick_consult');
      else if (op.includes('specialist_selection')) setTopUpFeature('deep_collab');
      else if (op.includes('jarvis')) setTopUpFeature('jarvis');
      else if (op.includes('lab')) setTopUpFeature('lab_report');
    };
    window.addEventListener('hc_quota_exceeded', handleQuota);
    return () => window.removeEventListener('hc_quota_exceeded', handleQuota);
  }, []);

  useEffect(() => {
    ensureWelcomeGrant();
    const flush = () => {
      const scope = captureAccountScope();
      void flushSyncOutbox().then(async () => {
        if (!isAccountScopeCurrent(scope)) return;
        await migrateDailyTrackerHistory();
        await flushDailyTrackerLedger();
        if (!isAccountScopeCurrent(scope) || scope.accountId === 'guest') return;
        await retryFailedObservationQueues();
        if (!isAccountScopeCurrent(scope)) return;
        await flushSyncOutbox(scope.accountId);
        if (isAccountScopeCurrent(scope)) {
          const result = await loadObservationsFromCloud();
          if (isAccountScopeCurrent(scope) && ['loaded', 'conflict'].includes(result.status)) await hydrateDailyTrackerProjections();
          if (isAccountScopeCurrent(scope) && result.conflicts) window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: { area: 'observations', message: `${result.conflicts} observation conflicts need review. Your local edits were preserved.` } }));
        }
      }).catch(error => console.warn('Sync recovery failed', error));
    };
    flush();
    window.addEventListener('online', flush);

    const handleLogout = async (event: Event) => {
      if ((event as CustomEvent)?.detail?.accountDeleted) return;
      const logoutScope = captureAccountScope();
      try { await unregisterPushDevice(logoutScope); } catch (error) { console.warn('Push logout cleanup failed', error); }
      try {
        const idb = await import('idb-keyval');
        await clearPersistedMDTSession();
        const keys = await idb.keys();
        for (const k of keys) {
          if (!isAccountScopeCurrent(logoutScope)) return;
          if (isDurableHealthStorageKey(k)) continue;
          await idb.del(k);
        }
      } catch (e) {}
      
      try {
        if (!isAccountScopeCurrent(logoutScope)) return;
        const retained = retainHealthStorage(localStorage);
        sessionStorage.clear();
        // Remove only transient keys, avoiding a native Preferences.clear race
        // that could erase the durable records being retained.
        Object.keys(localStorage).forEach(key => { if (!(key in retained)) removeItemSync(key); });
        const clearedScope = captureAccountScope();
        if (!isAccountScopeCurrent(clearedScope)) return;
        await supabase.auth.signOut();
      } catch (e) {}
      
      if (captureAccountScope().accountId === 'guest') navigate('/', { replace: true });
    };
    window.addEventListener('hc_logout', handleLogout);

    // Profile updates are frequent (demographic edits, nutrition, timeline
    // entries). Only an active-profile change requires reloading the case and
    // Health Memory scopes; treating every edit as a switch caused redundant
    // reads and overlapping refreshes that could race with a save.
    let lastProfileId = getProfileEngineState().activeId;
    let profileRefresh: Promise<void> = Promise.resolve();
    const handleProfileSwitch = () => {
      const nextProfileId = getProfileEngineState().activeId;
      if (!nextProfileId || nextProfileId === lastProfileId) return;
      lastProfileId = nextProfileId;
      profileRefresh = profileRefresh.catch(() => {}).then(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await initCaseEngine();
        await syncHealthMemoryFromSupabase().catch(console.error);
      });
    };
    window.addEventListener('hc_profile_updated', handleProfileSwitch);

    return () => {
      window.removeEventListener('hc_logout', handleLogout);
      window.removeEventListener('hc_profile_updated', handleProfileSwitch);
      window.removeEventListener('online', flush);
    };
  }, []);

  useEffect(() => {
    initGlobalHaptics();
    initNativeLifecycle();
    void setupPushListeners(navigate).catch(error => console.warn('Push listeners unavailable', error));

    // Check for email verification / password recovery hash
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      navigate('/update-password' + hash, { replace: true });
      try {
        window.history.replaceState(null, '', '/update-password');
      } catch {}
      return;
    }

    // Global Auth Listener. Do not await Supabase reads from inside this
    // callback: Supabase serializes auth events and a nested getSession() can
    // otherwise stall sign-in or device-switch transitions.
    let authBootstrapTimer: ReturnType<typeof setTimeout> | null = null;
    let lastSignedInAt = getItemSync('isAuthenticated') === 'true' ? Date.now() : 0; // Timestamp of last SIGNED_IN to debounce false SIGNED_OUT races
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
          if (authBootstrapTimer) clearTimeout(authBootstrapTimer);
          lastSignedInAt = Date.now();
          setItemSync('isAuthenticated', 'true');
          
          if (getItemSync('hc_guest_mode') === 'true') {
            const guestPrefix = 'hc_unified_profile_guest';
            const authPrefix = `hc_unified_profile_${session.user.id}`;
            
            const guestProfile = getItemSync(guestPrefix);
            if (guestProfile && !getItemSync(authPrefix)) {
              setItemSync(authPrefix, guestProfile);
              if (getItemSync(authPrefix) === guestProfile) removeItemSync(guestPrefix);
            }
            
            // Older features used both *_guest and *_guest_profile_1 key shapes.
            // Migrate every guest-scoped health key without guessing a suffix, so no guest work is stranded on sign-in.
            try {
              Object.keys(localStorage).forEach((key) => {
                if (!key.startsWith('hc_') || !key.includes('_guest')) return;
                const value = getItemSync(key);
                if (!value) return;
                const targetKey = key.replace('_guest', `_${session.user.id}`);
                // A returning account keeps its existing records. Guest/account
                // reconciliation needs review rather than a blind overwrite.
                if (!isDurableHealthStorageKey(key) || getItemSync(targetKey) !== null) return;
                setItemSync(targetKey, value);
                if (getItemSync(targetKey) === value) removeItemSync(key);
              });
            } catch (e) {
               // Ignore if Object.keys(localStorage) throws due to security block
            }
          }
          
          removeItemSync('hc_guest_mode');
        
        // Sync account info from session to capture OAuth logins (like Google)
        const currentAccount = getItemSync('hc_account');
        let parsedAccount: any = {};
        try { parsedAccount = currentAccount ? JSON.parse(currentAccount) : {}; } catch (e) { parsedAccount = {}; }
        setItemSync(
          'hc_account',
          JSON.stringify({
            ...parsedAccount,
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || parsedAccount.name || '',
          })
        );
        
        // Use the session from the event directly — do NOT re-call getSession()
        // inside this callback. Re-calling getSession() acquires the internal
        // Supabase lock, which is already held during onAuthStateChange dispatch,
        // causing a deadlock or returning stale data from async storage.
        const bootstrapScope = captureAccountScope();
        authBootstrapTimer = setTimeout(() => {
          if (!isAccountScopeCurrent(bootstrapScope)) return;
          void registerPushNotifications().catch(error => console.warn('Push registration failed', error));
          // Navigate FIRST based on what's already in localStorage.
          // Do NOT block navigation on network calls (syncProfile, initCaseEngine)
          // because they call supabase.auth.getSession() internally, which can
          // deadlock against the memory lock still held by onAuthStateChange.
          // UPDATE: We MUST sync the profile first to know if they've onboarded.
          // By passing session.user.id, we bypass the internal getSession() call!
          void (async () => {
            try {
              await syncProfileFromSupabase(session.user.id);
            } catch (err) {
              console.warn('Initial profile sync failed, falling back to local storage', err);
            }
            if (!isAccountScopeCurrent(bootstrapScope)) return;

            const path = window.location.pathname;
            if (path === '/' || path === '/login' || path === '/signup' || path === '/onboarding' || path === '/auth/callback') {
              navigate('/app', { replace: true });
            }

            // Sync other background data
            try {
              await initCaseEngine();
              if (!isAccountScopeCurrent(bootstrapScope)) return;
              syncHealthMemoryFromSupabase().catch(console.error);
              void loadObservationsFromCloud().then(() => {
                if (isAccountScopeCurrent(bootstrapScope)) return retryFailedObservationQueues();
              }).catch(error => console.warn('Observation history sync failed', error));
              backfillHealthMemoryFromProfile();
              backfillCaseHealthMemory();
            } catch (err) {
              console.error('Background init failed', err);
            }
          })();
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Debounce false SIGNED_OUT events that race with a fresh SIGNED_IN.
        // Supabase's internal _recoverAndRefresh can fire SIGNED_OUT on stale
        // storage before our async IndexedDB write from a fresh login has
        // committed. If a SIGNED_IN occurred within the last 5 seconds, this
        // SIGNED_OUT is a false positive — ignore it.
        if (Date.now() - lastSignedInAt < 5000) {
          console.warn('[Auth] Ignoring SIGNED_OUT that raced with recent SIGNED_IN (debounce window)');
          return;
        }
        if (authBootstrapTimer) {
          clearTimeout(authBootstrapTimer);
          authBootstrapTimer = null;
        }
        try {
          const theme = localStorage.getItem('hc_theme');
          const consent = localStorage.getItem('hc_consent');
          clearCaseEngineCache();
          sessionStorage.clear();
          localStorage.removeItem('isAuthenticated');
          localStorage.removeItem('hc_account');
          invalidateAccountScope();
          if (theme) localStorage.setItem('hc_theme', theme);
          if (consent) localStorage.setItem('hc_consent', consent);
        } catch (e) {
          console.warn('Failed to cleanup on sign out', e);
        }
        
        const path = window.location.pathname;
        if (path.startsWith('/app')) {
          const endedScope = captureAccountScope();
          info('Session ended', 'Please sign in to continue.');
          setTimeout(() => {
            if (isAccountScopeCurrent(endedScope)) navigate('/login', { replace: true });
          }, 300);
        }
      }
    });

    const handleWake = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setItemSync('isAuthenticated', 'true');
        }
      }).catch(() => {});
    };

    window.addEventListener('pageshow', handleWake);
    document.addEventListener('visibilitychange', handleWake);

    return () => {
      if (authBootstrapTimer) clearTimeout(authBootstrapTimer);
      subscription.unsubscribe();
      window.removeEventListener('pageshow', handleWake);
      document.removeEventListener('visibilitychange', handleWake);
    };
  }, [navigate, info]);

  return (
    <SafeRoute>
      <OfflineBanner />
      <ConsentManager />
      <ObservationConflictReview />
      <ProfileConflictReview />
      <DeviceErasureRecovery />
      <ProductTour />
      <Routes>
        <Route
          path="/"
          element={
            <SafeRoute>
              <PageTransition>
                <Landing />
              </PageTransition>
            </SafeRoute>
          }
        />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/login"
          element={
            <SafeRoute>
              <PageTransition>
                <Auth />
              </PageTransition>
            </SafeRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <SafeRoute>
              <PageTransition>
                <Auth />
              </PageTransition>
            </SafeRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <SafeRoute>
                <PageTransition>
                  <ProfileOnboarding />
                </PageTransition>
              </SafeRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/update-password"
          element={
            <PageTransition>
              <SafeRoute>
                <UpdatePassword />
              </SafeRoute>
            </PageTransition>
          }
        />
        <Route
          path="/privacy"
          element={
            <PageTransition>
              <SafeRoute>
                <PrivacyPolicy />
              </SafeRoute>
            </PageTransition>
          }
        />
        <Route
          path="/terms"
          element={
            <PageTransition>
              <SafeRoute>
                <TermsOfService />
              </SafeRoute>
            </PageTransition>
          }
        />
        <Route path="/review-demo" element={<PageTransition><SafeRoute><ReviewerDemo /></SafeRoute></PageTransition>} />
        <Route
          path="/changelog"
          element={
            <PageTransition>
              <SafeRoute>
                <Changelog />
              </SafeRoute>
            </PageTransition>
          }
        />
        <Route
          path="/help"
          element={
            <PageTransition>
              <SafeRoute>
                <HelpCenter />
              </SafeRoute>
            </PageTransition>
          }
        />
        <Route
          path="/pricing"
          element={
            <PageTransition>
              <SafeRoute>
                <Pricing />
              </SafeRoute>
            </PageTransition>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <SafeRoute>
                <PageTransition>
                  <AppShell />
                </PageTransition>
              </SafeRoute>
            </ProtectedRoute>
          }
        >
                    <Route path="/app" element={<Navigate to="/app/today" replace />} />
          <Route path="/app/onboarding" element={<SafeRoute><OnboardingFlow /></SafeRoute>} />
          <Route path="/app/progress" element={<SafeRoute><ProgressGallery /></SafeRoute>} />
          <Route path="/app/trophies" element={<SafeRoute><TrophyCabinet /></SafeRoute>} />
          <Route path="/app/war-room" element={<WarRoomRedirect />} />
          <Route
            path="/app/today"
            element={
              <SafeRoute>
                <CaseDashboard />
              </SafeRoute>
            }
          />
          <Route
            path="/app/cases/:id"
            element={
              <SafeRoute>
                <CaseDetail />
              </SafeRoute>
            }
          />
          <Route
            path="/app/my-cases"
            element={
              <SafeRoute>
                <MyCases />
              </SafeRoute>
            }
          />

          <Route
            path="/app/profile"
            element={
              <SafeRoute>
                <MedicalProfile />
              </SafeRoute>
            }
          />
          
          {/* Redirects for old routes preserving query parameters */}
          <Route path="/app/cases" element={<WarRoomRedirect />} />
          <Route path="/app/multi" element={<PreservedNavigate to="/app/consult" />} />
          <Route path="/app/mdthub" element={<PreservedNavigate to="/app/consult" />} />
          <Route path="/app/mdt" element={<PreservedNavigate to="/app/consult" />} />

          <Route
            path="/app/consult"
            element={
              <SafeRoute>
                <ConsultPage />
              </SafeRoute>
            }
          />
          <Route path="/app/collab" element={<PreservedNavigate to="/app/consult" />} />
          <Route path="/app/case-prep" element={<SafeRoute><CasePrep /></SafeRoute>} />
          <Route path="/app/health-memory" element={<SafeRoute><HealthMemory /></SafeRoute>} />
          <Route path="/app/deep-collab-beta" element={<PreservedNavigate to="/app/case-prep" />} />
          <Route path="/app/medicine-lab" element={<RetiredMedicineLabRedirect />} />
          <Route path="/app/pharmacy" element={<RetiredMedicineLabRedirect />} />
          <Route path="/app/nutrition" element={<PreservedNavigate to="/app/dietician" />} />
          <Route path="/app/nutrition-log" element={<SafeRoute><NutritionInterceptor /></SafeRoute>} />
          <Route
            path="/app/dietician"
            element={
              <SafeRoute>
                <Dietician />
              </SafeRoute>
            }
          />
          <Route path="/app/health-buddy" element={<PreservedNavigate to="/app/ava" />} />
          <Route path="/chat" element={<PreservedNavigate to="/app/ava" />} />
          <Route
            path="/app/ava"
            element={
              <SafeRoute>
                <AvaHealthBuddy />
              </SafeRoute>
            }
          />
          <Route path="/app/reports" element={<RetiredMedicineLabRedirect />} />
          <Route
            path="/app/trials"
            element={
              <SafeRoute>
                <ClinicalTrialsMatcher />
              </SafeRoute>
            }
          />
          <Route
            path="/app/settings"
            element={
              <SafeRoute>
                <Settings />
              </SafeRoute>
            }
          />
          <Route path="/app/jarvis" element={<PreservedNavigate to="/app/consult" />} />

          <Route path="/app/pricing" element={<Navigate to="/pricing" replace />} />
          <Route path="/app/admin/content" element={<SafeRoute><AdminContentDashboard /></SafeRoute>} />
        </Route>
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route path="*" element={<SafeRoute><NotFound /></SafeRoute>} />
      </Routes>
      
      {topUpFeature && (
        <TopUpModal 
          feature={topUpFeature} 
          onClose={() => setTopUpFeature(null)} 
          onSuccess={() => {
            setTopUpFeature(null);
            info('Top-up successful! You can now retry your action.');
          }} 
        />
      )}
    </SafeRoute>
  );
}

