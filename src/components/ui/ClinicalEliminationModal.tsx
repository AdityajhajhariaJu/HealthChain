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
  FileText,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Heart,
  Pause,
  Play,
  StopCircle,
  Apple
} from 'lucide-react';
import {
  getActiveTrial,
  logTrialDay,
  logTrialExposure,
  startTrial,
  stopActiveTrial,
  ActiveTrialState,
  ELIMINATION_PROTOCOLS,
  CLINICAL_SENSITIVITIES,
  getSuspectFoodsLeaderboard,
} from '../../services/TriggerEngine';
import { GuidedStartModal } from './GuidedStartModal';
import {
  getActiveTrialV2,
  saveActiveTrialV2,
  getChecklistCompletion,
  toggleChecklistTask,
  pauseTrialV2,
  resumeTrialV2,
  stopTrialV2,
  evaluateChallengeReadiness,
  startFoodChallenge,
  recordChallengeObservation,
  completeFoodChallenge,
  getFoodChallenges,
  recordDailyObservation,
} from '../../services/TrialWorkflowService';
import { AdherenceLevel, TrialV2, FoodChallenge } from '../../domain/trials/types';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';

export interface ClinicalEliminationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onTrialUpdated?: (trial: ActiveTrialState) => void;
  inline?: boolean;
  initialProtocolId?: string | null;
}

export const ClinicalEliminationModal: React.FC<ClinicalEliminationModalProps> = ({
  isOpen = true,
  onClose,
  onTrialUpdated,
  inline = false,
  initialProtocolId = null,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<ActiveTrialState | null>(() => getActiveTrial());
  const [selectedProtocolId, setSelectedProtocolId] = useState<string>(() => {
    if (initialProtocolId && ELIMINATION_PROTOCOLS.some((p) => p.id === initialProtocolId)) {
      return initialProtocolId;
    }
    return 'hunt_histamine';
  });
  type EliminationTab = 'guardrails' | 'rechallenge' | 'outcomes' | 'dossier' | 'protocols';
  type ProtocolCategory = 'all' | 'popular' | 'gut' | 'systemic';
  const [activeTab, setActiveTab] = useState<EliminationTab>('guardrails');
  const [tabHistory, setTabHistory] = useState<EliminationTab[]>(['guardrails']);
  
  // Guided Start state
  const [showGuidedStart, setShowGuidedStart] = useState<boolean>(false);
  const [trialV2, setTrialV2] = useState<TrialV2 | null>(() => getActiveTrialV2());

  // Interactive check-in state (Unified on Today tab) - null by default until touched
  const [severityScore, setSeverityScore] = useState<number | null>(null);
  const [adherenceLevel, setAdherenceLevel] = useState<AdherenceLevel>('followed');
  const [checkinNote, setCheckinNote] = useState<string>('');
  const [justLogged, setJustLogged] = useState<boolean>(false);

  // Accidental exposure SOS state
  const [showSos, setShowSos] = useState<boolean>(false);
  const [selectedExposure, setSelectedExposure] = useState<string | null>(null);
  const [sosApplied, setSosApplied] = useState<boolean>(false);

  // Protocol directory categorization & filtering
  const [directoryCategory, setDirectoryCategory] = useState<ProtocolCategory>('all');

  // Timeline guide accordion
  const [showTimelineGuide, setShowTimelineGuide] = useState<boolean>(false);

  // Copy state
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Daily checklist state persisted by date
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});

  // Patient Agency Controls state
  const [showStopModal, setShowStopModal] = useState<boolean>(false);
  const [stopReason, setStopReason] = useState<TrialV2['stoppedReason']>('completed');

  // Readiness Gate and Challenge state
  const [readiness, setReadiness] = useState<ReturnType<typeof evaluateChallengeReadiness> | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<FoodChallenge | null>(null);
  const [allChallenges, setAllChallenges] = useState<FoodChallenge[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(() => Date.now());
  const [isLoggingReaction, setIsLoggingReaction] = useState<boolean>(false);
  const [reactionSeverity, setReactionSeverity] = useState<number>(5);
  const [reactionNote, setReactionNote] = useState<string>('');

  const todayKey = new Date().toLocaleDateString('en-CA');

  const refreshTrialState = () => {
    const current = getActiveTrial();
    const v2 = getActiveTrialV2();
    setTrial(current);
    setTrialV2(v2);

    if (current) {
      setSeverityScore(current.currentSeverity ?? null);
      setSelectedProtocolId(current.trialId);
      // Load persisted checklist
      const completed = getChecklistCompletion(current.trialId, todayKey);
      const m: Record<string, boolean> = {};
      completed.forEach((id) => (m[id] = true));
      setChecklist(m);
    } else {
      setSeverityScore(null);
    }

    if (v2) {
      setReadiness(evaluateChallengeReadiness(v2));
      const challenges = getFoodChallenges(v2.id);
      setAllChallenges(challenges);
      setActiveChallenge(challenges.find((c) => c.status === 'active') || null);
    } else {
      setReadiness(null);
      setActiveChallenge(null);
      setAllChallenges([]);
    }
  };

  useEffect(() => {
    if (isOpen || inline) {
      refreshTrialState();
      const current = getActiveTrial();
      if (current) {
        setActiveTab('guardrails');
        setTabHistory(['guardrails']);
      } else {
        setActiveTab('protocols');
        setTabHistory(['protocols']);
      }
      setShowSos(false);
      setSosApplied(false);
      setSelectedExposure(null);
    }
  }, [isOpen, inline]);

  useEffect(() => {
    if (initialProtocolId && ELIMINATION_PROTOCOLS.some((p) => p.id === initialProtocolId)) {
      setSelectedProtocolId(initialProtocolId);
    }
  }, [initialProtocolId]);

  useEffect(() => {
    if (!activeChallenge) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, [activeChallenge]);

  useEffect(() => {
    const handleTrialUpdated = () => refreshTrialState();
    window.addEventListener('hc_trial_updated', handleTrialUpdated);
    window.addEventListener('hc_trial_v2_updated', handleTrialUpdated);
    window.addEventListener('hc_challenge_updated', handleTrialUpdated);
    return () => {
      window.removeEventListener('hc_trial_updated', handleTrialUpdated);
      window.removeEventListener('hc_trial_v2_updated', handleTrialUpdated);
      window.removeEventListener('hc_challenge_updated', handleTrialUpdated);
    };
  }, []);

  const handleTabChange = (nextTab: EliminationTab) => {
    if (nextTab === activeTab) return;
    triggerHapticSelection();
    setTabHistory((prev) => [...prev, nextTab]);
    setActiveTab(nextTab);
    if (showSos) setShowSos(false);
  };

  const canGoBack = true;

  const handleBack = () => {
    triggerHapticLight();
    // 1. If SOS panel is open in Today, close SOS first
    if (showSos) {
      setShowSos(false);
      return;
    }
    // 2. If on sub-tabs (Timeline, Progress, Doctor Report), return to Today
    if (activeTab === 'rechallenge' || activeTab === 'outcomes' || activeTab === 'dossier') {
      setActiveTab('guardrails');
      setTabHistory(['guardrails']);
      return;
    }
    // 3. If on Today, browse full 11-protocol directory
    if (activeTab === 'guardrails') {
      setActiveTab('protocols');
      setTabHistory(['protocols']);
      return;
    }
    // 4. If on protocols and an active trial exists, return to Today
    if (activeTab === 'protocols' && trial) {
      setActiveTab('guardrails');
      setTabHistory(['guardrails']);
      return;
    }
    // 5. Otherwise (no trial and on protocols), close modal to dashboard
    onClose?.();
  };

  const backButtonLabel = useMemo(() => {
    if (showSos) return 'Back to Today';
    if (activeTab === 'rechallenge') return 'Back to Today';
    if (activeTab === 'outcomes') return 'Back to Today';
    if (activeTab === 'dossier') return 'Back to Today';
    if (activeTab === 'guardrails') return 'Browse All 11 Protocols';
    if (activeTab === 'protocols' && trial) return 'Back to Today';
    return 'Close to dashboard';
  }, [showSos, activeTab, trial]);

  // Filtered Protocols for Directory (unconditional hook execution)
  const filteredProtocols = useMemo(() => {
    if (directoryCategory === 'popular') {
      return ELIMINATION_PROTOCOLS.filter((p) => ['hunt_bloat', 'hunt_histamine', 'dairy_free'].includes(p.id));
    }
    if (directoryCategory === 'gut') {
      return ELIMINATION_PROTOCOLS.filter((p) => ['hunt_bloat', 'low_fodmap', 'dairy_free', 'gluten_gut_rest', 'hunt_transit', 'hunt_heartburn'].includes(p.id));
    }
    if (directoryCategory === 'systemic') {
      return ELIMINATION_PROTOCOLS.filter((p) => ['hunt_histamine', 'low_histamine', 'hunt_kinetic_headache', 'hunt_pots_splanchnic', 'hunt_vagal'].includes(p.id));
    }
    return ELIMINATION_PROTOCOLS;
  }, [directoryCategory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (isOpen || inline)) {
        if (showSos) {
          setShowSos(false);
        } else if (activeTab === 'rechallenge' || activeTab === 'outcomes' || activeTab === 'dossier') {
          setActiveTab('guardrails');
          setTabHistory(['guardrails']);
        } else if (activeTab === 'guardrails') {
          setActiveTab('protocols');
          setTabHistory(['protocols']);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inline, showSos, activeTab, onClose]);

  if (!isOpen && !inline) return null;

  const activeProtocolDef = trial 
    ? (ELIMINATION_PROTOCOLS.find((p) => p.id === trial.trialId) || ELIMINATION_PROTOCOLS[0])
    : (ELIMINATION_PROTOCOLS.find((p) => p.id === selectedProtocolId) || ELIMINATION_PROTOCOLS[0]);
  const selectedProtocolDef = ELIMINATION_PROTOCOLS.find((p) => p.id === selectedProtocolId) || ELIMINATION_PROTOCOLS[0];
  const isProtocolsTab = activeTab === 'protocols' || !trial;
  const suspectFoods = getSuspectFoodsLeaderboard();
  const topSuspectFood = suspectFoods[0];

  const phases = activeProtocolDef.phases && activeProtocolDef.phases.length > 0
    ? activeProtocolDef.phases
    : [
        {
          phase: 1,
          title: 'Phase 1: Reset & Baseline',
          daysRange: 'Days 1 – 7',
          focus: `Calm inflammation by eliminating primary ${activeProtocolDef.targetSensitivity || 'target'} triggers.`,
          clinicalInstructions: [`Strict avoidance of ${activeProtocolDef.eliminatedFoods.slice(0, 3).join(', ')}.`],
        },
        {
          phase: 2,
          title: 'Phase 2: Systematic Testing',
          daysRange: 'Days 8 – 14',
          focus: 'Reintroduce single foods in isolation to confirm what is safe.',
          clinicalInstructions: ['Rechallenge single food item in isolation for 24h, observe 48h.'],
        },
        {
          phase: 3,
          title: 'Phase 3: Long-Term Freedom',
          daysRange: 'Days 15 – 28',
          focus: 'Maintain microbiome diversity with a personalized safe food list.',
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
        desc: i === 0 ? `Zero ${activeProtocolDef.eliminatedFoods[0] || 'target culprits'}` :
              i === 1 ? 'Hydration & digestion support' :
              'Track how your body responds today'
      }))
    : [
        { id: 'task_0', label: `Zero ${activeProtocolDef.eliminatedFoods[0] || 'primary triggers'}`, desc: `Strictly avoid ${activeProtocolDef.eliminatedFoods.slice(0, 2).join(', ')}` },
        { id: 'task_1', label: `Eat ${activeProtocolDef.allowedAlternatives[0] || 'safe swaps'}`, desc: 'Maintain clean nutrient density and satiety' },
        { id: 'task_2', label: 'Hydration with electrolytes (2.0L+)', desc: 'Supports hydration and gentle digestion' },
        { id: 'task_3', label: '12-Hour overnight gut rest', desc: 'Gives the digestive system time to heal' },
      ];

  const sosOptions = (() => {
    const fromElim = activeProtocolDef.eliminatedFoods || [];
    const fromSuspect = suspectFoods.slice(0, 2).map((s) => s.name);
    const combined = Array.from(new Set([...fromElim.slice(0, 2), ...fromSuspect]));
    return combined.slice(0, 4);
  })();

  const handleToggleChecklist = (taskId: string) => {
    if (!trial) return;
    triggerHapticSelection();
    const updatedList = toggleChecklistTask(trial.trialId, taskId, todayKey);
    const m: Record<string, boolean> = {};
    updatedList.forEach((id) => (m[id] = true));
    setChecklist(m);
  };

  const handleLogScore = () => {
    if (!trial || severityScore === null) return;
    triggerHapticSuccess();
    const updated = logTrialDay(severityScore, adherenceLevel, checkinNote || undefined);
    setTrial(updated);
    if (trialV2) {
      const v2Updated = recordDailyObservation(trialV2.id, {
        date: todayKey,
        severityScore,
        adherenceLevel,
        notes: checkinNote || undefined,
      });
      if (v2Updated) {
        setTrialV2({ ...v2Updated });
        setReadiness(evaluateChallengeReadiness(v2Updated));
      } else {
        trialV2.baseline.completedObservations = (trialV2.baseline.completedObservations || 0) + 1;
        saveActiveTrialV2(trialV2);
        setTrialV2({ ...trialV2 });
        setReadiness(evaluateChallengeReadiness(trialV2));
      }
    }
    onTrialUpdated?.(updated);
    setJustLogged(true);
    setTimeout(() => setJustLogged(false), 2500);
  };

  const handlePauseTrial = () => {
    if (!trial) return;
    triggerHapticSelection();
    const paused = pauseTrialV2(trial.trialId);
    setTrialV2(paused);
    if (paused) setReadiness(evaluateChallengeReadiness(paused));
  };

  const handleResumeTrial = () => {
    if (!trial) return;
    triggerHapticSuccess();
    const resumed = resumeTrialV2(trial.trialId);
    setTrialV2(resumed);
    if (resumed) setReadiness(evaluateChallengeReadiness(resumed));
  };

  const handleStopTrialConfirm = (reason: TrialV2['stoppedReason']) => {
    if (!trial) return;
    triggerHapticSelection();
    stopTrialV2(trial.trialId, reason);
    stopActiveTrial();
    setTrial(null);
    setTrialV2(null);
    setShowStopModal(false);
    setActiveTab('protocols');
  };

  const handleStartChallengeItem = (foodName: string) => {
    if (!trialV2) return;
    triggerHapticSuccess();
    const ch = startFoodChallenge(trialV2.id, {
      itemId: foodName,
      displayName: foodName,
      doseDescription: '1 standard portion consumed in isolation',
    });
    setActiveChallenge(ch);
    const updatedChallenges = getFoodChallenges(trialV2.id);
    setAllChallenges(updatedChallenges);
  };

  const handleRecordChallengeReaction = (hasReaction: boolean, customSeverity?: number, note?: string) => {
    if (!trialV2 || !activeChallenge) return;
    triggerHapticSelection();
    const updated = recordChallengeObservation(
      trialV2.id,
      activeChallenge.id,
      customSeverity ?? (hasReaction ? 6 : 0),
      hasReaction,
      note || (hasReaction ? 'Reaction observed during challenge' : 'No symptoms observed')
    );
    setActiveChallenge(updated);
    setIsLoggingReaction(false);
    setReactionNote('');
  };

  const handleCompleteChallengeItem = (outcome: FoodChallenge['outcome']) => {
    if (!trialV2 || !activeChallenge) return;
    triggerHapticSuccess();
    completeFoodChallenge(trialV2.id, activeChallenge.id, outcome || 'no_reaction');
    setActiveChallenge(null);
    const updatedChallenges = getFoodChallenges(trialV2.id);
    setAllChallenges(updatedChallenges);
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
    1. Review the recorded observations and missing baseline information with a qualified clinician.
    2. Discuss whether and when to advance to ${nextProvocation} once clinical baseline stabilizes.
    3. Do not infer causation or confirmed tolerance from this protocol alone.

Trajectory Log:
${trial.symptomScores.map((s) => `• ${s.date || `Day ${s.day}`}: ${s.severity}/10 (${s.adhered ? 'Protocol followed' : 'Protocol deviation reported'}) - ${s.note || 'Recorded'}`).join('\n') || 'No symptom scores recorded.'}

Recorded Exposures:
${(trial.exposures || []).map((entry) => `• ${entry.date}: ${entry.trigger} - ${entry.note || 'Exposure recorded'}`).join('\n') || 'No exposures recorded.'}`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch {
      // safe fallback
    }
    setIsCopied(true);
    triggerHapticSuccess();
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!inline && !isOpen) return null;

  const modalInnerContent = (
    <div
      style={{
        width: '100%',
        maxWidth: inline ? '100%' : '760px',
        maxHeight: inline ? 'none' : (isMobile ? 'calc(100vh - max(24px, env(safe-area-inset-top, 24px)))' : 'calc(100vh - 40px)'),
        height: inline ? 'auto' : (isMobile ? '92vh' : 'auto'),
        background: '#FFFFFF',
        borderRadius: inline ? '20px' : (isMobile ? '24px 24px 0 0' : '28px'),
        border: '1px solid #E2E8F0',
        boxShadow: inline ? '0 4px 20px rgba(15, 23, 42, 0.05)' : '0 25px 60px -15px rgba(15, 23, 42, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        overflow: inline ? 'visible' : 'hidden',
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
                    {isProtocolsTab
                      ? '11 EVIDENCE-BASED PROTOCOLS'
                      : trial
                      ? 'ACTIVE HEALTH RESET'
                      : 'SELECT A RESET'}
                  </span>
                  {isProtocolsTab ? (
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>
                      11 Protocols Available
                    </span>
                  ) : trial ? (
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>
                      Day {trial.currentDay} of {trial.totalDays} ({Math.round((trial.currentDay / trial.totalDays) * 100)}% Complete)
                    </span>
                  ) : (
                    <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 700 }}>
                      Choose your starting point
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
                  {isProtocolsTab ? 'Food Elimination & Reset Protocols' : activeProtocolDef.name}
                </h2>
              </div>
            </div>

            {onClose && (
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
            )}
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
                { id: 'guardrails', label: 'Today', icon: CheckCircle2 },
                { id: 'rechallenge', label: 'Timeline', icon: Calendar },
                { id: 'outcomes', label: 'My Progress', icon: TrendingDown },
                { id: 'dossier', label: 'Doctor Report', icon: FileText },
                { id: 'protocols', label: 'All Protocols', icon: Layers },
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
                    {tab.id === 'protocols' && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '999px',
                          background: isActive ? '#ECFDF5' : '#E2E8F0',
                          color: isActive ? '#059669' : '#64748B',
                          marginLeft: '2px',
                        }}
                      >
                        11
                      </span>
                    )}
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
            {isProtocolsTab ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '8px 4px' }}>
                {/* Clean Header & Guided Triage */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 4px', letterSpacing: '-0.4px' }}>
                      Protocol Directory
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, lineHeight: 1.4 }}>
                      Select an evidence-based elimination protocol, or use our triage tool to find your match.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setShowGuidedStart(true);
                    }}
                    style={{
                      background: '#F3F4F6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={14} color="#6366F1" />
                    <span>Guide Me</span>
                  </button>
                </div>

                {/* Minimalist Category Filter Pills */}
                <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', margin: '0 -4px', paddingLeft: '4px' }}>
                  {[
                    { id: 'all', label: 'All Protocols' },
                    { id: 'popular', label: 'Most Popular' },
                    { id: 'gut', label: 'Gut & Digestion' },
                    { id: 'systemic', label: 'Nervous & Systemic' },
                  ].map((cat) => {
                    const isCurrent = directoryCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setDirectoryCategory(cat.id as ProtocolCategory);
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: 'none',
                          background: isCurrent ? '#111827' : '#F3F4F6',
                          color: isCurrent ? '#FFFFFF' : '#4B5563',
                          fontSize: '12px',
                          fontWeight: isCurrent ? 600 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>

                {/* Clean Protocol Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {filteredProtocols.map((p, idx) => {
                    const isSelected = selectedProtocolId === p.id;
                    const isCurrentActive = trial?.trialId === p.id;
                    const isRecommended = ['hunt_bloat', 'hunt_histamine', 'dairy_free'].includes(p.id);
                    const isLast = idx === filteredProtocols.length - 1;

                    return (
                      <div
                        key={p.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          triggerHapticSelection();
                          setSelectedProtocolId(p.id);
                        }}
                        style={{
                          background: isSelected ? '#F9FAFB' : '#FFFFFF',
                          padding: '16px 12px',
                          borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                          borderRadius: isSelected ? '12px' : '0',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          margin: isSelected ? '4px -12px' : '0',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div
                              style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                border: isCurrentActive ? '6px solid #10B981' : isSelected ? '6px solid #111827' : '1px solid #D1D5DB',
                                background: '#FFFFFF',
                                flexShrink: 0,
                                marginTop: '2px',
                                transition: 'all 0.15s ease',
                              }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                                  {p.name}
                                </span>
                                {isCurrentActive && (
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: '12px' }}>
                                    Active
                                  </span>
                                )}
                                {isRecommended && !isCurrentActive && (
                                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#6366F1', background: '#EEF2FF', padding: '2px 8px', borderRadius: '12px' }}>
                                    Recommended
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                                {p.durationDays} Days • {p.targetSensitivity || 'Digestive Reset'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{ paddingLeft: '32px', marginTop: '4px' }}>
                            <div style={{ fontSize: '13px', color: '#4B5563', lineHeight: 1.5, marginBottom: '12px' }}>
                              {p.description}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {p.eliminatedFoods && p.eliminatedFoods.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', width: '45px' }}>Avoid</span>
                                  {p.eliminatedFoods.slice(0, 3).map((food) => (
                                    <span key={food} style={{ fontSize: '12px', color: '#374151' }}>{food}{p.eliminatedFoods.length > 3 ? ',' : ''}</span>
                                  ))}
                                  {p.eliminatedFoods.length > 3 && (
                                    <span style={{ fontSize: '12px', color: '#6B7280' }}>+{p.eliminatedFoods.length - 3} more</span>
                                  )}
                                </div>
                              )}
                              {p.allowedAlternatives && p.allowedAlternatives.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', width: '45px' }}>Enjoy</span>
                                  {p.allowedAlternatives.slice(0, 3).map((food) => (
                                    <span key={food} style={{ fontSize: '12px', color: '#374151' }}>{food}{p.allowedAlternatives.length > 3 ? ',' : ''}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Action Footer (Only show if starting a NEW trial or switching) */}
                {(!trial || selectedProtocolId !== trial.trialId) && (
                  <div style={{ position: 'sticky', bottom: 0, background: 'linear-gradient(to top, rgba(255,255,255,1) 85%, rgba(255,255,255,0))', paddingTop: '16px', paddingBottom: '8px', zIndex: 10 }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticSuccess();
                        const newTrial = startTrial(selectedProtocolId);
                        setTrial(newTrial);
                        onTrialUpdated?.(newTrial);
                        setActiveTab('guardrails');
                        setTabHistory(['guardrails']);
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        borderRadius: '12px',
                        background: '#111827',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        transition: 'transform 0.1s ease, background 0.15s ease',
                      }}
                    >
                      <span>{trial ? 'Switch Protocol' : 'Begin Protocol'}</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* TAB 1: TODAY'S DAILY PLAN (UNIFIED: Checklist + Severity Slider + SOS) */}
                {activeTab === 'guardrails' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Hero Daily Header */}
                    <div
                      style={{
                        padding: '8px 0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {activePhaseObj.title.split(':')[1]?.trim() || activePhaseObj.title}
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>
                            Day {trial.currentDay} of {trial.totalDays}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#374151',
                              background: '#F3F4F6',
                              padding: '4px 10px',
                              borderRadius: '12px',
                            }}
                          >
                            {trial.adherencePercentage}% Adherence
                          </span>
                        </div>
                      </div>

                      {/* Daily Progress Bar */}
                      <div style={{ height: '4px', width: '100%', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.round((trial.currentDay / trial.totalDays) * 100))}%`,
                            background: '#111827',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Paused State Notification */}
                    {trialV2?.status === 'paused' && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Pause size={16} color="#4B5563" />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>Trial Paused</div>
                            <div style={{ fontSize: '12px', color: '#6B7280' }}>Your logs are safely preserved.</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleResumeTrial}
                          style={{ background: '#111827', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Play size={13} /> Resume
                        </button>
                      </div>
                    )}

                    {/* Abundance Guide Card (Minimalist) */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <Apple size={16} color="#111827" />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                          Focus on these staples
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px', lineHeight: 1.5 }}>
                        Restriction is temporary. Nourish your body with these tolerated foods:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {activeProtocolDef.allowedAlternatives.map((alt, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#374151',
                              background: '#F9FAFB',
                              border: '1px solid #E5E7EB',
                              padding: '4px 12px',
                              borderRadius: '16px',
                            }}
                          >
                            {alt}
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#4B5563' }}>
                        <span style={{ fontWeight: 600 }}>Temporarily avoid:</span> {activeProtocolDef.eliminatedFoods.slice(0, 3).join(', ')}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '0' }} />

                    {/* Section 1: Today's Action Checklist */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                          Daily Checklist
                        </h3>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          Tap when completed
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {checklistItems.map((item) => (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleToggleChecklist(item.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '14px',
                              padding: '12px 0',
                              cursor: 'pointer',
                            }}
                          >
                            <div
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: checklist[item.id] ? '#111827' : '#FFFFFF',
                                border: checklist[item.id] ? 'none' : '1.5px solid #D1D5DB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#FFFFFF',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {checklist[item.id] && <Check size={14} strokeWidth={3} />}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '14px', fontWeight: 500, color: checklist[item.id] ? '#9CA3AF' : '#111827', textDecoration: checklist[item.id] ? 'line-through' : 'none' }}>{item.label}</div>
                              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{item.desc}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '0' }} />

                    {/* Section 2: Daily Severity Check-In */}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                        How do you feel today?
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '16px' }}>
                        Log your overall comfort to track your baseline.
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563' }}>1 (Best)</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          value={severityScore ?? 5}
                          onChange={(e) => setSeverityScore(parseFloat(e.target.value))}
                          style={{ flex: 1, accentColor: '#111827' }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#4B5563' }}>10 (Worst)</span>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
                          Protocol Adherence:
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {[
                            { id: 'followed', label: 'Followed' },
                            { id: 'partially_followed', label: 'Partial' },
                            { id: 'not_followed', label: 'Did not follow' },
                          ].map((lvl) => {
                            const isSelected = adherenceLevel === lvl.id;
                            return (
                              <button
                                key={lvl.id}
                                type="button"
                                onClick={() => {
                                  triggerHapticSelection();
                                  setAdherenceLevel(lvl.id as AdherenceLevel);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '10px 4px',
                                  borderRadius: '8px',
                                  border: isSelected ? '1px solid #111827' : '1px solid #E5E7EB',
                                  background: isSelected ? '#111827' : '#FFFFFF',
                                  color: isSelected ? '#FFFFFF' : '#4B5563',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {lvl.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Quick note (e.g. bloat after lunch)..."
                        value={checkinNote}
                        onChange={(e) => setCheckinNote(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB',
                          fontSize: '13px',
                          marginBottom: '16px',
                          background: '#F9FAFB',
                          color: '#111827',
                        }}
                      />

                      <button
                        type="button"
                        disabled={severityScore === null}
                        onClick={handleLogScore}
                        style={{
                          width: '100%',
                          background: severityScore === null ? '#F3F4F6' : '#111827',
                          color: severityScore === null ? '#9CA3AF' : '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '12px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: severityScore === null ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background 0.2s',
                        }}
                      >
                        {justLogged ? (
                          <>
                            <Check size={16} /> Saved Successfully
                          </>
                        ) : severityScore === null ? (
                          <>
                            Select a score to save
                          </>
                        ) : (
                          <>
                            Save Check-In
                          </>
                        )}
                      </button>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '0' }} />

                    {/* Section 3: Accidental Exposure SOS Box */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={16} color="#6B7280" />
                          <span style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>Accidental Exposure?</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSos(!showSos)}
                          style={{
                            background: 'none',
                            color: '#4B5563',
                            border: '1px solid #E5E7EB',
                            borderRadius: '16px',
                            padding: '4px 12px',
                            fontSize: '11px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          {showSos ? 'Hide' : 'Report'}
                        </button>
                      </div>

                      {showSos && (
                        <div style={{ marginTop: '16px' }}>
                          <p style={{ fontSize: '13px', color: '#4B5563', margin: '0 0 12px' }}>
                            Select the trigger to view mitigation steps:
                          </p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {sosOptions.map((trig) => (
                              <button
                                key={trig}
                                type="button"
                                onClick={() => handleApplySosMitigation(trig)}
                                style={{
                                  background: selectedExposure === trig ? '#111827' : '#FFFFFF',
                                  color: selectedExposure === trig ? '#FFFFFF' : '#374151',
                                  border: selectedExposure === trig ? '1px solid #111827' : '1px solid #E5E7EB',
                                  borderRadius: '16px',
                                  padding: '6px 14px',
                                  fontSize: '12px',
                                  fontWeight: 500,
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
                                marginTop: '16px',
                                background: '#F9FAFB',
                                padding: '16px',
                                borderRadius: '8px',
                                border: '1px solid #E5E7EB',
                              }}
                            >
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                                Relief Steps for {selectedExposure}:
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12px', color: '#4B5563', lineHeight: 1.6 }}>
                                <li>Take a digestive enzyme or sip warm peppermint/ginger tea.</li>
                                <li>Hydrate with a glass of water with a pinch of mineral salt/electrolytes.</li>
                                <li><strong>Continue:</strong> One exposure does not ruin your trial. Resume as planned.</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '0' }} />

                    {/* Section 4: Patient Agency & Trial Controls */}
                    <div style={{ paddingBottom: '16px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                        Trial Controls
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>
                        Pause, switch, or stop your protocol at any time.
                      </div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {trialV2?.status === 'paused' ? (
                          <button
                            type="button"
                            onClick={handleResumeTrial}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '8px',
                              background: '#111827',
                              color: '#FFFFFF',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Play size={14} /> Resume
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePauseTrial}
                            style={{
                              flex: 1,
                              padding: '10px',
                              borderRadius: '8px',
                              background: '#FFFFFF',
                              color: '#4B5563',
                              border: '1px solid #E5E7EB',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <Pause size={14} /> Pause
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setActiveTab('protocols')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            color: '#4B5563',
                            border: '1px solid #E5E7EB',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Switch Protocol
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowStopModal(true)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            background: '#FFFFFF',
                            color: '#DC2626',
                            border: '1px solid #FCA5A5',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <StopCircle size={14} /> Stop
                        </button>
                      </div>
                    </div>
                  </div>
                )}

            {/* TAB 2: REINTRODUCTION TIMELINE */}
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
                    <ArrowLeft size={13} /> Back to Today
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Food Reintroduction Roadmap</span>
                </div>

                {/* Readiness Gate Banner */}
                {readiness && !readiness.ready ? (
                  <div style={{ background: '#FFFBEB', borderRadius: '14px', padding: '14px 16px', border: '1.5px solid #FDE68A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <ShieldAlert size={18} color="#D97706" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#92400E' }}>
                        Baseline Calibration Gate: Rechallenge Locked
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#78350F', lineHeight: 1.5 }}>
                      Single-food reintroduction requires a reliable baseline. You have logged <strong>{readiness.observedCount} of {readiness.requiredCount}</strong> required daily observations.
                    </div>
                    <div style={{ fontSize: '11px', color: '#B45309', marginTop: '6px' }}>
                      ⏳ Missing logs do not advance the trial. Complete {Math.max(1, readiness.requiredCount - readiness.observedCount)} more daily check-in{readiness.requiredCount - readiness.observedCount === 1 ? '' : 's'} on the Today tab to unlock safe testing.
                    </div>
                  </div>
                ) : (
                  <div style={{ background: '#ECFDF5', borderRadius: '14px', padding: '14px 16px', border: '1.5px solid #A7F3D0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <ShieldCheck size={18} color="#059669" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#065F46' }}>
                        Baseline Calibration Complete: Challenge Phase Unlocked
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.5 }}>
                      You have sufficient observations ({readiness?.observedCount || 5} check-ins) to distinguish true reactions from baseline daily fluctuations.
                    </div>
                  </div>
                )}

                {/* Active Rechallenge Challenge Card */}
                {readiness && readiness.ready && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {activeChallenge ? (() => {
                      const challengeStartedMs = new Date(activeChallenge.startedAt).getTime();
                      const challengeWindowMs = (activeChallenge.observationWindowHours || 48) * 3600 * 1000;
                      const elapsedMs = Math.max(0, currentTime - challengeStartedMs);
                      const remainingMs = Math.max(0, challengeWindowMs - elapsedMs);
                      const isWindowExpired = remainingMs === 0;
                      const hoursLeft = Math.floor(remainingMs / (3600 * 1000));
                      const minsLeft = Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000));
                      const progressPct = Math.min(100, Math.round((elapsedMs / challengeWindowMs) * 100));
                      const hasReactionLogged = activeChallenge.observations?.some((o: any) => o.hasReaction) || false;

                      return (
                        <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1.5px solid #0D9488', boxShadow: '0 4px 16px rgba(13, 148, 136, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Active Food Reintroduction
                              </div>
                              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
                                {activeChallenge.displayName}
                              </div>
                              <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '1px' }}>
                                Dose: {activeChallenge.doseDescription}
                              </div>
                            </div>
                            <div>
                              {isWindowExpired ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, color: '#065F46' }}>
                                  <CheckCircle2 size={13} color="#059669" /> 48h Window Complete
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#F0FDFA', border: '1px solid #99F6E4', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, color: '#0F766E' }}>
                                  <Clock size={13} color="#0D9488" /> {hoursLeft}h {minsLeft}m remaining
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 48-Hour Progress Bar */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', marginBottom: '4px', fontWeight: 600 }}>
                              <span>48-Hour Observation Timeline</span>
                              <span>{progressPct}% elapsed</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, #14B8A6 0%, #0D9488 100%)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                            </div>
                          </div>

                          {/* Observation Logger Form */}
                          {!isLoggingReaction ? (
                            <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                                Any digestive, skin, or energy reaction since ingestion?
                              </div>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRecordChallengeReaction(false, 0, 'No adverse symptoms observed')}
                                  style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #86EFAC',
                                    background: '#F0FDF4',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#166534',
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  😊 Asymptomatic / Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsLoggingReaction(true)}
                                  style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #FECACA',
                                    background: '#FEF2F2',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#991B1B',
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  😣 Reaction Observed
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: '#FFF7ED', padding: '12px 14px', borderRadius: '12px', border: '1.5px solid #FED7AA', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#9A3412' }}>
                                Record Reaction Severity & Symptoms
                              </div>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', fontWeight: 700, color: '#7C2D12', marginBottom: '4px' }}>
                                  <span>Flare Severity</span>
                                  <span>{reactionSeverity}/10</span>
                                </div>
                                <input
                                  type="range"
                                  min={1}
                                  max={10}
                                  value={reactionSeverity}
                                  onChange={(e) => setReactionSeverity(parseInt(e.target.value, 10))}
                                  style={{ width: '100%', accentColor: '#C2410C' }}
                                />
                              </div>
                              <input
                                type="text"
                                value={reactionNote}
                                onChange={(e) => setReactionNote(e.target.value)}
                                placeholder="Describe symptoms (e.g., lower abdominal bloating, cramps 45m post-meal)"
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #FDBA74',
                                  fontSize: '12px',
                                  color: '#0F172A',
                                  background: '#FFFFFF',
                                }}
                              />
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRecordChallengeReaction(true, reactionSeverity, reactionNote || 'Reaction observed during challenge')}
                                  style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: '#C2410C',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                  }}
                                >
                                  Save Reaction Observation
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsLoggingReaction(false);
                                    setReactionNote('');
                                  }}
                                  style={{
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: '#FFFFFF',
                                    color: '#64748B',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Recorded Observations Log */}
                          {activeChallenge.observations && activeChallenge.observations.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                Challenge Log ({activeChallenge.observations.length} recorded)
                              </div>
                              {activeChallenge.observations.map((obs, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    background: obs.hasReaction ? '#FEF2F2' : '#F0FDF4',
                                    border: `1px solid ${obs.hasReaction ? '#FECACA' : '#BBF7D0'}`,
                                    fontSize: '11.5px',
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: obs.hasReaction ? '#991B1B' : '#166534' }}>
                                    <span>{obs.hasReaction ? `😣 Reaction (Score ${obs.severityScore}/10)` : '😊 No Adverse Reaction'}</span>
                                    <span style={{ fontSize: '10.5px', color: '#64748B' }}>+{obs.hoursSinceIngestion.toFixed(1)}h post-meal</span>
                                  </div>
                                  {obs.symptomNotes && (
                                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>{obs.symptomNotes}</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Outcome Evaluation Card */}
                          {hasReactionLogged ? (
                            <div style={{ background: '#FFF7ED', borderRadius: '12px', padding: '12px 14px', border: '1.5px solid #FED7AA', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={16} color="#EA580C" />
                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#9A3412' }}>
                                  Symptom Trigger Identified
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '11.5px', color: '#7C2D12', lineHeight: 1.45 }}>
                                Adverse symptoms were recorded following testing of <strong>{activeChallenge.displayName}</strong>. To support mucosal healing, keep this food eliminated for the remainder of this trial. Re-test in 3–6 months.
                              </p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCompleteChallengeItem('reaction_recorded')}
                                  style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: '#C2410C',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                  }}
                                >
                                  Confirm Trigger & Keep Set Aside
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCompleteChallengeItem('inconclusive')}
                                  style={{
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: '#FFFFFF',
                                    color: '#64748B',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                  }}
                                >
                                  Inconclusive
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '12px 14px', border: '1.5px solid #86EFAC', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={16} color="#16A34A" />
                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#166534' }}>
                                  {isWindowExpired ? '48-Hour Observation Complete: Tolerated' : 'Complete 48-Hour Observation'}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '11.5px', color: '#14532D', lineHeight: 1.45 }}>
                                No reactions were reported. Once the observation window is satisfied, this food can be safely reintroduced into your regular rotation.
                              </p>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCompleteChallengeItem('no_reaction')}
                                  style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: '#0D9488',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                  }}
                                >
                                  Clear Food & Mark Tolerated ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCompleteChallengeItem('inconclusive')}
                                  style={{
                                    padding: '9px 12px',
                                    borderRadius: '8px',
                                    background: '#FFFFFF',
                                    color: '#64748B',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    minHeight: '44px',
                                  }}
                                >
                                  Inconclusive
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })() : (
                      /* No Active Challenge: Select Food to Challenge */
                      <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '16px', border: '1.5px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            Start a Structured Single-Food Rechallenge
                          </div>
                          <div style={{ fontSize: '12px', color: '#475569', marginTop: '2px', lineHeight: 1.4 }}>
                            Select an eliminated staple to test in isolation for 48 hours:
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {activeProtocolDef.eliminatedFoods.map((food, idx) => {
                            const past = allChallenges.find((c) => c.itemId === food || c.displayName === food);
                            const isTested = Boolean(past);
                            return (
                              <div
                                key={idx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 12px',
                                  borderRadius: '10px',
                                  background: isTested ? '#F8FAFC' : '#F0FDFA',
                                  border: `1px solid ${isTested ? '#E2E8F0' : '#99F6E4'}`,
                                  gap: '8px',
                                }}
                              >
                                <div>
                                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>
                                    {food}
                                  </div>
                                  <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                    1 standard serving in isolation
                                  </div>
                                </div>
                                {isTested ? (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      padding: '3px 8px',
                                      borderRadius: '999px',
                                      background: past?.outcome === 'no_reaction' ? '#DCFCE7' : past?.outcome === 'reaction_recorded' ? '#FEE2E2' : '#F1F5F9',
                                      color: past?.outcome === 'no_reaction' ? '#166534' : past?.outcome === 'reaction_recorded' ? '#991B1B' : '#475569',
                                    }}
                                  >
                                    {past?.outcome === 'no_reaction' ? 'Cleared ✓' : past?.outcome === 'reaction_recorded' ? 'Trigger ⚠️' : 'Inconclusive'}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleStartChallengeItem(food)}
                                    style={{
                                      padding: '8px 14px',
                                      borderRadius: '8px',
                                      background: '#0D9488',
                                      color: '#FFFFFF',
                                      border: 'none',
                                      fontSize: '11.5px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      minHeight: '44px',
                                    }}
                                  >
                                    Start 48h Challenge
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Completed Food Challenges History */}
                    {allChallenges.filter((c) => c.status === 'completed' || c.status === 'reaction_recorded').length > 0 && (
                      <div style={{ background: '#F8FAFC', borderRadius: '16px', padding: '14px 16px', border: '1px solid #E2E8F0' }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                          Completed Reintroductions ({allChallenges.filter((c) => c.status === 'completed' || c.status === 'reaction_recorded').length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {allChallenges
                            .filter((c) => c.status === 'completed' || c.status === 'reaction_recorded')
                            .map((ch) => (
                              <div
                                key={ch.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  background: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  fontSize: '12px',
                                }}
                              >
                                <span style={{ fontWeight: 700, color: '#1E293B' }}>{ch.displayName}</span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    background: ch.outcome === 'no_reaction' ? '#DCFCE7' : ch.outcome === 'reaction_recorded' ? '#FEE2E2' : '#F1F5F9',
                                    color: ch.outcome === 'no_reaction' ? '#166534' : ch.outcome === 'reaction_recorded' ? '#991B1B' : '#475569',
                                  }}
                                >
                                  {ch.outcome === 'no_reaction' ? 'Cleared / Tolerated ✓' : ch.outcome === 'reaction_recorded' ? 'Trigger Identified ⚠️' : 'Inconclusive'}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  Elimination is only Step 1. The <strong>Testing Phase</strong> is where you reintroduce foods one by one to discover what you can safely enjoy again, preventing unnecessary lifetime restrictions.
                </div>

                {/* How Reintroduction Works Accordion */}
                <div
                  style={{
                    background: '#F0FDFA',
                    borderRadius: '12px',
                    border: '1px solid #99F6E4',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowTimelineGuide(!showTimelineGuide)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HelpCircle size={15} color="#0D9488" />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E' }}>
                        How Food Reintroduction Works (3 Simple Rules)
                      </span>
                    </div>
                    {showTimelineGuide ? <ChevronUp size={15} color="#0D9488" /> : <ChevronDown size={15} color="#0D9488" />}
                  </button>

                  {showTimelineGuide && (
                    <div style={{ padding: '0 14px 12px', fontSize: '11.5px', color: '#134E4A', lineHeight: 1.6 }}>
                      <div><strong>1. Test 1 Food in Isolation:</strong> Eat a normal serving of one eliminated food with breakfast or lunch.</div>
                      <div><strong>2. Wait 48 Hours:</strong> Do not eat that food again for 2 days. Keep other meals safe and clean.</div>
                      <div><strong>3. Observe & Decide:</strong> If zero symptoms occur, that food is cleared! If symptoms return, you found a true trigger.</div>
                    </div>
                  )}
                </div>

                {/* Step-by-Step Phase Roadmap */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {phases.map((p, idx) => {
                    const match = p.daysRange.match(/(\d+)\s*[–-]\s*(\d+)/);
                    const startDay = match ? parseInt(match[1], 10) : idx * 7 + 1;
                    const endDay = match ? parseInt(match[2], 10) : (idx + 1) * 7;
                    const isActive = trial.currentDay >= startDay && trial.currentDay <= endDay;
                    const isCompleted = trial.currentDay > endDay;
                    const statusLabel = isActive
                      ? `ACTIVE NOW (Day ${trial.currentDay}/${endDay})`
                      : isCompleted
                      ? 'COMPLETED ✓'
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
                              color: isActive ? '#059669' : isCompleted ? '#166534' : '#64748B',
                              background: isActive ? '#DCFCE7' : isCompleted ? '#DCFCE7' : '#F1F5F9',
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

            {/* TAB 3: MY PROGRESS & SYMPTOM TRENDS */}
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
                    <ArrowLeft size={13} /> Back to Today
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Symptom Trends & Patterns</span>
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

                {/* Recent Check-Ins Log */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: 0 }}>
                      Recent Daily Check-Ins
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('guardrails')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#059669',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Log Today's Score
                    </button>
                  </div>

                  {trial.symptomScores && trial.symptomScores.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {trial.symptomScores.slice(-5).reverse().map((score, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            fontSize: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#0F172A' }}>Day {score.day}</span>
                            {score.note && <span style={{ color: '#64748B' }}>— {score.note}</span>}
                          </div>
                          <span
                            style={{
                              fontWeight: 800,
                              color: score.severity <= 3 ? '#059669' : score.severity <= 6 ? '#D97706' : '#DC2626',
                              background: score.severity <= 3 ? '#ECFDF5' : score.severity <= 6 ? '#FFFBEB' : '#FEF2F2',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {score.severity}/10
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px dashed #CBD5E1', textAlign: 'center', fontSize: '12px', color: '#64748B' }}>
                      No check-ins logged yet. Rate your comfort on the Today tab to build your trend line.
                    </div>
                  )}
                </div>

                {/* Suspected Triggers & Safe Swaps (Formerly Culprit Board) */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', margin: '0 0 8px' }}>
                    Suspected Food Triggers & Safe Swaps
                  </h3>

                  {topSuspectFood ? (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '10px' }}>
                      <div style={{ background: '#FEF2F2', padding: '14px', borderRadius: '12px', border: '1px solid #FECACA' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase' }}>
                          Primary Suspect Observed
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#991B1B', marginTop: '2px' }}>
                          {topSuspectFood.name} ({topSuspectFood.primarySensitivity})
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#B91C1C', marginTop: '4px', lineHeight: 1.4 }}>
                          {topSuspectFood.correlationPercent > 0 ? `${topSuspectFood.correlationPercent}% of recorded flares` : 'Tracked during exposures'}. Reaction window: {topSuspectFood.reactionWindow}.
                        </div>
                      </div>

                      <div style={{ background: '#F0FDF4', padding: '14px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>
                          Empirical Safe Swap
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#065F46', marginTop: '2px' }}>
                          {topSuspectFood.safeSwap || activeProtocolDef.allowedAlternatives[0] || 'Safe protocol alternative'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#047857', marginTop: '4px', lineHeight: 1.4 }}>
                          Provides clean nutrition without triggering mucosal or histamine flares.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px dashed #CBD5E1', textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔍</div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
                        Pattern Recognition in Progress
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748B', maxWidth: '440px', margin: '4px auto 0', lineHeight: 1.4 }}>
                        As you record daily check-ins and log meals, HealthChain automatically searches for correlations to isolate your true biological food triggers.
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669', marginTop: '8px' }}>
                        Day {trial.currentDay} of {trial.totalDays} • {trial.symptomScores.length} check-in{trial.symptomScores.length === 1 ? '' : 's'} recorded
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: DOCTOR REPORT (Progressive Milestone Disclosure) */}
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
                    <ArrowLeft size={13} /> Back to Today
                  </button>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Doctor Visit Summary</span>
                </div>

                {/* Progressive Milestone Banner */}
                {trial.currentDay < 7 ? (
                  <div
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#1E40AF',
                    }}
                  >
                    <Sparkles size={16} color="#2563EB" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Early Draft:</strong> Your complete 7-day clinical report unlocks on Day 7 ({Math.max(1, 7 - trial.currentDay)} day{7 - trial.currentDay === 1 ? '' : 's'} remaining). You can copy or print your current observations anytime.
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      background: '#F0FDF4',
                      border: '1px solid #86EFAC',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#166534',
                    }}
                  >
                    <CheckCircle2 size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Full 7-Day Clinical SBAR Complete:</strong> Your observations are ready for review by your gastroenterologist or primary care physician.
                    </span>
                  </div>
                )}

                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
                  Formatted in clinical SBAR (Situation, Background, Assessment, Recommendation) format so your doctor can review your progress in under 30 seconds:
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
                    maxHeight: '260px',
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
                      minHeight: '44px',
                    }}
                  >
                    {isCopied ? <Check size={16} /> : <Copy size={16} />}
                    <span>{isCopied ? 'Copied to Clipboard!' : '1-Tap Copy Summary'}</span>
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
                      minHeight: '44px',
                    }}
                  >
                    <Printer size={15} />
                    <span>Print</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSuccess();
                      onClose?.();
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

                {/* Dedicated High-Resolution Printable SBAR Dossier */}
                <div className="clinical-trial-printable-dossier">
                  <div style={{ borderBottom: '2px solid #0F172A', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', letterSpacing: '1px', textTransform: 'uppercase' }}>
                          HealthChain Clinical Intelligence &middot; Elimination Suite
                        </div>
                        <h1 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
                          Physician SBAR Clinical Brief
                        </h1>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '12px', color: '#64748B' }}>
                        <div><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        <div><strong>Status:</strong> {trial.currentDay >= 7 ? 'Full 7-Day Assessment' : 'Preliminary Calibration'}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '20px', fontSize: '12px', color: '#334155', flexWrap: 'wrap' }}>
                      <span><strong>Protocol:</strong> {activeProtocolDef.name}</span>
                      <span><strong>Target Sensitivity:</strong> {activeProtocolDef.targetSensitivity}</span>
                      <span><strong>Duration:</strong> Day {trial.currentDay} of {trial.totalDays}</span>
                      <span><strong>Adherence:</strong> {trial.adherencePercentage}%</span>
                      <span><strong>Symptom Change:</strong> {trial.reductionPercent !== null ? `${trial.reductionPercent}%` : 'Pending'}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '12.5px', lineHeight: 1.6, color: '#1E293B' }}>
                    <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E', marginBottom: '4px' }}>S — SITUATION</div>
                      <div>Patient presenting with chronic postprandial distress and suspected dietary sensitivities. Structured 28-day elimination protocol ({activeProtocolDef.name}) initiated to identify specific food triggers, reduce systemic inflammatory load, and calibrate mucosal baseline.</div>
                    </div>

                    <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E', marginBottom: '4px' }}>B — BACKGROUND</div>
                      <div>
                        <strong>Baseline Severity:</strong> {trial.baselineSeverity === null ? 'Not recorded' : `${trial.baselineSeverity}/10`}.<br />
                        <strong>Eliminated Compounds:</strong> {activeProtocolDef.eliminatedFoods.join(', ')}.<br />
                        <strong>Clinical Scope:</strong> Protocol isolates candidate irritants without dynamic or unvalidated dietary exclusions. Selection does not confirm allergy or permanent intolerance.
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E', marginBottom: '4px' }}>A — ASSESSMENT</div>
                      <div>
                        <strong>Current Progress:</strong> Day {trial.currentDay} of {trial.totalDays} &middot; Recorded Adherence: {trial.adherencePercentage}% &middot; Current Severity: {trial.currentSeverity === null ? 'Not recorded' : `${trial.currentSeverity}/10`} ({trial.reductionPercent !== null ? `${trial.reductionPercent}% reduction` : 'calibration in progress'}).<br />
                        <strong>Correlated Suspect:</strong> {topSuspectFood ? `${topSuspectFood.name} (${topSuspectFood.primarySensitivity})${topSuspectFood.correlationPercent > 0 ? ` — observed in ${topSuspectFood.correlationPercent}% of logged flares` : ''}` : 'No primary culprit established from available observations'}.<br />
                        <strong>Rechallenge Status:</strong> {allChallenges.filter(c => c.status === 'completed' || c.status === 'reaction_recorded').length > 0 ? `${allChallenges.filter(c => c.status === 'completed' || c.status === 'reaction_recorded').length} food(s) tested: ${allChallenges.filter(c => c.status === 'completed' || c.status === 'reaction_recorded').map(c => `${c.displayName} (${c.outcome === 'no_reaction' ? 'Tolerated' : 'Trigger'})`).join(', ')}` : 'Baseline calibration underway; systematic single-food challenges pending.'}
                      </div>
                    </div>

                    <div style={{ padding: '12px 14px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#0F766E', marginBottom: '4px' }}>R — CLINICAL RECOMMENDATIONS</div>
                      <div>
                        1. Correlate recorded symptom trajectory with patient history and objective biomarkers before altering treatment plans.<br />
                        2. Progress to systematic single-food reintroductions (48-hour isolated challenge windows) only after baseline stabilization (&ge;5 check-ins).<br />
                        3. Avoid lifelong restriction of tolerated foods to preserve gut microbiota diversity and prevent nutritional deficiencies.
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #CBD5E1', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748B', pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                    <div>HealthChain Clinical Governance v2.0.0 &middot; Confidential Health Information</div>
                    <div>Reviewing Clinician: ___________________________ Date: _________</div>
                  </div>
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
                onClose?.();
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
        </div>
  );

  const sharedOverlays = (
    <>
      {/* Stop Trial Confirmation Dialog */}
      {showStopModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000000,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '420px',
              width: '100%',
              padding: '20px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Stop Current Trial?
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px', lineHeight: 1.5 }}>
              Your observations will be safely archived for doctor review. Please select a reason for stopping:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {[
                { id: 'completed', label: 'Symptoms resolved / feel better' },
                { id: 'difficulty', label: 'Too restrictive for daily life' },
                { id: 'clinician_advice', label: 'Advised by my clinician to stop' },
                { id: 'other', label: 'Other personal reason' },
              ].map((r) => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#334155', cursor: 'pointer', minHeight: '36px' }}>
                  <input
                    type="radio"
                    name="stopReason"
                    checked={stopReason === r.id}
                    onChange={() => setStopReason(r.id as any)}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowStopModal(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#F8FAFC', fontSize: '12px', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }}
              >
                Keep Going
              </button>
              <button
                type="button"
                onClick={() => handleStopTrialConfirm(stopReason)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: '#DC2626', color: '#FFFFFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', minHeight: '44px' }}
              >
                Confirm Stop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guided Start Modal */}
      <GuidedStartModal
        isOpen={showGuidedStart}
        onClose={() => setShowGuidedStart(false)}
        onSelectProtocol={(protocolId, initialSeverity) => {
          setShowGuidedStart(false);
          refreshTrialState();
          setSelectedProtocolId(protocolId);
          setActiveTab('guardrails');
        }}
        onBrowseAll={() => {
          setShowGuidedStart(false);
          setActiveTab('protocols');
        }}
      />
    </>
  );

  if (inline) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {modalInnerContent}
        {sharedOverlays}
      </div>
    );
  }

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
            onClose?.();
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
          style={{ width: '100%', maxWidth: '760px', display: 'flex', justifyContent: 'center' }}
        >
          {modalInnerContent}
        </motion.div>
        {sharedOverlays}
      </div>
    </AnimatePresence>,
    document.body
  );
};
