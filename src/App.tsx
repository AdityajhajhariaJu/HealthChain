import { useViewportLayout } from './hooks/useViewportLayout';
import { Loader2 } from 'lucide-react';
import React, { Suspense, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AccountRuntime from './components/layout/AccountRuntime';
import ConsentManager from './components/ui/ConsentManager';
import AIConsentDialog from './components/ui/AIConsentDialog';
import ProductMeasurement from './components/ui/ProductMeasurement';
import FallbackError from './components/ui/FallbackError';
import NotFound from './components/ui/NotFound';
import OfflineBanner from './components/ui/OfflineBanner';
import { useToast } from './components/ui/ToastProvider';
import { initGlobalHaptics } from './services/haptics';
import { installNativeAuthCallbacks } from './services/NativeAuth';

const ProtectedRoute = React.lazy(() => import('./components/layout/ProtectedRoute'));

const WarRoomRedirect = React.lazy(() => import('./features/dashboard/LegacyCaseRedirect'));
const TopUpModal = React.lazy(() => import('./features/brand/TopUpModal'));
const Landing = React.lazy(() => import('./features/auth/Landing'));
const Auth = React.lazy(() => import('./features/auth/Auth'));
const AuthCallback = React.lazy(() => import('./features/auth/AuthCallback'));
const AppShell = React.lazy(() => import('./components/layout/AppShell'));
const AdminContentDashboard = React.lazy(() =>
  import('./features/admin/AdminContentDashboard').then((m) => ({
    default: m.AdminContentDashboard,
  }))
);
const ProfileOnboarding = React.lazy(() => import('./features/profile/ProfileOnboarding'));

// Lazy load heavy components
const MedicalProfile = React.lazy(() => import('./features/profile/MedicalProfile'));
const ConsultPage = React.lazy(() => import('./features/consultation/ConsultPage'));
const MyCases = React.lazy(() => import('./features/dashboard/MyCases'));
const AvaHealthBuddy = React.lazy(() => import('./features/consultation/AvaHealthBuddyRoute'));

const Settings = React.lazy(() => import('./features/profile/Settings'));
const Dietician = React.lazy(() => import('./features/dietician/Dietician'));
const CaseDashboard = React.lazy(() => import('./features/dashboard/CaseDashboard'));
const ProgressGallery = React.lazy(() => import('./features/dashboard/ProgressGallery'));
const TrophyCabinet = React.lazy(() => import('./features/dashboard/TrophyCabinet'));
const ClinicalTrialsMatcher = React.lazy(() => import('./features/tools/ClinicalTrialsMatcher'));
const PrivacyPolicy = React.lazy(() => import('./features/legal/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./features/legal/TermsOfService'));
const ReviewerDemo = React.lazy(() => import('./features/legal/ReviewerDemo'));
const LegalPage = React.lazy(() => import('./features/legal/LegalPage'));
const UpdatePassword = React.lazy(() => import('./features/auth/UpdatePassword'));

const Changelog = React.lazy(() => import('./features/brand/Changelog'));
const HelpCenter = React.lazy(() => import('./features/brand/HelpCenter'));
const Pricing = React.lazy(() => import('./features/brand/Pricing'));
const CasePrep = React.lazy(() => import('./features/experience/CasePrep'));
const HealthMemory = React.lazy(() => import('./features/experience/HealthMemory'));
const OnboardingFlow = React.lazy(() => import('./features/onboarding/OnboardingFlow'));
const NutritionInterceptor = React.lazy(() =>
  import('./features/dietician/NutritionInterceptor').then((m) => ({
    default: m.NutritionInterceptor,
  }))
);
const CaseDetail = React.lazy(() => import('./features/dashboard/CaseDetail'));

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <div className="hc-page-enter" style={{ height: '100%' }}>
    {children}
  </div>
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
  if (caseId)
    return <Navigate to={`/app/cases/${encodeURIComponent(caseId)}?tab=records`} replace />;
  return (
    <Navigate
      to={
        location.pathname === '/app/pharmacy' ||
        (!location.hash && location.pathname === '/app/medicine-lab')
          ? '/app/profile'
          : '/app/my-cases'
      }
      replace
    />
  );
};

const VIP_HASH = 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a';

async function sha256Hex(str: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

export default function App() {
  useViewportLayout();
  const navigate = useNavigate();
  const { info } = useToast();
  const [topUpFeature, setTopUpFeature] = React.useState<any>(null);

  useEffect(() => installNativeAuthCallbacks(navigate), [navigate]);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let cleanupApple: (() => void) | undefined;
    // Keep native billing and its account services outside the web startup bundle.
    void import('@capacitor/core').then(async ({ Capacitor }) => {
      if (disposed || Capacitor.getPlatform() === 'web') return;
      const store = await import('./services/StorePurchases');
      if (!disposed) cleanup = store.installStorePurchaseRecovery();
      if (!disposed && Capacitor.getPlatform() === 'ios') {
        const apple = await import('./services/AppleSignIn');
        if (!disposed) cleanupApple = apple.installAppleCredentialChecks();
      }
    }).catch(() => {});
    return () => { disposed = true; cleanup?.(); cleanupApple?.(); };
  }, []);
  useEffect(() => {
    initGlobalHaptics();
  }, []);

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
            info(
              '🎉 VIP Tester Pass Activated! All 16 AI Specialists & Pro features are unlocked.'
            );
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
    let active = true;
    const handleQuota = async (e: any) => {
      const { getProfile } = await import('./services/ProfileEngine');
      if (!active) return;
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
    return () => {
      active = false;
      window.removeEventListener('hc_quota_exceeded', handleQuota);
    };
  }, [navigate]);

  return (
    <SafeRoute>
      <OfflineBanner />
      <ConsentManager />
      <ProductMeasurement />
      <AIConsentDialog />
      <AccountRuntime />
      <Routes>
        <Route path="/terms-policies" element={<SafeRoute><LegalPage hub /></SafeRoute>} />
        <Route path="/acceptable-use" element={<SafeRoute><LegalPage document="acceptableUse" /></SafeRoute>} />
        <Route path="/app-license" element={<SafeRoute><LegalPage document="appLicense" /></SafeRoute>} />
        <Route path="/consumer-health-privacy" element={<SafeRoute><LegalPage document="consumerHealth" /></SafeRoute>} />
        <Route path="/privacy-security" element={<SafeRoute><LegalPage document="security" /></SafeRoute>} />
        <Route path="/delete-account" element={<SafeRoute><LegalPage document="deletion" /></SafeRoute>} />
        <Route
          path="/"
          element={
            <SafeRoute>
              <Landing />
            </SafeRoute>
          }
        />
        <Route
          path="/auth/callback"
          element={
            <SafeRoute>
              <AuthCallback />
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
        <Route
          path="/review-demo"
          element={
            <PageTransition>
              <SafeRoute>
                <ReviewerDemo />
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
            path="/app/onboarding"
            element={
              <SafeRoute>
                <OnboardingFlow />
              </SafeRoute>
            }
          />
          <Route
            path="/app/progress"
            element={
              <SafeRoute>
                <ProgressGallery />
              </SafeRoute>
            }
          />
          <Route
            path="/app/trophies"
            element={
              <SafeRoute>
                <TrophyCabinet />
              </SafeRoute>
            }
          />
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
          <Route
            path="/app/case-prep"
            element={
              <SafeRoute>
                <CasePrep />
              </SafeRoute>
            }
          />
          <Route
            path="/app/health-memory"
            element={
              <SafeRoute>
                <HealthMemory />
              </SafeRoute>
            }
          />
          <Route path="/app/deep-collab-beta" element={<PreservedNavigate to="/app/case-prep" />} />
          <Route path="/app/medicine-lab" element={<RetiredMedicineLabRedirect />} />
          <Route path="/app/pharmacy" element={<RetiredMedicineLabRedirect />} />
          <Route path="/app/nutrition" element={<PreservedNavigate to="/app/dietician" />} />
          <Route
            path="/app/nutrition-log"
            element={
              <SafeRoute>
                <NutritionInterceptor />
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
          <Route
            path="/app/admin/content"
            element={
              <SafeRoute>
                <AdminContentDashboard />
              </SafeRoute>
            }
          />
        </Route>
        <Route path="/index.html" element={<Navigate to="/" replace />} />
        <Route
          path="*"
          element={
            <SafeRoute>
              <NotFound />
            </SafeRoute>
          }
        />
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
