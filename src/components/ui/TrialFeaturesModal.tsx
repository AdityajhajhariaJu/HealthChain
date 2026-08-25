import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Stethoscope,
  Heart,
  Apple,
  Pill,
  Brain,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Zap,
} from 'lucide-react';
import { getTrialStatus, TrialStatus } from '../../services/TrialEngine';
import { triggerHapticLight } from '../../services/haptics';

interface TrialModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  lockedFeature?: string;
}

export function TrialFeaturesModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  lockedFeature: controlledLockedFeature,
}: TrialModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [lockedFeatureName, setLockedFeatureName] = useState<string>('');
  const [trialStatus, setTrialStatus] = useState<TrialStatus>(() => getTrialStatus());
  const navigate = useNavigate();

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleClose = () => {
    try { triggerHapticLight(); } catch {}
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  useEffect(() => {
    const handleOpen = (e: any) => {
      setLockedFeatureName(e.detail?.lockedFeature || controlledLockedFeature || '');
      setTrialStatus(getTrialStatus());
      setInternalIsOpen(true);
    };

    const handleTrialUpdate = () => {
      setTrialStatus(getTrialStatus());
    };

    window.addEventListener('hc_open_trial_modal', handleOpen);
    window.addEventListener('hc_trial_updated', handleTrialUpdate);
    return () => {
      window.removeEventListener('hc_open_trial_modal', handleOpen);
      window.removeEventListener('hc_trial_updated', handleTrialUpdate);
    };
  }, [controlledLockedFeature]);

  const handleSelectTrial = (path: string) => {
    try { triggerHapticLight(); } catch {}
    handleClose();
    navigate(path);
  };

  const handleGoToPricing = () => {
    try { triggerHapticLight(); } catch {}
    handleClose();
    navigate('/pricing');
  };

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
            borderRadius: '24px',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.8)',
            padding: '28px 24px',
          }}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            aria-label="Close modal"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              border: '1px solid #E2E8F0',
              background: '#F8FAFC',
              color: '#64748B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#F1F5F9';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#F8FAFC';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px', paddingRight: '20px', paddingLeft: '20px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #ECFDF5 0%, #E0F2FE 100%)',
                border: '1px solid #A7F3D0',
                color: '#047857',
                fontSize: '12px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              <Sparkles size={14} color="#059669" />
              <span>Free Trial Pack</span>
            </div>

            <h2
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#0F172A',
                margin: '0 0 8px 0',
                letterSpacing: '-0.02em',
              }}
            >
              Experience HealthChain for Free
            </h2>
            <p
              style={{
                fontSize: '14px',
                color: '#64748B',
                lineHeight: 1.5,
                margin: 0,
                maxWidth: '520px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Get a taste of our medical intelligence before upgrading. Try any of our complimentary clinical trial experiences below:
            </p>
          </div>

          {/* Locked Feature Alert (if user clicked a locked item) */}
          {lockedFeatureName && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                marginBottom: '18px',
                fontSize: '13px',
                color: '#334155',
              }}
            >
              <Lock size={16} color="#64748B" style={{ flexShrink: 0 }} />
              <div>
                <strong>{lockedFeatureName}</strong> requires a Pro subscription. You can test our clinical intelligence right now with our Free Trial options below!
              </div>
            </div>
          )}

          {/* Trial Options Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {/* 1. Quick Consult */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#ECFDF5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Stethoscope size={18} color="#059669" />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: trialStatus.quickConsult.isAvailable ? '#ECFDF5' : '#F1F5F9',
                      color: trialStatus.quickConsult.isAvailable ? '#047857' : '#64748B',
                      border: `1px solid ${trialStatus.quickConsult.isAvailable ? '#A7F3D0' : '#E2E8F0'}`,
                    }}
                  >
                    {trialStatus.quickConsult.isAvailable ? '1 Free Trial Session' : 'Trial Used'}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Quick Consult
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4, margin: '0 0 14px 0' }}>
                  Targeted single-specialist consultation to assess your immediate acute symptoms.
                </p>
              </div>

              <button
                onClick={() => handleSelectTrial('/app/consult')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: trialStatus.quickConsult.isAvailable
                    ? 'linear-gradient(135deg, #0D9488 0%, #059669 100%)'
                    : '#F1F5F9',
                  color: trialStatus.quickConsult.isAvailable ? '#FFFFFF' : '#64748B',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: trialStatus.quickConsult.isAvailable ? '0 4px 12px rgba(13, 148, 136, 0.2)' : 'none',
                }}
              >
                <span>{trialStatus.quickConsult.isAvailable ? 'Start Free Trial' : 'Open Quick Consult'}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 2. Ava Health Buddy */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#FFF1F2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Heart size={18} color="#E11D48" />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: trialStatus.ava.isAvailable ? '#FFF1F2' : '#F1F5F9',
                      color: trialStatus.ava.isAvailable ? '#BE123C' : '#64748B',
                      border: `1px solid ${trialStatus.ava.isAvailable ? '#FECDD3' : '#E2E8F0'}`,
                    }}
                  >
                    {trialStatus.ava.isAvailable ? `${trialStatus.ava.remaining} Free Trial Replies` : 'Trial Used'}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Ava Health Buddy
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4, margin: '0 0 14px 0' }}>
                  24/7 AI Medical Chief of Staff for daily questions, medication checks, and calm guidance.
                </p>
              </div>

              <button
                onClick={() => handleSelectTrial('/app/ava')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: trialStatus.ava.isAvailable
                    ? 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)'
                    : '#F1F5F9',
                  color: trialStatus.ava.isAvailable ? '#FFFFFF' : '#64748B',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: trialStatus.ava.isAvailable ? '0 4px 12px rgba(225, 29, 72, 0.2)' : 'none',
                }}
              >
                <span>{trialStatus.ava.isAvailable ? 'Chat with Ava' : 'Open Ava'}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 3. Clinical Dietician */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#F0FDF4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Apple size={18} color="#16A34A" />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: trialStatus.dietician.isAvailable ? '#F0FDF4' : '#F1F5F9',
                      color: trialStatus.dietician.isAvailable ? '#15803D' : '#64748B',
                      border: `1px solid ${trialStatus.dietician.isAvailable ? '#BBF7D0' : '#E2E8F0'}`,
                    }}
                  >
                    {trialStatus.dietician.isAvailable ? '1 Free Trial Plan' : 'Trial Used'}
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Clinical Dietician
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4, margin: '0 0 14px 0' }}>
                  Condition-specific Indian & clinical nutrition plans tailored to your metabolic goals.
                </p>
              </div>

              <button
                onClick={() => handleSelectTrial('/app/dietician')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: trialStatus.dietician.isAvailable
                    ? 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)'
                    : '#F1F5F9',
                  color: trialStatus.dietician.isAvailable ? '#FFFFFF' : '#64748B',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: trialStatus.dietician.isAvailable ? '0 4px 12px rgba(22, 163, 74, 0.2)' : 'none',
                }}
              >
                <span>{trialStatus.dietician.isAvailable ? 'Build Free Plan' : 'Open Dietician'}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 4. Pharmacy Hub */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#FFF7ED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Pill size={18} color="#EA580C" />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: '#FFF7ED',
                      color: '#C2410C',
                      border: '1px solid #FED7AA',
                    }}
                  >
                    Free Always
                  </span>
                </div>

                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Pharmacy Hub
                </h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', lineHeight: 1.4, margin: '0 0 14px 0' }}>
                  Real-time multi-medication contraindication and safe dosage checks for patient safety.
                </p>
              </div>

              <button
                onClick={() => handleSelectTrial('/app/pharmacy')}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.2)',
                }}
              >
                <span>Check Interactions</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Pro Upgrade Banner */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.15)',
            }}
          >
            <div style={{ flex: '1 1 280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Brain size={16} color="#38BDF8" />
                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.01em' }}>
                  Ready for the 16-Specialist Board, J.A.R.V.I.S. & All Premium Features?
                </span>
              </div>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, lineHeight: 1.45 }}>
                Cross-examine complex symptoms across 16 medical specialties, uncover hidden root causes with J.A.R.V.I.S., analyze full lab scans, and unlock all our highly useful clinical tools with Pro.
              </p>
            </div>

            <button
              onClick={handleGoToPricing}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Unlock Pro (₹499)</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
