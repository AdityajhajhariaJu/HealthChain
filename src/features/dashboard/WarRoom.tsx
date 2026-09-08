import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  User,
  Stethoscope,
  Sparkles,
  MessageCircle,
  ArrowLeft,
  Pin,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  GitMerge,
  Filter,
  FileCheck,
  Calendar,
  Activity,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  ClipboardList,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getProfile } from '../../services/ProfileEngine';
import { getActiveCase } from '../../services/CaseEngine';
import { getFunctionalBiomarkers, FunctionalBiomarker } from '../../services/ConnectionDetectiveEngine';
import { getSuspectFoodsLeaderboard, getActiveTrial, ActiveTrialState } from '../../services/TriggerEngine';
import { recordHealthMemory } from '../../services/HealthMemory';
import { evaluateEmergencyTriage, TriageEvaluation } from '../../services/clinicalTriageEngine';
import { EmergencyTriageModal } from '../../components/ui/EmergencyTriageModal';
import { getItemSync, setItemSync } from '../../services/storage';

interface ObservationReply {
  author: string;
  role: string;
  badgeColor: string;
  avatarBg: string;
  content: string;
  timestamp: string;
}

interface CanvasObservation {
  id: string;
  author: 'user' | 'physician' | 'system';
  authorName: string;
  title: string;
  content: string;
  timestamp: string;
  specialty: 'cardio' | 'gastro' | 'immuno' | 'metabolic';
  isPinned?: boolean;
  replies: ObservationReply[];
  actionPrompt?: string;
  actionLabel?: string;
  actionRoute?: string;
  actionTab?: string;
}

interface CanvasDocument {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  status: 'analyzed' | 'pending' | 'reviewed';
  summary: string;
}

const STORAGE_KEY_OBSERVATIONS = 'hc_war_room_observations_v2';
const STORAGE_KEY_DOCS = 'hc_war_room_documents_v2';

const QUICK_CLINICAL_CHIPS = [
  {
    label: '🫀 Postprandial Tachycardia',
    text: 'Experienced palpitations and rapid heart rate 40 minutes after lunch with dizziness on standing.'
  },
  {
    label: '🫧 Abdominal Distension',
    text: 'Severe upper epigastric bloating and gas distension 45 minutes post-meal, feeling like diaphragm pressure.'
  },
  {
    label: '⚡ Postural Lightheadedness',
    text: 'Sudden lightheadedness, brain fog, and blurred vision when standing from desk after prolonged sitting.'
  },
  {
    label: '🍷 Histamine Reaction',
    text: 'Facial flushing, sinus congestion, and throbbing temporal headache within 2 hours of fermented/aged food intake.'
  }
];

export default function WarRoom() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Live profile & clinical data
  const [profile, setProfile] = useState(() => getProfile());
  const [activeCase, setActiveCase] = useState(() => getActiveCase());
  const [biomarkers, setBiomarkers] = useState<FunctionalBiomarker[]>(() => getFunctionalBiomarkers());
  const [activeTrial, setActiveTrial] = useState<ActiveTrialState | null>(() => getActiveTrial());
  const [suspectFoods, setSuspectFoods] = useState(() => getSuspectFoodsLeaderboard());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(getProfile());
      setActiveCase(getActiveCase());
      setBiomarkers(getFunctionalBiomarkers());
      setActiveTrial(getActiveTrial());
      setSuspectFoods(getSuspectFoodsLeaderboard());
    };
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    window.addEventListener('hc_biomarkers_updated', handleProfileUpdate);
    window.addEventListener('hc_triggers_updated', handleProfileUpdate);
    window.addEventListener('hc_cases_updated', handleProfileUpdate);
    return () => {
      window.removeEventListener('hc_profile_updated', handleProfileUpdate);
      window.removeEventListener('hc_biomarkers_updated', handleProfileUpdate);
      window.removeEventListener('hc_triggers_updated', handleProfileUpdate);
      window.removeEventListener('hc_cases_updated', handleProfileUpdate);
    };
  }, []);

  // Interactive Modals
  const [emergencyTriage, setEmergencyTriage] = useState<TriageEvaluation | null>(null);
  const [showTriageModal, setShowTriageModal] = useState(false);

  // Filtering & Post Input
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'cardio' | 'gastro' | 'immuno' | 'metabolic'>('all');
  const [observationInput, setObservationInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<string | null>(null);

  // Initialize Observations from real profile data or storage
  const [observations, setObservations] = useState<CanvasObservation[]>(() => {
    try {
      const stored = getItemSync(STORAGE_KEY_OBSERVATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }

    const patientName = profile?.name || profile?.demographics?.name || 'Aditya';
    const caseTitle = activeCase?.title || 'Autonomic & Postprandial Multi-System Profiling';
    const ferritin = biomarkers.find(b => b.id === 'ferritin');
    const topTrigger = suspectFoods[0]?.name || 'Fermented & High-FODMAP foods';
    const trialName = activeTrial?.trialId ? activeTrial.trialId.replace('_', ' ').toUpperCase() : 'LOW-HISTAMINE PROTOCOL';

    return [
      {
        id: 'obs_init_cardio',
        author: 'physician',
        authorName: 'Dr. Sarah Jenkins (Cardiology & Autonomics)',
        title: 'Postprandial Splanchnic Blood Pooling & Baroreflex',
        content: `Reviewing ${patientName}'s autonomic markers under case "${caseTitle}". When blood pools in the mesenteric circulation post-meal, venous return drops precipitously, triggering compensatory orthostatic tachycardia. Monitoring diurnal HRV and upright heart rate delta.`,
        timestamp: '2 hours ago',
        specialty: 'cardio',
        isPinned: true,
        replies: [
          {
            author: 'Ava (Clinical AI Coordinator)',
            role: 'Clinical AI Coordinator',
            badgeColor: '#0D9488',
            avatarBg: 'rgba(13, 148, 136, 0.12)',
            content: 'Logged. Correlating symptom timeline with active hydration protocol (goal: 2,500 mL) and sodium intake. Upright HR delta currently tracked in daily check-ins.',
            timestamp: '1 hour ago'
          }
        ],
        actionPrompt: 'I would like to discuss my postprandial heart rate spikes and Dr. Jenkins\' recommendation for splanchnic pooling with Ava.',
        actionLabel: 'Discuss with Ava',
        actionRoute: '/app/ava'
      },
      {
        id: 'obs_init_gastro',
        author: 'physician',
        authorName: 'Dr. Marcus Vance (Functional Gastroenterology)',
        title: `Active Elimination Phase: ${trialName}`,
        content: `Targeted elimination trial is currently active (Day ${activeTrial?.currentDay || 4} of ${activeTrial?.totalDays || 7}). Suspect food correlation flagged ${topTrigger} with elevated post-meal symptom scores. Continuing strict washout phase to prevent visceral mechanoreceptor distension.`,
        timestamp: '4 hours ago',
        specialty: 'gastro',
        isPinned: true,
        replies: [
          {
            author: 'Ava (Clinical AI Coordinator)',
            role: 'Clinical AI Coordinator',
            badgeColor: '#0D9488',
            avatarBg: 'rgba(13, 148, 136, 0.12)',
            content: `Active adherence currently at ${activeTrial?.adherencePercentage || 92}%. Symptoms show a ${activeTrial?.reductionPercent || 57}% delta from baseline. Monash Low-FODMAP and low-biogenic amine guardrails remain engaged.`,
            timestamp: '3 hours ago'
          }
        ],
        actionPrompt: 'Take me to the elimination protocol suite to review my active rechallenge calendar and safe food swaps.',
        actionLabel: 'Open Elimination Protocol',
        actionRoute: '/app/dietician',
        actionTab: 'elimination'
      },
      {
        id: 'obs_init_metabolic',
        author: 'physician',
        authorName: 'Dr. Julian Rivera (Metabolic & Functional Medicine)',
        title: 'Functional Biomarker Discordance: Ferritin & Cellular Iron',
        content: `Biomarker evaluation indicates Serum Ferritin at ${ferritin?.userValue ?? 14} ng/mL (optimal threshold: 50–90 ng/mL). Standard CBC appeared falsely reassuring, but bone marrow iron deficit impairs mitochondrial electron transport and exacerbates orthostatic cerebral hypoperfusion.`,
        timestamp: 'Yesterday',
        specialty: 'metabolic',
        isPinned: false,
        replies: [
          {
            author: 'Ava (Clinical AI Coordinator)',
            role: 'Clinical AI Coordinator',
            badgeColor: '#0D9488',
            avatarBg: 'rgba(13, 148, 136, 0.12)',
            content: 'Cross-system root cause map updated. Subclinical iron depletion added to Connection Detective cross-system cascade.',
            timestamp: 'Yesterday'
          }
        ],
        actionPrompt: 'Open Connection Detective to inspect the full biochemical mechanism connecting ferritin, autonomic tone, and gut transit.',
        actionLabel: 'Inspect Root Cause Map',
        actionRoute: 'detective_modal'
      }
    ];
  });

  // Initialize Documents
  const [documents, setDocuments] = useState<CanvasDocument[]>(() => {
    try {
      const stored = getItemSync(STORAGE_KEY_DOCS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'doc_init_1',
        name: 'Comprehensive_Metabolic_Iron_Panel_Q3.pdf',
        size: '1.4 MB',
        uploadedAt: 'Yesterday at 4:15 PM',
        status: 'analyzed',
        summary: 'Analyzed by Ava AI · Ferritin depleted (14 ng/mL), Free T3 conversion lag (2.4 pg/mL), hs-CRP baseline normal.'
      }
    ];
  });

  // Save observations & documents to storage
  useEffect(() => {
    try {
      setItemSync(STORAGE_KEY_OBSERVATIONS, JSON.stringify(observations));
    } catch {
      // ignore
    }
  }, [observations]);

  useEffect(() => {
    try {
      setItemSync(STORAGE_KEY_DOCS, JSON.stringify(documents));
    } catch {
      // ignore
    }
  }, [documents]);

  // Handle Post Observation
  const handlePostObservation = () => {
    const text = observationInput.trim();
    if (!text) return;

    // 1. Emergency Safety Triage Check (< 2ms zero-token guardrail)
    const triage = evaluateEmergencyTriage(text);
    if (triage.isEmergency) {
      setEmergencyTriage(triage);
      setShowTriageModal(true);
      return;
    }

    setIsSubmitting(true);
    triggerHapticSelection();

    // 2. Classify Specialty deterministically
    const lower = text.toLowerCase();
    let specialty: 'cardio' | 'gastro' | 'immuno' | 'metabolic' = 'metabolic';
    let doctorName = 'Dr. Julian Rivera (Metabolic & Functional Medicine)';
    let doctorBadgeColor = '#F59E0B';
    let specialistAnalysis = 'Likely bioenergetic or metabolic reserve shift — review postprandial glucose curve and recent micronutrient intake.';

    if (/\b(tachycardia|heart|palpitat|rate|pot|orthostatic|dizzy|lighthead|standing|blood pressure|hrv|syncope)\b/i.test(lower)) {
      specialty = 'cardio';
      doctorName = 'Dr. Sarah Jenkins (Cardiology & Autonomics)';
      doctorBadgeColor = '#EF4444';
      specialistAnalysis = 'Likely splanchnic-mediated tachycardia — log standing HR for 10 min and hydrate with electrolytes before next meal.';
    } else if (/\b(bloat|distension|gut|stomach|gas|reflux|gerd|bowel|abdominal|cramp|constipat|diarrhea|fodmap|nausea)\b/i.test(lower)) {
      specialty = 'gastro';
      doctorName = 'Dr. Marcus Vance (Functional Gastroenterology)';
      doctorBadgeColor = '#0D9488';
      specialistAnalysis = 'Possible rapid fermentation transit or visceral hypersensitivity — log exact meal ingredients to cross-check elimination trial.';
    } else if (/\b(histamine|rash|itch|flush|hive|allergy|sinus|headache|mast cell|mcas|sneez)\b/i.test(lower)) {
      specialty = 'immuno';
      doctorName = 'Dr. Elena Rostova (Clinical Immunology & Allergy)';
      doctorBadgeColor = '#8B5CF6';
      specialistAnalysis = 'Suspect acute histamine saturation or mediator release — review dietary intake over last 6 hours and ensure DAO support.';
    }

    const patientName = profile?.name || profile?.demographics?.name || 'You';
    const newObsId = 'obs_' + Date.now();

    const newEntry: CanvasObservation = {
      id: newObsId,
      author: 'user',
      authorName: patientName,
      title: text.length > 50 ? text.slice(0, 48) + '...' : text,
      content: text,
      timestamp: 'Just now',
      specialty,
      isPinned: false,
      replies: [
        {
          author: doctorName,
          role: 'Attending Specialist',
          badgeColor: doctorBadgeColor,
          avatarBg: doctorBadgeColor + '18',
          content: specialistAnalysis,
          timestamp: 'Just now'
        },
        {
          author: 'Ava (Clinical AI Coordinator)',
          role: 'Clinical AI Coordinator',
          badgeColor: '#0D9488',
          avatarBg: 'rgba(13, 148, 136, 0.12)',
          content: `✓ Logged. Cross-referenced with your active case.`,
          timestamp: 'Just now'
        }
      ],
      actionPrompt: `I would like to discuss my recent observation: "${text}" and the feedback from ${doctorName} with Ava.`,
      actionLabel: 'Discuss in Deep Consult with Ava',
      actionRoute: '/app/ava'
    };

    // 3. Record in Health Memory
    recordHealthMemory({
      kind: 'deep_collab',
      source: 'WarRoom',
      title: `Canvas Observation: ${text.slice(0, 40)}`,
      occurredAt: new Date().toISOString(),
      payload: {
        observation: text,
        specialty,
        doctorFeedback: specialistAnalysis,
        caseId: activeCase?.id
      }
    });

    setObservations(prev => [newEntry, ...prev]);
    setObservationInput('');
    setIsSubmitting(false);
    triggerHapticSuccess();
  };

  // Handle Document File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHapticSelection();
    const sizeStr = file.size > 1048576 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    const newDoc: CanvasDocument = {
      id: 'doc_' + Date.now(),
      name: file.name,
      size: sizeStr,
      uploadedAt: 'Just now',
      status: 'analyzed',
      summary: 'Document ingested into Collaborative Health Memory. Ready for automated biomarker extraction in Clinical Report Analyzer.'
    };

    recordHealthMemory({
      kind: 'lab_report',
      source: 'WarRoom',
      title: `Uploaded Lab Document: ${file.name}`,
      occurredAt: new Date().toISOString(),
      payload: {
        fileName: file.name,
        fileSize: sizeStr,
        fileType: file.type
      }
    });

    setDocuments(prev => [newDoc, ...prev]);
    setUploadSuccessNotice(`"${file.name}" uploaded successfully! Tap to open in Analyzer.`);
    triggerHapticSuccess();

    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => {
      setUploadSuccessNotice(null);
    }, 6000);
  };

  // Delete Observation
  const handleDeleteObservation = (id: string) => {
    triggerHapticLight();
    setObservations(prev => prev.filter(o => o.id !== id));
  };

  // Filtered observations
  const filteredObservations = selectedFilter === 'all' 
    ? observations 
    : observations.filter(o => o.specialty === selectedFilter);

  const patientDisplayName = profile?.name || profile?.demographics?.name || 'Aditya (Patient)';
  const activeCaseTitle = activeCase?.title || 'Multi-System Autonomic & Gut Profiling';
  const activeTrialTitle = activeTrial 
    ? `${activeTrial.trialId.replace('_', ' ').toUpperCase()} (Day ${activeTrial.currentDay}/${activeTrial.totalDays} · -${activeTrial.reductionPercent}% flares)`
    : 'MONASH PROTOCOL (Active)';

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', paddingBottom: '120px' }}>
      
      {/* Hidden File Input for Real Document Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".pdf,.png,.jpg,.jpeg,.txt,.csv" 
        style={{ display: 'none' }} 
      />

      {/* Sticky Premium Header */}
      <header style={{
        padding: isMobile ? 'calc(env(safe-area-inset-top, 12px) + 8px) 14px 10px' : '20px 24px',
        background: 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        width: '100%',
        boxSizing: 'border-box',
        gap: '8px'
      }}>
        {/* Left: Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flex: 1, minWidth: 0 }}>
          <button 
            type="button"
            aria-label="Back to previous screen"
            onClick={() => { 
              triggerHapticLight(); 
              if (window.history.length > 1) navigate(-1);
              else navigate('/app/today'); 
            }}
            style={{ 
              width: '38px', 
              height: '38px', 
              minWidth: '38px', 
              minHeight: '38px', 
              borderRadius: '50%', 
              background: '#F1F5F9', 
              border: '1px solid #E2E8F0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'background 0.15s ease'
            }}
          >
            <ArrowLeft size={18} color="#0F172A" />
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <h1 style={{ 
                fontSize: isMobile ? '15.5px' : '19px', 
                fontWeight: 800, 
                margin: 0, 
                color: '#0F172A', 
                letterSpacing: '-0.3px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                Health Canvas
              </h1>
              <span style={{
                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: '999px',
                fontSize: '9.5px',
                fontWeight: 800,
                letterSpacing: '0.4px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                flexShrink: 0
              }}>
                <Sparkles size={9} /> ROUNDS
              </span>
            </div>
            <p style={{ 
              margin: '1px 0 0', 
              fontSize: '11px', 
              color: '#64748B', 
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Multi-Specialist Rounds Board
            </p>
          </div>
        </div>

        {/* Right Actions: Doctor Brief + Close (Cross) Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <button
            type="button"
            aria-label="Open Physician Dossier Brief"
            onClick={() => {
              triggerHapticSelection();
              navigate('/app/consult', { state: { tab: 'dossier' } });
            }}
            style={{
              height: '38px',
              width: isMobile ? '38px' : 'auto',
              minWidth: '38px',
              padding: isMobile ? '0' : '0 12px',
              borderRadius: isMobile ? '50%' : '10px',
              background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
              color: '#FFF',
              border: 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(13, 148, 136, 0.25)',
              flexShrink: 0
            }}
          >
            <ClipboardList size={16} />
            {!isMobile && <span>Doctor Brief</span>}
          </button>

          <button
            type="button"
            aria-label="Close Health Canvas"
            onClick={() => {
              triggerHapticLight();
              navigate('/app/today');
            }}
            style={{
              width: '38px',
              height: '38px',
              minWidth: '38px',
              minHeight: '38px',
              borderRadius: '50%',
              background: '#F1F5F9',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              transition: 'background 0.15s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ 
        maxWidth: '1024px', 
        width: '100%', 
        margin: '0 auto', 
        boxSizing: 'border-box',
        padding: isMobile ? '16px 14px 100px' : '24px 20px 100px', 
        display: 'grid', 
        gap: '16px',
        overflowX: 'hidden'
      }}>

        {/* Live Patient Surveillance Status Banner */}
        <section 
          aria-label="Clinical Surveillance Summary"
          style={{
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            borderRadius: isMobile ? '20px' : '24px',
            padding: isMobile ? '16px 14px' : '22px 24px',
            color: '#FFF',
            boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
            position: 'relative',
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', color: '#94A3B8', textTransform: 'uppercase' }}>
                  Live Clinical State · {patientDisplayName}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => { triggerHapticLight(); navigate('/app/consult'); }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#E2E8F0',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <GitMerge size={12} color="#818CF8" />
                  Root Cause Map
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.08)', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Active Clinical Case</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F8FAFC', wordBreak: 'break-word', lineHeight: 1.3 }}>{activeCaseTitle}</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.06)', borderRadius: '14px', padding: '12px 14px', border: '1px solid rgba(255, 255, 255, 0.08)', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Active Elimination Phase</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#38BDF8', wordBreak: 'break-word', lineHeight: 1.3 }}>{activeTrialTitle}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive "Post Clinical Observation" Input Dock */}
        <section
          aria-label="Post Clinical Observation Form"
          style={{
            background: '#FFF',
            borderRadius: '24px',
            padding: isMobile ? '18px 16px' : '22px 24px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(226, 232, 240, 0.8)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Stethoscope size={18} color="#0D9488" />
            </div>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                Post Clinical Observation to Rounds
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Instant zero-token emergency triage check · Synthesizes specialist commentary immediately
              </p>
            </div>
          </div>

          {/* Quick Scenario Chips */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              Quick Clinical Scenarios:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {QUICK_CLINICAL_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    setObservationInput(chip.text);
                  }}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Area Input */}
          <div style={{ position: 'relative' }}>
            <textarea
              value={observationInput}
              onChange={(e) => setObservationInput(e.target.value)}
              placeholder="Describe acute flare, meal reaction, blood pressure/HR delta, or clinical question for specialists..."
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '16px',
                border: '1.5px solid #E2E8F0',
                padding: '14px 14px',
                fontSize: '14px',
                color: '#0F172A',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                background: '#FAFAFA'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handlePostObservation();
                }
              }}
            />
          </div>

          {/* Submit Dock Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #CBD5E1',
                  borderRadius: '12px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <UploadCloud size={15} color="#3B82F6" />
                Attach Lab Report (PDF/IMG)
              </button>
            </div>

            <button
              type="button"
              disabled={isSubmitting || !observationInput.trim()}
              onClick={handlePostObservation}
              style={{
                background: !observationInput.trim() ? '#94A3B8' : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '12px',
                padding: '9px 18px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: !observationInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: !observationInput.trim() ? 'none' : '0 4px 12px rgba(13, 148, 136, 0.25)'
              }}
            >
              <Send size={14} />
              Submit to Canvas
            </button>
          </div>

          {/* Upload Success Alert Toast */}
          {uploadSuccessNotice && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#065F46',
                fontWeight: 600
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>{uploadSuccessNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => { triggerHapticLight(); navigate('/app/medicine-lab#clinical-report-analyzer'); }}
                style={{
                  background: '#059669',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Analyze Now
              </button>
            </motion.div>
          )}
        </section>

        {/* Real Documents & Lab Reports Section */}
        {documents.length > 0 && (
          <section aria-label="Ingested Clinical Documents">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCheck size={16} color="#3B82F6" /> Connected Lab Reports & Vitals
              </h3>
              <button
                type="button"
                onClick={() => { triggerHapticLight(); navigate('/app/medicine-lab#clinical-report-analyzer'); }}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#0D9488', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Full Lab Analyzer <ChevronRight size={13} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    background: '#FFF',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    border: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={18} color="#3B82F6" />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {doc.size} · Uploaded {doc.uploadedAt}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      navigate('/app/medicine-lab#clinical-report-analyzer');
                    }}
                    style={{
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      borderRadius: '10px',
                      padding: '7px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#0F172A',
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Open in Analyzer
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Specialty Filter Tabs */}
        <section 
          aria-label="Specialty Filter Tabs" 
          className="hide-scrollbar"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '4px',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '4px', flexShrink: 0 }}>
            <Filter size={13} /> Filter:
          </div>
          {[
            { id: 'all', label: 'All Rounds' },
            { id: 'cardio', label: '🫀 Cardiology / Autonomics' },
            { id: 'gastro', label: '🫧 Gastroenterology' },
            { id: 'immuno', label: '🧬 Immunology' },
            { id: 'metabolic', label: '⚡ Metabolic Health' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => {
                triggerHapticLight();
                setSelectedFilter(f.id as any);
              }}
              style={{
                background: selectedFilter === f.id ? '#0F172A' : '#FFF',
                color: selectedFilter === f.id ? '#FFF' : '#475569',
                border: '1px solid ' + (selectedFilter === f.id ? '#0F172A' : '#E2E8F0'),
                borderRadius: '999px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              {f.label}
            </button>
          ))}
        </section>

        {/* Collaborative Observation Threads Feed */}
        <section aria-label="Collaborative Round Observations" style={{ display: 'grid', gap: '16px' }}>
          {filteredObservations.length === 0 ? (
            <div style={{ background: '#FFF', borderRadius: '20px', padding: '32px', textAlign: 'center', border: '1px dashed #CBD5E1' }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>No clinical observations found under this filter.</p>
            </div>
          ) : (
            filteredObservations.map((obs, idx) => (
              <motion.article
                key={obs.id}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={shouldReduceMotion ? { duration: 0 } : { delay: idx * 0.05, duration: 0.25 }}
                style={{
                  background: '#FFF',
                  borderRadius: '24px',
                  padding: isMobile ? '18px 16px' : '24px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.03)',
                  border: '1px solid rgba(226, 232, 240, 0.85)',
                  position: 'relative'
                }}
              >
                {/* Pin indicator */}
                {obs.isPinned && (
                  <Pin size={18} color="#EF4444" style={{ position: 'absolute', top: '16px', right: '18px', transform: 'rotate(25deg)' }} />
                )}

                {/* Observation Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: obs.author === 'user' ? '#EFF6FF' : '#F0FDFA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {obs.author === 'user' ? <User size={18} color="#3B82F6" /> : <Stethoscope size={18} color="#0D9488" />}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>
                        {obs.authorName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {obs.timestamp} · {obs.specialty.toUpperCase()} AXIS
                      </div>
                    </div>
                  </div>

                  {/* Delete button if user authored */}
                  {obs.author === 'user' && (
                    <button
                      type="button"
                      aria-label="Remove observation from canvas"
                      onClick={() => handleDeleteObservation(obs.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Main Content */}
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 8px', color: '#0F172A', lineHeight: 1.3 }}>
                  {obs.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#334155', margin: '0 0 16px', lineHeight: 1.5 }}>
                  {obs.content}
                </p>

                {/* Replies Thread */}
                {obs.replies && obs.replies.length > 0 && (
                  <div style={{ marginLeft: '12px', paddingLeft: '14px', borderLeft: '2px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {obs.replies.map((reply, rIdx) => (
                      <div key={rIdx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: reply.avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Sparkles size={14} color={reply.badgeColor} />
                        </div>
                        <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '14px', fontSize: '13px', color: '#334155', lineHeight: 1.5, flex: 1, border: '1px solid #F1F5F9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <strong style={{ color: reply.badgeColor, fontSize: '12px' }}>{reply.author}</strong>
                            <span style={{ fontSize: '10px', color: '#94A3B8' }}>{reply.timestamp}</span>
                          </div>
                          {reply.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Direct Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {obs.actionPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        if (obs.actionRoute === 'detective_modal') {
                          navigate('/app/consult');
                        } else if (obs.actionRoute) {
                          navigate(obs.actionRoute, {
                            state: {
                              initialPrompt: obs.actionPrompt,
                              tab: obs.actionTab
                            }
                          });
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: '160px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                        color: '#FFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)'
                      }}
                    >
                      <MessageCircle size={15} />
                      {obs.actionLabel || 'Discuss with Ava'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      navigate('/app/consult');
                    }}
                    style={{
                      flex: 1,
                      minWidth: '140px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <ClipboardList size={15} />
                    Dive Deeper
                  </button>
                </div>
              </motion.article>
            ))
          )}
        </section>

        {/* Bottom Quick Hub Navigation Bar */}
        <section
          aria-label="Clinical Navigation Directives"
          style={{
            background: 'linear-gradient(135deg, #F0FDFA 0%, #EFF6FF 100%)',
            borderRadius: '20px',
            padding: '16px 20px',
            border: '1px solid #CCFBF1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0F766E' }}>
              Multi-Specialist Clinical Hub
            </div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>
              Jump directly to connected deep-work engines
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => { triggerHapticLight(); navigate('/app/consult'); }}
              style={{
                background: '#FFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#4F46E5',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <GitMerge size={14} /> Connection Detective
            </button>
            <button
              type="button"
              onClick={() => { triggerHapticLight(); navigate('/app/dietician', { state: { tab: 'elimination' } }); }}
              style={{
                background: '#FFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0D9488',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Activity size={14} /> Elimination Protocol
            </button>
            <button
              type="button"
              onClick={() => { triggerHapticLight(); navigate('/app/consult', { state: { tab: 'consensus' } }); }}
              style={{
                background: '#FFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#0F172A',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <ShieldCheck size={14} /> Clinical Boards
            </button>
          </div>
        </section>

      </main>



      {/* Emergency Triage Modal Guardrail */}
      <EmergencyTriageModal
        isOpen={showTriageModal}
        triage={emergencyTriage}
        onClose={() => setShowTriageModal(false)}
      />

    </div>
  );
}
