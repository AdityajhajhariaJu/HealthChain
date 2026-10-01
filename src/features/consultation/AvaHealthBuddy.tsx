import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  File as FileIcon,
  Heart,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { sourceFreshness } from '../../../shared/health-source-freshness';
import { AvaActivityBrowser } from '../../components/ui/AvaActivityBrowser';
import { AvaDayCheckin } from '../../components/ui/AvaDayCheckin';
import { AvaDisclosure } from '../../components/ui/AvaDisclosure';
import { AvaMemoryPanel } from '../../components/ui/AvaMemoryPanel';
import '../../components/ui/caseWorkspace.css';
import { ConnectionDetectiveModal } from '../../components/ui/ConnectionDetectiveModal';
import { DiaryTimelineCard } from '../../components/ui/DiaryTimelineCard';
import { EmergencyTriageModal } from '../../components/ui/EmergencyTriageModal';
import FocusTrap from '../../components/ui/FocusTrap';
import { GuidedBreathingSession } from '../../components/ui/GuidedBreathingSession';
import { QuickMealIntakeSheet } from '../../components/ui/QuickMealIntakeSheet';
import { useToast } from '../../components/ui/ToastProvider';
import {
  TriggerSensitivityModal,
  WholeHealthTab,
} from '../../components/ui/TriggerSensitivityModal';
import { WholeHealthRiverModal } from '../../components/ui/WholeHealthRiverModal';
import type { Observation } from '../../domain/observations/types';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import { useIsMobile } from '../../hooks/useIsMobile';
import { captureAccountScope, isAccountScopeCurrent } from '../../services/AccountScope';
import { getActiveSession } from '../../services/authSession';
import {
  hydrateAvaMessages,
  loadAvaMessages,
  mergeAvaMessages,
  newAvaMessage,
  normalizeAvaMessages,
  normalizeAvaSourceStudy,
  persistAvaMessages,
} from '../../services/AvaConversationRepository';
import { addCaseEvent, getCase, saveAvaCaseAction, type CaseItem } from '../../services/CaseEngine';
import {
  buildCaseContext,
  getCaseDocumentedAnswers,
  getUnifiedCaseScope,
} from '../../services/caseWorkspace';
import {
  dailyEvidenceSummary,
  reviewedCaseWithCurrentSources,
} from '../../services/ClinicalDailyEvidence';
import { evaluateEmergencyTriage, TriageEvaluation } from '../../services/clinicalTriageEngine';
import { loadDeviceMetricContext } from '../../services/DeviceMetricRepository';
import { analyzeLabReport, chatWithTherapyGemini } from '../../services/geminiService';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { getHealthMemory } from '../../services/HealthMemory';
import { listObservations } from '../../services/HealthObservationService';
import { listMealDiary, type MealDiary } from '../../services/MealCommandService';
import { compilePatientContext } from '../../services/MemoryService';
import { getProfile, getProfileEngineState, getProfileKey } from '../../services/ProfileEngine';
import { canUseTrial, openTrialModal, recordTrialUsage } from '../../services/TrialEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';

const QUICK_ACTION_PILLS = [
  {
    id: 'meal_log',
    label: 'Log a meal',
    icon: '🥣',
    bg: '#ECFDF5',
    color: '#047857',
    border: '#A7F3D0',
    action: 'meal',
  },
  {
    id: 'log_day',
    label: 'Log your day',
    icon: '⚡',
    bg: '#CCFBF1',
    color: '#0F766E',
    border: '#99F6E4',
    action: 'log_day',
  },
  {
    id: 'kinetic_chains',
    label: 'Discomfort Check',
    icon: '🦴',
    bg: '#F0FDFA',
    color: '#0F766E',
    border: '#CCFBF1',
    prompt: 'Help me describe my physical discomfort or pain patterns for clinician review.',
  },
  {
    id: 'food_triggers',
    label: 'Food Sensitivities',
    icon: '🔍',
    bg: '#FEF3C7',
    color: '#B45309',
    border: '#FDE68A',
    prompt: 'What might be triggering my digestive reactions or symptoms?',
  },
  {
    id: 'medication',
    label: 'Medications',
    icon: '💊',
    bg: '#EDE9FE',
    color: '#6D28D9',
    border: '#DDD6FE',
    prompt: 'Could any of my active medications be interacting with meals or symptoms?',
  },
];

const SUGGESTIONS = [
  'Help me organize what changed in my health and what I should ask at my next visit.',
  "I'm looking for mental peace and a calm space to de-stress.",
  'Are there any side effects to my new meds?',
  'I have a headache, is it related to my condition?',
  'Can we review my health plan?',
];

const TOOL_PURPOSES: Record<string, string> = {
  meal_log: 'Save a meal in food diary',
  kinetic_chains: 'Describe discomfort and prepare questions',
  health_river: 'See daily observations in order',
  log_day: 'Capture sleep, meals, energy, and symptoms',
  food_detective: 'Explore patterns in food observations',
  suspect_foods: 'Review suspect triggers',
  zen_garden: 'Wellness activities and relaxation',
  diet_trials: 'Record dietary elimination protocol',
  doctor_export: 'Prepare summary for clinician visit',
  food_triggers: 'Investigate food reactions and symptoms',
  food_mood: 'Log daily energy, food, and sleep',
  medication: 'Review medication notes and questions',
};

const CASE_RECHECK_SUGGESTIONS = [
  'Cross-correlate my symptoms: What connects my labs, notes, and vitals?',
  'Re-evaluate: What other alternative conditions could explain this?',
  'Could any of my active medications be causing or worsening this?',
  'Help me prepare the most important questions for my doctor.',
  'What information is missing, and what should I ask my clinician about it?',
  'Can you explain the underlying biological mechanism in simple terms?',
];

import { getItemSync } from '../../services/storage';

const getAvaVaultKey = () => {
  const state = getProfileEngineState();
  return (
    getProfileKey().replace('hc_unified_profile', 'hc_ava_vault') +
    '_' +
    (state?.activeId || 'profile_1')
  );
};

const INITIAL_MSG = {
  role: 'model',
  content:
    "Hi, I'm Ava. I can help you reflect on your day, understand your records, and prepare questions for your clinician. Connect a case to keep our conversation focused. What would you like help with?",
};

type AvaRequest = {
  messages: any[];
  caseId: string;
  context: string;
  scope: string;
  requestId: string;
  safetyContext?: string;
  diarySnapshot?: any[];
  sourceStudy?: any;
  contextManifest?: any;
};

function getSavedMessages() {
  let legacy: unknown = getProfile()?.avaData;
  if (!Array.isArray(legacy) || !legacy.length) {
    try {
      legacy = JSON.parse(getItemSync(getAvaVaultKey()) || '[]');
    } catch {}
  }
  return loadAvaMessages(legacy);
}

const TypewriterText = ({ content, onComplete, messagesEndRef }: any) => {
  const [displayed, setDisplayed] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let current = '';
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(content);
      onComplete();
      return;
    }
    const type = async () => {
      const chunkSize = 3;
      for (let i = 0; i < content.length; i += chunkSize) {
        if (!isMounted.current) break;
        current += content.substring(i, i + chunkSize);
        setDisplayed(current);

        // Auto-scroll logic if user is at the bottom
        if (messagesEndRef?.current) {
          const container = messagesEndRef.current.parentElement?.parentElement;
          if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - scrollTop - clientHeight < 150) {
              requestAnimationFrame(() => {
                if (messagesEndRef.current) {
                  messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
                }
              });
            }
          }
        }
        await new Promise((r) => setTimeout(r, 10));
      }
      if (isMounted.current) {
        setDisplayed(content);
        onComplete();
      }
    };
    type();
    return () => {
      isMounted.current = false;
    };
  }, [content, messagesEndRef]);

  return <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}</span>;
};

export function cleanChatMessageText(text: string): string {
  return typeof text === 'string' ? text.trim() : '';
}

export function extractBalancedWidget(
  text: string,
  tag: string
): { payload: any | null; before: string; after: string; found: boolean } {
  const prefix = `[WIDGET:${tag}`;
  const startIdx = text.indexOf(prefix);
  if (startIdx === -1) {
    return { payload: null, before: text, after: '', found: false };
  }

  const before = cleanChatMessageText(text.substring(0, startIdx));
  const rest = text.substring(startIdx + prefix.length);

  // If it's just [WIDGET:TAG]
  if (rest.startsWith(']')) {
    return { payload: null, before, after: cleanChatMessageText(rest.substring(1)), found: true };
  }

  // If it has colon: [WIDGET:TAG:...
  if (rest.startsWith(':')) {
    const jsonStr = rest.substring(1);
    let openCount = 0;
    let endIdx = -1;
    let inString = false;
    let escape = false;

    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr.startsWith('[WIDGET:', i)) break;
      const char = jsonStr[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          openCount++;
        } else if (char === '}' || char === ']') {
          openCount--;
          if (openCount < 0 && char === ']') {
            endIdx = i;
            break;
          }
          if (openCount === 0 && i + 1 < jsonStr.length && jsonStr[i + 1] === ']') {
            endIdx = i + 1;
            break;
          }
        }
      }
    }

    if (endIdx !== -1) {
      const payloadText = jsonStr.substring(0, endIdx).trim();
      let afterStart = endIdx;
      if (afterStart < jsonStr.length && jsonStr[afterStart] === ']') {
        afterStart += 1;
      }
      const after = cleanChatMessageText(jsonStr.substring(afterStart));
      let payload = null;
      try {
        payload = JSON.parse(payloadText);
      } catch (e) {
        console.warn(`Failed to parse widget ${tag} JSON:`, e, payloadText);
      }
      return { payload, before, after, found: true };
    }
  }

  // Isolate a malformed card without consuming a later independent card.
  const nextWidget = text.indexOf('[WIDGET:', startIdx + prefix.length);
  const firstBracket = text.indexOf(']', startIdx + prefix.length);
  if (nextWidget !== -1 && (firstBracket === -1 || nextWidget < firstBracket)) {
    return { payload: null, before, after: text.substring(nextWidget), found: true };
  }
  if (firstBracket > startIdx) {
    return {
      payload: null,
      before,
      after: cleanChatMessageText(text.substring(firstBracket + 1)),
      found: true,
    };
  }

  return { payload: null, before, after: '', found: true };
}

export const MessageRenderer = ({
  content,
  onOpenCalm,
  onOpenWholeHealth,
  onOpenWorkout,
  diaryEntries = [],
  messageId,
}: {
  content: string;
  onOpenCalm?: () => void;
  onOpenWholeHealth?: () => void;
  onOpenWorkout?: () => void;
  diaryEntries?: any[];
  messageId?: string;
}) => {
  if (typeof content !== 'string') return <span>Saved reply is unreadable. Please retry.</span>;
  const segments: any[] = [];
  let remaining = content;
  for (let count = 0; count < 20; count++) {
    const match = /\[WIDGET:([A-Z_]+)/.exec(remaining);
    if (!match) {
      if (remaining.trim())
        segments.push(
          <span key={'text' + count} style={{ whiteSpace: 'pre-wrap' }}>
            {remaining}
          </span>
        );
      break;
    }
    const tag = match[1],
      parsed = extractBalancedWidget(remaining, tag);
    if (parsed.before)
      segments.push(
        <span key={'before' + count} style={{ whiteSpace: 'pre-wrap' }}>
          {parsed.before}
        </span>
      );
    const buttonStyle = {
      minHeight: 44,
      borderRadius: 12,
      padding: '10px 16px',
      border: '1px solid #99F6E4',
      background: '#FFFFFF',
      color: '#0F766E',
      fontWeight: 700,
      cursor: 'pointer',
    };
    if (tag === 'DIARY_TIMELINE') {
      const entries = diaryEntries.map((meal) => ({
        time:
          typeof meal.occurredAt === 'string' &&
          Number.isFinite(Date.parse(meal.occurredAt)) &&
          ['exact', 'approximate'].includes(meal.timePrecision)
            ? new Date(meal.occurredAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Time not recorded',
        category: meal.type || 'Meal',
        items: [meal.name || 'Logged meal'],
      }));
      segments.push(
        <DiaryTimelineCard
          key={'diary' + count}
          title="Diary records included in this reply"
          date="Captured when you sent your message"
          entries={entries}
        />
      );
    } else if (['CALM', 'BREATHWORK', 'WORKOUT', 'SOMATIC'].includes(tag)) {
      const movement = ['WORKOUT', 'SOMATIC'].includes(tag);
      segments.push(
        <AvaDisclosure
          key={'action' + count}
          storageId={messageId ? messageId + '_' + tag + '_' + count : undefined}
          initiallyOpen
          style={{
            padding: 16,
            borderRadius: 18,
            background: '#F0FDFA',
            border: '1px solid #99F6E4',
          }}
        >
          <summary style={{ minHeight: 44, cursor: 'pointer', fontWeight: 700 }}>
            {movement ? 'Explore movement activities' : 'Optional comfortable breathing'}
          </summary>
          <p>
            {movement
              ? 'Choose an available activity and review its instructions before starting.'
              : 'Follow a gentle visual pace at your comfort. Pause or stop if you feel dizzy or uncomfortable.'}
          </p>
          <button
            type="button"
            style={buttonStyle}
            disabled={movement ? !onOpenWorkout : !onOpenCalm}
            onClick={movement ? onOpenWorkout : onOpenCalm}
          >
            {movement ? 'Browse activities' : 'Open breathing guide'}
          </button>
        </AvaDisclosure>
      );
    } else {
      segments.push(
        <AvaDisclosure
          key={'review' + count}
          storageId={messageId ? messageId + '_review_' + count : undefined}
          style={{ padding: 16, borderRadius: 16, border: '1px solid #ECD9D0' }}
        >
          <summary style={{ minHeight: 44, cursor: 'pointer' }}>
            This card needs source review
          </summary>
          <p>The proposed card is unavailable. Review saved observations before acting.</p>
          <button
            type="button"
            style={buttonStyle}
            disabled={!onOpenWholeHealth}
            onClick={onOpenWholeHealth}
          >
            Review observations
          </button>
        </AvaDisclosure>
      );
    }
    if (parsed.after === remaining) break;
    remaining = parsed.after;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>
      {segments}
    </div>
  );
};

export function extractActionSuggestions(
  modelContent: string,
  userContent?: string,
  options?: {
    hasCase: boolean;
    hasRecords: boolean;
    hasStudy: boolean;
    hasReview: boolean;
  }
) {
  const cleanModel = cleanChatMessageText(modelContent || '');
  const cleanUser = cleanChatMessageText(userContent || '');

  // 1. Observation Detection:
  let canSaveObservation = false;
  let observationDraft = '';
  if (cleanUser && cleanUser.length > 5) {
    const observationKeywords =
      /(symptom|pain|bloat|headache|fatigue|ate|eat|meal|felt|noticed|started|flare|stomach|gut|reaction|woke up|sleep|took|medicine|dose|bp|blood pressure|pulse|ache|nausea|cramp|energy|stool|trigger|muscle|twitch|rash|fever|dizzy|weak|joint|experienced|feeling)/i;
    if (observationKeywords.test(cleanUser) || observationKeywords.test(cleanModel)) {
      canSaveObservation = true;
      observationDraft = cleanUser.slice(0, 280);
    }
  }

  // 2. Question Detection:
  let canAddQuestion = false;
  let questionDraft = '';
  const questionMatches = cleanModel.match(
    /(?:Ask your (?:doctor|physician|care team|provider)|Questions? for your (?:clinician|doctor|provider|care team)|You might ask|Consider asking)[^\n:]*[:?-]?\s*(?:[-*•\d.]\s*)?([^\r\n?]+[?])/i
  );
  if (questionMatches && questionMatches[1]) {
    canAddQuestion = true;
    questionDraft = questionMatches[1].trim();
  }

  // 3. Explain Source:
  const canExplainSource = Boolean(options?.hasStudy || options?.hasRecords);
  const sourceLabel = options?.hasStudy ? 'Explain this study' : 'Explain this source';

  // 4. Open Related Review:
  const canOpenReview = Boolean(options?.hasCase && options?.hasReview);

  return {
    canSaveObservation,
    observationDraft,
    canAddQuestion,
    questionDraft,
    canExplainSource,
    sourceLabel,
    canOpenReview,
  };
}

export const AvaActionToolbar = ({
  msgIndex,
  modelContent,
  userContent,
  selectedCase,
  activeSourceStudy,
  savedActionIds,
  onSaveObservation,
  onAddQuestion,
  onExplainSource,
  onOpenReview,
}: {
  msgIndex: number | string;
  modelContent: string;
  userContent?: string;
  selectedCase?: CaseItem | null;
  activeSourceStudy?: any;
  savedActionIds: Set<string>;
  onSaveObservation: (text: string) => void;
  onAddQuestion: (text: string) => void;
  onExplainSource: () => void;
  onOpenReview: () => void;
}) => {
  const suggestions = useMemo(() => {
    return extractActionSuggestions(modelContent, userContent, {
      hasCase: Boolean(selectedCase),
      hasRecords: Boolean(
        selectedCase && selectedCase.medicalRecords && selectedCase.medicalRecords.length > 0
      ),
      hasStudy: Boolean(activeSourceStudy),
      hasReview: Boolean(
        selectedCase &&
        (selectedCase.currentSummary ||
          (selectedCase.events && selectedCase.events.some((e) => e.label?.includes('Review'))))
      ),
    });
  }, [modelContent, userContent, selectedCase, activeSourceStudy]);

  const obsSavedKey = `obs_${msgIndex}`;
  const qSavedKey = `q_${msgIndex}`;
  const isObsSaved = savedActionIds.has(obsSavedKey);
  const isQSaved = savedActionIds.has(qSavedKey);

  if (!userContent?.trim()) return null;

  if (
    !suggestions.canSaveObservation &&
    !suggestions.canAddQuestion &&
    !suggestions.canExplainSource &&
    !suggestions.canOpenReview
  ) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: '12px',
        paddingTop: '10px',
        borderTop: '1px dashed rgba(13, 148, 136, 0.25)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
      }}
    >
      {suggestions.canSaveObservation && (
        <button
          type="button"
          disabled={isObsSaved}
          onClick={() => {
            triggerHapticLight();
            onSaveObservation(suggestions.observationDraft);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '999px',
            border: isObsSaved ? '1px solid #A7F3D0' : '1px solid #CCFBF1',
            background: isObsSaved ? '#ECFDF5' : '#FFFFFF',
            color: isObsSaved ? '#059669' : '#0F766E',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isObsSaved ? 'default' : 'pointer',
            boxShadow: '0 2px 6px rgba(13, 148, 136, 0.08)',
            transition: 'all 0.15s ease',
          }}
        >
          {isObsSaved ? <Check size={13} /> : <span>📝</span>}
          <span>{isObsSaved ? 'Observation saved' : 'Save this observation'}</span>
        </button>
      )}

      {suggestions.canAddQuestion && (
        <button
          type="button"
          disabled={isQSaved}
          onClick={() => {
            triggerHapticLight();
            onAddQuestion(suggestions.questionDraft);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '999px',
            border: isQSaved ? '1px solid #DDD6FE' : '1px solid #E0E7FF',
            background: isQSaved ? '#F5F3FF' : '#FFFFFF',
            color: isQSaved ? '#6D28D9' : '#4338CA',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isQSaved ? 'default' : 'pointer',
            boxShadow: '0 2px 6px rgba(79, 70, 229, 0.08)',
            transition: 'all 0.15s ease',
          }}
        >
          {isQSaved ? <Check size={13} /> : <span>❓</span>}
          <span>{isQSaved ? 'Question added' : 'Add appointment question'}</span>
        </button>
      )}

      {suggestions.canExplainSource && (
        <button
          type="button"
          onClick={() => {
            triggerHapticLight();
            onExplainSource();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '999px',
            border: '1px solid #E2E8F0',
            background: '#FFFFFF',
            color: '#334155',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.15s ease',
          }}
        >
          <span>🔍</span>
          <span>{suggestions.sourceLabel}</span>
        </button>
      )}

      {suggestions.canOpenReview && (
        <button
          type="button"
          onClick={() => {
            triggerHapticLight();
            onOpenReview();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 12px',
            borderRadius: '999px',
            border: '1px solid #FED7AA',
            background: '#FFF7ED',
            color: '#C2410C',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(194, 65, 12, 0.08)',
            transition: 'all 0.15s ease',
          }}
        >
          <span>📊</span>
          <span>Open related review</span>
        </button>
      )}
    </div>
  );
};

export const CaseSelectorModal = ({
  isOpen,
  selectedCaseId,
  availableCases,
  onSelectCase,
  onClose,
}: {
  isOpen: boolean;
  selectedCaseId: string;
  availableCases: CaseItem[];
  onSelectCase: (caseId: string) => void;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <FocusTrap onEscape={onClose} style={{ height: 0 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select Case Workspace"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(24px)',
            borderRadius: '24px',
            border: '1.5px solid #CCFBF1',
            boxShadow: '0 24px 48px rgba(13, 148, 136, 0.18)',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Select Active Case
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                Ava grounds her answers and actions in the connected case.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close case selector"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '6px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                onSelectCase('');
                onClose();
              }}
              style={{
                padding: '14px 16px',
                borderRadius: '16px',
                border: !selectedCaseId ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                background: !selectedCaseId ? '#F0FDFA' : '#FFFFFF',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: !selectedCaseId ? '#0D9488' : '#F1F5F9',
                    color: !selectedCaseId ? '#FFFFFF' : '#64748B',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 800,
                    fontSize: '16px',
                    flexShrink: 0,
                  }}
                >
                  🌐
                </div>
                <div>
                  <strong
                    style={{
                      fontSize: '14px',
                      color: !selectedCaseId ? '#0F766E' : '#1E293B',
                      display: 'block',
                    }}
                  >
                    General Health Conversation
                  </strong>
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    No case attached. Reflect on your day or ask general questions.
                  </span>
                </div>
              </div>
              {!selectedCaseId && <Check size={18} color="#0D9488" />}
            </button>

            {availableCases.length > 0 && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                  marginTop: '6px',
                  marginBottom: '2px',
                }}
              >
                Your Cases ({availableCases.length})
              </div>
            )}

            {availableCases.map((c) => {
              const isSelected = c.id === selectedCaseId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelectCase(c.id);
                    onClose();
                  }}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '16px',
                    border: isSelected ? '2px solid #0D9488' : '1.5px solid #E2E8F0',
                    background: isSelected ? '#F0FDFA' : '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isSelected
                          ? 'linear-gradient(135deg, #0D9488, #0F766E)'
                          : '#F1F5F9',
                        color: isSelected ? '#FFFFFF' : '#0F766E',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      📁
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong
                          style={{
                            fontSize: '14px',
                            color: isSelected ? '#0F766E' : '#1E293B',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.title}
                        </strong>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            background: '#CCFBF1',
                            color: '#0F766E',
                            padding: '1px 6px',
                            borderRadius: '6px',
                          }}
                        >
                          {c.status || 'Active'}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.intakeData?.chiefComplaint || c.intakeData?.concern || 'Case timeline'}
                      </span>
                    </div>
                  </div>
                  {isSelected && <Check size={18} color="#0D9488" style={{ flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

export const SaveTaskModal = ({
  isOpen,
  type,
  initialText,
  activeCaseId,
  availableCases,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  type: 'observation' | 'question';
  initialText: string;
  activeCaseId: string;
  availableCases: CaseItem[];
  onClose: () => void;
  onConfirm: (text: string, targetCaseId: string, specialty?: string) => void | Promise<void>;
}) => {
  const [targetCaseId, setTargetCaseId] = useState(() => activeCaseId || '');
  const [text, setText] = useState(initialText);
  const [specialty, setSpecialty] = useState('General');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    if (activeCaseId) setTargetCaseId(activeCaseId);
    else setTargetCaseId('');
  }, [activeCaseId, availableCases]);

  if (!isOpen) return null;

  const targetCase = availableCases.find((c) => c.id === targetCaseId);

  return (
    <FocusTrap onEscape={onClose} style={{ height: 0 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={
          type === 'observation' ? 'Save Observation to Case' : 'Add Appointment Question'
        }
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(24px)',
            borderRadius: '24px',
            border: '1.5px solid #CCFBF1',
            boxShadow: '0 24px 48px rgba(13, 148, 136, 0.18)',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '18px 22px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: type === 'observation' ? '#CCFBF1' : '#EDE9FE',
                  color: type === 'observation' ? '#0F766E' : '#6D28D9',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '18px',
                }}
              >
                {type === 'observation' ? '📝' : '❓'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                  {type === 'observation' ? 'Save Observation to Case' : 'Add Appointment Question'}
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                  Review text and destination before saving
                </span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close modal"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#64748B',
                padding: '6px',
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              padding: '20px 22px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Destination Case:
                </span>
                {availableCases.length > 1 ? (
                  <select
                    aria-label="Destination Case"
                    value={targetCaseId}
                    onChange={(e) => setTargetCaseId(e.target.value)}
                    style={{
                      fontSize: '12.5px',
                      fontWeight: 700,
                      color: '#0F766E',
                      background: '#FFFFFF',
                      border: '1px solid #CCFBF1',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      outline: 'none',
                    }}
                  >
                    <option value="">Choose a destination case</option>
                    {availableCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong style={{ fontSize: '13px', color: '#0F766E' }}>
                    {targetCase?.title || 'Active Case Workspace'}
                  </strong>
                )}
              </div>

              <div
                style={{
                  fontSize: '12px',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Target Section:</span>
                <strong style={{ color: '#0F172A' }}>
                  {type === 'observation'
                    ? 'Case Timeline (Timeline Events)'
                    : 'Doctor Visit Brief (Open Questions)'}
                </strong>
              </div>
            </div>

            {type === 'question' && (
              <div>
                <label
                  htmlFor="ava-task-specialty-select"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Specialty or Care Team:
                </label>
                <select
                  id="ava-task-specialty-select"
                  aria-label="Specialty or Care Team"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  style={{
                    width: '100%',
                    fontSize: '13.5px',
                    color: '#1E293B',
                    background: '#FFFFFF',
                    border: '1.5px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    outline: 'none',
                  }}
                >
                  <option value="General">General / Primary Care</option>
                  <option value="Gastroenterology">Gastroenterology</option>
                  <option value="Neurology">Neurology</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Endocrinology">Endocrinology</option>
                  <option value="Rheumatology">Rheumatology</option>
                  <option value="Pharmacist">Pharmacist</option>
                </select>
              </div>
            )}

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                {type === 'observation'
                  ? 'Observation Note (Patient-Reported):'
                  : 'Question for Doctor:'}
              </label>
              <textarea
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  type === 'observation'
                    ? 'Describe the symptom, event, or reaction...'
                    : 'Type your question...'
                }
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  borderRadius: '12px',
                  border: '1.5px solid #CCFBF1',
                  padding: '12px 14px',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: '#1E293B',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '90px',
                }}
              />
            </div>

            <div
              style={{
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#F0FDFA',
                border: '1px solid #99F6E4',
                fontSize: '12px',
                color: '#0F766E',
                lineHeight: 1.4,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🛡️</span>
              <span>
                {type === 'observation'
                  ? 'Captured strictly as patient-reported evidence. Will not be mislabeled as an objective lab finding or physician diagnosis.'
                  : 'Will be recorded as an Open Question ready to export or discuss during your next clinical appointment.'}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !text.trim() || !targetCaseId}
              onClick={async () => {
                if (text.trim() && targetCaseId) {
                  setSaving(true);
                  try {
                    await onConfirm(text.trim(), targetCaseId, specialty);
                  } finally {
                    setSaving(false);
                  }
                }
              }}
              style={{
                padding: '9px 20px',
                borderRadius: '10px',
                border: 'none',
                background:
                  !text.trim() || !targetCaseId
                    ? '#94A3B8'
                    : 'linear-gradient(135deg, #0D9488, #0F766E)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: !text.trim() || !targetCaseId ? 'not-allowed' : 'pointer',
                boxShadow:
                  !text.trim() || !targetCaseId ? 'none' : '0 4px 12px rgba(13, 148, 136, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Check size={16} /> {saving ? 'Saving…' : 'Confirm & Save'}
            </button>
          </div>
        </div>
      </div>
    </FocusTrap>
  );
};

export default function AvaHealthBuddy() {
  const isMobile = useIsMobile();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) {
      main.style.background = 'url(/ava-floral-bg.jpg) center/cover no-repeat';
      main.style.overflow = 'hidden';
    }
    return () => {
      if (main) {
        main.style.background = '';
        main.style.overflow = '';
      }
    };
  }, []);
  const [messages, setMessages] = useState(getSavedMessages());
  const [accountScope, setAccountScope] = useState(getAvaVaultKey());
  const [activeMeditation, setActiveMeditation] = useState<boolean | null>(null);
  const lastMeditationRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (activeMeditation) {
      lastMeditationRef.current = activeMeditation;
    }
  }, [activeMeditation]);

  useEffect(() => {
    const handleReopen = (e?: any) => {
      setActiveMeditation(e?.detail || lastMeditationRef.current || true);
    };
    window.addEventListener('hc_reopen_meditation', handleReopen);
    return () => window.removeEventListener('hc_reopen_meditation', handleReopen);
  }, []);
  const getDraftStorageKey = (scope: string, cId: string) =>
    `hc_ava_draft_${scope}_${cId || 'general'}`;

  const incomingPrompt = location.state?.initialPrompt || location.state?.initialMessage;
  const initialCaseIdParam =
    new URLSearchParams(location.search).get('caseId') ||
    new URLSearchParams(location.search).get('importCase') ||
    location.state?.caseId ||
    '';
  const [input, setInput] = useState(() => {
    try {
      if (incomingPrompt) return incomingPrompt;
      const scope = getAvaVaultKey();
      return localStorage.getItem(getDraftStorageKey(scope, initialCaseIdParam)) || '';
    } catch {
      return '';
    }
  });
  useEffect(() => {
    if (incomingPrompt) {
      setInput(incomingPrompt);
    }
  }, [incomingPrompt]);
  const studyIdParam =
    new URLSearchParams(location.search).get('studyId') ||
    new URLSearchParams(location.search).get('study');
  const incomingStudy = useMemo(() => {
    const routed = normalizeAvaSourceStudy(location.state?.sourceStudy);
    if (routed?.ownerScope === getProfileKey()) return routed;
    return (() => {
      if (studyIdParam) {
        try {
          const stored = sessionStorage.getItem(`hc_study_${getProfileKey()}_${studyIdParam}`);
          if (stored) return normalizeAvaSourceStudy(JSON.parse(stored));
        } catch {}
        return normalizeAvaSourceStudy({
          nctId: studyIdParam,
          title: `Clinical Study ${studyIdParam}`,
        });
      }
      return null;
    })();
  }, [studyIdParam, location.state?.sourceStudy, accountScope]);
  const [activeSourceStudy, setActiveSourceStudy] = useState<any>(() => incomingStudy);
  useEffect(() => {
    if (!studyIdParam || !/^NCT\d{8}$/i.test(studyIdParam) || incomingStudy?.abstract) return;
    const owner = getAvaVaultKey(),
      controller = new AbortController();
    void fetch('https://clinicaltrials.gov/api/v2/studies/' + encodeURIComponent(studyIdParam), {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error('Study unavailable');
        return response.json();
      })
      .then((raw) => {
        if (owner !== getAvaVaultKey() || controller.signal.aborted) return;
        const protocol = raw?.protocolSection;
        if (protocol?.identificationModule?.nctId !== studyIdParam.toUpperCase()) return;
        setActiveSourceStudy({
          nctId: protocol.identificationModule.nctId,
          title: protocol.identificationModule.briefTitle,
          abstract: protocol.descriptionModule?.briefSummary || '',
          conditions: protocol.conditionsModule?.conditions || [],
          sourceUrl: 'https://clinicaltrials.gov/study/' + studyIdParam,
          sourceType: 'trial_registration',
          hasResults: raw.hasResults === true,
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [studyIdParam, accountScope]);
  useEffect(() => {
    if (incomingStudy) {
      setActiveSourceStudy(incomingStudy);
      if (incomingStudy.nctId) {
        try {
          sessionStorage.setItem(
            `hc_study_${getProfileKey()}_${incomingStudy.nctId}`,
            JSON.stringify(incomingStudy)
          );
        } catch {}
      }
    }
  }, [incomingStudy]);
  const [attachments, setAttachments] = useState<{ name: string; data: string }[]>([]);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const attachmentBusyRef = useRef(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWholeHealthOpen, setIsWholeHealthOpen] = useState(false);
  const [wholeHealthTab, setWholeHealthTab] = useState<WholeHealthTab>('picture');
  const [isRiverOpen, setIsRiverOpen] = useState(false);
  const [isQuickMealOpen, setIsQuickMealOpen] = useState(false);
  const [isDetectiveOpen, setIsDetectiveOpen] = useState(false);
  const [detectiveTab, setDetectiveTab] = useState<string>('overview');
  useEffect(() => {
    if (new URLSearchParams(location.search).get('tool') === 'connection-detective')
      setIsDetectiveOpen(true);
  }, [location.search]);
  const [emergencyTriage, setEmergencyTriage] = useState<TriageEvaluation | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);
  const [showDayCheckin, setShowDayCheckin] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [memoryVersion, setMemoryVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setMemoryVersion((value) => value + 1);
    window.addEventListener('hc_health_memory_updated', refresh);
    return () => window.removeEventListener('hc_health_memory_updated', refresh);
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenDetective = (e?: any) => {
      setDetectiveTab(e?.detail?.tab || 'overview');
      setIsDetectiveOpen(true);
    };
    window.addEventListener('hc_open_connection_detective_modal', handleOpenDetective);
    return () =>
      window.removeEventListener('hc_open_connection_detective_modal', handleOpenDetective);
  }, []);

  useEffect(() => {
    const handleOpenRiver = () => setIsRiverOpen(true);
    window.addEventListener('hc_open_whole_health_river', handleOpenRiver);
    return () => window.removeEventListener('hc_open_whole_health_river', handleOpenRiver);
  }, []);

  useEffect(() => {
    const handleOpenWholeHealth = (e?: any) => {
      if (e?.detail?.tab) {
        setWholeHealthTab(e.detail.tab);
      } else {
        setWholeHealthTab('picture');
      }
      setIsWholeHealthOpen(true);
    };
    window.addEventListener('hc_open_whole_health_modal', handleOpenWholeHealth);
    return () => {
      window.removeEventListener('hc_open_whole_health_modal', handleOpenWholeHealth);
    };
  }, []);

  const availableCases = useCaseWorkspace();
  const [missingCaseNotice, setMissingCaseNotice] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState(() => {
    const paramId =
      new URLSearchParams(location.search).get('caseId') ||
      new URLSearchParams(location.search).get('importCase') ||
      location.state?.caseId;
    if (paramId) {
      const scope = getUnifiedCaseScope(paramId);
      return scope.isRequestedCaseMissing ? '' : scope.caseId || '';
    }
    return '';
  });
  const selectedCase = availableCases.find((item) => item.id === selectedCaseId);
  const conversationMessages = messages.filter(
    (message: any) => (message.caseId || '') === selectedCaseId
  );
  const visibleMessages = conversationMessages.length
    ? conversationMessages
    : [{ ...INITIAL_MSG, id: 'welcome_' + selectedCaseId, caseId: selectedCaseId }];
  const documentedAnswers = useMemo(
    () => (selectedCase ? getCaseDocumentedAnswers(selectedCase) : []),
    [selectedCase]
  );
  const [mealDiary, setMealDiary] = useState<MealDiary>({});
  const [dailyObservations, setDailyObservations] = useState<Observation[]>([]);
  const [deviceContext, setDeviceContext] = useState<Awaited<
    ReturnType<typeof loadDeviceMetricContext>
  > | null>(null);
  useEffect(() => {
    let active = true;
    const owner = captureAccountScope();
    setMealDiary({});
    setDailyObservations([]);
    setDeviceContext(null);
    void loadDeviceMetricContext().then((value) => {
      if (active && isAccountScopeCurrent(owner)) setDeviceContext(value);
    });
    const refresh = () => {
      void Promise.all([listMealDiary(), listObservations()])
        .then(([diary, observations]) => {
          if (active && isAccountScopeCurrent(owner)) {
            setMealDiary(diary);
            setDailyObservations(observations);
          }
        })
        .catch(() => {
          /* Retain the last captured local snapshot during a read failure. */
        });
    };
    refresh();
    window.addEventListener('hc_observations_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    return () => {
      active = false;
      window.removeEventListener('hc_observations_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
    };
  }, [accountScope]);
  const recentDiaryMeals = useMemo(
    () =>
      Object.values(mealDiary)
        .flat()
        .sort(
          (a, b) =>
            String(b.date || '').localeCompare(String(a.date || '')) ||
            String(b.loggedAt || '').localeCompare(String(a.loggedAt || ''))
        )
        .slice(0, 3),
    [mealDiary]
  );
  const memoryContext = useMemo(() => {
    const allMemories = getHealthMemory() || [];

    const logs = recentDiaryMeals;

    const scopedMemories = allMemories
      .filter((memory) => memory.kind !== 'health_buddy' || memory.payload.userConfirmed === true)
      .filter((memory) => (selectedCaseId ? memory.caseId === selectedCaseId : !memory.caseId));
    const relevantMemories = scopedMemories.slice(0, 5);
    const relevantLogs = selectedCaseId ? [] : logs.slice(0, 2);
    const scopedObservations = dailyObservations.filter((record) => {
      if (record.payload.kind === 'meal') return false;
      const cases = (record.references || []).filter((reference) => reference.kind === 'case');
      return selectedCaseId
        ? cases.some((reference) => reference.id === selectedCaseId)
        : cases.length === 0;
    });
    // Include whole records, preserving explicit negatives, zeroes and unknown occurrence times.
    const observationSnapshots = scopedObservations
      .slice(0, 5)
      .map((record) => ({
        id: record.id,
        payload: record.payload,
        localDate: record.localDate,
        occurredAt: record.occurredAt,
        timePrecision: record.timePrecision,
        timezone: record.timezone,
        source: record.source,
        evidenceType: record.evidenceType,
        recordedAt: record.recordedAt,
        revision: record.revision,
      }))
      .filter((record) => JSON.stringify(record).length <= 6000);
    const totalRecords =
      scopedMemories.length + (selectedCaseId ? 0 : logs.length) + scopedObservations.length;
    const includedItems = [
      ...relevantMemories.map((m) => ({
        type: 'Clinical Memory',
        title: m.title,
        time: m.occurredAt ? new Date(m.occurredAt).toLocaleDateString() : 'Recent',
        source: m.source || 'Timeline',
      })),
      ...relevantLogs.map((l) => ({
        type: 'Food / Intake Log',
        title: l.name || 'Meal entry',
        time: l.date || 'Date not recorded',
        source: 'Meal diary',
        recordId: String(l.id),
      })),
      ...observationSnapshots.map((record) => ({
        type: 'Daily observation',
        title: record.payload.kind === 'daily_checkin' ? 'Daily check-in' : record.payload.kind,
        time: record.localDate || record.occurredAt || 'Occurrence time not recorded',
        source: record.source,
        recordId: record.id,
      })),
    ];
    return {
      evaluatedCount: Math.max(totalRecords, includedItems.length),
      omittedCount: Math.max(0, totalRecords - includedItems.length),
      includedItems,
      observationSnapshots,
      dailyEvidence: dailyEvidenceSummary(
        scopedObservations,
        new Date().toLocaleDateString('en-CA')
      ),
    };
  }, [messages.length, selectedCaseId, recentDiaryMeals, dailyObservations, memoryVersion]);
  const [savedUpdate, setSavedUpdate] = useState<{ caseId: string; title: string } | null>(null);
  const saveUpdateBusy = useRef(false);
  const [isCaseSelectorOpen, setIsCaseSelectorOpen] = useState(false);
  const [saveModalState, setSaveModalState] = useState<{
    isOpen: boolean;
    type: 'observation' | 'question';
    initialText: string;
    caseId: string;
    specialty?: string;
    msgIndex?: number | string;
  } | null>(null);
  const savedActionIds = new Set<string>(
    messages.flatMap((message: any) =>
      Object.keys(message.receipts || {}).map((kind) => kind + '_' + message.id)
    )
  );
  const [failedDraft, setFailedDraft] = useState<string | null>(null);
  const selectedCaseIdRef = useRef(selectedCaseId);
  const lastFailedDraftRef = useRef<string | null>(null);

  useEffect(() => {
    selectedCaseIdRef.current = selectedCaseId;
  }, [selectedCaseId]);

  useEffect(() => {
    try {
      const scope = getAvaVaultKey();
      const draftKey = getDraftStorageKey(scope, selectedCaseId);
      if (input.trim()) {
        localStorage.setItem(draftKey, input);
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch (e) {}
  }, [input, selectedCaseId]);

  const handleSelectCase = (newCaseId: string) => {
    if (newCaseId === selectedCaseId) return;
    const scope = getAvaVaultKey();
    if (input.trim()) {
      try {
        localStorage.setItem(getDraftStorageKey(scope, selectedCaseId), input);
      } catch (e) {}
    }
    setSelectedCaseId(newCaseId);
    setAttachments([]);
    setActiveSourceStudy(null);
    setSaveModalState(null);
    setFailedDraft(null);
    setShowMemoryPanel(false);
    lastRequestRef.current = null;
    requestControllerRef.current?.abort();
    activeRequestIdRef.current = '';
    sendingRef.current = false;
    setIsTyping(false);
    setIsStreaming(false);
    setSendError(false);
    let nextDraft = '';
    try {
      nextDraft = localStorage.getItem(getDraftStorageKey(scope, newCaseId)) || '';
    } catch (e) {}
    setInput(nextDraft);

    const searchParams = new URLSearchParams(location.search);
    if (newCaseId) {
      searchParams.set('caseId', newCaseId);
    } else {
      searchParams.delete('caseId');
    }
    const nextQuery = searchParams.toString();
    navigate({ search: nextQuery ? `?${nextQuery}` : '' }, { replace: true });
  };

  const handleConfirmSave = async (
    confirmedText: string,
    targetCaseId: string,
    specialty?: string
  ) => {
    if (!confirmedText.trim() || !targetCaseId || saveUpdateBusy.current || !saveModalState) return;
    const owner = getAvaVaultKey(),
      originCase = selectedCaseIdRef.current,
      action = saveModalState;
    saveUpdateBusy.current = true;
    try {
      const target = getCase(targetCaseId);
      if (!target) throw new Error('Target case unavailable.');
      const messageId = String(action.msgIndex || crypto.randomUUID());
      const recordId = await saveAvaCaseAction(
        targetCaseId,
        messageId,
        action.type,
        confirmedText,
        specialty
      );
      if (owner !== getAvaVaultKey() || originCase !== selectedCaseIdRef.current) return;
      const kind = action.type === 'observation' ? 'obs' : 'q';
      const next = normalizeAvaMessages(messages).map((message) =>
        message.id !== messageId
          ? message
          : {
              ...message,
              receipts: {
                ...message.receipts,
                [kind]: { caseId: targetCaseId, recordId, savedAt: new Date().toISOString() },
              },
            }
      );
      await persistAvaMessages(next);
      if (owner !== getAvaVaultKey() || originCase !== selectedCaseIdRef.current) return;
      setMessages(next);
      setSavedUpdate({ caseId: targetCaseId, title: target.title });
      setSaveModalState(null);
      toast.success(
        'Saved on this device',
        'Added to ' + target.title + '. Account sync status is shown in the sidebar.'
      );
    } catch (error: any) {
      toast.error(
        'Save needs attention',
        error.message || 'Could not save. Your draft is still here.'
      );
    } finally {
      saveUpdateBusy.current = false;
    }
  };

  useEffect(() => {
    setSavedUpdate(null);
    if (activeSourceStudy?.caseId && activeSourceStudy.caseId !== selectedCaseId)
      setActiveSourceStudy(null);
  }, [selectedCaseId]);
  const saveDraftToCase = () => {
    if (!selectedCase || !input.trim() || saveUpdateBusy.current) return;
    saveUpdateBusy.current = true;
    try {
      if (!getCase(selectedCase.id)) throw new Error('Case unavailable');
      addCaseEvent(selectedCase.id, input.trim(), 'Personal update from Ava');
      setSavedUpdate({ caseId: selectedCase.id, title: selectedCase.title });
      toast.success(
        'Update Saved to Case',
        `Saved to case timeline for "${selectedCase.title || 'Active Case'}".`
      );
      triggerHapticSuccess();
      setInput('');
    } catch {
      toast.error('Update not saved', 'Your draft is still here. Please try again.');
    } finally {
      saveUpdateBusy.current = false;
    }
  };
  const importedCase = selectedCase
    ? { caseId: selectedCase.id, title: selectedCase.title, type: 'Saved case', topConditions: '' }
    : null;
  const setImportedCase = () => handleSelectCase('');
  const [sendError, setSendError] = useState(false);
  const lastRequestRef = useRef<AvaRequest | null>(null);
  const sendingRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestControllerRef.current?.abort(), []);
  const activeRequestIdRef = useRef('');
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const explicitId = params.get('caseId') || params.get('importCase') || location.state?.caseId;
    if (explicitId) {
      const scope = getUnifiedCaseScope(explicitId);
      if (scope.isRequestedCaseMissing) {
        setMissingCaseNotice(explicitId);
        setSelectedCaseId('');
      } else {
        setMissingCaseNotice(null);
        setSelectedCaseId(scope.caseId || '');
      }
    } else {
      setMissingCaseNotice(null);
      setSelectedCaseId('');
    }
  }, [location.search, location.state?.caseId]);

  useEffect(() => {
    const scope = getAvaVaultKey();
    try {
      const raw = localStorage.getItem(
        'hc_ava_pending_' + scope + '_' + (selectedCaseId || 'general')
      );
      const saved = raw ? JSON.parse(raw) : null;
      if (
        saved?.scope === scope &&
        saved.caseId === selectedCaseId &&
        typeof saved.requestId === 'string' &&
        typeof saved.context === 'string' &&
        Array.isArray(saved.messages)
      ) {
        lastRequestRef.current = saved;
        setSendError(true);
        setFailedDraft(saved.messages[saved.messages.length - 1]?.content || '');
      }
    } catch {}
  }, [selectedCaseId]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      if (!input) {
        textareaRef.current.style.height = isMobile ? '44px' : '48px';
      } else {
        textareaRef.current.style.height = 'auto';
        const nextHeight = Math.min(
          Math.max(textareaRef.current.scrollHeight, isMobile ? 44 : 48),
          120
        );
        textareaRef.current.style.height = `${nextHeight}px`;
      }
    }
  }, [input, isMobile]);

  const currentProfileId = useRef<string | null>(null);

  useEffect(() => {
    currentProfileId.current = getAvaVaultKey();
  }, []);

  useEffect(() => {
    const handleProfileUpdate = () => {
      const scope = getAvaVaultKey();
      if (scope !== currentProfileId.current) {
        currentProfileId.current = scope;
        setAccountScope(scope);
        requestControllerRef.current?.abort();
        activeRequestIdRef.current = '';
        sendingRef.current = false;
        setSaveModalState(null);
        setShowMemoryPanel(false);
        setShowDayCheckin(false);
        setShowActivities(false);
        setMessages(getSavedMessages());
        setSelectedCaseId('');
        setInput('');
        setAttachments([]);
        setSendError(false);
        lastRequestRef.current = null;
        setIsTyping(false);
        setIsStreaming(false);
      }
    };
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('hc_profile_updated', handleProfileUpdate);
  }, []);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newAnswerAvailable, setNewAnswerAvailable] = useState(false);
  const readingPositionKey =
    'hc_ava_reading_' + getAvaVaultKey() + '_' + (selectedCaseId || 'general');

  const [chatHydrated, setChatHydrated] = useState(false);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    const scope = getAvaVaultKey();
    let active = true;
    setChatHydrated(false);
    void hydrateAvaMessages(getSavedMessages())
      .then((restored) => {
        if (active && scope === getAvaVaultKey() && restored)
          setMessages((current: any[]) =>
            mergeAvaMessages(restored, normalizeAvaMessages(current))
          );
        if (active && scope === getAvaVaultKey()) setChatHydrated(true);
      })
      .catch(() => {
        if (active) setChatHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [selectedCaseId, accountScope]);
  useEffect(() => {
    if (!chatHydrated) return;
    void persistAvaMessages(normalizeAvaMessages(messages))
      .then(() => setStorageError(''))
      .catch((error) => setStorageError(error.message));
  }, [messages, chatHydrated]);

  // Theme colors - Clinical Teal & Parasympathetic Rest
  const theme = {
    primary: '#0D9488', // Clinical Teal - Parasympathetic & Soothing
    light: '#CCFBF1', // Teal 50
    text: '#115E59', // Teal 800
    bg: '#F8FAFC', // Slate 50
  };

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Safe auto-scroll when user sends a new message or Ava starts typing
  useEffect(() => {
    if (messagesEndRef.current && chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 250;

      if (isNearBottom) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      } else if (!isTyping) {
        setNewAnswerAvailable(true);
      }
    }
  }, [messages.length, isTyping]); // Only run on length change or typing status change
  useEffect(() => {
    if (!chatHydrated) return;
    const frame = requestAnimationFrame(() => {
      const container = chatContainerRef.current;
      if (!container) return;
      try {
        const saved = sessionStorage.getItem(readingPositionKey);
        container.scrollTop = saved !== null ? Number(saved) : container.scrollHeight;
      } catch {}
      setNewAnswerAvailable(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedCaseId, chatHydrated, readingPositionKey]);

  const chatMutation = useMutation({
    mutationFn: (request: AvaRequest) => {
      requestControllerRef.current?.abort();
      const controller = new AbortController();
      requestControllerRef.current = controller;
      return chatWithTherapyGemini(
        request.messages.filter((message) => (message.caseId || '') === request.caseId),
        request.context,
        request.requestId,
        request.caseId ? 'case' : 'general',
        request.safetyContext,
        controller.signal
      );
    },
    onMutate: () => {
      setIsTyping(true);
      setSendError(false);
    },
    // We handle setIsTyping manually in onSuccess to transition from thinking to typing
    onSuccess: async (response: any, request: AvaRequest) => {
      if (
        !isMounted.current ||
        request.requestId !== activeRequestIdRef.current ||
        request.scope !== getAvaVaultKey() ||
        request.caseId !== selectedCaseIdRef.current
      )
        return;

      lastFailedDraftRef.current = null;
      setIsTyping(false);
      const hasWidget = response && response.includes('[WIDGET:');
      setIsStreaming(!hasWidget);
      const reply = newAvaMessage('model', response, request.caseId, {
        id: request.requestId,
        isStreaming: !hasWidget,
        diarySnapshot: request.diarySnapshot || [],
        sourceStudy: request.sourceStudy,
        contextManifest: request.contextManifest,
      });
      setMessages((current: any[]) => mergeAvaMessages(normalizeAvaMessages(current), [reply]));
      try {
        await persistAvaMessages(mergeAvaMessages(normalizeAvaMessages(request.messages), [reply]));
        if (request.scope !== getAvaVaultKey()) return;
        localStorage.removeItem(
          'hc_ava_pending_' + request.scope + '_' + (request.caseId || 'general')
        );
      } catch (error: any) {
        if (request.scope === getAvaVaultKey())
          setStorageError(error.message || 'Reply could not be saved. Retry to recover it.');
      }
      const todayDateStr = new Date().toISOString().split('T')[0];
      awardPoints(
        5,
        'Consulted Ava Clinical Chief of Staff',
        'consult',
        `ava_consult_${todayDateStr}`
      );
      recordTrialUsage('ava');
    },
    onError: (error: any, request: AvaRequest) => {
      if (
        !isMounted.current ||
        request.requestId !== activeRequestIdRef.current ||
        request.scope !== getAvaVaultKey() ||
        request.caseId !== selectedCaseIdRef.current
      )
        return;
      setIsTyping(false);
      setIsStreaming(false);

      if (
        error?.requestState === 'failed' &&
        lastRequestRef.current?.requestId === request.requestId
      ) {
        lastRequestRef.current = { ...request, requestId: crypto.randomUUID() };
        try {
          localStorage.setItem(
            'hc_ava_pending_' + request.scope + '_' + (request.caseId || 'general'),
            JSON.stringify(lastRequestRef.current)
          );
        } catch {}
      }
      const errorMsg = String(error?.message || error || '');
      const isQuota = errorMsg === 'QUOTA_EXCEEDED';

      if (isQuota) {
        const quotaUpgradeMsg = {
          role: 'model',
          content:
            "You've used the available Ava replies in your plan. View your plan's allowance to continue. Ava provides health information and appointment preparation.",
          isUpgradePrompt: true,
          caseId: request.caseId,
        };
        setMessages((prev) => [
          ...prev,
          newAvaMessage('model', quotaUpgradeMsg.content, request.caseId, {
            isUpgradePrompt: true,
          }),
        ]);
        setSendError(false);
      } else {
        setSendError(true);
        if (lastFailedDraftRef.current) {
          setFailedDraft(lastFailedDraftRef.current);
        }
      }
    },
    onSettled: (_data, _error, request) => {
      if (request.requestId === activeRequestIdRef.current) sendingRef.current = false;
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || attachmentBusyRef.current) return;
    e.target.value = '';
    if (
      attachments.length >= 3 ||
      !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      toast.error('Attachment unavailable', 'Attach up to three PDF, JPG, PNG, or WebP files.');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      toast.error('File Too Large', 'Maximum file size is 2.5MB.');
      return;
    }
    if (file.size === 0) {
      toast.error('Invalid File', 'The uploaded file is empty (0 bytes).');
      return;
    }
    if (
      file.type.includes('heic') ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif')
    ) {
      toast.error(
        'Format Not Supported',
        'HEIC/HEIF images from Apple devices are not supported. Please export as JPG.'
      );
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error(
        'File Too Large',
        'Please select an image or document under 4MB. Large camera photos should be compressed.'
      );
      return;
    }

    const attachmentScope = getAvaVaultKey();
    const attachmentCaseId = selectedCaseIdRef.current;
    attachmentBusyRef.current = true;
    setIsProcessingAttachment(true);
    const reader = new FileReader();
    reader.onerror = () => {
      attachmentBusyRef.current = false;
      setIsProcessingAttachment(false);
      toast.error('Upload Error', 'Failed to read the file. Please try another.');
    };
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const cleanBase64 = base64Data?.split(',')[1] || '';
      const attachmentItem: { name: string; data: string; findings?: string } = {
        name: file.name,
        data: base64Data,
      };

      // Pre-extract document findings so Ava understands exact lab values
      try {
        const profile = getProfile() || {};
        const parsed = await analyzeLabReport(cleanBase64, file.type, profile);
        if (parsed?.keyFindings) {
          attachmentItem.findings = JSON.stringify({
            filename: file.name,
            testName: parsed.testName,
            date: parsed.date,
            biomarkers: parsed.biomarkers,
            keyFindings: parsed.keyFindings,
            interpretation: parsed.interpretation,
            verification: 'AI extraction; check against original document',
          });
        }
      } catch (e) {
        toast.error(
          'Document could not be read',
          'Try another copy, or paste the relevant text into your message.'
        );
      }
      attachmentBusyRef.current = false;
      if (!isMounted.current) return;
      setIsProcessingAttachment(false);
      if (attachmentScope !== getAvaVaultKey() || attachmentCaseId !== selectedCaseIdRef.current)
        return;
      if (attachmentItem.findings) setAttachments((prev) => [...prev, attachmentItem]);
      else toast.error('No readable findings', 'Paste the relevant text or try a clearer report.');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text: string) => {
    if (
      (!text.trim() && attachments.length === 0) ||
      sendingRef.current ||
      isTyping ||
      isStreaming ||
      attachmentBusyRef.current
    )
      return;
    const triage = evaluateEmergencyTriage(text);
    if (triage.isEmergency) {
      setEmergencyTriage(triage);
      return;
    }

    sendingRef.current = true;
    const messageScope = getAvaVaultKey();
    const messageCaseId = selectedCaseIdRef.current;
    let safetyContext: string;
    try {
      safetyContext = compilePatientContext({
        includeActiveCase: false,
        includeDailyCheckins: !messageCaseId,
        includeProfile: true,
        includeLabs: false,
        includeImportedCase: false,
      });
    } catch {
      sendingRef.current = false;
      toast.error(
        'Context needs review',
        'Your saved safety information could not be prepared. Review your profile, then try again.'
      );
      return;
    }
    let session;
    try {
      session = await getActiveSession();
    } catch {
      sendingRef.current = false;
      toast.error('Connection unavailable', 'Your draft is still here. Retry in a moment.');
      return;
    }
    if (
      !isMounted.current ||
      messageScope !== getAvaVaultKey() ||
      messageCaseId !== selectedCaseIdRef.current
    ) {
      sendingRef.current = false;
      return;
    }
    if (!session) {
      const errorCount = messages.filter(
        (m: any) => m.role === 'model' && m.content && m.content.includes('trouble connecting')
      ).length;
      const userMessageCount = messages.filter((m: any) => m.role === 'user').length - errorCount;
      if (userMessageCount >= 5) {
        sendingRef.current = false;
        const userMsg = {
          role: 'user',
          content: text.trim(),
          caseId: selectedCaseId,
          attachments: attachments.map((a: any) => a.name),
        };
        const upgradeMsg = {
          role: 'model',
          content:
            "You've used the five guest requests. Sign in to continue with your account's available Ava allowance.",
          isUpgradePrompt: true,
          caseId: selectedCaseId,
        };
        setMessages((prev) => [...prev, ...normalizeAvaMessages([userMsg, upgradeMsg])]);
        setInput('');
        setAttachments([]);
        window.dispatchEvent(
          new CustomEvent('hc_require_auth', {
            detail: {
              title: 'Guest Limit Reached',
              message:
                'You have reached the guest limit of 5 messages. Buy premium or log in to continue chatting with Ava.',
            },
          })
        );
        return;
      }
    }

    if (!canUseTrial('ava')) {
      sendingRef.current = false;
      const userMsg = {
        role: 'user',
        content: text.trim(),
        caseId: selectedCaseId,
        attachments: attachments.map((a: any) => a.name),
      };
      const upgradeMsg = {
        role: 'model',
        content:
          "You've used all 10 free trial replies with Ava. Upgrade to HealthChain Pro to continue your consultation with more replies, deep lab insights, and On-demand care support.",
        isUpgradePrompt: true,
        caseId: selectedCaseId,
      };
      setMessages((prev) => [...prev, ...normalizeAvaMessages([userMsg, upgradeMsg])]);
      setInput('');
      setAttachments([]);
      openTrialModal('Ava Health Buddy (10 Free Trial Replies)');
      return;
    }

    if ((!text.trim() && attachments.length === 0) || isTyping || isStreaming) {
      sendingRef.current = false;
      return;
    }

    let finalContent = text.trim();
    if (attachments.length > 0) {
      const attachStr = attachments
        .map((a: any) => {
          return a.findings
            ? `[Attached Document: ${a.name}\n${a.findings}]`
            : `[Attached Document: ${a.name}]`;
        })
        .join('\n\n');
      finalContent = finalContent ? `${finalContent}\n\n${attachStr}` : attachStr;
    }
    lastFailedDraftRef.current = finalContent;

    const newMessages = [
      ...messages,
      newAvaMessage('user', finalContent, selectedCaseId, {
        attachments: attachments.map((a) => a.name),
      }),
    ];
    sendingRef.current = true;
    let contextCase = selectedCaseId ? getCase(selectedCaseId) : undefined;
    if (selectedCaseId && contextCase) {
      try {
        contextCase = await reviewedCaseWithCurrentSources(selectedCaseId);
      } catch {
        sendingRef.current = false;
        toast.error(
          'Sources changed',
          'Review the selected case before sending this question again. Your draft is retained.'
        );
        return;
      }
      if (
        messageScope !== getAvaVaultKey() ||
        messageCaseId !== selectedCaseIdRef.current ||
        !isMounted.current
      ) {
        sendingRef.current = false;
        return;
      }
    }
    const baseCaseContext = contextCase ? buildCaseContext(contextCase) : '';

    // Keep user-reported context available without promoting it to verified fact.
    const documentedSnippet =
      documentedAnswers.length > 0
        ? `\n\n[CASE-SCOPED REPORTED OR DOCUMENTED CONTEXT — do not present these items as independently verified. Do not ask the patient to repeat them unless clarification is necessary because the record is ambiguous, conflicting, or outdated]:\n` +
          documentedAnswers
            .map((a) => `- ${a.topic}: "${a.value}" (Source: ${a.source})`)
            .join('\n')
        : '';

    // Order 8: Research content handoff — inject full study abstract and criteria breakdown so Ava summarizes the retrieved source, not merely its title
    const studySnippet = activeSourceStudy
      ? `\n\n[RETRIEVED RESEARCH SOURCE STUDY TO SUMMARIZE]:\nTitle: "${activeSourceStudy.title || activeSourceStudy.briefTitle}"\nNCT ID: ${activeSourceStudy.nctId}\nPhase: ${activeSourceStudy.phase || 'N/A'}\nTarget Conditions: ${(activeSourceStudy.conditions || []).join(', ')}\nMatch Evaluation: ${activeSourceStudy.matchStatus}\nEligibility & Criteria Breakdown:\n- Age Criteria: ${JSON.stringify(activeSourceStudy.criteriaBreakdown?.ageCriteria || null)}\n- Gender Criteria: ${JSON.stringify(activeSourceStudy.criteriaBreakdown?.genderCriteria || null)}\n- Condition Match: ${JSON.stringify(activeSourceStudy.criteriaBreakdown?.conditionMatch || null)}\n- Clinical Note: ${activeSourceStudy.criteriaBreakdown?.overallNote || ''}\nAbstract / Objectives:\n${activeSourceStudy.abstract || 'No abstract provided'}\n\n[CRITICAL INSTRUCTION FOR AVA]: The patient is discussing this retrieved clinical research study. You must describe only the supplied study information. A title or abstract is not proof of completed results; say when findings or eligibility details are missing in compassionate, clear language. Highlight why it matches or differs from their profile, and prepare 2-3 specific questions for them to discuss with their clinician.`
      : '';

    // Promise 5: Inject semantic memory context so user never repeats their story
    const memorySnippet =
      memoryContext.includedItems.length > 0
        ? `\n\n[CASE-SCOPED HISTORY & MEMORIES — preserve provenance and do not treat AI-generated memory as a confirmed clinical fact]:\n` +
          memoryContext.includedItems
            .map(
              (item) =>
                `- [${item.time}] (${item.type}) ${item.title}${'recordId' in item ? ` [record ${item.recordId}]` : ''}`
            )
            .join('\n') +
          '\n[USER-REPORTED OBSERVATIONS — occurrence dates and unanswered values are explicit; recordedAt is the save time, not a symptom onset]:\n' +
          JSON.stringify(memoryContext.observationSnapshots)
        : '';
    const finalContext =
      `${baseCaseContext}${documentedSnippet}${studySnippet}${memorySnippet}\n\n[DAILY INTAKE AND DOSE REPORTS — preserve unknowns, dates, units and source revisions]:\n${JSON.stringify(memoryContext.dailyEvidence)}\n\n[DEVICE SOURCE SAMPLES — original units/periods; no diagnostic inference]:\n${JSON.stringify(selectedCaseId ? { status: 'excluded_from_case_context' } : deviceContext || { status: 'unavailable' })}`.trim();
    if (finalContext.length > 50000) {
      sendingRef.current = false;
      toast.error(
        'Choose a smaller set of records',
        'This conversation contains too much material for one answer. Choose the specific record or question to discuss. Your draft is still here.'
      );
      return;
    }

    const request = {
      messages: newMessages,
      caseId: selectedCaseId,
      context: finalContext,
      scope: messageScope,
      safetyContext,
      diarySnapshot: (selectedCaseId ? [] : recentDiaryMeals).map((meal) => ({
        id: meal.id,
        name: meal.name,
        occurredAt: meal.occurredAt,
        timePrecision: meal.timePrecision,
        type: meal.type,
      })),
      sourceStudy: activeSourceStudy || undefined,
      contextManifest: {
        ...memoryContext,
        deviceSources: selectedCaseId
          ? { status: 'excluded_from_case_context' }
          : deviceContext || { status: 'unavailable' },
        safetyFactsIncluded: [
          'Profile',
          'Allergies (including unknown status)',
          'Medications with recorded dose and status',
        ],
        caseId: selectedCaseId,
        sourceStudyId: activeSourceStudy?.nctId,
        records: (baseCaseContext ? JSON.parse(baseCaseContext).records || [] : []).map(
          (rec: any) => ({ id: rec.id, filename: rec.name, content: JSON.stringify(rec) })
        ),
      },
      requestId: crypto.randomUUID?.() || `ava_${Date.now()}`,
    };
    activeRequestIdRef.current = request.requestId;
    lastRequestRef.current = request;
    try {
      localStorage.setItem(
        'hc_ava_pending_' + request.scope + '_' + (request.caseId || 'general'),
        JSON.stringify(request)
      );
    } catch {}
    setMessages(newMessages);
    setInput('');
    setAttachments([]);

    chatMutation.mutate(request);
  };

  return (
    <div
      className="connected-experience"
      style={{
        padding: isMobile ? '8px 12px calc(var(--safe-area-bottom, 0px) + 12px) 12px' : '0 24px',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'flex-start' : 'center',
        background: 'transparent',
      }}
    >
      {/* Outer White Card Container */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          height: '100%',
          maxHeight: '100%',
          background:
            'linear-gradient(135deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.14) 100%)',
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          borderRadius: isMobile ? '28px' : '32px',
          margin: '0',
          maxWidth: isMobile ? '100%' : '1000px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow:
            '0 20px 48px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.35)',
        }}
      >
        {/* Header - Desktop Only (Mobile uses AppShell's clean top bar) */}
        {!isMobile && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '18px 28px',
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderBottom: '1.5px solid #E2E8F0',
              flexShrink: 0,
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                aria-label="Go back"
                onClick={() => {
                  if (window.history.state && window.history.state.idx > 0) {
                    navigate(-1);
                  } else {
                    navigate('/app/today');
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.primary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  marginRight: '14px',
                }}
              >
                <ArrowLeft size={20} />
              </button>

              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: theme.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '14px',
                  boxShadow: '0 4px 14px rgba(244, 63, 94, 0.15)',
                }}
              >
                <Heart size={20} color={theme.primary} />
              </div>

              <div>
                <h1
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0F172A',
                    margin: '0 0 2px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  Ava
                </h1>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: theme.primary,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    margin: 0,
                  }}
                >
                  Health assistant
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                aria-label="Select active case workspace"
                onClick={() => {
                  triggerHapticLight();
                  setIsCaseSelectorOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: selectedCase
                    ? 'rgba(13, 148, 136, 0.12)'
                    : 'rgba(241, 245, 249, 0.9)',
                  border: selectedCase ? '1.5px solid #99F6E4' : '1.5px solid #E2E8F0',
                  color: selectedCase ? '#0F766E' : '#64748B',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.08)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{selectedCase ? '📁' : '🌐'}</span>
                <span
                  style={{
                    maxWidth: '160px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {selectedCase ? selectedCase.title : 'General Mode'}
                </span>
                <ChevronDown size={14} />
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setWholeHealthTab('picture');
                  setIsWholeHealthOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CCFBF1',
                  color: '#0D9488',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.12)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <Activity size={14} color="#0D9488" /> Whole Health
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div
          ref={chatContainerRef}
          role="log"
          aria-label="Ava conversation"
          aria-live="off"
          onScroll={(e) => {
            const container = e.currentTarget;
            try {
              sessionStorage.setItem(readingPositionKey, String(container.scrollTop));
            } catch {}
            if (container.scrollHeight - container.scrollTop - container.clientHeight < 100)
              setNewAnswerAvailable(false);
            window.dispatchEvent(
              new CustomEvent('hc_scroll_intent', { detail: { scrollTop: container.scrollTop } })
            );
          }}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: isMobile ? '20px 16px' : '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {missingCaseNotice && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                role="alert"
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: 16,
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  color: '#991B1B',
                  fontSize: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Case not found.</strong> Ava is using general context.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMissingCaseNotice(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#991B1B',
                    padding: 4,
                  }}
                  aria-label="Dismiss notice"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}

            {importedCase && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                  border: '1.5px solid #99F6E4',
                  borderRadius: 20,
                  padding: isMobile ? '14px 16px' : '16px 20px',
                  marginBottom: 8,
                  boxShadow: '0 4px 16px rgba(13,148,136,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: '#0D9488',
                      color: '#FFF',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          color: '#0D9488',
                          textTransform: 'uppercase',
                          letterSpacing: 0.6,
                        }}
                      >
                        Using case
                      </span>
                    </div>
                    <strong
                      style={{
                        fontSize: 14.5,
                        color: '#115E59',
                        display: 'block',
                        lineHeight: 1.3,
                      }}
                    >
                      {importedCase.title}
                    </strong>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {importedCase.caseId && (
                    <button
                      onClick={() => navigate(`/app/cases/${importedCase.caseId}`)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #99F6E4',
                        color: '#0F766E',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Open case
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setImportedCase();
                      try {
                        sessionStorage.removeItem('hc_imported_case_brief');
                      } catch (e) {}
                    }}
                    aria-label="Close imported case context"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0D9488',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Context disclosure */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '8px 0 14px 0',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setShowContextModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.88)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid #CCFBF1',
                  color: '#0F766E',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.08)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)')
                }
              >
                <span>
                  Using {memoryContext.includedItems.length} context{' '}
                  {memoryContext.includedItems.length === 1 ? 'item' : 'items'}
                </span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isCaseSelectorOpen}
                onClick={() => setIsCaseSelectorOpen(true)}
                style={{
                  minHeight: 44,
                  padding: '8px 14px',
                  borderRadius: 12,
                  border: '1px solid #CCFBF1',
                  color: '#0F766E',
                  background: '#FFFFFF',
                  marginBottom: 12,
                }}
              >
                Conversation: {selectedCase?.title || 'General health'} · Change
              </button>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setShowMemoryPanel(true)}
                style={{ minHeight: 44, marginLeft: 8 }}
              >
                Review memories
              </button>
              {storageError && <p role="alert">{storageError}</p>}
              <div
                role="status"
                aria-live="polite"
                style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden' }}
              >
                {isTyping
                  ? 'Ava is preparing a reply'
                  : visibleMessages[visibleMessages.length - 1]?.role === 'model'
                    ? 'Ava reply ready'
                    : ''}
              </div>

              {visibleMessages.map((msg: any, idx: number) => (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  {msg.role === 'model' && (
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.55)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid rgba(255, 255, 255, 0.8)',
                        boxShadow:
                          '0 4px 12px rgba(244, 63, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '4px',
                      }}
                    >
                      <Heart size={16} color={theme.primary} />
                    </div>
                  )}

                  <div
                    style={{
                      whiteSpace: 'pre-wrap',
                      overflowWrap: 'anywhere',
                      background:
                        msg.role === 'user'
                          ? 'linear-gradient(135deg, #FF5A5F 0%, #E11D48 100%)'
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.88) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      color: msg.role === 'user' ? '#FFFFFF' : '#1C1917',
                      padding: isMobile ? '14px 18px' : '16px 22px',
                      borderRadius:
                        msg.role === 'user' ? '22px 22px 6px 22px' : '22px 22px 22px 6px',
                      fontSize: '15px',
                      lineHeight: 1.5,
                      boxShadow:
                        msg.role === 'user'
                          ? '0 10px 28px rgba(225, 29, 72, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                          : '0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                      border:
                        msg.role === 'user'
                          ? '1px solid rgba(255, 255, 255, 0.25)'
                          : '1.5px solid #CCFBF1',
                      maxWidth: isMobile ? '88%' : '80%',
                    }}
                  >
                    {msg.caseId && (
                      <small style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>
                        Case:{' '}
                        {availableCases.find((item) => item.id === msg.caseId)?.title ||
                          'Previous case'}
                      </small>
                    )}
                    {msg.isStreaming ? (
                      <TypewriterText
                        content={msg.content}
                        messagesEndRef={messagesEndRef}
                        onComplete={() => {
                          setIsStreaming(false);
                          setMessages((prev) => {
                            const updated = [...prev];
                            const idx = updated.findIndex((m) => m === msg);
                            if (idx !== -1) {
                              updated[idx] = { ...msg, isStreaming: false };
                            }
                            return updated;
                          });
                        }}
                      />
                    ) : msg.content ? (
                      <>
                        <MessageRenderer
                          messageId={msg.id}
                          content={msg.content}
                          diaryEntries={msg.diarySnapshot || []}
                          onOpenCalm={() => setActiveMeditation(true)}
                          onOpenWorkout={() => setShowActivities(true)}
                          onOpenWholeHealth={() => setIsWholeHealthOpen(true)}
                        />
                        {msg.contextManifest && (
                          <AvaDisclosure
                            key={msg.id + '_context'}
                            storageId={msg.id + '_context'}
                            style={{ marginTop: 12 }}
                          >
                            <summary style={{ minHeight: 44, cursor: 'pointer' }}>
                              Context included in this reply
                            </summary>
                            <p>
                              Mode: {msg.caseId ? 'Selected case' : 'General health'}. Profile,
                              recorded allergies and medication details were included. Missing
                              safety facts remain unknown.
                            </p>
                            <p>
                              Saved context from the time of this reply. Recheck current health
                              facts before using earlier guidance.
                            </p>
                            {sourceFreshness(
                              [
                                ...(msg.contextManifest.observationSnapshots || []),
                                ...(msg.contextManifest.dailyEvidence?.hydration?.sources || []),
                                ...(msg.contextManifest.dailyEvidence?.doses || []),
                              ],
                              dailyObservations
                            ).some((item: any) => item.status !== 'current') && (
                              <p role="status" style={{ color: '#b45309' }}>
                                Some source observations have changed or are no longer available.
                                Ask Ava again with the current records.
                              </p>
                            )}
                            <ul>
                              {(msg.contextManifest.includedItems || []).map(
                                (item: any, index: number) => (
                                  <li key={index}>
                                    {item.title} · {item.source} · {item.time}
                                  </li>
                                )
                              )}
                            </ul>
                            {msg.sourceStudy && (
                              <p>
                                Research source: {msg.sourceStudy.nctId}. Trial registration does
                                not establish published results.
                              </p>
                            )}
                          </AvaDisclosure>
                        )}
                        {msg.isUpgradePrompt && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              marginTop: '14px',
                              background:
                                'linear-gradient(135deg, #064E3B 0%, #047857 50%, #065F46 100%)',
                              borderRadius: '16px',
                              padding: '16px 18px',
                              color: '#FFFFFF',
                              boxShadow:
                                '0 8px 24px rgba(4, 120, 87, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#FFFFFF',
                                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Sparkles size={16} />
                                </div>
                                <div>
                                  <div
                                    style={{
                                      fontWeight: 800,
                                      fontSize: '14px',
                                      letterSpacing: '-0.2px',
                                    }}
                                  >
                                    HealthChain Pro
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#A7F3D0' }}>
                                    Health information and planning support
                                  </div>
                                </div>
                              </div>
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  background: 'rgba(245, 158, 11, 0.25)',
                                  border: '1px solid rgba(245, 158, 11, 0.5)',
                                  color: '#FDE68A',
                                }}
                              >
                                PRO UPGRADE
                              </span>
                            </div>

                            <ul
                              style={{
                                margin: 0,
                                paddingLeft: '18px',
                                fontSize: '12px',
                                color: '#E2E8F0',
                                lineHeight: 1.6,
                              }}
                            >
                              <li>Unlimited Ava consultations & multi-case memory</li>
                              <li>Instant lab & document findings interpretation</li>
                              <li>Comprehensive doctor visit agenda & summaries</li>
                            </ul>

                            <div
                              style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '4px',
                                flexWrap: 'wrap',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    triggerHapticLight();
                                  } catch {}
                                  navigate('/pricing');
                                }}
                                style={{
                                  flex: 1,
                                  minWidth: '160px',
                                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '10px',
                                  padding: '10px 16px',
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                                }}
                              >
                                <span>Buy Premium to Unlock More</span>
                                <ArrowRight size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    triggerHapticLight();
                                  } catch {}
                                  openTrialModal('Ava Health Buddy');
                                }}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.12)',
                                  color: '#FFFFFF',
                                  border: '1px solid rgba(255, 255, 255, 0.25)',
                                  borderRadius: '10px',
                                  padding: '10px 14px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                View Plans
                              </button>
                            </div>
                          </motion.div>
                        )}
                        {msg.role === 'model' && !msg.isUpgradePrompt && (
                          <AvaActionToolbar
                            msgIndex={msg.id}
                            modelContent={msg.content}
                            userContent={
                              visibleMessages[idx - 1]?.role === 'user'
                                ? visibleMessages[idx - 1].content
                                : undefined
                            }
                            selectedCase={getCase(msg.caseId) || null}
                            activeSourceStudy={msg.sourceStudy}
                            savedActionIds={savedActionIds}
                            onSaveObservation={(draft) => {
                              setSaveModalState({
                                isOpen: true,
                                type: 'observation',
                                initialText:
                                  draft ||
                                  (visibleMessages[idx - 1]?.role === 'user'
                                    ? visibleMessages[idx - 1].content
                                    : 'Patient observation'),
                                caseId: msg.caseId || '',
                                msgIndex: msg.id,
                              });
                            }}
                            onAddQuestion={(draft) => {
                              setSaveModalState({
                                isOpen: true,
                                type: 'question',
                                initialText:
                                  draft ||
                                  'What are the recommended next steps for my doctor visit?',
                                caseId: msg.caseId || '',
                                msgIndex: msg.id,
                              });
                            }}
                            onExplainSource={() => {
                              setActiveSourceStudy(msg.sourceStudy || null);
                              if (msg.sourceStudy) {
                                const activeSourceStudy = msg.sourceStudy;
                                setInput(
                                  `Can you explain the clinical objectives, findings, and patient relevance of study ${activeSourceStudy.nctId} (${activeSourceStudy.title || activeSourceStudy.briefTitle}) in simple terms?`
                                );
                              } else if (msg.contextManifest?.records?.length) {
                                const records = msg.contextManifest.records;
                                setInput(
                                  'Please explain the records captured for this earlier answer, including missing information and uncertainty:\n' +
                                    records.map((rec: any) => rec.content).join('\n')
                                );
                              } else {
                                toast.error(
                                  'Source unavailable',
                                  'This earlier answer has no captured record source. Choose a record to discuss.'
                                );
                                return;
                              }
                              textareaRef.current?.focus();
                            }}
                            onOpenReview={() => {
                              if (getCase(msg.caseId)) {
                                const selectedCase = getCase(msg.caseId)!;
                                navigate(
                                  `/app/jarvis?caseId=${encodeURIComponent(selectedCase.id)}`
                                );
                              }
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <span style={{ opacity: 0.5 }}>...</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', gap: '12px' }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.55)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow:
                      '0 4px 12px rgba(244, 63, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} color={theme.primary} />
                </div>
                <div
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.18) 100%)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    padding: isMobile ? '12px 16px' : '16px',
                    borderRadius: '20px 20px 20px 4px',
                    border: '1px solid rgba(255, 255, 255, 0.85)',
                    boxShadow:
                      '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.75), inset 0 0 30px rgba(255, 255, 255, 0.35)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center',
                  }}
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                    style={{
                      width: '6px',
                      height: '6px',
                      background: theme.primary,
                      borderRadius: '50%',
                    }}
                  />
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.15 }}
                    style={{
                      width: '6px',
                      height: '6px',
                      background: theme.primary,
                      borderRadius: '50%',
                      opacity: 0.7,
                    }}
                  />
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, delay: 0.3 }}
                    style={{
                      width: '6px',
                      height: '6px',
                      background: theme.primary,
                      borderRadius: '50%',
                      opacity: 0.4,
                    }}
                  />
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} style={{ height: 1 }} />

            {/* Suggestions - Show after initial/imported message if user hasn't typed yet */}
            {messages.length <= 2 && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  paddingLeft: isMobile ? '0' : '44px',
                  marginTop: '-4px',
                }}
              >
                {(importedCase ? CASE_RECHECK_SUGGESTIONS : SUGGESTIONS).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.2) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.85)',
                      color: importedCase ? '#0D9488' : '#BE123C',
                      padding: isMobile ? '10px 16px' : '10px 18px',
                      borderRadius: '99px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow:
                        '0 4px 16px rgba(244, 63, 94, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.borderColor = theme.primary;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.2) 100%)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.85)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <Sparkles size={12} />
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {newAnswerAvailable && (
          <button
            type="button"
            style={{ minHeight: 44 }}
            onClick={() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
              setNewAnswerAvailable(false);
            }}
          >
            Go to latest answer
          </button>
        )}
        {isStreaming && (
          <button
            type="button"
            style={{ minHeight: 44 }}
            onClick={() => {
              setMessages((current) =>
                current.map((message) => ({ ...message, isStreaming: false }))
              );
              setIsStreaming(false);
            }}
          >
            Show full reply now
          </button>
        )}
        {/* Input Area */}
        <div
          style={{
            padding: isMobile ? '12px 14px 14px 14px' : '24px 32px',
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.4)',
            marginTop: 'auto',
            width: '100%',
            flexShrink: 0,
            marginBottom: '0',
          }}
        >
          {attachments.length > 0 && (
            <div
              style={{
                width: '100%',
                maxWidth: '720px',
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
                flexWrap: 'wrap',
              }}
            >
              {attachments.map((att, idx) => (
                <div
                  key={att.name + idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    padding: '6px 12px',
                    borderRadius: '99px',
                    fontSize: '13px',
                    color: '#1E293B',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.05)',
                  }}
                >
                  <FileIcon size={14} color="#64748b" />
                  <span
                    style={{
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {att.name}
                  </span>
                  <button
                    aria-label="Remove attachment"
                    onClick={() => removeAttachment(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#94A3B8',
                      marginLeft: '4px',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeSourceStudy && (
            <div
              style={{
                width: '100%',
                maxWidth: '720px',
                marginBottom: '8px',
                padding: '8px 12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                fontSize: '12px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}
              >
                <span style={{ fontSize: '15px' }}>🔬</span>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: '#14532D' }}>
                    Referenced Study: {activeSourceStudy.title || activeSourceStudy.briefTitle}
                  </strong>
                  <span style={{ color: '#166534', marginLeft: '6px' }}>
                    ({activeSourceStudy.nctId}) • Abstract Attached
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSourceStudy(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  color: '#15803D',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove study attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <form
            className="ava-composer"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            style={{
              width: '100%',
              maxWidth: '720px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              aria-label="Upload medical file or health image"
              style={{ display: 'none' }}
            />
            <button
              aria-label="Add attachment"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                left: isMobile ? '7px' : '9px',
                bottom: isMobile ? '6px' : '8px',
                width: isMobile ? '32px' : '34px',
                height: isMobile ? '32px' : '34px',
                minHeight: '44px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
                color: '#64748B',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
                zIndex: 2,
              }}
            >
              <Plus size={isMobile ? 16 : 18} />
            </button>
            <input
              type="hidden"
              aria-label="Conversation context"
              value={selectedCaseId}
              readOnly
            />
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={8000}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask Ava Health Buddy a question"
              placeholder={isMobile ? 'Check in with Ava...' : 'Just check in about your day...'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: isMobile ? '11px 74px 11px 44px' : '13px 88px 13px 48px',
                borderRadius: '24px',
                border: '1.5px solid #CCFBF1',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                fontSize: isMobile ? '14px' : '15px',
                lineHeight: '20px',
                height: isMobile ? '44px' : '48px',
                minHeight: isMobile ? '44px' : '48px',
                maxHeight: '120px',
                resize: 'none',
                outline: 'none',
                boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
                color: '#1C1917',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                setTimeout(
                  () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }),
                  300
                );
                e.target.style.borderColor = '#0D9488';
                e.target.style.boxShadow = '0 8px 28px rgba(13, 148, 136, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CCFBF1';
                e.target.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.05)';
              }}
            />

            <div
              style={{
                position: 'absolute',
                right: isMobile ? '6px' : '8px',
                bottom: isMobile ? '5px' : '7px',
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '4px' : '6px',
                zIndex: 2,
              }}
            >
              {/* Photo Meal Snap Button */}
              <button
                type="button"
                aria-label="Log a meal or food photo"
                title="Snap meal photo"
                onClick={() => setIsQuickMealOpen(true)}
                style={{
                  width: '44px',
                  height: '44px',
                  minHeight: '44px',
                  borderRadius: '50%',
                  background: '#F8FAFC',
                  color: '#64748B',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Camera size={isMobile ? 14 : 16} />
              </button>

              {/* Send Button */}
              <button
                aria-label="Send message"
                type="submit"
                disabled={
                  (!input.trim() && attachments.length === 0) ||
                  isTyping ||
                  isStreaming ||
                  isProcessingAttachment
                }
                style={{
                  width: isMobile ? '34px' : '36px',
                  height: isMobile ? '34px' : '36px',
                  minHeight: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor:
                    (!input.trim() && attachments.length === 0) || isTyping || isStreaming
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    (!input.trim() && attachments.length === 0) || isTyping || isStreaming
                      ? 0.45
                      : 1,
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={isMobile ? 14 : 15} style={{ marginLeft: '2px' }} />
              </button>
            </div>
          </form>
          {(isProcessingAttachment ||
            sendError ||
            (selectedCase && input.trim()) ||
            savedUpdate) && (
            <div
              style={{ width: '100%', maxWidth: 720, marginTop: 8, fontSize: 12, color: '#475569' }}
            >
              {isProcessingAttachment && (
                <p role="status">
                  Reading your document… You can keep writing while it is processed.
                </p>
              )}
              {sendError && (
                <div
                  role="alert"
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    color: '#991B1B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: '6px',
                  }}
                >
                  <span>
                    Ava couldn’t respond. You can retry or restore your message to the editor.
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {failedDraft && (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '11.5px', padding: '4px 8px', cursor: 'pointer' }}
                        onClick={() => {
                          setInput(failedDraft);
                          setFailedDraft(null);
                          setSendError(false);
                        }}
                      >
                        Restore to editor
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '11.5px', padding: '4px 8px', cursor: 'pointer' }}
                      onClick={() => {
                        if (lastRequestRef.current && !sendingRef.current) {
                          sendingRef.current = true;
                          activeRequestIdRef.current = lastRequestRef.current.requestId;
                          chatMutation.mutate(lastRequestRef.current);
                        }
                      }}
                    >
                      Retry message
                    </button>
                  </div>
                </div>
              )}
              {selectedCase && input.trim() && (
                <button type="button" className="btn btn-outline" onClick={saveDraftToCase}>
                  Save draft as a case update
                </button>
              )}
              {savedUpdate && (
                <div role="status" style={{ margin: '8px 0', lineHeight: 1.5 }}>
                  Saved to {savedUpdate.title}.{' '}
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => navigate(`/app/cases/${encodeURIComponent(savedUpdate.caseId)}`)}
                  >
                    View saved update
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      navigate(`/app/case-prep?caseId=${encodeURIComponent(savedUpdate.caseId)}`)
                    }
                  >
                    Prepare for your visit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* One compact row of Ava quick tools */}
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              display: 'flex',
              gap: '8px',
              marginTop: '10px',
              overflowX: 'auto',
              paddingBottom: '4px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {QUICK_ACTION_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                title={TOOL_PURPOSES[pill.id]}
                aria-label={`${pill.label}: ${TOOL_PURPOSES[pill.id]}`}
                onClick={() => {
                  triggerHapticLight();
                  if (pill.action === 'meal') {
                    setIsQuickMealOpen(true);
                  } else if (pill.action === 'log_day') {
                    if (input.trim()) {
                      toast.info(
                        'Your draft is ready',
                        'Send or save your current draft before starting a daily check-in.'
                      );
                    } else {
                      setShowDayCheckin(true);
                    }
                    textareaRef.current?.focus();
                  } else if (pill.action === 'river') {
                    setIsRiverOpen(true);
                  } else if (pill.action?.startsWith('tab:')) {
                    const tabName = pill.action.split(':')[1] as WholeHealthTab;
                    setWholeHealthTab(tabName);
                    setIsWholeHealthOpen(true);
                  } else if (pill.prompt) {
                    handleSend(pill.prompt);
                  }
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: pill.bg,
                  color: pill.color,
                  border: `1.5px solid ${pill.border}`,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <span>{pill.icon}</span>
                <span>{pill.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>{' '}
      {/* Close Outer White Card Container */}
      {/* Footer - Hide on mobile */}
      {!isMobile && (
        <div
          style={{
            textAlign: 'center',
            padding: '20px 0',
            color: '#94A3B8',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.5px',
          }}
        >
          <div
            style={{
              color: '#0F172A',
              marginBottom: '4px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            HealthChain
          </div>
          <div>Not emergency care. Contact local emergency services for urgent help.</div>
        </div>
      )}
      {showMemoryPanel && (
        <AvaMemoryPanel
          key={selectedCaseId}
          caseId={selectedCaseId}
          messages={conversationMessages}
          onClose={() => setShowMemoryPanel(false)}
        />
      )}
      {showDayCheckin && <AvaDayCheckin onClose={() => setShowDayCheckin(false)} />}
      {showActivities && <AvaActivityBrowser onClose={() => setShowActivities(false)} />}
      {/* Interactive In-Chat Meditation Player Modal */}
      {activeMeditation && <GuidedBreathingSession onClose={() => setActiveMeditation(null)} />}
      {/* Whole Health & Food Sensitivities Modal (Reference Images 3 & 4) */}
      <TriggerSensitivityModal
        isOpen={isWholeHealthOpen}
        onClose={() => setIsWholeHealthOpen(false)}
        onOpenMindfulness={() => setActiveMeditation(true)}
        initialTab={wholeHealthTab}
      />
      {/* Whole Health River Daily Stream Modal */}
      <WholeHealthRiverModal
        isOpen={isRiverOpen}
        onClose={() => setIsRiverOpen(false)}
        onAskAvaAboutConnection={(upstream, downstream) => {
          handleSend(
            `Ava, I noticed a connection in my Whole Health River: my "${upstream}" is followed by "${downstream}". What does the recorded timing tell us, what remains unknown, and what should I ask my clinician? Do not infer causation.`
          );
        }}
      />
      {/* Quick Circadian Meal Intake Sheet (Voice + Indian Diet) */}
      <QuickMealIntakeSheet
        isOpen={isQuickMealOpen}
        onClose={() => setIsQuickMealOpen(false)}
        onMealLogged={() => {
          triggerHapticLight();
        }}
      />
      {/* Gut Health Multi-System Intelligence Modal */}
      <ConnectionDetectiveModal
        isOpen={isDetectiveOpen}
        caseId={selectedCaseId || null}
        initialTab={detectiveTab}
        onClose={() => setIsDetectiveOpen(false)}
        onOpenFoodDetective={() => {
          setIsDetectiveOpen(false);
          setWholeHealthTab('detective');
          setIsWholeHealthOpen(true);
        }}
        onOpenConsult={() => {
          setIsDetectiveOpen(false);
        }}
        onOpenCasePrep={() => {
          setIsDetectiveOpen(false);
          navigate('/app/case-prep');
        }}
        onOpenGutHealth={() => {
          setIsDetectiveOpen(false);
          navigate('/app/today?gut=1');
        }}
      />
      <EmergencyTriageModal
        isOpen={Boolean(emergencyTriage?.isEmergency)}
        triage={emergencyTriage}
        onClose={() => setEmergencyTriage(null)}
      />
      {/* Context scope */}
      <AnimatePresence>
        {showContextModal && (
          <FocusTrap onEscape={() => setShowContextModal(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Conversation context"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                padding: '16px',
              }}
              onClick={() => setShowContextModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                style={{
                  width: '100%',
                  maxWidth: '520px',
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px solid #CCFBF1',
                  boxShadow: '0 24px 60px rgba(13, 148, 136, 0.2)',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: '#F0FDFA',
                        border: '1px solid #99F6E4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                      }}
                    >
                      🧠
                    </div>
                    <div>
                      <h3
                        style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}
                      >
                        Conversation context
                      </h3>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContextModal(false)}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '8px',
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748B',
                      fontWeight: 700,
                    }}
                  >
                    ✕
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.55 }}>
                  These saved items are available for your next reply. Each completed answer has its
                  own captured context details.
                </p>

                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#0F766E',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      marginBottom: '8px',
                    }}
                  >
                    Included ({memoryContext.includedItems.length})
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {memoryContext.includedItems.map((item, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '8px 12px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '10px',
                          fontSize: '12.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            overflow: 'hidden',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: '#E0F2FE',
                              color: '#0369A1',
                            }}
                          >
                            {item.type}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: '#1E293B',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                            }}
                          >
                            {item.title}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#94A3B8', flexShrink: 0 }}>
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: '#FFFBEB',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1px solid #FDE68A',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#B45309',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px',
                    }}
                  >
                    Not included ({memoryContext.omittedCount})
                  </div>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#92400E', lineHeight: 1.5 }}>
                    Other saved items were not selected for this conversation. This list does not
                    establish their clinical relevance.
                  </p>
                </div>

                <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
                  Review important details before acting on an answer.
                </div>
              </motion.div>
            </div>
          </FocusTrap>
        )}
      </AnimatePresence>
      <CaseSelectorModal
        isOpen={isCaseSelectorOpen}
        selectedCaseId={selectedCaseId}
        availableCases={availableCases}
        onSelectCase={(newCaseId) => handleSelectCase(newCaseId)}
        onClose={() => setIsCaseSelectorOpen(false)}
      />
      {saveModalState && (
        <SaveTaskModal
          isOpen={saveModalState.isOpen}
          type={saveModalState.type}
          initialText={saveModalState.initialText}
          activeCaseId={saveModalState.caseId}
          availableCases={availableCases}
          onClose={() => setSaveModalState(null)}
          onConfirm={(confirmedText, targetCaseId, specialty) =>
            handleConfirmSave(confirmedText, targetCaseId, specialty)
          }
        />
      )}
    </div>
  );
}
