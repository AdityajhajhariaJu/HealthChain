import React, { Suspense, useEffect } from 'react';
import { registerPushNotifications, setupPushListeners } from './services/PushService';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import Landing from './features/auth/Landing';
import Auth from './features/auth/Auth';
import AppShell from './components/layout/AppShell';
import ProfileOnboarding from './features/profile/ProfileOnboarding';
import { ErrorBoundary } from 'react-error-boundary';
import FallbackError from './components/ui/FallbackError';

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
          element={
            <PageTransition>
              <AppShell />
            </PageTransition>
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
        <Route path="*" element={<Navigate to="/app/today" replace />} />
      </Routes>
    </SafeRoute>
  );
}
