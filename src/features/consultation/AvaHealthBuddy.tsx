import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Send, Sparkles, Paperclip, X, File as FileIcon, Activity, Play, Wind, Plus, Pill, Zap, Camera, AlertCircle, ChevronDown, Check, CheckCircle2, ExternalLink } from 'lucide-react';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { chatWithTherapyGemini, analyzeLabReport, extractClinicalMemory } from '../../services/geminiService';
import { addEvent, getProfile, updateVitals, getProfileEngineState, getProfileKey, updateProfileFeatureData } from '../../services/ProfileEngine';
import { recordHealthMemory, getHealthMemory } from '../../services/HealthMemory';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getActiveSession } from '../../services/authSession';
import { useToast } from '../../components/ui/ToastProvider';
import { canUseTrial, recordTrialUsage, openTrialModal } from '../../services/TrialEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { DiaryTimelineCard } from '../../components/ui/DiaryTimelineCard';
import { TriggerSensitivityCard } from '../../components/ui/TriggerSensitivityCard';
import { ConnectionTriggerCard } from '../../components/ui/ConnectionTriggerCard';
import { TriggerSensitivityModal, WholeHealthTab } from '../../components/ui/TriggerSensitivityModal';
import { WholeHealthRiverModal } from '../../components/ui/WholeHealthRiverModal';
import { QuickMealIntakeSheet } from '../../components/ui/QuickMealIntakeSheet';
import { ConnectionDetectiveModal } from '../../components/ui/ConnectionDetectiveModal';
import { SymptomSensitivityCapsuleCard } from '../../components/ui/SymptomSensitivityCapsuleCard';
import { evaluateEmergencyTriage, TriageEvaluation } from '../../services/clinicalTriageEngine';
import { EmergencyTriageModal } from '../../components/ui/EmergencyTriageModal';
import { getCase, getCases, addCaseEvent, addCaseQuestion, type CaseItem } from '../../services/CaseEngine';
import { buildCaseContext, getUnifiedCaseScope, getCaseDocumentedAnswers } from '../../services/caseWorkspace';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import { FeatureMissionHeader } from '../../components/ui/FeatureMissionHeader';
import '../../components/ui/caseWorkspace.css';

const QUICK_ACTION_PILLS = [
  {
    id: 'meal_log', label: 'Log a meal', icon: '🥣', bg: '#ECFDF5',
    color: '#047857', border: '#A7F3D0', action: 'meal',
  },
  {
    id: 'kinetic_chains',
    label: 'Back & Headache',
    icon: '🦴',
    bg: '#F0FDFA',
    color: '#0F766E',
    border: '#CCFBF1',
    prompt: 'Help me describe when my back discomfort or headache happens and what information to record for my clinician.',
  },
  {
    id: 'health_river',
    label: 'Whole Health River',
    icon: '🌊',
    bg: '#ECFDF5',
    color: '#047857',
    border: '#A7F3D0',
    action: 'river',
  },
  {
    id: 'log_day',
    label: 'Log your day',
    icon: '⚡',
    bg: '#CCFBF1',
    color: '#0F766E',
    border: '#99F6E4',
    prompt: 'Help me log my day. Ask me about my sleep, meals, energy, and any symptoms one question at a time.',
  },
  {
    id: 'food_detective',
    label: 'Food Detective',
    icon: '🔍',
    bg: '#F8FAFC',
    color: '#0F766E',
    border: '#E2E8F0',
    action: 'tab:detective',
  },
  {
    id: 'suspect_foods',
    label: 'Suspect triggers',
    icon: '⚠️',
    bg: '#FFF1F2',
    color: '#BE123C',
    border: '#FECDD3',
    action: 'tab:suspects',
  },
  {
    id: 'zen_garden',
    label: 'Zen Garden',
    icon: '🌸',
    bg: '#FDF4FF',
    color: '#C026D3',
    border: '#F5D0FE',
    action: 'tab:garden',
  },
  {
    id: 'diet_trials',
    label: 'Diet trials',
    icon: '🔬',
    bg: '#ECFDF5',
    color: '#059669',
    border: '#A7F3D0',
    action: 'tab:trials',
  },
  {
    id: 'doctor_export',
    label: 'Doctor export',
    icon: '📋',
    bg: '#EFF6FF',
    color: '#2563EB',
    border: '#BFDBFE',
    action: 'tab:doctor',
  },
  {
    id: 'food_triggers',
    label: 'Find food triggers',
    icon: '🔬',
    bg: '#FEF3C7',
    color: '#B45309',
    border: '#FDE68A',
    prompt: "What's been triggering my bloating and food sensitivities lately?",
  },
  {
    id: 'food_mood',
    label: 'Food, sleep & mood',
    icon: '💗',
    bg: '#FFE4E6',
    color: '#BE123C',
    border: '#FECDD3',
    prompt: 'Check in on my day: Track my food, sleep duration, and energy levels.',
  },
  {
    id: 'medication',
    label: 'Medication tracking',
    icon: '💊',
    bg: '#EDE9FE',
    color: '#6D28D9',
    border: '#DDD6FE',
    prompt: 'Could any of my active medications be reacting with foods I eat or causing gut symptoms?',
  },
  {
    id: 'mindfulness',
    label: 'Practice mindfulness',
    icon: '🍃',
    bg: '#DCFCE7',
    color: '#15803D',
    border: '#BBF7D0',
    action: 'mindfulness',
  },
];

const SUGGESTIONS = [
  "Help me organize what changed in my health and what I should ask at my next visit.",
  "I'm looking for mental peace and a calm space to de-stress.",
  "Are there any side effects to my new meds?",
  "I have a headache, is it related to my condition?",
  "Can we review my health plan?",
];

const TOOL_PURPOSES: Record<string, string> = {
  meal_log: 'Save a meal in your food diary',
  kinetic_chains: 'Describe discomfort and prepare questions',
  health_river: 'See your daily observations in time order',
  log_day: 'Capture sleep, meals, energy and symptoms',
  food_detective: 'Explore patterns in your food observations',
  suspect_foods: 'Review foods you want to investigate',
  zen_garden: 'Return to your garden and wellness activities',
  diet_trials: 'Follow and record a selected dietary plan',
  doctor_export: 'Prepare a summary to share at your visit',
  food_triggers: 'Talk through a food reaction with Ava',
  food_mood: 'Discuss how your day felt',
  medication: 'Discuss questions about your medicines',
  mindfulness: 'Start a guided relaxation session',
};

const CASE_RECHECK_SUGGESTIONS = [
  "Cross-correlate my symptoms: What connects my labs, notes, and vitals?",
  "Re-evaluate: What other alternative conditions could explain this?",
  "Could any of my active medications be causing or worsening this?",
  "Help me prepare the most important questions for my doctor.",
  "What information is missing, and what should I ask my clinician about it?",
  "Can you explain the underlying biological mechanism in simple terms?"
];

import { GlassBoxExplanation } from '../../components/ui/GlassBoxExplanation';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { FitnessContent } from '../../services/FitnessService';
import { getItemSync, setItemSync } from '../../services/storage';


const DEFAULT_CALM_TRACK: FitnessContent = {
  id: 'ava-calm-reset-1',
  category_id: 'mindfulness',
  is_active: true,
  type: 'breathwork',
  title: 'Autonomic 4-7-8 Calm Reset',
  subtitle: 'Parasympathetic Vagal Tone Activation',
  description: 'Evidence-based rhythmic breathwork specifically engineered to reduce acute adrenergic stress and settle cognitive overactivation.',
  cover_image_url: '/images/nature_calm.webp',
  audio_url: 'https://cdn.freesound.org/previews/518/518888_11504996-lq.mp3',
  video_url: '',
  duration_minutes: 5,
  calories_estimate: 15,
  difficulty: 'Beginner',
  equipment: [],
  is_premium: false,
  is_featured: true,
  music_genre: 'Ambient Tibetan Singing Bowl & Drone',
};

const getAvaVaultKey = () => {
  const state = getProfileEngineState();
  return getProfileKey().replace('hc_unified_profile', 'hc_ava_vault') + '_' + (state?.activeId || 'profile_1');
};

const INITIAL_MSG = {
  role: 'model',
  content:
    "Hi, I'm Ava. I can help you reflect on your day, understand your records, and prepare questions for your clinician. Connect a case to keep our conversation focused. What would you like help with?",
};

type AvaRequest = { messages: any[]; caseId: string; context: string; scope: string };

function getSavedMessages() {
  const profile = getProfile();
  if (profile && Array.isArray(profile.avaData) && profile.avaData.length > 0) return profile.avaData;
  try {
    const saved = getItemSync(getAvaVaultKey());
    const parsed = saved ? JSON.parse(saved) : null;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_MSG];
  } catch {
    return [INITIAL_MSG];
  }
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
        await new Promise(r => setTimeout(r, 10));
      }
      if (isMounted.current) {
        setDisplayed(content);
        onComplete();
      }
    };
    type();
    return () => { isMounted.current = false; };
  }, [content, messagesEndRef]);

  return <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}</span>;
};

export function cleanChatMessageText(text: string): string {
  if (!text) return '';
  let cleaned = text;
  // Strip any unparsed [WIDGET:...] tags
  cleaned = cleaned.replace(/\[WIDGET:[^\]]*\]/g, '');
  // Strip lines that start with }, or are raw JSON fragments like {"time":...
  cleaned = cleaned.replace(/^\s*\},?\s*$/gm, '');
  cleaned = cleaned.replace(/^\s*\{"time"[\s\S]*?\}(,\s*)?$/gm, '');
  cleaned = cleaned.replace(/^\s*\[\{"time"[\s\S]*?\]\s*$/gm, '');
  // Strip multi-line JSON key-value fragments containing "time": or "category": or "items":
  cleaned = cleaned.replace(/\{[^{}]*"time"\s*:\s*"[^"]*"[^{}]*\}/g, '');
  cleaned = cleaned.replace(/\{[^{}]*"category"\s*:\s*"[^"]*"[^{}]*\}/g, '');
  cleaned = cleaned.replace(/\{[^{}]*"items"\s*:\s*\[[^{}]*\]\}/g, '');
  // Strip dangling JSON brackets or commas left at the very start or end
  cleaned = cleaned.replace(/^[\s,}\]]+/, '');
  cleaned = cleaned.replace(/[\s,{\[]+$/, '');
  return cleaned.trim();
}

export function extractBalancedWidget(text: string, tag: string): { payload: any | null; before: string; after: string; found: boolean } {
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

  // Fallback: strip to the last bracket so raw JSON doesn't leak into view
  const lastBracket = text.lastIndexOf(']');
  if (lastBracket > startIdx) {
    return { payload: null, before, after: cleanChatMessageText(text.substring(lastBracket + 1)), found: true };
  }

  return { payload: null, before, after: '', found: true };
}

const MessageRenderer = ({
  content,
  onOpenCalm,
  onOpenWholeHealth,
}: {
  content: string;
  onOpenCalm?: () => void;
  onOpenWholeHealth?: () => void;
}) => {
  const handleStartCalm = () => {
    triggerHapticLight();
    if (onOpenCalm) {
      onOpenCalm();
    } else {
      window.dispatchEvent(new CustomEvent('hc_reopen_meditation'));
    }
  };

  // DIARY TIMELINE WIDGET (Triggerbites Diary Reference)
  if (content.includes('[WIDGET:DIARY_TIMELINE')) {
    const { payload, before, after } = extractBalancedWidget(content, 'DIARY_TIMELINE');
    const profile = getProfile();
    const recentLogs = profile?.nutrition?.recentLogs || [];
    const dynamicEntries = recentLogs.slice(-3).map((l: any, i: number) => ({
      time: l.loggedAt ? new Date(l.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${String(8 + i * 4).padStart(2, '0')}:00`,
      category: l.slot || 'Intake',
      items: l.tags && l.tags.length > 0 ? l.tags : [l.name || 'Logged Intake'],
    }));

    const parsed = payload && Array.isArray(payload.entries) && payload.entries.length > 0 ? payload : {
      title: 'Logged in your diary',
      date: 'Today',
      entries: dynamicEntries,
    };
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {before && <span>{before}</span>}
        <DiaryTimelineCard
          title={parsed.title}
          date={parsed.date}
          entries={parsed.entries}
        />
        {after && <span>{after}</span>}
      </div>
    );
  }

  // CONNECTION TRIGGER CARD WIDGET (Multi-System Kinetic & Clinical Connection)
  if (content.includes('[WIDGET:CONNECTION_TRIGGER_CARD')) {
    const { payload, before, after } = extractBalancedWidget(content, 'CONNECTION_TRIGGER_CARD');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {before && <span>{before}</span>}
        <ConnectionTriggerCard
          symptom={payload?.symptom}
          reactionWindow={payload?.reactionWindow}
          confidencePercent={payload?.confidencePercent}
          upstreamRootCause={payload?.upstreamRootCause}
          kineticPathway={payload?.kineticPathway}
          suspectVectors={payload?.suspectVectors}
          onOpenKineticMap={() => {
            window.dispatchEvent(new CustomEvent('hc_open_connection_detective_modal', { detail: { tab: 'map' } }));
          }}
        />
        {after && <span>{after}</span>}
      </div>
    );
  }

  // TRIGGER SENSITIVITY CARD WIDGET (Triggerbites Symptom Reference)
  if (content.includes('[WIDGET:TRIGGER_CARD')) {
    const { payload, before, after } = extractBalancedWidget(content, 'TRIGGER_CARD');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {before && <span>{before}</span>}
        <TriggerSensitivityCard
          symptom={payload?.symptom || 'Bloating'}
          reactionWindow={payload?.reactionWindow || 'within 1 day'}
          sensitivities={payload?.sensitivities}
          ingredients={payload?.ingredients}
          onOpenWholeHealth={onOpenWholeHealth}
        />
        {after && <span>{after}</span>}
      </div>
    );
  }

  // SYMPTOM SENSITIVITY CAPSULE CARD (TriggerBites Clinical Reference Pattern)
  if (content.includes('[WIDGET:SYMPTOM_SENSITIVITY_CAPSULE_CARD')) {
    const { payload, before, after } = extractBalancedWidget(content, 'SYMPTOM_SENSITIVITY_CAPSULE_CARD');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {before && <span>{before}</span>}
        <SymptomSensitivityCapsuleCard
          symptomName={payload?.symptomName}
          latencyWindow={payload?.latencyWindow}
          sensitivities={payload?.sensitivities}
          ingredients={payload?.ingredients}
          onOpenDetective={() => {
            window.dispatchEvent(new CustomEvent('hc_open_connection_detective_modal', { detail: { tab: 'matcher' } }));
          }}
        />
        {after && <span>{after}</span>}
      </div>
    );
  }

  if (content.includes('[WIDGET:CALM]') || content.includes('[WIDGET:BREATHWORK]')) {
    const splitKey = content.includes('[WIDGET:CALM]') ? '[WIDGET:CALM]' : '[WIDGET:BREATHWORK]';
    const parts = content.split(splitKey);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {parts[0] && <span>{parts[0]}</span>}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.95) 0%, rgba(13, 148, 136, 0.9) 100%)',
          borderRadius: '18px',
          padding: '18px',
          color: 'white',
          boxShadow: '0 12px 28px rgba(13, 148, 136, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#A7F3D0' }}>
            <Wind size={18} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              AUTONOMIC VAGAL TONE RESET
            </span>
          </div>
          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#FFFFFF' }}>
            4-7-8 Parasympathetic Calm Session
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#CCFBF1', lineHeight: 1.5 }}>
            Evidence-based rhythmic breathwork engineered to lower sympathetic overdrive, steady heart rate, and restore prefrontal clarity.
          </p>
          <button
            type="button"
            onClick={handleStartCalm}
            style={{
              marginTop: '8px',
              background: '#FFFFFF',
              color: '#0F766E',
              border: 'none',
              padding: '12px 20px',
              minHeight: '44px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
          >
            <Play size={16} fill="#0F766E" /> Begin 5-Min Calm Reset
          </button>
        </div>
        {parts[1] && <span>{parts[1]}</span>}
      </div>
    );
  }

  if (content.includes('[WIDGET:WORKOUT]') || content.includes('[WIDGET:SOMATIC]')) {
    const delimiter = content.includes('[WIDGET:SOMATIC]') ? '[WIDGET:SOMATIC]' : '[WIDGET:WORKOUT]';
    const parts = content.split(delimiter);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {parts[0] && <span>{parts[0]}</span>}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%)',
          borderRadius: '18px',
          padding: '18px',
          color: 'white',
          boxShadow: '0 12px 28px rgba(0,0,0,0.2)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#34D399' }}>
            <Activity size={18} />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              RESTORATIVE SOMATIC RESET
            </span>
          </div>
          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
            Gentle Autonomic Decompression
          </h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#94A3B8', lineHeight: 1.5 }}>
            Restorative nervous system reset with somatic breath regulation.
          </p>
          <button
            type="button"
            onClick={handleStartCalm}
            style={{
              marginTop: '6px',
              background: '#10B981',
              color: '#0F172A',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Play size={16} fill="#0F172A" /> Start Restorative Session
          </button>
        </div>
        {parts[1] && <span>{parts[1]}</span>}
      </div>
    );
  }

  return <span>{content}</span>;
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
    const observationKeywords = /(symptom|pain|bloat|headache|fatigue|ate|eat|meal|felt|noticed|started|flare|stomach|gut|reaction|woke up|sleep|took|medicine|dose|bp|blood pressure|pulse|ache|nausea|cramp|energy|stool|trigger|muscle|twitch|rash|fever|dizzy|weak|joint|experienced|feeling)/i;
    if (observationKeywords.test(cleanUser) || observationKeywords.test(cleanModel)) {
      canSaveObservation = true;
      observationDraft = cleanUser.slice(0, 280);
    }
  }

  // 2. Question Detection:
  let canAddQuestion = false;
  let questionDraft = '';
  const questionMatches = cleanModel.match(/(?:Ask your (?:doctor|physician|care team|provider)|Questions? for your (?:clinician|doctor|provider|care team)|You might ask|Consider asking)[^\n:]*[:?-]?\s*(?:[-*•\d.]\s*)?([^\r\n?]+[?])/i);
  if (questionMatches && questionMatches[1]) {
    canAddQuestion = true;
    questionDraft = questionMatches[1].trim();
  } else {
    const lines = cleanModel.split('\n');
    const qLine = lines.find(l => l.includes('?') && l.length > 12 && l.length < 200 && !/^(how are you|anything else|what do you think)/i.test(l.trim()));
    if (qLine) {
      canAddQuestion = true;
      questionDraft = qLine.replace(/^[-*•\d.]\s*/, '').trim();
    }
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
  msgIndex: number;
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
      hasRecords: Boolean(selectedCase && selectedCase.medicalRecords && selectedCase.medicalRecords.length > 0),
      hasStudy: Boolean(activeSourceStudy),
      hasReview: Boolean(selectedCase && (selectedCase.currentSummary || (selectedCase.events && selectedCase.events.some(e => e.label?.includes('Review'))))),
    });
  }, [modelContent, userContent, selectedCase, activeSourceStudy]);

  const obsSavedKey = `obs_${msgIndex}`;
  const qSavedKey = `q_${msgIndex}`;
  const isObsSaved = savedActionIds.has(obsSavedKey);
  const isQSaved = savedActionIds.has(qSavedKey);

  if (!suggestions.canSaveObservation && !suggestions.canAddQuestion && !suggestions.canExplainSource && !suggestions.canOpenReview) {
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
      <span style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>
        Next Actions:
      </span>

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

        <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                <strong style={{ fontSize: '14px', color: !selectedCaseId ? '#0F766E' : '#1E293B', display: 'block' }}>
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
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: '6px', marginBottom: '2px' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: isSelected ? 'linear-gradient(135deg, #0D9488, #0F766E)' : '#F1F5F9',
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
                      <strong style={{ fontSize: '14px', color: isSelected ? '#0F766E' : '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.title}
                      </strong>
                      <span style={{ fontSize: '10px', fontWeight: 700, background: '#CCFBF1', color: '#0F766E', padding: '1px 6px', borderRadius: '6px' }}>
                        {c.status || 'Active'}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
  onConfirm: (text: string, targetCaseId: string, specialty?: string) => void;
}) => {
  const [targetCaseId, setTargetCaseId] = useState(() => activeCaseId || (availableCases[0]?.id || ''));
  const [text, setText] = useState(initialText);
  const [specialty, setSpecialty] = useState('General');

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    if (activeCaseId) setTargetCaseId(activeCaseId);
    else if (availableCases.length > 0 && !targetCaseId) setTargetCaseId(availableCases[0].id);
  }, [activeCaseId, availableCases]);

  if (!isOpen) return null;

  const targetCase = availableCases.find(c => c.id === targetCaseId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={type === 'observation' ? 'Save Observation to Case' : 'Add Appointment Question'}
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

        <div style={{ padding: '20px 22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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

            <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Target Section:</span>
              <strong style={{ color: '#0F172A' }}>
                {type === 'observation' ? 'Case Timeline (Timeline Events)' : 'Doctor Visit Brief (Open Questions)'}
              </strong>
            </div>
          </div>

          {type === 'question' && (
            <div>
              <label htmlFor="ava-task-specialty-select" style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
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
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {type === 'observation' ? 'Observation Note (Patient-Reported):' : 'Question for Doctor:'}
            </label>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={type === 'observation' ? 'Describe the symptom, event, or reaction...' : 'Type your question...'}
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
            disabled={!text.trim() || !targetCaseId}
            onClick={() => {
              if (text.trim() && targetCaseId) {
                onConfirm(text.trim(), targetCaseId, specialty);
              }
            }}
            style={{
              padding: '9px 20px',
              borderRadius: '10px',
              border: 'none',
              background: (!text.trim() || !targetCaseId) ? '#94A3B8' : 'linear-gradient(135deg, #0D9488, #0F766E)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: (!text.trim() || !targetCaseId) ? 'not-allowed' : 'pointer',
              boxShadow: (!text.trim() || !targetCaseId) ? 'none' : '0 4px 12px rgba(13, 148, 136, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Check size={16} /> Confirm & Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AvaHealthBuddy() {
  const isMobile = useIsMobile();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionId = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).current;
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
  const [activeMeditation, setActiveMeditation] = useState<FitnessContent | null>(null);
  const lastMeditationRef = useRef<FitnessContent | null>(null);

  useEffect(() => {
    if (activeMeditation) {
      lastMeditationRef.current = activeMeditation;
    }
  }, [activeMeditation]);

  useEffect(() => {
    const handleReopen = (e?: any) => {
      setActiveMeditation(e?.detail || lastMeditationRef.current || DEFAULT_CALM_TRACK);
    };
    window.addEventListener('hc_reopen_meditation', handleReopen);
    return () => window.removeEventListener('hc_reopen_meditation', handleReopen);
  }, []);
  const getDraftStorageKey = (scope: string, cId: string) => `hc_ava_draft_${scope}_${cId || 'general'}`;

  const incomingPrompt = location.state?.initialPrompt || location.state?.initialMessage;
  const initialCaseIdParam = new URLSearchParams(location.search).get('caseId') || new URLSearchParams(location.search).get('importCase') || location.state?.caseId || '';
  const [input, setInput] = useState(() => { 
    try { 
      if (incomingPrompt) return incomingPrompt;
      const scope = getAvaVaultKey();
      return localStorage.getItem(getDraftStorageKey(scope, initialCaseIdParam)) || sessionStorage.getItem(`${scope}_draft`) || '';
    } catch { 
      return ''; 
    } 
  });
  useEffect(() => {
    if (incomingPrompt) {
      setInput(incomingPrompt);
    }
  }, [incomingPrompt]);
  const studyIdParam = new URLSearchParams(location.search).get('studyId') || new URLSearchParams(location.search).get('study');
  const incomingStudy = location.state?.sourceStudy || (() => {
    if (studyIdParam) {
      try {
        const stored = sessionStorage.getItem(`hc_study_${studyIdParam}`);
        if (stored) return JSON.parse(stored);
        const savedTrials = getItemSync('hc_saved_trials');
        if (savedTrials) {
          const parsed = JSON.parse(savedTrials);
          if (parsed[studyIdParam]) return { nctId: studyIdParam, title: `Study ${studyIdParam}` };
        }
      } catch {}
      return { nctId: studyIdParam, title: `Clinical Study ${studyIdParam}` };
    }
    try {
      const activeStored = sessionStorage.getItem('hc_active_source_study');
      if (activeStored) return JSON.parse(activeStored);
    } catch {}
    return null;
  })();
  const [activeSourceStudy, setActiveSourceStudy] = useState<any>(() => incomingStudy);
  useEffect(() => {
    if (incomingStudy) {
      setActiveSourceStudy(incomingStudy);
      if (incomingStudy.nctId) {
        try {
          sessionStorage.setItem(`hc_study_${incomingStudy.nctId}`, JSON.stringify(incomingStudy));
        } catch {}
      }
    }
  }, [incomingStudy]);
  const [attachments, setAttachments] = useState<{name: string, data: string}[]>([]);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const attachmentBusyRef = useRef(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWholeHealthOpen, setIsWholeHealthOpen] = useState(false);
  const [wholeHealthTab, setWholeHealthTab] = useState<WholeHealthTab>('picture');
  const [isRiverOpen, setIsRiverOpen] = useState(false);
  const [isQuickMealOpen, setIsQuickMealOpen] = useState(false);
  const [isDetectiveOpen, setIsDetectiveOpen] = useState(false);
  const [detectiveTab, setDetectiveTab] = useState<string>('map');
  useEffect(() => { if (new URLSearchParams(location.search).get('tool') === 'connection-detective') setIsDetectiveOpen(true); }, [location.search]);
  const [emergencyTriage, setEmergencyTriage] = useState<TriageEvaluation | null>(null);
  const [showContextModal, setShowContextModal] = useState(false);

  // Promise 5: Semantic Relevance Retrieval & Context Accounting
  const memoryContext = useMemo(() => {
    const allMemories = getHealthMemory() || [];
    const prof = getProfile() || {};
    const logs = prof?.nutrition?.recentLogs || [];
    const vitals = prof?.vitals || {};
    
    const totalRecords = allMemories.length + logs.length + (vitals.bloodPressure ? 1 : 0) + (vitals.restingHeartRate ? 1 : 0);
    
    const relevantMemories = allMemories.slice(0, 5);
    const relevantLogs = logs.slice(-2);
    
    const includedItems = [
      ...relevantMemories.map(m => ({
        type: 'Clinical Memory',
        title: m.title,
        time: m.occurredAt ? new Date(m.occurredAt).toLocaleDateString() : 'Recent',
        source: m.source || 'Timeline'
      })),
      ...relevantLogs.map(l => ({
        type: 'Food / Intake Log',
        title: l.name || (l.tags && l.tags.join(', ')) || 'Meal entry',
        time: l.loggedAt ? new Date(l.loggedAt).toLocaleDateString() : 'Today',
        source: 'Nutrition Diary'
      }))
    ];
    
    const evaluatedCount = Math.max(totalRecords, includedItems.length);
    const omittedCount = Math.max(0, evaluatedCount - includedItems.length);

    return {
      evaluatedCount,
      omittedCount,
      includedItems,
    };
  }, [messages.length]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpenDetective = (e?: any) => {
      setDetectiveTab(e?.detail?.tab || 'map');
      setIsDetectiveOpen(true);
    };
    window.addEventListener('hc_open_connection_detective_modal', handleOpenDetective);
    return () => window.removeEventListener('hc_open_connection_detective_modal', handleOpenDetective);
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
    const paramId = new URLSearchParams(location.search).get('caseId') || new URLSearchParams(location.search).get('importCase') || location.state?.caseId;
    if (paramId) {
      const scope = getUnifiedCaseScope(paramId);
      return scope.isRequestedCaseMissing ? '' : (scope.caseId || '');
    }
    const scope = getUnifiedCaseScope();
    return scope.caseId || '';
  });
  const selectedCase = availableCases.find(item => item.id === selectedCaseId);
  const documentedAnswers = useMemo(() => selectedCase ? getCaseDocumentedAnswers(selectedCase) : [], [selectedCase]);
  const [savedUpdate, setSavedUpdate] = useState<{ caseId: string; title: string } | null>(null);
  const saveUpdateBusy = useRef(false);
  const [isCaseSelectorOpen, setIsCaseSelectorOpen] = useState(false);
  const [saveModalState, setSaveModalState] = useState<{
    isOpen: boolean;
    type: 'observation' | 'question';
    initialText: string;
    caseId: string;
    specialty?: string;
    msgIndex?: number;
  } | null>(null);
  const [savedActionIds, setSavedActionIds] = useState<Set<string>>(() => new Set());
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
        sessionStorage.setItem(`${scope}_draft`, input);
      } else {
        localStorage.removeItem(draftKey);
        sessionStorage.removeItem(`${scope}_draft`);
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

  const handleConfirmSave = (confirmedText: string, targetCaseId: string, specialty?: string) => {
    if (!confirmedText.trim() || !targetCaseId) return;
    try {
      const targetCase = getCase(targetCaseId);
      if (!targetCase) throw new Error('Target case unavailable');

      if (saveModalState?.type === 'observation') {
        addCaseEvent(targetCaseId, confirmedText.trim(), 'Patient observation (Ava conversation)');
        setSavedUpdate({ caseId: targetCaseId, title: targetCase.title });
        toast.success('Observation Saved', `Added to case timeline for "${targetCase.title}".`);
        triggerHapticSuccess();
        if (saveModalState.msgIndex !== undefined) {
          setSavedActionIds(prev => new Set([...prev, `obs_${saveModalState.msgIndex}`]));
        }
      } else {
        addCaseQuestion(targetCaseId, {
          questionText: confirmedText.trim(),
          raisedBySpecialty: specialty || 'General',
          supportingEvidenceIds: [],
          status: 'open',
        });
        setSavedUpdate({ caseId: targetCaseId, title: targetCase.title });
        toast.success('Question Added', `Added to doctor visit brief for "${targetCase.title}".`);
        triggerHapticSuccess();
        if (saveModalState?.msgIndex !== undefined) {
          setSavedActionIds(prev => new Set([...prev, `q_${saveModalState.msgIndex}`]));
        }
      }
    } catch (e: any) {
      toast.error('Save failed', e?.message || 'Could not save to case.');
    } finally {
      setSaveModalState(null);
    }
  };

  useEffect(() => { setSavedUpdate(null); if (activeSourceStudy?.caseId && activeSourceStudy.caseId !== selectedCaseId) setActiveSourceStudy(null); }, [selectedCaseId]);
  const saveDraftToCase = () => {
    if (!selectedCase || !input.trim() || saveUpdateBusy.current) return;
    saveUpdateBusy.current = true;
    try {
      if (!getCase(selectedCase.id)) throw new Error('Case unavailable');
      addCaseEvent(selectedCase.id, input.trim(), 'Personal update from Ava');
      setSavedUpdate({ caseId: selectedCase.id, title: selectedCase.title });
      toast.success('Update Saved to Case', `Saved to case timeline for "${selectedCase.title || 'Active Case'}".`);
      triggerHapticSuccess();
      setInput('');
    } catch {
      toast.error('Update not saved', 'Your draft is still here. Please try again.');
    } finally {
      saveUpdateBusy.current = false;
    }
  };
  const importedCase = selectedCase ? { caseId: selectedCase.id, title: selectedCase.title, type: 'Saved case', topConditions: '' } : null;
  const setImportedCase = () => handleSelectCase('');
  const [sendError, setSendError] = useState(false);
  const lastRequestRef = useRef<AvaRequest | null>(null);
  const sendingRef = useRef(false);
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
      setSelectedCaseId(getUnifiedCaseScope().caseId || '');
    }
  }, [location.search, location.state?.caseId]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      if (!input) {
        textareaRef.current.style.height = isMobile ? '44px' : '48px';
      } else {
        textareaRef.current.style.height = 'auto';
        const nextHeight = Math.min(Math.max(textareaRef.current.scrollHeight, isMobile ? 44 : 48), 120);
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

  useEffect(() => {
    try {
      const sanitized = messages.map(m => { const { isStreaming, ...rest } = m; return rest; });
      updateProfileFeatureData('avaData', sanitized);
      setItemSync(getAvaVaultKey(), JSON.stringify(sanitized));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        const keepCount = Math.floor(messages.length * 0.8);
        const newMsgs = [messages[0], ...messages.slice(messages.length - keepCount)];
        const sanitized = newMsgs.map(m => { const { isStreaming, ...rest } = m; return rest; });
        try {
          updateProfileFeatureData('avaData', sanitized);
          setItemSync(getAvaVaultKey(), JSON.stringify(sanitized));
        } catch (e2) {}
      }
    }
  }, [messages]);

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
      
      if (isNearBottom || isTyping) {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    }
  }, [messages.length, isTyping]); // Only run on length change or typing status change

  const chatMutation = useMutation({
    mutationFn: (request: AvaRequest) => chatWithTherapyGemini(request.messages.filter(message => (message.caseId || '') === request.caseId), request.context),
    onMutate: () => { setIsTyping(true); setSendError(false); },
    // We handle setIsTyping manually in onSuccess to transition from thinking to typing
    onSuccess: async (response: any, request: AvaRequest) => {
        if (!isMounted.current || request.scope !== getAvaVaultKey() || (request.caseId && request.caseId !== selectedCaseIdRef.current)) return;
        const newMessages = request.messages;
        setIsTyping(false);
        const hasWidget = response && response.includes('[WIDGET:');
        setIsStreaming(!hasWidget);
        const finalMessages = [...newMessages, { role: 'model', content: response, isStreaming: !hasWidget, caseId: request.caseId }];
        
        if (finalMessages.length >= 10) {
          extractClinicalMemory(finalMessages).then((facts) => {
            if (request.scope === getAvaVaultKey() && Array.isArray(facts) && facts.length > 0) {
              facts.forEach((fact: string) => {
                recordHealthMemory({
                  kind: 'health_buddy',
                  source: 'health_buddy',
                  title: fact,
                  occurredAt: new Date().toISOString(),
                  payload: { extractedFact: fact },
                  dedupeKey: fact.toLowerCase().substring(0, 50)
                });
              });
            }
          });
          setMessages([finalMessages[0], ...finalMessages.slice(-20)]);
        } else {
          setMessages(finalMessages);
        }

        addEvent('mental_health', 'health_buddy', 'Ava Health Buddy Session', {
            lastMessage: response,
            messageCount: newMessages.length + 1,
        }, false, null as any, sessionId as any);
        const todayDateStr = new Date().toISOString().split('T')[0];
        awardPoints(5, 'Consulted Ava Clinical Chief of Staff', 'consult', `ava_consult_${todayDateStr}`);
        recordTrialUsage('ava');
      },
    onError: (_error, request) => {
      if (!isMounted.current || request.scope !== getAvaVaultKey() || (request.caseId && request.caseId !== selectedCaseIdRef.current)) return;
      setIsTyping(false);
      setIsStreaming(false);
      setSendError(true);
      if (lastFailedDraftRef.current) {
        setFailedDraft(lastFailedDraftRef.current);
      }
    },
    onSettled: () => { sendingRef.current = false; },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || attachmentBusyRef.current) return;
    e.target.value = '';
    if (attachments.length >= 3 || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Attachment unavailable', 'Attach up to three PDF, JPG, PNG, or WebP files.');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("File Too Large", "Maximum file size is 3MB.");
      return;
    }
    if (file.size === 0) {
      toast.error("Invalid File", "The uploaded file is empty (0 bytes).");
      return;
    }
    if (file.type.includes('heic') || file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      toast.error("Format Not Supported", "HEIC/HEIF images from Apple devices are not supported. Please export as JPG.");
      return;
    }

    
    if (file.size > 4 * 1024 * 1024) {
      toast.error("File Too Large", "Please select an image or document under 4MB. Large camera photos should be compressed.");
      return;
    }
    
    const attachmentScope = getAvaVaultKey();
    attachmentBusyRef.current = true;
    setIsProcessingAttachment(true);
    const reader = new FileReader();
    reader.onerror = () => {
      attachmentBusyRef.current = false;
      setIsProcessingAttachment(false);
      toast.error("Upload Error", "Failed to read the file. Please try another.");
    };
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const cleanBase64 = base64Data?.split(',')[1] || '';
      const attachmentItem: { name: string; data: string; findings?: string } = { name: file.name, data: base64Data };

      // Pre-extract document findings so Ava understands exact lab values
      try {
        const profile = getProfile() || {};
        const parsed = await analyzeLabReport(cleanBase64, file.type, profile);
        if (parsed?.keyFindings) {
          attachmentItem.findings = `Test: ${parsed.testName || 'Lab/Image Report'} | Key Findings: ${parsed.keyFindings}${parsed.interpretation ? ' | Interpretation: ' + parsed.interpretation : ''}`;
        }
      } catch (e) {
        toast.error('Document could not be read', 'Try another copy, or paste the relevant text into your message.');
      }
      attachmentBusyRef.current = false;
      if (!isMounted.current) return;
      setIsProcessingAttachment(false);
      if (attachmentScope !== getAvaVaultKey()) return;
      if (attachmentItem.findings) setAttachments(prev => [...prev, attachmentItem]);
      else toast.error('No readable findings', 'Paste the relevant text or try a clearer report.');
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || sendingRef.current || isTyping || isStreaming || attachmentBusyRef.current || (selectedCaseId && (!selectedCase || selectedCase.intakeData?.scenarioId))) return;
    const triage = evaluateEmergencyTriage(text);
    if (triage.isEmergency) {
      setEmergencyTriage(triage);
      return;
    }

    sendingRef.current = true;
    const messageScope = getAvaVaultKey();
    const session = await getActiveSession();
    if (!isMounted.current || messageScope !== getAvaVaultKey()) { sendingRef.current = false; return; }
    if (!session) {
      const errorCount = messages.filter((m: any) => m.role === 'model' && m.content && m.content.includes("trouble connecting")).length;
      const userMessageCount = messages.filter((m: any) => m.role === 'user').length - errorCount;
        if (userMessageCount >= 5) {
          sendingRef.current = false;
          window.dispatchEvent(new CustomEvent('hc_require_auth', { 
            detail: { 
            title: 'Guest Limit Reached', 
            message: 'You have reached the guest limit of 5 messages. Please log in or sign up to continue chatting with Ava.' 
            } 
          }));
          return;
        }
    }

    if (!canUseTrial('ava')) {
      sendingRef.current = false;
      openTrialModal('Ava Health Buddy (10 Free Trial Replies)');
      return;
    }

    if ((!text.trim() && attachments.length === 0) || isTyping || isStreaming) { sendingRef.current = false; return; }

    let finalContent = text.trim();
    if (attachments.length > 0) {
      const attachStr = attachments.map((a: any) => {
        return a.findings
          ? `[Attached Document: ${a.name}\n${a.findings}]`
          : `[Attached Document: ${a.name}]`;
      }).join('\n\n');
      finalContent = finalContent ? `${finalContent}\n\n${attachStr}` : attachStr;
    }

    const newMessages = [...messages, { role: 'user', content: finalContent, caseId: selectedCaseId, attachments: attachments.map((a: any) => a.name) }];
    sendingRef.current = true;
    const contextCase = selectedCaseId ? getCase(selectedCaseId) : undefined;
    const baseCaseContext = contextCase ? buildCaseContext(contextCase) : '';

    // Order 6: Inject explicit documented answers from case records so Ava NEVER asks the patient to repeat them
    const documentedSnippet = documentedAnswers.length > 0
      ? `\n\n[ALREADY DOCUMENTED IN CASE RECORDS — STRICT CLINICAL INSTRUCTION: DO NOT RE-ASK THE PATIENT ABOUT ANY OF THESE TOPICS. TREAT THEM AS KNOWN ESTABLISHED FACTS]:\n` +
        documentedAnswers.map(a => `- ${a.topic}: "${a.value}" (Source: ${a.source})`).join('\n')
      : '';

    // Order 8: Research content handoff — inject full study abstract and criteria breakdown so Ava summarizes the retrieved source, not merely its title
    const studySnippet = activeSourceStudy
      ? `\n\n[RETRIEVED RESEARCH SOURCE STUDY TO SUMMARIZE]:\nTitle: "${activeSourceStudy.title || activeSourceStudy.briefTitle}"\nNCT ID: ${activeSourceStudy.nctId}\nPhase: ${activeSourceStudy.phase || 'N/A'}\nTarget Conditions: ${(activeSourceStudy.conditions || []).join(', ')}\nMatch Evaluation: ${activeSourceStudy.matchStatus}\nEligibility & Criteria Breakdown:\n- Age Criteria: ${JSON.stringify(activeSourceStudy.criteriaBreakdown?.ageCriteria || null)}\n- Gender Criteria: ${JSON.stringify(activeSourceStudy.criteriaBreakdown?.genderCriteria || null)}\n- Condition Match: ${JSON.stringify(activeSourceStudy.criteriaBreakdown?.conditionMatch || null)}\n- Clinical Note: ${activeSourceStudy.criteriaBreakdown?.overallNote || ''}\nAbstract / Objectives:\n${activeSourceStudy.abstract || 'No abstract provided'}\n\n[CRITICAL INSTRUCTION FOR AVA]: The patient is discussing this retrieved clinical research study. You must summarize the actual scientific objectives and findings of this study in compassionate, clear language. Highlight why it matches or differs from their profile, and prepare 2-3 specific questions for them to discuss with their clinician.`
      : '';
    
    // Promise 5: Inject semantic memory context so user never repeats their story
    const memorySnippet = memoryContext.includedItems.length > 0
      ? `\n\n[RELEVANT PATIENT HISTORY & MEMORIES (Do not ask patient to repeat these)]:\n` +
        memoryContext.includedItems.map(item => `- [${item.time}] (${item.type}) ${item.title}`).join('\n')
      : '';
    const finalContext = `${baseCaseContext}${documentedSnippet}${studySnippet}${memorySnippet}`.trim();

    const request = { messages: newMessages, caseId: selectedCaseId, context: finalContext, scope: messageScope };
    lastRequestRef.current = request;
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
        position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
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
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.48) 0%, rgba(255, 255, 255, 0.14) 100%)',
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
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.35)',
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
                  Ava Pro <span style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 }}>Plus</span>
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
                  MEDICAL CHIEF OF STAFF
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
                  background: selectedCase ? 'rgba(13, 148, 136, 0.12)' : 'rgba(241, 245, 249, 0.9)',
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
                <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  color: '#E11D48',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.08)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <Activity size={14} color="#E11D48" /> Whole Health
              </button>
            </div>
          </div>
        )}

        {/* Chat Area */}
        <div
          ref={chatContainerRef}
            onScroll={(e) => window.dispatchEvent(new CustomEvent('hc_scroll_intent', { detail: { scrollTop: e.currentTarget.scrollTop } }))}
          style={{
            flex: 1, minHeight: 0, overflowY: 'auto',
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
            <FeatureMissionHeader featureId="ava" activeCaseId={selectedCaseId || importedCase?.caseId} />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '-4px 0 4px 0',
              }}
            >
              <button
                type="button"
                aria-label="Active case workspace pill"
                onClick={() => {
                  triggerHapticLight();
                  setIsCaseSelectorOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: selectedCase ? 'rgba(13, 148, 136, 0.1)' : 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: selectedCase ? '1.5px solid #99F6E4' : '1px solid #E2E8F0',
                  color: selectedCase ? '#0F766E' : '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(13, 148, 136, 0.06)',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{selectedCase ? '📁' : '🌐'}</span>
                <span>
                  {selectedCase ? `Active Case: ${selectedCase.title}` : 'General Consultation (Tap to link case)'}
                </span>
                <ChevronDown size={13} />
              </button>
            </div>

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
                    <strong>Case Not Found:</strong> Case &quot;{missingCaseNotice}&quot; was not found in your records. Continuing in general consultation mode.
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
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#0D9488', color: '#FFF', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#0D9488', textTransform: 'uppercase', letterSpacing: 0.6 }}>Connected Case In Session</span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, background: 'rgba(13,148,136,0.15)', color: '#0F766E', padding: '1px 7px', borderRadius: 999 }}>{importedCase.type || 'Consultation'}</span>
                    </div>
                    <strong style={{ fontSize: 14.5, color: '#115E59', display: 'block', lineHeight: 1.3 }}>{importedCase.title}</strong>
                    {importedCase.topConditions && (
                      <span style={{ fontSize: 12, color: '#0F766E', display: 'block', marginTop: 2 }}>
                        Differentials: {importedCase.topConditions}
                      </span>
                    )}
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
                        cursor: 'pointer'
                      }}
                    >
                      View Case File
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setImportedCase();
                      try { sessionStorage.removeItem('hc_imported_case_brief'); } catch(e){}
                    }}
                    aria-label="Close imported case context"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0D9488',
                      cursor: 'pointer',
                      padding: 6,
                      display: 'grid',
                      placeItems: 'center'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Promise 5: Context Disclosure Pill */}
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
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)')}
              >
                <span style={{ fontSize: '13px' }}>🧠</span>
                <span>
                  Evaluated {memoryContext.evaluatedCount} records & memories • {memoryContext.omittedCount} background items omitted for relevance
                </span>
                <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '2px' }}>ℹ️</span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
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
                        boxShadow: '0 4px 12px rgba(244, 63, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
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
                      background: msg.role === 'user'
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
                      boxShadow: msg.role === 'user' 
                        ? '0 10px 28px rgba(225, 29, 72, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)' 
                        : '0 8px 24px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                      border: msg.role === 'user' ? '1px solid rgba(255, 255, 255, 0.25)' : '1.5px solid #CCFBF1',
                      maxWidth: isMobile ? '88%' : '80%',
                    }}
                  >
                    {msg.caseId && <small style={{ display: 'block', marginBottom: 8, fontWeight: 700 }}>Case: {availableCases.find(item => item.id === msg.caseId)?.title || 'Previous case'}</small>}
                    {msg.isStreaming ? (
                      <TypewriterText 
                        content={msg.content} 
                        messagesEndRef={messagesEndRef}
                        onComplete={() => {
                          setIsStreaming(false);
                          setMessages(prev => {
                            const updated = [...prev];
                            const idx = updated.findIndex(m => m === msg);
                            if (idx !== -1) {
                              updated[idx] = { ...msg, isStreaming: false };
                            }
                            return updated;
                          });
                        }} 
                      />
                    ) : (
                      msg.content ? (
                        <>
                          <MessageRenderer
                            content={msg.content}
                            onOpenCalm={() => setActiveMeditation(DEFAULT_CALM_TRACK)}
                            onOpenWholeHealth={() => setIsWholeHealthOpen(true)}
                          />
                          {msg.role === 'model' && msg.content.length > 50 && <GlassBoxExplanation />}
                          {msg.role === 'model' && documentedAnswers.length > 0 && (() => {
                            const matched = documentedAnswers.filter(ans => {
                              const topicWords = ans.topic.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                              const valWords = ans.value.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                              const lowerContent = msg.content.toLowerCase();
                              return topicWords.some(tw => lowerContent.includes(tw)) || 
                                     (valWords.length > 0 && valWords.some(vw => lowerContent.includes(vw)));
                            });
                            if (matched.length === 0) return null;
                            const item = matched[0];
                            return (
                              <div 
                                style={{
                                  marginTop: '10px',
                                  padding: '7px 11px',
                                  borderRadius: '8px',
                                  background: '#F0FDF4',
                                  border: '1px solid #BBF7D0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '11.5px',
                                  color: '#166534',
                                  fontWeight: 600,
                                }}
                              >
                                <span>✅ Already documented in case records:</span>
                                <span style={{ fontWeight: 700, color: '#14532D' }}>
                                  {item.topic} ({item.value.slice(0, 45)}{item.value.length > 45 ? '...' : ''})
                                </span>
                              </div>
                            );
                          })()}
                          {msg.role === 'model' && /(mental peace|calm space|de-stress|relax|anxiety|breathe|breathing|4-7-8|meditat|insomnia)/i.test(msg.content) && (
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                marginTop: '14px',
                                background: 'linear-gradient(135deg, rgba(240, 253, 250, 0.95) 0%, rgba(204, 251, 241, 0.75) 100%)',
                                border: '1px solid #99F6E4',
                                borderRadius: '16px',
                                padding: '14px 16px',
                                boxShadow: '0 8px 20px rgba(13, 148, 136, 0.12)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#FFF',
                                  boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)',
                                  flexShrink: 0
                                }}>
                                  <Sparkles size={18} />
                                </div>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0D9488', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                    Recommended Clinical Protocol
                                  </div>
                                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>
                                    Autonomic 4-7-8 Calm Reset
                                  </div>
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.4 }}>
                                Vagal nerve stimulation to rapidly down-regulate sympathetic fight-or-flight arousal in 5 minutes.
                              </p>
                              <button
                                onClick={() => {
                                  triggerHapticLight();
                                  setActiveMeditation(DEFAULT_CALM_TRACK);
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                                  color: '#FFF',
                                  border: 'none',
                                  borderRadius: '12px',
                                  padding: '10px 16px',
                                  fontSize: '13.5px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '8px',
                                  cursor: 'pointer',
                                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                                }}
                              >
                                <Play size={15} fill="#FFF" /> Begin Calm Session Now
                              </button>
                            </motion.div>
                          )}
                          {msg.role === 'model' && (
                            <AvaActionToolbar
                              msgIndex={idx}
                              modelContent={msg.content}
                              userContent={messages[idx - 1]?.role === 'user' ? messages[idx - 1].content : undefined}
                              selectedCase={selectedCase}
                              activeSourceStudy={activeSourceStudy}
                              savedActionIds={savedActionIds}
                              onSaveObservation={(draft) => {
                                setSaveModalState({
                                  isOpen: true,
                                  type: 'observation',
                                  initialText: draft || (messages[idx - 1]?.role === 'user' ? messages[idx - 1].content : 'Patient observation'),
                                  caseId: selectedCaseId || (availableCases[0]?.id || ''),
                                  msgIndex: idx,
                                });
                              }}
                              onAddQuestion={(draft) => {
                                setSaveModalState({
                                  isOpen: true,
                                  type: 'question',
                                  initialText: draft || 'What are the recommended next steps for my doctor visit?',
                                  caseId: selectedCaseId || (availableCases[0]?.id || ''),
                                  msgIndex: idx,
                                });
                              }}
                              onExplainSource={() => {
                                if (activeSourceStudy) {
                                  setInput(`Can you explain the clinical objectives, findings, and patient relevance of study ${activeSourceStudy.nctId} (${activeSourceStudy.title || activeSourceStudy.briefTitle}) in simple terms?`);
                                } else if (selectedCase?.medicalRecords && selectedCase.medicalRecords.length > 0) {
                                  const rec = selectedCase.medicalRecords[0];
                                  setInput(`Can you explain the clinical significance and key findings of my uploaded record '${rec.filename}'?`);
                                }
                                textareaRef.current?.focus();
                              }}
                              onOpenReview={() => {
                                if (selectedCase) {
                                  navigate(`/app/jarvis?caseId=${encodeURIComponent(selectedCase.id)}`);
                                }
                              }}
                            />
                          )}
                        </>
                      ) : <span style={{ opacity: 0.5 }}>...</span>
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
                    boxShadow: '0 4px 12px rgba(244, 63, 94, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
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
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.18) 100%)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    padding: isMobile ? '12px 16px' : '16px',
                    borderRadius: '20px 20px 20px 4px',
                    border: '1px solid rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.75), inset 0 0 30px rgba(255, 255, 255, 0.35)',
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
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.2) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.85)',
                      color: importedCase ? '#0D9488' : '#BE123C',
                      padding: isMobile ? '10px 16px' : '10px 18px',
                      borderRadius: '99px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(244, 63, 94, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.borderColor = theme.primary;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.2) 100%)';
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
            <div style={{ width: '100%', maxWidth: '720px', display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              {attachments.map((att, idx) => (
                <div key={idx} style={{
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
                  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.05)'
                }}>
                  <FileIcon size={14} color="#64748b" />
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                  <button aria-label="Remove attachment" onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#94A3B8', marginLeft: '4px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <span style={{ fontSize: '15px' }}>🔬</span>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <strong style={{ color: '#14532D' }}>Referenced Study: {activeSourceStudy.title || activeSourceStudy.briefTitle}</strong>
                  <span style={{ color: '#166534', marginLeft: '6px' }}>({activeSourceStudy.nctId}) • Abstract Attached</span>
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
                minHeight: 'unset',
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
            <input type="hidden" aria-label="Conversation context" value={selectedCaseId} readOnly />
            <textarea
              ref={textareaRef}
              rows={1}
              maxLength={8000}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(input); } }}
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
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
                e.target.style.borderColor = '#0D9488';
                e.target.style.boxShadow = '0 8px 28px rgba(13, 148, 136, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#CCFBF1';
                e.target.style.boxShadow = '0 4px 16px rgba(15, 23, 42, 0.05)';
              }}
            />

            <div style={{ position: 'absolute', right: isMobile ? '6px' : '8px', bottom: isMobile ? '5px' : '7px', display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px', zIndex: 2 }}>
              {/* Photo Meal Snap Button */}
              <button
                type="button"
                aria-label="Snap photo of meal or plate"
                title="Snap meal photo"
                onClick={() => {
                  triggerHapticLight();
                  fileInputRef.current?.click();
                }}
                style={{
                  width: isMobile ? '30px' : '34px',
                  height: isMobile ? '30px' : '34px',
                  minHeight: 'unset',
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
                disabled={(!input.trim() && attachments.length === 0) || isTyping || isStreaming || isProcessingAttachment || Boolean(selectedCaseId && (!selectedCase || selectedCase.intakeData?.scenarioId))}
                style={{
                  width: isMobile ? '34px' : '36px',
                  height: isMobile ? '34px' : '36px',
                  minHeight: 'unset',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (!input.trim() && attachments.length === 0) || isTyping || isStreaming ? 'not-allowed' : 'pointer',
                  opacity: (!input.trim() && attachments.length === 0) || isTyping || isStreaming ? 0.45 : 1,
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
                  transition: 'all 0.2s',
                }}
              >
                <Send size={isMobile ? 14 : 15} style={{ marginLeft: '2px' }} />
              </button>
            </div>
          </form>
          {(isProcessingAttachment || sendError || (selectedCase && input.trim()) || savedUpdate) && (
            <div style={{ width: '100%', maxWidth: 720, marginTop: 8, fontSize: 12, color: '#475569' }}>
              {isProcessingAttachment && <p role="status">Reading your document… You can keep writing while it is processed.</p>}
              {sendError && (
                <div role="alert" style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '8px 12px', borderRadius: '10px', color: '#991B1B', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  <span>Ava couldn’t respond. Your message has been safely retained.</span>
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
                          chatMutation.mutate(lastRequestRef.current);
                        }
                      }}
                    >
                      Retry message
                    </button>
                  </div>
                </div>
              )}
              {selectedCase && input.trim() && <button type="button" className="btn btn-outline" onClick={saveDraftToCase}>Save draft as a case update</button>}
              {savedUpdate && <div role="status" style={{ margin: '8px 0', lineHeight: 1.5 }}>
                Saved to {savedUpdate.title}.{' '}
                <button type="button" className="btn btn-outline" onClick={() => navigate(`/app/cases/${encodeURIComponent(savedUpdate.caseId)}`)}>View saved update</button>{' '}
                <button type="button" className="btn btn-outline" onClick={() => navigate(`/app/case-prep?caseId=${encodeURIComponent(savedUpdate.caseId)}`)}>Prepare for your visit</button>
              </div>}
            </div>
          )}

          {/* Primary Dual-Action Capsule Dock (Reference media_1788642371467.png) */}
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              display: 'flex',
              gap: '8px',
              marginTop: '10px',
              marginBottom: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                if (input.trim()) {
                  toast.info('Your draft is ready', 'Send or save your current draft before starting a daily check-in.');
                } else {
                  setInput('Help me log my day. Ask me about my sleep, meals, energy, and any symptoms one question at a time.');
                }
                textareaRef.current?.focus();
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                border: '1.5px solid #6EE7B7',
                color: '#065F46',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <span>⚡</span>
              <span>Log your day</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setDetectiveTab('map');
                setIsDetectiveOpen(true);
              }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '999px',
                background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                border: '1.5px solid #5EEAD4',
                color: '#0F766E',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(13, 148, 136, 0.12)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
            >
              <span>🌐</span>
              <span>Connection Detective</span>
            </button>
          </div>

          {/* Complete Ava Quick Tools - Always Visible */}
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              display: 'flex',
              gap: '8px',
              marginTop: '8px',
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
                  } else if (pill.action === 'mindfulness') {
                    setActiveMeditation(DEFAULT_CALM_TRACK);
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
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                  <span>{pill.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 400 }}>{TOOL_PURPOSES[pill.id]}</span>
                </span>
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
            © 2026 POWERED BY HEALTHCHAIN
          </div>
          <div>AI COMPANION • FOR SEVERE CRISES, PLEASE CONTACT A PROFESSIONAL HELPLINE</div>
        </div>
      )}

      {/* Interactive In-Chat Meditation Player Modal */}
      {activeMeditation && (
        <MeditationPlayer
          content={activeMeditation}
          onClose={() => setActiveMeditation(null)}
        />
      )}

      {/* Whole Health & Food Sensitivities Modal (Reference Images 3 & 4) */}
      <TriggerSensitivityModal
        isOpen={isWholeHealthOpen}
        onClose={() => setIsWholeHealthOpen(false)}
        onOpenMindfulness={() => setActiveMeditation(DEFAULT_CALM_TRACK)}
        initialTab={wholeHealthTab}
      />

      {/* Whole Health River Daily Stream Modal */}
      <WholeHealthRiverModal
        isOpen={isRiverOpen}
        onClose={() => setIsRiverOpen(false)}
        onAskAvaAboutConnection={(upstream, downstream) => {
          handleSend(`Ava, I noticed a connection in my Whole Health River: my "${upstream}" is followed by "${downstream}". How are these anatomically and biochemically linked in your clinical view?`);
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

      {/* Connection Detective Multi-System Intelligence Modal */}
      <ConnectionDetectiveModal
        isOpen={isDetectiveOpen}
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
      />

      <EmergencyTriageModal
        isOpen={Boolean(emergencyTriage?.isEmergency)}
        triage={emergencyTriage}
        onClose={() => setEmergencyTriage(null)}
      />
      {/* Context Scope Disclosure Modal (Promise 5) */}
      <AnimatePresence>
        {showContextModal && (
          <div
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
                borderRadius: '24px',
                border: '1.5px solid #CCFBF1',
                boxShadow: '0 24px 60px rgba(13, 148, 136, 0.2)',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      Never Repeat Your Story
                    </h3>
                    <div style={{ fontSize: '12px', color: '#0D9488', fontWeight: 700 }}>
                      Semantic Memory & Context Retrieval
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContextModal(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '8px',
                    width: '28px',
                    height: '28px',
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
                Ava continuously indexes your clinical notes, meal journals, and diagnostic lab reports so you never have to re-explain symptoms or timeline milestones.
              </p>

              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                  Active Working Context ({memoryContext.includedItems.length} items loaded)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#E0F2FE', color: '#0369A1' }}>
                          {item.type}
                        </span>
                        <span style={{ fontWeight: 600, color: '#1E293B', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
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

              <div style={{ background: '#FFFBEB', borderRadius: '12px', padding: '12px 14px', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Omitted for Relevance ({memoryContext.omittedCount} background items)
                </div>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#92400E', lineHeight: 1.5 }}>
                  Routine stable vital logs and non-correlated diary entries are intentionally omitted to avoid context clutter and maximize clinical reasoning precision.
                </p>
              </div>

              <div style={{ fontSize: '11px', color: '#94A3B8', textAlign: 'center' }}>
                🔒 Complete history is stored encrypted in your local browser vault.
              </div>
            </motion.div>
          </div>
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
          onConfirm={(confirmedText, targetCaseId, specialty) => handleConfirmSave(confirmedText, targetCaseId, specialty)}
        />
      )}
    </div>
  );
}



