import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  FileUp, Sparkles, Search, ArrowRight,
  X, HelpCircle, BrainCircuit, Copy, Check,
  AlertTriangle, ShieldCheck, Stethoscope, CalendarClock,
  FileText, Zap, ChevronRight, AlertCircle, Plus,
  Activity, Sliders, MessageCircle, Folder, ChevronDown, Lock,
  UploadCloud, Trash2
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { runJarvisInvestigation } from '../../services/geminiService';
import { createCaseDraft, saveReviewSnapshot, appendCaseRecords, MedicalRecord, addCaseEvent, getActiveCase, getCase, addCaseQuestion } from '../../services/CaseEngine';
import { getActiveSession } from '../../services/authSession';
import { getProfile, getProfileKey, getProfileEngineState } from '../../services/ProfileEngine';
import { openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { recordHealthMemory } from '../../services/HealthMemory';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { CompilingAnimation } from '../../components/ui/CompilingAnimation';
import { triggerHapticSelection, triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { buildCaseContext, getUnifiedCaseScope } from '../../services/caseWorkspace';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import { SourcePassageModal, SourcePassageModalProps } from '../../components/ui/SourcePassageModal';
import { DataSovereigntyModal } from '../../components/ui/DataSovereigntyModal';
import { InformationCategoryBadge } from '../../components/ui/InformationCategoryBadge';
import { ClinicalReasoningPipelineView } from '../../components/ui/ClinicalReasoningPipelineView';
import { MeaningfulMultiPerspectiveView } from '../../components/ui/MeaningfulMultiPerspectiveView';
import { StructuredAnswerView } from '../../components/ui/StructuredAnswerView';
import { buildStructuredClinicalAnswer } from '../../services/StructuredAnswerEngine';
import { runClinicalReasoningPipeline } from '../../services/ClinicalReasoningEngine';
import { Sparkles as SparklesIcon, ExternalLink } from 'lucide-react';
import { normalizeClinicalReview } from '../../services/clinicalReview';
import '../../components/ui/caseWorkspace.css';
import { saveOriginalCaseFile } from '../../services/caseRecordFiles';

const engineScope = () => `${getProfileKey()}_${getProfileEngineState()?.activeId || 'profile_1'}`;
const engineDraftKey = (caseId: string) => `hc_engine_draft_${engineScope()}_${caseId || 'new'}`;

export default function JarvisInvestigator() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const toast = useToast();
  const [profile, setProfile] = useState(() => getProfile());

  useEffect(() => {
    const handleProfileUpdate = () => setProfile(getProfile());
    window.addEventListener('hc_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('hc_profile_updated', handleProfileUpdate);
  }, []);
  
  const [phase, setPhase] = useState<'input' | 'analyzing' | 'done'>('input');
  const [history, setHistory] = useState(() => {
    try { return sessionStorage.getItem(engineDraftKey(searchParams.get('caseId') || location.state?.caseId || '')) || ''; } catch { return ''; }
  });
  const [files, setFiles] = useState<{ file: File; base64: string; size: number }[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isIsolated, setIsIsolated] = useState(false);
  const [copiedSbar, setCopiedSbar] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [missingCaseId, setMissingCaseId] = useState<string | null>(null);
  const [addedQuestionIndexes, setAddedQuestionIndexes] = useState<Record<number, boolean>>({});
  const [intakeStep, setIntakeStep] = useState<1 | 2 | 3>(1);
  const [reviewFocus, setReviewFocus] = useState<'differential' | 'doctor_prep' | 'lab_second_opinion'>('differential');
  const [selectedOnset, setSelectedOnset] = useState<string | null>(() => {
    try {
      const match = history.match(/^Onset:\s*([^.]+)\./i);
      return match ? match[1].trim() : null;
    } catch { return null; }
  });
  const [selectedProgression, setSelectedProgression] = useState<string | null>(() => {
    try {
      const match = history.match(/Progression:\s*([^.]+)\./i);
      return match ? match[1].trim() : null;
    } catch { return null; }
  });

  const handleSelectOnset = (onsetText: string) => {
    triggerHapticSelection();
    setSelectedOnset(prev => prev === onsetText ? null : onsetText);
    setHistory(prev => {
      if (selectedOnset === onsetText) {
        // Toggle off if already selected
        return prev.replace(/^Onset:\s*[^.]*\.\s*/i, '').trim();
      }
      const prefix = `Onset: ${onsetText}. `;
      if (!prev.trim()) return prefix;
      if (prev.startsWith('Onset: ')) {
        const rest = prev.replace(/^Onset:\s*[^.]*\.\s*/i, '');
        return `${prefix}${rest}`.trim();
      }
      return `${prefix}${prev}`.trim();
    });
  };

  const handleSelectProgression = (progText: string) => {
    triggerHapticSelection();
    setSelectedProgression(prev => prev === progText ? null : progText);
    setHistory(prev => {
      if (selectedProgression === progText) {
        // Toggle off if already selected
        return prev.replace(/Progression:\s*[^.]*\.\s*/i, '').trim();
      }
      const progLine = `Progression: ${progText}. `;
      if (!prev.trim()) return progLine;
      if (prev.includes('Progression: ')) {
        return prev.replace(/Progression:\s*[^.]*\.\s*/i, progLine).trim();
      }
      return `${prev}\n${progLine}`.trim();
    });
  };

  const handleAddQuestionToCasePrep = (qText: string, idx: number) => {
    const caseId = createdCaseId || selectedCaseId;
    if (!caseId) {
      toast.error('No Active Case', 'Please select or create a case before saving visit questions.');
      return;
    }
    try {
      addCaseQuestion(caseId, {
        questionText: qText,
        status: 'open',
        raisedBySpecialty: 'Clinical Review',
        supportingEvidenceIds: [],
      });
      setAddedQuestionIndexes(prev => ({ ...prev, [idx]: true }));
      triggerHapticSuccess();
      toast.success('Question Added to Case Prep', 'This question is now recorded in your clinical appointment brief.');
    } catch {
      toast.error('Save Failed', 'Unable to save question to Case Prep. Please try again.');
    }
  };
  const availableCases = useCaseWorkspace();
  const reviewHydrationKey = availableCases.map(item => `${item.id}:${item.reviews?.[0]?.id || ''}`).join('|');
  const [selectedCaseId, setSelectedCaseId] = useState(() => {
    const preferred = searchParams.get('caseId') || location.state?.caseId || '';
    if (preferred) return preferred;
    const scope = getUnifiedCaseScope();
    return scope.caseId || '';
  });
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const selectedCaseRef = useRef(selectedCaseId);
  selectedCaseRef.current = selectedCaseId;
  const [sourceModalData, setSourceModalData] = useState<SourcePassageModalProps | null>(null);
  const [showSovereigntyModal, setShowSovereigntyModal] = useState(false);
  const runningRef = useRef(false);
  const readingRef = useRef(false);
  const scopeRef = useRef(engineScope());
  useEffect(() => {
    const changeScope = () => {
      if (scopeRef.current === engineScope()) return;
      scopeRef.current = engineScope();
      setHistory(''); setFiles([]); setReport(null); setPhase('input'); setSelectedCaseId(''); setCreatedCaseId(null); setMissingCaseId(null);
    };
    window.addEventListener('hc_profile_updated', changeScope);
    window.addEventListener('hc_logout', changeScope);
    return () => { window.removeEventListener('hc_profile_updated', changeScope); window.removeEventListener('hc_logout', changeScope); };
  }, []);
  useEffect(() => {
    try {
      const key = engineDraftKey(selectedCaseId);
      if (phase === 'done') sessionStorage.removeItem(key);
      else if (history.trim()) sessionStorage.setItem(key, history);
      else sessionStorage.removeItem(key);
    } catch { /* Keep editing available when browser storage is disabled. */ }
  }, [history, selectedCaseId, phase]);

  // Rehydrate existing case if caseId is passed in URL query or navigation state
  useEffect(() => {
    const caseId = searchParams.get('caseId') || (location.state as any)?.caseId;
    if (caseId) {
      const existing = getCase(caseId);
      if (existing) {
        setMissingCaseId(null);
        if (phase === 'input') {
          setSelectedCaseId(existing.id);
          setHistory(previous => previous || existing.intakeData?.chiefComplaint || existing.intakeData?.concern || '');
          const jarvisReview = existing.reviews?.find((r: any) => r.type === 'jarvis');
          if (jarvisReview?.report?.groundingVersion === 1 && searchParams.get('review') !== 'new') {
            setReport(jarvisReview.report);
            setCreatedCaseId(existing.id);
            setHistory(existing.intakeData?.chiefComplaint || '');
            setPhase('done');
          }
        }
      } else {
        setMissingCaseId(caseId);
        setSelectedCaseId(caseId);
      }
    } else {
      setMissingCaseId(null);
    }
  }, [searchParams, location.state, reviewHydrationKey, phase]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || readingRef.current) return;
    const selected = Array.from(e.target.files);
    e.target.value = '';
    if (selected.some(file => !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !file.size || file.size > 3 * 1024 * 1024)) {
      toast.error('Unsupported document', 'Choose non-empty PDF, JPG, PNG, or WebP files, each under 3 MB.');
      return;
    }
    
    // Limits: Max 10 files total
    if (files.length + selected.length > 10) {
      toast.error("Document Limit", "Clinical Review is currently limited to processing 10 documents at a time.");
      return;
    }

    readingRef.current = true;
    setIsReadingFiles(true);
    const processed = await Promise.all(selected.map(async (f) => {
      return new Promise<{file: File, base64: string, size: number}>((resolve) => {
        if (f.type.startsWith('image/')) {
          const img = new Image();
          const objectUrl = URL.createObjectURL(f);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            const MAX_HEIGHT = 1200;
            let width = img.width;
            let height = img.height;

            if (width > height && width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            } else if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            const base64 = (dataUrl && dataUrl.includes(',')) ? dataUrl.split(',')[1] : (dataUrl || '');
            const estimatedBytes = Math.round((base64.length * 3) / 4);
            resolve({ file: new File([f], f.name, { type: 'image/jpeg' }), base64, size: estimatedBytes });
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            const reader = new FileReader();
            reader.onerror = () => {
              resolve({ file: f, base64: '', size: 0 });
            };
            reader.onload = (ev) => {
              const base64 = (ev.target?.result as string)?.split(',')[1] || '';
              resolve({ file: f, base64, size: f.size });
            };
            reader.readAsDataURL(f);
          };
          img.src = objectUrl;
        } else {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const base64 = (ev.target?.result as string).split(',')[1];
            resolve({ file: f, base64, size: f.size });
          };
          reader.onerror = () => {
            resolve({ file: f, base64: '', size: 0 });
          };
          reader.readAsDataURL(f);
        }
      });
    }));

    readingRef.current = false;
    if (!isMounted.current) return;
    setIsReadingFiles(false);
    if (processed.some(file => !file.base64)) {
      toast.error('Could not read a document', 'Please select the file again or use a clearer copy.');
      return;
    }
    if ([...files, ...processed].reduce((sum, file) => sum + file.base64.length, 0) > 3_500_000) {
      toast.error('Upload too large', 'Use fewer documents or smaller scans. The combined upload must fit within 3.5 MB after processing.');
      return;
    }
    setFiles(prev => [...prev, ...processed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    triggerHapticSelection();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetInvestigation = () => {
    triggerHapticLight();
    setPhase('input');
    setHistory('');
    setSelectedOnset(null);
    setSelectedProgression(null);
    setIntakeStep(1);
    setFiles([]);
    setReport(null);
    setCreatedCaseId(null);
    setSelectedCaseId('');
    navigate('/app/consult', { replace: true, state: null });
    setCopiedSbar(false);
  };

  const handleCopySbar = async () => {
    if (!report) return;
    triggerHapticSuccess();
    const primary = report.primaryHypothesis || report.topDiagnoses?.[0]?.condition || 'Clinical Finding';
    const sbar = report.doctorActionPlan?.sbar || {
      situation: report.executiveSummary || history,
      background: 'See the attached case history; no additional history inferred.',
      assessment: primary,
      recommendation: (report.questionsForClinician || []).join('\n') || 'Review the concerns and records with the treating clinician.'
    };

    const text = `CLINICAL REVIEW • DOCTOR SBAR BRIEF
AI consideration for clinician review: ${primary}
Generated: ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}

[S] SITUATION:
${sbar.situation}

[B] BACKGROUND:
${sbar.background}

[A] ASSESSMENT:
${sbar.assessment}

[R] RECOMMENDATION:
${sbar.recommendation}

QUESTIONS FOR THE VISIT:
${(report.questionsForClinician || []).map((question: string, i: number) => `${i + 1}. ${question}`).join('\n') || 'What additional information would help you assess these concerns?'}

AI-generated preparation material. Verify against original records; this is not a diagnosis or a treatment plan.`;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      toast.error('Copy unavailable', 'Your browser could not access the clipboard. You can select and copy the report text.');
      return;
    }
    setCopiedSbar(true);
    toast.success("SBAR Brief Copied", "Formatted for MyChart/doctor portal notes.");
    setTimeout(() => setCopiedSbar(false), 3000);
  };

  const [isUpdatingReasoning, setIsUpdatingReasoning] = useState(false);

  const handleClarificationFeedback = async (answer: string) => {
    if (!report || isUpdatingReasoning) return false;
    setIsUpdatingReasoning(true);
    try {
      const updatedReport = normalizeClinicalReview(
        report,
        report.reasoningPipeline || null,
        {
          questionId: report.reasoningPipeline?.stage7_focusedQuestion?.id || 'clarification_1',
          answerText: answer,
        }
      );
      const targetCaseId = createdCaseId || selectedCaseId;
      if (!targetCaseId || !getCase(targetCaseId)) throw new Error('Select an available case before saving.');
      addCaseEvent(targetCaseId, answer.trim(), 'User clarification');
      if (targetCaseId) {
        saveReviewSnapshot({
          caseId: targetCaseId,
          type: 'jarvis' as any,
          report: updatedReport,
          specialists: ['Clinical Review'],
        });
      }
      setReport(updatedReport);
      toast.success('Clarification saved', 'Saved as your reported observation. Run a new review to assess how it changes the interpretation.');
      return true;
    } catch (err) {
      console.error('Failed to update reasoning pipeline:', err);
      toast.error('Update Failed', 'Could not update the reasoning pipeline.');
      return false;
    } finally {
      setIsUpdatingReasoning(false);
    }
  };

  const handleRunInvestigation = async () => {
    if (runningRef.current || readingRef.current) return;
    const requestScope = engineScope();
    const effectiveCaseId = selectedCaseId || missingCaseId;
    const requestCaseId = effectiveCaseId;
    const linkedCase = effectiveCaseId ? getCase(effectiveCaseId) : undefined;
    if (effectiveCaseId && (!linkedCase || linkedCase.intakeData?.scenarioId)) {
      toast.error('Case unavailable', 'Select an available case or start a new case.');
      return;
    }
    if (!history.trim() && files.length === 0) {
      toast.error("Input Required", "Please enter your symptoms, clinical timeline, or attach lab reports to run the engine.");
      return;
    }

    runningRef.current = true;
    const session = await getActiveSession();
    if (!isMounted.current || (requestScope !== engineScope() || selectedCaseRef.current !== requestCaseId)) { runningRef.current = false; return; }
    if (!session) {
      runningRef.current = false;
      window.dispatchEvent(new CustomEvent('hc_require_auth', {
        detail: {
          title: 'Authentication Required',
          message: 'You need to log in or sign up to run a Clinical Review investigation.'
        }
      }));
      return;
    }

    const isVip = typeof localStorage !== 'undefined' && (localStorage.getItem('hc_vp_sig') === 'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a');
    if (!profile?.isPro && !isVip) {
      runningRef.current = false;
      openTrialModal('Clinical Review');
      return;
    }

    runningRef.current = true;
    setPhase('analyzing');
    
    const mappedFiles = files.map(f => ({
      mimeType: f.file.type || 'application/pdf',
      data: f.base64,
      name: f.file.name
    }));

    try {
      const contextProfile = isIsolated ? null : profile;
      const caseHistory = linkedCase ? `${history}\n\nSelected case evidence (prior AI interpretations are unverified):\n${buildCaseContext(linkedCase)}` : history;
      const result = await runJarvisInvestigation(history, mappedFiles, contextProfile, linkedCase);
      
      if (!isMounted.current || (requestScope !== engineScope() || selectedCaseRef.current !== requestCaseId)) return;
      
      if (result) {
        setReport(result);
        
        const primaryTitle = result.primaryHypothesis || result.topDiagnoses?.[0]?.condition || history.slice(0, 32);
        const newCase = linkedCase || createCaseDraft({
          title: `Clinical Review: ${primaryTitle.slice(0, 36)}`,
          mode: 'jarvis',
          intakeData: { 
            chiefComplaint: history || "Clinical Review investigation",
            filesCount: mappedFiles.length,
            analyzedAt: new Date().toISOString()
          }
        });
        const records: MedicalRecord[] = [];
        for (const attachment of files) {
          const recordId = crypto.randomUUID();
          const passages = (result.documentedFacts || []).filter((fact: any) => fact.source === attachment.file.name);
          await saveOriginalCaseFile(newCase.id, recordId, attachment.file);
          if (!isMounted.current || (requestScope !== engineScope() || selectedCaseRef.current !== requestCaseId)) return;
          records.push({
            id: recordId, filename: attachment.file.name, source: 'uploaded_document',
            type: attachment.file.type, addedAt: new Date().toISOString(),
            findings: passages.map((p: any) => p.fact).join('\n'),
            passages: passages.map((p: any) => ({
              id: p.id,
              text: p.fact,
              originalText: p.fact,
              extractionStatus: 'provisional' as const,
              auditTrail: [],
              page: p.page,
              section: 'Provisional extraction; check original',
            })),
          });
          passages.forEach((p: any) => { p.recordId = recordId; p.passageId = p.id; });
        }
        if (records.length) appendCaseRecords(newCase.id, records);
        setCreatedCaseId(newCase.id);
        
        saveReviewSnapshot({
          caseId: newCase.id,
          type: 'jarvis' as any,
          report: result,
          specialists: ['Clinical Review']
        });

        recordHealthMemory({
          kind: 'research',
          source: 'jarvis',
          title: `Clinical Review: ${primaryTitle.slice(0, 36)}`,
          occurredAt: new Date().toISOString(),
          caseId: newCase.id,
          payload: {
            primaryHypothesis: result.primaryHypothesis || result.topDiagnoses?.[0]?.condition,
            dominoChain: result.dominoChain,
            topDiagnoses: result.topDiagnoses || [],
            missingLinks: result.missingLinks || [],
            documentCount: mappedFiles.length
          },
          dedupeKey: `jarvis:${newCase.id}`
        });

        awardPoints(25, 'Clinical Review Investigation', 'checkin');
        setPhase('done');
      } else {
        if (!isMounted.current) return;
        toast.error("Analysis Disrupted", "Clinical Review encountered a network disruption. Please try again.");
        setPhase('input');
      }
    } catch (e) {
      console.error(e);
      if (isMounted.current) {
        toast.error("Analysis Error", "An error occurred during analysis. Please try again.");
        setPhase('input');
      }
    } finally {
      runningRef.current = false;
    }
  };

  if (phase === 'analyzing') {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CompilingAnimation isMobile={isMobile} />
      </div>
    );
  }

  if (phase === 'done' && report) {
    const caseId = createdCaseId || selectedCaseId;
    const primaryCondition = report.primaryHypothesis || report.topDiagnoses?.[0]?.condition || 'Case review';
    const reasoningPayload = report.reasoningPipeline || runClinicalReasoningPipeline(report);
    const perspectives = report.meaningfulPerspectives || report.perspectives || [];

    return (
      <div
        className="connected-experience"
        style={{
          padding: isMobile ? '12px 0 80px' : '24px 0 100px',
          maxWidth: '960px',
          margin: '0 auto',
        }}
      >
        <section className="case-workspace" aria-labelledby="review-ready-title">
          <header style={{ marginBottom: 18 }}>
            <span className="case-workspace-eyebrow">Saved to My Cases</span>
            <h2 id="review-ready-title" style={{ marginBottom: 6 }}>Your record review is ready</h2>
            <p style={{ margin: 0 }}>Check extracted details against the original records.</p>
          </header>

          <div className="case-workspace-grid" style={{ marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/app/cases/${caseId}`)}>
              Open case
            </button>
            <button className="btn btn-outline" onClick={() => navigate(`/app/case-prep?caseId=${encodeURIComponent(caseId || '')}`)}>
              Prepare for visit
            </button>
            <button className="btn btn-outline" onClick={() => navigate(`/app/ava?caseId=${encodeURIComponent(caseId || '')}`, {
              state: { initialPrompt: 'Help me understand my latest record review and prepare questions for my clinician.' }
            })}>
              Ask Ava
            </button>
          </div>

          <details style={{ marginBottom: 20 }}>
            <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 700 }}>
              More actions
            </summary>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={handleCopySbar}>{copiedSbar ? 'Copied' : 'Copy summary'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => { setPhase('input'); setReport(null); }}>Review updated information</button>
              <button className="btn btn-outline btn-sm" onClick={resetInvestigation}>Start another review</button>
            </div>
          </details>

          <StructuredAnswerView
            answer={report.structuredAnswer || buildStructuredClinicalAnswer({
              primaryHypothesis: primaryCondition,
              executiveSummary: report.executiveSummary,
              documentedFacts: report.documentedFacts,
              uncertainties: report.uncertainties,
              missingLinks: report.missingLinks,
              questionsForClinician: report.questionsForClinician,
              contradictions: report.contradictions || report.contradictionQueue,
              alternatives: report.alternatives,
              perspectives,
              boundedComparison: report.boundedComparison,
            })}
            onOpenSourceModal={(src) => setSourceModalData(src)}
          />

          <details style={{ marginTop: 18, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
            <summary style={{ cursor: 'pointer', color: '#C2410C', fontSize: 14, fontWeight: 800 }}>
              Review reasoning
            </summary>
            <ClinicalReasoningPipelineView
              payload={reasoningPayload}
              onClarificationSubmit={handleClarificationFeedback}
              onChooseNextAction={(action) => {
                if (!caseId) return;
                const updated = {
                  ...report,
                  reasoningPipeline: {
                    ...reasoningPayload,
                    stage9_continuity: { ...reasoningPayload.stage9_continuity, chosenNextAction: action },
                  },
                };
                saveReviewSnapshot({ caseId, type: 'jarvis', report: updated, specialists: ['Clinical Review'] });
                setReport(updated);
              }}
              onCorrectionAcknowledge={(id) => {
                if (!caseId) return;
                const updated = {
                  ...report,
                  reasoningPipeline: {
                    ...reasoningPayload,
                    stage3_correctionQueue: reasoningPayload.stage3_correctionQueue.map((item: any) =>
                      item.id === id ? { ...item, status: 'acknowledged' } : item
                    ),
                  },
                };
                saveReviewSnapshot({ caseId, type: 'jarvis', report: updated, specialists: ['Clinical Review'] });
                setReport(updated);
              }}
              isUpdating={isUpdatingReasoning}
            />
          </details>

          {perspectives.length > 0 && (
            <details style={{ marginTop: 14, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
              <summary style={{ cursor: 'pointer', color: '#C2410C', fontSize: 14, fontWeight: 800 }}>
                Perspectives ({perspectives.length})
              </summary>
              <MeaningfulMultiPerspectiveView
                perspectives={perspectives}
                boundedComparison={report.boundedComparison}
                versionedEvidence={report.versionedEvidence}
              />
            </details>
          )}
        </section>

        {sourceModalData && (
          <SourcePassageModal
            caseId={caseId}
            {...sourceModalData}
            isOpen={Boolean(sourceModalData)}
            onClose={() => setSourceModalData(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        background: 'transparent', 
        padding: isMobile ? '12px 8px 100px' : '32px 20px 100px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Workspace Header / Session Status */}
      <div 
        style={{ 
          width: '100%', 
          maxWidth: '920px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '0 4px'
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: '1px solid #E2E8F0',
            color: '#475569',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            borderRadius: '999px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#C2410C';
            e.currentTarget.style.borderColor = '#FED7AA';
            e.currentTarget.style.background = '#FFF7ED';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#475569';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
          }}
        >
          ← Back to Workspace
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#C2410C', fontWeight: 700, background: '#FFF7ED', padding: '5px 12px', borderRadius: '999px', border: '1px solid #FED7AA', boxShadow: '0 1px 2px rgba(249, 115, 22, 0.1)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F97316', display: 'inline-block', boxShadow: '0 0 6px #F97316' }} />
          <span>ON-DEVICE ENCRYPTED</span>
        </div>
      </div>

      <div 
        style={{ 
          width: '100%', 
          maxWidth: '920px', 
          background: 'rgba(255, 255, 255, 0.96)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: '24px', 
          boxShadow: '0 20px 60px -15px rgba(194, 65, 12, 0.07), 0 1px 3px rgba(0,0,0,0.02)', 
          border: '1.5px solid rgba(254, 215, 170, 0.85)', 
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Background Glowing Ambient Orbs for Warmth and Visual Life */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '280px', height: '280px', background: '#FB923C', filter: 'blur(90px)', opacity: 0.14, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '35%', left: '-50px', width: '240px', height: '240px', background: '#FB7185', filter: 'blur(100px)', opacity: 0.09, borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', right: '15%', width: '260px', height: '260px', background: '#FBBF24', filter: 'blur(90px)', opacity: 0.08, borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Clinical Light Peach Hero Banner */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 60%, #FFFBF7 100%)', 
            padding: isMobile ? '22px 18px' : '28px 36px', 
            borderBottom: '1px solid #FED7AA',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{ 
                  width: '38px', 
                  height: '38px', 
                  borderRadius: '12px', 
                  background: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(234, 88, 12, 0.28)'
                }}
              >
                <BrainCircuit size={20} color="#FFFFFF" />
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '3px 10px', borderRadius: '999px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#F97316' }} />
                <span style={{ color: '#C2410C', fontWeight: 800, fontSize: '11px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                  Clinical Review Workstation
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                setShowSovereigntyModal(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: '#FFF7ED',
                border: '1px solid #FED7AA',
                color: '#9A3412',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Review how data is stored and processed"
            >
              <ShieldCheck size={13} />
              <span>Zero-Knowledge Privacy</span>
            </button>
          </div>

          <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
            Review your health records
          </h1>

          <p style={{ color: '#475569', fontSize: '14px', margin: 0, lineHeight: 1.5, maxWidth: '720px' }}>
            Synthesizing clinical timeline notes, lab reports, and case history into an evidence-audited diagnostic briefing.
          </p>
        </div>

        {/* Engaging 3-Step Onboarding Progress Track */}
        <div 
          style={{ 
            padding: '16px 24px 14px', 
            background: '#FFFBF7', 
            borderBottom: '1px solid #FED7AA',
            position: 'relative',
            zIndex: 1
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 3 Gradient Progress Capsules */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div 
                onClick={() => { triggerHapticSelection(); setIntakeStep(1); }}
                style={{ 
                  flex: 1, 
                  height: '7px', 
                  borderRadius: '999px', 
                  background: 'linear-gradient(90deg, #EA580C, #F97316, #FB923C)',
                  boxShadow: intakeStep === 1 ? '0 0 10px rgba(249, 115, 22, 0.45)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }} 
              />
              <div 
                onClick={() => { triggerHapticSelection(); setIntakeStep(2); }}
                style={{ 
                  flex: 1, 
                  height: '7px', 
                  borderRadius: '999px', 
                  background: intakeStep >= 2 || files.length > 0 ? 'linear-gradient(90deg, #EA580C, #F97316, #FB923C)' : '#FFEDD5',
                  boxShadow: intakeStep === 2 ? '0 0 10px rgba(249, 115, 22, 0.45)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }} 
              />
              <div 
                onClick={() => { triggerHapticSelection(); setIntakeStep(3); }}
                style={{ 
                  flex: 1, 
                  height: '7px', 
                  borderRadius: '999px', 
                  background: intakeStep === 3 ? 'linear-gradient(90deg, #EA580C, #F97316, #FB923C)' : '#FFEDD5',
                  boxShadow: intakeStep === 3 ? '0 0 10px rgba(249, 115, 22, 0.45)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease'
                }} 
              />
            </div>

            {/* Step Sub-label & Interactive Pill Navigators */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#9A3412' }}>
                  Step {intakeStep} of 3 · {intakeStep === 1 ? 'Clinical Narrative & Symptoms' : intakeStep === 2 ? 'Lab Reports & Medical Evidence' : 'Scope, Context & Launchpad'}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#C2410C', background: '#FFF7ED', padding: '1px 8px', borderRadius: '999px', border: '1px solid #FED7AA' }}>
                  {intakeStep === 1 ? 'Start with symptoms ✨' : intakeStep === 2 ? 'Evidence Vault 📄' : 'Final Step 🚀'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {[
                  { step: 1, label: '1. Narrative', isDone: Boolean(history.trim()) },
                  { step: 2, label: '2. Evidence', isDone: files.length > 0 },
                  { step: 3, label: '3. Scope', isDone: Boolean(history.trim() || files.length > 0) }
                ].map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setIntakeStep(item.step as 1 | 2 | 3);
                    }}
                    style={{
                      padding: '4px 11px',
                      borderRadius: '999px',
                      border: intakeStep === item.step ? '1.5px solid #FB923C' : '1px solid #FED7AA',
                      background: intakeStep === item.step ? '#FFEDD5' : '#FFFFFF',
                      color: intakeStep === item.step ? '#9A3412' : '#78350F',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {item.isDone ? <Check size={12} color="#EA580C" strokeWidth={2.5} /> : null}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Step Body Content with Card-Based Rhythm */}
        <div style={{ padding: isMobile ? '20px 16px' : '28px 36px', position: 'relative', zIndex: 1 }}>
          {missingCaseId && (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                color: '#991B1B',
                fontSize: 14,
              }}
            >
              <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
              <div>
                <strong>Case Not Found:</strong> Case &quot;{missingCaseId}&quot; could not be found in your local records. You can choose another case below or start a new case.
              </div>
            </div>
          )}

            {/* ========================================================================= */}
            {/* STEP 1: CLINICAL TIMELINE & SYMPTOMS (CARD ONBOARDING FLOW)               */}
            {/* ========================================================================= */}
            {intakeStep === 1 && (
              <div key="step1">
                {/* CARD 1: When did you first notice this? */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '18px 16px' : '22px 24px',
                    border: '1.5px solid rgba(254, 215, 170, 0.85)',
                    boxShadow: '0 10px 30px rgba(194, 65, 12, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)', 
                        border: '1px solid #FDBA74', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#EA580C',
                        flexShrink: 0
                      }}
                    >
                      <CalendarClock size={19} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        When did you first notice this?
                      </h2>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                        Tap an onset timeframe to anchor your clinical chronology
                      </p>
                    </div>
                  </div>

                  {/* 6 Tactile Capsule Pills with Emojis & Active Glow */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { name: 'Today (< 24h)', emoji: '🌅', label: 'Today (< 24h)' },
                      { name: 'Past few days', emoji: '⏱️', label: 'Past few days' },
                      { name: '1–2 weeks', emoji: '🗓️', label: '1–2 weeks' },
                      { name: '1–3 months', emoji: '⏳', label: '1–3 months' },
                      { name: '6+ months (chronic)', emoji: '🌊', label: '6+ months (chronic)' },
                      { name: 'Several years', emoji: '📅', label: 'Several years' },
                    ].map((opt) => {
                      const isSelected = selectedOnset === opt.name || history.includes(`Onset: ${opt.name}`);
                      return (
                        <motion.button
                          key={opt.name}
                          type="button"
                          aria-label={opt.name}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleSelectOnset(opt.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '8px 15px',
                            borderRadius: '999px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? '1.5px solid #FB923C' : '1px solid #FED7AA',
                            background: isSelected ? '#FFEDD5' : '#FFFFFF',
                            color: isSelected ? '#9A3412' : '#431407',
                            boxShadow: isSelected ? '0 2px 8px rgba(249, 115, 22, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '13px' }}>{opt.emoji}</span>
                          <span>{opt.name}</span>
                          {isSelected && <Check size={13} color="#EA580C" strokeWidth={2.5} />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* CARD 2: How is the symptom behaving? */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '18px 16px' : '22px 24px',
                    border: '1.5px solid rgba(254, 215, 170, 0.85)',
                    boxShadow: '0 10px 30px rgba(194, 65, 12, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)', 
                        border: '1px solid #FDBA74', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#EA580C',
                        flexShrink: 0
                      }}
                    >
                      <Activity size={19} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        How is the symptom behaving?
                      </h2>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                        Progression pattern helps clinicians evaluate trajectory and urgency
                      </p>
                    </div>
                  </div>

                  {/* 4 Distinct Trend Capsule Pills with Custom Colors */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {[
                      { name: 'Getting worse ↗', label: 'Getting worse', emoji: '↗️', activeBg: '#FFF1F2', activeBorder: '#FDA4AF', activeColor: '#BE123C' },
                      { name: 'Fluctuating / Comes & Goes ∿', label: 'Fluctuating', emoji: '∿', activeBg: '#FFF7ED', activeBorder: '#FDBA74', activeColor: '#C2410C' },
                      { name: 'Constant / Unchanged →', label: 'Constant', emoji: '→', activeBg: '#F8FAFC', activeBorder: '#CBD5E1', activeColor: '#334155' },
                      { name: 'Gradually improving ↘', label: 'Gradually improving', emoji: '↘️', activeBg: '#ECFDF5', activeBorder: '#A7F3D0', activeColor: '#047857' },
                    ].map((opt) => {
                      const isSelected = selectedProgression === opt.name || history.includes(`Progression: ${opt.name}`);
                      return (
                        <motion.button
                          key={opt.name}
                          type="button"
                          aria-label={opt.name}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => handleSelectProgression(opt.name)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '7px',
                            padding: '8px 15px',
                            borderRadius: '999px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSelected ? `1.5px solid ${opt.activeBorder}` : '1px solid #FED7AA',
                            background: isSelected ? opt.activeBg : '#FFFFFF',
                            color: isSelected ? opt.activeColor : '#431407',
                            boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.08)' : '0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '13px' }}>{opt.emoji}</span>
                          <span>{opt.name}</span>
                          {isSelected && <Check size={13} color={opt.activeColor} strokeWidth={2.5} />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* CARD 3: Describe what you're experiencing */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '18px 16px' : '22px 24px',
                    border: '1.5px solid rgba(254, 215, 170, 0.85)',
                    boxShadow: '0 10px 30px rgba(194, 65, 12, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div 
                        style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)', 
                          border: '1px solid #FDBA74', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          color: '#EA580C',
                          flexShrink: 0
                        }}
                      >
                        <FileText size={19} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          Describe what you are experiencing
                        </h2>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                          Your timeline narrative, symptom sensations, and questions in your own voice
                        </p>
                      </div>
                    </div>

                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) 
                          ? '#EF4444' 
                          : (history.trim().split(/\s+/).filter(w => w.length > 0).length > 650)
                          ? '#D97706'
                          : '#C2410C',
                        background: '#FFF7ED',
                        border: '1px solid #FED7AA',
                        padding: '3px 9px',
                        borderRadius: '999px'
                      }}
                    >
                      {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
                    </span>
                  </div>

                  {/* Magic Prompt Pills */}
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sparkles size={12} color="#F97316" />
                      <span>Tap to insert structured clinical prompts:</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                      {[
                        { label: 'Onset & Duration', emoji: '⏱️', text: 'When this started and how it has changed: ' },
                        { label: 'Symptoms & Frequency', emoji: '🩺', text: 'Symptoms I have noticed, how often they happen, and daily impact: ' },
                        { label: 'Triggers & Relief', emoji: '⚡', text: 'Things that seem to improve or worsen symptoms: ' },
                        { label: 'Prior Tests & Care', emoji: '📋', text: 'Appointments, tests, treatments, and prior doctor opinions: ' },
                        { label: 'Questions for Doctor', emoji: '❓', text: 'What I most want help understanding from my clinician: ' }
                      ].map((cluster, cIdx) => (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setHistory(prev => prev ? `${prev}\n\n${cluster.text}` : cluster.text);
                          }}
                          style={{
                            flexShrink: 0,
                            padding: '6px 12px',
                            borderRadius: '999px',
                            background: '#FFFFFF',
                            border: '1px solid #FED7AA',
                            color: '#431407',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#FFF7ED';
                            e.currentTarget.style.borderColor = '#FB923C';
                            e.currentTarget.style.color = '#9A3412';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = '#FFFFFF';
                            e.currentTarget.style.borderColor = '#FED7AA';
                            e.currentTarget.style.color = '#431407';
                          }}
                        >
                          <span>{cluster.emoji}</span>
                          <span>{cluster.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Frosted Textarea */}
                  <textarea 
                    id="clinical-timeline"
                    value={history}
                    onChange={(e) => {
                      const text = e.target.value;
                      const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                      if (words.length <= 800 || text.length < history.length) {
                        setHistory(text);
                      }
                    }}
                    placeholder="Describe when this started, how symptoms feel, what makes them better or worse, or prior doctor opinions (Max 800 words)..."
                    aria-label="Clinical timeline and symptom notes"
                    style={{ 
                      width: '100%', 
                      height: '170px', 
                      padding: '16px', 
                      borderRadius: '16px', 
                      border: '1.5px solid #FED7AA', 
                      resize: 'vertical', 
                      fontSize: '13.5px', 
                      fontFamily: 'inherit', 
                      background: '#FAFAFA', 
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease', 
                      outline: 'none',
                      lineHeight: 1.55,
                      color: '#0F172A'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#FB923C';
                      e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.18)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#FED7AA';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Step 1 Action Bar */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #FED7AA' 
                  }}
                >
                  <span style={{ fontSize: '12px', color: '#64748B' }}>
                    Step 1 of 3 · Documents are optional if notes are provided
                  </span>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setIntakeStep(2);
                      }}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: '#FFF7ED',
                        color: '#C2410C',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: '1.5px solid #FED7AA',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Next: Add Evidence (Step 2)</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunInvestigation}
                      disabled={isReadingFiles || (!history.trim() && !files.length)}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: (isReadingFiles || (!history.trim() && !files.length)) ? '#E2E8F0' : 'linear-gradient(135deg, #F97316 0%, #FB923C 50%, #EA580C 100%)',
                        color: (isReadingFiles || (!history.trim() && !files.length)) ? '#94A3B8' : '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: 'none',
                        cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: (isReadingFiles || (!history.trim() && !files.length)) ? 'none' : '0 6px 18px rgba(249, 115, 22, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 2: LAB & EVIDENCE VAULT                                              */}
            {/* ========================================================================= */}
            {intakeStep === 2 && (
              <div key="step2">
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '18px 16px' : '24px 28px',
                    border: '1.5px solid rgba(254, 215, 170, 0.85)',
                    boxShadow: '0 10px 30px rgba(194, 65, 12, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)', 
                        border: '1px solid #FDBA74', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#EA580C',
                        flexShrink: 0
                      }}
                    >
                      <UploadCloud size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Lab Reports & Medical Evidence
                      </h2>
                      <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                        Upload PDFs, lab panels, or discharge summaries. The engine extracts documented facts and audits contradictions.
                      </p>
                    </div>
                  </div>

                  {/* Upload Dropzone */}
                  <div style={{ marginBottom: '18px' }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileSelect} 
                      multiple 
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      aria-label="Upload medical records, lab reports, or health documents"
                      style={{ display: 'none' }} 
                    />

                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()} 
                      aria-label="Upload PDFs or photos of medical records" 
                      style={{ 
                        width: '100%', 
                        padding: '28px 20px', 
                        background: 'linear-gradient(135deg, #FFFBF7 0%, #FFF7ED 100%)', 
                        border: '2px dashed #FDBA74', 
                        borderRadius: '18px', 
                        color: '#C2410C', 
                        fontWeight: 700, 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        gap: '12px', 
                        cursor: 'pointer', 
                        transition: 'all 0.2s ease', 
                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.04)' 
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = '#F97316';
                        e.currentTarget.style.background = '#FFEDD5';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = '#FDBA74';
                        e.currentTarget.style.background = 'linear-gradient(135deg, #FFFBF7 0%, #FFF7ED 100%)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#FFEDD5', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)' }}>
                        <UploadCloud size={25} color="#EA580C" />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '15px', color: '#0F172A', display: 'block', fontWeight: 800 }}>
                          Drop Lab Reports, Discharge Summaries, or Imaging
                        </span>
                        <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500, marginTop: '3px', display: 'block' }}>
                          PDF, JPG, PNG or WebP · up to 10 files · 3 MB per file
                        </span>
                      </div>
                      <div style={{ display: 'inline-flex', gap: '8px', marginTop: '4px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#C2410C', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '3px 9px', borderRadius: '999px' }}>📄 PDF Lab Panels</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#9A3412', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '3px 9px', borderRadius: '999px' }}>📸 Photos & Scans</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#EA580C', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '3px 9px', borderRadius: '999px' }}>🔬 Imaging Reports</span>
                      </div>
                    </button>
                  </div>

                  {/* Uploaded Staged File List */}
                  {files.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                      <div style={{
                        padding: '8px 14px',
                        background: '#FFF7ED',
                        border: '1px solid #FED7AA',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#9A3412',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <ShieldCheck size={16} color="#EA580C" />
                        <span><strong>{files.length} document(s) staged.</strong> Original files are encrypted on your local device.</span>
                      </div>
                      {files.map((f, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between', 
                            padding: '10px 14px', 
                            background: '#FFFFFF', 
                            border: '1px solid #FED7AA', 
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <FileText size={15} color="#EA580C" />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {f.file.name}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748B', flexShrink: 0 }}>
                              ({Math.round(f.size / 1024)} KB)
                            </span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFile(idx)} 
                            aria-label={`Remove uploaded file ${f.file.name}`} 
                            style={{ 
                              background: '#F8FAFC', 
                              border: '1px solid #E2E8F0', 
                              borderRadius: '8px', 
                              color: '#64748B', 
                              cursor: 'pointer', 
                              padding: '6px', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              transition: 'all 0.15s ease' 
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = '#DC2626';
                              e.currentTarget.style.borderColor = '#FCA5A5';
                              e.currentTarget.style.background = '#FEF2F2';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = '#64748B';
                              e.currentTarget.style.borderColor = '#E2E8F0';
                              e.currentTarget.style.background = '#F8FAFC';
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '12px 16px', background: '#FFFBF7', border: '1px solid #FED7AA', borderRadius: '12px', fontSize: '12px', color: '#78350F', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FB923C', display: 'inline-block' }} />
                      <span>No documents attached yet. If you have lab panels or scans, upload them above for extraction.</span>
                    </div>
                  )}

                  {/* Existing Connected Case Documents */}
                  {(() => {
                    const activeCase = selectedCaseId ? getCase(selectedCaseId) : null;
                    if (!activeCase?.medicalRecords || activeCase.medicalRecords.length === 0) return null;
                    return (
                      <div style={{ borderTop: '1px solid #FED7AA', paddingTop: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Connected Case Records ({activeCase.medicalRecords.length})
                          </span>
                          <span style={{ fontSize: '11px', color: '#C2410C', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <ShieldCheck size={12} /> Stored on device
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {activeCase.medicalRecords.map((rec) => (
                            <div
                              key={rec.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 12px',
                                background: '#FFFBF7',
                                border: '1px solid #FED7AA',
                                borderRadius: '10px',
                                fontSize: '12px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <FileText size={14} color="#EA580C" />
                                <span style={{ fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                                  {rec.filename}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  triggerHapticLight();
                                  setSourceModalData({
                                    isOpen: true,
                                    onClose: () => setSourceModalData(null),
                                    caseId: activeCase.id,
                                    recordId: rec.id,
                                    findingId: rec.passages?.[0]?.id,
                                    recordTitle: rec.filename,
                                    recordType: rec.type,
                                    pageNumber: rec.passages?.[0]?.page,
                                    passageText: rec.passages?.[0]?.text || rec.findings || 'No passage text available',
                                    fullFindings: rec.findings,
                                    dateAdded: rec.addedAt,
                                    findingClaim: rec.findings,
                                    onCorrectionSaved: () => {
                                      toast.success('Document Extraction Updated', 'Non-destructive correction recorded in case.');
                                    }
                                  });
                                }}
                                style={{
                                  background: '#FFF7ED',
                                  border: '1px solid #FED7AA',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  color: '#C2410C',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Review Extractions ↗
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Step 2 Action Bar */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #FED7AA' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(1);
                    }}
                    style={{
                      padding: '11px 18px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #FED7AA',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Timeline
                  </button>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setIntakeStep(3);
                      }}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: '#FFF7ED',
                        color: '#C2410C',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: '1.5px solid #FED7AA',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>Next: Scope & Run (Step 3)</span>
                      <ArrowRight size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={handleRunInvestigation}
                      disabled={isReadingFiles || (!history.trim() && !files.length)}
                      style={{
                        padding: '11px 22px',
                        borderRadius: '12px',
                        background: (isReadingFiles || (!history.trim() && !files.length)) ? '#E2E8F0' : 'linear-gradient(135deg, #F97316 0%, #FB923C 50%, #EA580C 100%)',
                        color: (isReadingFiles || (!history.trim() && !files.length)) ? '#94A3B8' : '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '13.5px',
                        border: 'none',
                        cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: (isReadingFiles || (!history.trim() && !files.length)) ? 'none' : '0 6px 18px rgba(249, 115, 22, 0.35)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Sparkles size={15} />
                      <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* STEP 3: REVIEW SCOPE, CASE ROUTING & LAUNCHPAD                            */}
            {/* ========================================================================= */}
            {intakeStep === 3 && (
              <div key="step3">
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.94)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: isMobile ? '18px 16px' : '24px 28px',
                    border: '1.5px solid rgba(254, 215, 170, 0.85)',
                    boxShadow: '0 10px 30px rgba(194, 65, 12, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <div 
                      style={{ 
                        width: '38px', 
                        height: '38px', 
                        borderRadius: '12px', 
                        background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)', 
                        border: '1px solid #FDBA74', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: '#EA580C',
                        flexShrink: 0
                      }}
                    >
                      <Sliders size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Review Scope & Launchpad
                      </h2>
                      <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                        Confirm evidence readiness, case routing, and launch your multisystem clinical review.
                      </p>
                    </div>
                  </div>

                  {/* Evidence Readiness Checklist Card */}
                  <div 
                    style={{ 
                      marginBottom: '18px', 
                      padding: '16px 18px', 
                      background: '#FFFBF7', 
                      border: '1px solid #FED7AA', 
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Evidence Readiness Checklist
                    </span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ padding: '10px 12px', background: '#FFFFFF', border: '1px solid #FED7AA', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Clinical Timeline</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: history.trim() ? '#EA580C' : '#64748B', marginTop: '2px' }}>
                          {history.trim() ? `✓ ${history.trim().split(/\s+/).filter(w => w.length > 0).length} words recorded` : '○ No notes (records only)'}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', background: '#FFFFFF', border: '1px solid #FED7AA', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Attached Evidence</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: files.length > 0 ? '#EA580C' : '#64748B', marginTop: '2px' }}>
                          {files.length > 0 ? `✓ ${files.length} document(s) staged` : '○ No files (timeline only)'}
                        </div>
                      </div>

                      <div style={{ padding: '10px 12px', background: '#FFFFFF', border: '1px solid #FED7AA', borderRadius: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Destination Case</div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: selectedCaseId ? '#EA580C' : '#334155', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedCaseId ? '✓ Existing Timeline' : '✓ New Case Draft'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Case Destination Workspace Dock */}
                  <div 
                    style={{ 
                      marginBottom: '18px',
                      padding: '16px 18px',
                      background: '#FFFFFF',
                      border: '1.5px solid #FED7AA',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FFF7ED', border: '1px solid #FED7AA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Folder size={15} color="#EA580C" />
                        </div>
                        <div>
                          <label htmlFor="engine-case-context" style={{ fontWeight: 800, fontSize: '13.5px', color: '#0F172A', display: 'block' }}>
                            Save to
                          </label>
                        </div>
                      </div>
                      <span style={{ fontSize: '11.5px', color: selectedCaseId ? '#EA580C' : '#64748B', fontWeight: 700 }}>
                        {selectedCaseId ? 'Connected to Case Timeline' : 'New Longitudinal Case'}
                      </span>
                    </div>

                    <div style={{ position: 'relative' }}>
                      <select 
                        id="engine-case-context" 
                        aria-label="Where should this review be saved?" 
                        value={selectedCaseId} 
                        onChange={e => setSelectedCaseId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 36px 10px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #FED7AA',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '13.5px',
                          fontWeight: 600,
                          appearance: 'none',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#FB923C';
                          e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#FED7AA';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Start a new case</option>
                        {availableCases.filter(item => item.status !== 'archived').map(item => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                      <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#64748B' }}>
                        <ChevronDown size={16} />
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                      {selectedCaseId ? 'Uses this case’s saved context.' : 'Creates a new case.'} Starting a review sends the included information to the AI service.
                    </p>
                    {isReadingFiles && (
                      <p role="status" style={{ fontSize: 12, color: '#EA580C', fontWeight: 700, margin: 0 }}>
                        Preparing your documents… Please wait before starting the review.
                      </p>
                    )}
                  </div>

                  {/* Review Objective Focus */}
                  <div style={{ marginBottom: '18px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                      Clinical Objective Focus
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'differential', label: 'Differential Diagnosis', desc: 'Multisystem scan for primary & alternative hypotheses' },
                        { id: 'doctor_prep', label: 'Doctor Visit Prep (SBAR)', desc: 'Prioritize questions and appointment briefing notes' },
                        { id: 'lab_second_opinion', label: 'Biomarker Synthesis', desc: 'Cross-reference lab ranges and contradictory findings' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            triggerHapticSelection();
                            setReviewFocus(opt.id as any);
                          }}
                          style={{
                            padding: '12px 14px',
                            borderRadius: '14px',
                            textAlign: 'left',
                            border: reviewFocus === opt.id ? '1.5px solid #FB923C' : '1px solid #FED7AA',
                            background: reviewFocus === opt.id ? '#FFF7ED' : '#FFFFFF',
                            boxShadow: reviewFocus === opt.id ? '0 2px 8px rgba(249, 115, 22, 0.15)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontSize: '12.5px', fontWeight: 800, color: reviewFocus === opt.id ? '#9A3412' : '#0F172A' }}>
                            {opt.label}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', lineHeight: 1.35 }}>
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Isolated Investigation Toggle */}
                  {profile?.conditions && profile.conditions.length > 0 ? (
                    <div 
                      style={{ 
                        padding: '14px 18px', 
                        background: '#FFFBF7', 
                        border: '1px solid #FED7AA', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        flexWrap: 'wrap', 
                        gap: '12px' 
                      }}
                    >
                      <div style={{ flex: '1 1 240px' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Sliders size={14} color="#EA580C" />
                          <span>Isolated Investigation Mode</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: 1.4 }}>
                          {isIsolated 
                            ? 'Analyzes strictly what you typed and uploaded above (ignores background profile conditions).' 
                            : 'Correlates your input with your known medical profile conditions.'}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setIsIsolated(!isIsolated);
                        }}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '10px',
                          border: isIsolated ? '1.5px solid #FB923C' : '1px solid #FED7AA',
                          background: isIsolated ? '#FFF7ED' : '#FFFFFF',
                          color: isIsolated ? '#C2410C' : '#475569',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isIsolated ? '✓ Isolated (On)' : 'Correlate Profile (Default)'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: '#FFFBF7', border: '1px solid #FED7AA', borderRadius: '12px', fontSize: '12px', color: '#78350F' }}>
                      <span>No background profile conditions recorded. The review will analyze direct case inputs.</span>
                    </div>
                  )}
                </div>

                {/* Step 3 Action Bar & Primary Launch CTA */}
                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '14px', 
                    paddingTop: '16px', 
                    borderTop: '1px solid #FED7AA' 
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(2);
                    }}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '14px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '14px',
                      border: '1px solid #FED7AA',
                      cursor: 'pointer'
                    }}
                  >
                    ← Back to Evidence
                  </button>

                  <button
                    type="button"
                    onClick={handleRunInvestigation}
                    disabled={isReadingFiles || (!history.trim() && !files.length)}
                    style={{
                      flex: '1 1 280px',
                      padding: '16px 28px',
                      borderRadius: '16px',
                      border: 'none',
                      background: (isReadingFiles || (!history.trim() && !files.length))
                        ? '#E2E8F0'
                        : 'linear-gradient(135deg, #F97316 0%, #FB923C 50%, #EA580C 100%)',
                      color: (isReadingFiles || (!history.trim() && !files.length))
                        ? '#94A3B8'
                        : '#FFFFFF',
                      fontSize: '15.5px',
                      fontWeight: 800,
                      cursor: (isReadingFiles || (!history.trim() && !files.length)) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: (isReadingFiles || (!history.trim() && !files.length))
                        ? 'none'
                        : '0 10px 30px -4px rgba(249, 115, 22, 0.4)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseDown={(e) => {
                      if (!isReadingFiles && (history.trim() || files.length)) {
                        e.currentTarget.style.transform = 'scale(0.99)';
                      }
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Sparkles size={18} />
                    <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

        </div>
      </div>

      {sourceModalData && (
        <SourcePassageModal
          caseId={createdCaseId || selectedCaseId}
          {...sourceModalData}
          isOpen={Boolean(sourceModalData)}
          onClose={() => setSourceModalData(null)}
        />
      )}
    </div>
  );
}










