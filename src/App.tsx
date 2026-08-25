import React, { Suspense, useEffect } from 'react';
import { registerPushNotifications, setupPushListeners } from './services/PushService';
import { syncProfileFromSupabase, getProfileKey, getProfileEngineState, backfillHealthMemoryFromProfile, getProfile } from './services/ProfileEngine';
import { ensureWelcomeGrant } from './services/VitalityPointsEngine';
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

import { openTrialModal } from './services/TrialEngine';

const ProRoute = ({ children, featureName = 'Premium Specialist Suite' }: { children: React.ReactNode; featureName?: string }) => {
  const profile = getProfile();
  if (!profile?.isPro) {
    setTimeout(() => openTrialModal(featureName), 80);
    return <Navigate to="/app/today" replace />;
  }
  return <SafeRoute>{children}</SafeRoute>;
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
  const location = useLocation();
  const navigate = useNavigate();
  const { info } = useToast();
  const [topUpFeature, setTopUpFeature] = React.useState<any>(null);

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
      else if (op.includes('pharmacy')) setTopUpFeature('pharmacy_hub');
    };
    window.addEventListener('hc_quota_exceeded', handleQuota);
    return () => window.removeEventListener('hc_quota_exceeded', handleQuota);
  }, []);

  useEffect(() => {
    ensureWelcomeGrant();
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
    let lastSignedInAt = 0; // Timestamp of last SIGNED_IN to debounce false SIGNED_OUT races
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session) {
          if (authBootstrapTimer) clearTimeout(authBootstrapTimer);
          lastSignedInAt = Date.now();
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
        
        // Use the session from the event directly — do NOT re-call getSession()
        // inside this callback. Re-calling getSession() acquires the internal
        // Supabase lock, which is already held during onAuthStateChange dispatch,
        // causing a deadlock or returning stale data from async storage.
        authBootstrapTimer = setTimeout(() => {
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

            const path = window.location.pathname;
            if (path === '/' || path === '/login' || path === '/signup' || path === '/onboarding') {
              const profileStr = localStorage.getItem(getProfileKey());
              let hasCompletedOnboarding = false;
              if (profileStr) {
                try {
                  const profileData = JSON.parse(profileStr);
                  if (profileData.profiles && profileData.activeId) {
                    const activeProfile = profileData.profiles[profileData.activeId];
                    hasCompletedOnboarding = !!(
                      activeProfile?.onboardingCompletedAt || 
                      activeProfile?.demographics?.onboardingCompletedAt ||
                      activeProfile?.demographics?.age ||
                      activeProfile?.demographics?.gender
                    );
                  } else {
                    hasCompletedOnboarding = !!(
                      profileData.onboardingCompletedAt || 
                      profileData.demographics?.onboardingCompletedAt || 
                      profileData.demographics?.age
                    );
                  }
                } catch (e) {
                  console.error(e);
                }
              }

              if (hasCompletedOnboarding) navigate('/app', { replace: true });
              else navigate('/onboarding', { replace: true });
            }

            // Sync other background data
            try {
              await initCaseEngine();
              syncHealthMemoryFromSupabase().catch(console.error);
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
          if (theme) localStorage.setItem('hc_theme', theme);
          if (consent) localStorage.setItem('hc_consent', consent);
        } catch (e) {
          console.warn('Failed to cleanup on sign out', e);
        }
        
        const path = window.location.pathname;
        if (path.startsWith('/app')) {
          info('Session ended', 'You have been logged out.');
          setTimeout(() => {
            navigate('/', { replace: true });
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

          <Route path="/app/pricing" element={<Navigate to="/pricing" replace />} />
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
