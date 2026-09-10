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
import { getProfile, getProfileKey } from '../../services/ProfileEngine';
import { getActiveCase, addCaseEvent, getCase } from '../../services/CaseEngine';
import { getFunctionalBiomarkers, FunctionalBiomarker } from '../../services/ConnectionDetectiveEngine';
import { getSuspectFoodsLeaderboard, getActiveTrial, ActiveTrialState } from '../../services/TriggerEngine';
import { recordHealthMemory } from '../../services/HealthMemory';
import { evaluateEmergencyTriage, TriageEvaluation } from '../../services/clinicalTriageEngine';
import { EmergencyTriageModal } from '../../components/ui/EmergencyTriageModal';
import { ConnectionDetectiveModal } from '../../components/ui/ConnectionDetectiveModal';
import { getItemSync, setItemSync, removeItemSync } from '../../services/storage';

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
  caseId?: string;
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
  const [showConnectionDetective, setShowConnectionDetective] = useState(false);

  // Filtering & Post Input
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'cardio' | 'gastro' | 'immuno' | 'metabolic'>('all');
  const draftKey = `${getProfileKey()}_canvas_draft`;
  const [observationInput, setObservationInput] = useState(() => {
    try { return sessionStorage.getItem(draftKey) || ''; } catch { return ''; }
  });
  const previousDraftKey = useRef(draftKey);
  useEffect(() => {
    try {
      if (previousDraftKey.current !== draftKey) {
        previousDraftKey.current = draftKey;
        setObservationInput(sessionStorage.getItem(draftKey) || '');
        return;
      }
      if (observationInput) sessionStorage.setItem(draftKey, observationInput);
      else sessionStorage.removeItem(draftKey);
    } catch { /* Keep the current draft in memory if storage is unavailable. */ }
  }, [observationInput, draftKey]);
  const [updateType, setUpdateType] = useState('Observation');
  const [savedCase, setSavedCase] = useState<{ id: string; title: string } | null>(null);
  const [saveError, setSaveError] = useState('');
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<string | null>(null);

  // Initialize Observations from real profile data or storage
  const [observations, setObservations] = useState<CanvasObservation[]>(() => {
    try {
      const stored = getItemSync(STORAGE_KEY_OBSERVATIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Purge legacy hardcoded mock observations
        if (Array.isArray(parsed) && parsed.some((p: any) => 
          p.id?.startsWith('obs_init_') || 
          p.authorName?.includes('Sarah Jenkins') || 
          p.authorName?.includes('Marcus Vance') || 
          p.authorName?.includes('Julian Rivera') ||
          p.authorName?.includes('Elena Rostova')
        )) {
          removeItemSync(STORAGE_KEY_OBSERVATIONS);
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }

    // If active case has real reviews, map them
    if (activeCase && Array.isArray(activeCase.reviews) && activeCase.reviews.length > 0) {
      return activeCase.reviews.map((rev: any, idx: number) => ({
        id: rev.id || `obs_case_${idx}`,
        author: 'physician',
        authorName: rev.specialists?.[0]?.name || 'Attending Physician',
        title: rev.report?.clinicalImpression || activeCase.title,
        content: rev.report?.summary || rev.report?.findings || 'Case review findings recorded.',
        timestamp: rev.createdAt || 'Recent',
        specialty: 'cardio',
        isPinned: idx === 0,
        replies: []
      }));
    }

    // Default clean welcoming orientation card for rounds
    return [
      {
        id: 'obs_welcome_canvas',
        author: 'physician',
        authorName: 'Ava (Clinical AI Coordinator)',
        title: 'Collaborative Multi-Specialist Canvas Ready',
        content: 'Welcome to your Multi-Specialist Health Canvas. As you consult with specialists (Cardiology, Gastroenterology, Immunology, Functional Medicine) or upload diagnostic lab panels, cross-system findings, baroreflex analyses, and clinical consensus will synchronize here in real time.',
        timestamp: 'Just now',
        specialty: 'cardio',
        isPinned: true,
        replies: [],
        actionPrompt: 'I would like to start a clinical intake consultation for my symptoms with Ava.',
        actionLabel: 'Start Clinical Consultation',
        actionRoute: '/app/consult'
      }
    ];
  });

  // Initialize Documents from actual clinical records
  const [documents, setDocuments] = useState<CanvasDocument[]>(() => {
    try {
      const stored = getItemSync(STORAGE_KEY_DOCS);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Purge legacy mock PDF
        if (Array.isArray(parsed) && parsed.some((p: any) => p.id === 'doc_init_1' || p.name?.includes('Comprehensive_Metabolic_Panel.pdf'))) {
          removeItemSync(STORAGE_KEY_DOCS);
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }

    const userRecords = (activeCase as any)?.medicalRecords || (profile as any)?.medicalRecords || [];
    if (Array.isArray(userRecords) && userRecords.length > 0) {
      return userRecords.map((r: any, idx: number) => ({
        id: r.id || `doc_rec_${idx}`,
        name: r.name || r.title || `Clinical_Record_${idx + 1}.pdf`,
        size: r.size || '1.4 MB',
        uploadedAt: r.date || r.uploadedAt || 'Synced with Case',
        status: 'analyzed' as const,
        summary: r.summary || `Extracted clinical records synced with ${activeCase?.title || 'active case'}.`
      }));
    }
    return [];
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
  const handleCreateObservation = async () => {
    const text = observationInput.trim();
    if (!text || isSubmitting || submittingRef.current) return;
    setSaveError('');
    const targetCase = getActiveCase();
    if (!targetCase || !getCase(targetCase.id)) {
      setSaveError('Choose a case before saving this update. Your text is still here.');
      return;
    }

    // 1. Run Emergency Triage Pre-Screen
    const triage = evaluateEmergencyTriage(text);
    if (triage.isEmergency) {
      setEmergencyTriage(triage);
      setShowTriageModal(true);
      return;
    }

    setIsSubmitting(true);
    submittingRef.current = true;
    try {
    triggerHapticSelection();

    // 2. Classify Specialty deterministically
    const lower = text.toLowerCase();
    let specialty: 'cardio' | 'gastro' | 'immuno' | 'metabolic' = 'metabolic';
    let doctorName = 'Metabolic & Functional Medicine AI';
    let doctorBadgeColor = '#F59E0B';
    let specialistAnalysis = 'Bioenergetic & metabolic reserve assessment: review postprandial glucose dynamics, fasting insulin, and micronutrient cofactors.';

    if (/\b(tachycardia|heart|palpitat|rate|pot|orthostatic|dizzy|lighthead|standing|blood pressure|hrv|syncope)\b/i.test(lower)) {
      specialty = 'cardio';
      doctorName = 'Cardiology & Autonomic Specialist AI';
      doctorBadgeColor = '#EF4444';
      specialistAnalysis = 'Autonomic & baroreflex triage: review standing heart rate transitions, orthostatic blood pressure stability, and hydration status.';
    } else if (/\b(bloat|distension|gut|stomach|gas|reflux|gerd|bowel|abdominal|cramp|constipat|diarrhea|fodmap|nausea)\b/i.test(lower)) {
      specialty = 'gastro';
      doctorName = 'Functional Gastroenterology AI';
      doctorBadgeColor = '#0D9488';
      specialistAnalysis = 'Enteric motility & fermentation triage: review food timing, FODMAP sensitivity, and transit-rate correlations.';
    } else if (/\b(histamine|rash|itch|flush|hive|allergy|sinus|headache|mast cell|mcas|sneez)\b/i.test(lower)) {
      specialty = 'immuno';
      doctorName = 'Clinical Immunology & Allergy AI';
      doctorBadgeColor = '#8B5CF6';
      specialistAnalysis = 'Histamine & mediator clearance triage: evaluate biogenic amine threshold, DAO enzyme cofactors, and allergic cascade timing.';
    }

    const patientName = profile?.name || profile?.demographics?.name || 'You';
    const newObsId = 'obs_' + Date.now();

    const newEntry: CanvasObservation = {
      id: newObsId,
      caseId: targetCase.id,
      author: 'user',
      authorName: patientName,
      title: `${updateType}: ${text.length > 50 ? text.slice(0, 48) + '...' : text}`,
      content: text,
      timestamp: new Date().toLocaleString(),
      specialty,
      isPinned: false,
      replies: [],
      actionPrompt: `Help me discuss this ${updateType.toLowerCase()} from my case: "${text}".`,
      actionLabel: 'Discuss with Ava',
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
        updateType,
        caseId: targetCase.id
      }
    });

    addCaseEvent(targetCase.id, text, `Health Canvas: ${updateType}`);
    setObservations(prev => [newEntry, ...prev]);
    setSavedCase({ id: targetCase.id, title: targetCase.title });
    setObservationInput('');
    triggerHapticSuccess();
    } catch {
      setSaveError('This update could not be saved. Your text is still here; please try again.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
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

  const patientDisplayName = profile?.name || profile?.demographics?.name || 'Patient';
  const activeCaseTitle = activeCase?.title || 'No Active Consultation';
  const activeTrialTitle = activeTrial 
    ? `${activeTrial.trialId.replace(/_/g, ' ').toUpperCase()} (Day ${activeTrial.currentDay}/${activeTrial.totalDays} · -${activeTrial.reductionPercent}% flares)`
    : 'No Active Protocol';

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100%', 
      maxWidth: '100vw', 
      background: '#F8FAFC', 
      paddingBottom: '120px', 
      overflowX: 'hidden', 
      boxSizing: 'border-box' 
    }}>
      
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
        padding: isMobile ? 'calc(env(safe-area-inset-top, 0px) + 12px) 14px 12px' : '18px 24px',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(226, 232, 240, 0.85)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
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
        padding: isMobile ? '14px 12px 100px' : '24px 20px 100px', 
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
                  onClick={() => { triggerHapticLight(); setShowConnectionDetective(true); }}
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
                  Connection Map
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
                Add a case update
              </h2>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748B' }}>
                Health Canvas keeps observations, questions and appointment outcomes together. Use Ava when you want to talk them through.
              </p>
            </div>
          </div>

          {/* Quick Scenario Chips */}
          <label style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
            What are you recording?{' '}
            <select value={updateType} onChange={e => setUpdateType(e.target.value)}>
              {['Observation', 'Measurement', 'Question', 'Appointment outcome'].map(type => <option key={type}>{type}</option>)}
            </select>
          </label>
          {saveError && <p role="alert">{saveError} <button type="button" onClick={() => navigate('/app/my-cases')}>My Cases</button></p>}
          {savedCase && <div role="status" style={{ marginBottom: 12, fontSize: 13 }}>
            Saved to {savedCase.title}.{' '}
            <button type="button" onClick={() => navigate(`/app/cases/${encodeURIComponent(savedCase.id)}`)}>View case timeline</button>{' '}
            <button type="button" onClick={() => navigate(`/app/case-prep?caseId=${encodeURIComponent(savedCase.id)}`)}>Prepare for your visit</button>
          </div>}
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
                  handleCreateObservation();
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
              onClick={handleCreateObservation}
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
        <section aria-label="Ingested Clinical Documents">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCheck size={16} color="#3B82F6" /> Connected Lab Reports & Vitals
            </h3>
            {documents.length > 0 && (
              <button
                type="button"
                onClick={() => { triggerHapticLight(); navigate('/app/medicine-lab#clinical-report-analyzer'); }}
                style={{ background: 'none', border: 'none', fontSize: '12px', color: '#0D9488', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Full Lab Analyzer <ChevronRight size={13} />
              </button>
            )}
          </div>

          {documents.length === 0 ? (
            <div style={{
              background: '#FFF',
              borderRadius: '16px',
              padding: '16px 18px',
              border: '1.5px dashed #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color="#94A3B8" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                    No Lab Reports Attached Yet
                  </div>
                  <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                    Attach blood work or diagnostic PDFs to extract biomarkers for multi-specialist rounds
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
                  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#FFF',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(13, 148, 136, 0.2)'
                }}
              >
                + Attach Lab Report
              </button>
            </div>
          ) : (
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
          )}
        </section>

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
                <div style={{ 
                  display: 'flex', 
                  gap: '8px', 
                  flexDirection: isMobile ? 'column' : 'row',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {obs.actionPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        if (obs.actionRoute === 'detective_modal') {
                          setShowConnectionDetective(true);
                        } else if (obs.actionRoute) {
                          navigate(obs.actionRoute, {
                            state: {
                              initialPrompt: obs.actionPrompt,
                              caseId: obs.caseId || activeCase?.id,
                              tab: obs.actionTab
                            }
                          });
                        }
                      }}
                      style={{
                        flex: 1,
                        width: isMobile ? '100%' : 'auto',
                        padding: '11px 14px',
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
                      width: isMobile ? '100%' : 'auto',
                      padding: '11px 14px',
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
              onClick={() => { triggerHapticLight(); setShowConnectionDetective(true); }}
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

      {/* Connection Detective Modal */}
      <ConnectionDetectiveModal
        isOpen={showConnectionDetective}
        onClose={() => setShowConnectionDetective(false)}
        onOpenFoodDetective={() => navigate('/app/dietician', { state: { tab: 'elimination' } })}
        onOpenConsult={() => navigate('/app/consult')}
      />

      {/* Emergency Triage Modal Guardrail */}
      <EmergencyTriageModal
        isOpen={showTriageModal}
        triage={emergencyTriage}
        onClose={() => setShowTriageModal(false)}
      />

    </div>
  );
}
