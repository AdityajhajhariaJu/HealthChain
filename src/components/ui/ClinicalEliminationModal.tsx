import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowLeft,
  Target,
  TrendingDown,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Printer,
  Sparkles,
  Zap,
  ArrowRight,
  RotateCcw,
  Coffee,
  HeartPulse,
  Sliders,
  MessageCircle,
  FileText
} from 'lucide-react';
import {
  getActiveTrial,
  logTrialDay,
  logTrialExposure,
  startTrial,
  ActiveTrialState,
  ELIMINATION_PROTOCOLS,
  CLINICAL_SENSITIVITIES,
  getSuspectFoodsLeaderboard,
} from '../../services/TriggerEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';

interface ClinicalEliminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrialUpdated?: (trial: ActiveTrialState) => void;
}

export const ClinicalEliminationModal: React.FC<ClinicalEliminationModalProps> = ({
  isOpen,
  onClose,
  onTrialUpdated
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<ActiveTrialState | null>(() => getActiveTrial());
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>('hunt_histamine');
  const [activeTab, setActiveTab] = useState<'guardrails' | 'rechallenge' | 'outcomes' | 'dossier'>('guardrails');
  const [tabHistory, setTabHistory] = useState<('guardrails' | 'rechallenge' | 'outcomes' | 'dossier')[]>(['guardrails']);
  
  // Interactive check-in state
  const [severityScore, setSeverityScore] = useState<number>(trial?.currentSeverity ?? 0);
  const [checkinNote, setCheckinNote] = useState<string>('');
  const [justLogged, setJustLogged] = useState<boolean>(false);

  // Accidental exposure SOS state
  const [showSos, setShowSos] = useState<boolean>(false);
  const [selectedExposure, setSelectedExposure] = useState<string | null>(null);
  const [sosApplied, setSosApplied] = useState<boolean>(false);

  // Copy state
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Daily checklist state
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      const current = getActiveTrial();
      setTrial(current);
      if (current) setSeverityScore(current.currentSeverity ?? 0);
      setTabHistory(['guardrails']);
      setActiveTab('guardrails');
      setShowSos(false);
    }
  }, [isOpen]);

  const handleTabChange = (nextTab: 'guardrails' | 'rechallenge' | 'outcomes' | 'dossier') => {
    if (nextTab === activeTab) return;
    triggerHapticSelection();
    setTabHistory((prev) => [...prev, nextTab]);
    setActiveTab(nextTab);
    if (showSos) setShowSos(false);
  };

  const canGoBack = Boolean(showSos || activeTab !== 'guardrails');

  const handleBack = () => {
    triggerHapticLight();
    // 1. If SOS panel is open in Guardrails, close SOS first
    if (showSos) {
      setShowSos(false);
      return;
    }
    // 2. If tab history has previous steps, step back through history
    if (tabHistory.length > 1) {
      const nextHistory = [...tabHistory];
      nextHistory.pop(); // pop current tab
      const previousTab = nextHistory[nextHistory.length - 1];
      setTabHistory(nextHistory);
      setActiveTab(previousTab);
      return;
    }
    // 3. If on a sub-tab without history, return to guardrails root
    if (activeTab !== 'guardrails') {
      setActiveTab('guardrails');
      setTabHistory(['guardrails']);
      return;
    }
  };

  const backButtonLabel = useMemo(() => {
    if (showSos) return 'Back to Guardrails checklist';
    if (activeTab === 'rechallenge') return 'Back to Guardrails';
    if (activeTab === 'outcomes') return 'Back to Guardrails';
    if (activeTab === 'dossier') return 'Back to previous view';
    if (tabHistory.length > 1) return 'Back to previous view';
    return 'Back to Guardrails';
  }, [showSos, activeTab, tabHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSos) {
          setShowSos(false);
        } else if (activeTab !== 'guardrails') {
          setActiveTab('guardrails');
          setTabHistory(['guardrails']);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showSos, activeTab, onClose]);

  if (!isOpen) return null;

  const activeProtocolDef = trial 
    ? (ELIMINATION_PROTOCOLS.find((p) => p.id === trial.trialId) || ELIMINATION_PROTOCOLS[0])
    : (ELIMINATION_PROTOCOLS.find((p) => p.id === selectedProtocolId) || ELIMINATION_PROTOCOLS[0]);
  const suspectFoods = getSuspectFoodsLeaderboard();
  const topSuspectFood = suspectFoods[0];

  const phases = activeProtocolDef.phases && activeProtocolDef.phases.length > 0
    ? activeProtocolDef.phases
    : [
        {
          phase: 1,
          title: 'Phase 1: Strict Elimination & Washout',
          daysRange: 'Days 1 – 7',
          focus: `Eliminate primary ${activeProtocolDef.targetSensitivity} triggers.`,
          clinicalInstructions: [`Strict avoidance of ${activeProtocolDef.eliminatedFoods.slice(0, 3).join(', ')}.`],
        },
        {
          phase: 2,
          title: 'Phase 2: Single-Item Challenge Reintroduction',
          daysRange: 'Days 8 – 14',
          focus: 'Systematically challenge one food group at a time.',
          clinicalInstructions: ['Rechallenge single food item in isolation for 24h, observe 48h.'],
        },
        {
          phase: 3,
          title: 'Phase 3: Tolerance Threshold & Maintenance',
          daysRange: 'Days 15 – 28',
          focus: 'Establish personalized threshold and maintain microbiome diversity.',
          clinicalInstructions: ['Transition to personalized maintenance protocol.'],
        },
      ];

  const currentPhaseIndex = phases.findIndex((p, idx) => {
    const match = p.daysRange.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = parseInt(match[2], 10);
      const day = trial?.currentDay || 1;
      return day >= start && day <= end;
    }
    return idx === 0;
  });

  const activePhaseObj = currentPhaseIndex >= 0 ? phases[currentPhaseIndex] : phases[0];
  const nextPhaseObj = phases[currentPhaseIndex + 1];
  const currentPhaseEndMatch = activePhaseObj.daysRange.match(/(\d+)\s*[–-]\s*(\d+)/);
  const currentPhaseEnd = currentPhaseEndMatch ? parseInt(currentPhaseEndMatch[2], 10) : 7;
  const daysUntilNext = Math.max(1, currentPhaseEnd - (trial?.currentDay || 1) + 1);

  const checklistItems = activeProtocolDef.dailyChecklist && activeProtocolDef.dailyChecklist.length > 0
    ? activeProtocolDef.dailyChecklist.map((task, i) => ({
        id: `task_${i}`,
        label: task,
        desc: i === 0 ? `Strict avoidance of ${activeProtocolDef.eliminatedFoods[0] || 'target culprits'}` :
              i === 1 ? 'Hydration & gut barrier optimization' :
              'Clinical compliance tracking'
      }))
    : [
        { id: 'task_0', label: `Zero ${activeProtocolDef.eliminatedFoods[0] || 'primary triggers'}`, desc: `Strictly avoid ${activeProtocolDef.eliminatedFoods.slice(0, 2).join(', ')}` },
        { id: 'task_1', label: `Incorporate ${activeProtocolDef.allowedAlternatives[0] || 'safe swaps'}`, desc: 'Maintain clean nutrient density and satiety' },
        { id: 'task_2', label: 'Hydration with mineral electrolytes (2.0L+)', desc: 'Supports hydration and digestion' },
        { id: 'task_3', label: '12-Hour overnight gut motilin rest window', desc: 'Gives the digestive system a rest' },
      ];

  const sosOptions = (() => {
    const fromElim = activeProtocolDef.eliminatedFoods || [];
    const fromSuspect = suspectFoods.slice(0, 2).map((s) => s.name);
    const combined = Array.from(new Set([...fromElim.slice(0, 2), ...fromSuspect]));
    return combined.slice(0, 4);
  })();

  const handleLogScore = () => {
    if (!trial) return;
    triggerHapticSuccess();
    const updated = logTrialDay(severityScore, true, checkinNote || undefined);
    setTrial(updated);
    onTrialUpdated?.(updated);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2500);
  };

  const handleApplySosMitigation = (triggerName: string) => {
    if (!trial) return;
    triggerHapticSuccess();
    setSelectedExposure(triggerName);
    setSosApplied(true);
    const updated = logTrialExposure(triggerName, `Accidental exposure recorded. Add a symptom score separately if symptoms change.`);
    setTrial(updated);
    onTrialUpdated?.(updated);
  };

  const handleCopyDossier = () => {
    if (!trial) return;
    triggerHapticLight();
    const primarySuspectText = topSuspectFood ? `${topSuspectFood.name} (${topSuspectFood.primarySensitivity})` : 'Not established from recorded observations';
    const nextProvocation = nextPhaseObj ? `${nextPhaseObj.title} (${nextPhaseObj.daysRange})` : 'Personalized Maintenance Blueprint';
    const topCorrelation = topSuspectFood?.correlationPercent || null;
    const baselineText = trial.baselineSeverity === null ? 'Not recorded' : `${trial.baselineSeverity}/10`;
    const currentText = trial.currentSeverity === null ? 'Not recorded' : `${trial.currentSeverity}/10`;
    const reductionText = trial.reductionPercent === null ? 'Not calculable' : `${trial.reductionPercent}%`;

    const text = `CLINICAL SBAR PHYSICIAN BRIEF: ELIMINATION TRIAL
Protocol: ${activeProtocolDef.name}
Duration: Day ${trial.currentDay} of ${trial.totalDays} | Adherence: ${trial.adherencePercentage}%

S (Situation):
Patient tracking chronic symptom reactivity and postprandial flares. Enrolled in structured ${activeProtocolDef.name} (Target: ${activeProtocolDef.targetSensitivity}) to isolate clinical triggers and stabilize mucosal baseline.

B (Background):
Baseline symptom severity: ${baselineText}. Protocol foods selected for observation: ${activeProtocolDef.eliminatedFoods.slice(0, 3).join(', ')}. Selection does not establish prior exposure or causation.

A (Assessment):
Calendar day ${trial.currentDay} of the protocol. Recorded symptom change: ${reductionText}; current severity: ${currentText}; recorded adherence: ${trial.adherencePercentage}%. Observed suspect: ${primarySuspectText}${topCorrelation !== null ? ` (${topCorrelation}% of recorded flares in the available observations)` : ''}. Tolerated alternatives have not been established unless separately recorded.

R (Recommendation):
1. ${activeProtocolDef.expectedBiomarkerImpact || 'Assess gut barrier integrity and inflammatory clearance.'}
2. Advance to ${nextProvocation} once clinical baseline stabilizes.
3. Formulate customized reintroduction blueprint without blanket restriction.

Trajectory Log:
${trial.symptomScores.map((s) => `• ${s.date || `Day ${s.day}`}: ${s.severity}/10 (${s.adhered ? 'Protocol followed' : 'Protocol deviation reported'}) - ${s.note || 'Recorded'}`).join('\n') || 'No symptom scores recorded.'}

Recorded Exposures:
${(trial.exposures || []).map((entry) => `• ${entry.date}: ${entry.trigger} - ${entry.note || 'Exposure recorded'}`).join('\n') || 'No exposures recorded.'}`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    triggerHapticSuccess();
    setTimeout(() => setIsCopied(false), 2000);
  };

  return createPortal(
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          display: 'flex',
          alignItems: isMobile ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: isMobile ? '0' : '16px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            triggerHapticLight();
            onClose();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="elimination-modal-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: isMobile ? 1 : 0.96, y: isMobile ? '100%' : 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: isMobile ? 1 : 0.96, y: isMobile ? '100%' : 16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            width: '100%',
            maxWidth: '760px',
            maxHeight: isMobile ? 'calc(100vh - max(24px, env(safe-area-inset-top, 24px)))' : 'calc(100vh - 40px)',
            height: isMobile ? '92vh' : 'auto',
            background: '#FFFFFF',
            borderRadius: isMobile ? '24px 24px 0 0' : '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: isMobile ? '16px 16px 14px' : '20px 24px',
              borderBottom: '1px solid #F1F5F9',
              background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
              {canGoBack && (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label={backButtonLabel}
                  title={backButtonLabel}
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
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}

              <div
                style={{
                  width: isMobile ? '36px' : '44px',
                  height: isMobile ? '36px' : '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                  flexShrink: 0,
                }}
              >
                <Target size={isMobile ? 18 : 22} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#6D28D9',
                      background: '#EDE9FE',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {trial ? (activeProtocolDef.targetSensitivity ? activeProtocolDef.targetSensitivity.toUpperCase() : 'CLINICAL GI PROTOCOL') : 'CLINICAL ELIMINATION'}
                  </span>
                  {trial ? (
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>
                      Day {trial.currentDay} of {trial.totalDays} ({Math.round((trial.currentDay / trial.totalDays) * 100)}%)
                    </span>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>
                      Select a Clinical Washout Protocol
                    </span>
                  )}
                </div>
                <h2
                  id="elimination-modal-title"
                  style={{
                    fontSize: isMobile ? '16px' : '20px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '2px 0 0',
                    letterSpacing: '-0.4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {trial ? activeProtocolDef.name : 'Targeted Elimination & Washout Trials'}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              aria-label="Close elimination outcomes modal"
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
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab Navigation (Only when active trial exists) */}
          {trial && (
            <div
              className="hide-scrollbar"
              style={{
                display: 'flex',
                padding: '8px 16px',
                background: '#F8FAFC',
                borderBottom: '1px solid #E2E8F0',
                gap: '8px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {[
                { id: 'guardrails', label: "Today's Guardrails", icon: ShieldAlert },
                { id: 'rechallenge', label: 'Rechallenge Calendar', icon: Calendar },
                { id: 'outcomes', label: 'Outcomes & Verdict', icon: TrendingDown },
                { id: 'dossier', label: 'Visit Summary', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      handleTabChange(tab.id as any);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isActive ? '#FFFFFF' : 'transparent',
                      color: isActive ? '#059669' : '#64748B',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      flex: '0 0 auto',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Modal Body */}
          <div
            style={{
              padding: isMobile ? '16px' : '22px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {!trial ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Introduction Banner */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    border: '1px solid #DDD6FE',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} color="#7C3AED" />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Clinical Trial Protocol
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E1B4B' }}>
                    Choose an Evidence-Based Elimination Protocol
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#4C1D95', lineHeight: 1.5 }}>
                    Choose a protocol to identify food triggers and track results.
                  </div>
                </div>

                {/* Protocol Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ELIMINATION_PROTOCOLS.map((p) => {
                    const isSelected = selectedProtocolId === p.id;
                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          triggerHapticSelection();
                          setSelectedProtocolId(p.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            triggerHapticSelection();
                            setSelectedProtocolId(p.id);
                          }
                        }}
                        style={{
                          background: isSelected ? '#FFFFFF' : '#F8FAFC',
                          borderRadius: '16px',
                          padding: '16px',
                          border: isSelected ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                          boxShadow: isSelected ? '0 4px 14px rgba(124, 58, 237, 0.12)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div
                              style={{
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                border: isSelected ? '6px solid #7C3AED' : '2px solid #CBD5E1',
                                background: '#FFFFFF',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                              }}
                            />
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                                {p.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 700, marginTop: '1px' }}>
                                Target: {p.targetSensitivity}
                              </div>
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#059669',
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.durationDays} Days
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.45, paddingLeft: '32px' }}>
                          {p.description}
                        </div>

                        {p.eliminatedFoods && p.eliminatedFoods.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', paddingLeft: '32px' }}>
                            <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#94A3B8', alignSelf: 'center' }}>
                              Eliminates:
                            </span>
                            {p.eliminatedFoods.slice(0, 3).map((food) => (
                              <span
                                key={food}
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  color: '#DC2626',
                                  background: '#FEF2F2',
                                  border: '1px solid #FECACA',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                }}
                              >
                                {food}
                              </span>
                            ))}
                            {p.eliminatedFoods.length > 3 && (
                              <span style={{ fontSize: '10.5px', color: '#94A3B8', alignSelf: 'center' }}>
                                +{p.eliminatedFoods.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Start Protocol Button */}
                <div style={{ position: 'sticky', bottom: 0, background: 'linear-gradient(to top, rgba(255,255,255,1) 80%, rgba(255,255,255,0))', paddingTop: '12px', paddingBottom: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSuccess();
                      const newTrial = startTrial(selectedProtocolId);
                      setTrial(newTrial);
                      onTrialUpdated?.(newTrial);
                    }}
                    style={{
                      width: '100%',
                      padding: '14px 20px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                      transition: 'transform 0.1s ease',
                    }}
                  >
                    <span>Begin {activeProtocolDef.name}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* TAB 1: TODAY'S GUARDRAILS & ACCIDENTAL EXPOSURE SOS */}
                {activeTab === 'guardrails' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Active Phase Banner */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#065F46', fontWeight: 800, textTransform: 'uppercase' }}>
                      CURRENT PHASE: {activePhaseObj.daysRange.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#064E3B' }}>
                      {activePhaseObj.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                      {activePhaseObj.focus}
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#FFFFFF',
                      padding: '6px 12px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#059669',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    }}
                  >
                    {nextPhaseObj ? `${daysUntilNext} Days Until ${nextPhaseObj.title.split(':')[1]?.trim() || nextPhaseObj.title}` : 'Final Blueprint Phase'}
                  </div>
                </div>

                {/* Daily Adherence Checklist */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: '0 0 8px', letterSpacing: '0.4px' }}>
                    Today's Protocol Adherence Checklist
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {checklistItems.map((item) => (
                      <div
                        key={item.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          triggerHapticSelection();
                          setChecklist({ ...checklist, [item.id]: !checklist[item.id] });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          background: checklist[item.id] ? '#F0FDF4' : '#F8FAFC',
                          border: checklist[item.id] ? '1.5px solid #86EFAC' : '1px solid #E2E8F0',
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            background: checklist[item.id] ? '#10B981' : '#FFFFFF',
                            border: checklist[item.id] ? 'none' : '2px solid #CBD5E1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            flexShrink: 0,
                          }}
                        >
                          {checklist[item.id] && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>{item.label}</div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accidental Exposure SOS Box */}
                <div
                  style={{
                    background: '#FFFBEB',
                    borderRadius: '16px',
                    padding: '14px',
                    border: '1.5px solid #FDE68A',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={18} color="#D97706" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>Accidental Exposure SOS</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSos(!showSos)}
                      style={{
                        background: '#F59E0B',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {showSos ? 'Hide SOS' : 'I Ate a Trigger'}
                    </button>
                  </div>

                  {showSos && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #FEF3C7' }}>
                      <p style={{ fontSize: '12px', color: '#78350F', margin: '0 0 8px' }}>
                        Select the accidental trigger consumed to receive immediate clinical mitigation:
                      </p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {sosOptions.map((trig) => (
                          <button
                            key={trig}
                            type="button"
                            onClick={() => handleApplySosMitigation(trig)}
                            style={{
                              background: selectedExposure === trig ? '#78350F' : '#FFFFFF',
                              color: selectedExposure === trig ? '#FFFFFF' : '#92400E',
                              border: '1px solid #FCD34D',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {trig}
                          </button>
                        ))}
                      </div>

                      {sosApplied && (
                        <div
                          style={{
                            marginTop: '12px',
                            background: '#FFFFFF',
                            padding: '12px',
                            borderRadius: '10px',
                            border: '1px solid #FDE68A',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', marginBottom: '4px' }}>
                            🛡️ Immediate Clinical Action for {selectedExposure}:
                          </div>
                          <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#78350F', lineHeight: 1.5 }}>
                            <li>Take 1 capsule of broad-spectrum digestive enzymes (or Alpha-galactosidase for fructans).</li>
                            <li>Sip 500ml warm peppermint or ginger water to calm intestinal spasms.</li>
                            <li><strong>Protocol Adjustment:</strong> Current washout phase extended by 24 hours to preserve baseline integrity before rechallenge.</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: RECHALLENGE PROVOCATION CALENDAR */}
            {activeTab === 'rechallenge' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '-4px' }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={13} /> Back to Guardrails
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Rechallenge Phase Roadmap</span>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                  An elimination diet is incomplete without the <strong>Challenge Phase</strong>. Systematically provocating one food group at a time confirms the biological culprit while preventing unnecessary permanent restriction.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {phases.map((p, idx) => {
                    const match = p.daysRange.match(/(\d+)\s*[–-]\s*(\d+)/);
                    const startDay = match ? parseInt(match[1], 10) : idx * 7 + 1;
                    const endDay = match ? parseInt(match[2], 10) : (idx + 1) * 7;
                    const isActive = trial.currentDay >= startDay && trial.currentDay <= endDay;
                    const isCompleted = trial.currentDay > endDay;
                    const statusLabel = isActive
                      ? `CURRENT (Day ${trial.currentDay}/${endDay})`
                      : isCompleted
                      ? 'COMPLETED'
                      : `STARTS IN ${Math.max(1, startDay - trial.currentDay)} DAYS`;

                    return (
                      <div
                        key={p.phase}
                        style={{
                          borderRadius: '16px',
                          padding: '14px 16px',
                          background: isActive ? '#F0FDF4' : isCompleted ? '#F8FAFC' : '#FFFFFF',
                          border: isActive ? '2px solid #10B981' : '1px solid #E2E8F0',
                          boxShadow: isActive ? '0 4px 14px rgba(16, 185, 129, 0.15)' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A' }}>{p.title}</span>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: isActive ? '#059669' : '#64748B',
                              background: isActive ? '#DCFCE7' : '#F1F5F9',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            {statusLabel} ({p.daysRange})
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>{p.focus}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>{p.clinicalInstructions.join(' ')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: OUTCOMES & VERDICT */}
            {activeTab === 'outcomes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '-6px' }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={13} /> Back to Guardrails
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Symptom Delta & Correlation</span>
                </div>
                {/* Quantified Score Delta Card */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                    borderRadius: '20px',
                    padding: '18px',
                    color: '#FFFFFF',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      RECORDED SYMPTOM CHANGE
                    </div>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#34D399', lineHeight: 1.1 }}>
                      {trial.reductionPercent === null ? 'BASELINE NEEDED' : `${trial.reductionPercent > 0 ? '-' : ''}${Math.abs(trial.reductionPercent)}% CHANGE`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                      Baseline: {trial.baselineSeverity ?? 'Not recorded'}{trial.baselineSeverity !== null ? '/10' : ''} ➔ Current: <strong style={{ color: '#34D399' }}>{trial.currentSeverity ?? 'Not recorded'}{trial.currentSeverity !== null ? '/10' : ''}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700 }}>ADHERENCE RATE</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF' }}>{trial.adherencePercentage}%</div>
                    <div style={{ fontSize: '11px', color: '#34D399' }}>{trial.completedDays} Days Verified</div>
                  </div>
                </div>

                {/* Log Today's Score */}
                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                    Log Today's Severity Check-In (Day {trial.currentDay})
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.5"
                      value={severityScore}
                      onChange={(e) => setSeverityScore(parseFloat(e.target.value))}
                      style={{ flex: 1, accentColor: '#10B981' }}
                    />
                    <span style={{ fontSize: '16px', fontWeight: 800, color: severityScore <= 4 ? '#059669' : '#DC2626', minWidth: '45px' }}>
                      {severityScore}/10
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Optional symptom note (e.g. slight bloating after dinner, no brain fog)"
                    value={checkinNote}
                    onChange={(e) => setCheckinNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      marginBottom: '10px',
                    }}
                  />

                  <button
                    type="button"
                    onClick={handleLogScore}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {justLogged ? (
                      <>
                        <Check size={16} /> Saved & Outcome Updated!
                      </>
                    ) : (
                      <>
                        <Activity size={15} /> Save Today's Score
                      </>
                    )}
                  </button>
                </div>

                {/* Culprit Isolation Board */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    Culprit Isolation Board
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                    <div style={{ background: '#FEF2F2', padding: '12px', borderRadius: '12px', border: '1px solid #FECACA' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                        Repeated observation to review
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#991B1B', marginTop: '2px' }}>
                        {topSuspectFood ? `${topSuspectFood.name} (${topSuspectFood.primarySensitivity})` : 'No repeated observation established'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#B91C1C', marginTop: '2px' }}>
                        {topSuspectFood
                          ? `${topSuspectFood.correlationPercent > 0 ? `${topSuspectFood.correlationPercent}% of recorded flares; ` : ''}${topSuspectFood.daysObserved} recorded day${topSuspectFood.daysObserved === 1 ? '' : 's'}.`
                          : 'Add dated meal and symptom observations before drawing a connection.'}
                      </div>
                    </div>

                    <div style={{ background: '#F0FDF4', padding: '12px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                        Alternatives in this protocol
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#065F46', marginTop: '2px' }}>
                        {activeProtocolDef.allowedAlternatives.slice(0, 3).join(', ')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                        Suggestions only. Tolerance has not been confirmed unless you recorded a challenge.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PHYSICIAN VISIT SUMMARY */}
            {activeTab === 'dossier' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '-4px' }}>
                  <button
                    type="button"
                    onClick={handleBack}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    <ArrowLeft size={13} /> Back to Outcomes
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Clinical SBAR Summary</span>
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Pre-formatted SBAR summary of your elimination trial ready to copy and send via patient portal (MyChart/Epic) or hand directly to your gastroenterologist:
                </div>

                <div
                  style={{
                    background: '#F8FAFC',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid #E2E8F0',
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    color: '#334155',
                    lineHeight: 1.6,
                    maxHeight: '280px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}
                >
{`CLINICAL SBAR PHYSICIAN BRIEF: ELIMINATION TRIAL
Protocol: ${activeProtocolDef.name}
Duration: Day ${trial.currentDay} of ${trial.totalDays} | Adherence: ${trial.adherencePercentage}%

S (Situation):
Patient tracking chronic symptom reactivity and postprandial flares. Enrolled in structured ${activeProtocolDef.name} (Target: ${activeProtocolDef.targetSensitivity}) to isolate clinical triggers and stabilize mucosal baseline.

B (Background):
Baseline symptom severity: ${trial.baselineSeverity === null ? 'Not recorded' : `${trial.baselineSeverity}/10`}. Protocol foods selected for observation: ${activeProtocolDef.eliminatedFoods.slice(0, 3).join(', ')}. Selection does not establish prior exposure or causation.

A (Assessment):
Calendar day ${trial.currentDay}. Recorded symptom change: ${trial.reductionPercent === null ? 'Not calculable' : `${trial.reductionPercent}%`}; current severity: ${trial.currentSeverity === null ? 'Not recorded' : `${trial.currentSeverity}/10`}; recorded adherence: ${trial.adherencePercentage}%. Observed suspect: ${topSuspectFood ? `${topSuspectFood.name} (${topSuspectFood.primarySensitivity})${topSuspectFood.correlationPercent > 0 ? `; present in ${topSuspectFood.correlationPercent}% of recorded flares` : ''}` : 'Not established from recorded observations'}. Protocol alternatives are suggestions, not confirmed tolerance.

R (Recommendation):
1. Review the recorded observations and missing baseline information with a qualified clinician.
2. Discuss whether and when to advance to ${nextPhaseObj ? nextPhaseObj.title : 'a systematic single-food rechallenge'}.
3. Do not infer causation or confirmed tolerance from this protocol alone.`}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopyDossier}
                    style={{
                      flex: 1,
                      background: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{isCopied ? 'Copied to Clipboard!' : '1-Tap Copy Clinical Brief'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      window.print();
                    }}
                    style={{
                      background: '#F1F5F9',
                      color: '#334155',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Printer size={15} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSuccess();
                      onClose();
                      const activeCaseId = getUnifiedCaseScope().caseId;
                      const targetUrl = activeCaseId ? `/app/case-prep?caseId=${encodeURIComponent(activeCaseId)}` : '/app/case-prep';
                      navigate(targetUrl, {
                        state: {
                          initialBriefNote: `[Clinical Elimination SBAR Summary]\nProtocol: ${activeProtocolDef.name}\nDay ${trial.currentDay}/${trial.totalDays}\nReduction: ${trial.reductionPercent !== null ? `-${trial.reductionPercent}%` : 'Baseline pending'}\nCulprit: ${topSuspectFood ? topSuspectFood.name : activeProtocolDef.eliminatedFoods[0]}`,
                          returnTo: '/app/today?openElimination=true',
                          returnLabel: 'Back to Elimination Suite'
                        }
                      });
                    }}
                    style={{
                      background: '#F0FDFA',
                      color: '#0F766E',
                      border: '1px solid #99F6E4',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FileText size={15} />
                    <span>Bring to Case Prep</span>
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </div>

          {/* Footer CTA */}
          <div
            style={{
              padding: '12px 20px',
              borderTop: '1px solid #F1F5F9',
              background: '#FAFAFA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                onClose();
                navigate('/app/dietician?tab=elimination&returnTo=%2Fapp%2Ftoday%3FopenElimination%3Dtrue', { 
                  state: { 
                    tab: 'elimination',
                    returnTo: '/app/today?openElimination=true',
                    returnLabel: 'Back to Elimination Suite Card'
                  } 
                });
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0D9488',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>Full Dietician View</span>
              <ArrowRight size={13} />
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
