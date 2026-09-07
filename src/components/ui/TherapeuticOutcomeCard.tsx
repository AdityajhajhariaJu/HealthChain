import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Activity, Check, Info, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import {
  getActiveTrial,
  logTrialDay,
  startTrial,
  ActiveTrialState,
  ELIMINATION_PROTOCOLS
} from '../../services/TriggerEngine';
import { ClinicalEliminationModal } from './ClinicalEliminationModal';

export interface TherapeuticOutcomeCardProps {
  span2?: boolean;
}

export const TherapeuticOutcomeCard: React.FC<TherapeuticOutcomeCardProps> = ({ span2 = false }) => {
  const isMobile = useIsMobile();
  const [trial, setTrial] = useState<ActiveTrialState>(() => getActiveTrial() || startTrial('low_histamine'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const current = getActiveTrial();
      if (current) setTrial(current);
    };
    window.addEventListener('hc_trial_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('hc_trial_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const activeProtocolDef = ELIMINATION_PROTOCOLS.find((p) => p.id === trial.trialId) || ELIMINATION_PROTOCOLS[0];

  const handleQuickLog = (score: number) => {
    triggerHapticSuccess();
    const updated = logTrialDay(score, true, 'Quick score check-in from dashboard');
    setTrial(updated);
    setJustLogged(true);
    setIsLogging(false);
    setTimeout(() => setJustLogged(false), 2500);
  };

  const handleOpenModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticSelection();
    setIsModalOpen(true);
  };

  return (
    <>
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`7-Day Elimination Protocol - Day ${trial.currentDay} of ${trial.totalDays}. Tap to manage protocol, rechallenges and doctor dossier`}
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={handleOpenModal}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenModal(e as any);
          }
        }}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 30px rgba(255,255,255,0.4)',
          borderRadius: isMobile ? '24px' : '32px',
          padding: isMobile ? '14px 14px' : '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '125px' : '140px',
          ...(span2 ? { gridColumn: 'span 2' } : {}),
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border 0.3s ease, box-shadow 0.3s ease'
        }}
      >
        {/* Top Row: Circular Icon & Micro-Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div
            style={{
              width: isMobile ? '38px' : '44px',
              height: isMobile ? '38px' : '44px',
              minWidth: isMobile ? '38px' : '44px',
              minHeight: isMobile ? '38px' : '44px',
              flexShrink: 0,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.95) 0%, rgba(15, 118, 110, 0.85) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Target size={isMobile ? 18 : 20} color="#FFF" strokeWidth={2.4} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <div
              className="tabular-nums micro-badge"
              style={{
                background: 'rgba(13, 148, 136, 0.12)',
                color: '#0F766E',
                padding: '3px 8px',
                borderRadius: '999px',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.4px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              DAY {trial.currentDay}/{trial.totalDays}
            </div>
            {trial.reductionPercent > 0 && (
              <div
                className="tabular-nums micro-badge"
                style={{
                  background: '#DCFCE7',
                  color: '#15803D',
                  padding: '3px 7px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.2px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                -{trial.reductionPercent}%
              </div>
            )}
          </div>
        </div>

        {/* Middle / Bottom Content: Title, Subtitle, & Quick Actions */}
        <div>
          <h4
            style={{
              fontSize: isMobile ? '14px' : '15px',
              fontWeight: 700,
              margin: '0 0 3px',
              color: '#0F172A',
              lineHeight: 1.25,
              letterSpacing: '-0.3px'
            }}
          >
            {activeProtocolDef.name}
          </h4>
          <p
            style={{
              fontSize: isMobile ? '11px' : '12px',
              color: justLogged ? '#10B981' : '#64748B',
              margin: '0 0 6px',
              fontWeight: justLogged ? 600 : 500,
              lineHeight: 1.3
            }}
          >
            {justLogged
              ? `✓ Logged: ${trial.currentSeverity}/10 (${trial.reductionPercent}% delta)`
              : `Phase 1: Washout • ${trial.adherencePercentage}% Adherence`}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            {!isLogging ? (
              <button
                type="button"
                data-compact="true"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHapticLight();
                  setIsLogging(true);
                }}
                aria-label="Log today symptom severity"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(13, 148, 136, 0.1)',
                  border: '1px solid rgba(13, 148, 136, 0.25)',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#0F766E',
                  cursor: 'pointer',
                  minWidth: 'unset',
                  minHeight: 'unset',
                  height: 'auto',
                  width: 'fit-content'
                }}
              >
                <Activity size={10} />
                <span>Check-In</span>
              </button>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span style={{ fontSize: '9px', color: '#64748B', fontWeight: 700 }}>Score:</span>
                {[2, 4, 6, 8].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickLog(val)}
                    style={{
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      border: '1px solid #CBD5E1',
                      background: val <= 4 ? '#ECFDF5' : '#FEF2F2',
                      color: val <= 4 ? '#059669' : '#DC2626',
                      cursor: 'pointer'
                    }}
                  >
                    {val}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsLogging(false)}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '10px', cursor: 'pointer', padding: '0 2px' }}
                >
                  ✕
                </button>
              </div>
            )}

            <button
              type="button"
              data-compact="true"
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticLight();
                setShowRationale((prev) => !prev);
              }}
              aria-label="Toggle clinical rationale for elimination protocol"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: showRationale ? 'rgba(13, 148, 136, 0.18)' : 'rgba(13, 148, 136, 0.08)',
                border: '1px solid rgba(13, 148, 136, 0.22)',
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '10px',
                fontWeight: 600,
                color: '#0F766E',
                cursor: 'pointer',
                minWidth: 'unset',
                minHeight: 'unset',
                height: 'auto',
                width: 'fit-content',
                transition: 'all 0.2s ease'
              }}
            >
              <Info size={10} />
              <span>Science</span>
              <ChevronDown
                size={10}
                style={{
                  transform: showRationale ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
              />
            </button>
          </div>
        </div>

        {/* Expandable Clinical Science Rationale */}
        <AnimatePresence>
          {showRationale && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              style={{
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.94)',
                backdropFilter: 'blur(16px)',
                borderRadius: '14px',
                padding: '8px 10px',
                border: '1px solid rgba(13, 148, 136, 0.25)',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Mechanism
                </span>
                <span className="tabular-nums" style={{ fontSize: '9px', fontWeight: 700, color: '#64748B' }}>
                  DAO / Mast Clearance
                </span>
              </div>
              <p style={{ fontSize: '10.5px', color: '#334155', margin: 0, lineHeight: 1.35, fontWeight: 500 }}>
                Strict 7-day exclusion flushes circulating diamine oxidase substrates, dampening mast cell degranulation cycles.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Fully Workable Clinical Outcomes Modal */}
      <ClinicalEliminationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTrialUpdated={(updated) => setTrial(updated)}
      />
    </>
  );
};
