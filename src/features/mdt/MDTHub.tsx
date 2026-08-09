import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Activity,
  Users,
  FileText,
  ChevronRight,
  CheckCircle2,
  Stethoscope,
  ShieldCheck,
  HeartPulse,
  BrainCircuit,
  Loader2,
  ArrowRight,
  Sparkles,
  Upload,
  Pause,
  Play,
  StopCircle,
  GitMerge,
  RotateCcw,
  ChevronLeft
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  selectMDTSpecialists,
  chatWithMDTSpecialist,
  runMDTConference,
  generateMDTReport,
} from '../../services/geminiService';
import { ALL_SPECIALISTS } from '../../data/specialists';
import { MedicalRecordsBar } from '../../components/ui/MedicalRecordsBar';
import { addEvent, addActionItems, addCondition } from '../../services/ProfileEngine';
import { getActiveCase, saveReviewSnapshot, setActiveCase as setGlobalActiveCase } from '../../services/CaseEngine';
import {
  Step,
  StepDivider,
  IntakePhase,
  MDTSpecialistPanel,
  MDTReportPanel,
} from './MDTComponents';
import { runDifferentialAnalysis } from '../../services/geminiService';
import { updateCaseDifferentials } from '../../services/CaseEngine';
import { useMDTStore } from '../../stores/useMDTStore';
import { useIsMobile } from '../../hooks/useIsMobile';

// ─── Phases ─────────────────────────────────────────────────────────────────
// intake -> select -> assessment -> conference -> report
// case_review is the premium handoff from Parallel Specialists: it correlates an
// existing case file rather than making the member repeat their intake.

export default function MDTHub() {
  const isMobile = useIsMobile();
  const [mobileActiveTab, setMobileActiveTab] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    phase, setPhase, 
    dashboardTab, setDashboardTab, 
    intakeData, setIntakeData, 
    selectedSpecialists, setSelectedSpecialists, 
    specialistTranscripts, setSpecialistTranscripts, 
    isSelecting, setIsSelecting, 
    reset: resetMDTStore 
  } = useMDTStore();

  const [historyReport, setHistoryReport] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [activeCase, setActiveCase] = useState(getActiveCase());
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const fileInputRef = React.useRef<any>(null);

  useEffect(() => {
    if (new URLSearchParams(location.search).has('caseId') && phase === 'intake') {
      setPhase('dashboard');
    }
  }, [location.search, phase, setPhase]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const historyId = searchParams.get('historyId');
    if (historyId) {
      const stored = localStorage.getItem('hc_history');
      if (stored) {
        const historyArray = JSON.parse(stored);
        const item = historyArray.find((h) => h.id === historyId);
        if (item && item.type === 'mdt' && item.report) {
          setHistoryReport(item.report);
          setPhase('dashboard');
          setDashboardTab('mdt');
        }
      }
    }
  }, [location.search, setPhase, setDashboardTab]);

  // Restore from active case if we have a finished MDT review
  useEffect(() => {
    if (phase === 'intake' && activeCase && activeCase.reviews) {
      const latestMDT = [...activeCase.reviews].reverse().find((r: any) => r.type === 'mdt');
      if (latestMDT && latestMDT.report) {
        setHistoryReport(latestMDT.report);
        setPhase('dashboard');
        setDashboardTab('mdt');
      }
    }
  }, [activeCase, phase, setPhase, setDashboardTab]);

  // Fix corrupted state where phase was incorrectly saved as 'report'
  useEffect(() => {
    if (phase === 'report') {
      setPhase('dashboard');
      setDashboardTab('mdt');
    }
  }, [phase, setPhase, setDashboardTab]);

  useEffect(() => {
    const refresh = () => setActiveCase(getActiveCase());
    window.addEventListener('hc_active_case_updated', refresh);
    window.addEventListener('hc_cases_updated', refresh);
    return () => {
      window.removeEventListener('hc_active_case_updated', refresh);
      window.removeEventListener('hc_cases_updated', refresh);
    };
  }, []);


  const reviewRecords = useMemo(() => [
    ...(activeCase?.medicalRecords || []),
    ...medicalRecords.filter(
      (record) =>
        !(activeCase?.medicalRecords || []).some(
          (existing) =>
            existing.filename === record.filename && existing.findings === record.findings
        )
    ),
  ], [activeCase?.medicalRecords, medicalRecords]);

  const handleIntakeComplete = async (data) => {
    setIntakeData(data);
    setIsSelecting(true);
    try {
      const ids = (await selectMDTSpecialists(data.chiefComplaint)) || [];
      const matched = ALL_SPECIALISTS.filter((s) => ids.includes(s.id));
      const finalSelection = matched.length > 0 ? matched : ALL_SPECIALISTS.slice(0, 3);
      const firstPassMaterial = `This is a new MDT case. Do not run a separate specialist interview. Use the patient's single case context below to prepare perspectives for cross-specialty correlation. Identify overlaps, conflicts, missing evidence, and the most useful next questions.\n\nCase context: ${data.chiefComplaint}\n\nNo prior Parallel Specialist report is available yet. Treat this as an evidence-light starting point and clearly distinguish possibilities from confirmed information.`;
      const transcripts = Object.fromEntries(
        finalSelection.map((specialist) => [specialist.id, []])
      );
      
      const { createCaseDraft, setActiveCase: dynSetActiveCase } = await import('../../services/CaseEngine');
      const newCase = createCaseDraft({ title: (data.chiefComplaint || '').slice(0, 40) + '...', intakeData: data });
      dynSetActiveCase(newCase.id);
      
      setIntakeData({ ...data, chiefComplaint: data.chiefComplaint + `\n\nShared Case Material:\n${firstPassMaterial}` });
      setSelectedSpecialists(finalSelection);
      setSpecialistTranscripts(transcripts);
      setPhase('dashboard');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleElevateParallel = async (caseItem: any) => {
    if (caseItem?.reviews?.length === 0) {
      setGlobalActiveCase(caseItem.id);
      navigate('/app/multi');
      return;
    }
    // Port parallel case to MDT
    const data = {
      chiefComplaint: caseItem.title || caseItem.intakeData?.chiefComplaint || '',
      history: '',
      redFlags: false
    };
    setIntakeData(data);
    setIsSelecting(true);
    try {
      const ids = await selectMDTSpecialists(data.chiefComplaint);
      const matched = ALL_SPECIALISTS.filter((s) => ids.includes(s.id));
      const finalSelection = matched.length > 0 ? matched : ALL_SPECIALISTS.slice(0, 3);
      const firstPassMaterial = `This case was elevated from a Parallel Specialist review. The patient's initial concern was: ${data.chiefComplaint}\n\nPlease cross-correlate their existing evidence and prior specialist opinions to build an MDT consensus. Identify overlaps, conflicts, missing evidence, and the most useful next questions.`;
      const transcripts = Object.fromEntries(
        finalSelection.map((specialist) => [
          specialist.id,
          [{ role: 'ai', text: firstPassMaterial }],
        ])
      );
      setSelectedSpecialists(finalSelection);
      setSpecialistTranscripts(transcripts);
      
      // No need to save a review just for starting MDT. We save it when the report completes.

      // trigger refresh
      setActiveCase(getActiveCase());
      
      setPhase('conference');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleReviewPastMDT = (caseItem: any) => {
    setActiveCase(caseItem);
    setPhase('dashboard');
  };

  const handleResumeActiveCase = () => {
    if (activeCase?.reviews?.length === 0) {
      navigate('/app/multi');
      return;
    }
    setPhase('dashboard');
  };

  const startAssessment = () => {
    setPhase('assessment');
  };

  const beginCaseCorrelation = useCallback(() => {
    if (!activeCase) {
      setPhase('intake');
      return;
    }

    const caseConcern =
      activeCase.intakeData?.chiefComplaint || activeCase.title || 'Active health case';
    const latestSpecialists = activeCase.reviews.length > 0 ? activeCase.reviews[activeCase.reviews.length - 1].specialists : [];
    const caseSpecialists = ALL_SPECIALISTS.filter((s) =>
      latestSpecialists.includes(s.label)
    );
    const board = caseSpecialists.length >= 2 ? caseSpecialists : ALL_SPECIALISTS.slice(0, 3);
    const report = activeCase.currentSummary || {};
    const evidence = (reviewRecords || [])
      .slice(0, 6)
      .map(
        (record) =>
          `- ${record.filename || 'Case evidence'}: ${record.findings || 'Attached to case file'}`
      )
      .join('\n');
    const pathways = (report.topDiagnoses || [])
      .slice(0, 4)
      .map(
        (item) =>
          `- ${item.condition || item.name || 'Clinical pathway'}: ${item.rationale || item.reason || 'Requires correlation'}`
      )
      .join('\n');
    const actionPlan = (report.recommendedActionPlan || [])
      .slice(0, 4)
      .map(
        (item) =>
          `- ${typeof item === 'string' ? item : item.step || item.action || 'Follow-up action'}`
      )
      .join('\n');
    const sharedCaseMaterial = `This is an existing Parallel Specialists case file, not a new intake.\n\nCase concern: ${caseConcern}\n\nParallel synthesis: ${report.executiveSummary || 'Independent specialist perspectives are ready for cross-correlation.'}\n\nPossible pathways:\n${pathways || '- No pathways recorded yet'}\n\nEvidence already in the case:\n${evidence || '- No uploaded records yet'}\n\nExisting next steps:\n${actionPlan || '- No action plan recorded yet'}\n\nYour role is to correlate this same case: identify where perspectives agree, where evidence is missing or conflicting, and what should be clarified next.`;
    const transcripts = Object.fromEntries(
      board.map((specialist) => [specialist.id, []])
    );

    setIntakeData({
      chiefComplaint: caseConcern + `\n\nShared Case Material:\n${sharedCaseMaterial}`,
      history: `Continuing active case: ${activeCase.title || caseConcern}`,
      redFlags: false,
    });
    setSelectedSpecialists(board);
    setSpecialistTranscripts(transcripts);
    setPhase('dashboard');
  }, [activeCase, reviewRecords, setPhase, setSelectedSpecialists, setSpecialistTranscripts]);

  useEffect(() => {
    if (phase === 'dashboard' && activeCase && selectedSpecialists.length === 0) {
      beginCaseCorrelation();
    }
  }, [phase, activeCase, beginCaseCorrelation, selectedSpecialists.length]);


  const handleUploadOldReport = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const data = JSON.parse(result);
        if (data && data._isMDTExport) {
          setIntakeData(data.intakeData);
          setHistoryReport(data.report);
          setPhase('report');
        } else {
          alert('Invalid report format. Please upload a valid MDT JSON export.');
        }
      } catch (err) {
        alert('Failed to parse the file.');
      }
    };
    reader.readAsText(file);
  };

  // Dynamic Background styling based on phase
  const getPhaseBackground = () => {
    switch (phase) {
      case 'intake':
        return 'radial-gradient(circle at top right, rgba(167, 139, 250, 0.1) 0%, rgba(248, 250, 252, 1) 100%)';
      case 'select':
      case 'assessment':
        return 'radial-gradient(circle at 50% 50%, rgba(52, 211, 153, 0.1) 0%, rgba(248, 250, 252, 1) 100%)';
      case 'conference':
        return 'radial-gradient(circle at center, rgba(244, 63, 94, 0.08) 0%, rgba(248, 250, 252, 1) 100%)';
      case 'report':
        return 'radial-gradient(circle at top left, rgba(14, 165, 233, 0.08) 0%, rgba(248, 250, 252, 1) 100%)';
      default:
        return '#F8FAFC';
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: getPhaseBackground(),
        transition: 'background 1.5s ease',
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient decorative blobs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          background: 'rgba(167, 139, 250, 0.05)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          background: 'rgba(52, 211, 153, 0.05)',
          borderRadius: '50%',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
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
            <Network size={16} color="#10B981" />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: '#334155',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Advanced MDT Board
            </span>
          </div>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: 900,
              color: '#0F172A',
              margin: '0 0 16px 0',
              letterSpacing: '-1px',
            }}
          >
            MDT Consensus
          </h1>
          <p
            style={{
              color: '#64748B',
              fontSize: '16px',
              margin: '0 auto',
              maxWidth: '600px',
              fontWeight: 500,
              lineHeight: 1.6,
            }}
          >
            {activeCase
              ? 'The second stage: MDT compares the perspectives and evidence already in your case. It finds agreement, conflict, and the next evidence to collect.'
              : 'MDT is for reconciling a case, not repeating every specialist interview. Start a new case only for an unrelated concern.'}
          </p>
        </div>

        {/* Progress Stepper (Pill Style) */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(20px)',
              padding: '8px',
              borderRadius: '999px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              border: '1px solid rgba(255,255,255,0.5)',
              maxWidth: '100%',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
              <Step
                icon={Activity}
                label="Case context"
                active={phase === 'intake'}
                completed={phase === 'dashboard'}
              />
              <StepDivider />
              <Step
                icon={Users}
                label="MDT Dashboard"
                active={phase === 'dashboard'}
                completed={false}
              />
          </div>
        </div>

        {/* Phase Content Container */}
        <div style={{ position: 'relative' }}>
          <AnimatePresence mode="wait">
            {phase === 'intake' && (
              <motion.div
                key="intake"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <IntakePhase
                  onComplete={handleIntakeComplete}
                  onUploadClick={() => fileInputRef.current.click()}
                  activeCase={activeCase}
                  isPreparing={isSelecting}
                  onElevateParallel={handleElevateParallel}
                  onReviewPastMDT={handleReviewPastMDT}
                  onResumeActiveCase={handleResumeActiveCase}
                />
              </motion.div>
            )}

            {phase === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {/* ─── Case Route Tracker ─── */}
                <section style={{ padding: '24px', background: '#FFF', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', marginBottom: '32px', border: '1px solid rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: 20, margin: '0 0 8px', color: '#0F172A' }}>Your case route</h2>
                  <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.55, margin: '0 0 20px' }}>
                    Every step updates this same case file. You can add evidence at any point, then run
                    MDT again when the picture changes.
                  </p>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))', gap: 12 }}
                  >
                    {[
                      {
                        id: 'intake',
                        label: 'Case intake',
                        detail: 'Clinical details gathered',
                        icon: FileText,
                      },
                      {
                        id: 'specialists',
                        label: 'Board review',
                        detail: 'Evidence gaps clarified',
                        icon: Users,
                      },
                      {
                        id: 'consensus',
                        label: 'MDT consensus',
                        detail: 'Evidence cross-correlated',
                        icon: Network,
                      },
                      { id: 'actions', label: 'Next actions', detail: 'Use with your clinician', icon: Activity },
                    ].map((step, index) => {
                      const Icon = step.icon;
                      const flowIndex = dashboardTab === 'specialists' ? 1 : 2;
                      const complete = index < flowIndex;
                      const current = index === flowIndex;
                      return (
                        <div
                          key={step.id}
                          style={{
                            position: 'relative',
                            padding: '16px 12px',
                            borderRadius: 12,
                            background: current ? '#ECFDF5' : complete ? '#F8FAFC' : '#FFF',
                            border: `1px solid ${current ? '#99F6E4' : '#E2E8F0'}`,
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              color: current ? '#047857' : complete ? '#475569' : '#94A3B8',
                            }}
                          >
                            <Icon size={16} />
                            <strong style={{ fontSize: 13 }}>{step.label}</strong>
                          </div>
                          <small
                            style={{
                              display: 'block',
                              marginTop: 8,
                              color: '#64748B',
                              fontSize: 11,
                              lineHeight: 1.4,
                            }}
                          >
                            {step.detail}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 24 }}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() =>
                        navigate(
                          `/app/reports?returnTo=${encodeURIComponent(`/app/mdthub?caseId=${activeCase?.id}`)}`
                        )
                      }
                      style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#FFF', color: '#0F172A', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                    >
                      <FileText size={16} /> Add evidence
                    </button>
                    {dashboardTab === 'specialists' && (
                      <button
                        onClick={() => {
                          setIsSessionPaused(false);
                          setDashboardTab('mdt');
                        }}
                        style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', borderRadius: '8px', background: '#0D9488', color: '#FFF', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                      >
                        <Network size={16} /> Next: MDT consensus
                      </button>
                    )}
                  </div>
                </section>

                {/* Dashboard Tabs */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.8)', padding: '6px', borderRadius: '99px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <button
                      onClick={() => setDashboardTab('specialists')}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '99px',
                        border: 'none',
                        background: dashboardTab === 'specialists' ? '#10B981' : 'transparent',
                        color: dashboardTab === 'specialists' ? '#FFF' : '#64748B',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Users size={18} /> Board discussion
                    </button>
                    <button
                      onClick={() => setDashboardTab('mdt')}
                      style={{
                        padding: '12px 24px',
                        borderRadius: '99px',
                        border: 'none',
                        background: dashboardTab === 'mdt' ? '#10B981' : 'transparent',
                        color: dashboardTab === 'mdt' ? '#FFF' : '#64748B',
                        fontWeight: 700,
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Network size={18} /> Consensus brief
                    </button>
                  </div>
                </div>

                {dashboardTab === 'specialists' ? (
                  <>
                    {/* ─── Session Control Strip ─── */}
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
                          <ChevronLeft size={15} /> Back to case
                        </button>
                      </div>

                      {/* Right: actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => {
                            setPhase('intake');
                            setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
                            setHistoryReport(null);
                            setSelectedSpecialists([]);
                            setSpecialistTranscripts({});
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', background: '#FFF', color: '#475569', border: '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
                          onMouseOver={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
                          onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
                        >
                          <RotateCcw size={14} /> Restart
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
                          onClick={() => {
                            setIsSessionPaused(false);
                            setDashboardTab('mdt');
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', background: '#0F172A', color: '#FFF', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.15s', boxShadow: '0 2px 6px rgba(15,23,42,0.15)' }}
                          onMouseOver={e => e.currentTarget.style.background = '#1E293B'}
                          onMouseOut={e => e.currentTarget.style.background = '#0F172A'}
                        >
                          <CheckCircle2 size={14} /> Finish & Save
                        </button>
                      </div>
                    </motion.div>

                    <div
                      style={{
                        display: isMobile ? 'flex' : 'grid',
                        flexDirection: isMobile ? 'column' : 'unset',
                        gridTemplateColumns: isMobile ? 'unset' : 'repeat(auto-fit, minmax(340px, 1fr))',
                        gap: '24px',
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
                          <MDTSpecialistPanel
                            specialist={s}
                            index={i}
                            isPaused={isSessionPaused}
                            allSpecialists={selectedSpecialists}
                            intakeData={intakeData}
                            initialMessages={specialistTranscripts[s.id] || []}
                            activeDifferentials={activeCase?.differentials || []}
                            onUpdate={(id, transcript) => {
                              setSpecialistTranscripts((prev) => ({ ...prev, [id]: transcript }));
                            }}
                            onComplete={(id, transcript) => {
                              setSpecialistTranscripts((prev) => {
                                const updated = { ...prev, [id]: transcript };
                                return updated;
                              });
                            }}
                          />
                        </div>
                      ))}
                    </div>
                </>
              ) : (
                  <MDTReportPanel
                    intakeData={intakeData}
                    specialistTranscripts={specialistTranscripts}
                    medicalRecords={reviewRecords}
                    initialReport={historyReport || activeCase?.currentSummary}
                    onCaseSaved={async (report: any) => {
                      saveReviewSnapshot({
                        type: 'mdt',
                        report,
                        transcripts: specialistTranscripts,
                        basedOnEvidenceIds: reviewRecords.map(r => r.id),
                        specialists: selectedSpecialists.map((s) => s.label),
                        caseId: activeCase?.id || '',
                      });
                      
                      if (activeCase?.id) {
                        try {
                          const { getProfile } = await import('../../services/ProfileEngine');
                          const results = await runDifferentialAnalysis(intakeData, reviewRecords, getProfile());
                          if (results && Array.isArray(results)) {
                            updateCaseDifferentials(activeCase.id, results);
                          }
                        } catch (e) {
                          console.error('Failed auto DDx:', e);
                        }
                      }
                    }}
                    onRestart={() => {
                      setPhase('intake');
                      setIntakeData({ chiefComplaint: '', history: '', redFlags: false });
                      setHistoryReport(null);
                      setSelectedSpecialists([]);
                      setSpecialistTranscripts({});
                    }}
                    onRestartWithFeedback={(feedback: any) => {
                      const newComplaint = `${intakeData.chiefComplaint}\n\n[USER FEEDBACK FOR RE-EVALUATION]: ${feedback}`;
                      setIntakeData({ ...intakeData, chiefComplaint: newComplaint });
                      setHistoryReport(null);
                      setSpecialistTranscripts({});
                      setPhase('assessment');
                    }}
                  />
                )}
              </motion.div>
            )}


            {phase === 'select' && (
              <motion.div
                key="select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div
                  style={{
                    padding: '60px 40px',
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(24px)',
                    borderRadius: '32px',
                    textAlign: 'center',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                    border: '1px solid rgba(255,255,255,0.5)',
                  }}
                >
                  {isSelecting ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '24px',
                      }}
                    >
                      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            border: '3px dashed #10B981',
                            borderRadius: '50%',
                            opacity: 0.3,
                          }}
                        />
                        <motion.div
                          animate={{ rotate: -360 }}
                          transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
                          style={{
                            position: 'absolute',
                            inset: 8,
                            border: '3px dashed #34D399',
                            borderRadius: '50%',
                            opacity: 0.5,
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Loader2 size={24} color="#10B981" />
                        </div>
                      </div>
                      <div>
                        <h2
                          style={{
                            fontSize: '24px',
                            fontWeight: 800,
                            color: '#0F172A',
                            marginBottom: '8px',
                          }}
                        >
                          Assembling Your Board...
                        </h2>
                        <p style={{ color: '#64748B', fontWeight: 500 }}>
                          Analyzing clinical intake to select the ideal specialists.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '32px',
                      }}
                    >
                      <div
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          background: '#ECFDF5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#10B981',
                          boxShadow: '0 8px 16px rgba(16,185,129,0.1)',
                        }}
                      >
                        <CheckCircle2 size={40} />
                      </div>
                      <div>
                        <h2
                          style={{
                            fontSize: '32px',
                            fontWeight: 900,
                            color: '#0F172A',
                            marginBottom: '12px',
                            letterSpacing: '-0.5px',
                          }}
                        >
                          Medical Board Assembled
                        </h2>
                        <p
                          style={{
                            color: '#64748B',
                            maxWidth: '500px',
                            margin: '0 auto',
                            fontSize: '16px',
                            lineHeight: 1.6,
                          }}
                        >
                          Based on your symptoms, we've selected this multi-disciplinary panel to
                          investigate your case.
                        </p>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '16px',
                          justifyContent: 'center',
                          marginTop: '16px',
                        }}
                      >
                        {selectedSpecialists.map((s, i) => {
                          const Icon = s.icon;
                          return (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              transition={{ delay: i * 0.15, type: 'spring', stiffness: 100 }}
                              key={s.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '16px 24px',
                                background: '#FFF',
                                border: `1px solid ${s.border}`,
                                borderRadius: '20px',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.02)',
                              }}
                            >
                              <div
                                style={{ background: s.bg, padding: '8px', borderRadius: '12px' }}
                              >
                                <Icon size={20} color={s.color} />
                              </div>
                              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>
                                {s.label}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>

                      <button
                        onClick={startAssessment}
                        style={{
                          marginTop: '24px',
                          padding: '18px 40px',
                          background: '#0F172A',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '999px',
                          fontSize: '16px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.3s',
                          boxShadow: '0 10px 25px rgba(15,23,42,0.3)',
                        }}
                      >
                        Begin Consultations <ArrowRight size={20} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {phase === 'assessment' && (
              <motion.div
                key="assessment"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {selectedSpecialists.map((s, i) => (
                    <MDTSpecialistPanel
                      key={s.id}
                      specialist={s}
                      index={i}
                      allSpecialists={selectedSpecialists}
                      intakeData={intakeData}
                      initialMessages={specialistTranscripts[s.id] || []}
                      activeDifferentials={activeCase?.differentials || []}
                      onUpdate={(id, transcript) => {
                        setSpecialistTranscripts((prev) => ({ ...prev, [id]: transcript }));
                      }}
                      onComplete={(id, transcript) => {
                        setSpecialistTranscripts((prev) => {
                          const updated = { ...prev, [id]: transcript };
                          if (Object.keys(updated).length === selectedSpecialists.length) {
                            setTimeout(() => setPhase('conference'), 2000);
                          }
                          return updated;
                        });
                      }}
                    />
                  ))}
                </div>
                <div style={{ marginTop: '32px' }}>
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

          </AnimatePresence>
        </div>
      </div>

      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleUploadOldReport}
      />
    </div>
  );
}
