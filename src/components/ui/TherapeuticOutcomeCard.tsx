import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Activity, Check, Compass, Award } from 'lucide-react';
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
          ? `Clinical Food Reset & Elimination - Graduated${activeProtocolDef ? ` (${activeProtocolDef.name})` : ''}. Tap to view your clinical verdict, confirmed triggers, and maintenance plan`
          : trial 
          ? `Clinical Food Reset & Elimination - Day ${trial.currentDay} of ${trial.totalDays}${activeProtocolDef ? ` (${activeProtocolDef.name})` : ''}. Tap to view your daily plan, timeline, and doctor report` 
          : 'Clinical Food Reset & Elimination - Inactive. Tap to choose an elimination protocol'}
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
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
          borderRadius: isMobile ? '22px' : '26px',
          padding: isMobile ? '13px 15px' : '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobile ? '125px' : '138px',
          ...(span2 ? { gridColumn: 'span 2' } : {}),
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top Row: Clinical Circular Icon & Micro-Badges */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div
            style={{
              width: isMobile ? '34px' : '38px',
              height: isMobile ? '34px' : '38px',
              minWidth: isMobile ? '34px' : '38px',
              minHeight: isMobile ? '34px' : '38px',
              flexShrink: 0,
              borderRadius: '50%',
              background: isGraduated
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
              boxShadow: isGraduated
                ? '0 2px 6px rgba(5, 150, 105, 0.24), 0 1px 2px rgba(0, 0, 0, 0.06)'
                : '0 2px 6px rgba(13, 148, 136, 0.24), 0 1px 2px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isGraduated ? (
              <Award size={isMobile ? 16 : 18} color="#FFFFFF" strokeWidth={2.4} />
            ) : (
              <Target size={isMobile ? 16 : 18} color="#FFFFFF" strokeWidth={2.4} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {isGraduated ? (
              <>
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
                      background: '#ECFDF5',
                      color: '#047857',
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
                  padding: '2.5px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 800,
                  letterSpacing: '0.3px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Target size={11} color="#059669" />
                <span>Guided Protocol Ready</span>
              </div>
            )}
          </div>
        </div>

        {/* Middle / Bottom Content: Title, Subtitle, & Quick Actions */}
        <div>
          <h4
            className="serif-heading"
            style={{
              fontSize: isMobile ? '15.5px' : '17px',
              fontWeight: 700,
              margin: '0 0 2px',
              color: '#0F172A',
              lineHeight: 1.25,
              letterSpacing: '-0.3px'
            }}
          >
            Clinical Food Reset & Elimination
          </h4>
          <p
            style={{
              fontSize: isMobile ? '11.5px' : '12px',
              color: justLogged ? '#059669' : '#64748B',
              margin: '0 0 8px',
              fontWeight: justLogged ? 700 : 500,
              lineHeight: 1.3
            }}
          >
            {isGraduated ? (
              `${activeProtocolDef ? `${activeProtocolDef.name} • ` : ''}Investigation complete • ${trialV2?.verdict?.confirmedTriggers?.length || 0} Confirmed Trigger(s) • Profile Synchronized`
            ) : trial ? (
              justLogged
                ? `✓ Logged: ${trial.currentSeverity}/10 (${trial.reductionPercent !== null ? `${trial.reductionPercent}% delta` : 'saved'})`
                : (activeProtocolDef
                    ? `${activeProtocolDef.name} • Day ${trial.currentDay} of ${trial.totalDays} • Reset Phase (${trial.adherencePercentage}% on track)`
                    : `Day ${trial.currentDay} of ${trial.totalDays} • Reset Phase (${trial.adherencePercentage}% on track)`)
            ) : (
              'Identify food triggers with a structured 4-step reset.'
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
                  borderRadius: '999px',
                  padding: isMobile ? '5.5px 12px' : '6.5px 15px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '32px',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.32), inset 0 1px 0 rgba(255,255,255,0.25)',
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
                    background: 'linear-gradient(135deg, #0D9488 0%, #059669 100%)',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '999px',
                    padding: isMobile ? '5.5px 12px' : '6.5px 15px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    minHeight: '32px',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.32), inset 0 1px 0 rgba(255,255,255,0.25)',
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
                    borderRadius: '999px',
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
                        borderRadius: '999px',
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
                  borderRadius: '999px',
                  padding: isMobile ? '6px 14px' : '7px 16px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  minHeight: '32px',
                  boxShadow: '0 4px 16px rgba(13, 148, 136, 0.32), inset 0 1px 0 rgba(255,255,255,0.3)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Compass size={12} />
                <span>Begin Guided Reset →</span>
              </button>
            )}
          </div>
        </div>
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
