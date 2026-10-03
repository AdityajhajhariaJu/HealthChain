import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight } from '../../services/haptics';
import {
  ALL_12_STATIONS,
  ConnectionDetectiveView,
  TAB_TO_PILLAR,
  resolveStationTab,
} from './ConnectionDetectiveView';
import FocusTrap from './FocusTrap';

interface ConnectionDetectiveModalProps {
  caseId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onOpenFoodDetective?: () => void;
  onOpenCasePrep?: () => void;
  onOpenGutHealth?: () => void;
}

export const ConnectionDetectiveModal: React.FC<ConnectionDetectiveModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  caseId,
  onOpenFoodDetective,
  onOpenCasePrep,
  onOpenGutHealth,
}) => {
  const isMobile = useIsMobile();
  const [openedPillarId, setOpenedPillarId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialTab && initialTab !== 'overview') {
        const pillar = TAB_TO_PILLAR[initialTab as any];
        if (pillar) {
          setOpenedPillarId(pillar);
          return;
        }
        const resolved = resolveStationTab(initialTab as any);
        const target = ALL_12_STATIONS.find((s) => s.id === resolved);
        if (target) {
          setOpenedPillarId(target.pillarId);
          return;
        }
      }
      setOpenedPillarId(null);
    } else {
      setOpenedPillarId(null);
    }
  }, [isOpen, initialTab]);

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
          data-overlay-viewport="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Clinical Connections"
          style={{
            position: 'fixed',
            zIndex: 99999,
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
          onClick={onClose}
        >
          <motion.div
            data-overlay-panel=""
            id="connection-detective-modal-sheet"
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : '680px',
              height: 'auto',
              maxHeight: 'var(--overlay-available-height)',
              background: '#FFFFFF',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              borderBottomLeftRadius: isMobile ? '0' : '28px',
              borderBottomRightRadius: isMobile ? '0' : '28px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              overflow: 'hidden',
            }}
          >
            {/* Grab Handle */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '12px',
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '5px',
                  borderRadius: '999px',
                  background: '#CBD5E1',
                }}
              />
            </div>

            {/* Header */}
            <div data-overlay-header=""
              style={{
                padding: '12px 16px 10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                gap: '8px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}
              >
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
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    }}
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}

                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: isMobile ? '6px' : '8px',
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: isMobile ? '16px' : '17px',
                      fontWeight: 900,
                      color: '#1C1917',
                      letterSpacing: '-0.4px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    Gut Health{' '}
                    {!isMobile && <span style={{ color: '#0D9488' }}>& Connections</span>}
                  </h2>
                  <span
                    style={{
                      fontSize: isMobile ? '9.5px' : '10px',
                      fontWeight: 800,
                      color: '#0F766E',
                      background: '#CCFBF1',
                      border: '1px solid #99F6E4',
                      padding: isMobile ? '2px 6px' : '2px 7px',
                      borderRadius: '999px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Systems Detective
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  onClose();
                }}
                aria-label="Close Gut Health & Connections"
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
                  boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              data-overlay-scroll=""
              style={{
                flex: '0 1 auto',
                overflowY: 'auto',
                maxHeight: 'calc(var(--overlay-available-height) - 75px)',
                padding: isMobile
                  ? '8px 14px calc(20px + var(--safe-area-bottom, 0px)) 14px'
                  : '10px 18px 24px 18px',
              }}
            >
              {onOpenGutHealth && (
                <section
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    margin: '5px 0 14px',
                    padding: '13px 15px',
                    border: '1px solid #F2CBD4',
                    borderRadius: 16,
                    background: 'linear-gradient(110deg,#FFF2F4,#FFFFFF)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', color: '#263147', fontSize: 13 }}>
                      Have a personal gut question?
                    </strong>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 3,
                        color: '#68768C',
                        fontSize: 12,
                        lineHeight: 1.4,
                      }}
                    >
                      Open your saved meals, symptom reports and research together.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenGutHealth}
                    style={{
                      minHeight: 38,
                      flex: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 11px',
                      border: '1px solid #E78CA2',
                      borderRadius: 11,
                      background: '#FFF',
                      color: '#B51E49',
                      fontWeight: 750,
                      cursor: 'pointer',
                    }}
                  >
                    My Gut Health <ArrowRight size={15} />
                  </button>
                </section>
              )}
              <ConnectionDetectiveView
                caseId={caseId}
                initialTab={initialTab as any}
                openedPillarId={openedPillarId as any}
                onOpenedPillarChange={(id) => setOpenedPillarId(id)}
                onOpenFoodDetective={() => {
                  onClose();
                  if (onOpenFoodDetective) onOpenFoodDetective();
                  else
                    window.dispatchEvent(
                      new CustomEvent('hc_open_whole_health_modal', {
                        detail: { tab: 'detective' },
                      })
                    );
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
