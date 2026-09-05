import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Network } from 'lucide-react';
import FocusTrap from './FocusTrap';
import { ConnectionDetectiveView } from './ConnectionDetectiveView';
import { triggerHapticLight } from '../../services/haptics';

interface ConnectionDetectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFoodDetective?: () => void;
  onOpenConsult?: () => void;
}

export const ConnectionDetectiveModal: React.FC<ConnectionDetectiveModalProps> = ({
  isOpen,
  onClose,
  onOpenFoodDetective,
  onOpenConsult,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <FocusTrap isActive={isOpen}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Connection Detective Root Cause Intelligence"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '640px',
              maxHeight: '94vh',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              border: '1.5px solid #CBD5E1',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.22)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Grab Handle */}
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '12px' }}>
              <div style={{ width: '42px', height: '5px', borderRadius: '999px', background: '#CBD5E1' }} />
            </div>

            {/* Header */}
            <div
              style={{
                padding: '14px 20px 10px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0284C7', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  HEALTHCHAIN ROOT-CAUSE ENGINE
                </span>
                <h2 style={{ margin: '2px 0 0 0', fontSize: '22px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.4px' }}>
                  Connection <span style={{ color: '#0284C7' }}>Detective</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                aria-label="Close Connection Detective"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1.5px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 20px 32px 20px',
              }}
            >
              <ConnectionDetectiveView
                onOpenFoodDetective={() => {
                  onClose();
                  if (onOpenFoodDetective) onOpenFoodDetective();
                  else window.dispatchEvent(new CustomEvent('hc_open_whole_health_modal', { detail: { tab: 'detective' } }));
                }}
                onOpenConsult={() => {
                  onClose();
                  if (onOpenConsult) onOpenConsult();
                }}
              />
            </div>
          </motion.div>
        </div>
      </FocusTrap>
    </AnimatePresence>
  );
};
