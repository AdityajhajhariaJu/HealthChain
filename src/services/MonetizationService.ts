import { Capacitor } from '@capacitor/core';
import { trackEvent } from './analytics';

/**
 * Handles In-App Purchases via Stripe (Web) or RevenueCat (Native)
 */
export const MonetizationService = {
  isPremium: async (): Promise<boolean> => {
    // Check locally or from backend if user has an active subscription
    const storedStatus = localStorage.getItem('hc_premium_status');
    return storedStatus === 'active';
  },

  purchaseSubscription: async (tier: 'monthly' | 'yearly'): Promise<boolean> => {
    trackEvent('InitiateCheckout', { tier });
    
    return new Promise((resolve) => {
      // Mock payment flow
      setTimeout(() => {
        localStorage.setItem('hc_premium_status', 'active');
        trackEvent('Purchase', { tier, currency: 'INR', value: tier === 'yearly' ? 5000 : 500 });
        
        // Dispatch event for UI
        window.dispatchEvent(new Event('hc_premium_unlocked'));
        
        console.log('Payment successful! Premium features unlocked.');
        resolve(true);
      }, 1500);
    });
  },
  
  restorePurchases: async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock restore
        console.log('No previous purchases found to restore.');
        resolve(false);
      }, 1000);
    });
  }
};
