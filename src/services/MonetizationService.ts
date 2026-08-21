import { Capacitor } from '@capacitor/core';
import { trackEvent } from './analytics';
import { supabase } from './supabaseClient';

/**
 * Handles In-App Purchases via Stripe (Web) or RevenueCat (Native)
 */
export const MonetizationService = {
  isPremium: async (): Promise<boolean> => {
    // Entitlements must come from the authenticated account. A local flag is
    // user-editable and must never unlock paid or clinically sensitive flows.
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;
      const { data } = await supabase
        .from('profiles')
        .select('is_pro, pro_expires_at')
        .eq('id', session.user.id)
        .single();
      return !!data?.is_pro && (!data.pro_expires_at || new Date(data.pro_expires_at) > new Date());
    } catch {
      return false;
    }
  },

  purchaseSubscription: async (tier: 'monthly' | 'yearly'): Promise<boolean> => {
    trackEvent('InitiateCheckout', { tier });
    
    return new Promise((resolve) => {
      // This legacy adapter has no payment provider attached. Never simulate
      // success or write a client-controlled entitlement.
      console.warn(`Subscription checkout is not configured for ${tier}.`);
      resolve(false);
    });
  },
  
  restorePurchases: async (): Promise<boolean> => {
    return MonetizationService.isPremium();
  }
};
