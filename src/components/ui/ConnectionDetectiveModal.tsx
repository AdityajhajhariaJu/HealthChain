import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, Sparkles, Network, GitMerge } from 'lucide-react';
import FocusTrap from './FocusTrap';
import { ConnectionDetectiveView } from './ConnectionDetectiveView';
import { triggerHapticLight } from '../../services/haptics';

interface ConnectionDetectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onOpenFoodDetective?: () => void;
  onOpenConsult?: () => void;
  onOpenCasePrep?: () => void;
}

export const ConnectionDetectiveModal: React.FC<ConnectionDetectiveModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'map',
  onOpenFoodDetective,
  onOpenConsult,
  onOpenCasePrep,
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

  return createPortal(
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
            zIndex: 999999,
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
              maxWidth: '680px',
              maxHeight: '96dvh',
              background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 40%, #F0FDFA 100%)',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              border: '1.5px solid #CCFBF1',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.18)',
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
                padding: '12px 16px 10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    onClose();
                  }}
                  aria-label="Back to dashboard"
                  style={{
                    width: '38px',
                    height: '38px',
                    minWidth: '38px',
                    minHeight: '38px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1E293B',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
                  }}
                >
                  <ArrowLeft size={18} />
                </button>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#4F46E5', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                      CLINICAL DETECTIVE
                    </span>
                    <span style={{ background: '#EEF2FF', color: '#4338CA', padding: '1px 6px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800 }}>
                      ROOT CAUSE
                    </span>
                  </div>
                  <h2 style={{ margin: '1px 0 0 0', fontSize: '16px', fontWeight: 900, color: '#1C1917', letterSpacing: '-0.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Connection <span style={{ color: '#4F46E5' }}>Detective</span>
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                aria-label="Close Connection Detective"
                style={{
                  width: '38px',
                  height: '38px',
                  minWidth: '38px',
                  minHeight: '38px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
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
                padding: '0 14px 32px 14px',
              }}
            >
              <ConnectionDetectiveView
                initialTab={initialTab as any}
                onOpenFoodDetective={() => {
                  onClose();
                  if (onOpenFoodDetective) onOpenFoodDetective();
                  else window.dispatchEvent(new CustomEvent('hc_open_whole_health_modal', { detail: { tab: 'detective' } }));
                }}
                onOpenConsult={() => {
                  onClose();
                  if (onOpenConsult) onOpenConsult();
                }}
                onOpenCasePrep={() => {
                  onClose();
                  if (onOpenCasePrep) onOpenCasePrep();
                }}
              />
            </div>
          </motion.div>
        </div>
      </FocusTrap>
    </AnimatePresence>,
    document.body
  );
};
