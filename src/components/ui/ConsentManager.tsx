import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function ConsentManager() {
  const isMobile = useIsMobile();
  const [showCookies, setShowCookies] = useState(false);

  useEffect(() => {
    const cookiesAccepted = localStorage.getItem('hc_cookies_accepted');
    if (!cookiesAccepted) {
      setShowCookies(true);
    }
  }, []);

  const acceptCookies = () => {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    localStorage.setItem('hc_cookies_accepted', 'true');
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
                  By continuing to use HealthChain, you agree to our Terms of Service (including the Medical Disclaimer that this tool is not a substitute for professional medical advice) and our Privacy Policy.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
