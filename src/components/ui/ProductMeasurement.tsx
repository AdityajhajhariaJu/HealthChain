import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { hasAnalyticsConsent, PRIVACY_PREFERENCES_EVENT, safeAnalyticsPayload, trackPageView } from '../../services/analytics';

export default function ProductMeasurement() {
  const { pathname } = useLocation();
  const last = useRef('');
  useEffect(() => {
    const measure = () => {
      if (!hasAnalyticsConsent()) { last.current = ''; return; }
      const dimension = safeAnalyticsPayload('page_view', { path: pathname })?.dimension;
      if (dimension && last.current !== dimension) {
        last.current = dimension;
        trackPageView(pathname);
      }
    };
    measure();
    window.addEventListener(PRIVACY_PREFERENCES_EVENT, measure);
    return () => window.removeEventListener(PRIVACY_PREFERENCES_EVENT, measure);
  }, [pathname]);
  return null;
}
