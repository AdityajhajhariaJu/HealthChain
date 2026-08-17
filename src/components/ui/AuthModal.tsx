import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export function AuthModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', message: '' });
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleRequireAuth = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        setModalContent({
          title: customEvent.detail.title || 'Authentication Required',
          message: customEvent.detail.message || 'Please log in or sign up to continue.',
        });
      }
      setIsOpen(true);
    };

    window.addEventListener('hc_require_auth', handleRequireAuth);
    return () => {
      window.removeEventListener('hc_require_auth', handleRequireAuth);
    };
  }, []);

  const handleClose = () => setIsOpen(false);

  const handleLogin = () => {
    setIsOpen(false);
    navigate('/login');
  };

  const handleSignUp = () => {
    setIsOpen(false);
    navigate('/signup');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.4)',
              backdropFilter: 'blur(4px)',
              zIndex: 99999,
            }}
          />
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: isMobile ? '24px' : '32px',
              width: '90%',
              maxWidth: '420px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              zIndex: 100000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'background-color 0.2s, color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F1F5F9';
                e.currentTarget.style.color = '#475569';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94A3B8';
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                color: '#3B82F6',
              }}
            >
              <ShieldAlert size={32} strokeWidth={1.5} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#0F172A', margin: '0 0 12px 0' }}>
              {modalContent.title}
            </h3>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.5, margin: '0 0 32px 0' }}>
              {modalContent.message}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
              <button
                onClick={handleSignUp}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563EB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3B82F6')}
              >
                Create Free Account
              </button>
              <button
                onClick={handleLogin}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F1F5F9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
              >
                Log In
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
