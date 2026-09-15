import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  FileUp, Sparkles, Search, ArrowRight,
  X, HelpCircle, BrainCircuit, Copy, Check,
  AlertTriangle, ShieldCheck, Stethoscope, CalendarClock,
  FileText, Zap, ChevronRight, AlertCircle, Plus
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
            <summary style={{ cursor: 'pointer', color: '#0F766E', fontSize: 14, fontWeight: 800 }}>
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
              <summary style={{ cursor: 'pointer', color: '#0F766E', fontSize: 14, fontWeight: 800 }}>
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
        background: '#FDFBF7', 
        padding: isMobile ? '16px 12px 100px' : '40px 24px 100px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ width: '100%', maxWidth: '960px', marginBottom: '16px' }}>
        
      </div>

      <div 
        style={{ 
          width: '100%', 
          maxWidth: '960px', 
          background: '#FFFFFF', 
          borderRadius: '24px', 
          boxShadow: '0 12px 40px rgba(249, 115, 22, 0.06), 0 1px 3px rgba(0,0,0,0.02)', 
          border: '1.5px solid #FED7AA', 
          overflow: 'hidden' 
        }}
      >
        {/* Amber Hero Banner */}
        <div 
          style={{ 
            background: 'linear-gradient(135deg, #FFFDFB 0%, #FFF7ED 50%, #FFEDD5 100%)', 
            padding: isMobile ? '24px 16px' : '36px 36px', 
            borderBottom: '1px solid #FED7AA',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div 
              style={{ 
                width: '38px', 
                height: '38px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)'
              }}
            >
              <BrainCircuit size={20} color="#FFFFFF" />
            </div>
            <span style={{ color: '#9A3412', fontWeight: 800, fontSize: '12px', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Clinical Review
            </span>
          </div>

          <h1 style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 12px 0', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
            Review your health records
          </h1>

          <p style={{ color: '#475569', fontSize: '14.5px', margin: '0 0 18px 0', lineHeight: 1.6, maxWidth: '680px' }}>
            Organize documented facts, uncertainties, and questions for your visit.
          </p>

          <div style={{ marginTop: 8 }}>
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
                padding: '6px 12px',
                borderRadius: '999px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                color: '#15803D',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              title="Review how data is stored and processed"
            >
              <ShieldCheck size={13} />
              <span>Privacy and data use</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: isMobile ? '20px 16px' : '32px 36px' }}>
          {missingCaseId && (
            <div
              role="alert"
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 12,
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
          <div className="connected-experience" style={{ marginBottom: 24 }}>
            <label htmlFor="engine-case-context" style={{ fontWeight: 700 }}>Save to</label>
            <select id="engine-case-context" aria-label="Where should this review be saved?" className="case-context-select" value={selectedCaseId} onChange={e => setSelectedCaseId(e.target.value)}>
              <option value="">Start a new case</option>
              {availableCases.filter(item => item.status !== 'archived').map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
            </select>
            <p style={{ fontSize: 12, color: '#475569' }}>{selectedCaseId ? 'Uses this case’s saved context.' : 'Creates a new case.'} Starting a review sends the included information to the AI service.</p>
            {isReadingFiles && <p role="status">Preparing your documents… Please wait before starting the review.</p>}
          </div>

          {/* 1-Tap Multi-System Clinical Clusters */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={13} color="#EA580C" />
                Writing prompts
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
              {[
                { label: 'When it started', icon: '📅', text: 'When this started and how it has changed: ' },
                { label: 'What I notice', icon: '📝', text: 'Symptoms I have noticed, how often they happen, and their effect on my day: ' },
                { label: 'What changes it', icon: '🔎', text: 'Things that seem to improve or worsen symptoms (if known): ' },
                { label: 'Care so far', icon: '📋', text: 'Appointments, tests, treatments, and what my clinician told me: ' },
                { label: 'My main question', icon: '💬', text: 'What I most want help understanding: ' }
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
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: '#FFF7ED',
                    border: '1px solid #FED7AA',
                    color: '#9A3412',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(249, 115, 22, 0.05)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#FFEDD5';
                    e.currentTarget.style.borderColor = '#FDBA74';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#FFF7ED';
                    e.currentTarget.style.borderColor = '#FED7AA';
                  }}
                >
                  <span>{cluster.icon}</span>
                  <span>{cluster.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Timeline & Symptoms Textarea */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="clinical-timeline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              <span style={{ fontSize: '14.5px' }}>Timeline and symptoms</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: (history.trim().split(/\s+/).filter(w => w.length > 0).length >= 800) ? '#EF4444' : '#64748B' }}>
                {history.trim().split(/\s+/).filter(w => w.length > 0).length} / 800 words
              </span>
            </label>

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
              placeholder="Paste months/years of symptom progression, doctor visits, onset triggers, or what makes you feel worse (Max 800 words)..."
              aria-label="Clinical timeline and symptom notes"
              style={{ 
                width: '100%', 
                height: '160px', 
                padding: '16px', 
                borderRadius: '16px', 
                border: '1.5px solid #CBD5E1', 
                resize: 'vertical', 
                fontSize: '14.5px', 
                fontFamily: 'inherit', 
                background: '#F8FAFC', 
                transition: 'border-color 0.2s', 
                outline: 'none',
                lineHeight: 1.5
              }}
              onFocus={(e) => e.target.style.borderColor = '#F97316'}
              onBlur={(e) => e.target.style.borderColor = '#CBD5E1'}
            />
          </div>

          {/* Document Upload Area */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              <span style={{ fontSize: '14.5px' }}>Medical Records & Lab Work (Optional)</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>PDF / Images</span>
            </label>

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
                padding: '24px 16px', 
                background: '#FFFDFB', 
                border: '2px dashed #FDBA74', 
                borderRadius: '16px', 
                color: '#9A3412', 
                fontWeight: 700, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                gap: '10px', 
                cursor: 'pointer', 
                transition: 'all 0.2s' 
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#EA580C';
                e.currentTarget.style.background = '#FFF7ED';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#FDBA74';
                e.currentTarget.style.background = '#FFFDFB';
              }}
            >
              <div style={{ background: '#FFEDD5', padding: '12px', borderRadius: '50%' }}>
                <FileUp size={22} color="#C2410C" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '14.5px', color: '#0F172A', display: 'block' }}>Upload Lab Reports, Discharge Summaries, or Imaging</span>
                <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>PDF, JPG, PNG or WebP · up to 10 files · 3 MB per file</span>
              </div>
            </button>

            {/* Uploaded File List */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <div style={{
                  padding: '8px 12px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '8px',
                  fontSize: '11.5px',
                  color: '#166534',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <ShieldCheck size={14} color="#16A34A" />
                  <span>Original files are stored securely on this device (never retained on external servers).</span>
                </div>
                {files.map((f, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '10px 14px', 
                      background: '#FFF7ED', 
                      border: '1px solid #FED7AA', 
                      borderRadius: '10px' 
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <FileText size={15} color="#C2410C" />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.file.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        ({Math.round(f.size / 1024)} KB)
                      </span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeFile(idx)} 
                      aria-label={`Remove uploaded file ${f.file.name}`} 
                      style={{ 
                        background: '#FFF', 
                        border: '1px solid #FED7AA', 
                        borderRadius: '6px', 
                        color: '#EF4444', 
                        cursor: 'pointer', 
                        padding: '4px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Existing Case Documents Review & Extraction Check */}
            {(() => {
              const activeCase = selectedCaseId ? getCase(selectedCaseId) : null;
              if (!activeCase?.medicalRecords || activeCase.medicalRecords.length === 0) return null;
              return (
                <div style={{ marginTop: '16px', borderTop: '1px dashed #FED7AA', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#9A3412', textTransform: 'uppercase' }}>
                      Attached Case Documents ({activeCase.medicalRecords.length})
                    </span>
                    <span style={{ fontSize: '11px', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
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
                          padding: '8px 12px',
                          background: '#FFFDFB',
                          border: '1px solid #FED7AA',
                          borderRadius: '8px',
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
                            background: 'rgba(2, 132, 199, 0.08)',
                            border: '1px solid rgba(2, 132, 199, 0.3)',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            color: '#0284C7',
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

          {/* Isolated Investigation Toggle */}
          {profile?.conditions && profile.conditions.length > 0 && (
            <div 
              style={{ 
                marginBottom: '24px', 
                padding: '14px 18px', 
                background: '#F8FAFC', 
                border: '1px solid #E2E8F0', 
                borderRadius: '14px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                flexWrap: 'wrap', 
                gap: '10px' 
              }}
            >
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                  Isolated Investigation Mode
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>
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
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: isIsolated ? '1px solid #F97316' : '1px solid #CBD5E1',
                  background: isIsolated ? '#FFF7ED' : '#FFF',
                  color: isIsolated ? '#C2410C' : '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {isIsolated ? 'Isolate (On)' : 'Include Profile (Off)'}
              </button>
            </div>
          )}

          {/* Primary Amber CTA Button */}
          <button
            type="button"
            onClick={handleRunInvestigation}
            disabled={isReadingFiles || (!history.trim() && !files.length)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              border: 'none',
              background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
              color: '#FFFFFF',
              fontSize: '16px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.99)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Sparkles size={18} />
            <span>{isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}</span>
            <ArrowRight size={18} />
          </button>

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










