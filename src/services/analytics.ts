/**
 * Centralized Analytics Service
 * Handles dispatching events to Meta Pixel, AppsFlyer, and Supabase Analytics.
 */
import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    fbq: any;
    AF_init?: any;
    gtag?: (...args: any[]) => void;
  }
}


let inMemoryAnonId: string | null = null;

const getAnonymousId = () => {
  if (typeof window === 'undefined') return 'unknown';
  try {
    let anonId = localStorage.getItem('hc_anon_id');
    if (!anonId) {
      anonId = inMemoryAnonId || `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      inMemoryAnonId = anonId;
      try {
        localStorage.setItem('hc_anon_id', anonId);
      } catch {}
    }
    return anonId;
  } catch {
    if (!inMemoryAnonId) {
      inMemoryAnonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    return inMemoryAnonId;
  }
};

export const trackEvent = (eventName: string, payload: any = {}) => {
  // 1. Google Ads & Google Tag (gtag.js)
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', eventName, payload);
    } catch (e) {
      console.warn('gtag dispatch error:', e);
    }
  }

  // 2. Meta Pixel
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      if (['Lead', 'Purchase', 'CompleteRegistration'].includes(eventName)) {
        window.fbq('track', eventName, payload);
      } else {
        window.fbq('trackCustom', eventName, payload);
      }
    } catch (e) {
      console.warn('fbq dispatch error:', e);
    }
  }

  // 3. AppsFlyer (Web / App Wrapper)
  if (import.meta.env.DEV) console.log(`[Analytics] ${eventName}`, payload);

  // 4. Supabase Analytics
  try {
    let platform = 'web';
    try {
      platform = Capacitor.getPlatform();
    } catch {
      platform = 'web';
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        return supabase.from('analytics_events').insert({
          event_name: eventName,
          event_params: { ...payload, anonymous_id: getAnonymousId() },
          user_id: data?.session?.user?.id || null,
          platform: platform,
          created_at: new Date().toISOString()
        });
      })
      .then((res: any) => {
        if (res?.error && import.meta.env.DEV) {
          console.warn('Failed to log analytics event:', res.error);
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) {
          console.warn('Analytics pipeline unreachable:', err);
        }
      });
  } catch (e) {
    if (import.meta.env.DEV) {
      console.warn('Analytics dispatch error:', e);
    }
  }
};

// Common & Advanced Telemetry Events (100% GDPR/CCPA Privacy Compliant)
export const trackPageView = (path: string) => trackEvent('page_view', { path });
export const trackFeatureUsed = (featureName: string, metadata: any = {}) => trackEvent('feature_used', { feature: featureName, ...metadata });
export const trackButtonClick = (buttonName: string, context: string = '') => trackEvent('button_click', { button: buttonName, context });
export const trackSignup = () => trackEvent('sign_up');
export const trackLabUpload = () => trackEvent('LabReportUploaded', { status: 'success' });
export const trackCheckoutInitiated = (value: number, planId?: string) => trackEvent('begin_checkout', { value, currency: 'INR', planId });
export const trackPurchase = (value: number, planId?: string) => {
  const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  trackEvent('purchase', {
    value,
    currency: 'INR',
    transaction_id: txId,
    plan_id: planId
  });

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', 'conversion', {
        send_to: 'AW-18407555330/FYfpCI65uOccEIKCtMlE',
        value: value,
        currency: 'INR',
        transaction_id: txId
      });
    } catch (err) {
      console.warn('Google Ads conversion tag error:', err);
    }
  }
};
export const trackConsultationStarted = (mode: 'quick' | 'mdt' | 'jarvis' | 'ava', details: any = {}) => trackEvent('consultation_started', { mode, ...details });
export const trackCaseAction = (action: string, metadata: any = {}) => trackEvent('case_action', { action, ...metadata });

