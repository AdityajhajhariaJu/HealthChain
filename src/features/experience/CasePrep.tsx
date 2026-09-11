import React, { useState, useEffect, useMemo } from 'react';
import {
  getCases,
  CaseItem,
  getCase,
  saveAppointmentBrief,
  AppointmentBrief,
  getCaseQuestions,
  addCaseQuestion,
  ClinicalQuestion,
  transitionCaseQuestionLifecycle,
  recordCaseQuestionOutcome,
  setQuestionsForAppointment,
  QuestionLifecycleStatus,
} from '../../services/CaseEngine';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';
import { generateDeterministicBrief, isBriefUpToDate } from '../../services/AppointmentBriefService';
import { refineAppointmentBrief } from '../../services/geminiService';
import { getProfile } from '../../services/ProfileEngine';
import {
  ArrowRight,
  Briefcase,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Printer,
  Sparkles,
  AlertCircle,
  Eye,
  Info,
  CheckCircle2,
  Copy,
  MessageSquare,
  CheckSquare,
  Square,
  History,
  RotateCcw,
  Clock,
  Check,
  Tag,
  ListFilter,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../components/ui/ToastProvider';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FeatureMissionHeader } from '../../components/ui/FeatureMissionHeader';

const DOCTOR_ACTION_PRESETS = [
  'General discussion / clinical reassurance',
  'Ordered diagnostic lab / scan',
  'Prescription / dosage adjusted',
  'Specialist referral ordered',
  'Dietary / lifestyle modification',
  'Watchful waiting & follow-up',
];

export default function CasePrep() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const caseIdParam = searchParams.get('caseId');

  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [brief, setBrief] = useState<AppointmentBrief | null>(null);
  const [selectedBriefVersion, setSelectedBriefVersion] = useState<number | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [caseNotFoundId, setCaseNotFoundId] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  // Outcome recorder state
  const [outcomeNotes, setOutcomeNotes] = useState<Record<string, string>>({});
  const [outcomeStatuses, setOutcomeStatuses] = useState<Record<string, 'discussed' | 'deferred' | 'resolved'>>({});
  const [outcomeDoctorActions, setOutcomeDoctorActions] = useState<Record<string, string>>({});
  const [savingOutcomeId, setSavingOutcomeId] = useState<string | null>(null);

  // Synchronize case questions
  const caseQuestions: ClinicalQuestion[] = useMemo(() => {
    if (!selectedCase) return [];
    const directQuestions = getCaseQuestions(selectedCase.id);
    if (directQuestions && directQuestions.length > 0) return directQuestions;
    // Fallback to questions synthesized in the brief
    if (brief?.questionsForClinician && brief.questionsForClinician.length > 0) {
      return brief.questionsForClinician.map((q: any, i: number) => ({
        id: q.id || `brief_q_${i}`,
        questionText: typeof q === 'string' ? q : q?.question || 'Clinical question',
        category: 'general' as const,
        status: (q.status || 'open') as QuestionLifecycleStatus,
        raisedBySpecialty: 'Primary Care',
        supportingEvidenceIds: q.sourceIds || [],
        createdAt: new Date().toISOString(),
      }));
    }
    return [];
  }, [selectedCase, brief]);

  // Determine active brief being inspected (current vs archived from history)
  const isViewingArchived = Boolean(
    selectedBriefVersion !== null &&
    selectedCase?.appointmentBriefs?.current &&
    selectedCase.appointmentBriefs.current.version !== selectedBriefVersion
  );

  const displayedBrief: AppointmentBrief | null = useMemo(() => {
    if (!selectedCase) return brief;
    if (selectedBriefVersion !== null) {
      if (selectedCase.appointmentBriefs?.current?.version === selectedBriefVersion) {
        return selectedCase.appointmentBriefs.current;
      }
      const foundInHistory = selectedCase.appointmentBriefs?.history?.find(
        h => h.version === selectedBriefVersion
      );
      if (foundInHistory) return foundInHistory;
    }
    return brief || selectedCase.appointmentBriefs?.current || null;
  }, [selectedCase, brief, selectedBriefVersion]);

  // Seed question selection from current brief
  useEffect(() => {
    if (displayedBrief?.questionIdsIncluded && displayedBrief.questionIdsIncluded.length > 0) {
      setSelectedQuestionIds(displayedBrief.questionIdsIncluded);
    } else if (caseQuestions.length > 0) {
      setSelectedQuestionIds(caseQuestions.map(q => q.id));
    }
  }, [displayedBrief?.briefId, caseQuestions.length]);

  const handleToggleQuestion = (qId: string) => {
    triggerHapticLight();
    setSelectedQuestionIds(prev =>
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleApplyQuestionSelection = () => {
    if (!selectedCase) return;
    triggerHapticLight();
    const profile = getProfile();

    // Ensure any synthesized brief questions exist on the case object
    (caseQuestions || []).forEach(cq => {
      addCaseQuestion(selectedCase.id, {
        id: cq.id,
        questionText: cq.questionText,
        status: cq.status || 'open',
        raisedBySpecialty: cq.raisedBySpecialty || 'Primary Care',
        supportingEvidenceIds: cq.supportingEvidenceIds || [],
      });
    });

    // Mark selected questions as prepared
    setQuestionsForAppointment(selectedCase.id, selectedQuestionIds);

    // Generate new version of deterministic brief with the user-selected questions
    const updated = generateDeterministicBrief(selectedCase, profile, {
      selectedQuestionIds,
    });
    const saved = saveAppointmentBrief(selectedCase.id, updated);

    if (saved) {
      setSelectedCase(saved);
      setBrief(saved.appointmentBriefs?.current || updated);
      setSelectedBriefVersion(null); // Return to current
    } else {
      setBrief(updated);
    }

    awardPoints(10, 'Updated Appointment Questions', 'consult', `brief_q_update_${selectedCase.id}`);
    triggerHapticSuccess();
    toast.success('Appointment Brief Updated', `Brief refreshed with ${selectedQuestionIds.length} prioritized questions.`);
    setShowQuestionSelector(false);
  };

  const handleSaveOutcome = async (questionId: string, qText: string) => {
    if (!selectedCase) return;
    setSavingOutcomeId(questionId);

    const status = outcomeStatuses[questionId] || 'discussed';
    const note = outcomeNotes[questionId] || 'Discussed with clinician during consultation.';
    const doctorAction = outcomeDoctorActions[questionId] || undefined;

    let targetId = questionId;
    if (questionId.startsWith('brief_q_')) {
      const added = addCaseQuestion(selectedCase.id, {
        questionText: qText,
        status: 'open',
        raisedBySpecialty: 'Primary Care',
        supportingEvidenceIds: [],
      });
      if (added) targetId = added.id;
    }

    // Record outcome with strict provenance tag and status differentiation
    recordCaseQuestionOutcome(selectedCase.id, targetId, status, note, {
      doctorAction,
      provenance: 'user_reported_clinician_statement',
    });

    awardPoints(15, 'Recorded Doctor Visit Outcome', 'consult', `visit_outcome_${targetId}`);
    triggerHapticSuccess();
    toast.success(
      'Visit Outcome Recorded',
      `Saved as patient-reported clinician guidance (${status.toUpperCase()}).`
    );

    // Refresh case and brief
    const updated = getCase(selectedCase.id);
    if (updated) {
      setSelectedCase(updated);
      if (updated.appointmentBriefs?.current) {
        setBrief(updated.appointmentBriefs.current);
      }
    }
    setSavingOutcomeId(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDrawer) {
        setShowDrawer(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDrawer]);

  useEffect(() => {
    const allCases = getCases().filter(c => c.status === 'active');
    setCases(allCases);
    if (caseIdParam) {
      const match = allCases.find(c => c.id === caseIdParam) || getCase(caseIdParam);
      if (match) {
        setSelectedCase(match);
        setCaseNotFoundId(null);
        return;
      }
      setSelectedCase(null);
      setCaseNotFoundId(caseIdParam);
      setShowPicker(true);
      return;
    }
    setCaseNotFoundId(null);
    const scope = getUnifiedCaseScope();
    const active = scope.caseItem;
    if (active && allCases.some(c => c.id === active.id)) {
      setSelectedCase(active);
      return;
    }
    if (allCases.length === 1) {
      setSelectedCase(allCases[0]);
    }
  }, [caseIdParam]);

  useEffect(() => {
    if (selectedCase) {
      const profile = getProfile();
      let currentBrief = selectedCase.appointmentBriefs?.current;
      if (!currentBrief || !isBriefUpToDate(currentBrief, selectedCase, profile)) {
        currentBrief = generateDeterministicBrief(selectedCase, profile);
        saveAppointmentBrief(selectedCase.id, currentBrief);
      }
      setBrief(currentBrief);
      awardPoints(15, 'Generated Physician Appointment Brief', 'consult', 'brief_gen_' + selectedCase.id);
    }
  }, [selectedCase]);

  useEffect(() => {
    if (!showDrawer && !showPicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDrawer) setShowDrawer(false);
        if (showPicker && selectedCase) setShowPicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDrawer, showPicker, selectedCase]);

  const handleRefine = async () => {
    if (!displayedBrief || !selectedCase || isViewingArchived) return;
    setIsRefining(true);
    try {
      const refined = await refineAppointmentBrief(displayedBrief);
      if (refined) {
        const saved = saveAppointmentBrief(selectedCase.id, refined);
        if (saved) {
          setSelectedCase(saved);
          setBrief(saved.appointmentBriefs?.current || refined);
        } else {
          setBrief(refined);
        }
        awardPoints(10, 'AI Refined Appointment Brief', 'consult', 'brief_refined_' + selectedCase.id);
        triggerHapticSuccess();
        toast.success('Brief Refined', 'AI polished your clinical appointment brief.');
      }
    } catch (e) {
      console.error('Failed to refine appointment brief:', e);
      toast.error('Refinement Failed', 'Could not refine appointment brief. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleCopyBrief = () => {
    if (!displayedBrief) return;
    const lines: string[] = [
      `HEALTHCHAIN CLINICAL APPOINTMENT BRIEF (Version ${displayedBrief.version || 1})`,
      `Case: ${selectedCase?.title || 'Patient Health Dossier'} (ID: ${selectedCase?.id || 'unknown'})`,
      `Generated: ${displayedBrief.generatedAt ? new Date(displayedBrief.generatedAt).toLocaleString() : new Date().toLocaleString()}`,
      `----------------------------------------`,
      `1. WHY I'M HERE (CHIEF REASON):`,
      displayedBrief.mainConcern?.text || 'No concern specified.',
      ``,
    ];

    if (
      (displayedBrief.previousOutcomesReviewed && displayedBrief.previousOutcomesReviewed.length > 0) ||
      (displayedBrief.changesSinceLastVisit && displayedBrief.changesSinceLastVisit.length > 0)
    ) {
      lines.push(`2. WHAT CHANGED SINCE LAST VISIT:`);
      if (displayedBrief.previousOutcomesReviewed && displayedBrief.previousOutcomesReviewed.length > 0) {
        lines.push(`   PRIOR OUTCOMES REVIEWED:`);
        displayedBrief.previousOutcomesReviewed.forEach(po => {
          lines.push(
            `   • [${po.status.toUpperCase()}] ${po.questionText}${
              po.note ? ` — Clinician guidance: "${po.note}"` : ''
            } (Provenance: Patient-reported clinician statement)`
          );
        });
      }
      if (displayedBrief.changesSinceLastVisit && displayedBrief.changesSinceLastVisit.length > 0) {
        lines.push(`   NEW RECORDS & UPDATES:`);
        displayedBrief.changesSinceLastVisit.forEach(c => {
          lines.push(`   • [${c.date}] ${c.description}`);
        });
      }
      lines.push(``);
    }

    lines.push(
      `3. TIMELINE & RECENT CHANGES:`,
      (displayedBrief.timeline || []).map((t: any) => `• ${t.date ? `[${t.date}] ` : ''}${t.event || t.text}`).join('\n') || 'None recorded.',
      ``,
      `4. IMPORTANT CONTEXT & FACTS:`,
      (displayedBrief.knownFacts || []).map((f: any) => `• ${typeof f === 'string' ? f : f?.text || 'Context item'}`).join('\n') || 'None recorded.',
      ...(displayedBrief.missingInformation?.length ? [
        ``,
        `MISSING INFORMATION:`,
        (displayedBrief.missingInformation || []).map((m: any) => `• ${typeof m === 'string' ? m : m?.missingText || 'Missing information'}`).join('\n')
      ] : []),
      ``,
      `5. WHAT I NEED HELP DECIDING (CLINICAL QUESTIONS):`,
      (displayedBrief.questionsForClinician || []).map((q: any, i: number) => {
        const text = typeof q === 'string' ? q : q?.question || q?.text;
        const statusTag = q?.status && q.status !== 'open' ? ` [${q.status.toUpperCase()}]` : '';
        return `${i + 1}. ${text}${statusTag}`;
      }).join('\n') || 'None recorded.',
      `----------------------------------------`,
      `SAFETY NOTICE: ${displayedBrief.safetyNotice || 'For educational and doctor-discussion purposes only.'}`,
      `DATA PROVENANCE: Patient-reported clinician statement / HealthChain Clinical Dossier`
    );

    const fullText = lines.join('\n');

    const copyBrief = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(fullText);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = fullText;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
        triggerHapticSuccess();
        awardPoints(5, 'Copied Clinician Appointment Brief', 'consult', 'brief_copy_' + selectedCase?.id);
        toast.success('Brief Copied', `Brief v${displayedBrief.version || 1} copied to clipboard with full provenance.`);
      } catch {
        toast.error('Copy Failed', 'Unable to copy text to clipboard.');
      }
    };
    copyBrief();
  };


  if (!selectedCase && !showPicker) {
    return (
      <main style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <FeatureMissionHeader featureId="case-prep" />
        <div style={{ width: 80, height: 80, background: '#f0fdfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '24px auto', color: '#0d9488' }}>
          <Briefcase size={36} />
        </div>
        <h1 style={{ fontSize: 32, color: '#0f172a', marginBottom: 16 }}>Prepare my appointment</h1>
        <p style={{ fontSize: 16, color: '#475569', lineHeight: 1.6, maxWidth: 500, margin: '0 auto 32px' }}>
          Choose the case you want to bring to your clinician. We will organise its existing symptoms, records, past AI summaries, and unanswered questions into one clear brief.
        </p>
        <button className="btn btn-primary" onClick={() => setShowPicker(true)} style={{ padding: '14px 28px', fontSize: 16, borderRadius: 30 }}>
          Import my case <ArrowRight size={18} style={{ marginLeft: 8 }} />
        </button>
      </main>
    );
  }

  if (showPicker) {
    return (
      <main style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
        {caseNotFoundId && (
          <div
            role="alert"
            style={{
              padding: '14px 16px',
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: 12,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#991B1B',
              fontSize: 14,
            }}
          >
            <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700 }}>Requested Case Not Found</div>
              <div style={{ fontSize: 13, marginTop: 2, color: '#7F1D1D' }}>
                Case ID &quot;{caseNotFoundId}&quot; could not be found in your records. Please choose an active case below to prepare your visit.
              </div>
            </div>
          </div>
        )}
        <h2 style={{ fontSize: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Briefcase size={24} color="#0d9488" /> Choose a case
        </h2>
        {cases.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 16 }}>
            <p>You don't have any active cases yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/app/my-cases?new=true')} style={{ marginTop: 16 }}>Start a case</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {cases.map(c => (
              <div 
                key={c.id} 
                role="button"
                tabIndex={0}
                aria-label={`Select case: ${c.title || 'Untitled Case'}`}
                onClick={() => { setSelectedCase(c); setShowPicker(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedCase(c);
                    setShowPicker(false);
                  }
                }}
                style={{ padding: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'border 0.2s' }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#0d9488'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              >
                <div>
                  <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#0f172a' }}>{c.title || 'Untitled Case'}</h3>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Updated {new Date(c.updatedAt).toLocaleDateString()} &middot; {c.medicalRecords?.length || 0} records
                  </div>
                </div>
                <ChevronRight size={20} color="#94a3b8" />
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (!displayedBrief) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} className="spin" color="#0d9488" />
      </main>
    );
  }

  const briefHistory = selectedCase?.appointmentBriefs?.history || [];

  return (
    <main style={{ maxWidth: 840, margin: '0 auto', padding: '40px 20px 80px' }}>

      <div className="print-hide">
        <FeatureMissionHeader featureId="case-prep" activeCaseId={selectedCase?.id} />
      </div>

      {/* Navigation & Controls */}
      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <button className="btn btn-outline btn-sm" onClick={() => { setSelectedCase(null); setShowPicker(true); }}>
          &larr; Change case
        </button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Brief Version Picker */}
          {briefHistory.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Version:</span>
              <select
                value={selectedBriefVersion ?? selectedCase?.appointmentBriefs?.current?.version ?? 1}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSelectedBriefVersion(val);
                }}
                style={{
                  padding: '5px 10px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  cursor: 'pointer',
                }}
              >
                {selectedCase?.appointmentBriefs?.current && (
                  <option value={selectedCase.appointmentBriefs.current.version}>
                    v{selectedCase.appointmentBriefs.current.version} (Current)
                  </option>
                )}
                {briefHistory.map((h, i) => (
                  <option key={h.briefId || `hist_${i}`} value={h.version}>
                    v{h.version} (Archived - {h.generatedAt ? new Date(h.generatedAt).toLocaleDateString() : 'Past'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              triggerHapticLight();
              const questionList = (displayedBrief.questionsForClinician || []).map((q: any, i: number) => `${i + 1}. ${typeof q === 'string' ? q : q?.question || q?.text}`).join('\n');
              const prompt = `I am preparing for an upcoming doctor appointment for my case: "${selectedCase?.title || 'Clinical Evaluation'}".\n\nMain concern: ${displayedBrief.mainConcern?.text || 'Clinical checkup'}\n\nQuestions I plan to ask:\n${questionList || 'General clinical review'}\n\nPlease help me rehearse this visit: what questions might my doctor ask in response, and how can I clearly communicate my symptoms?`;
              navigate(`/app/ava?caseId=${encodeURIComponent(selectedCase?.id || '')}`, { state: { initialPrompt: prompt } });
            }}
            style={{ background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)', color: '#fff', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            aria-label="Rehearse appointment with Ava AI"
          >
            <MessageSquare size={15} /> Rehearse with Ava
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleCopyBrief} aria-label="Copy appointment brief to clipboard">
            <Copy size={15} style={{ marginRight: 6 }} /> Copy Brief
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => window.print()} aria-label="Print appointment brief">
            <Printer size={15} style={{ marginRight: 6 }} /> Print Brief
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => setShowDrawer(true)} aria-label="See supporting case detail">
            <Eye size={15} style={{ marginRight: 6 }} /> See detail
          </button>
        </div>
      </div>

      {/* Archived Snapshot Notice */}
      {isViewingArchived && (
        <div
          className="print-hide"
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={20} color="#D97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#92400E' }}>
                Viewing Archived Brief Snapshot (Version {displayedBrief.version})
              </div>
              <div style={{ fontSize: 12, color: '#B45309' }}>
                Generated on {displayedBrief.generatedAt ? new Date(displayedBrief.generatedAt).toLocaleString() : 'earlier'}. This snapshot is preserved immutably.
              </div>
            </div>
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setSelectedBriefVersion(null)}
            style={{ fontSize: 12, color: '#92400E', borderColor: '#F59E0B', background: '#FFFFFF', flexShrink: 0 }}
          >
            <RotateCcw size={13} style={{ marginRight: 4 }} /> Back to Current Brief
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="print-hide" style={{ display: 'flex', justifyContent: 'space-between', background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '12px 16px', borderRadius: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f766e' }}>
          <CheckCircle2 size={16} />
          <span>
            Prepared from your saved case &middot; <strong>Brief Version {displayedBrief.version || 1}</strong>
            {isViewingArchived ? ' (Archived)' : ' (Current)'}
          </span>
        </div>
        {!isViewingArchived && (
          <button
            onClick={handleRefine}
            disabled={isRefining || displayedBrief.isRefinedByAI}
            style={{ background: 'none', border: 'none', color: '#0d9488', fontSize: 13, fontWeight: 600, cursor: (isRefining || displayedBrief.isRefinedByAI) ? 'default' : 'pointer', opacity: displayedBrief.isRefinedByAI ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isRefining ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {displayedBrief.isRefinedByAI ? 'Refined for discussion' : 'Make this easier to discuss'}
          </button>
        )}
      </div>

      {/* Interactive Question Selection Step (Phase 5 Step 21) */}
      {!isViewingArchived && caseQuestions.length > 0 && (
        <div
          className="print-hide"
          style={{
            marginBottom: '24px',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #E2E8F0',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => setShowQuestionSelector(!showQuestionSelector)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF2FF', border: '1px solid #C7D2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4F46E5' }}>
                <ListFilter size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                  Select Questions for this Visit
                </h3>
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  {selectedQuestionIds.length} of {caseQuestions.length} questions prioritized for this appointment
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              style={{ fontSize: 12, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {showQuestionSelector ? 'Hide Selector' : 'Customize Questions'}
              {showQuestionSelector ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showQuestionSelector && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  Check the questions you want your clinician to address during this visit:
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestionIds(caseQuestions.map(q => q.id))}
                    style={{ fontSize: 11.5, background: 'none', border: 'none', color: '#0D9488', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Select All
                  </button>
                  <span style={{ color: '#CBD5E1' }}>&middot;</span>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestionIds(caseQuestions.filter(q => q.status === 'open' || q.status === 'prepared').map(q => q.id))}
                    style={{ fontSize: 11.5, background: 'none', border: 'none', color: '#0D9488', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Open Only
                  </button>
                  <span style={{ color: '#CBD5E1' }}>&middot;</span>
                  <button
                    type="button"
                    onClick={() => setSelectedQuestionIds([])}
                    style={{ fontSize: 11.5, background: 'none', border: 'none', color: '#94A3B8', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
                {caseQuestions.map((q) => {
                  const isSelected = selectedQuestionIds.includes(q.id);
                  return (
                    <div
                      key={q.id}
                      onClick={() => handleToggleQuestion(q.id)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                        background: isSelected ? '#F0FDFA' : '#F8FAFC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {isSelected ? (
                          <CheckSquare size={18} color="#0D9488" style={{ flexShrink: 0 }} />
                        ) : (
                          <Square size={18} color="#94A3B8" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: '#0F172A', lineHeight: 1.4 }}>
                          {q.questionText}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 6,
                            textTransform: 'uppercase',
                            background: q.status === 'resolved' || q.status === 'addressed' ? '#DCFCE7' : q.status === 'discussed' ? '#FEF3C7' : q.status === 'prepared' ? '#F5F3FF' : '#F1F5F9',
                            color: q.status === 'resolved' || q.status === 'addressed' ? '#15803D' : q.status === 'discussed' ? '#92400E' : q.status === 'prepared' ? '#7C3AED' : '#64748B',
                          }}
                        >
                          {q.status}
                        </span>
                        {q.raisedBySpecialty && (
                          <span style={{ fontSize: '11px', color: '#94A3B8' }}>{q.raisedBySpecialty}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleApplyQuestionSelection}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    background: '#0D9488',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Check size={16} /> Apply Questions to Brief v{(displayedBrief.version || 1) + 1}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* The Printable Brief */}
      <div className="case-prep-printable-dossier" style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: 40 }}>

        <header style={{ borderBottom: '2px solid #0f172a', paddingBottom: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>
                HealthChain Appointment Brief &middot; Version {displayedBrief.version || 1}
              </div>
              <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Prepared for clinician discussion</h1>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                background: isViewingArchived ? '#FEF3C7' : '#F0FDF4',
                color: isViewingArchived ? '#92400E' : '#15803D',
                border: isViewingArchived ? '1px solid #FDE68A' : '1px solid #BBF7D0',
              }}>
                {isViewingArchived ? `Archived Snapshot (v${displayedBrief.version})` : `Active Brief (v${displayedBrief.version || 1})`}
              </span>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: '#475569', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span><strong>Case:</strong> {selectedCase?.title || 'Case'}</span>
            <span><strong>Case ID:</strong> {selectedCase?.id}</span>
            <span><strong>Generated:</strong> {displayedBrief.generatedAt ? new Date(displayedBrief.generatedAt).toLocaleString() : 'Recent'}</span>
          </div>
        </header>

        {/* Section 1: Chief Concern */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>
            1. Why I'm here (Chief Concern)
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: '#0f172a', margin: 0 }}>
            {displayedBrief.mainConcern?.text || 'No specific concern specified.'}
          </p>
        </section>

        {/* Section 2: What Changed Since Last Visit (Phase 5 Step 23) */}
        {((displayedBrief.previousOutcomesReviewed && displayedBrief.previousOutcomesReviewed.length > 0) ||
          (displayedBrief.changesSinceLastVisit && displayedBrief.changesSinceLastVisit.length > 0)) && (
          <section style={{ marginBottom: 28, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #E2E8F0', paddingBottom: 8, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} /> 2. What Changed Since Last Visit
            </h2>

            {/* A. Outcomes from Prior Consultations */}
            {displayedBrief.previousOutcomesReviewed && displayedBrief.previousOutcomesReviewed.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                  Outcomes from Prior Consultations
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {displayedBrief.previousOutcomesReviewed.map((po, i) => (
                    <div key={po.questionId || i} style={{ padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{po.questionText}</span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          textTransform: 'uppercase',
                          background: po.status === 'resolved' || po.status === 'addressed' ? '#DCFCE7' : po.status === 'discussed' ? '#FEF3C7' : '#EDE9FE',
                          color: po.status === 'resolved' || po.status === 'addressed' ? '#15803D' : po.status === 'discussed' ? '#92400E' : '#6B21A8',
                        }}>
                          {po.status}
                        </span>
                      </div>
                      {po.note && (
                        <div style={{ color: '#334155', fontSize: 12.5, marginTop: 4 }}>
                          <strong>Doctor Guidance:</strong> {po.note}
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                        Data Provenance: Patient-reported clinician statement &middot; {po.outcomeDate ? new Date(po.outcomeDate).toLocaleDateString() : 'Recorded'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* B. New Records & Updates */}
            {displayedBrief.changesSinceLastVisit && displayedBrief.changesSinceLastVisit.length > 0 && (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
                  New Clinical Records & Timeline Updates
                </div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13.5, lineHeight: 1.6, color: '#334155' }}>
                  {displayedBrief.changesSinceLastVisit.map((c, i) => (
                    <li key={i}>
                      <strong>[{c.date}]</strong> {c.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Section 3: Timeline & Recent Changes */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>
            {displayedBrief.changesSinceLastVisit?.length || displayedBrief.previousOutcomesReviewed?.length ? '3' : '2'}. What changed and when
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
            {(displayedBrief.timeline || []).map((t, i) => (
              <li key={i}><strong>{t.date}:</strong> {t.event}</li>
            ))}
            {(!displayedBrief.timeline || displayedBrief.timeline.length === 0) && <li>No timeline events recorded.</li>}
          </ul>
        </section>

        {/* Section 4: Context & Facts */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>
            {displayedBrief.changesSinceLastVisit?.length || displayedBrief.previousOutcomesReviewed?.length ? '4' : '3'}. Important context to review
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
            {(displayedBrief.knownFacts || []).map((f: any, i: number) => <li key={i}>{typeof f === 'string' ? f : f?.text || 'Fact'}</li>)}
            {(displayedBrief.missingInformation || []).map((m: any, i: number) => <li key={i} style={{ color: '#b45309' }}>Missing: {typeof m === 'string' ? m : m?.missingText || 'Information'}</li>)}
            {(!displayedBrief.knownFacts || displayedBrief.knownFacts.length === 0) && (!displayedBrief.missingInformation || displayedBrief.missingInformation.length === 0) && <li>No relevant medical context recorded.</li>}
          </ul>
        </section>

        {/* Section 5: Questions for Clinician */}
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 18, color: '#0f766e', borderBottom: '1px solid #e2e8f0', paddingBottom: 8, marginBottom: 16 }}>
            {displayedBrief.changesSinceLastVisit?.length || displayedBrief.previousOutcomesReviewed?.length ? '5' : '4'}. What I need help deciding (Questions to Align On)
          </h2>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.7, color: '#334155' }}>
            {(displayedBrief.questionsForClinician || []).map((q: any, i: number) => {
              const text = typeof q === 'string' ? q : q?.question || 'Question';
              const statusTag = q?.status && q.status !== 'open' ? ` [${q.status.toUpperCase()}]` : '';
              return (
                <li key={i}>
                  <span>{text}</span>
                  {statusTag && (
                    <span style={{ fontSize: '11px', fontWeight: 700, marginLeft: 6, color: '#0D9488' }}>
                      {statusTag}
                    </span>
                  )}
                </li>
              );
            })}
            {(!displayedBrief.questionsForClinician || displayedBrief.questionsForClinician.length === 0) && <li>No questions recorded.</li>}
          </ul>
        </section>

        <section style={{ background: '#F0FDFA', border: '1px solid #99F6E4', padding: 16, borderRadius: 12, display: 'flex', gap: 12, fontSize: 13, color: '#0F766E', lineHeight: 1.5 }}>
          <AlertCircle size={20} color="#0D9488" style={{ flexShrink: 0 }} />
          <div>{displayedBrief.safetyNotice || 'This brief is prepared for educational and doctor-discussion purposes only.'}</div>
        </section>

        <footer style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94A3B8', flexWrap: 'wrap', gap: 8 }}>
          <div>Data Provenance: Patient-reported clinician statement &middot; HealthChain Clinical Dossier</div>
          <div>Brief Version {displayedBrief.version || 1} &middot; Case ID: {selectedCase?.id}</div>
        </footer>
      </div>

      {/* Post-Visit Outcome Recorder (Phase 5 Steps 24 & 25) */}
      <div
        className="print-hide"
        style={{
          marginTop: '32px',
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1.5px solid #CBD5E1',
          padding: '28px',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#047857',
              fontSize: '16px',
            }}
          >
            📋
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
              Record Doctor Visit Outcomes
            </h3>
            <div style={{ fontSize: '12.5px', color: '#64748B' }}>
              Record your clinician's guidance for each question. Outcomes are tagged as patient-reported and carry forward into subsequent briefs.
            </div>
          </div>
        </div>

        {isViewingArchived ? (
          <div style={{ padding: '20px', background: '#FFFBEB', borderRadius: '12px', fontSize: '13px', color: '#92400E', textAlign: 'center', marginTop: '16px' }}>
            Outcome recording is disabled while inspecting an archived brief. Switch back to your Current Brief to record outcomes.
          </div>
        ) : caseQuestions.length === 0 ? (
          <div style={{ padding: '20px', background: '#F8FAFC', borderRadius: '12px', fontSize: '13px', color: '#64748B', textAlign: 'center', marginTop: '16px' }}>
            No specific clinical questions were extracted for this visit yet. You can discuss your main concern with Ava to generate tailored questions.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
            {caseQuestions.map((q) => {
              const currentStatus = outcomeStatuses[q.id] || (q.status === 'open' ? 'discussed' : q.status);
              const isRecorded = q.status === 'discussed' || q.status === 'deferred' || q.status === 'resolved' || q.status === 'addressed';

              return (
                <div
                  key={q.id}
                  style={{
                    padding: '18px',
                    borderRadius: '14px',
                    border: isRecorded ? '1.5px solid #A7F3D0' : '1.5px solid #E2E8F0',
                    background: isRecorded ? '#F0FDF4' : '#F8FAFC',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.4 }}>
                      {q.questionText}
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: q.status === 'resolved' || q.status === 'addressed' ? '#DCFCE7' : q.status === 'discussed' ? '#FEF3C7' : q.status === 'deferred' ? '#EDE9FE' : '#F1F5F9',
                        color: q.status === 'resolved' || q.status === 'addressed' ? '#15803D' : q.status === 'discussed' ? '#92400E' : q.status === 'deferred' ? '#6B21A8' : '#64748B',
                        flexShrink: 0,
                        textTransform: 'uppercase',
                      }}
                    >
                      {q.status}
                    </span>
                  </div>

                  {q.outcomeNote && (
                    <div style={{ fontSize: '13px', color: '#166534', background: '#FFFFFF', padding: '12px', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                      <div><strong>Doctor Guidance:</strong> {q.outcomeNote}</div>
                      {q.doctorAction && (
                        <div style={{ marginTop: 4, fontSize: '12px', color: '#15803D' }}>
                          <strong>Action:</strong> {q.doctorAction}
                        </div>
                      )}
                      <div style={{ marginTop: 6, fontSize: '11px', color: '#15803D', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Tag size={12} /> Data Provenance: Patient-reported clinician statement
                      </div>
                    </div>
                  )}

                  {/* Outcome Entry / Transition Form */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Status selection buttons */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', marginRight: '2px' }}>
                        Set Status:
                      </span>
                      {[
                        { key: 'discussed', label: 'Discussed (Ongoing)', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
                        { key: 'deferred', label: 'Deferred (Awaiting test)', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
                        { key: 'resolved', label: 'Resolved (Closed)', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
                      ].map((stage) => {
                        const isActive = currentStatus === stage.key;
                        return (
                          <button
                            key={stage.key}
                            type="button"
                            onClick={() => {
                              triggerHapticLight();
                              setOutcomeStatuses(prev => ({ ...prev, [q.id]: stage.key as any }));
                            }}
                            style={{
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '11.5px',
                              fontWeight: isActive ? 800 : 600,
                              cursor: 'pointer',
                              border: isActive ? `2px solid ${stage.color}` : `1px solid ${stage.border}`,
                              background: isActive ? stage.bg : '#FFFFFF',
                              color: isActive ? stage.color : '#475569',
                              boxShadow: isActive ? `0 2px 6px ${stage.bg}` : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {isActive ? '✓ ' : ''}{stage.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Doctor Action Preset Selector */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>Doctor Action:</span>
                      <select
                        value={outcomeDoctorActions[q.id] || q.doctorAction || ''}
                        onChange={(e) => setOutcomeDoctorActions(prev => ({ ...prev, [q.id]: e.target.value }))}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '12px',
                          color: '#0F172A',
                          background: '#FFFFFF',
                          maxWidth: 320,
                        }}
                      >
                        <option value="">Select action taken (optional)...</option>
                        {DOCTOR_ACTION_PRESETS.map((preset) => (
                          <option key={preset} value={preset}>{preset}</option>
                        ))}
                      </select>
                    </div>

                    {/* Note input */}
                    <input
                      type="text"
                      placeholder="What did your doctor say or advise? (Saved as patient-reported clinician guidance)"
                      value={outcomeNotes[q.id] !== undefined ? outcomeNotes[q.id] : (q.outcomeNote || '')}
                      onChange={(e) => setOutcomeNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        width: '100%',
                        background: '#FFFFFF',
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleSaveOutcome(q.id, q.questionText)}
                        disabled={savingOutcomeId === q.id}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          background: '#0D9488',
                          color: '#FFFFFF',
                          border: 'none',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {savingOutcomeId === q.id ? 'Saving...' : 'Save Clinician Outcome'}
                      </button>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Provenance: Patient-reported clinician statement
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100000 }}
              onClick={() => setShowDrawer(false)}
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              role="dialog"
              aria-modal="true"
              aria-label="Supporting detail"
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 450, background: '#fff', zIndex: 100001, boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}><Info size={20} color="#0d9488" /> Supporting detail</h3>
                <button 
                  type="button"
                  aria-label="Close supporting detail drawer"
                  onClick={() => setShowDrawer(false)} 
                  style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#64748b' }}
                >
                  &times;
                </button>
              </div>
              <div style={{ padding: '24px 24px calc(24px + env(safe-area-inset-bottom)) 24px', overflowY: 'auto', flex: 1 }}>
                <p style={{ fontSize: 14, color: '#475569', marginBottom: 24, lineHeight: 1.5 }}>
                  This brief was deterministically generated without inventing new facts. Here are the perspectives mapped into your brief:
                </p>
                <div style={{ display: 'grid', gap: 16 }}>
                  {(displayedBrief.priorPerspectives || []).map((p: any, i: number) => (
                    <div key={i} style={{ padding: 16, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>{p?.title || 'Perspective'}</div>
                      <div style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.5 }}>{p?.summary || ''}</div>
                    </div>
                  ))}
                  {(!displayedBrief.priorPerspectives || displayedBrief.priorPerspectives.length === 0) && <div style={{ fontSize: 14, color: '#64748b' }}>No prior perspectives found for this case.</div>}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </main>
  );
}
