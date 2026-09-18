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
  Apple,
  MoreVertical,
  Search,
  Compass,
  ClipboardList,
  Trash2
} from 'lucide-react';
import {
  getActiveTrial,
  logTrialDay,
  logTrialExposure,
  startTrial,
  stopActiveTrial,
  resetActiveTrial,
  ActiveTrialState,
  ELIMINATION_PROTOCOLS,
  CLINICAL_SENSITIVITIES,
  getSuspectFoodsLeaderboard,
} from '../../services/TriggerEngine';
import { GuidedStartModal } from './GuidedStartModal';
import { EliminationOnboardingWizard } from './EliminationOnboardingWizard';
import {
  getActiveTrialV2,
  saveActiveTrialV2,
  getChecklistCompletion,
  toggleChecklistTask,
  pauseTrialV2,
  resumeTrialV2,
  stopTrialV2,
  resetActiveTrialV2,
  evaluateChallengeReadiness,
  startFoodChallenge,
  recordChallengeObservation,
  completeFoodChallenge,
  getFoodChallenges,
  recordDailyObservation,
} from '../../services/TrialWorkflowService';
import { AdherenceLevel, TrialV2, FoodChallenge } from '../../domain/trials/types';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection, triggerHapticHeavy } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';

export interface ClinicalEliminationModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onTrialUpdated?: (trial: ActiveTrialState | null) => void;
  inline?: boolean;
  initialProtocolId?: string | null;
  initialMode?: 'onboarding' | 'active_trial' | 'directory';
}

export const ClinicalEliminationModal: React.FC<ClinicalEliminationModalProps> = ({
  isOpen = true,
  onClose,
  onTrialUpdated,
  inline = false,
  initialProtocolId = null,
  initialMode,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [trial, setTrial] = useState<ActiveTrialState | null>(() => getActiveTrial());
  const [trialV2, setTrialV2] = useState<TrialV2 | null>(() => getActiveTrialV2());

  type SuiteMode = 'onboarding' | 'active_trial' | 'directory';
  const [suiteMode, setSuiteMode] = useState<SuiteMode>(() => {
    if (initialMode) return initialMode;
    if (trial) return 'active_trial';
    return 'onboarding';
  });

  const [showAssessmentModal, setShowAssessmentModal] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

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

  // Minimalist progressive disclosure and overflow states
  const [showOverflowMenu, setShowOverflowMenu] = useState<boolean>(false);
  const [showSwapDrawer, setShowSwapDrawer] = useState<boolean>(false);
  const [showCheckinDetails, setShowCheckinDetails] = useState<boolean>(false);
  const [swapSearchQuery, setSwapSearchQuery] = useState<string>('');

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
    if (showSos) {
      setShowSos(false);
      return;
    }
    if (showSwapDrawer) {
      setShowSwapDrawer(false);
      return;
    }
    if (showOverflowMenu) {
      setShowOverflowMenu(false);
      return;
    }
    if (showAssessmentModal) {
      setShowAssessmentModal(false);
      return;
    }
    if (showResetConfirm) {
      setShowResetConfirm(false);
      return;
    }
    if (suiteMode === 'directory') {
      if (trial) {
        setSuiteMode('active_trial');
        setActiveTab('guardrails');
      } else {
        setSuiteMode('onboarding');
      }
      return;
    }
    if (suiteMode === 'onboarding' && trial) {
      setSuiteMode('active_trial');
      return;
    }
    // Sub-tabs return to Today
    if (activeTab === 'rechallenge' || activeTab === 'outcomes' || activeTab === 'dossier') {
      setActiveTab('guardrails');
      setTabHistory(['guardrails']);
      return;
    }
    // Main tabs dismiss modal
    onClose?.();
  };

  const backButtonLabel = useMemo(() => {
    if (showSos || showSwapDrawer) return 'Back to Today';
    if (suiteMode === 'directory') return trial ? 'Back to Today' : 'Back to Onboarding';
    if (suiteMode === 'onboarding') return trial ? 'Back to Today' : 'Close to dashboard';
    if (activeTab === 'rechallenge' || activeTab === 'outcomes' || activeTab === 'dossier') return 'Back to Today';
    return 'Close to dashboard';
  }, [showSos, showSwapDrawer, suiteMode, trial, activeTab]);

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
        } else if (showSwapDrawer) {
          setShowSwapDrawer(false);
        } else if (showOverflowMenu) {
          setShowOverflowMenu(false);
        } else if (showAssessmentModal) {
          setShowAssessmentModal(false);
        } else if (showResetConfirm) {
          setShowResetConfirm(false);
        } else if (suiteMode === 'directory') {
          if (trial) setSuiteMode('active_trial');
          else setSuiteMode('onboarding');
        } else if (suiteMode === 'onboarding' && trial) {
          setSuiteMode('active_trial');
        } else if (activeTab === 'rechallenge' || activeTab === 'outcomes' || activeTab === 'dossier') {
          setActiveTab('guardrails');
          setTabHistory(['guardrails']);
        } else {
          onClose?.();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inline, showSos, showSwapDrawer, showOverflowMenu, showAssessmentModal, showResetConfirm, suiteMode, trial, activeTab, onClose]);

  if (!isOpen && !inline) return null;

  const activeProtocolDef = trial 
    ? (ELIMINATION_PROTOCOLS.find((p) => p.id === trial.trialId) || ELIMINATION_PROTOCOLS[0])
    : (ELIMINATION_PROTOCOLS.find((p) => p.id === selectedProtocolId) || ELIMINATION_PROTOCOLS[0]);
  const selectedProtocolDef = ELIMINATION_PROTOCOLS.find((p) => p.id === selectedProtocolId) || ELIMINATION_PROTOCOLS[0];
  const isProtocolsTab = suiteMode === 'directory' || (suiteMode !== 'onboarding' && (activeTab === 'protocols' || !trial));
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
              padding: isMobile ? '14px 16px' : '16px 22px',
              borderBottom: '1px solid #F1F5F9',
              background: '#FFFFFF',
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
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    minHeight: '36px',
                    borderRadius: '50%',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0F172A',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <ArrowLeft size={16} />
                </button>
              )}

              <div
                style={{
                  width: isMobile ? '34px' : '38px',
                  height: isMobile ? '34px' : '38px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0F172A',
                  flexShrink: 0,
                }}
              >
                <Target size={isMobile ? 16 : 18} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      color: suiteMode === 'onboarding' ? '#065F46' : '#475569',
                      background: suiteMode === 'onboarding' ? '#ECFDF5' : '#F1F5F9',
                      padding: '2px 7px',
                      borderRadius: '999px',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {suiteMode === 'onboarding'
                      ? 'ELIMINATION SUITE ONBOARDING'
                      : isProtocolsTab
                      ? '11 EVIDENCE-BASED PROTOCOLS'
                      : trial
                      ? 'ACTIVE HEALTH RESET'
                      : 'SELECT A RESET'}
                  </span>
                  {suiteMode === 'onboarding' ? (
                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                      Step-by-Step Clinical Intake
                    </span>
                  ) : isProtocolsTab ? (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      11 Protocols Available
                    </span>
                  ) : trial ? (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      Day {trial.currentDay} of {trial.totalDays} ({Math.round((trial.currentDay / trial.totalDays) * 100)}% Complete)
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                      Choose your starting point
                    </span>
                  )}
                </div>
                <h2
                  id="elimination-modal-title"
                  style={{
                    fontSize: isMobile ? '15px' : '18px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '1px 0 0',
                    letterSpacing: '-0.3px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {suiteMode === 'onboarding'
                    ? 'Clinical Food Reset Intake'
                    : isProtocolsTab
                    ? 'Food Elimination & Reset Protocols'
                    : activeProtocolDef.name}
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              {trial && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                    aria-label="Trial options"
                    title="Trial Options"
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: showOverflowMenu ? '#F1F5F9' : '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>

                  {showOverflowMenu && (
                    <>
                      <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                        onClick={() => setShowOverflowMenu(false)}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '42px',
                          right: 0,
                          background: '#FFFFFF',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                          border: '1px solid #E2E8F0',
                          padding: '6px',
                          zIndex: 100,
                          minWidth: '170px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                      {trialV2?.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleResumeTrial();
                            setShowOverflowMenu(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#15803D',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <Play size={14} /> Resume Trial
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handlePauseTrial();
                            setShowOverflowMenu(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#475569',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <Pause size={14} /> Pause Trial
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSuiteMode('onboarding');
                          setShowOverflowMenu(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Compass size={14} /> Retake Guided Intake
                      </button>

                      {trialV2?.intakeAssessment && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowAssessmentModal(true);
                            setShowOverflowMenu(false);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#475569',
                            cursor: 'pointer',
                            textAlign: 'left',
                            width: '100%',
                          }}
                        >
                          <ClipboardList size={14} /> View Intake Assessment
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSuiteMode('directory');
                          setActiveTab('protocols');
                          setShowOverflowMenu(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <RotateCcw size={14} /> Browse All Protocols
                      </button>

                      <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0' }} />

                      <button
                        type="button"
                        onClick={() => {
                          setShowStopModal(true);
                          setShowOverflowMenu(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#DC2626',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <StopCircle size={14} /> Stop Trial
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowResetConfirm(true);
                          setShowOverflowMenu(false);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 12px',
                          borderRadius: '8px',
                          border: 'none',
                          background: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#991B1B',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <Trash2 size={14} /> Reset Protocol & Start Fresh
                      </button>
                    </div>
                  </>
                )}
                </div>
              )}

              {onClose && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    onClose();
                  }}
                  aria-label="Close elimination outcomes modal"
                  style={{
                    width: '36px',
                    height: '36px',
                    minWidth: '36px',
                    minHeight: '36px',
                    borderRadius: '50%',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Tab Navigation (Only when active trial exists and in active trial mode) */}
          {trial && suiteMode === 'active_trial' && (
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
            {suiteMode === 'onboarding' ? (
              <EliminationOnboardingWizard
                onProtocolSelect={(protocolId) => {
                  setSelectedProtocolId(protocolId);
                  setSuiteMode('directory');
                }}
                onComplete={() => {
                  refreshTrialState();
                  setSuiteMode('active_trial');
                  setActiveTab('guardrails');
                  onTrialUpdated?.(getActiveTrial());
                }}
                onCancel={() => {
                  if (trial) {
                    setSuiteMode('active_trial');
                  } else {
                    onClose?.();
                  }
                }}
                onBrowseProtocols={() => {
                  setSuiteMode('directory');
                }}
              />
            ) : (isProtocolsTab || !trial) ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Active Trial Notice Banner (if trial exists) */}
                {trial && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      border: '1.5px solid #86EFAC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>🎯</span>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', textTransform: 'uppercase' }}>
                          Active Reset In Progress
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#14532D' }}>
                          {activeProtocolDef.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '1px' }}>
                          Day {trial.currentDay} of {trial.totalDays} ({Math.round((trial.currentDay / trial.totalDays) * 100)}% Complete) • Adherence: {trial.adherencePercentage}%
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticSelection();
                        setActiveTab('guardrails');
                      }}
                      style={{
                        background: '#16A34A',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                      }}
                    >
                      <span>Return to Today's Tasks</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                )}

                {/* Guided Start Hero Recommendation Banner */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    border: '1.5px solid #5EEAD4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles size={16} color="#0D9488" />
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Recommended Starting Path
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#134E4A', marginTop: '2px' }}>
                      Not sure which protocol fits your symptoms?
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#115E59', marginTop: '2px' }}>
                      Answer 3 quick questions (~30s) to see the single best matched protocol with safe alternatives.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setSuiteMode('onboarding');
                    }}
                    style={{
                      background: '#0D9488',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '9px 16px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
                      minHeight: '44px',
                    }}
                  >
                    <span>Launch Guided Intake</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

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
                      Evidence-Based Food Resets • 11 Options
                    </span>
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#1E1B4B' }}>
                    {trial ? 'Explore or Switch Elimination Protocols' : 'Choose Your Starting Reset Protocol'}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#4C1D95', lineHeight: 1.5 }}>
                    Each protocol temporarily eliminates common irritants to calm your symptoms, followed by systematic reintroduction to confirm what is safe.
                  </div>
                </div>

                {/* Category Filter Pills (Cures decision paralysis) */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {[
                    { id: 'all', label: 'All (11)' },
                    { id: 'popular', label: '★ Most Popular (3)' },
                    { id: 'gut', label: 'Gut & Digestion (6)' },
                    { id: 'systemic', label: 'Nervous & Systemic (5)' },
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
                          padding: '6px 12px',
                          borderRadius: '999px',
                          border: isCurrent ? '1.5px solid #7C3AED' : '1px solid #E2E8F0',
                          background: isCurrent ? '#F5F3FF' : '#FFFFFF',
                          color: isCurrent ? '#6D28D9' : '#64748B',
                          fontSize: '11.5px',
                          fontWeight: isCurrent ? 800 : 600,
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

                {/* Protocol Options List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredProtocols.map((p) => {
                    const isSelected = selectedProtocolId === p.id;
                    const isCurrentActive = trial?.trialId === p.id;
                    const isRecommended = ['hunt_bloat', 'hunt_histamine', 'dairy_free'].includes(p.id);

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
                          background: isCurrentActive ? '#F0FDF4' : isSelected ? '#FFFFFF' : '#F8FAFC',
                          borderRadius: '16px',
                          padding: '16px',
                          border: isCurrentActive ? '2px solid #16A34A' : isSelected ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                          boxShadow: isCurrentActive ? '0 4px 14px rgba(22, 163, 74, 0.12)' : isSelected ? '0 4px 14px rgba(124, 58, 237, 0.12)' : 'none',
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
                                border: isCurrentActive ? '6px solid #16A34A' : isSelected ? '6px solid #7C3AED' : '2px solid #CBD5E1',
                                background: '#FFFFFF',
                                flexShrink: 0,
                                transition: 'all 0.15s ease',
                              }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0F172A' }}>
                                  {p.name}
                                </span>
                                {isCurrentActive && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      color: '#15803D',
                                      background: '#DCFCE7',
                                      border: '1px solid #86EFAC',
                                      padding: '1px 7px',
                                      borderRadius: '999px',
                                    }}
                                  >
                                    Active Now
                                  </span>
                                )}
                                {isRecommended && !isCurrentActive && (
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: 800,
                                      color: '#6D28D9',
                                      background: '#F3E8FF',
                                      border: '1px solid #DDD6FE',
                                      padding: '1px 7px',
                                      borderRadius: '999px',
                                    }}
                                  >
                                    ★ Top Recommended
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '11px', color: isCurrentActive ? '#15803D' : '#7C3AED', fontWeight: 700, marginTop: '1px' }}>
                                Focus: {p.targetSensitivity || 'Digestive Reset'}
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

                        {/* What You Avoid & What You Eat Instead */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '32px' }}>
                          {p.eliminatedFoods && p.eliminatedFoods.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#DC2626', alignSelf: 'center' }}>
                                Avoid:
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

                          {p.allowedAlternatives && p.allowedAlternatives.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#059669', alignSelf: 'center' }}>
                                Eat instead:
                              </span>
                              {p.allowedAlternatives.slice(0, 3).map((food) => (
                                <span
                                  key={food}
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    color: '#059669',
                                    background: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    padding: '2px 7px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  {food}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Sticky Action Button */}
                <div style={{ position: 'sticky', bottom: 0, background: 'linear-gradient(to top, rgba(255,255,255,1) 80%, rgba(255,255,255,0))', paddingTop: '12px', paddingBottom: '4px' }}>
                  {trial && selectedProtocolId === trial.trialId ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticSelection();
                        setSuiteMode('active_trial');
                        setActiveTab('guardrails');
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 20px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                      }}
                    >
                      <span>Return to Today's Tasks ({activeProtocolDef.name})</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticSuccess();
                        const newTrial = startTrial(selectedProtocolId);
                        setTrial(newTrial);
                        setSuiteMode('active_trial');
                        onTrialUpdated?.(newTrial);
                        setActiveTab('guardrails');
                        setTabHistory(['guardrails']);
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
                      <span>{trial ? `Switch to ${selectedProtocolDef.name}` : `Begin ${selectedProtocolDef.name}`}</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* TAB 1: TODAY'S DAILY PLAN (UNIFIED MINIMALIST DESIGN) */}
                {activeTab === 'guardrails' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Ambient Daily Header */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {activePhaseObj.title.split(':')[1]?.trim() || activePhaseObj.title}
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '1px' }}>
                            Day {trial.currentDay} of {trial.totalDays} • {activeProtocolDef.name}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#059669',
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: '999px',
                            }}
                          >
                            {trial.adherencePercentage}% Adherence
                          </span>
                        </div>
                      </div>

                      {/* Hairline 3px Progress Bar */}
                      <div style={{ height: '4px', width: '100%', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min(100, Math.round((trial.currentDay / trial.totalDays) * 100))}%`,
                            background: '#10B981',
                            borderRadius: '999px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Paused State Notification */}
                    {trialV2?.status === 'paused' && (
                      <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '10px 14px', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Pause size={16} color="#D97706" />
                          <div>
                            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#92400E' }}>Trial Paused</span>
                            <div style={{ fontSize: '11px', color: '#B45309' }}>Your logs are safely preserved. Resume whenever you are ready.</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleResumeTrial}
                          style={{ background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Play size={12} /> Resume
                        </button>
                      </div>
                    )}

                    {/* Card 1: What You Can Abundantly Enjoy Today (Monash Positive Food Anchor) */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Apple size={16} color="#059669" />
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            What You Can Abundantly Enjoy Today
                          </span>
                        </div>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '999px' }}>
                          Safe Staples
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginBottom: '10px' }}>
                        Restriction is temporary. Focus your meals around these nourishing, tolerated staples:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {activeProtocolDef.allowedAlternatives.slice(0, 4).map((alt, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              color: '#0F172A',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              padding: '4px 10px',
                              borderRadius: '8px',
                            }}
                          >
                            ✓ {alt}
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: '#64748B' }}>
                        <span>Temporarily set aside: {activeProtocolDef.eliminatedFoods.slice(0, 3).join(', ')}</span>
                        <button
                          type="button"
                          onClick={() => setShowSwapDrawer(true)}
                          style={{ background: 'none', border: 'none', color: '#059669', fontWeight: 700, cursor: 'pointer', padding: 0, fontSize: '11px' }}
                        >
                          Full swap guide ({activeProtocolDef.allowedAlternatives.length} items) →
                        </button>
                      </div>
                    </div>

                    {/* Card 2: Today's Action Checklist (Apple-Inspired Task Strip) */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0F172A', textTransform: 'uppercase', margin: 0, letterSpacing: '0.4px' }}>
                          Today's Action Checklist
                        </h3>
                        <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>
                          Tap when completed
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {checklistItems.map((item, idx) => (
                          <React.Fragment key={item.id}>
                            {idx > 0 && <div style={{ height: '1px', background: '#F8FAFC', margin: '2px 0' }} />}
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleToggleChecklist(item.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '8px 4px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                minHeight: '40px',
                                transition: 'background 0.15s ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: checklist[item.id] ? '#10B981' : '#FFFFFF',
                                  border: checklist[item.id] ? 'none' : '2px solid #CBD5E1',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#FFFFFF',
                                  flexShrink: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {checklist[item.id] && <Check size={13} strokeWidth={3} />}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12.5px', fontWeight: 600, color: checklist[item.id] ? '#94A3B8' : '#0F172A', textDecoration: checklist[item.id] ? 'line-through' : 'none' }}>
                                  {item.label}
                                </div>
                                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{item.desc}</div>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Card 3: Daily Gut Comfort Check-In (Bowelle 1-Tap Reaction Model) */}
                    <div
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        padding: '16px',
                        border: '1px solid #F1F5F9',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                            How do you feel today? (Day {trial.currentDay})
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Rate your overall gut and body comfort:
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: severityScore === null ? '#F1F5F9' : severityScore <= 3 ? '#DCFCE7' : severityScore <= 6 ? '#FEF3C7' : '#FEE2E2',
                            color: severityScore === null ? '#64748B' : severityScore <= 3 ? '#15803D' : severityScore <= 6 ? '#B45309' : '#B91C1C',
                          }}
                        >
                          {severityScore === null ? 'Select score' : severityScore <= 3 ? `😊 Calm (${severityScore}/10)` : severityScore <= 6 ? `😐 Mild (${severityScore}/10)` : `😣 Flare (${severityScore}/10)`}
                        </div>
                      </div>

                      {/* 4 Discrete Reaction Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
                        {[
                          { score: 2, label: 'Calm', emoji: '😊' },
                          { score: 4, label: 'Good', emoji: '🙂' },
                          { score: 6, label: 'Mild', emoji: '😐' },
                          { score: 8, label: 'Flare', emoji: '😣' },
                        ].map((btn) => {
                          const isSelected = severityScore !== null && Math.abs(severityScore - btn.score) <= 1;
                          return (
                            <button
                              key={btn.score}
                              type="button"
                              onClick={() => {
                                triggerHapticSelection();
                                setSeverityScore(btn.score);
                              }}
                              style={{
                                padding: '10px 4px',
                                borderRadius: '10px',
                                border: isSelected ? '2px solid #10B981' : '1px solid #E2E8F0',
                                background: isSelected ? '#ECFDF5' : '#FAFAFA',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span style={{ fontSize: '18px' }}>{btn.emoji}</span>
                              <span style={{ fontSize: '11px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#065F46' : '#334155' }}>
                                {btn.label}
                              </span>
                              <span style={{ fontSize: '9px', color: '#94A3B8' }}>{btn.score}/10</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Continuous Slider (Role slider for full fine-tuning & test compatibility) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#059669' }}>1</span>
                        <input
                          type="range"
                          role="slider"
                          aria-label="Severity score"
                          min="1"
                          max="10"
                          step="0.5"
                          value={severityScore ?? 5}
                          onChange={(e) => setSeverityScore(parseFloat(e.target.value))}
                          style={{ flex: 1, height: '4px', accentColor: '#10B981' }}
                        />
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#DC2626' }}>10</span>
                      </div>

                      {/* Progressive Disclosure for Adherence & Notes */}
                      <div style={{ marginBottom: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setShowCheckinDetails(!showCheckinDetails)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#059669',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '4px 0',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {showCheckinDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{showCheckinDetails ? 'Hide details' : '+ Add protocol adherence & notes'}</span>
                        </button>

                        {showCheckinDetails && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                                Protocol Adherence Today:
                              </div>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                {[
                                  { id: 'followed', label: 'Followed' },
                                  { id: 'partially_followed', label: 'Partly followed' },
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
                                        padding: '6px 2px',
                                        borderRadius: '6px',
                                        border: isSelected ? '2px solid #10B981' : '1px solid #E2E8F0',
                                        background: isSelected ? '#ECFDF5' : '#FFFFFF',
                                        color: isSelected ? '#065F46' : '#64748B',
                                        fontSize: '11px',
                                        fontWeight: isSelected ? 700 : 500,
                                        cursor: 'pointer',
                                        minHeight: '36px',
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
                              placeholder="Optional note: e.g. bloat after lunch, headache gone"
                              value={checkinNote}
                              onChange={(e) => setCheckinNote(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                fontSize: '11.5px',
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Save Check-In Button */}
                      <button
                        type="button"
                        disabled={severityScore === null}
                        onClick={handleLogScore}
                        style={{
                          width: '100%',
                          background: severityScore === null ? '#E2E8F0' : '#10B981',
                          color: severityScore === null ? '#94A3B8' : '#FFFFFF',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '11px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: severityScore === null ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: severityScore === null ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.25)',
                          minHeight: '44px',
                        }}
                      >
                        {justLogged ? (
                          <>
                            <Check size={16} /> Saved & Progress Updated!
                          </>
                        ) : severityScore === null ? (
                          <>
                            <Activity size={15} /> Select a score to record check-in
                          </>
                        ) : (
                          <>
                            <Activity size={15} /> Save Today's Check-In
                          </>
                        )}
                      </button>
                    </div>

                    {/* Safety Valve Link (Accidental Exposure Relief) */}
                    <div style={{ textAlign: 'center', padding: '6px 0 2px' }}>
                      <button
                        type="button"
                        onClick={() => setShowSos(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748B',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                        }}
                      >
                        Ate an off-track trigger? View quick relief steps →
                      </button>
                    </div>

                    {/* Secondary Trial Controls Footer (Clean 1-Line Strip) */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        padding: '10px 0 4px',
                        borderTop: '1px solid #F1F5F9',
                        flexWrap: 'wrap',
                      }}
                    >
                      {trialV2?.status === 'paused' ? (
                        <button
                          type="button"
                          onClick={handleResumeTrial}
                          style={{ background: 'none', border: 'none', color: '#15803D', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Play size={12} /> Resume Trial
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePauseTrial}
                          style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Pause size={12} /> Pause Trial
                        </button>
                      )}

                      <span style={{ color: '#CBD5E1', fontSize: '10px' }}>•</span>

                      <button
                        type="button"
                        onClick={() => setActiveTab('protocols')}
                        style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <RotateCcw size={12} /> Switch Protocol
                      </button>

                      <span style={{ color: '#CBD5E1', fontSize: '10px' }}>•</span>

                      <button
                        type="button"
                        onClick={() => setShowStopModal(true)}
                        style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <StopCircle size={12} /> Stop Trial
                      </button>
                    </div>

                    {/* Calming Accidental Exposure Bottom Sheet */}
                    {showSos && (
                      <div
                        style={{
                          position: 'fixed',
                          inset: 0,
                          background: 'rgba(0,0,0,0.4)',
                          zIndex: 1000,
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                        }}
                        onClick={() => setShowSos(false)}
                      >
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '540px',
                            background: '#FFFFFF',
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            padding: '20px',
                            boxShadow: '0 -10px 30px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                Accidental Exposure Relief
                              </h4>
                              <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 0' }}>
                                Accidental bites are useful data, not a failure.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowSos(false)}
                              style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <p style={{ fontSize: '12px', color: '#334155', margin: '4px 0 0' }}>
                            Select what you accidentally had to record the exposure and view calming relief steps:
                          </p>

                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {sosOptions.map((trig) => (
                              <button
                                key={trig}
                                type="button"
                                onClick={() => handleApplySosMitigation(trig)}
                                style={{
                                  background: selectedExposure === trig ? '#0F172A' : '#F8FAFC',
                                  color: selectedExposure === trig ? '#FFFFFF' : '#334155',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: '8px',
                                  padding: '7px 12px',
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
                            <div style={{ background: '#F0FDF4', padding: '12px 14px', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                              <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534', marginBottom: '6px' }}>
                                ✓ Calming steps recorded for {selectedExposure}:
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11.5px', color: '#15803D', lineHeight: 1.6 }}>
                                <li>Sip warm peppermint or ginger tea to relax smooth gut muscles.</li>
                                <li>Hydrate with a glass of water with a pinch of electrolytes.</li>
                                <li><strong>Your Reset Continues:</strong> One exposure does not ruin your trial. Continue today as planned.</li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Monash Low-FODMAP / Food Swap Drawer */}
                    {showSwapDrawer && (
                      <div
                        style={{
                          position: 'fixed',
                          inset: 0,
                          background: 'rgba(0,0,0,0.4)',
                          zIndex: 1000,
                          display: 'flex',
                          alignItems: 'flex-end',
                          justifyContent: 'center',
                        }}
                        onClick={() => setShowSwapDrawer(false)}
                      >
                        <div
                          style={{
                            width: '100%',
                            maxWidth: '560px',
                            maxHeight: '80vh',
                            background: '#FFFFFF',
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            padding: '20px',
                            boxShadow: '0 -10px 30px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflowY: 'auto',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                Safe Swap Directory ({activeProtocolDef.name})
                              </h4>
                              <p style={{ fontSize: '11.5px', color: '#64748B', margin: '2px 0 0' }}>
                                Evidence-based substitutions for symptom-free cooking
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowSwapDrawer(false)}
                              style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <X size={16} />
                            </button>
                          </div>

                          <div style={{ position: 'relative' }}>
                            <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                            <input
                              type="text"
                              placeholder="Search swaps (e.g. oil, rice, milk)..."
                              value={swapSearchQuery}
                              onChange={(e) => setSwapSearchQuery(e.target.value)}
                              style={{
                                width: '100%',
                                padding: '8px 10px 8px 32px',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                fontSize: '12px',
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#065F46', textTransform: 'uppercase' }}>
                              Allowed & Tolerated Alternatives
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {activeProtocolDef.allowedAlternatives
                                .filter((alt) => !swapSearchQuery || alt.toLowerCase().includes(swapSearchQuery.toLowerCase()))
                                .map((alt, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      color: '#065F46',
                                      background: '#ECFDF5',
                                      border: '1px solid #A7F3D0',
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                    }}
                                  >
                                    ✓ {alt}
                                  </span>
                                ))}
                            </div>

                            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#991B1B', textTransform: 'uppercase', marginTop: '8px' }}>
                              Temporarily Eliminated Culprits
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {activeProtocolDef.eliminatedFoods
                                .filter((food) => !swapSearchQuery || food.toLowerCase().includes(swapSearchQuery.toLowerCase()))
                                .map((food, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      color: '#991B1B',
                                      background: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      padding: '4px 10px',
                                      borderRadius: '8px',
                                    }}
                                  >
                                    ✕ {food}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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

          {/* Footer CTA (Only when not in onboarding) */}
          {suiteMode !== 'onboarding' && (
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
          )}
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

      {/* Reset Trial Confirmation Dialog */}
      {showResetConfirm && (
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
              padding: '22px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: '#FEE2E2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#DC2626',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                  Reset Protocol & Start Fresh?
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  Active trial will be cleared
                </div>
              </div>
            </div>
            <p style={{ fontSize: '12.5px', color: '#475569', margin: '0 0 16px', lineHeight: 1.5 }}>
              This will clear your active elimination trial and allow you to retake the clinical intake wizard or pick another protocol from scratch. Your previous logs remain saved in history.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  background: '#F8FAFC',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
                  cursor: 'pointer',
                  minHeight: '44px',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHapticHeavy();
                  resetActiveTrial();
                  resetActiveTrialV2();
                  setTrial(null);
                  setTrialV2(null);
                  setShowResetConfirm(false);
                  setSuiteMode('onboarding');
                  onTrialUpdated?.(null);
                }}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  minHeight: '44px',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                }}
              >
                Yes, Reset Protocol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intake Assessment Viewer Dialog */}
      {showAssessmentModal && (
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
              maxWidth: '460px',
              width: '100%',
              padding: '22px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: '#F0FDFA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0D9488',
                  }}
                >
                  <ClipboardList size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    Intake Assessment Record
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Baseline Clinical Profile
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssessmentModal(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#F1F5F9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {trialV2?.intakeAssessment ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Reported Symptoms
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {trialV2.intakeAssessment.symptoms?.join(', ') || 'None reported'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                      Onset Timing
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                      {trialV2.intakeAssessment.timing || 'Unspecified'}
                    </div>
                  </div>
                  <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                      Baseline Severity
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                      {trialV2.intakeAssessment.baselineSeverity} / 10
                    </div>
                  </div>
                </div>

                <div style={{ background: '#F0FDF4', borderRadius: '12px', padding: '12px 14px', border: '1.5px solid #86EFAC' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#166534', textTransform: 'uppercase' }}>
                    Protocol Matched
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#14532D', marginTop: '2px' }}>
                    {trialV2.intakeAssessment.matchedProtocolId || trialV2.protocolId}
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Safety Exclusions Screened
                  </div>
                  <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                    {trialV2.intakeAssessment.safetyAcknowledged ? '✓ Confirmed no clinical exclusion flags' : 'Self-administered'}
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center', marginTop: '4px' }}>
                  Intake completed on {new Date(trialV2.intakeAssessment.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#64748B', fontSize: '13px' }}>
                No baseline intake assessment record found for this trial.
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAssessmentModal(false)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: '#0F172A',
                color: '#FFFFFF',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Close Record
            </button>
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
