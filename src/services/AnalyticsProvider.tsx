import React, { createContext, useContext, useEffect } from 'react';

type AnalyticsContextType = {
  track: (eventName: string, properties?: Record<string, any>) => void;
  getFeatureFlag: (flagName: string) => boolean | string;
};

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize analytics (e.g. PostHog or Mixpanel)
    console.log('[Analytics] Initialized');
  }, []);

  const track = (eventName: string, properties?: Record<string, any>) => {
    // Mock tracking
    console.log(`[Analytics] Track: ${eventName}`, properties || {});
  };

  const getFeatureFlag = (flagName: string) => {
    // Mock A/B testing infrastructure
    // Example: TalkBuddy variations
    if (flagName === 'talkbuddy-v2') {
      return true;
    }
    return false;
  };

  return (
    <AnalyticsContext.Provider value={{ track, getFeatureFlag }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
