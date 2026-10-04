/**
 * Optional first-party measurement. No health text, advertising pixels or
 * external analytics dispatch. Unknown events/parameters are discarded.
 */
import { Capacitor } from '@capacitor/core';
import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { getItemSync, removeItemSync, setItemSync } from './storage';
import { apiEndpoint } from './ApiEndpoint';
import { MEASUREMENT_VERSION, metricPayload } from '../../shared/product-metrics.js';

declare global {
  interface Window { fbq: any; AF_init?: any; gtag?: (...args: any[]) => void; }
}
export const ANALYTICS_CONSENT_KEY = 'hc_cookies_accepted';
export const MEASUREMENT_VERSION_KEY = 'hc_measurement_version';
export const PRIVACY_PREFERENCES_EVENT = 'hc_privacy_preferences_changed';
const activeRequests = new Set<AbortController>();
const globalPrivacyControl = () => typeof navigator !== 'undefined' &&
  (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
export const hasAnalyticsConsent = () => !globalPrivacyControl() && getItemSync(ANALYTICS_CONSENT_KEY) === 'accepted' &&
  getItemSync(MEASUREMENT_VERSION_KEY) === MEASUREMENT_VERSION;
export function setAnalyticsConsent(accepted: boolean) {
  accepted = accepted && !globalPrivacyControl();
  setItemSync(ANALYTICS_CONSENT_KEY, accepted ? 'accepted' : 'declined');
  if (accepted) setItemSync(MEASUREMENT_VERSION_KEY, MEASUREMENT_VERSION);
  else {
    removeItemSync(MEASUREMENT_VERSION_KEY);
    for (const request of activeRequests) request.abort();
    activeRequests.clear();
  }
  removeItemSync('hc_anon_id');
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PRIVACY_PREFERENCES_EVENT));
}
export const safeAnalyticsPayload = metricPayload;
export const trackEvent = (eventName: string, payload: unknown = {}) => {
  if (!hasAnalyticsConsent() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
  const safePayload = safeAnalyticsPayload(eventName, payload);
  if (!safePayload) return;
  const scope = captureAccountScope();
  // Allow withdrawal/account changes to cancel before dispatch. Never queue or retry.
  void Promise.resolve().then(async () => {
    if (!hasAnalyticsConsent() || !isAccountScopeCurrent(scope)) return;
    const controller = new AbortController();
    activeRequests.add(controller);
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(apiEndpoint('/api/product-metrics'), {
        method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json', 'X-HC-Measurement-Consent': MEASUREMENT_VERSION },
        body: JSON.stringify({ event: eventName, dimension: safePayload.dimension, platform: Capacitor.getPlatform() }),
        signal: controller.signal,
      });
    } catch { /* Optional measurement must never interrupt the user's task. */ }
    finally { clearTimeout(timeout); activeRequests.delete(controller); }
  });
};
export const trackPageView = (path: string) => trackEvent('page_view', { path });
export const trackFeatureUsed = (feature: string, _metadata: unknown = {}) => trackEvent('feature_used', { feature });
export const trackButtonClick = (button: string, _context = '') => trackEvent('button_click', { button });
export const trackCheckoutInitiated = (value: number, _planId?: string) => trackEvent('begin_checkout', { value });
export const trackPurchase = (value: number, _planId?: string) => trackEvent('purchase', { value });
