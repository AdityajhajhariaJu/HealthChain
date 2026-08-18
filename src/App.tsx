import React, { Suspense, useEffect } from 'react';
import { registerPushNotifications, setupPushListeners } from './services/PushService';
import { syncProfileFromSupabase, getProfileKey, backfillHealthMemoryFromProfile } from './services/ProfileEngine';
import { syncCasesFromSupabase, backfillCaseHealthMemory } from './services/CaseEngine';
import { syncHealthMemoryFromSupabase } from './services/HealthMemory';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { setItemSync } from './services/storage';

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

// Lazy load heavy components
const MedicalProfile = React.lazy(() => import('./features/profile/MedicalProfile'));
const QuickConsult = React.lazy(() => import('./features/consultation/QuickConsult'));
const MDTHub = React.lazy(() => import('./features/mdt/MDTHub'));
const MyCases = React.lazy(() => import('./features/dashboard/MyCases'));
const PharmacyHub = React.lazy(() => import('./features/tools/PharmacyHub'));
const AvaHealthBuddy = React.lazy(() => import('./features/consultation/AvaHealthBuddy'));
const ClinicalReportAnalyzer = React.lazy(() => import('./features/tools/ClinicalReportAnalyzer'));
const Settings = React.lazy(() => import('./features/profile/Settings'));
const Dietician = React.lazy(() => import('./features/dietician/Dietician'));
const CaseDashboard = React.lazy(() => import('./features/dashboard/CaseDashboard'));
const ClinicalTrialsMatcher = React.lazy(() => import('./features/tools/ClinicalTrialsMatcher'));
const PrivacyPolicy = React.lazy(() => import('./features/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./features/legal/TermsOfService'));
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

    // Global Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          setItemSync('isAuthenticated', 'true');
          
          if (localStorage.getItem('hc_guest_mode') === 'true') {
            const guestPrefix = 'hc_unified_profile_guest';
            const authPrefix = `hc_unified_profile_${session.user.id}`;
            
            const guestProfile = localStorage.getItem(guestPrefix);
            if (guestProfile) {
              localStorage.setItem(authPrefix, guestProfile);
              localStorage.removeItem(guestPrefix);
            }
            
            // Older features used both *_guest and *_guest_profile_1 key shapes.
            // Migrate every guest-scoped health key without guessing a suffix, so no guest work is stranded on sign-in.
            Object.keys(localStorage).forEach((key) => {
              if (!key.startsWith('hc_') || !key.includes('_guest')) return;
              const value = localStorage.getItem(key);
              if (!value) return;
              const targetKey = key.replace('_guest', `_${session.user.id}`);
              localStorage.setItem(targetKey, value);
              localStorage.removeItem(key);
            });
          }
          
          localStorage.removeItem('hc_guest_mode');
        
        // Sync account info from session to capture OAuth logins (like Google)
        const currentAccount = localStorage.getItem('hc_account');
        const parsedAccount = currentAccount ? JSON.parse(currentAccount) : {};
        setItemSync(
          'hc_account',
          JSON.stringify({
            ...parsedAccount,
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || parsedAccount.name || '',
          })
        );
        
        // Sync user data now that they are authenticated
        await syncProfileFromSupabase();
        syncCasesFromSupabase();
        syncHealthMemoryFromSupabase().catch(console.error);
        // Existing timeline and case summaries become durable Health Memory automatically on sign-in.
        backfillHealthMemoryFromProfile();
        backfillCaseHealthMemory();
        
        // Auto-redirect if on a public page
        const path = window.location.pathname;
        if (path === '/' || path === '/login' || path === '/signup') {
          const profileStr = localStorage.getItem(getProfileKey());
          let hasCompletedOnboarding = false;
          if (profileStr) {
            try {
              const profileData = JSON.parse(profileStr);
              hasCompletedOnboarding = !!profileData.onboardingCompletedAt;
            } catch (e) {
              console.error(e);
            }
          }
          
          if (hasCompletedOnboarding) {
            navigate('/app', { replace: true });
          } else {
            navigate('/onboarding', { replace: true });
          }
        }
      } else if (event === 'SIGNED_OUT') {
        const theme = localStorage.getItem('hc_theme');
        const consent = localStorage.getItem('hc_consent');
        window.dispatchEvent(new Event('hc_logout'));
        localStorage.clear();
        if (theme) localStorage.setItem('hc_theme', theme);
        if (consent) localStorage.setItem('hc_consent', consent);
        
        info('Session ended', 'You have been logged out.');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 500);
      }
    });

    return () => subscription.unsubscribe();
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
            <PageTransition>
              <Landing />
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              <Auth />
            </PageTransition>
          }
        />
        <Route
          path="/signup"
          element={
            <PageTransition>
              <Auth />
            </PageTransition>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <PageTransition>
                <ProfileOnboarding />
              </PageTransition>
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
              <PageTransition>
                <AppShell />
              </PageTransition>
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

        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SafeRoute>
  );
}
