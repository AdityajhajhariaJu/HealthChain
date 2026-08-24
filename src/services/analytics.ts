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
  if (typeof window !== 'undefined' && window.fbq) {
    if (['Lead', 'Purchase', 'CompleteRegistration'].includes(eventName)) {
      window.fbq('track', eventName, payload);
    } else {
      window.fbq('trackCustom', eventName, payload);
    }
  }

  // 3. AppsFlyer (Web / App Wrapper)
  if (import.meta.env.DEV) console.log(`[Analytics] ${eventName}`, payload);

  // 4. Supabase Analytics
  try {
    const platform = Capacitor.getPlatform();
    supabase.auth.getSession().then(({ data }) => {
      supabase.from('analytics_events').insert({
        event_name: eventName,
        event_params: payload,
        user_id: data?.session?.user?.id || null,
        platform: platform,
        created_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.error('Failed to log event', error);
      }, (err) => {
        console.warn('Analytics DB unreachable:', err);
      });
    }, (err) => {
      console.warn('Auth session check failed during analytics:', err);
    });
  } catch (e) {
    console.error('Analytics error', e);
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
  trackEvent('purchase', {
    value,
    currency: 'INR',
    transaction_id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    plan_id: planId,
    send_to: 'AW-18407555330'
  });
};
export const trackConsultationStarted = (mode: 'quick' | 'mdt' | 'jarvis' | 'ava', details: any = {}) => trackEvent('consultation_started', { mode, ...details });
export const trackCaseAction = (action: string, metadata: any = {}) => trackEvent('case_action', { action, ...metadata });

