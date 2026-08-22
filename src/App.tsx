import React, { Suspense, useEffect } from 'react';
import { registerPushNotifications, setupPushListeners } from './services/PushService';
import { syncProfileFromSupabase, getProfileKey, getProfileEngineState, backfillHealthMemoryFromProfile } from './services/ProfileEngine';
import { initCaseEngine, clearCaseEngineCache, backfillCaseHealthMemory } from './services/CaseEngine';
import { syncHealthMemoryFromSupabase } from './services/HealthMemory';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { setItemSync } from './services/storage';
import { clearPersistedMDTSession } from './stores/useMDTStore';
import { flushSyncOutbox } from './services/SyncOutbox';

import Landing from './features/auth/Landing';
import Auth from './features/auth/Auth';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ProfileOnboarding from './features/profile/ProfileOnboarding';
import { ErrorBoundary } from 'react-error-boundary';
import FallbackError from './components/ui/FallbackError';
import NotFound from './components/ui/NotFound';
import { useToast } from './components/ui/ToastProvider';
import OfflineBanner from './components/ui/OfflineBanner';
import ConsentManager from './components/ui/ConsentManager';

import ProductTour from './components/ui/ProductTour';
import TopUpModal from './features/brand/TopUpModal';

// Lazy load heavy components
const MedicalProfile = React.lazy(() => import('./features/profile/MedicalProfile'));
const QuickConsult = React.lazy(() => import('./features/consultation/QuickConsult'));
const MDTHub = React.lazy(() => import('./features/mdt/MDTHub'));
const MyCases = React.lazy(() => import('./features/dashboard/MyCases'));
const PharmacyHub = React.lazy(() => import('./features/tools/PharmacyHub'));
const AvaHealthBuddy = React.lazy(() => import('./features/consultation/AvaHealthBuddy'));
const ClinicalReportAnalyzer = React.lazy(() => import('./features/tools/ClinicalReportAnalyzer'));
const JarvisInvestigator = React.lazy(() => import('./features/jarvis/JarvisInvestigator'));

const Settings = React.lazy(() => import('./features/profile/Settings'));
const Dietician = React.lazy(() => import('./features/dietician/Dietician'));
const CaseDashboard = React.lazy(() => import('./features/dashboard/CaseDashboard'));
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

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { info } = useToast();
  const [topUpFeature, setTopUpFeature] = React.useState<any>(null);

  useEffect(() => {
    const handleQuota = (e: any) => {
      // Map API operations to TopUpModal features
      const op = e.detail?.operation || '';
      if (op.includes('ava') || op.includes('buddy')) setTopUpFeature('ava_replies');
      else if (op.includes('quick')) setTopUpFeature('quick_consult');
      else if (op.includes('deep')) setTopUpFeature('deep_collab');
      else if (op.includes('jarvis')) setTopUpFeature('jarvis');
      else if (op.includes('lab')) setTopUpFeature('lab_report');
      else if (op.includes('pharmacy')) setTopUpFeature('pharmacy_hub');
    };
    window.addEventListener('hc_quota_exceeded', handleQuota);
    return () => window.removeEventListener('hc_quota_exceeded', handleQuota);
  }, []);

  useEffect(() => {
    const flush = () => { flushSyncOutbox().catch((error) => console.warn('Sync outbox flush failed', error)); };
    flush();
    window.addEventListener('online', flush);

    const handleLogout = async () => {
      try {
        const idb = await import('idb-keyval');
        await clearPersistedMDTSession();
        const keys = await idb.keys();
        for (const k of keys) {
          if (typeof k === 'string' && k.startsWith('hc_sync_outbox_')) continue;
          await idb.del(k);
        }
      } catch (e) {}
      
      try {
        const theme = localStorage.getItem('hc_theme');
        const consent = localStorage.getItem('hc_consent');
        sessionStorage.clear();
          // Preserve local-only Dietician data from destructive logout
          const preservedKeys: { key: string; value: string | null }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('hc_food_logs') || key.includes('hc_diet_profile') || key.includes('hc_hydration') || key.includes('hc_meal_plan') || key.includes('hc_diet_advice'))) {
              preservedKeys.push({ key, value: localStorage.getItem(key) });
            }
          }
          // Keep an offline account-scoped outbox across logout. It cannot be
          // read by another account, and deleting it here would silently lose
          // writes that are waiting for the next connection.
          const pendingOutbox: { key: string; value: string | null }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('hc_sync_outbox_')) pendingOutbox.push({ key, value: localStorage.getItem(key) });
          }
          localStorage.clear();
          preservedKeys.forEach(p => {
            if (p.value !== null) {
              localStorage.setItem(p.key, p.value);
            }
          });
          pendingOutbox.forEach(p => { if (p.value !== null) localStorage.setItem(p.key, p.value); });
        if (theme) localStorage.setItem('hc_theme', theme);
        if (consent) localStorage.setItem('hc_consent', consent);
        await supabase.auth.signOut();
      } catch (e) {}
      
      navigate('/', { replace: true });
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
    registerPushNotifications().catch(console.error);
    setupPushListeners();

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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          if (authBootstrapTimer) clearTimeout(authBootstrapTimer);
          setItemSync('isAuthenticated', 'true');
          
          if (localStorage.getItem('hc_guest_mode') === 'true') {
            const guestPrefix = 'hc_unified_profile_guest';
            const authPrefix = `hc_unified_profile_${session.user.id}`;
            
            const guestProfile = localStorage.getItem(guestPrefix);
            if (guestProfile) {
              try { localStorage.setItem(authPrefix, guestProfile); } catch(e) {}
              localStorage.removeItem(guestPrefix);
            }
            
            // Older features used both *_guest and *_guest_profile_1 key shapes.
            // Migrate every guest-scoped health key without guessing a suffix, so no guest work is stranded on sign-in.
            Object.keys(localStorage).forEach((key) => {
              if (!key.startsWith('hc_') || !key.includes('_guest')) return;
              const value = localStorage.getItem(key);
              if (!value) return;
              const targetKey = key.replace('_guest', `_${session.user.id}`);
              try { localStorage.setItem(targetKey, value); } catch(e) {}
              localStorage.removeItem(key);
            });
          }
          
          localStorage.removeItem('hc_guest_mode');
        
        // Sync account info from session to capture OAuth logins (like Google)
        const currentAccount = localStorage.getItem('hc_account');
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
        
        authBootstrapTimer = setTimeout(() => {
          void (async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession || currentSession.user.id !== session.user.id) return;

            // Sync user data only after the auth callback has returned.
            await syncProfileFromSupabase();
            await initCaseEngine();
            syncHealthMemoryFromSupabase().catch(console.error);
            // Existing timeline and case summaries become durable Health Memory automatically on sign-in.
            backfillHealthMemoryFromProfile();
            backfillCaseHealthMemory();

            // Auto-redirect if on a public page.
            const path = window.location.pathname;
            if (path === '/' || path === '/login' || path === '/signup' || path === '/onboarding') {
              const profileStr = localStorage.getItem(getProfileKey());
              let hasCompletedOnboarding = false;
              if (profileStr) {
                try {
                  const profileData = JSON.parse(profileStr);
                  if (profileData.profiles && profileData.activeId) {
                    const activeProfile = profileData.profiles[profileData.activeId];
                    hasCompletedOnboarding = !!(activeProfile?.onboardingCompletedAt || activeProfile?.demographics?.onboardingCompletedAt);
                  } else {
                    hasCompletedOnboarding = !!(profileData.onboardingCompletedAt || profileData.demographics?.onboardingCompletedAt);
                  }
                } catch (e) {
                  console.error(e);
                }
              }

              if (hasCompletedOnboarding) navigate('/app', { replace: true });
              else navigate('/onboarding', { replace: true });
            }
          })().catch((error) => console.error('Authenticated bootstrap failed', error));
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        if (authBootstrapTimer) {
          clearTimeout(authBootstrapTimer);
          authBootstrapTimer = null;
        }
        try {
          const theme = localStorage.getItem('hc_theme');
          const consent = localStorage.getItem('hc_consent');
          window.dispatchEvent(new Event('hc_logout'));
          clearCaseEngineCache();
          sessionStorage.clear();
          const pendingOutbox: { key: string; value: string | null }[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('hc_sync_outbox_')) pendingOutbox.push({ key, value: localStorage.getItem(key) });
          }
          localStorage.clear();
          if (theme) localStorage.setItem('hc_theme', theme);
          if (consent) localStorage.setItem('hc_consent', consent);
          pendingOutbox.forEach(p => { if (p.value !== null) localStorage.setItem(p.key, p.value); });
        } catch (e) {
          console.warn('Failed to clear localStorage on sign out', e);
        }
        
        info('Session ended', 'You have been logged out.');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      }
    });

    return () => {
      if (authBootstrapTimer) clearTimeout(authBootstrapTimer);
      subscription.unsubscribe();
    };
  }, [navigate, info]);

  return (
    <SafeRoute>
      <OfflineBanner />
      <ConsentManager />
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
                <CaseDashboard />
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
          
          {/* Redirects for old routes */}
          <Route path="/app/multi" element={<Navigate to="/app/consult" replace />} />
          <Route path="/app/mdthub" element={<Navigate to="/app/collab" replace />} />

          <Route
            path="/app/consult"
            element={
              <SafeRoute>
                <QuickConsult />
              </SafeRoute>
            }
          />
          <Route
            path="/app/collab"
            element={
              <SafeRoute>
                <MDTHub />
              </SafeRoute>
            }
          />
          <Route path="/app/case-prep" element={<SafeRoute><CasePrep /></SafeRoute>} />
          <Route path="/app/health-memory" element={<SafeRoute><HealthMemory /></SafeRoute>} />
          <Route path="/app/deep-collab-beta" element={<Navigate to="/app/case-prep" replace />} />
          <Route
            path="/app/pharmacy"
            element={
              <SafeRoute>
                <PharmacyHub />
              </SafeRoute>
            }
          />
          <Route
            path="/app/dietician"
            element={
              <SafeRoute>
                <Dietician />
              </SafeRoute>
            }
          />
          <Route
            path="/app/ava"
            element={
              <SafeRoute>
                <AvaHealthBuddy />
              </SafeRoute>
            }
          />
          <Route
            path="/app/reports"
            element={
              <SafeRoute>
                <ClinicalReportAnalyzer />
              </SafeRoute>
            }
          />
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
          <Route
            path="/app/jarvis"
            element={
              <SafeRoute>
                <JarvisInvestigator />
              </SafeRoute>
            }
          />

        </Route>
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
