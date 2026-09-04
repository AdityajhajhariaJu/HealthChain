import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

const GA_ID = 'G-0JPQJJHTB6';

function enableAnalytics() {
  if (typeof window === 'undefined' || (window as any).__hc_ga_loaded) return;
  (window as any).dataLayer = (window as any).dataLayer || [];
  (window as any).gtag = (...args: any[]) => (window as any).dataLayer.push(args);
  (window as any).gtag('js', new Date());
  (window as any).gtag('config', GA_ID, { anonymize_ip: true });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
  (window as any).__hc_ga_loaded = true;
}

export default function ConsentManager() {
  const isMobile = useIsMobile();
  const [showCookies, setShowCookies] = useState(false);

  useEffect(() => {
    let cookiesAccepted: string | null = null;
    try {
      cookiesAccepted = localStorage.getItem('hc_cookies_accepted');
    } catch {}
    if (!cookiesAccepted || cookiesAccepted === 'true') {
      setShowCookies(true);
    } else if (cookiesAccepted === 'accepted') {
      enableAnalytics();
    }
  }, []);

  const acceptCookies = () => {
    try { if (window.navigator?.vibrate) window.navigator.vibrate(50); } catch(e) {}
    try { localStorage.setItem('hc_cookies_accepted', 'accepted'); } catch(e) {}
    enableAnalytics();
    setShowCookies(false);
  };

  const declineOptionalCookies = () => {
    try { localStorage.setItem('hc_cookies_accepted', 'declined'); } catch(e) {}
    setShowCookies(false);
  };

  return (
    <>
      {/* Cookie & Terms Consent Banner */}
      <AnimatePresence>
        {showCookies && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: isMobile ? 80 : 24,
              left: isMobile ? 16 : 24,
              right: isMobile ? 16 : 24,
              backgroundColor: 'var(--surface)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid var(--border)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              maxWidth: '800px',
              margin: '0 auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ color: 'var(--teal)' }}>
                <ShieldCheck size={24} />
              </div>
              <div>
                <h4 style={{ color: 'var(--text-main)', margin: '0 0 8px 0', fontSize: '16px' }}>
                  Privacy & Terms
                </h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                  HealthChain uses necessary storage for sign-in and app operation. Optional analytics helps us understand product usage and is loaded only if you accept it. See our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={declineOptionalCookies}
                style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                Necessary only
              </button>
              <button
                onClick={acceptCookies}
                style={{
                  backgroundColor: 'var(--teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                I Accept
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
