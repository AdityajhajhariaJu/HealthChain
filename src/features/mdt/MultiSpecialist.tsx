import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveSession } from '../../services/authSession';
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
import { ALL_SPECIALISTS } from '../../data/specialists';
import { SpecialistPanel, SpecialistPill } from './MultiSpecialistComponents';
import { getRunScope, readRunJson, clearRunStorage } from '../../services/RunContext';

// Global cache
let cachedMultiSpecialistState: any = null;
try {
  const saved = sessionStorage.getItem(getRunScope('parallel', 'draft', 'ui'));
  if (saved) {
    const parsed = JSON.parse(saved);
    // Only a selection draft is safe to restore. Never restore a running or
    // completed AI workflow from a browser/native process restart.
    if (parsed?.phase === 'select') cachedMultiSpecialistState = parsed;
  }
} catch (e) {}

const cachedSpecialistStreams: any = {};


const CATEGORIES = ['Structural', 'Neurological', 'ENT & Head', 'Internal', 'Other'];



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
  const consensusInFlightRef = useRef(false);



  useEffect(() => {
    const stateObj = {
      phase, selected, activeSpecialistId, symptomInput, activeCategory, customSpecialists, completedSpecialists, aiSuggestion, workingCaseId
    };
    try {
      const key = getRunScope('parallel', 'draft', 'ui');
      if (phase === 'select') {
        cachedMultiSpecialistState = stateObj;
        sessionStorage.setItem(key, JSON.stringify(stateObj));
      } else {
        cachedMultiSpecialistState = null;
        sessionStorage.removeItem(key);
      }
    } catch(e) {}
  }, [phase, selected, activeSpecialistId, symptomInput, activeCategory, customSpecialists, completedSpecialists, aiSuggestion, workingCaseId]);

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
      cachedMultiSpecialistState = null;
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
    if (consensusInFlightRef.current || phase === 'correlating' || phase === 'report') return;
    consensusInFlightRef.current = true;
    setIsSessionPaused(false);
    setPhase('correlating');
    
    // Harvest the latest messages from the global cache for all selected specialists
    const currentTranscripts: any = {};
    selected.forEach((sId) => {
      const scopedKey = `${getRunScope('parallel', activeCase?.id || 'draft', 'session')}_${sId}`;
      currentTranscripts[sId] = cachedSpecialistStreams[scopedKey]?.messages || readRunJson<any>(scopedKey)?.messages || [];
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
    } finally {
      consensusInFlightRef.current = false;
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
    clearRunStorage('parallel', activeCase?.id);
  };

  useEffect(() => {
    const handleProfileChange = () => {
      cachedMultiSpecialistState = null;
      setPhase('select');
      setSelected([]);
      setActiveSpecialistId(null);
      setSymptomInput('');
      setCompletedSpecialists({});
      setSpecialistTranscripts({});
      setFinalReport(null);
      setWorkingCaseId(null);
      setSavedCaseId(null);
      setAiSuggestion(null);
      clearRunStorage('parallel');
      setActiveCase(getActiveCase());
    };
    window.addEventListener('hc_profile_updated', handleProfileChange);
    window.addEventListener('hc_logout', handleProfileChange);
    return () => {
      window.removeEventListener('hc_profile_updated', handleProfileChange);
      window.removeEventListener('hc_logout', handleProfileChange);
    };
  }, []);

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

  const handleStart = async () => {
    if (!(await getActiveSession())) {
      window.location.href = '/signup';
      return;
    }
    if (symptomInput.trim().length < 5) {
      alert('Please enter at least 5 characters for your symptoms.');
      return;
    }
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
      const workingCase = createCaseDraft({
        title: intakeText,
        mode: 'multi',
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
      if (Object.keys(updated).length < selected.length) {
        // Auto-switch to the next one that is not done
        const nextId = selected.find((sId) => !updated[sId]);
        if (nextId) setActiveSpecialistId(nextId);
      }
      return updated;
    });
  };

  useEffect(() => {
    if (selected.length > 0 && Object.keys(completedSpecialists).length === selected.length && phase === 'running' && !consensusInFlightRef.current) {
      consensusInFlightRef.current = true;
      setPhase('debating');
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

      // The debate round has been deprecated in favor of a single Orchestrator consensus step.
      // Bypass the dummy loop and send transcripts directly to correlation.
      setPhase('correlating');
      
      generateParallelMultiReport(
        caseTitle || symptomInput || activeCase?.title || 'Custom multi-specialist review',
        specialistTranscripts,
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
                transcripts: specialistTranscripts,
                specialists: selectedSpecialists.map((s) => s.label),
                basedOnEvidenceIds: reviewRecords.map((r: any) => r.id),
              });
              setSavedCaseId(savedCaseItem?.id || null);
            }
          } else {
            setPhase('failed');
          }
          consensusInFlightRef.current = false;
        }).catch(err => {
          console.error('Report generation failed:', err);
          setPhase('failed');
          consensusInFlightRef.current = false;
        });
    }
  }, [completedSpecialists, selected.length, phase, specialistTranscripts, activeCase, medicalRecords, caseTitle, symptomInput, workingCaseId, selectedSpecialists]);

  return (
    <div
      style={{
        height: isMobile ? 'calc(100dvh - 120px)' : 'calc(100dvh - 150px)',
        overflowY: 'auto',
        padding: isMobile ? '8px 16px' : '24px 40px',
        color: '#0F172A',
        margin: isMobile ? '-8px -16px' : '-24px -40px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
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
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              padding: '6px 12px',
              background: '#FFFFFF',
              borderRadius: '999px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
            }}
          >
            <Sparkles size={14} color="#10B981" />
            <span
              style={{
                fontSize: '11px',
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
              Parallel Evidence Review
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
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <GitMerge size={16} color="#0D9488" />
                <span style={{ fontSize: '14px', color: '#0F766E', fontWeight: 500 }}>
                  Linked to case: <strong>{activeCase.title}</strong>
                </span>
              </div>
            )}

            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                marginBottom: '24px',
              }}
            >
              <div style={{ padding: isMobile ? '0 12px' : '0 16px', color: '#94A3B8' }}><Search size={isMobile ? 18 : 20} /></div>
              <input
                ref={searchInputRef}
                type="text"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                placeholder={isMobile ? "Describe symptoms..." : "Describe symptoms or conditions to analyze..."}
                maxLength={2000}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  background: 'transparent',
                  padding: isMobile ? '8px 12px 8px 0' : '12px 16px 12px 0',
                  color: '#0F172A',
                  fontSize: isMobile ? '14px' : '15px',
                  outline: 'none',
                  fontWeight: 500,
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              />
              <button onClick={handleStart} disabled={!symptomInput.trim() && selected.length === 0} className="btn btn-primary hover-scale glow-transition" style={{ padding: isMobile ? '8px 16px' : '10px 20px', borderRadius: '12px', fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', opacity: !symptomInput.trim() && selected.length === 0 ? 0.5 : 1 }}>
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
                  <div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '14px', color: '#10B981', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
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
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
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
                  fontSize: '12px',
                  color: '#6366F1',
                  fontWeight: 700,
                  background: '#EEF2FF',
                  padding: '4px 10px',
                  borderRadius: '99px',
                }}
              >
                {selected.length} Selected
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(20px)',
                padding: isMobile ? '16px 12px' : '20px',
                borderRadius: isMobile ? '16px' : '20px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              }}
            >
              <div
                className="hide-scrollbar"
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '16px',
                  flexWrap: isMobile ? 'nowrap' : 'wrap',
                  overflowX: isMobile ? 'auto' : 'visible',
                  WebkitOverflowScrolling: 'touch',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  paddingBottom: '12px',
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
                        background: 'rgba(255, 255, 255, 0.4)',
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
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                marginBottom: '24px',
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
                  background: 'rgba(255, 255, 255, 0.25)',
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
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.4)', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
                  >
                    <ArrowLeft size={14} /> Back to Setup
                  </button>
                  <button
                    onClick={restartParallelReview}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.4)', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
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
                gap: '16px',
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
                    cachedSpecialistStreams={cachedSpecialistStreams}
                    workflow="parallel"
                    caseId={activeCase?.id || 'draft'}
                    runId="session"
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
                 style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.4)', border: '1px solid #E2E8F0', color: '#475569', fontWeight: 700, fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
                 onMouseOver={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#0F172A'; }}
                 onMouseOut={e => { e.currentTarget.style.background = '#FFF'; e.currentTarget.style.color = '#475569'; }}
               >
                 <ArrowLeft size={16} /> Back to Specialists Chat
               </button>
            </div>
            <MDTReportPanel
              title="Quick Consult Case Brief"
              subtitle="AI-assisted synthesis of multi-specialist perspectives"
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
            label: 'THEN COLLABORATE',
            title: 'Use the Board for deeper correlation.',
            text: 'When evidence grows, take your parallel findings into a board consensus review.',
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
  return (
    <aside
      className={`parallel-rail parallel-rail--${side}`}
      aria-label="Parallel Specialists overview"
    >
      <div className="parallel-rail__network" aria-hidden="true" style={{ marginBottom: '24px' }}>
        <span />
        <span />
        <span />
        <i />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {frames.map((frame, index) => {
          const Icon = frame.icon;
          return (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.15 }}
            >
              <div className="parallel-rail__icon">
                <Icon size={19} />
              </div>
              <div className="parallel-rail__label">{frame.label}</div>
              <h3 style={{ fontSize: '14px', margin: '6px 0', lineHeight: 1.3 }}>{frame.title}</h3>
              <p style={{ fontSize: '11px', minHeight: 'auto', lineHeight: 1.4 }}>{frame.text}</p>
              <div className="parallel-rail__stat">{frame.stat}</div>
            </motion.div>
          );
        })}
      </div>
    </aside>
  );
}


