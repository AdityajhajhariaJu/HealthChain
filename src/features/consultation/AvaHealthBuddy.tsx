import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, Send, Sparkles, Paperclip, X, File as FileIcon, Activity, Play, Wind, Mic, MicOff, Plus, Pill, Zap, Camera } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { chatWithTherapyGemini, analyzeLabReport, extractClinicalMemory } from '../../services/geminiService';
import { addEvent, getProfile, updateVitals, getProfileEngineState, getProfileKey, updateProfileFeatureData } from '../../services/ProfileEngine';
import { recordHealthMemory } from '../../services/HealthMemory';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getActiveSession } from '../../services/authSession';
import { useToast } from '../../components/ui/ToastProvider';
import { canUseTrial, recordTrialUsage, openTrialModal } from '../../services/TrialEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { DiaryTimelineCard } from '../../components/ui/DiaryTimelineCard';
import { TriggerSensitivityCard } from '../../components/ui/TriggerSensitivityCard';
import { TriggerSensitivityModal, WholeHealthTab } from '../../components/ui/TriggerSensitivityModal';
import { WholeHealthRiverModal } from '../../components/ui/WholeHealthRiverModal';
import { QuickMealIntakeSheet } from '../../components/ui/QuickMealIntakeSheet';
import { SymptomSensitivityCapsuleCard } from '../../components/ui/SymptomSensitivityCapsuleCard';
import { evaluateEmergencyTriage, TriageEvaluation } from '../../services/clinicalTriageEngine';
import { EmergencyTriageModal } from '../../components/ui/EmergencyTriageModal';
import { getCase, addCaseEvent } from '../../services/CaseEngine';
import { buildCaseContext } from '../../services/caseWorkspace';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import '../../components/ui/caseWorkspace.css';

const QUICK_ACTION_PILLS = [
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
    const { before, after } = extractBalancedWidget(content, 'CONNECTION_TRIGGER_CARD');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {before && <span>{before}</span>}
        <span>This older message included an unverified connection card. Open a saved case to review documented facts, uncertainties, and its connection map.</span>
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
  const incomingPrompt = location.state?.initialPrompt || location.state?.initialMessage;
  const [input, setInput] = useState(() => { 
    try { 
      return incomingPrompt || sessionStorage.getItem(`${getAvaVaultKey()}_draft`) || '';
    } catch { 
      return ''; 
    } 
  });
  useEffect(() => { try { if (input.trim()) sessionStorage.setItem(`${getAvaVaultKey()}_draft`, input); else sessionStorage.removeItem(`${getAvaVaultKey()}_draft`); } catch(e){} }, [input]);
  useEffect(() => {
    if (incomingPrompt) {
      setInput(incomingPrompt);
    }
  }, [incomingPrompt]);
  const [attachments, setAttachments] = useState<{name: string, data: string}[]>([]);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const attachmentBusyRef = useRef(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isWholeHealthOpen, setIsWholeHealthOpen] = useState(false);
  const [wholeHealthTab, setWholeHealthTab] = useState<WholeHealthTab>('picture');
  const [isRiverOpen, setIsRiverOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isQuickMealOpen, setIsQuickMealOpen] = useState(false);
  const [showQuickTools, setShowQuickTools] = useState(false);
  const [emergencyTriage, setEmergencyTriage] = useState<TriageEvaluation | null>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleListening = () => {
    triggerHapticLight();
    if (typeof window === 'undefined') return;
    const win = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.info('Voice Dictation', 'Voice dictation is not supported in this browser. Please type directly.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e){}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join('');
        setInput(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('Speech recognition init error:', e);
      setIsListening(false);
    }
  };


  const availableCases = useCaseWorkspace();
  const [selectedCaseId, setSelectedCaseId] = useState(() => new URLSearchParams(location.search).get('caseId') || new URLSearchParams(location.search).get('importCase') || location.state?.caseId || '');
  const selectedCase = availableCases.find(item => item.id === selectedCaseId);
  const importedCase = selectedCase ? { caseId: selectedCase.id, title: selectedCase.title, type: 'Saved case', topConditions: '' } : null;
  const setImportedCase = () => setSelectedCaseId('');
  const [sendError, setSendError] = useState(false);
  const lastRequestRef = useRef<AvaRequest | null>(null);
  const sendingRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSelectedCaseId(params.get('caseId') || params.get('importCase') || location.state?.caseId || '');
  }, [location.search, location.state?.caseId]);

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
      recognitionRef.current?.abort();
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
        if (!isMounted.current || request.scope !== getAvaVaultKey()) return;
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
        awardPoints(5, 'Prepared with Ava', 'consult', `ava_consult_${todayDateStr}`);
        recordTrialUsage('ava');
      },
    onError: (_error, request) => {
      if (!isMounted.current || request.scope !== getAvaVaultKey()) return;
      setIsTyping(false);
      setIsStreaming(false);
      setSendError(true);
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
    if ((!text.trim() && attachments.length === 0) || sendingRef.current || isTyping || isStreaming || attachmentBusyRef.current || (selectedCaseId && !selectedCase)) return;
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
    const request = { messages: newMessages, caseId: selectedCaseId, context: contextCase ? buildCaseContext(contextCase) : '', scope: messageScope };
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
        <div style={{ padding: '12px 18px', background: '#F0FDFA', flexShrink: 0 }}>
          <label htmlFor="ava-case-context" style={{ fontSize: 12, fontWeight: 700, color: '#115E59' }}>Conversation context</label>
          <select id="ava-case-context" className="case-context-select" value={selectedCaseId} disabled={isTyping || isStreaming} onChange={e => { setSelectedCaseId(e.target.value); setSendError(false); lastRequestRef.current = null; }}>
            <option value="">General health check-in</option>
            {availableCases.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          {selectedCaseId && !selectedCase && <p role="status">This case is not available in the current profile. Select another case or a general check-in.</p>}
        </div>
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
                  CASE PREPARATION ASSISTANT
                </p>
              </div>
            </div>

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
                left: isMobile ? '8px' : '10px',
                width: isMobile ? '32px' : '34px',
                height: isMobile ? '32px' : '34px',
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
            <textarea
              rows={2}
              maxLength={8000}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); handleSend(input); } }}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              aria-label="Ask Ava Health Buddy a question"
              placeholder={isMobile ? 'Check in with Ava...' : 'Just check in about your day...'}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: isMobile ? '12px 116px 12px 46px' : '15px 128px 15px 52px',
                borderRadius: '20px',
                border: '1.5px solid #CCFBF1',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                fontSize: isMobile ? '14px' : '15px',
                outline: 'none',
                boxShadow: '0 8px 28px rgba(15, 23, 42, 0.05)',
                color: '#1C1917',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={(e) => {
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
                e.target.style.borderColor = '#0D9488';
                e.target.style.boxShadow = '0 8px 28px rgba(13, 148, 136, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#E2E8F0';
                e.target.style.boxShadow = '0 8px 28px rgba(15, 23, 42, 0.05)';
              }}
            />

            <div style={{ position: 'absolute', right: isMobile ? '6px' : '8px', display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '6px', zIndex: 2 }}>
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

              {/* Mic Dictation Button */}
              <button
                type="button"
                aria-label={isListening ? 'Stop listening' : 'Start voice dictation'}
                onClick={toggleListening}
                style={{
                  width: isMobile ? '30px' : '34px',
                  height: isMobile ? '30px' : '34px',
                  borderRadius: '50%',
                  background: isListening ? '#EF4444' : '#F8FAFC',
                  color: isListening ? '#FFFFFF' : '#64748B',
                  border: isListening ? 'none' : '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isListening ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none',
                }}
              >
                {isListening ? <MicOff size={isMobile ? 14 : 16} /> : <Mic size={isMobile ? 14 : 16} />}
              </button>

              {/* Send Button */}
              <button
                aria-label="Send message"
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isTyping || isStreaming || isProcessingAttachment || Boolean(selectedCaseId && !selectedCase)}
                style={{
                  width: isMobile ? '34px' : '36px',
                  height: isMobile ? '34px' : '36px',
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
          <div style={{ width: '100%', maxWidth: 720, marginTop: 8, fontSize: 12, color: '#475569' }}>
            {isProcessingAttachment && <p role="status">Reading your document… You can keep writing while it is processed.</p>}
            <p style={{ margin: '0 0 6px', lineHeight: 1.5 }}>Attachments are sent to our AI service to extract text. Check extracted details against the original.</p>
            {sendError && <div role="alert">Ava couldn’t respond. Your message is still here. <button type="button" className="btn btn-outline" onClick={() => { if (lastRequestRef.current && !sendingRef.current) { sendingRef.current = true; chatMutation.mutate(lastRequestRef.current); } }}>Retry message</button></div>}
            {selectedCase && input.trim() && <button type="button" className="btn btn-outline" onClick={() => { addCaseEvent(selectedCase.id, input.trim(), 'Personal update from Ava'); toast.success('Update saved', 'Your words have been added to this case timeline.'); setInput(''); }}>Save draft as a case update</button>}
            <p style={{ margin: 0, lineHeight: 1.5 }}>Enter to send · Shift + Enter for a new line · AI responses can be mistaken.</p>
          </div>

          {/* Explicit shortcuts; these open the same saved tools rather than duplicating them. */}
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
                setIsQuickMealOpen(true);
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
              <span>Log a meal</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                navigate(selectedCase ? `/app/cases/${selectedCase.id}` : '/app/my-cases');
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
              <span>{selectedCase ? 'Open case workspace' : 'Choose a case'}</span>
            </button>
          </div>

          <button type="button" className="ava-more-tools" aria-expanded={showQuickTools} onClick={() => setShowQuickTools(value => !value)}>{showQuickTools ? 'Hide extra tools' : 'More ways Ava can help'}</button>
          {/* Additional tools stay available without crowding the composer. */}
          {showQuickTools && <div
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
                onClick={() => {
                  triggerHapticLight();
                  if (pill.action === 'mindfulness') {
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
                <span>{pill.label}</span>
              </button>
            ))}
          </div>}
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

      <EmergencyTriageModal
        isOpen={Boolean(emergencyTriage?.isEmergency)}
        triage={emergencyTriage}
        onClose={() => setEmergencyTriage(null)}
      />
    </div>
  );
}



