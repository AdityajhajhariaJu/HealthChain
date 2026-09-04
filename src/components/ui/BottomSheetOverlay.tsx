import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface BottomSheetOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  bgImage?: string;
}

export function BottomSheetOverlay({ isOpen, onClose, children, bgImage }: BottomSheetOverlayProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      const main = document.getElementById('main-content');
      if (main) main.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      const main = document.getElementById('main-content');
      if (main) main.style.overflow = '';
    }
    return () => { 
      document.body.style.overflow = ''; 
      document.body.style.touchAction = '';
      const main = document.getElementById('main-content');
      if (main) main.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              triggerHapticLight();
              onClose();
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)'
            }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Bottom Sheet Menu"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 61,
              height: '92vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0F0F11',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div 
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '48px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '48px', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '9999px', marginTop: '8px' }} />
            </div>

            <button 
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 20,
                backgroundColor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                padding: '8px',
                borderRadius: '9999px',
                color: 'rgba(255,255,255,0.8)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {bgImage && (
              <div 
                style={{
                  position: 'relative',
                  height: '256px',
                  width: '100%',
                  flexShrink: 0,
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2), #0F0F11)'
                }} />
              </div>
            )}

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 24px 96px',
              color: 'white',
              position: 'relative'
            }}>
               {!bgImage && <div style={{ marginTop: '32px' }} />}
               {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}