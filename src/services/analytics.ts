/**
 * Optional first-party measurement. No health text, advertising pixels or
 * external analytics dispatch. Unknown events/parameters are discarded.
 */
import { Capacitor } from '@capacitor/core';
import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { getItemSync, removeItemSync, setItemSync } from './storage';

declare global {
  interface Window { fbq: any; AF_init?: any; gtag?: (...args: any[]) => void; }
}
export const ANALYTICS_CONSENT_KEY = 'hc_cookies_accepted';
export const PRIVACY_PREFERENCES_EVENT = 'hc_privacy_preferences_changed';
const globalPrivacyControl = () => typeof navigator !== 'undefined' &&
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
export const hasAnalyticsConsent = () => !globalPrivacyControl() && getItemSync(ANALYTICS_CONSENT_KEY) === 'accepted';
export function setAnalyticsConsent(accepted: boolean) {
  accepted = accepted && !globalPrivacyControl();
  setItemSync(ANALYTICS_CONSENT_KEY, accepted ? 'accepted' : 'declined');
  if (!accepted) removeItemSync('hc_anon_id');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PRIVACY_PREFERENCES_EVENT));
}
const SAFE_BUTTONS = new Set(['Get Started', 'feedback_submitted',
  'clinical_parent_pillar_select', 'clinical_station_jump', 'clinical_parent_pillar_open']);
const SAFE_FEATURES = new Set(['daily_checkin', 'today']);
const SAFE_PUBLIC_PATHS = new Set(['/', '/pricing', '/privacy', '/terms', '/terms-policies',
  '/privacy-security', '/delete-account', '/acceptable-use', '/app-license',
  '/consumer-health-privacy', '/login', '/signup', '/help', '/review-demo']);
export function safeAnalyticsPayload(eventName: string, payload: unknown): Record<string, string | number> | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const input = payload as Record<string, unknown>;
  if (eventName === 'page_view' && typeof input.path === 'string') {
    const path = input.path.split(/[?#]/, 1)[0];
    if (SAFE_PUBLIC_PATHS.has(path)) return { page: path };
    if (path === '/app' || path.startsWith('/app/')) return { page: 'workspace' };
    return null;
  }
  if (eventName === 'feature_used' && typeof input.feature === 'string' && SAFE_FEATURES.has(input.feature))
    return { feature: input.feature };
  if (eventName === 'button_click' && typeof input.button === 'string' && SAFE_BUTTONS.has(input.button))
    return { button: input.button };
  if (['begin_checkout', 'purchase'].includes(eventName) && typeof input.value === 'number' &&
      Number.isFinite(input.value) && input.value >= 0 && input.value <= 1000000)
    return { value: input.value, currency: 'INR' };
  return null;
}
export const trackEvent = (eventName: string, payload: unknown = {}) => {
  if (!hasAnalyticsConsent()) return;
  const safePayload = safeAnalyticsPayload(eventName, payload);
  if (!safePayload) return;
  const scope = captureAccountScope();
  void import('./supabaseClient').then(async ({ supabase }) => {
    if (!hasAnalyticsConsent() || !isAccountScopeCurrent(scope)) return;
    const { data } = await supabase.auth.getSession();
    if (!hasAnalyticsConsent() || !isAccountScopeCurrent(scope)) return;
    const userId = scope.accountId === 'guest' ? null : scope.accountId;
    if (userId && data?.session?.user?.id !== userId) return;
    return supabase.from('analytics_events').insert({
      event_name: eventName, event_params: safePayload, user_id: userId,
      platform: Capacitor.getPlatform(), created_at: new Date().toISOString(),
    });
  }).then((res: any) => {
    if (res?.error && import.meta.env.DEV) console.warn('Product measurement unavailable.');
  }).catch(() => {
    if (import.meta.env.DEV) console.warn('Product measurement unavailable.');
  });
};
export const trackPageView = (path: string) => trackEvent('page_view', { path });
export const trackFeatureUsed = (feature: string, _metadata: unknown = {}) => trackEvent('feature_used', { feature });
export const trackButtonClick = (button: string, _context = '') => trackEvent('button_click', { button });
export const trackCheckoutInitiated = (value: number, _planId?: string) => trackEvent('begin_checkout', { value });
export const trackPurchase = (value: number, _planId?: string) => trackEvent('purchase', { value });
