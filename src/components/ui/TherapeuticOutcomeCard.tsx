import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Activity, Check, Info, ChevronDown, Compass, Award } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import {
  getActiveTrial,
  logTrialDay,
  startTrial,
  ActiveTrialState,
  ELIMINATION_PROTOCOLS
} from '../../services/TriggerEngine';
import {
  getActiveTrialV2,
  recordDailyObservation,
  saveActiveTrialV2
} from '../../services/TrialWorkflowService';
import { TrialV2 } from '../../domain/trials/types';
import { ClinicalEliminationModal } from './ClinicalEliminationModal';

export const openEliminationSuiteModal = () => {
  window.dispatchEvent(new CustomEvent('hc_open_elimination_suite'));
};

export interface TherapeuticOutcomeCardProps {
  span2?: boolean;
}

export const TherapeuticOutcomeCard: React.FC<TherapeuticOutcomeCardProps> = ({ span2 = false }) => {
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<ActiveTrialState | null>(() => getActiveTrial());
  const [trialV2, setTrialV2] = useState<TrialV2 | null>(() => getActiveTrialV2());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogging, setIsLogging] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [showRationale, setShowRationale] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const current = getActiveTrial();
      const v2 = getActiveTrialV2();
      setTrial(current);
      setTrialV2(v2);
    };
    const handleOpenEvent = () => {
      setIsModalOpen(true);
    };
    window.addEventListener('hc_trial_updated', handleUpdate);
    window.addEventListener('hc_trial_v2_updated', handleUpdate);
    window.addEventListener('hc_trial_graduated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('hc_open_elimination_suite', handleOpenEvent);
    return () => {
      window.removeEventListener('hc_trial_updated', handleUpdate);
      window.removeEventListener('hc_trial_v2_updated', handleUpdate);
      window.removeEventListener('hc_trial_graduated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('hc_open_elimination_suite', handleOpenEvent);
    };
  }, []);

  // Auto-open modal if returning with openElimination=true in query or location state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasOpenParam = params.get('openElimination') === 'true';
    const hasOpenState = Boolean((location.state as any)?.openElimination);

    if (hasOpenParam || hasOpenState) {
      setIsModalOpen(true);
      if (hasOpenParam) {
        params.delete('openElimination');
        const cleanSearch = params.toString() ? `?${params.toString()}` : '';
        navigate(`${location.pathname}${cleanSearch}${location.hash}`, { replace: true, state: {} });
      }
    }
  }, [location.search, location.state, location.pathname, location.hash, navigate]);

  const isGraduated = trialV2?.status === 'completed' || Boolean(trialV2?.verdict);
  const activeProtocolDef = trial 
    ? (ELIMINATION_PROTOCOLS.find((p) => p.id === trial.trialId) || ELIMINATION_PROTOCOLS[0]) 
    : (trialV2?.protocolId ? (ELIMINATION_PROTOCOLS.find((p) => p.id === trialV2.protocolId) || ELIMINATION_PROTOCOLS[0]) : null);

  const handleQuickLog = (score: number) => {
    triggerHapticSuccess();
    const updated = logTrialDay(score, true, 'Quick score check-in from dashboard');
    setTrial(updated);

    // Sync to Trial V2 store so observation counts and calibration gates stay updated
    const v2 = getActiveTrialV2();
    if (v2) {
      const todayKey = new Date().toLocaleDateString('en-CA');
      const v2Updated = recordDailyObservation(v2.id, {
        date: todayKey,
        severityScore: score,
        adherenceLevel: 'followed',
        notes: 'Quick score check-in from dashboard',
      });
      if (!v2Updated) {
        v2.baseline.completedObservations = (v2.baseline.completedObservations || 0) + 1;
        saveActiveTrialV2(v2);
      }
      window.dispatchEvent(new CustomEvent('hc_trial_v2_updated'));
    }

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
        aria-label={isGraduated
          ? 'Elimination Protocol - Graduated. Tap to view your clinical verdict, confirmed triggers, and maintenance plan'
          : trial 
          ? `Elimination Protocol - Day ${trial.currentDay} of ${trial.totalDays}. Tap to view your daily plan, timeline, and doctor report` 
          : 'Elimination Protocol - Inactive. Tap to choose an elimination protocol'}
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        onClick={handleOpenModal}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpenModal(e as any);
          }
        }}
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.72) 0%, rgba(240, 253, 250, 0.38) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: '1.5px solid rgba(204, 251, 241, 0.85)',
          boxShadow: '0 20px 40px -12px rgba(13, 148, 136, 0.09), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 24px rgba(255,255,255,0.4)',
          borderRadius: isMobile ? '24px' : '30px',
          padding: isMobile ? '16px' : '20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '135px' : '150px',
          ...(span2 ? { gridColumn: 'span 2' } : {}),
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top Row: Clinical Circular Icon & Micro-Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div
            style={{
              width: isMobile ? '40px' : '44px',
              height: isMobile ? '40px' : '44px',
              minWidth: isMobile ? '40px' : '44px',
              minHeight: isMobile ? '40px' : '44px',
              flexShrink: 0,
              borderRadius: '14px',
              background: isGraduated
                ? 'linear-gradient(135deg, #059669 0%, #0D9488 100%)'
                : 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: isGraduated
                ? '0 4px 14px rgba(5, 150, 105, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)'
                : '0 4px 14px rgba(13, 148, 136, 0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
              border: '1px solid rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isGraduated ? (
              <Award size={isMobile ? 20 : 22} color="#FFFFFF" strokeWidth={2.4} />
            ) : (
              <Target size={isMobile ? 19 : 21} color="#FFFFFF" strokeWidth={2.4} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {isGraduated ? (
              <>
                <div
                  className="micro-badge"
                  style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #86EFAC',
                    padding: '3.5px 9px',
                    borderRadius: '999px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  GRADUATED 🏆
                </div>
                {trialV2?.verdict?.symptomReductionPercentage ? (
                  <div
                    className="tabular-nums micro-badge"
                    style={{
                      background: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
                      padding: '3.5px 8px',
                      borderRadius: '999px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      letterSpacing: '0.2px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    -{trialV2.verdict.symptomReductionPercentage}%
                  </div>
                ) : null}
              </>
            ) : trial ? (
              <>
                <div
                  className="tabular-nums micro-badge"
                  style={{
                    background: '#F0FDFA',
                    color: '#0F766E',
                    border: '1px solid #99F6E4',
                    padding: '3.5px 9px',
                    borderRadius: '999px',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    letterSpacing: '0.4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                >
                  DAY {trial.currentDay}/{trial.totalDays}
                </div>
                {trial.reductionPercent !== null && trial.reductionPercent > 0 && (
                  <div
                    className="tabular-nums micro-badge"
                    style={{
                      background: '#DCFCE7',
                      color: '#15803D',
                      border: '1px solid #86EFAC',
                      padding: '3.5px 8px',
                      borderRadius: '999px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      letterSpacing: '0.2px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    -{trial.reductionPercent}%
                  </div>
                )}
              </>
            ) : (
              <div
                className="micro-badge"
                style={{
                  background: '#ECFDF5',
                  color: '#047857',
                  border: '1px solid #A7F3D0',
                  padding: '3.5px 9px',
                  borderRadius: '999px',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0
                }}
              >
                GUIDED INTAKE AVAILABLE
              </div>
            )}
          </div>
        </div>

        {/* Middle / Bottom Content: Title, Subtitle, & Quick Actions */}
        <div>
          <h4
            style={{
              fontSize: isMobile ? '14.5px' : '16px',
              fontWeight: 800,
              margin: '0 0 3px',
              color: '#0F172A',
              lineHeight: 1.25,
              letterSpacing: '-0.3px'
            }}
          >
            {isGraduated
              ? (activeProtocolDef ? `${activeProtocolDef.name} — Graduated` : 'Elimination Protocol Graduated')
              : (activeProtocolDef ? activeProtocolDef.name : 'Clinical Food Reset & Elimination')}
          </h4>
          <p
            style={{
              fontSize: isMobile ? '11.5px' : '12.5px',
              color: justLogged ? '#059669' : '#64748B',
              margin: '0 0 8px',
              fontWeight: justLogged ? 700 : 500,
              lineHeight: 1.35
            }}
          >
            {isGraduated ? (
              `Investigation complete • ${trialV2?.verdict?.confirmedTriggers?.length || 0} Confirmed Trigger(s) • Profile Synchronized`
            ) : trial ? (
              justLogged
                ? `✓ Logged: ${trial.currentSeverity}/10 (${trial.reductionPercent !== null ? `${trial.reductionPercent}% delta` : 'saved'})`
                : `Day ${trial.currentDay} of ${trial.totalDays} • Reset Phase (${trial.adherencePercentage}% on track)`
            ) : (
              'Discover food triggers with a 4-step guided intake & structured clinical reset.'
            )}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
            {isGraduated ? (
              <button
                type="button"
                data-compact="true"
                onClick={handleOpenModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: isMobile ? '6px 12px' : '7px 14px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '34px',
                  boxShadow: '0 4px 12px rgba(5, 150, 105, 0.28)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Award size={13} />
                <span>View Clinical Verdict & Blueprint →</span>
              </button>
            ) : trial ? (
              !isLogging ? (
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
                    gap: '5px',
                    background: '#F0FDFA',
                    border: '1.5px solid #99F6E4',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#0F766E',
                    cursor: 'pointer',
                    minHeight: '32px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Activity size={12} />
                  <span>Check-In</span>
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: '#FFFFFF',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    border: '1.5px solid #CCFBF1',
                    boxShadow: '0 4px 12px rgba(13, 148, 136, 0.1)'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ fontSize: '10px', color: '#0F766E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Score:</span>
                  {[2, 4, 6, 8].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickLog(val)}
                      style={{
                        minWidth: '28px',
                        minHeight: '26px',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        border: val <= 2 ? '1px solid #A7F3D0' : val <= 4 ? '1px solid #99F6E4' : val <= 6 ? '1px solid #FDE68A' : '1px solid #FECACA',
                        background: val <= 2 ? '#ECFDF5' : val <= 4 ? '#F0FDFA' : val <= 6 ? '#FEF3C7' : '#FEF2F2',
                        color: val <= 2 ? '#047857' : val <= 4 ? '#0D9488' : val <= 6 ? '#B45309' : '#DC2626',
                        cursor: 'pointer',
                        transition: 'transform 0.1s ease',
                      }}
                    >
                      {val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsLogging(false)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '12px', cursor: 'pointer', padding: '0 4px', fontWeight: 800 }}
                  >
                    ✕
                  </button>
                </div>
              )
            ) : (
              <button
                type="button"
                data-compact="true"
                onClick={handleOpenModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: isMobile ? '6px 12px' : '7px 14px',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '34px',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.28)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Compass size={13} />
                <span>Begin Guided Reset Onboarding →</span>
              </button>
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
                background: showRationale ? '#F0FDFA' : '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '4px 9px',
                fontSize: '11px',
                fontWeight: 700,
                color: showRationale ? '#0D9488' : '#64748B',
                cursor: 'pointer',
                minHeight: '32px',
                transition: 'all 0.15s ease'
              }}
            >
              <Info size={12} />
              <span>Science</span>
              <ChevronDown
                size={11}
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
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              style={{
                overflow: 'hidden',
                background: '#FFFFFF',
                borderRadius: '14px',
                padding: '10px 12px',
                border: '1.5px solid #CCFBF1',
                boxShadow: '0 4px 14px rgba(13, 148, 136, 0.08)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: 800, color: '#0D9488', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  Clinical Rationale (AGA & Monash)
                </span>
                <span className="tabular-nums" style={{ fontSize: '9.5px', fontWeight: 700, color: '#64748B' }}>
                  Mucosal & Motility Reset
                </span>
              </div>
              <p style={{ fontSize: '11px', color: '#334155', margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
                Strict temporary elimination calms gut mucosal inflammation, giving hypersensitive gut endings a washout period to reset before systematic challenge.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Fully Workable Clinical Outcomes Modal */}
      {isModalOpen && (
        <ClinicalEliminationModal
          isOpen={isModalOpen}
          initialMode={trial ? 'active_trial' : 'onboarding'}
          onClose={() => setIsModalOpen(false)}
          onTrialUpdated={(updated) => setTrial(updated)}
        />
      )}
    </>
  );
};
