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
  }
}

export const trackEvent = (eventName: string, payload: any = {}) => {
  // 1. Meta Pixel
  if (typeof window !== 'undefined' && window.fbq) {
    if (['Lead', 'Purchase', 'CompleteRegistration'].includes(eventName)) {
      window.fbq('track', eventName, payload);
    } else {
      window.fbq('trackCustom', eventName, payload);
    }
  }

  // 2. AppsFlyer (Web / App Wrapper)
  // To be implemented when AppsFlyer Web SDK is initialized
  if (import.meta.env.DEV) console.log(`[Analytics] ${eventName}`);

  // 3. Supabase Analytics
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

// Common Events
export const trackSignup = () => trackEvent('CompleteRegistration');
export const trackLabUpload = () => trackEvent('LabReportUploaded', { status: 'success' });
export const trackCheckoutInitiated = (value: number) => trackEvent('InitiateCheckout', { value, currency: 'INR' });
export const trackPurchase = (value: number) => trackEvent('Purchase', { value, currency: 'INR' });
