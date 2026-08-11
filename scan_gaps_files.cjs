const fs = require('fs');
const path = require('path');

const patterns = {
  "ForgotPassword": /forgot password|resetPasswordForEmail/i,
  "OAuth": /provider:\s*['"]google['"]|signInWithOAuth/i,
  "SessionExpiry": /onAuthStateChange|expires_in/i,
  "AccountDeletion": /deleteUser|delete account/i,
  "GeminiExposed": /VITE_GEMINI_API_KEY/i,
  "PrivacyPolicy": /path=['"]\/privacy['"]|Privacy Policy/i,
  "TermsOfService": /path=['"]\/terms['"]|Terms of Service/i,
  "MedicalDisclaimer": /Not a substitute for professional medical advice|medical disclaimer/i,
  "HIPAADisclosure": /HIPAA/i,
  "GDPRExport": /exportData|GDPR/i,
  "SpinnerAuth": /isSubmitting|loading|Loader2/i,
  "RememberMe": /remember me/i,
  "ConfirmPassword": /confirm password|confirmPassword/i,
  "404Page": /path=['"]\*['"]|404|NotFound/i,
  "RouteGuards": /RequireAuth|ProtectedRoute/i,
  "Breadcrumbs": /Breadcrumb/i,
  "Toast": /toast\(|react-hot-toast|sonner/i,
  "RetryMechanism": /retry|useQuery/i,
  "OfflineBanner": /offline|useNetwork/i,
  "ConflictResolution": /last-write-wins|conflict/i,
  "ImportData": /import data|Apple Health/i,
  "BackupRestore": /backup|restore/i,
  "Skeleton": /Skeleton/i,
  "GlobalSearch": /global search|ctrl\+k|Cmd\+K/i,
  "UndoRedo": /undo|redo/i,
  "ConfirmationDialog": /confirm dialog|Are you sure/i,
  "Pagination": /paginate|page=/i,
  "ARIALabels": /aria-label/i,
  "SkipLink": /skip-link|skip to content/i,
  "PullToRefresh": /pull-to-refresh|capacitor\/core/i,
  "HapticFeedback": /Haptics/i,
  "BottomSheet": /bottom sheet|drawer/i,
  "MetaPixel": /fbq|Meta Pixel/i,
  "PostHog": /posthog/i,
  "Mixpanel": /mixpanel/i,
  "ABTesting": /A\/B|split test/i,
  "Stripe": /stripe|razorpay/i,
  "PricingPage": /\/pricing/i
};

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
          console.log(`[${key}] ${filePath}`);
        }
      }
    }
  }
}

walkDir(path.join(__dirname, 'src'));
