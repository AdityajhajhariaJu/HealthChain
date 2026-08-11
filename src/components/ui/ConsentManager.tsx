import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Info } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function ConsentManager() {
  const isMobile = useIsMobile();
  const [showCookies, setShowCookies] = useState(false);
  const [showMedical, setShowMedical] = useState(false);

  useEffect(() => {
    const cookiesAccepted = localStorage.getItem('hc_cookies_accepted');
    const medicalAccepted = localStorage.getItem('hc_medical_disclaimer_accepted');

    if (!cookiesAccepted) {
      setShowCookies(true);
    } else if (!medicalAccepted) {
      setShowMedical(true);
    }
  }, []);

  const acceptCookies = () => {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    localStorage.setItem('hc_cookies_accepted', 'true');
    setShowCookies(false);
    
    if (!localStorage.getItem('hc_medical_disclaimer_accepted')) {
      setTimeout(() => setShowMedical(true), 500);
    }
  };

  const acceptMedical = () => {
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
    localStorage.setItem('hc_medical_disclaimer_accepted', 'true');
    setShowMedical(false);
  };

  return (
    <>
      {/* Cookie Consent Banner */}
      <AnimatePresence>
        {showCookies && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            style={{
              position: 'fixed',
              bottom: isMobile ? 16 : 24,
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
                  Privacy & Cookie Consent
                </h4>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                  We use cookies to secure your session, analyze app performance, and improve your experience. 
                  By continuing to use HealthChain, you consent to our Privacy Policy and HIPAA-compliant data handling practices.
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

      {/* Medical Disclaimer Modal / Bottom Sheet */}
      <AnimatePresence>
        {showMedical && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center',
              padding: isMobile ? '0' : '24px'
            }}
          >
            <motion.div
              initial={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
              animate={isMobile ? { y: 0 } : { scale: 1, opacity: 1 }}
              exit={isMobile ? { y: '100%' } : { scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                backgroundColor: 'var(--surface)',
                borderRadius: isMobile ? '24px 24px 0 0' : '24px',
                padding: '32px',
                width: '100%',
                maxWidth: '500px',
                border: '1px solid var(--border)',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.2)',
                maxHeight: isMobile ? '90vh' : 'auto',
                overflowY: 'auto'
              }}
            >
              {isMobile && (
                <div style={{ width: 40, height: 4, background: '#cbd5e1', borderRadius: 2, margin: '0 auto 24px' }} />
              )}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', color: 'var(--alert)' }}>
                <Info size={48} />
              </div>
              <h3 style={{ color: 'var(--text-main)', fontSize: '20px', textAlign: 'center', marginBottom: '16px', margin: '0 0 16px 0' }}>
                Important Medical Disclaimer
              </h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                <p style={{ marginBottom: '12px' }}>
                  <strong>HealthChain is an AI-powered diagnostic navigator, not a doctor.</strong>
                </p>
                <p style={{ marginBottom: '12px' }}>
                  The information, hypotheses, and clinical reports generated by this application are for <strong>educational and informational purposes only</strong> and do not constitute professional medical advice, diagnosis, or treatment.
                </p>
                <p style={{ margin: 0 }}>
                  Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. In case of a medical emergency, call your local emergency services immediately.
                </p>
              </div>
              <button
                onClick={acceptMedical}
                style={{
                  width: '100%',
                  backgroundColor: 'var(--teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                I Understand and Agree
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
