const fs = require('fs');
const path = require('path');

const patterns = {
  // CRITICAL
  "ForgotPassword": /forgot password|resetPasswordForEmail/i,
  "OAuth": /provider:\s*['"]google['"]|signInWithOAuth/i,
  "EmailVerification": /\/auth\/callback|exchangeCodeForSession/i,
  "SessionExpiry": /onAuthStateChange|expires_in/i,
  "AccountDeletion": /deleteUser|delete account/i,
  "GeminiExposed": /VITE_GEMINI_API_KEY/i,
  "BackendProxy": /fetch\(['"]\/api\/|axios\.post\(['"]\/api\//i,
  "CSP": /Content-Security-Policy/i,
  "RateLimiting": /rateLimit|upstash\/ratelimit/i,
  "PrivacyPolicy": /path=['"]\/privacy['"]|Privacy Policy/i,
  "TermsOfService": /path=['"]\/terms['"]|Terms of Service/i,
  "MedicalDisclaimer": /Not a substitute for professional medical advice|medical disclaimer/i,
  "CookieBanner": /CookieConsent|cookie banner/i,
  "HIPAADisclosure": /HIPAA/i,
  "GDPRExport": /exportData|GDPR/i,
  
  // HIGH PRIORITY
  "SpinnerAuth": /isSubmitting|loading|Loader2/i,
  "RememberMe": /remember me/i,
  "PasswordStrength": /zxcvbn|password strength/i,
  "ConfirmPassword": /confirm password|confirmPassword/i,
  "404Page": /path=['"]\*['"]|404|NotFound/i,
  "RouteGuards": /RequireAuth|ProtectedRoute/i,
  "Breadcrumbs": /Breadcrumb/i,
  "Toast": /toast\(|react-hot-toast|sonner/i,
  "RetryMechanism": /retry|useQuery/i,
  "OfflineBanner": /offline|useNetwork/i,
  "ConflictResolution": /last-write-wins|conflict/i,
  "ExportData": /export as json|export as csv/i,
  "ImportData": /import data|Apple Health/i,
  "BackupRestore": /backup|restore/i,
  
  // MEDIUM PRIORITY
  "Skeleton": /Skeleton/i,
  "OnboardingTour": /driver\.js|intro\.js|joyride|onboarding tour/i,
  "GlobalSearch": /global search|ctrl\+k|Cmd\+K/i,
  "KeyboardShortcuts": /hotkeys|useHotkeys/i,
  "UndoRedo": /undo|redo/i,
  "ConfirmationDialog": /confirm dialog|Are you sure/i,
  "Pagination": /paginate|page=/i,
  "ARIALabels": /aria-label/i,
  "SkipLink": /skip-link|skip to content/i,
  "FocusTrap": /focus-trap/i,
  "ImageOptimization": /loading=["']lazy["']|WebP|AVIF/i,
  "PullToRefresh": /pull-to-refresh|capacitor\/core/i,
  "HapticFeedback": /Haptics/i,
  "BottomSheet": /bottom sheet|drawer/i,
  
  // NICE-TO-HAVE
  "MetaPixel": /fbq|Meta Pixel/i,
  "PostHog": /posthog/i,
  "Mixpanel": /mixpanel/i,
  "ABTesting": /A\/B|split test/i,
  "Referral": /referral|invite code/i,
  "FeedbackWidget": /Was this helpful/i,
  "Stripe": /stripe|razorpay/i,
  "PricingPage": /\/pricing/i
};

const results = {};
for (const key in patterns) results[key] = [];

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'playwright-report' || file === 'test-results') continue;
    
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.md')) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const [key, regex] of Object.entries(patterns)) {
        if (regex.test(content)) {
          results[key].push(filePath);
        }
      }
    }
  }
}

walkDir(path.join(__dirname, 'src'));
walkDir(path.join(__dirname, 'api')); // just in case there is a backend

for (const [key, files] of Object.entries(results)) {
  if (files.length > 0) {
    console.log(`[${key}] FOUND in ${files.length} files`);
  } else {
    console.log(`[${key}] NOT FOUND`);
  }
}
