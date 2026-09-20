import React, { useState, useEffect } from 'react';
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
  const [openedPillarId, setOpenedPillarId] = useState<string | null>('gut');

  useEffect(() => {
    if (isOpen) {
      setOpenedPillarId('gut');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openedPillarId) {
          setOpenedPillarId(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, openedPillarId, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <FocusTrap isActive={isOpen}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Clinical Connections"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            id="connection-detective-modal-sheet"
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '960px',
              height: '92vh',
              maxHeight: '92vh',
              background: '#FFFFFF',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
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
                {openedPillarId && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setOpenedPillarId(null);
                    }}
                    aria-label="Back to all domains"
                    style={{
                      width: '36px',
                      height: '36px',
                      minWidth: '36px',
                      minHeight: '36px',
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
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#1C1917', letterSpacing: '-0.4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Gut <span style={{ color: '#0D9488' }}>Health</span>
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                aria-label="Close Gut Health"
                style={{
                  width: '36px',
                  height: '36px',
                  minWidth: '36px',
                  minHeight: '36px',
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
                openedPillarId={openedPillarId as any}
                onOpenedPillarChange={(id) => setOpenedPillarId(id)}
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
