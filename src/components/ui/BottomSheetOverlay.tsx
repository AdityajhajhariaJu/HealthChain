import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { triggerHapticLight } from '../../services/haptics';
import FocusTrap from './FocusTrap';

interface BottomSheetOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  bgImage?: string;
  theme?: 'dark' | 'light';
  backgroundColor?: string;
  noPadding?: boolean;
  hideDefaultClose?: boolean;
  title?: string;
}

export function BottomSheetOverlay({
  isOpen,
  onClose,
  children,
  bgImage,
  theme = 'dark',
  backgroundColor,
  noPadding = false,
  hideDefaultClose = false,
  title = 'Bottom Sheet Menu',
}: BottomSheetOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;
    const main = document.getElementById('main-content');
    const previous = {
      overflow: document.body.style.overflow,
      touchAction: document.body.style.touchAction,
      mainOverflow: main?.style.overflow || '',
    };
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    if (main) main.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.touchAction = previous.touchAction;
      if (main) main.style.overflow = previous.mainOverflow;
    };
  }, [isOpen]);

  const isLight = theme === 'light';
  const resolvedBg = backgroundColor || (isLight ? '#FFFFFF' : '#0F0F11');
  const resolvedTextColor = isLight ? '#0F172A' : 'white';
  const resolvedBorder = isLight
    ? '1px solid rgba(0, 0, 0, 0.08)'
    : '1px solid rgba(255, 255, 255, 0.1)';
  const handleColor = isLight ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.2)';

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
              zIndex: 1000,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />

          <motion.div
            className="hc-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              left: 'var(--safe-area-left, 0px)',
              right: 'var(--safe-area-right, 0px)',
              bottom: 'calc(100% - var(--app-viewport-top, 0px) - var(--app-viewport-height))',
              zIndex: 1001,
              height: 'min(92dvh, var(--app-viewport-height))',
              maxHeight: 'calc(var(--app-viewport-height) - max(12px, var(--safe-area-top, 0px)))',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: resolvedBg,
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderTop: resolvedBorder,
            }}
          >
            <FocusTrap
              isActive={isOpen}
              onEscape={onClose}
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
              }}
            >
              <div
                role="button"
                tabIndex={0}
                aria-label="Dismiss bottom sheet"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClose();
                  }
                }}
                onClick={onClose}
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  height: '44px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 10,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '5px',
                    backgroundColor: handleColor,
                    borderRadius: '9999px',
                    marginTop: '6px',
                  }}
                />
              </div>

              {!hideDefaultClose && (
                <button
                  onClick={() => {
                    triggerHapticLight();
                    onClose();
                  }}
                  aria-label="Close sheet"
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    zIndex: 20,
                    width: '44px',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isLight ? '#F1F5F9' : 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '9999px',
                    color: isLight ? '#475569' : 'rgba(255,255,255,0.8)',
                    border: isLight ? '1px solid #E2E8F0' : 'none',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              )}

              {bgImage && (
                <div
                  style={{
                    position: 'relative',
                    height: '256px',
                    width: '100%',
                    flexShrink: 0,
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: isLight
                        ? 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4), #FFFFFF)'
                        : 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2), #0F0F11)',
                    }}
                  />
                </div>
              )}

              <div
                style={{
                  flex: 1,
                  overflowY: noPadding ? 'hidden' : 'auto',
                  padding: noPadding
                    ? '0 0 var(--safe-area-bottom, 0px)'
                    : '24px 24px calc(48px + var(--safe-area-bottom, 0px))',
                  color: resolvedTextColor,
                  position: 'relative',
                  display: noPadding ? 'flex' : 'block',
                  flexDirection: noPadding ? 'column' : 'unset',
                  minHeight: 0,
                }}
              >
                {!bgImage && !noPadding && !hideDefaultClose && (
                  <div style={{ marginTop: '16px' }} />
                )}
                {children}
              </div>
            </FocusTrap>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
