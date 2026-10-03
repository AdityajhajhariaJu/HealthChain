import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BrainCircuit,
  Calendar,
  CalendarClock,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  Folder,
  Heart,
  HelpCircle,
  Hourglass,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sliders,
  Sparkles,
  Stethoscope,
  Sun,
  Trash2,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Waves,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import '../../components/ui/caseWorkspace.css';
import { ClinicalReasoningPipelineView } from '../../components/ui/ClinicalReasoningPipelineView';
import { ClinicalUrgencyNotice } from '../../components/ui/ClinicalUrgencyNotice';
import { MeaningfulMultiPerspectiveView } from '../../components/ui/MeaningfulMultiPerspectiveView';
import {
  SourcePassageModal,
  SourcePassageModalProps,
} from '../../components/ui/SourcePassageModal';
import { StructuredAnswerView } from '../../components/ui/StructuredAnswerView';
import { useToast } from '../../components/ui/ToastProvider';
import { useCaseWorkspace } from '../../hooks/useCaseWorkspace';
import { useClinicalDailySourceFreshness } from '../../hooks/useClinicalDailySourceFreshness';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useMountedRef } from '../../hooks/useMountedRef';
import { getActiveSession } from '../../services/authSession';
import {
  addCaseEvent,
  appendCaseRecords,
  createCaseDraft,
  getCase,
  MedicalRecord,
  saveReviewSnapshot,
} from '../../services/CaseEngine';
import { saveOriginalCaseFile } from '../../services/caseRecordFiles';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';
import { reviewedCaseWithCurrentSources } from '../../services/ClinicalDailyEvidence';
import {
  clinicalDraftKey,
  loadClinicalIntakeDraft,
  saveClinicalIntakeDraft,
} from '../../services/ClinicalIntakeDraft';
import {
  readClinicalIntakeHistory,
  updateClinicalIntakeField,
} from '../../services/clinicalIntakeHistory';
import { runClinicalReasoningPipeline } from '../../services/ClinicalReasoningEngine';
import {
  isCurrentClinicalReview,
  recordClinicalClarification,
} from '../../services/clinicalReview';
import { clinicalSourceFingerprint } from '../../services/clinicalReviewSourceState';
import { evaluateClinicalUrgency } from '../../services/clinicalTriageEngine';
import { runJarvisInvestigation } from '../../services/geminiService';
import {
  triggerHapticLight,
  triggerHapticSelection,
  triggerHapticSuccess,
} from '../../services/haptics';
import { recordHealthMemory } from '../../services/HealthMemory';
import { getProfile, getProfileEngineState, getProfileKey } from '../../services/ProfileEngine';
import { buildClinicalOutcome } from '../../services/StructuredAnswerEngine';
import { openTrialModal } from '../../services/TrialEngine';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { ClinicalClarificationForm } from './components/ClinicalClarificationForm';
import { CompilingAnimation } from './components/CompilingAnimation';

const engineScope = () => `${getProfileKey()}_${getProfileEngineState()?.activeId || 'profile_1'}`;
const engineDraftKey = (caseId: string) => `hc_engine_draft_${engineScope()}_${caseId || 'new'}`;

import {
  filterPresetSymptoms,
  findPresetSymptom,
  STEP_META,
  SYMPTOM_CATEGORY_THEMES,
} from './clinicalIntakeCatalog';
import { ClassySymptomBadge } from './SymptomBadge';

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
    try {
      return (
        sessionStorage.getItem(
          engineDraftKey(searchParams.get('caseId') || location.state?.caseId || '')
        ) || ''
      );
    } catch {
      return '';
    }
  });
  const [files, setFiles] = useState<{ file: File; base64: string; size: number }[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isIsolated, setIsIsolated] = useState(false);
  const [copiedSbar, setCopiedSbar] = useState(false);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [missingCaseId, setMissingCaseId] = useState<string | null>(null);

  const [intakeStep, setIntakeStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [reviewFocus, setReviewFocus] = useState<
    'differential' | 'doctor_prep' | 'lab_second_opinion'
  >('differential');
  const [selectedOnset, setSelectedOnset] = useState<string | null>(() => {
    try {
      const match = history.match(/^Onset:\s*([^.]+)\./i);
      return match ? match[1].trim() : null;
    } catch {
      return null;
    }
  });
  const [selectedProgression, setSelectedProgression] = useState<string | null>(() => {
    try {
      const match = history.match(/Progression:\s*([^.]+)\./i);
      return match ? match[1].trim() : null;
    } catch {
      return null;
    }
  });
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(() => {
    try {
      const match = history.match(/Primary symptoms:\s*([^.\n]+)/i);
      if (match && match[1]) {
        return match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    } catch {}
    return [];
  });
  const [symptomSearch, setSymptomSearch] = useState('');
  const [symptomCategoryFilter, setSymptomCategoryFilter] = useState<string>('common');
  const [customSymptoms, setCustomSymptoms] = useState<string[]>([]);
  const visiblePresetSymptoms = useMemo(
    () => filterPresetSymptoms(symptomSearch, symptomCategoryFilter),
    [symptomSearch, symptomCategoryFilter]
  );

  const handleToggleSymptom = (symptomName: string) => {
    triggerHapticSelection();
    setSelectedSymptoms((prev) => {
      const preset = findPresetSymptom(symptomName);

      const canonicalName = preset ? preset.name : symptomName;

      const isSelected = prev.some((s) => {
        if (s.toLowerCase() === canonicalName.toLowerCase()) return true;
        if (preset && preset.aliases?.some((a) => a.toLowerCase() === s.toLowerCase())) return true;
        return false;
      });

      const updated = isSelected
        ? prev.filter((s) => {
            if (s.toLowerCase() === canonicalName.toLowerCase()) return false;
            if (preset && preset.aliases?.some((a) => a.toLowerCase() === s.toLowerCase()))
              return false;
            return true;
          })
        : [...prev, canonicalName];

      setHistory((currentHistory) => {
        return updateClinicalIntakeField(
          currentHistory,
          'Primary symptoms',
          updated.length ? updated.join(', ') : null
        );
      });

      return updated;
    });
  };

  const handleRemoveSymptom = (symptomName: string) => {
    handleToggleSymptom(symptomName);
  };

  const handleAddCustomSymptom = () => {
    const raw = symptomSearch.trim();
    if (!raw) return;

    // Check if matches an existing preset case-insensitively or via aliases
    const existingPreset = findPresetSymptom(raw);

    const symptomNameToUse = existingPreset
      ? existingPreset.name
      : raw.charAt(0).toUpperCase() + raw.slice(1);

    if (
      !existingPreset &&
      !customSymptoms.some((c) => c.toLowerCase() === symptomNameToUse.toLowerCase())
    ) {
      setCustomSymptoms((prev) => [symptomNameToUse, ...prev]);
    }

    const isAlreadySelected = selectedSymptoms.some(
      (s) =>
        s.toLowerCase() === symptomNameToUse.toLowerCase() ||
        Boolean(existingPreset?.aliases?.some((a) => a.toLowerCase() === s.toLowerCase()))
    );

    if (!isAlreadySelected) {
      handleToggleSymptom(symptomNameToUse);
      triggerHapticSuccess();
      toast.success(
        'Symptom Added',
        `"${symptomNameToUse}" has been added to your clinical intake.`
      );
    } else {
      toast.info('Already Selected', `"${symptomNameToUse}" is already in your selected symptoms.`);
    }

    setSymptomSearch('');
  };

  const handleSelectOnset = (onsetText: string) => {
    triggerHapticSelection();

    setSelectedOnset((prev) => (prev === onsetText ? null : onsetText));
    setHistory((prev) =>
      updateClinicalIntakeField(prev, 'Onset', selectedOnset === onsetText ? null : onsetText)
    );
  };

  const handleSelectProgression = (progText: string) => {
    triggerHapticSelection();
    setSelectedProgression((prev) => (prev === progText ? null : progText));
    setHistory((prev) =>
      updateClinicalIntakeField(
        prev,
        'Progression',
        selectedProgression === progText ? null : progText
      )
    );
  };

  const availableCases = useCaseWorkspace();

  const reviewHydrationKey = availableCases
    .map((item) => `${item.id}:${item.reviews?.[0]?.id || ''}`)
    .join('|');
  const [selectedCaseId, setSelectedCaseId] = useState(() => {
    const preferred = searchParams.get('caseId') || location.state?.caseId || '';
    if (preferred) return preferred;
    const scope = getUnifiedCaseScope();
    return scope.caseId || '';
  });
  const hasReviewInput = Boolean(
    history.trim() ||
    files.length ||
    availableCases.find((item) => item.id === selectedCaseId)?.medicalRecords.length
  );
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const dailySourceFreshness = useClinicalDailySourceFreshness(
    availableCases.find((item) => item.id === (createdCaseId || selectedCaseId))
  );
  const [draftStatus, setDraftStatus] = useState('Restoring any saved intake…');
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const initialDraftCaseId = useRef(selectedCaseId);
  const draftKeys = useRef(new Set([clinicalDraftKey(selectedCaseId)]));
  const selectedCaseRef = useRef(selectedCaseId);
  selectedCaseRef.current = selectedCaseId;
  const [sourceModalData, setSourceModalData] = useState<SourcePassageModalProps | null>(null);
  const runningRef = useRef(false);
  const readingRef = useRef(false);
  const scopeRef = useRef(engineScope());
  useEffect(() => {
    const changeScope = () => {
      if (scopeRef.current === engineScope()) return;
      scopeRef.current = engineScope();
      draftKeys.current = new Set();
      setHistory('');
      setFiles([]);
      setReport(null);
      setPhase('input');
      setSelectedCaseId('');
      setCreatedCaseId(null);
      setMissingCaseId(null);
    };
    window.addEventListener('hc_profile_updated', changeScope);
    window.addEventListener('hc_logout', changeScope);
    return () => {
      window.removeEventListener('hc_profile_updated', changeScope);
      window.removeEventListener('hc_logout', changeScope);
    };
  }, []);
  useEffect(() => {
    try {
      const key = engineDraftKey(selectedCaseId);
      if (phase === 'done') sessionStorage.removeItem(key);
      else if (history.trim()) sessionStorage.setItem(key, history);
      else sessionStorage.removeItem(key);
    } catch {
      /* Keep editing available when browser storage is disabled. */
    }
  }, [history, selectedCaseId, phase]);

  useEffect(() => {
    let active = true;
    const requestScope = engineScope();
    loadClinicalIntakeDraft(clinicalDraftKey(initialDraftCaseId.current))
      .then((draft) => {
        if (!active || requestScope !== engineScope()) return;
        if (draft && phaseRef.current === 'input') {
          setHistory(
            sessionStorage.getItem(engineDraftKey(initialDraftCaseId.current)) || draft.history
          );
          setFiles(draft.files);
          setReviewFocus(draft.focus);
          setIsIsolated(draft.isolated);
          setIntakeStep(draft.step as 1 | 2 | 3 | 4 | 5 | 6);
          setDraftStatus('Saved intake and staged documents restored on this device.');
        } else setDraftStatus('Your intake will be saved on this device.');
      })
      .catch(() => {
        if (active)
          setDraftStatus(
            'The saved intake could not be restored. Check the notes and reattach any missing documents.'
          );
      })
      .finally(() => {
        if (active) setDraftReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const key = clinicalDraftKey(selectedCaseId);
    draftKeys.current.add(key);
    const requestScope = engineScope();
    const timer = window.setTimeout(() => {
      void saveClinicalIntakeDraft(
        key,
        phase === 'done'
          ? null
          : { history, step: intakeStep, focus: reviewFocus, isolated: isIsolated, files }
      )
        .then(() => {
          if (requestScope === engineScope() && phase === 'input')
            setDraftStatus('Intake and staged documents saved on this device.');
        })
        .catch(() => {
          if (requestScope === engineScope())
            setDraftStatus(
              'Draft saving is unavailable. Keep this page open or save your notes and original documents before leaving.'
            );
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draftReady, history, intakeStep, reviewFocus, isIsolated, files, selectedCaseId, phase]);

  // Rehydrate existing case if caseId is passed in URL query or navigation state
  useEffect(() => {
    const caseId = searchParams.get('caseId') || (location.state as any)?.caseId;
    if (caseId) {
      const existing = getCase(caseId);
      if (existing) {
        setMissingCaseId(null);
        if (phase === 'input') {
          setSelectedCaseId(existing.id);
          setHistory(
            (previous) =>
              previous || existing.intakeData?.chiefComplaint || existing.intakeData?.concern || ''
          );
          const jarvisReview = existing.reviews?.find((r: any) => r.type === 'jarvis');
          if (
            jarvisReview &&
            dailySourceFreshness === 'current' &&
            isCurrentClinicalReview(jarvisReview.report, existing) &&
            searchParams.get('review') !== 'new'
          ) {
            setReport(jarvisReview.report);
            setCreatedCaseId(existing.id);
            setHistory(
              jarvisReview.report.reviewInput?.history || existing.intakeData?.chiefComplaint || ''
            );
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
  }, [searchParams, location.state, reviewHydrationKey, phase, dailySourceFreshness]);

  useEffect(() => {
    const parsed = readClinicalIntakeHistory(history);
    setSelectedSymptoms((previous) =>
      JSON.stringify(previous) === JSON.stringify(parsed.symptoms) ? previous : parsed.symptoms
    );
    setSelectedOnset(parsed.onset);
    setSelectedProgression(parsed.progression);
  }, [history]);

  useEffect(() => {
    const sourceCase = availableCases.find((item) => item.id === (createdCaseId || selectedCaseId));
    if (
      phase === 'done' &&
      report &&
      sourceCase &&
      (dailySourceFreshness === 'changed' || !isCurrentClinicalReview(report, sourceCase))
    ) {
      setPhase('input');
      setReport(null);
      setSourceModalData(null);
      toast.info(
        'Records changed',
        'Run a fresh review with the current records before relying on the earlier interpretation.'
      );
    }
  }, [availableCases, createdCaseId, selectedCaseId, phase, report, toast, dailySourceFreshness]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useMountedRef();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || readingRef.current || !draftReady) return;
    const requestScope = engineScope();
    const selected = Array.from(e.target.files);
    e.target.value = '';
    const names = [
      ...files.map((item) => item.file.name),
      ...(availableCases.find((item) => item.id === selectedCaseId)?.medicalRecords || []).map(
        (item) => item.filename
      ),
    ];
    if (
      selected.some((file) => names.includes(file.name)) ||
      new Set(selected.map((file) => file.name)).size !== selected.length
    ) {
      toast.error(
        'Duplicate document name',
        'Use distinct filenames for each original so extracted passages can be traced to the correct document. Rename the new file before attaching it.'
      );
      return;
    }
    if (
      selected.some(
        (file) =>
          !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
          !file.size ||
          file.size > 3 * 1024 * 1024
      )
    ) {
      toast.error(
        'Unsupported document',
        'Choose non-empty PDF, JPG, PNG, or WebP files, each under 3 MB.'
      );
      return;
    }

    // Limits: Max 10 files total
    if (files.length + selected.length > 10) {
      toast.error(
        'Document Limit',
        'Clinical Review is currently limited to processing 10 documents at a time.'
      );
      return;
    }

    readingRef.current = true;
    setIsReadingFiles(true);
    // Preserve document pixels and original MIME type; resizing scans can lose lab text.
    const processed = await Promise.all(
      selected.map(
        (file) =>
          new Promise<{ file: File; base64: string; size: number }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ file, base64: String(reader.result).split(',')[1] || '', size: file.size });
            reader.onerror = () => resolve({ file, base64: '', size: 0 });
            reader.readAsDataURL(file);
          })
      )
    );
    readingRef.current = false;
    if (!isMounted.current) return;
    setIsReadingFiles(false);
    if (requestScope !== engineScope()) return;
    if (processed.some((file) => !file.base64)) {
      toast.error(
        'Could not read a document',
        'Please select the file again or use a clearer copy.'
      );
      return;
    }
    if ([...files, ...processed].reduce((sum, file) => sum + file.base64.length, 0) > 3_500_000) {
      toast.error(
        'Upload too large',
        'Choose fewer documents. The combined upload limit is about 2.6 MB of original files; scans are kept at their original resolution.'
      );
      return;
    }
    setFiles((prev) => [...prev, ...processed]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    triggerHapticSelection();
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const resetInvestigation = () => {
    triggerHapticLight();
    setPhase('input');
    setHistory('');
    setSelectedOnset(null);
    setSelectedProgression(null);
    setSelectedSymptoms([]);
    setSymptomSearch('');
    setIntakeStep(1);
    setFiles([]);
    setReport(null);
    setCreatedCaseId(null);
    setSelectedCaseId('');
    navigate('/app/consult', { replace: true, state: null });
    setCopiedSbar(false);
  };

  const handleSaveAndExit = async () => {
    triggerHapticLight();
    if (!draftReady || readingRef.current) return;
    const exitScope = engineScope();
    try {
      await saveClinicalIntakeDraft(clinicalDraftKey(selectedCaseId), {
        history,
        step: intakeStep,
        focus: reviewFocus,
        isolated: isIsolated,
        files,
      });
    } catch {
      toast.error(
        'Draft not saved',
        'Keep this page open. Saving notes and attachments to this device failed.'
      );
      return;
    }
    if (!isMounted.current || exitScope !== engineScope()) return;
    toast.success(
      'Draft Preserved',
      'Your notes, current step, review options and staged documents are saved on this device.'
    );
    navigate('/app/cases');
  };

  const handleCopySbar = async () => {
    if (!report) return;
    triggerHapticSuccess();
    const primary =
      report.primaryHypothesis || report.topDiagnoses?.[0]?.condition || 'Clinical Finding';
    const sbar = report.doctorActionPlan?.sbar || {
      situation: report.executiveSummary || history,
      background: 'See the attached case history; no additional history inferred.',
      assessment: primary,
      recommendation:
        (report.questionsForClinician || []).join('\n') ||
        'Review the concerns and records with the treating clinician.',
    };

    const text = `CLINICAL REVIEW • DOCTOR SBAR BRIEF
AI consideration for clinician review: ${primary}
Generated: ${report.structuredAnswer?.generatedAt || 'Review date unavailable'}
${report.interpretationUpdatePending ? 'Clarification saved; AI interpretation has not been rerun.' : ''}
${report.structuredAnswer?.interpretationsWithheld ? 'Unsupported interpretations were withheld. Verify the source observations.' : ''}

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
      toast.error(
        'Copy unavailable',
        'Your browser could not access the clipboard. You can select and copy the report text.'
      );
      return;
    }
    setCopiedSbar(true);
    toast.success('SBAR Brief Copied', 'Formatted for MyChart/doctor portal notes.');
    setTimeout(() => setCopiedSbar(false), 3000);
  };

  const [isUpdatingReasoning, setIsUpdatingReasoning] = useState(false);

  const handleClarificationFeedback = async (answer: string) => {
    if (!report || isUpdatingReasoning) return false;
    setIsUpdatingReasoning(true);
    try {
      const targetCaseId = createdCaseId || selectedCaseId;
      const currentCase = targetCaseId ? getCase(targetCaseId) : null;
      if (
        !currentCase ||
        dailySourceFreshness !== 'current' ||
        !isCurrentClinicalReview(report, currentCase)
      )
        throw new Error('Review the current source records before saving a clarification.');
      const normalized = recordClinicalClarification(report, answer);
      const updatedReport = {
        ...normalized,
        sourceFingerprint: report.sourceFingerprint,
        reviewFocus: report.reviewFocus,
        reviewInput: report.reviewInput,
        interpretationUpdatePending: true,
      };
      if (!targetCaseId || !getCase(targetCaseId))
        throw new Error('Select an available case before saving.');
      addCaseEvent(targetCaseId, answer.trim(), 'User clarification');
      updatedReport.sourceFingerprint = clinicalSourceFingerprint(getCase(targetCaseId));
      if (targetCaseId) {
        const savedCase = saveReviewSnapshot({
          caseId: targetCaseId,
          type: 'jarvis' as any,
          report: updatedReport,
          specialists: ['Clinical Review'],
        });
        setReport(savedCase.reviews[0].report);
      }
      toast.success(
        'Clarification saved',
        'Saved as your reported observation. Run a new review to assess how it changes the interpretation.'
      );
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
    const urgency = evaluateClinicalUrgency(history);
    if (urgency.level === 'urgent_emergency_care') {
      toast.error('Seek emergency help now', urgency.action);
      return;
    }
    const requestScope = engineScope();
    const effectiveCaseId = selectedCaseId || missingCaseId;
    const requestCaseId = effectiveCaseId;
    let linkedCase = effectiveCaseId ? getCase(effectiveCaseId) : undefined;
    if (effectiveCaseId && (!linkedCase || linkedCase.intakeData?.scenarioId)) {
      toast.error('Case unavailable', 'Select an available case or start a new case.');
      return;
    }
    if (!history.trim() && files.length === 0 && !linkedCase?.medicalRecords?.length) {
      toast.error(
        'Input Required',
        'Please enter your symptoms, clinical timeline, or attach lab reports to run the engine.'
      );
      return;
    }

    runningRef.current = true;
    const session = await getActiveSession();
    if (
      !isMounted.current ||
      requestScope !== engineScope() ||
      selectedCaseRef.current !== requestCaseId
    ) {
      runningRef.current = false;
      return;
    }
    if (!session) {
      runningRef.current = false;
      window.dispatchEvent(
        new CustomEvent('hc_require_auth', {
          detail: {
            title: 'Authentication Required',
            message: 'You need to log in or sign up to run a Clinical Review investigation.',
          },
        })
      );
      return;
    }

    const isVip =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('hc_vp_sig') ===
        'a6564a23f9738db13c830d57ebb6beede82dcb7d1bcf83239a006089de3ba40a';
    if (!profile?.isPro && !isVip) {
      runningRef.current = false;
      openTrialModal('Clinical Review');
      return;
    }

    runningRef.current = true;
    setPhase('analyzing');

    const mappedFiles = files.map((f) => ({
      mimeType: f.file.type || 'application/pdf',
      data: f.base64,
      name: f.file.name,
    }));

    try {
      const contextProfile = isIsolated ? null : profile;
      if (effectiveCaseId && linkedCase) {
        linkedCase = await reviewedCaseWithCurrentSources(effectiveCaseId);
        if (
          !isMounted.current ||
          requestScope !== engineScope() ||
          selectedCaseRef.current !== requestCaseId
        )
          return;
      }

      const result = await runJarvisInvestigation(
        history,
        mappedFiles,
        contextProfile,
        linkedCase,
        reviewFocus
      );

      if (
        !isMounted.current ||
        requestScope !== engineScope() ||
        selectedCaseRef.current !== requestCaseId
      )
        return;

      if (result) {
        setReport(result);

        const primaryTitle =
          result.primaryHypothesis || result.topDiagnoses?.[0]?.condition || history.slice(0, 32);
        const newCase =
          linkedCase ||
          createCaseDraft({
            title: `Clinical Review: ${primaryTitle.slice(0, 36)}`,
            mode: 'jarvis',
            intakeData: {
              chiefComplaint: history || 'Clinical Review investigation',
              symptoms: selectedSymptoms,
              onset: selectedOnset,
              progression: selectedProgression,
              filesCount: mappedFiles.length,
              analyzedAt: new Date().toISOString(),
            },
          });
        const records: MedicalRecord[] = [];
        for (const attachment of files) {
          const recordId = crypto.randomUUID();
          const passages = (result.documentedFacts || []).filter(
            (fact: any) => fact.source === attachment.file.name
          );
          await saveOriginalCaseFile(newCase.id, recordId, attachment.file);
          if (
            !isMounted.current ||
            requestScope !== engineScope() ||
            selectedCaseRef.current !== requestCaseId
          )
            return;
          records.push({
            id: recordId,
            filename: attachment.file.name,
            source: 'uploaded_document',
            type: attachment.file.type,
            addedAt: new Date().toISOString(),
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
          passages.forEach((p: any) => {
            p.recordId = recordId;
            p.passageId = p.id;
          });
        }
        if (records.length) appendCaseRecords(newCase.id, records);
        setCreatedCaseId(newCase.id);

        const savedCase = saveReviewSnapshot({
          caseId: newCase.id,
          type: 'jarvis' as any,
          report: {
            ...result,
            reviewInput: {
              history,
              symptoms: selectedSymptoms,
              onset: selectedOnset,
              progression: selectedProgression,
              profileIncluded: !isIsolated,
            },
          },
          specialists: ['Clinical Review'],
        });
        setReport(savedCase.reviews[0].report);

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
            symptoms: selectedSymptoms,
            onset: selectedOnset,
            progression: selectedProgression,
            documentCount: mappedFiles.length,
          },
          dedupeKey: `jarvis:${newCase.id}`,
        });

        awardPoints(25, 'Clinical Review Investigation', 'checkin');
        await Promise.all(
          [...draftKeys.current].map((key) => saveClinicalIntakeDraft(key, null))
        ).catch(() => {});
        if (!isMounted.current || requestScope !== engineScope()) return;
        setPhase('done');
      } else {
        if (!isMounted.current) return;
        toast.error(
          'Analysis Disrupted',
          'Clinical Review encountered a network disruption. Please try again.'
        );
        setIntakeStep(6);
        setPhase('input');
      }
    } catch (e) {
      console.error(e);
      if (isMounted.current) {
        toast.error('Analysis Error', 'An error occurred during analysis. Please try again.');
        setIntakeStep(6);
        setPhase('input');
      }
    } finally {
      runningRef.current = false;
    }
  };

  if (phase === 'analyzing') {
    return (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ClinicalUrgencyNotice text={history} />
        <CompilingAnimation isMobile={isMobile} />
      </div>
    );
  }

  if (phase === 'done' && report) {
    const sourceCase = availableCases.find((item) => item.id === (createdCaseId || selectedCaseId));
    if (
      dailySourceFreshness !== 'current' ||
      (sourceCase && !isCurrentClinicalReview(report, sourceCase))
    )
      return (
        <section className="case-workspace" role="status">
          <h2>Checking current source records</h2>
          <p>
            The earlier interpretation is withheld until its linked records are checked. Changed
            records need a fresh review.
          </p>
        </section>
      );
    const caseId = createdCaseId || selectedCaseId;
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
        <ClinicalUrgencyNotice text={history} urgency={report.structuredAnswer?.urgency} />
        <section className="case-workspace" aria-labelledby="review-ready-title">
          <header style={{ marginBottom: 18 }}>
            <span className="case-workspace-eyebrow">Saved to My Cases</span>
            <h2 id="review-ready-title" style={{ marginBottom: 6 }}>
              Your record review is ready
            </h2>
            <p style={{ margin: 0 }}>Check extracted details against the original records.</p>
          </header>

          <details style={{ marginBottom: 20 }}>
            <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 13, fontWeight: 700 }}>
              More actions
            </summary>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10 }}>
              <button className="btn btn-outline btn-sm" onClick={handleCopySbar}>
                {copiedSbar ? 'Copied' : 'Copy summary'}
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setPhase('input');
                  setReport(null);
                }}
              >
                Review updated information
              </button>
              <button className="btn btn-outline btn-sm" onClick={resetInvestigation}>
                Start another review
              </button>
            </div>
          </details>

          <StructuredAnswerView
            answer={buildClinicalOutcome(report)}
            showUrgency={false}
            onOpenSourceModal={(src) => setSourceModalData(src)}
          />

          {reasoningPayload.stage7_focusedQuestion.question && (
            <ClinicalClarificationForm
              question={reasoningPayload.stage7_focusedQuestion.question}
              why={reasoningPayload.stage7_focusedQuestion.whyThisQuestion}
              busy={isUpdatingReasoning}
              onSave={handleClarificationFeedback}
            />
          )}

          <div className="case-workspace-grid" style={{ marginBottom: 20 }}>
            <button className="btn btn-primary" onClick={() => navigate(`/app/cases/${caseId}`)}>
              Open case
            </button>
            <button
              className="btn btn-outline"
              onClick={() => navigate(`/app/case-prep?caseId=${encodeURIComponent(caseId || '')}`)}
            >
              Prepare for visit
            </button>
            <button
              className="btn btn-outline"
              onClick={() =>
                navigate(`/app/ava?caseId=${encodeURIComponent(caseId || '')}`, {
                  state: {
                    initialPrompt:
                      'Help me understand my latest record review and prepare questions for my clinician.',
                  },
                })
              }
            >
              Ask Ava
            </button>
          </div>

          <details style={{ marginTop: 18, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
            <summary style={{ cursor: 'pointer', color: '#BE123C', fontSize: 14, fontWeight: 800 }}>
              Review reasoning
            </summary>
            <ClinicalReasoningPipelineView
              payload={reasoningPayload}
              onChooseNextAction={(action) => {
                if (!caseId) return;
                const updated = {
                  ...report,
                  reasoningPipeline: {
                    ...reasoningPayload,
                    stage9_continuity: {
                      ...reasoningPayload.stage9_continuity,
                      chosenNextAction: action,
                    },
                  },
                };
                saveReviewSnapshot({
                  caseId,
                  type: 'jarvis',
                  report: updated,
                  specialists: ['Clinical Review'],
                });
                setReport(updated);
              }}
              onCorrectionAcknowledge={(id) => {
                if (!caseId) return;
                const updated = {
                  ...report,
                  reasoningPipeline: {
                    ...reasoningPayload,
                    stage3_correctionQueue: reasoningPayload.stage3_correctionQueue.map(
                      (item: any) => (item.id === id ? { ...item, status: 'acknowledged' } : item)
                    ),
                  },
                };
                saveReviewSnapshot({
                  caseId,
                  type: 'jarvis',
                  report: updated,
                  specialists: ['Clinical Review'],
                });
                setReport(updated);
              }}
              isUpdating={isUpdatingReasoning}
            />
          </details>

          {perspectives.length > 0 && (
            <details style={{ marginTop: 14, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
              <summary
                style={{ cursor: 'pointer', color: '#BE123C', fontSize: 14, fontWeight: 800 }}
              >
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
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      <ClinicalUrgencyNotice text={history} />
      {selectedCaseId &&
        getCase(selectedCaseId)?.reviews?.some(
          (review) =>
            review.type === 'jarvis' &&
            !isCurrentClinicalReview(review.report, getCase(selectedCaseId))
        ) && (
          <p role="status">
            An earlier review predates the current evidence checks or its source records have
            changed. Run a fresh review from your original records before relying on its
            interpretation.
          </p>
        )}
      <p role="status" style={{ color: '#475569', fontSize: 13 }}>
        {draftStatus}
      </p>
      {/* Workspace Header / Session Status matching Reference Layout */}
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '8px' : '12px',
          marginBottom: '16px',
          padding: '0 4px',
        }}
      >
        {/* Back navigation button */}
        <button
          type="button"
          onClick={() => {
            if (intakeStep > 1) {
              triggerHapticLight();
              setIntakeStep((prev) => (prev - 1) as any);
            } else {
              void handleSaveAndExit();
            }
          }}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E4E4E7',
            color: '#18181B',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#E11D48';
            e.currentTarget.style.borderColor = '#FDA4AF';
            e.currentTarget.style.background = '#FFF1F2';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#18181B';
            e.currentTarget.style.borderColor = '#E4E4E7';
            e.currentTarget.style.background = '#FFFFFF';
          }}
          title={intakeStep > 1 ? 'Previous intake step' : 'Save intake and return to workspace'}
          aria-label={
            intakeStep > 1 ? 'Previous intake step' : 'Save intake and return to workspace'
          }
          disabled={!draftReady || isReadingFiles}
        >
          ←
        </button>

        {/* 6-segment minimal progress bar */}
        <div
          style={{
            flex: '1 1 auto',
            maxWidth: '360px',
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '4px' : '6px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '999px',
                background:
                  intakeStep >= s ? 'linear-gradient(90deg, #E11D48, #FB7185)' : '#E4E4E7',
                transition: 'background 0.2s ease',
              }}
            />
          ))}
        </div>

        {/* Right utility: Step badge and Save & Exit */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '6px' : '10px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              padding: isMobile ? '4px 8px' : '5px 12px',
              borderRadius: '9999px',
              fontSize: isMobile ? '11px' : '12px',
              fontWeight: 700,
              color: '#BE123C',
              boxShadow: '0 1px 2px rgba(225, 29, 72, 0.04)',
            }}
          >
            <span>{isMobile ? `${intakeStep}/6` : `${intakeStep} of 6`}</span>
          </div>

          <button
            type="button"
            disabled={!draftReady || isReadingFiles}
            onClick={handleSaveAndExit}
            style={{
              minHeight: '44px',
              background: 'none',
              border: 'none',
              color: '#71717A',
              fontSize: isMobile ? '11.5px' : '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: isMobile ? '4px 6px' : '5px 8px',
              borderRadius: '6px',
              transition: 'color 0.15s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#18181B')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#71717A')}
          >
            Save &amp; Exit
          </button>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 60px -15px rgba(225, 29, 72, 0.05), 0 1px 3px rgba(0,0,0,0.02)',
          border: '1.5px solid rgba(228, 228, 231, 0.9)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Editorial Header Banner with Reference Typography */}
        <div
          style={{
            background: 'linear-gradient(135deg, #FFF5F6 0%, #FFFFFF 60%, #F8F9FB 100%)',
            padding: isMobile ? '24px 18px 20px' : '32px 36px 24px',
            borderBottom: '1px solid #F4F4F5',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: isMobile ? 'nowrap' : 'wrap',
              gap: isMobile ? '8px' : '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? '6px' : '10px',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  width: isMobile ? '32px' : '38px',
                  height: isMobile ? '32px' : '38px',
                  borderRadius: isMobile ? '10px' : '12px',
                  background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                  flexShrink: 0,
                }}
              >
                <BrainCircuit size={isMobile ? 16 : 20} color="#FFFFFF" />
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#FFF1F2',
                  border: '1px solid #FECDD3',
                  padding: isMobile ? '3px 8px' : '3px 10px',
                  borderRadius: '9999px',
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#E11D48',
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: '#BE123C',
                    fontWeight: 800,
                    fontSize: isMobile ? '10px' : '11px',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {isMobile ? 'Clinical Review' : 'Clinical Review Workstation'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHapticLight();
                navigate('/privacy');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: isMobile ? '4px 10px' : '5px 12px',
                borderRadius: '9999px',
                background: '#FFF1F2',
                border: '1px solid #FECDD3',
                color: '#BE123C',
                fontSize: isMobile ? '11px' : '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
              title="Review how data is stored and processed"
            >
              <ShieldCheck size={isMobile ? 12 : 13} />
              <span>Privacy policy</span>
            </button>
          </div>

          <h1
            style={{
              fontFamily: '"Newsreader", "Playfair Display", "Merriweather", "Georgia", serif',
              fontSize: isMobile ? '23px' : '29px',
              fontWeight: 800,
              color: '#18181B',
              margin: '0 0 6px 0',
              letterSpacing: '-0.5px',
              lineHeight: 1.25,
            }}
          >
            {STEP_META[intakeStep]?.title || 'Clinical Review Workstation'}
          </h1>

          <p
            style={{
              color: '#64748B',
              fontSize: isMobile ? '13.5px' : '15px',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: '720px',
            }}
          >
            {STEP_META[intakeStep]?.subtitle || ''}
          </p>
        </div>

        {/* 6-Step Guided Progress Track */}
        <div
          style={{
            padding: '16px 24px 14px',
            background: '#FAFAFA',
            borderBottom: '1px solid #F4F4F5',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 6 Gradient Progress Capsules in Clinical Crimson */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div
                  key={s}
                  aria-label={STEP_META[s].label}
                  aria-current={intakeStep === s ? 'step' : undefined}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '999px',
                    background:
                      intakeStep >= s ? 'linear-gradient(90deg, #E11D48, #FB7185)' : '#E4E4E7',
                    boxShadow: intakeStep === s ? '0 0 8px rgba(225, 29, 72, 0.45)' : 'none',
                    transition: 'all 0.25s ease',
                  }}
                />
              ))}
            </div>

            {/* Stage Title & Status Indicator */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                paddingTop: '2px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 800,
                    color: '#BE123C',
                    letterSpacing: '0.2px',
                  }}
                >
                  {STEP_META[intakeStep]?.title}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#BE123C',
                    background: '#FFF1F2',
                    padding: '2px 9px',
                    borderRadius: '999px',
                    border: '1px solid #FECDD3',
                  }}
                >
                  {STEP_META[intakeStep]?.badge}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Step Body Content with Card-Based Rhythm */}
        <div
          style={{ padding: isMobile ? '20px 16px' : '28px 36px', position: 'relative', zIndex: 1 }}
        >
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
                <strong>Case Not Found:</strong> Case &quot;{missingCaseId}&quot; could not be found
                in your local records. You can choose another case below or start a new case.
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: CLINICAL TIMELINE & SYMPTOMS (EDITORIAL CLOUD WORKSTATION)        */}
          {/* ========================================================================= */}
          {intakeStep === 1 && (
            <div key="step1" style={{ paddingBottom: isMobile ? '90px' : '90px' }}>
              {/* 1. TOP SELECTED SHELF & COUNTER (from Reference Image) */}
              {selectedSymptoms.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: isMobile ? '6px' : '8px',
                    marginBottom: isMobile ? '12px' : '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 850,
                        color: '#71717A',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      {selectedSymptoms.length} SELECTED
                    </span>
                    {selectedSymptoms.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setSelectedSymptoms([]);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#BE123C',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                        }}
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: isMobile ? 'nowrap' : 'wrap',
                      overflowX: isMobile ? 'auto' : 'visible',
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      gap: isMobile ? '6px' : '8px',
                      paddingBottom: isMobile ? '4px' : '0',
                      alignItems: 'center',
                    }}
                  >
                    {selectedSymptoms.map((sym) => {
                      const found = findPresetSymptom(sym);
                      const IconComponent = found?.icon || Heart;
                      return (
                        <motion.div
                          key={sym}
                          layout
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.8, opacity: 0 }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            flexShrink: 0,
                            width: 'fit-content',
                            gap: isMobile ? '6px' : '8px',
                            padding: isMobile ? '4px 10px 4px 6px' : '5px 12px 5px 7px',
                            borderRadius: '9999px',
                            border: '1.5px solid #E11D48',
                            background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                            color: '#BE123C',
                            fontSize: isMobile ? '12px' : '13px',
                            fontWeight: 700,
                            boxShadow: '0 2px 8px rgba(225, 29, 72, 0.2)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <ClassySymptomBadge
                            icon={IconComponent}
                            color1="#E11D48"
                            color2="#FB7185"
                            shadow="rgba(225, 29, 72, 0.28)"
                            size={isMobile ? 18 : 20}
                          />
                          <span style={{ whiteSpace: 'nowrap' }}>{sym}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSymptom(sym)}
                            aria-label={`Remove ${sym}`}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#BE123C',
                              marginLeft: '2px',
                              flexShrink: 0,
                              opacity: 0.75,
                              borderRadius: '50%',
                              transition: 'opacity 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.75';
                            }}
                          >
                            <X size={isMobile ? 12 : 13} strokeWidth={2.5} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. CAPSULE SEARCH BAR */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#FFFFFF',
                  border: '1.5px solid #E4E4E7',
                  borderRadius: '9999px',
                  padding: '10px 16px',
                  gap: '10px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  marginBottom: '12px',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                <Search size={17} color="#71717A" style={{ flexShrink: 0 }} />
                <input
                  type="text"
                  value={symptomSearch}
                  onChange={(e) => setSymptomSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSymptom();
                    }
                  }}
                  placeholder="Search 70+ symptoms or type a custom symptom…"
                  aria-label="Search or add symptom"
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    width: '100%',
                    fontSize: '14px',
                    color: '#18181B',
                  }}
                />
                {symptomSearch.trim() && (
                  <button
                    type="button"
                    onClick={handleAddCustomSymptom}
                    style={{
                      background: '#FFE4E6',
                      color: '#E11D48',
                      border: '1px solid #FDA4AF',
                      borderRadius: '9999px',
                      padding: '5px 12px',
                      fontSize: isMobile ? '11px' : '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={13} strokeWidth={3} />
                    <span>
                      Add &quot;{symptomSearch.trim().slice(0, 16)}
                      {symptomSearch.trim().length > 16 ? '…' : ''}&quot;
                    </span>
                  </button>
                )}
              </div>

              {/* 3. ORGAN SYSTEM CATEGORY FILTER TABS */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  marginBottom: '14px',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {[
                  { id: 'all', label: 'All (70+)' },
                  { id: 'common', label: '⭐ Most Common' },
                  { id: 'gut', label: '🥗 Gut & Digestion' },
                  { id: 'neuro', label: '🧠 Head & Neuro' },
                  { id: 'respiratory', label: '🫁 Lungs & ENT' },
                  { id: 'cardio', label: '🫀 Heart & Chest' },
                  { id: 'pain', label: '🦴 Pain & Joints' },
                  { id: 'skin', label: '🧴 Skin & Allergies' },
                  { id: 'systemic', label: '⚡ Energy & Fever' },
                  { id: 'sleep_mental', label: '🌙 Sleep & Mood' },
                ].map((cat) => {
                  const tabTheme = SYMPTOM_CATEGORY_THEMES[cat.id];
                  const isActive = symptomCategoryFilter === cat.id;
                  const activeBorder = tabTheme
                    ? tabTheme.activeBorder
                    : cat.id === 'common'
                      ? '#D97706'
                      : '#E11D48';
                  const activeBg = tabTheme
                    ? tabTheme.bgStart
                    : cat.id === 'common'
                      ? '#FFFBEB'
                      : '#FFF1F2';
                  const activeColor = tabTheme
                    ? tabTheme.textColor
                    : cat.id === 'common'
                      ? '#92400E'
                      : '#BE123C';
                  const activeShadow = tabTheme ? tabTheme.shadow : 'rgba(225, 29, 72, 0.2)';
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        triggerHapticLight();
                        setSymptomCategoryFilter(cat.id);
                      }}
                      style={{
                        flexShrink: 0,
                        padding: isMobile ? '5px 11px' : '6px 13px',
                        borderRadius: '999px',
                        border: isActive ? `1.5px solid ${activeBorder}` : '1px solid #E4E4E7',
                        background: isActive ? activeBg : '#FFFFFF',
                        color: isActive ? activeColor : '#64748B',
                        fontSize: isMobile ? '11px' : '12px',
                        fontWeight: isActive ? 800 : 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? `0 1px 6px ${activeShadow}` : 'none',
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* 4. CLINICAL SYMPTOM CLOUD */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: isMobile ? '7px 8px' : '9px 10px',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  width: '100%',
                  marginBottom: '22px',
                }}
              >
                {/* User-added Custom Symptoms */}
                {customSymptoms
                  .filter(
                    (cs) =>
                      !symptomSearch.trim() ||
                      cs.toLowerCase().includes(symptomSearch.trim().toLowerCase())
                  )
                  .map((cs) => {
                    const isSelected = selectedSymptoms.some(
                      (s) => s.toLowerCase() === cs.toLowerCase()
                    );

                    return (
                      <button
                        key={`custom-${cs}`}
                        type="button"
                        aria-label={cs}
                        onClick={() => handleToggleSymptom(cs)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: isMobile ? '7px 13px' : '8px 14px',
                          borderRadius: '999px',
                          border: isSelected ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                          background: isSelected
                            ? 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)'
                            : '#FFFFFF',
                          color: isSelected ? '#BE123C' : '#1C1917',
                          cursor: 'pointer',
                          boxShadow: isSelected
                            ? '0 3px 12px rgba(225, 29, 72, 0.22)'
                            : '0 2px 6px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                          textAlign: 'left',
                          flexShrink: 0,
                          maxWidth: '100%',
                        }}
                      >
                        <ClassySymptomBadge
                          icon={Sparkles}
                          category="systemic"
                          color1={isSelected ? '#E11D48' : undefined}
                          color2={isSelected ? '#FB7185' : undefined}
                          shadow={isSelected ? 'rgba(225, 29, 72, 0.28)' : undefined}
                          size={isMobile ? 20 : 22}
                        />
                        <div style={{ textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              fontSize: isMobile ? '13px' : '13.5px',
                              fontWeight: isSelected ? 800 : 700,
                              color: isSelected ? '#BE123C' : '#1C1917',
                              display: 'block',
                              letterSpacing: '-0.1px',
                            }}
                          >
                            {cs}
                          </span>
                          <span
                            style={{
                              fontSize: isMobile ? '10.5px' : '11px',
                              fontWeight: 500,
                              color: isSelected ? '#E11D48' : '#78716C',
                              display: 'block',
                            }}
                          >
                            Custom Symptom Note
                          </span>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              width: '17px',
                              height: '17px',
                              borderRadius: '50%',
                              background: '#E11D48',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              marginLeft: '2px',
                              flexShrink: 0,
                              boxShadow: '0 2px 6px rgba(225, 29, 72, 0.28)',
                            }}
                          >
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                      </button>
                    );
                  })}

                {/* Preset Symptoms filtered by search and category */}
                {visiblePresetSymptoms.map((sym) => {
                  const isSelected = selectedSymptoms.some(
                    (s) =>
                      s.toLowerCase() === sym.name.toLowerCase() ||
                      Boolean(sym.aliases?.some((a) => a.toLowerCase() === s.toLowerCase()))
                  );

                  const IconComp = sym.icon || Activity;
                  return (
                    <button
                      key={sym.id}
                      type="button"
                      aria-label={sym.name}
                      onClick={() => handleToggleSymptom(sym.name)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: isMobile ? '7px 13px' : '8px 14px',
                        borderRadius: '999px',
                        border: isSelected ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                        background: isSelected
                          ? 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)'
                          : '#FFFFFF',
                        color: isSelected ? '#BE123C' : '#1C1917',
                        cursor: 'pointer',
                        boxShadow: isSelected
                          ? '0 3px 12px rgba(225, 29, 72, 0.22)'
                          : '0 2px 6px rgba(0, 0, 0, 0.03)',
                        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        textAlign: 'left',
                        flexShrink: 0,
                        maxWidth: '100%',
                      }}
                    >
                      <ClassySymptomBadge
                        icon={IconComp}
                        category={sym.category}
                        color1={isSelected ? '#E11D48' : undefined}
                        color2={isSelected ? '#FB7185' : undefined}
                        shadow={isSelected ? 'rgba(225, 29, 72, 0.28)' : undefined}
                        size={isMobile ? 20 : 22}
                      />
                      <div style={{ textAlign: 'left', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            fontSize: isMobile ? '13px' : '13.5px',
                            fontWeight: isSelected ? 800 : 700,
                            color: isSelected ? '#BE123C' : '#1C1917',
                            display: 'block',
                            letterSpacing: '-0.1px',
                          }}
                        >
                          {sym.name}
                        </span>
                        {sym.subtitle && (
                          <span
                            style={{
                              fontSize: isMobile ? '10.5px' : '11px',
                              fontWeight: 500,
                              color: isSelected ? '#E11D48' : '#78716C',
                              display: 'block',
                            }}
                          >
                            {sym.subtitle}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            width: '17px',
                            height: '17px',
                            borderRadius: '50%',
                            background: '#E11D48',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#FFFFFF',
                            marginLeft: '2px',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(225, 29, 72, 0.28)',
                          }}
                        >
                          <Check size={11} strokeWidth={3.5} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Empty State when Search has no matches */}
              {symptomSearch.trim() &&
                visiblePresetSymptoms.length === 0 &&
                customSymptoms.filter((cs) =>
                  cs.toLowerCase().includes(symptomSearch.trim().toLowerCase())
                ).length === 0 && (
                  <div
                    style={{
                      padding: '18px 20px',
                      background: '#FFF1F2',
                      border: '1.5px dashed #FDA4AF',
                      borderRadius: '16px',
                      textAlign: 'center',
                      marginBottom: '22px',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 10px 0',
                        fontSize: '13.5px',
                        color: '#9F1239',
                        fontWeight: 600,
                      }}
                    >
                      No preset symptom matched &quot;{symptomSearch.trim()}&quot;
                    </p>
                    <button
                      type="button"
                      onClick={handleAddCustomSymptom}
                      style={{
                        background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '9999px',
                        padding: '9px 20px',
                        fontSize: '13px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Plus size={15} strokeWidth={3} />
                      <span>Add &quot;{symptomSearch.trim()}&quot; to My Symptoms</span>
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: ONSET & TIMELINE (DEDICATED ONBOARDING SCREEN)                    */}
          {/* ========================================================================= */}
          {intakeStep === 2 && (
            <div key="step2">
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: isMobile ? '20px 16px' : '28px 28px',
                  border: '1.5px solid #F4F4F5',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
                      border: '1px solid #FDA4AF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E11D48',
                      flexShrink: 0,
                    }}
                  >
                    <CalendarClock size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                      Onset Timing & Chronology
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0, marginTop: '2px' }}>
                      Tap an onset timeframe to anchor your clinical chronology
                    </p>
                  </div>
                </div>

                {/* 6 Tactile Onboarding Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '10px',
                  }}
                >
                  {[
                    {
                      name: 'Today (< 24h)',
                      icon: Sun,
                      bg: '#FFF1F2',
                      border: '#FDA4AF',
                      color: '#E11D48',
                      shadow: 'rgba(225, 29, 72, 0.28)',
                      label: 'Today (< 24h)',
                      desc: 'Acute symptom onset within the last 24 hours',
                    },
                    {
                      name: 'Past few days',
                      icon: Clock,
                      bg: '#F0F9FF',
                      border: '#BAE6FD',
                      color: '#0284C7',
                      shadow: 'rgba(2, 132, 199, 0.28)',
                      label: 'Past few days',
                      desc: 'Started 2 to 6 days ago',
                    },
                    {
                      name: '1–2 weeks',
                      icon: Calendar,
                      bg: '#EEF2FF',
                      border: '#C7D2FE',
                      color: '#4F46E5',
                      shadow: 'rgba(79, 70, 229, 0.28)',
                      label: '1–2 weeks',
                      desc: 'Developing over the past couple weeks',
                    },
                    {
                      name: '1–3 months',
                      icon: Hourglass,
                      bg: '#FFFBEB',
                      border: '#FDE68A',
                      color: '#D97706',
                      shadow: 'rgba(217, 119, 6, 0.28)',
                      label: '1–3 months',
                      desc: 'Subacute condition present for several weeks',
                    },
                    {
                      name: '6+ months (chronic)',
                      icon: Waves,
                      bg: '#F5F3FF',
                      border: '#DDD6FE',
                      color: '#7C3AED',
                      shadow: 'rgba(124, 58, 237, 0.28)',
                      label: '6+ months (chronic)',
                      desc: 'Long-standing or recurring chronic concern',
                    },
                    {
                      name: 'Several years',
                      icon: CalendarDays,
                      bg: '#F0FDFA',
                      border: '#99F6E4',
                      color: '#0D9488',
                      shadow: 'rgba(13, 148, 136, 0.28)',
                      label: 'Several years',
                      desc: 'Multi-year chronic medical history',
                    },
                  ].map((opt) => {
                    const isSelected =
                      selectedOnset === opt.name || history.includes(`Onset: ${opt.name}`);
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        aria-label={opt.name}
                        onClick={() => handleSelectOnset(opt.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: isMobile ? '12px 14px' : '14px 18px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          border: isSelected ? `1.5px solid ${opt.color}` : '1px solid #E2E8F0',
                          background: isSelected
                            ? `linear-gradient(135deg, ${opt.bg} 0%, #FFFFFF 100%)`
                            : '#FFFFFF',
                          boxShadow: isSelected
                            ? `0 4px 14px ${opt.shadow}`
                            : '0 2px 6px rgba(0, 0, 0, 0.02)',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: isMobile ? '34px' : '38px',
                              height: isMobile ? '34px' : '38px',
                              borderRadius: '12px',
                              background: isSelected ? '#FFFFFF' : opt.bg,
                              border: isSelected
                                ? `1.5px solid ${opt.color}`
                                : `1px solid ${opt.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: opt.color,
                              flexShrink: 0,
                              boxShadow: isSelected ? `0 2px 8px ${opt.color}25` : 'none',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            <opt.icon size={isMobile ? 18 : 20} strokeWidth={2.4} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: isMobile ? '13px' : '13.5px',
                                fontWeight: isSelected ? 800 : 700,
                                color: isSelected ? opt.color : '#1C1917',
                                letterSpacing: '-0.1px',
                              }}
                            >
                              {opt.name}
                            </div>
                            <div
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 500,
                                color: isSelected ? opt.color : '#78716C',
                                opacity: isSelected ? 0.9 : 1,
                                marginTop: '2px',
                                lineHeight: 1.25,
                              }}
                            >
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: opt.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              marginLeft: '8px',
                              flexShrink: 0,
                              boxShadow: `0 2px 6px ${opt.shadow}`,
                            }}
                          >
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: SYMPTOM PROGRESSION & DYNAMICS (DEDICATED ONBOARDING SCREEN)      */}
          {/* ========================================================================= */}
          {intakeStep === 3 && (
            <div key="step3">
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: isMobile ? '20px 16px' : '28px 28px',
                  border: '1.5px solid #F4F4F5',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                      border: '1px solid #FCD34D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#D97706',
                      flexShrink: 0,
                    }}
                  >
                    <Activity size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                      Symptom Dynamics & Trajectory
                    </h2>
                    <p style={{ fontSize: '13px', color: '#64748B', margin: 0, marginTop: '2px' }}>
                      Progression pattern helps clinicians evaluate trajectory and urgency
                    </p>
                  </div>
                </div>

                {/* 4 Distinct Trend Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                    gap: '10px',
                  }}
                >
                  {[
                    {
                      name: 'Getting worse ↗',
                      icon: TrendingUp,
                      label: 'Getting worse',
                      bg: '#FFF1F2',
                      border: '#FDA4AF',
                      color: '#E11D48',
                      shadow: 'rgba(225, 29, 72, 0.28)',
                      desc: 'Intensity or frequency is steadily increasing over time',
                      activeBg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                      activeBorder: '#E11D48',
                      activeColor: '#9F1239',
                    },
                    {
                      name: 'Fluctuating / Comes & Goes ∿',
                      icon: Activity,
                      label: 'Fluctuating',
                      bg: '#F5F3FF',
                      border: '#DDD6FE',
                      color: '#7C3AED',
                      shadow: 'rgba(124, 58, 237, 0.28)',
                      desc: 'Flares up intermittently with quiet symptom-free periods',
                      activeBg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                      activeBorder: '#7C3AED',
                      activeColor: '#5B21B6',
                    },
                    {
                      name: 'Constant / Unchanged →',
                      icon: Minus,
                      label: 'Constant',
                      bg: '#F8FAFC',
                      border: '#CBD5E1',
                      color: '#475569',
                      shadow: 'rgba(71, 85, 105, 0.28)',
                      desc: 'Stays at the same steady level without clear change',
                      activeBg: 'linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)',
                      activeBorder: '#475569',
                      activeColor: '#1E293B',
                    },
                    {
                      name: 'Gradually improving ↘',
                      icon: TrendingDown,
                      label: 'Gradually improving',
                      bg: '#ECFDF5',
                      border: '#A7F3D0',
                      color: '#059669',
                      shadow: 'rgba(5, 150, 105, 0.28)',
                      desc: 'Severity is subsiding or symptoms are resolving',
                      activeBg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                      activeBorder: '#059669',
                      activeColor: '#065F46',
                    },
                  ].map((opt) => {
                    const isSelected =
                      selectedProgression === opt.name ||
                      history.includes(`Progression: ${opt.name}`);
                    return (
                      <button
                        key={opt.name}
                        type="button"
                        aria-label={opt.name}
                        onClick={() => handleSelectProgression(opt.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: isMobile ? '12px 14px' : '14px 18px',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          border: isSelected
                            ? `1.5px solid ${opt.activeBorder}`
                            : '1px solid #E2E8F0',
                          background: isSelected ? opt.activeBg : '#FFFFFF',
                          boxShadow: isSelected
                            ? `0 4px 14px ${opt.shadow}`
                            : '0 2px 6px rgba(0, 0, 0, 0.02)',
                          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: isMobile ? '34px' : '38px',
                              height: isMobile ? '34px' : '38px',
                              borderRadius: '12px',
                              background: isSelected ? '#FFFFFF' : opt.bg,
                              border: isSelected
                                ? `1.5px solid ${opt.activeBorder}`
                                : `1px solid ${opt.border}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: opt.color,
                              flexShrink: 0,
                              boxShadow: isSelected ? `0 2px 8px ${opt.color}25` : 'none',
                              transition: 'all 0.18s ease',
                            }}
                          >
                            <opt.icon size={isMobile ? 18 : 20} strokeWidth={2.6} />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: isMobile ? '13px' : '13.5px',
                                fontWeight: isSelected ? 800 : 700,
                                color: isSelected ? opt.activeColor : '#1C1917',
                                letterSpacing: '-0.1px',
                              }}
                            >
                              {opt.name}
                            </div>
                            <div
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 500,
                                color: isSelected ? opt.activeColor : '#78716C',
                                opacity: isSelected ? 0.9 : 1,
                                marginTop: '2px',
                                lineHeight: 1.25,
                              }}
                            >
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: opt.activeBorder,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFFFFF',
                              marginLeft: '8px',
                              flexShrink: 0,
                              boxShadow: `0 2px 6px ${opt.shadow}`,
                            }}
                          >
                            <Check size={11} strokeWidth={3.5} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CLINICAL STORY & NARRATIVE CANVAS (DEDICATED ONBOARDING SCREEN)  */}
          {/* ========================================================================= */}
          {intakeStep === 4 && (
            <div key="step4">
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: isMobile ? '20px 16px' : '26px 28px',
                  border: '1.5px solid #F4F4F5',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                        border: '1px solid #FECDD3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#E11D48',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={22} />
                    </div>
                    <div>
                      <h2
                        style={{ fontSize: '17px', fontWeight: 800, color: '#18181B', margin: 0 }}
                      >
                        Clinical Story & Timeline Notes
                      </h2>
                      <p
                        style={{ fontSize: '13px', color: '#64748B', margin: 0, marginTop: '2px' }}
                      >
                        Your timeline narrative, symptom sensations, and questions in your own voice
                      </p>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color:
                        history
                          .trim()
                          .split(/\s+/)
                          .filter((w) => w.length > 0).length >= 800
                          ? '#EF4444'
                          : history
                                .trim()
                                .split(/\s+/)
                                .filter((w) => w.length > 0).length > 650
                            ? '#D97706'
                            : '#BE123C',
                      background: '#FFF1F2',
                      border: '1px solid #FECDD3',
                      padding: '4px 10px',
                      borderRadius: '999px',
                    }}
                  >
                    {
                      history
                        .trim()
                        .split(/\s+/)
                        .filter((w) => w.length > 0).length
                    }{' '}
                    / 800 words
                  </span>
                </div>

                {/* Magic Prompt Pills */}
                <div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#BE123C',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={12} color="#E11D48" />
                    <span>Tap to insert structured clinical prompts:</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      paddingBottom: '6px',
                      scrollbarWidth: 'none',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {[
                      {
                        label: 'Onset & Duration',
                        icon: Clock,
                        bg: '#F0F9FF',
                        border: '#BAE6FD',
                        color: '#0284C7',
                        text: 'When this started and how it has changed: ',
                      },
                      {
                        label: 'Symptoms & Frequency',
                        icon: Stethoscope,
                        bg: '#FFF1F2',
                        border: '#FDA4AF',
                        color: '#E11D48',
                        text: 'Symptoms I have noticed, how often they happen, and daily impact: ',
                      },
                      {
                        label: 'Triggers & Relief',
                        icon: Zap,
                        bg: '#FFFBEB',
                        border: '#FDE68A',
                        color: '#D97706',
                        text: 'Things that seem to improve or worsen symptoms: ',
                      },
                      {
                        label: 'Prior Tests & Care',
                        icon: ClipboardList,
                        bg: '#EEF2FF',
                        border: '#C7D2FE',
                        color: '#4F46E5',
                        text: 'Appointments, tests, treatments, and prior doctor opinions: ',
                      },
                      {
                        label: 'Questions for Doctor',
                        icon: HelpCircle,
                        bg: '#F5F3FF',
                        border: '#DDD6FE',
                        color: '#7C3AED',
                        text: 'What I most want help understanding from my clinician: ',
                      },
                    ].map((cluster, cIdx) => (
                      <button
                        key={cIdx}
                        type="button"
                        onClick={() => {
                          triggerHapticSelection();
                          setHistory((prev) =>
                            prev ? `${prev}\n\n${cluster.text}` : cluster.text
                          );
                        }}
                        style={{
                          flexShrink: 0,
                          padding: '5px 12px 5px 8px',
                          height: '32px',
                          borderRadius: '999px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          color: '#1C1917',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '7px',
                          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = cluster.bg;
                          e.currentTarget.style.borderColor = cluster.border;
                          e.currentTarget.style.color = cluster.color;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#FFFFFF';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                          e.currentTarget.style.color = '#1C1917';
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: cluster.bg,
                            border: `1px solid ${cluster.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: cluster.color,
                            flexShrink: 0,
                          }}
                        >
                          <cluster.icon size={11} strokeWidth={2.4} />
                        </div>
                        <span>{cluster.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frosted Textarea with Raspberry Focus */}
                <textarea
                  id="clinical-timeline"
                  value={history}
                  onChange={(e) => {
                    const text = e.target.value;
                    const words = text
                      .trim()
                      .split(/\s+/)
                      .filter((w) => w.length > 0);
                    if (words.length <= 800 || text.length < history.length) {
                      setHistory(text);
                    } else {
                      toast.info(
                        'Story limit reached',
                        'Keep the notes within 800 words. You can shorten the text or attach relevant records on the next screen.'
                      );
                    }
                  }}
                  placeholder="Describe when this started, how symptoms feel, what makes them better or worse, or prior doctor opinions (Max 800 words)..."
                  aria-label="Clinical timeline and symptom notes"
                  style={{
                    width: '100%',
                    height: '210px',
                    padding: '18px',
                    borderRadius: '16px',
                    border: '1.5px solid #E4E4E7',
                    resize: 'vertical',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: '#FFFFFF',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                    outline: 'none',
                    lineHeight: 1.6,
                    color: '#18181B',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#E11D48';
                    e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#E4E4E7';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: LAB & EVIDENCE VAULT                                              */}
          {/* ========================================================================= */}
          {intakeStep === 5 && (
            <div key="step5">
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: isMobile ? '18px 16px' : '24px 28px',
                  border: '1.5px solid #F4F4F5',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
                      border: '1px solid #FDA4AF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E11D48',
                      flexShrink: 0,
                    }}
                  >
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                      Uploaded Evidence & Panels
                    </h2>
                    <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                      Upload PDFs, lab panels, or discharge summaries. The engine extracts
                      documented facts and audits contradictions.
                    </p>
                  </div>
                </div>

                {/* Upload Dropzone */}
                <div style={{ marginBottom: '18px' }}>
                  <input
                    type="file"
                    disabled={!draftReady || isReadingFiles}
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    aria-label="Upload medical records, lab reports, or health documents"
                    style={{ display: 'none' }}
                  />

                  <button
                    type="button"
                    disabled={!draftReady || isReadingFiles}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload PDFs or photos of medical records"
                    style={{
                      width: '100%',
                      padding: '28px 20px',
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF1F2 100%)',
                      border: '2px dashed #FDA4AF',
                      borderRadius: '18px',
                      color: '#BE123C',
                      fontWeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 8px rgba(225, 29, 72, 0.04)',
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#E11D48';
                      e.currentTarget.style.background = '#FFF1F2';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#FDA4AF';
                      e.currentTarget.style.background =
                        'linear-gradient(135deg, #FFFFFF 0%, #FFF1F2 100%)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: '#FFE4E6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(225, 29, 72, 0.15)',
                      }}
                    >
                      <UploadCloud size={25} color="#E11D48" />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '15px',
                          color: '#18181B',
                          display: 'block',
                          fontWeight: 800,
                        }}
                      >
                        Drop Lab Reports, Discharge Summaries, or Imaging
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          fontWeight: 500,
                          marginTop: '3px',
                          display: 'block',
                        }}
                      >
                        PDF, JPG, PNG or WebP · up to 10 files · 3 MB per file · about 2.6 MB
                        combined
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        gap: '8px',
                        marginTop: '4px',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#9F1239',
                          background: '#FFF1F2',
                          border: '1px solid #FECDD3',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          boxShadow: '0 1px 3px rgba(225, 29, 72, 0.08)',
                        }}
                      >
                        <FileText size={13} color="#E11D48" strokeWidth={2.2} />
                        <span>PDF Lab Panels</span>
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#0369A1',
                          background: '#F0F9FF',
                          border: '1px solid #BAE6FD',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          boxShadow: '0 1px 3px rgba(2, 132, 199, 0.08)',
                        }}
                      >
                        <Camera size={13} color="#0284C7" strokeWidth={2.2} />
                        <span>Photos & Scans</span>
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: '#5B21B6',
                          background: '#F5F3FF',
                          border: '1px solid #DDD6FE',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          boxShadow: '0 1px 3px rgba(124, 58, 237, 0.08)',
                        }}
                      >
                        <FlaskConical size={13} color="#7C3AED" strokeWidth={2.2} />
                        <span>Imaging Reports</span>
                      </span>
                    </div>
                  </button>
                </div>

                {/* Uploaded Staged File List */}
                {files.length > 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginBottom: '18px',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px 14px',
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#9F1239',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <ShieldCheck size={16} color="#E11D48" />
                      <span>
                        <strong>{files.length} document(s) staged.</strong> Original files are saved
                        in this browser’s device storage after the review.
                      </span>
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
                          border: '1px solid #E2E8F0',
                          borderRadius: '14px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '8px',
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#E11D48',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={15} strokeWidth={2.2} />
                          </div>
                          <span
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#1C1917',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {f.file.name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              color: '#78716C',
                              flexShrink: 0,
                            }}
                          >
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
                            color: '#78716C',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = '#E11D48';
                            e.currentTarget.style.borderColor = '#FDA4AF';
                            e.currentTarget.style.background = '#FFF1F2';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = '#78716C';
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
                  <div
                    style={{
                      padding: '12px 16px',
                      background: '#FAFAFA',
                      border: '1px solid #E4E4E7',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#64748B',
                      marginBottom: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#A1A1AA',
                        display: 'inline-block',
                      }}
                    />
                    <span>
                      No documents attached yet. If you have lab panels or scans, upload them above
                      for extraction.
                    </span>
                  </div>
                )}

                {/* Existing Connected Case Documents */}
                {(() => {
                  const activeCase = selectedCaseId ? getCase(selectedCaseId) : null;
                  if (!activeCase?.medicalRecords || activeCase.medicalRecords.length === 0)
                    return null;
                  return (
                    <div style={{ borderTop: '1px solid #F4F4F5', paddingTop: '14px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: '#BE123C',
                            textTransform: 'uppercase',
                            letterSpacing: '0.4px',
                          }}
                        >
                          Connected Case Records ({activeCase.medicalRecords.length})
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#BE123C',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <ShieldCheck size={12} color="#E11D48" /> Stored on device
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
                              background: '#FFFFFF',
                              border: '1px solid #E4E4E7',
                              borderRadius: '10px',
                              fontSize: '12px',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                overflow: 'hidden',
                              }}
                            >
                              <FileText size={14} color="#E11D48" />
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: '#18181B',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: '240px',
                                }}
                              >
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
                                  passageText:
                                    rec.passages?.[0]?.text ||
                                    rec.findings ||
                                    'No passage text available',
                                  fullFindings: rec.findings,
                                  dateAdded: rec.addedAt,
                                  findingClaim: rec.findings,
                                  onCorrectionSaved: () => {
                                    toast.success(
                                      'Document Extraction Updated',
                                      'Non-destructive correction recorded in case.'
                                    );
                                  },
                                });
                              }}
                              style={{
                                background: '#FFF1F2',
                                border: '1px solid #FECDD3',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                color: '#BE123C',
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
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: REVIEW SCOPE, CASE ROUTING & LAUNCHPAD                            */}
          {/* ========================================================================= */}
          {intakeStep === 6 && (
            <div key="step6">
              <section
                className="hc-outcome"
                aria-label="Review input summary"
                style={{ marginBottom: 20 }}
              >
                <div className="hc-outcome-section">
                  <h3>What this review will use</h3>
                  <p>
                    <strong>Symptoms:</strong>{' '}
                    {selectedSymptoms.join(', ') ||
                      'No guided selection; use the story or records below.'}
                  </p>
                  <p>
                    <strong>Onset:</strong> {selectedOnset || 'Not specified'} ·{' '}
                    <strong>Pattern:</strong> {selectedProgression || 'Not specified'}
                  </p>
                  <h4>Your current notes</h4>
                  <p>
                    {history.trim() ||
                      'No narrative added. Only the available record text will be reviewed.'}
                  </p>
                  <h4>New attachments ({files.length})</h4>
                  {files.length ? (
                    <ul>
                      {files.map((attachment, index) => (
                        <li key={index}>
                          {attachment.file.name} · {Math.ceil(attachment.file.size / 1024)} KB
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No new attachments. This is optional.</p>
                  )}
                  <h4>Linked case records</h4>
                  {selectedCaseId && getCase(selectedCaseId)?.medicalRecords.length ? (
                    <ul>
                      {getCase(selectedCaseId)!.medicalRecords.map((record) => (
                        <li key={record.id}>{record.filename}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No linked case records selected.</p>
                  )}
                  <p className="hc-outcome-meta">
                    Use Back to correct the notes or attachments. Unknown dates and absent reports
                    stay unknown. When you run the review, these notes, document content and{' '}
                    {isIsolated ? 'no background profile context' : 'background profile context'} go
                    to HealthChain’s Gemini service. Saved case text and reviews can sync to your
                    signed-in account; originals are stored on this device.
                  </p>
                </div>
              </section>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  padding: isMobile ? '18px 16px' : '24px 28px',
                  border: '1.5px solid #F4F4F5',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #FFE4E6 0%, #FECDD3 100%)',
                      border: '1px solid #FDA4AF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#E11D48',
                      flexShrink: 0,
                    }}
                  >
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#18181B', margin: 0 }}>
                      Choose where to save and what to focus on
                    </h2>
                    <p style={{ fontSize: '12.5px', color: '#64748B', margin: 0 }}>
                      Choose a case and the kind of explanation that would help you most.
                    </p>
                  </div>
                </div>

                {/* Case Destination Workspace Dock */}
                <div
                  style={{
                    marginBottom: '18px',
                    padding: '16px 18px',
                    background: '#FFFFFF',
                    border: '1.5px solid #E4E4E7',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          background: '#FFF1F2',
                          border: '1px solid #FECDD3',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Folder size={15} color="#E11D48" />
                      </div>
                      <div>
                        <label
                          htmlFor="engine-case-context"
                          style={{
                            fontWeight: 800,
                            fontSize: '13.5px',
                            color: '#18181B',
                            display: 'block',
                          }}
                        >
                          Save to
                        </label>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        color: selectedCaseId ? '#BE123C' : '#64748B',
                        fontWeight: 700,
                      }}
                    >
                      {selectedCaseId ? 'Connected to Case Timeline' : 'New Longitudinal Case'}
                    </span>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <select
                      id="engine-case-context"
                      aria-label="Where should this review be saved?"
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 36px 10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #E4E4E7',
                        background: '#FFFFFF',
                        color: '#18181B',
                        fontSize: '13.5px',
                        fontWeight: 600,
                        appearance: 'none',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#E11D48';
                        e.target.style.boxShadow = '0 0 0 3px rgba(225, 29, 72, 0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#E4E4E7';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <option value="">Start a new case</option>
                      {availableCases
                        .filter((item) => item.status !== 'archived')
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title}
                          </option>
                        ))}
                    </select>
                    <div
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        pointerEvents: 'none',
                        color: '#64748B',
                      }}
                    >
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                    {selectedCaseId ? 'Uses this case’s saved context.' : 'Creates a new case.'}{' '}
                    Starting a review sends the included information to the AI service.
                  </p>
                  {isReadingFiles && (
                    <p
                      role="status"
                      style={{ fontSize: 12, color: '#E11D48', fontWeight: 700, margin: 0 }}
                    >
                      Preparing your documents… Please wait before starting the review.
                    </p>
                  )}
                </div>

                {/* Review Objective Focus */}
                <div style={{ marginBottom: '18px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#BE123C',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    Clinical Objective Focus
                  </span>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                      gap: '10px',
                    }}
                  >
                    {[
                      {
                        id: 'differential',
                        icon: Stethoscope,
                        bg: '#FFF1F2',
                        border: '#FECDD3',
                        activeBorder: '#E11D48',
                        activeBg: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
                        color: '#E11D48',
                        shadow: 'rgba(225, 29, 72, 0.28)',
                        label: 'Explore possible explanations',
                        desc: 'Compare possibilities with the supplied evidence',
                      },
                      {
                        id: 'doctor_prep',
                        icon: ClipboardCheck,
                        bg: '#EEF2FF',
                        border: '#C7D2FE',
                        activeBorder: '#4F46E5',
                        activeBg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                        color: '#4F46E5',
                        shadow: 'rgba(79, 70, 229, 0.28)',
                        label: 'Doctor Visit Prep (SBAR)',
                        desc: 'Prioritize questions and appointment briefing notes',
                      },
                      {
                        id: 'lab_second_opinion',
                        icon: FlaskConical,
                        bg: '#F0FDFA',
                        border: '#99F6E4',
                        activeBorder: '#0D9488',
                        activeBg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                        color: '#0D9488',
                        shadow: 'rgba(13, 148, 136, 0.28)',
                        label: 'Review lab reports',
                        desc: 'Check printed ranges, dates and conflicting entries',
                      },
                    ].map((opt) => {
                      const isSelected = reviewFocus === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            triggerHapticSelection();
                            setReviewFocus(opt.id as any);
                          }}
                          style={{
                            padding: '14px 16px',
                            borderRadius: '16px',
                            textAlign: 'left',
                            border: isSelected
                              ? `1.5px solid ${opt.activeBorder}`
                              : '1px solid #E2E8F0',
                            background: isSelected ? opt.activeBg : '#FFFFFF',
                            boxShadow: isSelected
                              ? `0 4px 14px ${opt.shadow}`
                              : '0 2px 6px rgba(0, 0, 0, 0.02)',
                            cursor: 'pointer',
                            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: isSelected ? '#FFFFFF' : opt.bg,
                                border: isSelected
                                  ? `1.5px solid ${opt.activeBorder}`
                                  : `1px solid ${opt.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: opt.color,
                                flexShrink: 0,
                                boxShadow: isSelected ? `0 2px 8px ${opt.color}25` : 'none',
                                transition: 'all 0.18s ease',
                              }}
                            >
                              <opt.icon size={18} strokeWidth={2.4} />
                            </div>
                            {isSelected && (
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: opt.activeBorder,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#FFFFFF',
                                  flexShrink: 0,
                                  boxShadow: `0 2px 6px ${opt.shadow}`,
                                }}
                              >
                                <Check size={11} strokeWidth={3.5} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: isSelected ? 800 : 700,
                                color: isSelected ? opt.color : '#18181B',
                                letterSpacing: '-0.1px',
                              }}
                            >
                              {opt.label}
                            </div>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                color: isSelected ? opt.color : '#78716C',
                                opacity: isSelected ? 0.9 : 1,
                                marginTop: '3px',
                                lineHeight: 1.35,
                              }}
                            >
                              {opt.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Isolated Investigation Toggle */}
                {profile?.conditions && profile.conditions.length > 0 ? (
                  <div
                    style={{
                      padding: '14px 18px',
                      background: '#FAFAFA',
                      border: '1px solid #E4E4E7',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: '1 1 240px' }}>
                      <div
                        style={{
                          fontSize: '13.5px',
                          fontWeight: 800,
                          color: '#18181B',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <Sliders size={14} color="#E11D48" />
                        <span>Isolated Investigation Mode</span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          marginTop: '2px',
                          lineHeight: 1.4,
                        }}
                      >
                        {isIsolated
                          ? 'Uses your notes, staged files and linked case records. Excludes background profile context.'
                          : 'Includes background profile context alongside your notes and case records. Profile context does not establish a diagnosis.'}
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
                        border: isIsolated ? '1.5px solid #E11D48' : '1px solid #E4E4E7',
                        background: isIsolated ? '#FFF1F2' : '#FFFFFF',
                        color: isIsolated ? '#BE123C' : '#475569',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isIsolated ? '✓ Isolated (On)' : 'Correlate Profile (Default)'}
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '10px 14px',
                      background: '#FAFAFA',
                      border: '1px solid #E4E4E7',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#64748B',
                    }}
                  >
                    <span>
                      No background profile conditions recorded. The review will analyze direct case
                      inputs.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ALWAYS-ON-DISPLAY FLOATING ACTION DOCK (PORTAL TO DOCUMENT.BODY)          */}
      {/* Pinned to viewport bottom across all scroll states on mobile & desktop    */}
      {/* ========================================================================= */}
      {typeof document !== 'undefined' &&
        document.body &&
        createPortal(
          <div
            id="jarvis-always-on-display-dock"
            role="region"
            aria-label="Action Navigation Dock"
            style={{
              position: 'fixed',
              bottom: 'calc(100% - var(--app-viewport-top, 0px) - var(--app-viewport-height))',
              left: 'var(--safe-area-left, 0px)',
              right: 'var(--safe-area-right, 0px)',
              zIndex: 9999,
              background: '#FFFFFF',
              borderTop: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.07), 0 -1px 3px rgba(0, 0, 0, 0.04)',
              padding: isMobile
                ? '12px 16px calc(12px + var(--safe-area-bottom, 0px))'
                : '14px 24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '920px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              {intakeStep === 1 && (
                <>
                  {!isMobile && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div
                        style={{
                          padding: '5px 12px',
                          borderRadius: '999px',
                          background: selectedSymptoms.length > 0 ? '#FFF1F2' : '#F4F4F5',
                          border:
                            selectedSymptoms.length > 0 ? '1px solid #FECDD3' : '1px solid #E4E4E7',
                          color: selectedSymptoms.length > 0 ? '#BE123C' : '#71717A',
                          fontSize: '12px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {selectedSymptoms.length > 0
                          ? `${selectedSymptoms.length} symptom${selectedSymptoms.length === 1 ? '' : 's'} selected`
                          : 'Clinical Intake'}
                      </div>
                      <span
                        style={{
                          fontSize: '13px',
                          color: '#64748B',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        Choose symptoms or proceed directly to clinical timeline
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(2);
                    }}
                    style={{
                      width: isMobile ? '100%' : 'auto',
                      minWidth: isMobile ? '100%' : '260px',
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 24px' : '0 32px',
                      borderRadius: '12px',
                      background: '#E84A6C',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: isMobile ? '15.5px' : '15px',
                      letterSpacing: '-0.2px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(232, 74, 108, 0.22)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    <span>
                      {selectedSymptoms.length > 0
                        ? `Continue with ${selectedSymptoms.length} symptom${selectedSymptoms.length === 1 ? '' : 's'}`
                        : 'Next: Timeline (Step 2)'}
                    </span>
                  </button>
                </>
              )}

              {intakeStep === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(1);
                    }}
                    style={{
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 16px' : '0 20px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ← Back to Symptoms
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(3);
                    }}
                    style={{
                      flex: isMobile ? 1 : 'unset',
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 20px' : '0 26px',
                      borderRadius: '12px',
                      background: '#E84A6C',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: isMobile ? '15px' : '14px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(232, 74, 108, 0.22)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Next: Pattern (Step 3)</span>
                  </button>
                </>
              )}

              {intakeStep === 3 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(2);
                    }}
                    style={{
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 16px' : '0 20px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ← Back to Timeline
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(4);
                    }}
                    style={{
                      flex: isMobile ? 1 : 'unset',
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 20px' : '0 26px',
                      borderRadius: '12px',
                      background: '#E84A6C',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: isMobile ? '15px' : '14px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(232, 74, 108, 0.22)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Next: Tell Your Story (Step 4)</span>
                  </button>
                </>
              )}

              {intakeStep === 4 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(3);
                    }}
                    style={{
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 16px' : '0 20px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ← Back to Pattern
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(5);
                    }}
                    style={{
                      flex: isMobile ? 1 : 'unset',
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 20px' : '0 26px',
                      borderRadius: '12px',
                      background: '#E84A6C',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: isMobile ? '15px' : '14px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(232, 74, 108, 0.22)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Next: Add Evidence (Step 5)</span>
                  </button>
                </>
              )}

              {intakeStep === 5 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(4);
                    }}
                    style={{
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 16px' : '0 20px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ← Back to Story
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(6);
                    }}
                    style={{
                      flex: isMobile ? 1 : 'unset',
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 20px' : '0 26px',
                      borderRadius: '12px',
                      background: '#E84A6C',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: isMobile ? '15px' : '14px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(232, 74, 108, 0.22)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>Next: Scope & Run (Step 6)</span>
                  </button>
                </>
              )}

              {intakeStep === 6 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setIntakeStep(5);
                    }}
                    style={{
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 16px' : '0 20px',
                      borderRadius: '12px',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 700,
                      fontSize: '13.5px',
                      border: '1px solid #E4E4E7',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    ← Back to Evidence
                  </button>

                  <button
                    type="button"
                    onClick={handleRunInvestigation}
                    disabled={!draftReady || isReadingFiles || !hasReviewInput}
                    style={{
                      flex: isMobile ? '1 1 auto' : '0 1 340px',
                      height: isMobile ? '52px' : '50px',
                      padding: isMobile ? '0 20px' : '0 28px',
                      borderRadius: '12px',
                      border: 'none',
                      background: isReadingFiles || !hasReviewInput ? '#E4E4E7' : '#E84A6C',
                      color: isReadingFiles || !hasReviewInput ? '#A1A1AA' : '#FFFFFF',
                      fontSize: isMobile ? '15px' : '15px',
                      fontWeight: 700,
                      cursor: isReadingFiles || !hasReviewInput ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '9px',
                      boxShadow:
                        isReadingFiles || !hasReviewInput
                          ? 'none'
                          : '0 4px 14px rgba(232, 74, 108, 0.22)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Sparkles size={17} />
                    <span>
                      {isReadingFiles ? 'Preparing documents…' : 'Review and save to My Cases'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

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
