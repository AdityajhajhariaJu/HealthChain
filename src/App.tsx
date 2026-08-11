import React, { Suspense, useEffect } from 'react';
import { registerPushNotifications, setupPushListeners } from './services/PushService';
import { syncProfileFromSupabase } from './services/ProfileEngine';
import { syncCasesFromSupabase } from './services/CaseEngine';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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

// Lazy load heavy components
const MedicalProfile = React.lazy(() => import('./features/profile/MedicalProfile'));
const MultiSpecialist = React.lazy(() => import('./features/mdt/MultiSpecialist'));
const MDTHub = React.lazy(() => import('./features/mdt/MDTHub'));
const MyCases = React.lazy(() => import('./features/dashboard/MyCases'));
const PharmacyHub = React.lazy(() => import('./features/tools/PharmacyHub'));
const TalkBuddy = React.lazy(() => import('./features/consultation/TalkBuddy'));
const ClinicalReportAnalyzer = React.lazy(() => import('./features/tools/ClinicalReportAnalyzer'));
const Settings = React.lazy(() => import('./features/profile/Settings'));
const Dietician = React.lazy(() => import('./features/dietician/Dietician'));
const CaseDashboard = React.lazy(() => import('./features/dashboard/CaseDashboard'));
const ClinicalTrialsMatcher = React.lazy(() => import('./features/tools/ClinicalTrialsMatcher'));
const PrivacyPolicy = React.lazy(() => import('./features/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./features/legal/TermsOfService'));

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

  useEffect(() => {
    registerPushNotifications().catch(console.error);
    setupPushListeners();
    syncProfileFromSupabase();
    syncCasesFromSupabase();

    // Global Auth Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        setItemSync('isAuthenticated', 'true');
        
        // Auto-redirect if on a public page
        const path = window.location.pathname;
        if (path === '/' || path === '/login' || path === '/signup') {
          // If they have a profile saved locally, take them to the app. Otherwise, onboarding.
          const hasProfile = !!localStorage.getItem('hc_profile');
          if (hasProfile) {
            window.location.href = '/app';
          } else {
            window.location.href = '/onboarding';
          }
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('hc_account');
        window.location.href = '/';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SafeRoute>
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
            <PageTransition>
              <ProfileOnboarding />
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
          <Route
            path="/app/multi"
            element={
              <SafeRoute>
                <MultiSpecialist />
              </SafeRoute>
            }
          />
          <Route
            path="/app/mdthub"
            element={
              <SafeRoute>
                <MDTHub />
              </SafeRoute>
            }
          />
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
            path="/app/talkbuddy"
            element={
              <SafeRoute>
                <TalkBuddy />
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
