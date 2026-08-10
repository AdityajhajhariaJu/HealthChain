import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Ear,
  Wind,
  Brain,
  Bone,
  Heart,
  Eye,
  Thermometer,
  FlaskConical,
  Stethoscope,
  Zap,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  GitMerge,
  X,
  Microscope,
  ShieldCheck,
  Activity,
  Syringe,
  Pill,
  CircleDot,
  Layers,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  FileText,
  BrainCircuit,
  User,
  Users,
  Plus,
  Pause,
  Play,
  StopCircle,
  RotateCcw
} from 'lucide-react';
import {
  chatWithMDTSpecialist,
  generateParallelMultiReport,
  suggestSpecialists,
  runDebateRound,
} from '../../services/geminiService';
import { MDTReportPanel } from './MDTComponents';
import { MedicalRecordsBar } from '../../components/ui/MedicalRecordsBar';
import { addEvent, addActionItems, addCondition, getProfile } from '../../services/ProfileEngine';
import { createCaseDraft, getActiveCase, saveReviewSnapshot } from '../../services/CaseEngine';
import { useIsMobile } from '../../hooks/useIsMobile';

// Global cache
let cachedMultiSpecialistState: any = null;
const cachedSpecialistStreams: any = {};

const ALL_SPECIALISTS = [
  // Structural
  {
    id: 'physio',
    category: 'Structural',
    label: 'Physiotherapist',
    desc: 'Muscles & posture',
    icon: Bone,
    color: '#6366F1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
  },
  {
    id: 'ortho',
    category: 'Structural',
    label: 'Orthopaedic Surgeon',
    desc: 'Bones & joints',
    icon: Layers,
    color: '#64748B',
    bg: 'rgba(100,116,139,0.08)',
    border: 'rgba(100,116,139,0.2)',
  },
  {
    id: 'rheum',
    category: 'Structural',
    label: 'Rheumatologist',
    desc: 'Autoimmune & joints',
    icon: CircleDot,
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.08)',
    border: 'rgba(236,72,153,0.2)',
  },
  {
    id: 'chiro',
    category: 'Structural',
    label: 'Chiropractor',
    desc: 'Spinal alignment',
    icon: Zap,
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
  },
  // Neurological
  {
    id: 'neuro',
    category: 'Neurological',
    label: 'Neurologist',
    desc: 'Brain & nerves',
    icon: Brain,
    color: '#A855F7',
    bg: 'rgba(168,85,247,0.08)',
    border: 'rgba(168,85,247,0.2)',
  },
  {
    id: 'pain',
    category: 'Neurological',
    label: 'Pain Specialist',
    desc: 'Chronic pain',
    icon: Activity,
    color: '#F97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.2)',
  },
  // ENT & Head
  {
    id: 'ent',
    category: 'ENT & Head',
    label: 'ENT Specialist',
    desc: 'Ear, nose & throat',
    icon: Ear,
    color: '#059669',
    bg: 'rgba(5, 150, 105,0.08)',
    border: 'rgba(5, 150, 105,0.2)',
  },
  {
    id: 'ophthal',
    category: 'ENT & Head',
    label: 'Ophthalmologist',
    desc: 'Eyes & vision',
    icon: Eye,
    color: '#0EA5E9',
    bg: 'rgba(14,165,233,0.08)',
    border: 'rgba(14,165,233,0.2)',
  },
  {
    id: 'dental',
    category: 'ENT & Head',
    label: 'Dentist / TMJ',
    desc: 'Jaw & bite',
    icon: Stethoscope,
    color: '#84CC16',
    bg: 'rgba(132,204,22,0.08)',
    border: 'rgba(132,204,22,0.2)',
  },
  // Internal
  {
    id: 'cardio',
    category: 'Internal',
    label: 'Cardiologist',
    desc: 'Heart & circulation',
    icon: Heart,
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
  },
  {
    id: 'pulmo',
    category: 'Internal',
    label: 'Pulmonologist',
    desc: 'Lungs & breathing',
    icon: Wind,
    color: '#06B6D4',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
  },
  {
    id: 'gastro',
    category: 'Internal',
    label: 'Gastroenterologist',
    desc: 'Gut & digestion',
    icon: FlaskConical,
    color: '#22C55E',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.2)',
  },
  {
    id: 'endo',
    category: 'Internal',
    label: 'Endocrinologist',
    desc: 'Hormones & thyroid',
    icon: Microscope,
    color: '#F43F5E',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.2)',
  },
  {
    id: 'allergy',
    category: 'Internal',
    label: 'Allergist',
    desc: 'Immune issues',
    icon: ShieldCheck,
    color: '#10B981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
  },
  // Other
  {
    id: 'derm',
    category: 'Other',
    label: 'Dermatologist',
    desc: 'Skin & hair',
    icon: Syringe,
    color: '#EAB308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.2)',
  },
  {
    id: 'psych',
    category: 'Other',
    label: 'Psychiatrist',
    desc: 'Mental health',
    icon: Pill,
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
  },
  {
    id: 'immuno',
    category: 'Other',
    label: 'Immunologist',
    desc: 'Systemic immunity',
    icon: Thermometer,
    color: '#E11D48',
    bg: 'rgba(225,29,72,0.08)',
    border: 'rgba(225,29,72,0.2)',
  },
  {
    id: 'gynae',
    category: 'Other',
    label: 'Gynecologist',
    desc: "Women's health",
    icon: Stethoscope,
    color: '#D946EF',
    bg: 'rgba(217,70,239,0.08)',
    border: 'rgba(217,70,239,0.2)',
  },
];

const CATEGORIES = ['Structural', 'Neurological', 'ENT & Head', 'Internal', 'Other'];

function useSpecialistStream(specialist: any, isRunning: boolean, isPaused: boolean, startDelay: number, onComplete: (id: string, messages: any[]) => void, allSpecialists: any[] = [], intakeData: any, activeDifferentials: any[]) {
  const cache = cachedSpecialistStreams[specialist.id];
  const [messages, setMessages] = useState<any[]>(cache?.messages || []);
  const [status, setStatus] = useState(cache?.status || 'idle'); // idle | thinking | questioning | done
  const [step, setStep] = useState(cache?.step || 0);

  useEffect(() => {
    return () => {
      cachedSpecialistStreams[specialist.id] = { messages, status, step };
    };
  }, [messages, status, step, specialist.id]);

  const otherSpecialists = allSpecialists
    .filter((s) => s.id !== specialist.id)
    .map((s) => s.label.toLowerCase());
  let collabString = '';
  if (otherSpecialists.length === 1) {
    collabString = ` and I will be working in collaboration with the <strong>${otherSpecialists[0]}</strong>`;
  } else if (otherSpecialists.length > 1) {
    const last = otherSpecialists.pop();
    collabString = ` and I will be working in collaboration with the <strong>${otherSpecialists.join('</strong>, <strong>')}</strong>, and <strong>${last}</strong>`;
  }

  const introQuestion = JSON.stringify({
    internalThoughts: `Reviewing intake. Preparing to assess patient for ${specialist.label} specific pathways.`,
    currentHypotheses: ["Awaiting initial patient response"],
    response: `Hello, I'm the **${specialist.label}**${collabString}. What specific issues or symptoms bring you to my field today?`,
    widgetType: "none"
  });

  useEffect(() => {
    if (!isRunning) {
      setMessages([]);
      setStatus('idle');
      setStep(0);
      return;
    }
    if (status === 'idle' && step === 0 && !isPaused) {
      let innerTimer;
      const timer = setTimeout(() => {
        setStatus('thinking');
        innerTimer = setTimeout(
          () => {
            setMessages([{ role: 'ai', text: introQuestion }]);
            setStatus('questioning');
          },
          1000 + Math.random() * 800
        );
      }, startDelay);
      return () => {
        clearTimeout(timer);
        if (innerTimer) clearTimeout(innerTimer);
      };
    }
  }, [isRunning, isPaused, status, step, startDelay, introQuestion]);

  const submitAnswer = async (text) => {
    if (status !== 'questioning') return;
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setStatus('thinking');
    setStep(step + 1);

    try {
      const response = await chatWithMDTSpecialist(newMessages, specialist, allSpecialists, intakeData, activeDifferentials);
      if (response.includes('ANALYSIS_COMPLETE')) {
        setStatus('done');
        if (onComplete) onComplete(specialist.id, newMessages);
      } else {
        setMessages((prev) => [...prev, { role: 'ai', text: response }]);
        setStatus('questioning');
      }
    } catch (err) {
      console.error('Failed to fetch AI response:', err);
      const errorMsg = JSON.stringify({
        response: 'Sorry, I encountered a network error. Please try again.',
        internalThoughts: 'Network error encountered.',
        currentHypotheses: []
      });
      setMessages((prev) => [...prev, { role: 'ai', text: errorMsg }]);
      setStatus('questioning');
    }
  };

  return { messages, status, submitAnswer };
}

// ─── Specialist Stage Component (Grid Style) ──────
function SpecialistPanel({ specialist, isRunning, isPaused, index, onComplete, allSpecialists, intakeData, activeDifferentials }) {
  const startDelay = index * 400;
  const { messages, status, submitAnswer } = useSpecialistStream(
    specialist,
    isRunning,
    isPaused,
    startDelay,
    onComplete,
    allSpecialists,
    intakeData,
    activeDifferentials
  );
  const containerRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const [input, setInput] = useState('');
  const Icon = specialist.icon;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages.length]);

  useEffect(() => {
    if (status === 'questioning' && inputRef.current) {
      // Don't steal focus if the user is already typing somewhere else
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        inputRef.current.focus();
      }
    }
  }, [status]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || status !== 'questioning' || isPaused) return;
    submitAnswer(input);
    setInput('');
  };

  const questionCount = messages.filter((m) => m.role === 'ai').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.15, type: 'spring', stiffness: 80 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border:
          status === 'done' ? `2px solid ${specialist.color}` : '1px solid rgba(255,255,255,0.5)',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: specialist.bg,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: '#FFF',
            border: `1px solid ${specialist.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <Icon size={16} color={specialist.color} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
            {specialist.label}
          </div>
          <div style={{ fontSize: '11px', color: specialist.color, fontWeight: 700, marginTop: '2px' }}>
            {status === 'idle' && <span style={{ color: '#94A3B8' }}>Initializing...</span>}
            {status === 'thinking' && 'Analyzing...'}
            {status === 'questioning' && `Question ${questionCount}`}
            {status === 'done' && 'Assessment complete'}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'rgba(248,250,252,0.5)',
        }}
      >
        {status === 'idle' && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              opacity: 0.6,
            }}
          >
            <Sparkles size={32} color={specialist.color} />
            <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 600 }}>
              Initializing AI Agent...
            </span>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg: any, i: number) => {
            const isUser = msg.role === 'user';
            let parsed: any = null;
            let displayText = msg.text;
            let internalThoughts = null;

            if (!isUser) {
              try {
                let jsonText = msg.text;
                const match = jsonText.match(/```(?:json)?\n?([\s\S]*?)\n?```/i);
                if (match && match[1]) {
                  jsonText = match[1].trim();
                }
                parsed = JSON.parse(jsonText);
                displayText = parsed?.response || parsed?.text || parsed?.message || parsed?.answer || parsed?.professionalAdvice || msg.text;
                internalThoughts = parsed?.internalThoughts;
              } catch {
                displayText = msg.text;
              }
            }

            return (
              <motion.div
                key={`msg-${i}-${msg.role}-${displayText?.length || 0}`}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                style={{ 
                  alignSelf: 'stretch', 
                  maxWidth: '100%',
                  marginLeft: isUser ? '32px' : '0px',
                  marginBottom: isUser ? '24px' : '12px'
                }}
              >
                {!isUser && internalThoughts && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      marginBottom: '16px',
                      padding: '12px 18px',
                      background: `linear-gradient(90deg, ${specialist.color}15 0%, ${specialist.color}05 100%)`,
                      borderRadius: 'var(--radius-lg)',
                      border: `1px solid ${specialist.color}25`,
                      fontSize: '13px',
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <motion.div
                       animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.2, 0.9] }}
                       transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                       style={{
                         width: '8px',
                         height: '8px',
                         borderRadius: '50%',
                         background: specialist.color,
                         boxShadow: `0 0 10px ${specialist.color}`,
                         flexShrink: 0
                       }}
                    />
                    <div style={{ lineHeight: 1.5, letterSpacing: '0.2px', fontStyle: 'italic' }}>
                      <span style={{ fontWeight: 600, color: specialist.color, marginRight: '6px' }}>Clinical Analysis:</span>
                      {internalThoughts}
                    </div>
                  </motion.div>
                )}
                {!isUser ? (
                  <div
                    style={{
                      padding: '20px 24px',
                      borderRadius: 'var(--radius-lg)',
                      background: '#FFFFFF',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.02)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Subtle top gradient accent */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${specialist.color}, ${specialist.color}40)` }} />
                    
                    <div style={{ fontSize: '11px', fontWeight: 800, color: specialist.color, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BrainCircuit size={14} /> ACTIVE INQUIRY
                    </div>
                    <div style={{ fontSize: '14px', lineHeight: 1.6, color: '#1E293B', fontWeight: 400 }}>
                      <ReactMarkdown>{displayText}</ReactMarkdown>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'rgba(248, 250, 252, 0.7)',
                      border: '1px solid rgba(226, 232, 240, 0.6)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={12} /> PATIENT RESPONSE
                    </div>
                    <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#334155', fontWeight: 500 }}>
                      <ReactMarkdown>{displayText}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {status === 'thinking' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ alignSelf: 'flex-start' }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px',
                background: '#FFF',
                border: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.span
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 1, delay: d }}
                  style={{
                    display: 'block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: specialist.color,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {status === 'questioning' && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={handleSend}
            style={{
              padding: '16px',
              background: '#FFF',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              display: 'flex',
              gap: '12px',
            }}
          >
            <input
              ref={inputRef}
              autoFocus
              disabled={isPaused}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer..."
              aria-label="Your answer"
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: '999px',
                border: '1px solid #E2E8F0',
                fontSize: '15px',
                outline: 'none',
                background: '#F8FAFC',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = specialist.color)}
              onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
            />
            <button
              type="submit"
              disabled={!input.trim() || isPaused}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                background: input.trim() ? specialist.color : '#E2E8F0',
                color: '#FFF',
                border: 'none',
                cursor: input.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                boxShadow: input.trim() ? `0 4px 12px ${specialist.color}40` : 'none',
              }}
            >
              <ArrowRight size={20} />
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SpecialistPill({ specialist, isSelected, onToggle, isMobile }) {
  const Icon = specialist.icon;
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onToggle(specialist.id)}
      style={{
        background: isSelected ? specialist.color : '#FFFFFF',
        border: isSelected ? `1px solid ${specialist.color}` : '1px solid #E2E8F0',
        borderRadius: '999px',
        padding: isMobile ? '8px 10px 8px 6px' : '8px 16px 8px 12px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '8px',
        width: '100%',
        minWidth: 0,
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? `0 4px 12px ${specialist.color}40` : '0 2px 4px rgba(0,0,0,0.02)',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: isSelected ? '#FFFFFF' : specialist.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={14} color={isSelected ? specialist.color : '#64748B'} />
      </div>
      <div style={{ 
        fontSize: isMobile ? '12px' : '13px', 
        fontWeight: 600, 
        color: isSelected ? '#FFFFFF' : '#475569',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {specialist.label}
      </div>
    </motion.button>
  );
}

export default function MultiSpecialist() {
  const isMobile = useIsMobile();
  const [mobileActiveTab, setMobileActiveTab] = useState(0);
  const navigate = useNavigate();
  const searchInputRef = useRef<any>(null);
  const [phase, setPhase] = useState(cachedMultiSpecialistState?.phase || 'select');
  const [selected, setSelected] = useState<string[]>(cachedMultiSpecialistState?.selected || []);
  const [activeSpecialistId, setActiveSpecialistId] = useState(
    cachedMultiSpecialistState?.activeSpecialistId || null
  );
  const [symptomInput, setSymptomInput] = useState(cachedMultiSpecialistState?.symptomInput || '');
  const [caseTitle, setCaseTitle] = useState('');
  const [activeCategory, setActiveCategory] = useState(
    cachedMultiSpecialistState?.activeCategory || 'All'
  );
  const [customSpecialists, setCustomSpecialists] = useState<any[]>(
    cachedMultiSpecialistState?.customSpecialists || []
  );
  const [completedSpecialists, setCompletedSpecialists] = useState<Record<string, boolean>>(
    cachedMultiSpecialistState?.completedSpecialists || {}
  );
  const [specialistTranscripts, setSpecialistTranscripts] = useState<any>({});
  const [finalReport, setFinalReport] = useState(null);
  const [savedCaseId, setSavedCaseId] = useState<string | null>(null);
  const [workingCaseId, setWorkingCaseId] = useState<string | null>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [activeCase, setActiveCase] = useState(getActiveCase());
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(cachedMultiSpecialistState?.aiSuggestion || null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  useEffect(() => {
    const profile = getProfile();
    const hasProfileData = profile.healthFocus || (profile.conditions && profile.conditions.length > 0) || (profile.medications && profile.medications.length > 0);
    
    if (phase === 'select' && hasProfileData && !aiSuggestion && !isSuggesting && selected.length === 0) {
      setIsSuggesting(true);
      const available = ALL_SPECIALISTS.map(s => ({ id: s.id, label: s.label }));
      suggestSpecialists(profile, available).then(res => {
        if (res && res.suggestedSpecialistIds) {
          setAiSuggestion(res);
        }
        setIsSuggesting(false);
      }).catch(() => setIsSuggesting(false));
    }
  }, [phase, selected.length]);

  // Restore from active case if we have a finished parallel review and no cache
  useEffect(() => {
    if (!cachedMultiSpecialistState && phase === 'select' && activeCase && activeCase.reviews) {
      const latestParallel = [...activeCase.reviews].reverse().find((r: any) => r.type === 'parallel');
      if (latestParallel && latestParallel.report) {
        setFinalReport(latestParallel.report);
        setSpecialistTranscripts(latestParallel.transcripts || {});
        
        // Match labels to IDs
        const labels = latestParallel.specialists || [];
        const matchedIds = ALL_SPECIALISTS.filter(s => labels.includes(s.label)).map(s => s.id);
        
        // If there are custom specialists, they won't be in ALL_SPECIALISTS.
        // We would need to recreate them, but for now we match standard ones.
        setSelected(matchedIds);
        setPhase('report');
      }
    }
  }, [activeCase]);

  useEffect(() => {
    const refresh = () => setActiveCase(getActiveCase());
    window.addEventListener('hc_active_case_updated', refresh);
    window.addEventListener('hc_cases_updated', refresh);
    return () => {
      window.removeEventListener('hc_active_case_updated', refresh);
      window.removeEventListener('hc_cases_updated', refresh);
    };
  }, []);

  useEffect(() => {
    return () => {
      cachedMultiSpecialistState = {
        phase,
        selected,
        symptomInput,
        activeCategory,
        customSpecialists,
        completedSpecialists,
        activeSpecialistId,
        aiSuggestion,
      };
    };
  }, [
    phase,
    selected,
    symptomInput,
    activeCategory,
    customSpecialists,
    completedSpecialists,
    activeSpecialistId,
    aiSuggestion,
  ]);

  const handleForceConsensus = async () => {
    setIsSessionPaused(false);
    setPhase('correlating');
    
    // Harvest the latest messages from the global cache for all selected specialists
    const currentTranscripts: any = {};
    selected.forEach((sId) => {
      currentTranscripts[sId] = cachedSpecialistStreams[sId]?.messages || [];
    });
    setSpecialistTranscripts(currentTranscripts);

    try {
      const report = await generateParallelMultiReport(
        caseTitle || symptomInput || 'Custom Multi-Specialist Intake',
        currentTranscripts,
        medicalRecords
      );
      setFinalReport(report);
      setPhase('done');
      setTimeout(() => setPhase('report'), 800);
    } catch (error) {
      console.error('Failed to force consensus:', error);
      setPhase('running');
    }
  };

  const restartParallelReview = () => {
    setIsSessionPaused(false);
    setPhase('select');
    setSymptomInput('');
    setSelected([]);
    setCompletedSpecialists({});
    setSpecialistTranscripts({});
    setFinalReport(null);
    setActiveSpecialistId(null);
    Object.keys(cachedSpecialistStreams).forEach((key) => delete cachedSpecialistStreams[key]);
  };

  // Ensure active specialist is always valid
  useEffect(() => {
    if (selected.length > 0 && (!activeSpecialistId || !selected.includes(activeSpecialistId))) {
      setActiveSpecialistId(selected[0]);
    }
  }, [selected, activeSpecialistId]);

  const allAvailableSpecialists = [...ALL_SPECIALISTS, ...customSpecialists];
  const selectedSpecialists = allAvailableSpecialists.filter((s) => selected.includes(s.id));
  const activeSpecialistObj =
    selectedSpecialists.find((s) => s.id === activeSpecialistId) || selectedSpecialists[0];

  const toggleSpecialist = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) {
        alert('You can select up to 5 specialists at a time.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const filteredSpecialists =
    activeCategory === 'All'
      ? allAvailableSpecialists
      : allAvailableSpecialists.filter((s) => s.category === activeCategory);

  const handleStart = () => {
    if (!symptomInput.trim() && selected.length === 0) return;
    let activeSelected = [...selected];
    const intakeText = symptomInput.trim() || activeCase?.intakeData?.chiefComplaint || activeCase?.title || 'Custom multi-specialist review';
    setCaseTitle(intakeText);
    if (symptomInput.trim()) {
      const text = symptomInput.toLowerCase();
      const matched = ALL_SPECIALISTS.filter((s) => text.includes(s.id) || text.includes(s.label.toLowerCase().split(' ')[0]));
      if (matched.length > 0) {
        matched.forEach((m) => {
          if (!activeSelected.includes(m.id) && activeSelected.length < 5) activeSelected.push(m.id);
        });
      } else if (activeSelected.length < 5) {
        const customName = symptomInput.trim().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const customId = 'custom_' + Date.now();
        setCustomSpecialists((prev) => [...prev, { id: customId, category: 'Other', label: customName, desc: 'Custom Specialist', icon: Stethoscope, color: '#6366F1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)' }]);
        activeSelected.push(customId);
      }
      setSymptomInput('');
    }
    setSelected(activeSelected);
    if (activeSelected.length > 0) {
      const workingCase =
        activeCase ||
        createCaseDraft({
          title: intakeText,
          intakeData: { chiefComplaint: intakeText },
          specialists: activeSelected.map(
            (id) => allAvailableSpecialists.find((s) => s.id === id)?.label || id
          ),
        });
      setWorkingCaseId(workingCase.id);
      setActiveSpecialistId(activeSelected[0]);
      setPhase('running');
      setCompletedSpecialists({});
    }
  };

  const handleSpecialistComplete = (id: string, transcript: any) => {
    setSpecialistTranscripts((prev: any) => ({ ...prev, [id]: transcript }));
    setCompletedSpecialists((prev) => {
      const updated = { ...prev, [id]: true };
      if (Object.keys(updated).length === selected.length) {
        setPhase('debating');
        setSpecialistTranscripts((currentTranscripts: any) => {
          const finalTranscripts = { ...currentTranscripts, [id]: transcript };
          const caseRecords = activeCase?.medicalRecords || [];
          const reviewRecords = [
            ...caseRecords,
            ...medicalRecords.filter(
              (record) =>
                !caseRecords.some(
                  (existing) =>
                    existing.filename === record.filename && existing.findings === record.findings
                )
            ),
          ];

          // Run the debate round for all selected specialists in parallel
          Promise.all(selected.map(async (sId) => {
            const specObj = ALL_SPECIALISTS.find(s => s.id === sId);
            if (!specObj) return { id: sId, debateMsg: null };
            const debateData = await runDebateRound(
              sId, 
              specObj.label, 
              finalTranscripts[sId], 
              finalTranscripts, 
              reviewRecords
            );
            return {
              id: sId,
              debateMsg: {
                role: 'ai',
                text: JSON.stringify(debateData),
                parsedText: debateData.critique,
                internalThoughts: `Debate Round: ${debateData.revisedHypothesis} (${debateData.confidenceUpdate}% confident)`,
                currentHypotheses: [debateData.revisedHypothesis]
              }
            };
          })).then((debateResults) => {
            // Append debate results to transcripts
            const postDebateTranscripts = { ...finalTranscripts };
            debateResults.forEach(res => {
              if (res.debateMsg) {
                postDebateTranscripts[res.id] = [...postDebateTranscripts[res.id], res.debateMsg];
              }
            });

            setPhase('correlating');
            
            generateParallelMultiReport(
              caseTitle || symptomInput || activeCase?.title || 'Custom multi-specialist review',
              postDebateTranscripts,
              reviewRecords
            ).then((reportData: any) => {
              if (reportData) {
                setFinalReport(reportData);
                setPhase('report');
                if (reportData.topDiagnoses && reportData.topDiagnoses.length > 0)
                  addCondition(reportData.topDiagnoses[0].condition, 'multi_specialist');
                addEvent(
                  'mdt_report',
                  'multi_specialist',
                  'Parallel Multi-Specialist Complete',
                  reportData,
                  true
                );
                if (reportData.recommendedActionPlan)
                  addActionItems(reportData.recommendedActionPlan, 'multi_specialist');
                
                if (workingCaseId || activeCase?.id) {
                  const savedCaseItem = saveReviewSnapshot({
                    caseId: workingCaseId || activeCase?.id || '',
                    type: 'parallel',
                    report: reportData,
                    transcripts: postDebateTranscripts,
                    specialists: selectedSpecialists.map((s) => s.label),
                    basedOnEvidenceIds: reviewRecords.map((r: any) => r.id),
                  });
                  setSavedCaseId(savedCaseItem?.id || null);
                }
              } else {
                alert('Failed to generate report.');
                setPhase('select');
              }
            }).catch(err => {
              console.error('Report generation failed:', err);
              setPhase('select');
            });
          }).catch(err => {
            console.error('Debate round failed:', err);
            setPhase('select');
          });

          return finalTranscripts;
        });
      } else {
        // Auto-switch to the next one that is not done
        const nextId = selected.find((sId) => !updated[sId]);
        if (nextId) setActiveSpecialistId(nextId);
      }
      return updated;
    });
  };

  return (
    <div
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: isMobile ? '16px 20px' : '32px 40px',
        color: '#0F172A',
        margin: isMobile ? '-16px -20px' : '-32px -40px',
        minHeight: '100vh',
        position: 'relative',
      }}
    >
      {/* Ambient Mesh Background for Running Phase */}
      <AnimatePresence>
        {(phase === 'running' || phase === 'correlating' || phase === 'debating') && activeSpecialistObj && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              background: `radial-gradient(circle at 50% 20%, ${activeSpecialistObj.color}15 0%, transparent 60%)`,
            }}
          />
        )}
      </AnimatePresence>

      {(phase === 'select' || phase === 'input') && <ParallelSideStory side="right" />}

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* ── Page Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(10px)',
              borderRadius: '999px',
              border: '1px solid rgba(0,0,0,0.05)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
            }}
          >
            <Sparkles size={16} color="#10B981" />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              AI Medical Engine
            </span>
          </div>
          <h1
            style={{
              fontSize: isMobile ? '32px' : '42px',
              fontWeight: 900,
              color: '#0F172A',
              margin: '0 0 16px 0',
              letterSpacing: '-1px',
            }}
          >
            Parallel Diagnostic Analysis
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#64748B',
              margin: '0 auto',
              maxWidth: '600px',
              lineHeight: 1.6,
              fontWeight: 500,
            }}
          >
            Describe your symptoms. We will spin up multiple AI specialists to investigate
            simultaneously and cross-correlate their findings.
          </p>
        </div>

        {/* ── Step 1: Input & Specialist Selection ── */}
        {(phase === 'select' || phase === 'input') && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: '720px', margin: '0 auto' }}
          >
            {activeCase && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 16px',
                  background: '#F0FDFA',
                  border: '1px solid #CCFBF1',
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#0F766E',
                  fontSize: '13px',
                }}
              >
                <GitMerge size={16} />
                <span>
                  <strong>Continuing your active case:</strong> {activeCase.title}. Your saved
                  evidence will be included in this review.
                </span>
              </div>
            )}

            <div
              style={{
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(20px)',
                padding: '8px',
                borderRadius: '24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                border: '1px solid rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '40px',
              }}
            >
              <div style={{ padding: isMobile ? '0 12px' : '0 20px', color: '#94A3B8' }}><Search size={isMobile ? 18 : 20} /></div>
              <input
                ref={searchInputRef}
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder={isMobile ? "Describe symptoms..." : "Describe symptoms or conditions to analyze..."}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'transparent',
                  padding: isMobile ? '12px 12px 12px 0' : '20px 20px 20px 0',
                  color: '#0F172A',
                  fontSize: isMobile ? '14px' : '16px',
                  outline: 'none',
                  fontWeight: 500,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              />
              <button onClick={handleStart} disabled={!symptomInput.trim() && selected.length === 0} className="btn btn-primary hover-scale glow-transition" style={{ padding: isMobile ? '10px 16px' : '14px 24px', borderRadius: '14px', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', opacity: !symptomInput.trim() && selected.length === 0 ? 0.5 : 1 }}>
                Analyze Now
              </button>
            </div>

            {/* ── AI Suggestion Banner ── */}
            {(isSuggesting || aiSuggestion) && (
              <div
                style={{
                  marginBottom: '24px',
                  padding: '20px',
                  background: 'linear-gradient(to right, #F0FDFA, #ECFEFF)',
                  border: '1px solid #CCFBF1',
                  borderRadius: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '10px', background: '#FFF', borderRadius: '14px', color: '#10B981', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <Sparkles size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 6px', fontSize: '15px', color: '#0F766E', fontWeight: 800 }}>AI Specialist Recommendation</h4>
                    {isSuggesting ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0F766E', fontSize: 14 }}>
                        <Loader2 size={16} className="spin" /> Analyzing your medical profile...
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: '0 0 16px', color: '#0F766E', fontSize: '14px', lineHeight: 1.5 }}>
                          {aiSuggestion.professionalAdvice}
                        </p>
                        <button
                          onClick={() => {
                            const newSelected = [...new Set([...selected, ...aiSuggestion.suggestedSpecialistIds])].slice(0, 5);
                            setSelected(newSelected);
                          }}
                          style={{
                            padding: '8px 16px',
                            background: '#10B981',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Plus size={14} /> Apply Suggestions
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div
              style={{
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#334155',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0,
                }}
              >
                Select AI Specialists
              </h3>
              <div
                style={{
                  fontSize: '13px',
                  color: '#6366F1',
                  fontWeight: 700,
                  background: '#EEF2FF',
                  padding: '4px 12px',
                  borderRadius: '99px',
                }}
              >
                {selected.length} Selected
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(20px)',
                padding: isMobile ? '24px 16px' : '32px',
                borderRadius: isMobile ? '24px' : '32px',
                border: '1px solid rgba(255,255,255,0.5)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
              }}
            >
              <div
                className="hide-scrollbar"
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '24px',
                  flexWrap: isMobile ? 'nowrap' : 'wrap',
                  overflowX: isMobile ? 'auto' : 'visible',
                  WebkitOverflowScrolling: 'touch',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  paddingBottom: '20px',
                }}
              >
                {['All', ...CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      background: activeCategory === cat ? '#0F172A' : 'transparent',
                      color: activeCategory === cat ? '#FFFFFF' : '#64748B',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(200px, 1fr))', gap: isMobile ? '8px' : '12px' }}>
                {activeCategory === 'All' && (
                  <button
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      searchInputRef.current?.focus();
                    }}
                    style={{
                      background: '#EEF2FF',
                      border: '1px dashed #818CF8',
                      borderRadius: '999px',
                      padding: '8px 16px 8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(99,102,241,0.15)',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} color={'#4F46E5'} />
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#4F46E5' }}>
                      Add other specialist...
                    </div>
                  </button>
                )}
                {filteredSpecialists.map((s) => (
                  <SpecialistPill
                    key={s.id}
                    specialist={s}
                    isSelected={selected.includes(s.id)}
                    onToggle={toggleSpecialist}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}




        {/* ── Step 2: Running (Focus Stage + Dock) ── */}
        {(phase === 'running' || phase === 'correlating' || phase === 'debating' || phase === 'done') && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Top Context Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                background: 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '20px',
                marginBottom: '40px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '15px', color: '#475569', fontWeight: 500 }}>
                  <strong style={{ color: '#0F172A', fontWeight: 800 }}>Case review:</strong>{' '}
                  {caseTitle || symptomInput || 'Comprehensive Analysis'}
                </span>
              </div>
              <AnimatePresence mode="wait">
                {phase === 'running' && (
                  <motion.span
                    key="r"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#6366F1',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    >
                      <Loader2 size={16} />
                    </motion.div>
                    {selected.length} Specialists Active
                  </motion.span>
                )}
                {phase === 'debating' && (
                  <motion.span
                    key="d"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8B5CF6' }}
                  >
                    <Users size={16} /> Inter-Specialist Debate
                  </motion.span>
                )}
                {phase === 'correlating' && (
                  <motion.span
                    key="c"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      color: '#A855F7',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                    >
                      <Loader2 size={16} />
                    </motion.div>
                    Correlating Findings...
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Session Control Strip ─── */}
            {phase === 'running' && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(24px)',
                  borderRadius: '14px',
                  border: '1px solid rgba(0,0,0,0.06)',
                  marginBottom: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                {/* Left: status + nav */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <motion.div
                      animate={isSessionPaused ? {} : { scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: isSessionPaused ? '#F59E0B' : '#10B981',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: isSessionPaused ? '#92400E' : '#065F46' }}>
                      {isSessionPaused ? 'Paused' : 'Active'}
                    </span>
                  </div>
                  <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />
                  <button
                    onClick={() => navigate(activeCase ? `/app/cases/${activeCase.id}` : '/app/today')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'color 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.color = '#0F172A'}
                    onMouseOut={e => e.currentTarget.style.color = '#64748B'}
                  >
                    <ArrowLeft size={15} /> Back to case
                  </button>
                </div>

                {/* Right: actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setPhase('select')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: '#FFF', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <ArrowLeft size={14} /> Back to Setup
                  </button>
                  <button
                    onClick={restartParallelReview}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: '#FFF', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#FCA5A5'; e.currentTarget.style.color = '#DC2626'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <RotateCcw size={14} /> Reset Data
                  </button>
                  <button
                    onClick={() => setIsSessionPaused(!isSessionPaused)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: isSessionPaused ? '#ECFDF5' : '#FFFBEB', color: isSessionPaused ? '#065F46' : '#92400E', border: `1px solid ${isSessionPaused ? '#A7F3D0' : '#FDE68A'}`, cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
                  >
                    {isSessionPaused ? <Play size={14} /> : <Pause size={14} />}
                    {isSessionPaused ? 'Resume' : 'Pause'}
                  </button>
                  <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />
                  <button
                    onClick={handleForceConsensus}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', background: '#0F172A', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.15s', boxShadow: '0 2px 6px rgba(15,23,42,0.15)' }}
                    onMouseOver={e => e.currentTarget.style.background = '#1E293B'}
                    onMouseOut={e => e.currentTarget.style.background = '#0F172A'}
                  >
                    <CheckCircle2 size={14} /> Finish & Save
                  </button>
                </div>
              </motion.div>
            )}

            {/* Professional Patience Message */}
            {(phase === 'running' || phase === 'correlating' || phase === 'debating') && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: 'center', marginBottom: '24px' }}
              >
                <motion.span 
                  animate={{ boxShadow: ['0 0 0px rgba(13,148,136,0)', '0 0 15px rgba(13,148,136,0.15)', '0 0 0px rgba(13,148,136,0)'] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    background: '#F0FDFA',
                    border: '1px solid #CCFBF1',
                    padding: '6px 14px',
                    borderRadius: '99px',
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: '#0F766E' 
                  }}
                >
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                      style={{ position: 'absolute', inset: 0, border: '1.5px dashed #10B981', borderRadius: '50%', opacity: 0.4 }}
                    />
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                      <BrainCircuit size={12} color="#10B981" />
                    </motion.div>
                  </div>
                  Comprehensive medical assessment is underway. Deep, cross-disciplinary analysis requires precision and time.
                </motion.span>
              </motion.div>
            )}

            {/* Layout: Grid Stage */}
            <div
              style={{
                display: isMobile ? 'flex' : 'grid',
                flexDirection: isMobile ? 'column' : 'unset',
                gridTemplateColumns: isMobile ? 'unset' : 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '24px',
                alignItems: 'flex-start',
                opacity: isSessionPaused ? 0.6 : 1,
                pointerEvents: isSessionPaused ? 'none' : 'auto',
                transition: 'all 0.3s'
              }}
            >
              {isMobile && (
                <div style={{ display: 'flex', overflowX: 'auto', gap: '8px', paddingBottom: '12px', WebkitOverflowScrolling: 'touch' }}>
                  {selectedSpecialists.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => setMobileActiveTab(i)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '99px',
                        whiteSpace: 'nowrap',
                        border: mobileActiveTab === i ? `1px solid ${s.color}` : '1px solid #E2E8F0',
                        background: mobileActiveTab === i ? s.color : '#FFF',
                        color: mobileActiveTab === i ? '#FFF' : '#64748B',
                        fontWeight: 700,
                        fontSize: '13px',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
              {selectedSpecialists.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    display: (!isMobile || mobileActiveTab === i) ? 'flex' : 'none',
                    flex: 1,
                    width: '100%',
                    height: isMobile ? 'calc(100vh - 240px)' : 'auto',
                  }}
                >
                  <SpecialistPanel
                    specialist={s}
                    isRunning={phase === 'running' || phase === 'correlating' || phase === 'debating' || phase === 'done'}
                    isPaused={isSessionPaused}
                    index={i}
                    onComplete={handleSpecialistComplete}
                    allSpecialists={selectedSpecialists}
                    intakeData={{ chiefComplaint: caseTitle || symptomInput || activeCase?.title || 'Custom multi-specialist review', sharedCaseMaterial: (activeCase as any)?.sharedCaseMaterial }}
                    activeDifferentials={activeCase?.differentials || []}
                  />
                </div>
              ))}
            </div>

            <div style={{ marginTop: '40px' }}>
              <MedicalRecordsBar
                records={medicalRecords}
                onAddRecord={(r) => setMedicalRecords([...medicalRecords, r])}
                onRemoveRecord={(id) =>
                  setMedicalRecords(medicalRecords.filter((r) => r.id !== id))
                }
              />
            </div>
          </motion.div>
        )}

        {phase === 'report' && finalReport && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
               <button 
                 onClick={() => setPhase('running')} 
                 style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '999px', background: '#FFF', border: '1px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                 onMouseOver={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}
                 onMouseOut={e => { e.currentTarget.style.background = '#FFF'; e.currentTarget.style.color = '#475569'; }}
               >
                 <ArrowLeft size={16} /> Back to Specialists Chat
               </button>
            </div>
            <MDTReportPanel
              intakeData={{
                chiefComplaint: caseTitle || symptomInput || 'Custom Multi-Specialist Intake',
              }}
              conferenceData={{}}
              finalAnswers={{}}
              medicalRecords={medicalRecords}
              initialReport={finalReport}
              onCorrelateInMDT={() =>
                navigate(
                  `/app/mdthub${savedCaseId || activeCase?.id ? `?caseId=${savedCaseId || activeCase?.id}` : ''}`
                )
              }
              onRestart={restartParallelReview}
              onRestartWithFeedback={(feedback) => {
                setSymptomInput((prev) => `${prev}\n\n[FEEDBACK FOR RE-EVALUATION]: ${feedback}`);
                setPhase('running');
                setCompletedSpecialists({});
                setSpecialistTranscripts({});
                setFinalReport(null);
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ParallelSideStory({ side }) {
  const frames =
    side === 'left'
      ? [
          {
            icon: GitMerge,
            label: 'HOW IT WORKS',
            title: 'Multiple perspectives. One starting point.',
            text: 'Choose the specialist perspectives that match your story. Each investigates independently.',
            stat: 'UP TO 5 AI SPECIALISTS',
          },
          {
            icon: Activity,
            label: 'LIVE CASE MAP',
            title: 'Your evidence stays connected.',
            text: 'Symptoms, records, questions and findings are kept together as your case develops.',
            stat: 'ONE EVOLVING CASE FILE',
          },
          {
            icon: CheckCircle2,
            label: 'NEXT STEP',
            title: 'Move forward with clarity.',
            text: 'Receive the questions, evidence gaps and next actions to discuss with your real clinician.',
            stat: 'DOCTOR-READY BRIEF',
          },
        ]
      : [
          {
            icon: Stethoscope,
            label: 'WHY PARALLEL',
            title: 'Different specialists notice different signals.',
            text: 'The review surfaces overlaps and disagreements instead of forcing one early answer.',
            stat: 'INDEPENDENT VIEWS',
          },
          {
            icon: Layers,
            label: 'THEN MDT',
            title: 'Use MDT for deeper correlation.',
            text: 'When evidence grows, take your parallel findings into an MDT consensus review.',
            stat: 'YOUR NEXT PREMIUM STEP',
          },
          {
            icon: FileText,
            label: 'YOU STAY IN CONTROL',
            title: 'Correct the case as it evolves.',
            text: 'Add a report, clarify an answer, or reopen the review whenever something changes.',
            stat: 'EVIDENCE-FIRST REVIEW',
          },
        ];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setActive((current) => (current + 1) % frames.length), 10000);
    return () => clearInterval(timer);
  }, [frames.length]);
  const frame = frames[active];
  const Icon = frame.icon;
  return (
    <aside
      className={`parallel-rail parallel-rail--${side}`}
      aria-label="Parallel Specialists overview"
    >
      <div className="parallel-rail__network" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
        >
          <div className="parallel-rail__icon">
            <Icon size={19} />
          </div>
          <div className="parallel-rail__label">{frame.label}</div>
          <h3>{frame.title}</h3>
          <p>{frame.text}</p>
          <div className="parallel-rail__stat">{frame.stat}</div>
        </motion.div>
      </AnimatePresence>
      <div className="parallel-rail__dots">
        {frames.map((_, index) => (
          <span key={index} className={index === active ? 'active' : ''} />
        ))}
      </div>
    </aside>
  );
}
