import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Activity, Check, Compass, Award, Sparkles } from 'lucide-react';
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

  const todayStr = new Date().toLocaleDateString('en-CA');
  const todayLog = trial?.symptomScores?.find(s => s.date === todayStr || s.day === trial?.currentDay);
  const hasLoggedToday = Boolean(todayLog);

  return (
    <>
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={isGraduated
          ? `Track Food Triggers - Graduated${activeProtocolDef ? ` (${activeProtocolDef.name})` : ''}. Tap to view your clinical verdict, confirmed triggers, and maintenance plan`
          : trial 
          ? `Track Food Triggers - Day ${trial.currentDay} of ${trial.totalDays}${activeProtocolDef ? ` (${activeProtocolDef.name})` : ''}. Tap to view your daily plan, timeline, and doctor report` 
          : 'Track Food Triggers - Inactive. Tap to choose an elimination protocol'}
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
          background: 'linear-gradient(135deg, #FFFFFF 0%, #FDF2F8 60%, #FCE7F3 100%)',
          border: '1px solid #FBCFE8',
          boxShadow: '0 4px 16px rgba(219, 39, 119, 0.05), 0 1px 2px rgba(0, 0, 0, 0.02)',
          borderRadius: isMobile ? '24px' : '28px',
          padding: isMobile ? '14px 16px' : '16px 20px',
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
                : 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
              boxShadow: isGraduated
                ? '0 2px 6px rgba(5, 150, 105, 0.24), 0 1px 2px rgba(0, 0, 0, 0.06)'
                : '0 2px 6px rgba(219, 39, 119, 0.24), 0 1px 2px rgba(0, 0, 0, 0.06)',
              border: '1px solid rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isGraduated ? (
              <Award size={isMobile ? 16 : 18} color="#FFFFFF" strokeWidth={2.4} />
            ) : (
              <Utensils size={isMobile ? 16 : 18} color="#FFFFFF" strokeWidth={2.4} />
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
                    background: '#FDF2F8',
                    color: '#DB2777',
                    border: '1px solid #FBCFE8',
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
                  background: '#FDF2F8',
                  color: '#DB2777',
                  border: '1px solid #FBCFE8',
                  padding: isMobile ? '3px 8px' : '3.5px 10px',
                  borderRadius: '999px',
                  fontSize: isMobile ? '9.5px' : '10.5px',
                  fontWeight: 800,
                  letterSpacing: '0.4px',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Sparkles size={11} color="#DB2777" />
                <span>4-WEEK PROTOCOL</span>
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
            Track Food Triggers
          </h4>
          <p
            style={{
              fontSize: isMobile ? '11.5px' : '12px',
              color: justLogged ? '#DB2777' : '#64748B',
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
                : hasLoggedToday
                ? `${activeProtocolDef ? `${activeProtocolDef.name} • ` : ''}Day ${trial.currentDay} of ${trial.totalDays} • Check-in recorded (${todayLog?.severity}/10)`
                : (activeProtocolDef
                    ? `${activeProtocolDef.name} • Day ${trial.currentDay} of ${trial.totalDays} • Reset Phase (${trial.adherencePercentage}% on track)`
                    : `Day ${trial.currentDay} of ${trial.totalDays} • Reset Phase (${trial.adherencePercentage}% on track)`)
            ) : (
              'Identify food triggers with a structured 4-step reset.'
            )}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
            {isGraduated ? (
              <button
                type="button"
                data-compact="true"
                onClick={handleOpenModal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  height: isMobile ? '24px' : '26px',
                  padding: isMobile ? '0 11px' : '0 13px',
                  fontSize: isMobile ? '10.5px' : '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  lineHeight: 1,
                  boxShadow: '0 2px 6px rgba(5, 150, 105, 0.25)',
                  whiteSpace: 'nowrap'
                }}
              >
                <Award size={12} />
                <span>View Verdict & Plan →</span>
              </button>
            ) : trial ? (
              !isLogging ? (
                hasLoggedToday ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3.5px',
                        background: '#FDF2F8',
                        border: '1px solid #FBCFE8',
                        borderRadius: '999px',
                        height: isMobile ? '24px' : '26px',
                        padding: isMobile ? '0 9px' : '0 11px',
                        fontSize: isMobile ? '10px' : '10.5px',
                        fontWeight: 700,
                        color: '#DB2777',
                        whiteSpace: 'nowrap',
                        lineHeight: 1
                      }}
                    >
                      <Check size={11} strokeWidth={2.8} /> Today: {todayLog?.severity}/10
                    </span>
                    <motion.button
                      type="button"
                      data-micro="true"
                      className="btn-micro"
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticLight();
                        setIsLogging(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid #CBD5E1',
                        color: '#64748B',
                        borderRadius: '999px',
                        height: isMobile ? '24px' : '26px',
                        padding: isMobile ? '0 9px' : '0 10px',
                        fontSize: isMobile ? '10px' : '10.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        lineHeight: 1
                      }}
                    >
                      Edit
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    type="button"
                    data-micro="true"
                    className="btn-micro"
                    whileTap={{ scale: 0.92 }}
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
                      background: 'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '999px',
                      height: isMobile ? '24px' : '26px',
                      padding: isMobile ? '0 12px' : '0 14px',
                      fontSize: isMobile ? '10.5px' : '11px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(219, 39, 119, 0.25)',
                      whiteSpace: 'nowrap',
                      lineHeight: 1
                    }}
                  >
                    <Activity size={11} strokeWidth={2.6} />
                    <span>Check-In</span>
                  </motion.button>
                )
              ) : (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#FFFFFF',
                    padding: '2px 6px',
                    borderRadius: '999px',
                    border: '1.5px solid #FBCFE8',
                    boxShadow: '0 4px 12px rgba(219, 39, 119, 0.1)',
                    height: isMobile ? '26px' : '28px',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ fontSize: '9.5px', color: '#DB2777', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2px', paddingLeft: '2px' }}>
                    Score:
                  </span>
                  {[
                    { val: 0, label: '0', bg: '#ECFDF5', border: '#A7F3D0', color: '#047857' },
                    { val: 2, label: '2', bg: '#FDF2F8', border: '#FBCFE8', color: '#DB2777' },
                    { val: 5, label: '5', bg: '#FEF3C7', border: '#FDE68A', color: '#B45309' },
                    { val: 8, label: '8', bg: '#FFEDD5', border: '#FED7AA', color: '#C2410C' },
                    { val: 10, label: '10', bg: '#FEF2F2', border: '#FECACA', color: '#DC2626' }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => handleQuickLog(item.val)}
                      style={{
                        minWidth: '22px',
                        height: '20px',
                        padding: '0 4px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 800,
                        border: `1px solid ${item.border}`,
                        background: item.bg,
                        color: item.color,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsLogging(false)}
                    style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '11px', cursor: 'pointer', padding: '0 3px', fontWeight: 800, lineHeight: 1 }}
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
                  gap: '4px',
                  background: 'linear-gradient(135deg, #DB2777 0%, #BE185D 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '999px',
                  height: isMobile ? '24px' : '26px',
                  padding: isMobile ? '0 12px' : '0 14px',
                  fontSize: isMobile ? '10.5px' : '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(219, 39, 119, 0.25)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1
                }}
              >
                <Compass size={12} strokeWidth={2.4} />
                <span>Start Guided Reset →</span>
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Fully Workable Clinical Outcomes Modal */}
      {isModalOpen && (
        <ClinicalEliminationModal
          isOpen={isModalOpen}
          initialMode={isGraduated || trial ? 'active_trial' : 'onboarding'}
          onClose={() => setIsModalOpen(false)}
          onTrialUpdated={(updated) => setTrial(updated)}
        />
      )}
    </>
  );
};
