import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, PhoneCall, ShieldAlert, X, MapPin } from 'lucide-react';
import { TriageEvaluation } from '../../services/clinicalTriageEngine';
import { triggerHapticSelection } from '../../services/haptics';

interface EmergencyTriageModalProps {
  isOpen: boolean;
  triage: TriageEvaluation | null;
  onClose: () => void;
}

export const EmergencyTriageModal: React.FC<EmergencyTriageModalProps> = ({
  isOpen,
  triage,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !triage || !triage.isEmergency) return null;

  const isPsych = triage.category === 'PSYCHIATRIC_CRISIS';
  const emergencyNumber = triage.suggestedContact || (isPsych ? '988' : '911');

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.82)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="emergency-title"
        aria-describedby="emergency-desc"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            width: '100%',
            maxWidth: '500px',
            background: '#FFFFFF',
            borderRadius: '28px',
            border: '2px solid #EF4444',
            boxShadow: '0 25px 60px rgba(239, 68, 68, 0.25), 0 10px 25px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Header Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
              padding: '24px 24px 18px',
              borderBottom: '1px solid #FCA5A5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                minWidth: '48px',
                minHeight: '48px',
                borderRadius: '16px',
                background: '#EF4444',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(239, 68, 68, 0.4)',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={26} strokeWidth={2.4} />
            </div>

            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.8px',
                  textTransform: 'uppercase',
                  color: '#DC2626',
                  marginBottom: '2px',
                }}
              >
                CRITICAL CLINICAL RED FLAG DETECTED
              </div>
              <h2
                id="emergency-title"
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#991B1B',
                  margin: 0,
                  lineHeight: 1.25,
                }}
              >
                {isPsych ? 'Immediate Support Available' : 'Immediate Emergency Care Recommended'}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticSelection();
                onClose();
              }}
              aria-label="Dismiss emergency warning"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #FECACA',
                color: '#991B1B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body Content */}
          <div style={{ padding: '24px' }}>
            <div
              id="emergency-desc"
              style={{
                background: '#FFF1F2',
                border: '1.5px solid #FFE4E6',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <ShieldAlert size={18} color="#E11D48" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#9F1239' }}>
                  Why we paused:
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#881337', lineHeight: 1.45, fontWeight: 500 }}>
                {triage.redFlagReason}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Direct Action Directive:
              </div>
              <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 600, lineHeight: 1.5, margin: 0 }}>
                {triage.immediateAction}
              </p>
            </div>

            {/* High-Contrast Immediate Call Buttons (US & India/EU) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <a
                href={`tel:${isPsych ? '988' : '911'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '14.5px',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <PhoneCall size={18} /> {isPsych ? 'Call 988 (US)' : 'Call 911 (US)'}
              </a>
              <a
                href={`tel:${isPsych ? '14416' : '112'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '16px',
                  background: '#991B1B',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '14.5px',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(153, 27, 27, 0.35)',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <PhoneCall size={18} /> {isPsych ? 'Call 14416 (IN)' : 'Call 112 (IN/EU)'}
              </a>
            </div>

            {!isPsych && (
              <a
                href="https://www.google.com/maps/search/nearest+emergency+room"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px',
                  borderRadius: '14px',
                  background: '#F8FAFC',
                  color: '#475569',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer',
                  marginBottom: '16px',
                }}
              >
                <MapPin size={16} color="#64748B" /> Find Nearest Emergency Room
              </a>
            )}

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '8px 12px',
                  minHeight: '44px',
                  minWidth: '44px',
                  textDecoration: 'underline',
                }}
              >
                I am safe / My symptom is already being medically evaluated
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
