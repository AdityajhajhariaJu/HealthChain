import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../services/supabaseClient';
import { triggerHapticLight } from '../../services/haptics';

export function GuestStickyBanner() {
  const [isGuest, setIsGuest] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          const hasSession = Boolean(data?.session);
          const isVip = localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a';
          const isGuestStorage = localStorage.getItem('hc_guest_mode') === 'true';
          const isDismissed = sessionStorage.getItem('hc_guest_banner_dismissed') === 'true';
          
          setIsGuest(!isVip && (!hasSession || isGuestStorage));
          setDismissed(isDismissed);
        }
      } catch (err) {
        if (mounted) setIsGuest(localStorage.getItem('hc_vp_sig') !== 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a');
      }
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsGuest(false);
      } else {
        setIsGuest(true);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  if (!isGuest || dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticLight();
    setDismissed(true);
    try {
      sessionStorage.setItem('hc_guest_banner_dismissed', 'true');
    } catch (e) {}
  };

  const handleAuth = () => {
    triggerHapticLight();
    window.dispatchEvent(
      new CustomEvent('hc_require_auth', {
        detail: {
          title: 'Save Your Health Record',
          message: 'Sign in to securely back up your 16-specialist assessments, lab analyses, and chat history across all your devices.'
        }
      })
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, x: '-50%' }}
        animate={{ opacity: 1, y: 0, x: '-50%' }}
        exit={{ opacity: 0, y: 20, x: '-50%' }}
        style={{
          background: 'linear-gradient(90deg, #0F172A 0%, #0F766E 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(45, 212, 191, 0.25)',
          borderRadius: '24px',
          margin: '0',
          width: 'calc(100% - 24px)',
          maxWidth: '500px',
          left: '50%',
          
          color: '#ffffff',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          zIndex: 100,
          position: 'fixed',
          bottom: 'calc(100px + env(safe-area-inset-bottom))',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(20, 184, 166, 0.25)',
              border: '1px solid rgba(45, 212, 191, 0.4)',
              flexShrink: 0,
            }}
          >
            <Sparkles size={13} color="#2DD4BF" />
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontWeight: 600, color: '#F1F5F9' }}>Guest Mode:</span>{' '}
            <span style={{ color: '#CBD5E1' }}>
              Data saved to this browser.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
          <button
            onClick={handleAuth}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'linear-gradient(135deg, #00D4B2 0%, #0F766E 100%)',
              border: 'none',
              borderRadius: '20px',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '4px 10px',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0, 212, 178, 0.3)',
              transition: 'transform 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
          >
            <span>Save & Sign In</span>
            <ArrowRight size={12} />
          </button>

          <button
            onClick={handleDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
            }}
            title="Dismiss for this session"
            aria-label="Dismiss guest banner"
          >
            <X size={14} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
