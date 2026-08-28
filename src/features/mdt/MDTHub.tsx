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
import { AgentOrbit } from '../../components/ui/LiveOrbitIcon';
import { useNavigate, useLocation } from 'react-router-dom';
import { getActiveSession } from '../../services/authSession';
import {
  selectMDTSpecialists,
  chatWithMDTSpecialist,
  runMDTConference,
  generateMDTReport,
  analyzeLabReport,
} from '../../services/geminiService';
import { ALL_SPECIALISTS } from '../../data/specialists';
import { MedicalRecordsBar } from '../../components/ui/MedicalRecordsBar';
import { addEvent, addActionItems, addCondition, getProfile } from '../../services/ProfileEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { trackConsultationStarted } from '../../services/analytics';
import { getActiveCase, saveReviewSnapshot, setActiveCase as setGlobalActiveCase, getCases } from '../../services/CaseEngine';
import {
  Step,
  StepDivider,
  IntakePhase,
  MDTSpecialistPanel,
  MDTReportPanel,
    MDTConferencePanel,
} from './MDTComponents';
import { MDTHubDashboard } from './MDTHubDashboard';
import { runDifferentialAnalysis } from '../../services/geminiService';
import { updateCaseDifferentials } from '../../services/CaseEngine';
import { useMDTStore } from '../../stores/useMDTStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { clearRunStorage } from '../../services/RunContext';
import { openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';

// ─── Phases ─────────────────────────────────────────────────────────────────
// intake -> select -> assessment -> conference -> report
// case_review is the premium handoff from Parallel Specialists: it correlates an
// existing case file rather than making the member repeat their intake.

export default function MDTHub() {
  const isMobile = useIsMobile();
  const toast = useToast();
  const [mobileActiveTab, setMobileActiveTab] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
  const phase = useMDTStore(s => s.phase);
  const setPhase = useMDTStore(s => s.setPhase);
  const dashboardTab = useMDTStore(s => s.dashboardTab);
  const setDashboardTab = useMDTStore(s => s.setDashboardTab);
  const intakeData = useMDTStore(s => s.intakeData);
  const setIntakeData = useMDTStore(s => s.setIntakeData);
    const rawSelectedSpecialists = useMDTStore(s => s.selectedSpecialists);
  const selectedSpecialists = useMemo(() => {
    return rawSelectedSpecialists.map(s => ALL_SPECIALISTS.find(a => a.id === s.id) || s);
  }, [rawSelectedSpecialists]);
  const setSelectedSpecialists = useMDTStore(s => s.setSelectedSpecialists);
  const specialistTranscripts = useMDTStore(s => s.specialistTranscripts);
  const setSpecialistTranscripts = useMDTStore(s => s.setSpecialistTranscripts);
  const isSelecting = useMDTStore(s => s.isSelecting);
  const setIsSelecting = useMDTStore(s => s.setIsSelecting);
  const resetMDTStore = useMDTStore(s => s.reset);

  const [historyReport, setHistoryReport] = useState<any>(null);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [activeCase, setActiveCase] = useState(getActiveCase());
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const isCompilingRef = React.useRef(false);
  const fileInputRef = React.useRef<any>(null);

  


  useEffect(() => {
    // If the user navigates away after finishing a case and returns later via the sidebar,
    // automatically reset so they see a fresh intake page instead of being stuck on the 'done' screen.
    if (useMDTStore.getState().phase === 'report') {
      resetMDTStore();
      setGlobalActiveCase(null);
      setHistoryReport(null);
      setMedicalRecords([]);
    }
  }, []); // Empty dependency array ensures this ONLY runs on component mount
useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    
    if (searchParams.has('new')) {
      // Force bulletproof reset
      setGlobalActiveCase(null);
      setActiveCase(null);
      resetMDTStore();
      setHistoryReport(null);
      setMedicalRecords([]);
      
      // Clean up the URL to prevent re-triggering
      window.history.replaceState({}, '', location.pathname);
      return;
    }
    
    
  }, [location.search, phase, setPhase, resetMDTStore]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
      const historyId = searchParams.get('historyId');
      if (historyId) {
        let foundReport = null;
        // History must come from the authenticated canonical case store. The
        // old global `hc_history` key was not account/profile scoped and could
        // show a previous user's report after a device switch or logout.
        const cases = getCases();
        const caseItem = cases.find((c: any) => c.id === historyId);
        const reviewItem = caseItem?.reviews?.find((r: any) => r.id === historyId)
          || cases.flatMap((c: any) => c.reviews || []).find((r: any) => r.id === historyId);
        if (reviewItem?.type === 'mdt' && reviewItem.report) {
          foundReport = reviewItem.report;
        } else if (caseItem?.currentSummary && caseItem.currentStage === 'mdt_complete') {
          foundReport = caseItem.currentSummary;
        }

        if (foundReport) {
          setHistoryReport(foundReport);
          setPhase('dashboard');
          setDashboardTab('mdt');
        }
      }
  }, [location.search, setPhase, setDashboardTab]);

  

  

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
    if (!(await getActiveSession())) {
      window.dispatchEvent(new CustomEvent('hc_require_auth', { 
        detail: { 
          title: 'Authentication Required', 
          message: 'You need to log in or sign up to start an investigation.' 
        } 
      }));
      return;
    }

    const profile = getProfile();
    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a' || localStorage.getItem('hc_vip_tester') === 'true');
    if (!profile?.isPro && !isVip) {
      openTrialModal('Collaborative Specialists Board (16 Doctors)');
      return;
    }
    
    // Clear the current run namespace before starting another case.
    clearRunStorage('mdt');
    trackConsultationStarted('mdt', { hasFiles: Boolean(data.files && data.files.length > 0), hasImportedCase: Boolean(data.importedCaseId) });

    setIsSelecting(true);
    let enhancedComplaint = data.chiefComplaint || '';
      let newRecords: any[] = [];
      
      try {
        if (data.files && data.files.length > 0) {
        const profile = getProfile() || {};
        for (const file of data.files) {
          if (!file || file.size === 0 || file.size > 5 * 1024 * 1024) continue;
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onerror = () => resolve('');
            reader.onload = (e) => {
              const res = e.target?.result as string;
              resolve(res?.split(',')[1] || '');
            };
            reader.readAsDataURL(file);
          });
          
          if (!base64Data) continue;

          const result = await analyzeLabReport(base64Data, file.type, profile);
          if (result) {
              enhancedComplaint += `\n\n--- Document: ${file.name} ---\n`;
              enhancedComplaint += `Test/Report Type: ${result.testName}\n`;
              enhancedComplaint += `Key Findings: ${result.keyFindings}\n`;
              if (result.interpretation) enhancedComplaint += `Interpretation: ${result.interpretation}\n`;
              newRecords.push({ filename: file.name, findings: result.keyFindings, source: 'mdt_hub' });
            }
        }
      }
      
      setIntakeData({ ...data, chiefComplaint: enhancedComplaint });
      
      let finalSelection;
      if (enhancedComplaint.includes('[FOLLOW-UP FROM PREVIOUS EVALUATION]')) {
        finalSelection = [
          {
            id: 'ai_followup',
            label: 'AI Specialist',
            icon: BrainCircuit,
            color: '#8B5CF6',
            description: 'Advanced Follow-up Specialist focusing on your cross-questions and new findings.',
          }
        ];
      } else {
        const ids = (await selectMDTSpecialists(enhancedComplaint)) || [];
        const matched = ALL_SPECIALISTS.filter((s) => ids.includes(s.id));
        finalSelection = matched.length > 0 ? matched : ALL_SPECIALISTS.slice(0, 3);
      }
      const importedCase = data.importedCaseId ? getCases().find((candidate: any) => candidate.id === data.importedCaseId) : null;
      const previousReview = importedCase?.reviews?.[0];
      const firstPassMaterial = importedCase
        ? `This is a follow-up review of an existing HealthChain case. Do not repeat questions already answered in the prior case. Focus on the patient's new information, changes since the prior review, contradictions, unresolved evidence gaps, and what should be discussed next with a qualified clinician.\n\nExisting case: ${importedCase.title}\nPrior review summary: ${previousReview?.report?.executiveSummary || importedCase.currentSummary?.executiveSummary || 'Prior review available in the case file.'}`
        : `This is a new Collaborative Board case. Do not run a separate specialist interview. Use the patient's single case context below to prepare perspectives for cross-specialty correlation. Identify overlaps, conflicts, missing evidence, and the most useful next questions.\n\nNo prior Parallel Specialist report is available yet. Treat this as an evidence-light starting point and clearly distinguish possibilities from confirmed information.`;
      const transcripts = Object.fromEntries(
        finalSelection.map((specialist) => [specialist.id, []])
      );
      
      const { createCaseDraft, setActiveCase: dynSetActiveCase, addEvidenceToActiveCase } = await import('../../services/CaseEngine');
        const workingCase = importedCase || createCaseDraft({ title: enhancedComplaint.slice(0, 40) + '...', mode: 'mdt', intakeData: { ...data, chiefComplaint: enhancedComplaint } });
        dynSetActiveCase(workingCase.id);
        for (const record of newRecords) {
          addEvidenceToActiveCase(record);
        }
      
      setIntakeData({
        ...data,
        importedCaseId: importedCase?.id || null,
        importedReviewId: previousReview?.id || null,
        chiefComplaint: enhancedComplaint,
        // Keep prior-case material separate so it is not duplicated in every
        // specialist prompt through the chief complaint field.
        sharedCaseMaterial: firstPassMaterial,
      });
      setSelectedSpecialists(finalSelection);
      setSpecialistTranscripts(transcripts);
      setDashboardTab('specialists');
      setPhase('dashboard');
    } finally {
      setIsSelecting(false);
    }
  };

  const handleElevateParallel = async (caseItem: any) => {
    if (!(await getActiveSession())) {
      window.dispatchEvent(new CustomEvent('hc_require_auth', { 
        detail: { 
          title: 'Authentication Required', 
          message: 'You need to log in or sign up to elevate this case.' 
        } 
      }));
      return;
    }

    const profile = getProfile();
    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a' || localStorage.getItem('hc_vip_tester') === 'true');
    if (!profile?.isPro && !isVip) {
      openTrialModal('Collaborative Specialists Board (16 Doctors)');
      return;
    }

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
      const firstPassMaterial = `This case was elevated from a Parallel Specialist review. The patient's initial concern was: ${data.chiefComplaint}\n\nPlease cross-correlate their existing evidence and prior specialist opinions to build a Collaborative Specialists report. Identify overlaps, conflicts, missing evidence, and the most useful next questions.`;
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
      setGlobalActiveCase(caseItem.id);
        setActiveCase(getActiveCase());
        setDashboardTab('specialists');
        setPhase('dashboard');
    } finally {
      setIsSelecting(false);
    }
  };

    const handleReviewPastMDT = (caseItem: any) => {
    clearRunStorage('mdt', caseItem?.id);
    setGlobalActiveCase(caseItem.id);
      setActiveCase(getActiveCase());
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
    setDashboardTab('specialists');
    setPhase('dashboard');
  };

      const beginCaseCorrelation = useCallback(() => {
      // Clear session storage to ensure AI doesn't load a cached conversation
      clearRunStorage('mdt', activeCase?.id);

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
      chiefComplaint: caseConcern,
      history: `Continuing active case: ${activeCase.title || caseConcern}`,
      redFlags: false,
      sharedCaseMaterial,
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
    reader.onerror = () => {
      toast.error('File Error', 'Failed to read the uploaded report file.');
    };
    reader.onload = (event) => {
      try {
        const result = event.target?.result as string;
        const data = JSON.parse(result);
        if (data && data._isMDTExport) {
          setIntakeData(data.intakeData);
          setHistoryReport(data.report);
          setPhase('report');
        } else {
          toast.error('Invalid Format', 'Please upload a valid Collaborative Board JSON export.');
        }
      } catch (err) {
        toast.error('File Error', 'Failed to parse the uploaded file.');
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
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

  const handleSpecialistUpdate = useCallback((id: string, transcript: any[]) => {
    setSpecialistTranscripts((prev) => ({ ...prev, [id]: transcript }));
  }, [setSpecialistTranscripts]);

  
  const handleConferenceComplete = async (conferenceData: any, answers: any) => {
    try {
      const isImportedFollowUp = Boolean((intakeData as any).importedCaseId);
      const report = await generateMDTReport(intakeData, conferenceData, answers, activeCase?.medicalRecords || [], isImportedFollowUp ? specialistTranscripts : undefined);
                setHistoryReport(report);
          if (activeCase?.id) {
            navigate('/app/cases/' + activeCase.id);
          } else {
            setPhase('report');
          }
    } catch (e) {
      console.error('Failed to generate MDT report', e);
      toast.error('Generation Failed', 'Failed to generate consensus report. Please try again.');
    }
  };

      React.useEffect(() => {
    if (phase === 'compiling' && !isCompilingRef.current) {
      isCompilingRef.current = true;
      (async () => {
        try {
          const namedTranscripts: Record<string, any[]> = {};
          Object.keys(specialistTranscripts).forEach((specId) => {
            const specName = selectedSpecialists.find((s: any) => s.id === specId)?.label || specId;
            namedTranscripts[specName] = specialistTranscripts[specId] || [];
          });

          // An imported follow-up intentionally uses one targeted specialist.
          // Do not spend another model call on a one-member "conference" or
          // rerun a differential that the follow-up report will already frame.
          const isImportedFollowUp = Boolean((intakeData as any).importedCaseId);
          const conferenceData = isImportedFollowUp
            ? {
                corroborations: [],
                contentions: [],
                followUpQuestions: [],
                debateSummary: 'Targeted follow-up perspective based on the prior case and the patient’s new information.'
              }
            : await runMDTConference(intakeData, namedTranscripts, activeCase?.medicalRecords || []);
          const safeConferenceData = conferenceData || {
            corroborations: [],
            contentions: [],
            followUpQuestions: [],
            debateSummary: "Synthesized available information."
          };

          const report = await generateMDTReport(
            intakeData,
            safeConferenceData,
            {},
            activeCase?.medicalRecords || [],
            namedTranscripts
          );
          
          // Save snapshot to CaseEngine
          saveReviewSnapshot({
            type: 'mdt',
            report,
            transcripts: specialistTranscripts,
            basedOnEvidenceIds: activeCase?.medicalRecords?.map((r: any) => r.id) || [],
            specialists: selectedSpecialists.map((s: any) => s.label),
            caseId: activeCase?.id || '',
            parentReviewId: (intakeData as any).importedReviewId || undefined,
            basedOnReviewIds: (intakeData as any).importedReviewId ? [(intakeData as any).importedReviewId] : [],
          });

          if (activeCase?.id && !isImportedFollowUp) {
            try {
              const results = await runDifferentialAnalysis(intakeData, activeCase.medicalRecords || [], getProfile());
              if (results && Array.isArray(results)) {
                updateCaseDifferentials(activeCase.id, results);
              }
            } catch(e) { console.error("Diff analysis failed", e); }
          }

                    setHistoryReport(report);
          if (activeCase?.id) {
            navigate('/app/cases/' + activeCase.id);
          } else {
            setPhase('report');
          }
        } catch (e: any) {
            console.error('Failed to generate MDT report', e);
            if (e.message && e.message.includes('409') && (activeCase as any)?.data?.reviews) {
              const latestMDT = (activeCase as any).data.reviews.find((r: any) => r.type === 'mdt');
              if (latestMDT && latestMDT.report) {
                setHistoryReport(latestMDT.report);
                setPhase('report');
                return;
              }
            }
            setPhase('failed');
          } finally {
          isCompilingRef.current = false;
        }
      })();
    }
  }, [phase, activeCase, intakeData, selectedSpecialists, specialistTranscripts, setPhase]);

  const handleSpecialistComplete = useCallback((id: string, transcript: any[]) => {
    setSpecialistTranscripts((prev) => {
      const updated = { ...prev, [id]: transcript };
      if (Object.keys(updated).length === selectedSpecialists.length) {
        setPhase('compiling');
      }
      return updated;
    });
  }, [selectedSpecialists.length, setPhase, setSpecialistTranscripts]);

  return (
    <div
      style={{
        minHeight: '100%',
        background: 'transparent', zIndex: 1,
        transition: 'background 1.5s ease',
        padding: isMobile ? '16px 16px' : '0px 20px 40px 20px',
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
        {/* Header & Stepper Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: phase === 'intake' ? (isMobile ? '24px 24px 0 0' : '32px 32px 0 0') : (isMobile ? '24px' : '32px'),
            padding: isMobile ? '24px 20px 20px' : '32px 40px 24px',
            border: '1px solid #E2E8F0',
            borderBottom: phase === 'intake' ? 'none' : '1px solid #E2E8F0',
            boxShadow: phase === 'intake' ? 'none' : '0 10px 30px rgba(0,0,0,0.03)',
            marginBottom: phase === 'intake' ? '0px' : '24px',
            maxWidth: phase === 'intake' ? '800px' : '100%',
            margin: phase === 'intake' ? '0 auto' : '0',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          <h1
            style={{
              fontSize: isMobile ? '26px' : '34px',
              fontWeight: 900,
              color: '#0F172A',
              margin: '0 0 4px 0',
              letterSpacing: '-0.8px',
              position: 'relative',
              zIndex: 1
            }}
          >
            Deep Collaborative Specialists
          </h1>
          <div style={{ 
            fontStyle: 'italic', 
            color: '#10B981', 
            fontWeight: 700, 
            fontSize: '14px', 
            marginBottom: '12px',
            position: 'relative',
            zIndex: 1
          }}>
            "For Complex Cases"
          </div>
          <p
            style={{
              color: '#64748B',
              fontSize: '14px',
              margin: '0 auto 20px',
              maxWidth: '620px',
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {activeCase 
                ? 'Collaborative Specialists decode your unique chain of symptoms like clinical DNA—cross-referencing perspectives to find agreement, resolve conflict, and map your next steps.'
              : 'Our AI will automatically select a team of specialists to deeply investigate your case from multiple angles.'}
          </p>

          {/* Progress Stepper (Pill Style) */}
          <div 
            className="hide-scrollbar"
            style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              width: '100%',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '4px',
            }}
          >
            <div style={{ margin: '0 auto', display: 'flex', minWidth: 'max-content', zoom: 0.65 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: '#F8FAFC',
                  padding: '6px',
                  borderRadius: '999px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  border: '1px solid #E2E8F0',
                }}
              >
                <Step
                  icon={Activity}
                  label="Case context"
                  active={phase === 'intake'}
                  completed={phase !== 'intake'}
                />
                <StepDivider />
                <Step
                  icon={Users}
                  label="Collaboration Board"
                  active={phase === 'dashboard'}
                  completed={phase === 'compiling' || phase === 'conference' || phase === 'assessment' || phase === 'report' || false}
                />
                <StepDivider />
                <Step
                  icon={BrainCircuit}
                  label="Expert Correlation"
                  active={phase === 'compiling' || phase === 'conference' || phase === 'assessment'}
                  completed={phase === 'report' || false}
                />
                <StepDivider />
                <Step
                  icon={FileText}
                  label="Consensus Report"
                  active={phase === 'report' || false}
                  completed={false}
                />
              </div>
            </div>
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
                <MDTHubDashboard
                  isMobile={isMobile}
                  activeCase={activeCase}
                  dashboardTab={dashboardTab}
                  setDashboardTab={setDashboardTab}
                  intakeData={intakeData}
                  setIntakeData={setIntakeData}
                  selectedSpecialists={selectedSpecialists}
                  setSelectedSpecialists={setSelectedSpecialists}
                  specialistTranscripts={specialistTranscripts}
                  setSpecialistTranscripts={setSpecialistTranscripts}
                  reviewRecords={reviewRecords}
                  historyReport={historyReport}
                  setHistoryReport={setHistoryReport}
                  isSessionPaused={isSessionPaused}
                  setIsSessionPaused={setIsSessionPaused}
                  setPhase={setPhase}
                  mobileActiveTab={mobileActiveTab}
                  setMobileActiveTab={setMobileActiveTab}
                  onSpecialistComplete={handleSpecialistComplete}
                />
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
                    padding: isMobile ? '32px 20px' : '40px 24px',
                    background: 'rgba(255, 255, 255, 0.25)',
                    backdropFilter: 'blur(24px)',
                    borderRadius: '24px',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  {isSelecting ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
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
                            fontSize: isMobile ? '20px' : '24px',
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
                        gap: '20px',
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
                            fontSize: isMobile ? '26px' : '32px',
                            fontWeight: 900,
                            color: '#0F172A',
                            marginBottom: '12px',
                            letterSpacing: '-0.5px',
                          }}
                        >
                          AI perspectives assembled
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
                                background: 'rgba(255, 255, 255, 0.4)',
                                border: `1px solid ${s.border}`,
                                borderRadius: '20px',
                                boxShadow: '0 10px 20px rgba(0,0,0,0.02)',
                              }}
                            >
                              <div
                                style={{ background: s.bg, padding: '8px', borderRadius: 'var(--radius-lg)' }}
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
                    maxWidth: selectedSpecialists.length === 1 ? '800px' : '100%', margin: '0 auto', display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                    gap: '16px',
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
                      onUpdate={handleSpecialistUpdate}
                      onComplete={handleSpecialistComplete}
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

            {phase === 'compiling' && (
              <motion.div
                key="compiling"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(24px)',
                  padding: isMobile ? '32px 16px' : '32px 64px 64px',
                  borderRadius: '32px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  maxWidth: '600px',
                  margin: '40px auto 0',
                }}
              >
                <CompilingAnimation isDark={false} isMobile={isMobile} />
              </motion.div>
            )}

            {false && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                  background: 'rgba(255, 255, 255, 0.25)',
                  backdropFilter: 'blur(24px)',
                  padding: isMobile ? '32px' : '32px 64px 64px',
                  borderRadius: '32px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  textAlign: 'center',
                  maxWidth: '600px',
                  margin: '40px auto 0'
                }}
              >
                <div style={{ width: 64, height: 64, background: '#DCFCE7', color: '#16A34A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                </div>
                <h2 style={{ fontSize: '28px', fontWeight: 900, color: '#0F172A', marginBottom: '8px' }}>Assessment Complete</h2>
                <p style={{ color: '#64748B', fontSize: '16px', marginBottom: '40px', maxWidth: '400px', margin: '0 auto 40px auto' }}>
                  The Multi-Disciplinary Board has finalized your case and generated the consensus report.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
                  <button 
                    onClick={() => navigate(`/app/cases/${activeCase?.id}`)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'rgba(255, 255, 255, 0.4)',
                      border: '2px solid #E2E8F0',
                      borderRadius: '16px',
                      fontWeight: 700,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFF'; }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>
                    View Case Summary
                  </button>
                  
                                    <button 
                    onClick={() => {
                      resetMDTStore();
                      setGlobalActiveCase(null);
                      setHistoryReport(null);
                      setMedicalRecords([]);
                    }}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: 'linear-gradient(135deg, #4F46E5, #9333EA)',
                      border: 'none',
                      borderRadius: '16px',
                      fontWeight: 700,
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '15px',
                      transition: 'all 0.2s',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                    }}
                  >
                    Start New Case
                  </button>
                </div>
              </motion.div>
            )}


            


            {phase === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div style={{
                  padding: '100px 40px',
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(24px)',
                  borderRadius: '32px',
                  textAlign: 'center',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px',
                  maxWidth: 600,
                  margin: '60px auto'
                }}>
                  <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#101828' }}>Synthesis Failed</h2>
                  <p style={{ margin: 0, fontSize: 16, color: '#475467', lineHeight: 1.6 }}>There was a network issue while synthesizing the board consensus. Your specialist transcripts have been preserved.</p>
                  <button
                    onClick={() => {
                      setPhase('compiling'); // Retries the effect
                    }}
                    style={{
                      padding: '12px 24px',
                      background: '#101828',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: '10px'
                    }}
                  >
                    Retry Synthesis
                  </button>
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

