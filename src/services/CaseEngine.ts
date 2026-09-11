import { supabase } from './supabaseClient';
import { setItemSync, getItemSync, removeItemSync } from './storage';
import { recordHealthMemory } from './HealthMemory';
import { enqueueSync, flushSyncOutbox, getPendingSyncCount } from './SyncOutbox';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { ExtractionStatus, InformationAuditEntry } from './ClinicalInformationClassifier';
import { cleanupCaseOriginalFiles, deleteOriginalCaseFile } from './caseRecordFiles';
import { ConflictRecord } from './SyncTypes';
import { mergeCaseItems } from './CaseMergeEngine';
import { recordTombstone, fetchRemoteTombstones } from './TombstoneManager';

export interface CaseUpdate {
  id: string;
  date: string;
  label: string;
  note: string;
}

export interface CaseAction {
  id: string;
  step?: string;
  timeline?: string;
  type?: string;
  status: 'pending' | 'completed';
  order: number;
}

export interface RecordPassage {
  id: string;
  page?: number;
  section?: string;
  text: string;
  highlightCoordinates?: { x: number; y: number; width: number; height: number };
  originalText?: string;
  extractionStatus?: ExtractionStatus;
  auditTrail?: InformationAuditEntry[];
}

export interface MedicalRecord {
  id: string;
  filename: string;
  findings: string;
  source: string;
  type: string;
  addedAt: string;
  passages?: RecordPassage[];
  originalText?: string;
  extractionStatus?: ExtractionStatus;
  auditTrail?: InformationAuditEntry[];
}

export type QuestionLifecycleStatus = 'open' | 'prepared' | 'discussed' | 'resolved' | 'addressed' | 'deferred';

export interface ClinicalQuestion {
  id: string;
  questionText: string;
  raisedBySpecialty: string;
  supportingEvidenceIds: string[];
  status: QuestionLifecycleStatus;
  outcomeNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface SpecialistPerspective {
  id: string;
  specialty: string;
  doctorName: string;
  uniqueContribution: string;
  supportingEvidenceIds: string[];
  remainingQuestions: ClinicalQuestion[];
  dissentingView?: string;
  recommendedActions?: string[];
}

export interface ReviewSnapshot {
  id: string;
  type: 'parallel' | 'mdt' | 'jarvis' | 'lab_report';
  createdAt: string;
  parentReviewId?: string;
  basedOn: { evidenceIds: string[]; reviewIds: string[] };
  specialists: any[];
  perspectives?: SpecialistPerspective[];
  transcripts?: any;
  report: any;
  readiness?: any;
  status: 'complete';
}

export interface Differential {
  id: string;
  condition: string;
  definition?: string;
  probability: number;
  trend: 'up' | 'down' | 'stable';
  supportingEvidence: string[];
  refutingEvidence: string[];
  nextBestTests: string[];
}

export interface CaseItem {
  id: string;
  title: string;
  mode?: 'multi' | 'mdt' | 'jarvis';
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  intakeData: any;
  medicalRecords: MedicalRecord[];
  reviews: ReviewSnapshot[];
  events: CaseUpdate[];
  currentSummary: any;
  currentStage: string;
  actions: CaseAction[];
  differentials?: Differential[];
  questions?: ClinicalQuestion[];
  connectionMap?: any;
  differentialHistory?: { date: string; differentials: Differential[] }[];
  appointmentBriefs?: { current?: AppointmentBrief; history?: AppointmentBrief[] };
  revision?: number;
  deletedAt?: string;
  conflicts?: ConflictRecord[];
}

export interface CasePrepDraft {
  concern: string;
  timeline: string;
  records: string;
  appointment: string;
  goal?: string;
  careSoFar?: string;
  caseId?: string;
  savedAt: string;
}

import { getProfileKey } from './ProfileEngine';

export interface BriefTimelineItem { date: string; event: string; sourceIds: string[]; }
export interface BriefFact { text: string; sourceIds: string[]; }
export interface BriefGap { missingText: string; reason: string; }
export interface BriefQuestion { question: string; sourceIds: string[]; isAI: boolean; }
export interface BriefPerspective { title: string; summary: string; sourceId: string; }
export interface AppointmentBrief {
  schemaVersion: number;
  caseId: string;
  sourceFingerprint: string;
  generatedAt: string;
  purpose: string;
  mainConcern: { text: string; sourceIds: string[] };
  timeline: BriefTimelineItem[];
  knownFacts: BriefFact[];
  missingInformation: BriefGap[];
  questionsForClinician: BriefQuestion[];
  priorPerspectives: BriefPerspective[];
  safetyNotice: string;
  isRefinedByAI: boolean;
}


const getActiveProfileId = () => {
  try {
    const profileData = getItemSync(getProfileKey());
    if (profileData) {
      const parsed = JSON.parse(profileData);
      if (parsed.activeId) return parsed.activeId;
    }
  } catch {}
  return 'profile_1';
};

const getCasesKey = () => {
  const base = getProfileKey().replace('hc_unified_profile', 'hc_cases');
  return `${base}_${getActiveProfileId()}`;
};

const getActiveCaseKey = () => {
  const base = getProfileKey().replace('hc_unified_profile', 'hc_active_case');
  return `${base}_${getActiveProfileId()}`;
};

const getCasePrepDraftKey = () => `${getProfileKey().replace('hc_unified_profile', 'hc_case_prep_draft')}_${getActiveProfileId()}`;

export function getCasePrepDraft(): CasePrepDraft | null {
  try {
    const saved = getItemSync(getCasePrepDraftKey());
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function saveCasePrepDraft(draft: CasePrepDraft) {
  setItemSync(getCasePrepDraftKey(), JSON.stringify({ ...draft, savedAt: new Date().toISOString() }));
}

export function clearCasePrepDraft() {
  removeItemSync(getCasePrepDraftKey());
}

// Listen for logout to clear in-memory caches
if (typeof window !== 'undefined') {
  window.addEventListener('hc_logout', () => {
    cachedCases = null;
    currentCasesKey = null;
  });
}

const id = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

let cachedCases: CaseItem[] | null = null;

export function getCases(): CaseItem[] {
  const key = getCasesKey();
  if (currentCasesKey !== key) {
    cachedCases = null;
    currentCasesKey = key;
  }
  if (cachedCases && cachedCases.length > 0) return cachedCases;
  try {
    const raw = getItemSync(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedCases = parsed;
        return cachedCases;
      }
    }
  } catch {}
  return cachedCases || [];
}

let syncTimeout: any = null;
let currentCasesKey: string | null = null;

function safeIsoDate(val?: string | number | Date | null): string {
  if (!val) return new Date().toISOString();
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function save(cases: CaseItem[]) {
  const storageKey = getCasesKey();
  const profileId = getActiveProfileId();

  // Find changed cases and increment monotonic revision
  const updatedWithRevision = cases.map((c: any) => {
    if (!cachedCases) return { ...c, revision: c.revision || 1 };
    const old = cachedCases.find(o => o.id === c.id);
    const isChanged = !old || old.updatedAt !== c.updatedAt || old.events?.length !== c.events?.length;
    return isChanged ? { ...c, revision: (c.revision || old?.revision || 1) + 1 } : c;
  });

  const safeCases = (typeof structuredClone === 'function') ? structuredClone(updatedWithRevision) : JSON.parse(JSON.stringify(updatedWithRevision));
  // Persist before awaiting authentication/network work: users can reload as
  // soon as the case is visible. Capture the profile scope before any await.
  setItemSync(storageKey, JSON.stringify(safeCases));
  if (typeof indexedDB !== 'undefined') {
    idbSet(storageKey, JSON.stringify(safeCases)).catch(error => {
      window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: error }));
    });
  }
  
  const changedCases = safeCases.filter((c: any) => {
    if (!cachedCases) return true;
    const old = cachedCases.find(o => o.id === c.id);
    return !old || old.updatedAt !== c.updatedAt || old.events?.length !== c.events?.length || old.revision !== c.revision;
  });
  
  cachedCases = safeCases;
  window.dispatchEvent(new Event('hc_cases_updated'));

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (storageKey !== getCasesKey() || profileId !== getActiveProfileId()) return;
    if (session?.user) {
      const currentProfileId = profileId;
      for (const c of (changedCases.length > 0 ? changedCases : safeCases)) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
        if (!isUUID) continue;
        await enqueueSync('case_upsert', session.user.id, {
          id: c.id,
          user_id: session.user.id,
          title: c.title,
          status: c.status,
          specialty: c.currentStage,
          revision: c.revision || 1,
          data: { ...c, __profileId: currentProfileId },
          updated_at: safeIsoDate(c.updatedAt)
        });
      }
      if (storageKey !== getCasesKey() || profileId !== getActiveProfileId()) return;
      await flushSyncOutbox(session.user.id);
    }
  } catch (error) {
    window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: error }));
  }
}

export function getActiveCaseId(): string | null {
  const explicitId = getItemSync(getActiveCaseKey());
  const cases = getCases().filter(c => !c.intakeData?.scenarioId);
  if (explicitId && cases.some(c => c.id === explicitId)) {
    return explicitId;
  }
  if (cases.length > 0) {
    return [...cases].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].id;
  }
  return null;
}

export function getActiveCase(): CaseItem | null {
  const activeId = getActiveCaseId();
  return activeId ? getCase(activeId) || null : null;
}

export function setActiveCase(caseId: string | null) {
  if (caseId && (!getCase(caseId) || getCase(caseId)?.intakeData?.scenarioId)) return;
  if (caseId) setItemSync(getActiveCaseKey(), caseId);
  else removeItemSync(getActiveCaseKey());
  window.dispatchEvent(new Event('hc_active_case_updated'));
}

export function deleteCase(caseId: string) {
  const cases = getCases();
  const deletedCase = cases.find((item) => item.id === caseId);
  const updatedCases = cases.filter((c) => c.id !== caseId);
  save(updatedCases);
  cleanupCaseOriginalFiles(caseId).catch(() => {});

  const now = new Date().toISOString();
  const profileId = getActiveProfileId();

  supabase.auth.getSession().then(async ({ data: { session } }) => {
    const userId = session?.user?.id || 'guest';
    await recordTombstone({
      id: caseId,
      entityType: 'case',
      deletedAt: deletedCase?.updatedAt || now,
      userId,
      profileId,
    });

    if (!session?.user) return;
    await enqueueSync('case_delete', session.user.id, {
      id: caseId,
      profile_id: profileId,
      updated_at: deletedCase?.updatedAt || now,
    });
    await flushSyncOutbox(session.user.id);
  }).catch((error) => window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: error })));
  if (getActiveCaseId() === caseId) {
    setActiveCase(null);
  }
}

export function deleteCaseRecord(caseId: string, recordId: string): CaseItem | null {
  const cases = getCases();
  const existing = cases.find((c) => c.id === caseId);
  if (!existing) return null;

  deleteOriginalCaseFile(caseId, recordId).catch(() => {});

  const now = new Date().toISOString();
  const updatedRecords = (existing.medicalRecords || []).filter((r) => r.id !== recordId);
  const updatedCase: CaseItem = {
    ...existing,
    medicalRecords: updatedRecords,
    updatedAt: now,
    events: [
      {
        id: id(),
        date: now,
        label: 'Record removed',
        note: 'A medical record and its device attachments were removed from this case.',
      },
      ...(existing.events || []),
    ].slice(0, 100),
  };

  save(cases.map((c) => c.id === caseId ? updatedCase : c));
  return updatedCase;
}

export function updateExtractedFindingCorrection(
  caseId: string,
  recordId: string,
  findingId: string,
  correction: string | {
    correctedText: string;
    biomarker?: string;
    value?: string;
    unit?: string;
    standardRange?: string;
    note?: string;
  }
): CaseItem | null {
  const cases = getCases();
  const existing = cases.find((c) => c.id === caseId);
  if (!existing) return null;

  const normCorrection = typeof correction === 'string' ? { correctedText: correction } : correction;
  const now = new Date().toISOString();
  let found = false;

  const updatedRecords = (existing.medicalRecords || []).map((record) => {
    if (record.id !== recordId && record.filename !== recordId) return record;

    let updatedPassages = record.passages;
    if (record.passages && record.passages.length > 0) {
      updatedPassages = record.passages.map((p) => {
        if (p.id === findingId) {
          found = true;
          const audit: InformationAuditEntry = {
            originalText: p.text,
            correctedText: normCorrection.correctedText,
            correctedAt: now,
            correctedBy: 'user',
          };
          return {
            ...p,
            text: normCorrection.correctedText,
            originalText: (p as any).originalText || p.text,
            extractionStatus: 'user_corrected' as const,
            auditTrail: [...((p as any).auditTrail || []), audit],
          };
        }
        return p;
      });
    }

    let updatedFindings = record.findings;
    let recordAuditTrail = (record as any).auditTrail || [];
    let recordOriginalText = (record as any).originalText || record.findings;

    if (!found && (record.id === findingId || findingId.startsWith('record_') || findingId === record.filename)) {
      found = true;
      const audit: InformationAuditEntry = {
        originalText: record.findings,
        correctedText: normCorrection.correctedText,
        correctedAt: now,
        correctedBy: 'user',
      };
      recordAuditTrail = [...recordAuditTrail, audit];
      updatedFindings = normCorrection.correctedText;
    }

    return {
      ...record,
      findings: updatedFindings,
      passages: updatedPassages,
      originalText: recordOriginalText,
      extractionStatus: 'user_corrected' as const,
      auditTrail: recordAuditTrail,
    };
  });

  const updatedCase: CaseItem = {
    ...existing,
    medicalRecords: updatedRecords,
    updatedAt: now,
    events: [
      {
        id: id(),
        date: now,
        label: 'Observation corrected',
        note: normCorrection.note ? `Extracted wording corrected by user: "${normCorrection.note}"` : 'Extracted wording corrected by user.',
      },
      ...(existing.events || []),
    ].slice(0, 100),
  };

  save(cases.map((c) => c.id === caseId ? updatedCase : c));
  return updatedCase;
}

export function resolveCase(caseId: string) {
  const cases = getCases();
  const updatedCases = cases.map((c) => 
    c.id === caseId 
      ? { ...c, status: 'archived' as const, updatedAt: new Date().toISOString() } 
      : c
  );
  save(updatedCases);
  if (getActiveCaseId() === caseId) {
    setActiveCase(null);
  }
}

export function createCaseDraft({ title, intakeData = {}, specialists = [], mode, medicalRecords = [] }: { title?: string, intakeData?: any, specialists?: any[], mode?: 'multi' | 'mdt' | 'jarvis', medicalRecords?: MedicalRecord[] }): CaseItem {
  const now = new Date().toISOString();
  const item: CaseItem = {
    id: id(),
    title: title || 'Untitled health case',
    mode,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    revision: 1,
    intakeData,
    medicalRecords: (medicalRecords || []).map(ensureRecordPassages),
    reviews: [],
    events: [
      {
        id: id(),
        date: now,
        label: 'Case created',
        note: 'Your case file is open. Specialist perspectives and new evidence will stay connected here.',
      },
    ],
    currentSummary: {},
    currentStage: 'gathering_evidence',
    actions: [],
  };
  save([item, ...getCases()]);
  setActiveCase(item.id);
  return item;
}

export function saveCasePrepCase({ caseId, concern, timeline, records, appointment, goal, careSoFar }: Omit<CasePrepDraft, 'savedAt'>): CaseItem {
  const now = new Date().toISOString();
  const intakeData = {
    chiefComplaint: concern.trim(),
    history: timeline.trim(),
    appointmentDate: appointment || null,
    appointmentGoal: goal?.trim() || '',
    careSoFar: careSoFar?.trim() || '',
  };
  const notes = records.split('\n').map((note) => note.trim()).filter(Boolean).map((findings, index) => ({
    id: id(), filename: `Case note ${index + 1}`, findings, source: 'case_prep', type: 'patient_note', addedAt: now,
  }));
  const existing = caseId ? getCase(caseId) : undefined;
  if (!existing) {
    const created = createCaseDraft({ title: concern.trim().slice(0, 58), intakeData });
    const updated = { ...created, medicalRecords: notes, updatedAt: now, currentStage: 'case_prep_ready', events: [{ id: id(), date: now, label: 'Case brief prepared', note: 'Your appointment-prep brief was saved.' }, ...created.events] } as CaseItem;
    save(getCases().map((item) => item.id === created.id ? updated : item));
    recordHealthMemory({ kind: 'case_prep', source: 'case_prep', title: `Case Prep: ${updated.title}`, occurredAt: now, caseId: updated.id, payload: intakeData, dedupeKey: `case-prep:${updated.id}` });
    return updated;
  }
  const updated: CaseItem = {
    ...existing,
    title: concern.trim().slice(0, 58) || existing.title,
    intakeData,
    medicalRecords: [...(existing.medicalRecords || []).filter((record) => record.source !== 'case_prep'), ...notes],
    updatedAt: now,
    currentStage: 'case_prep_ready',
    events: [{ id: id(), date: now, label: 'Case brief updated', note: 'Your appointment-prep brief was updated.' }, ...(existing.events || [])].slice(0, 100),
  };
  save(getCases().map((item) => item.id === existing.id ? updated : item));
  setActiveCase(existing.id);
  recordHealthMemory({ kind: 'case_prep', source: 'case_prep', title: `Case Prep: ${updated.title}`, occurredAt: now, caseId: updated.id, payload: intakeData, dedupeKey: `case-prep:${updated.id}` });
  return updated;
}

export function saveReviewSnapshot({
  caseId,
  type,
  parentReviewId,
  basedOnEvidenceIds = [],
  basedOnReviewIds = [],
  specialists = [],
  transcripts,
  report,
  readiness,
}: {
  caseId: string;
  type: 'parallel' | 'mdt' | 'jarvis' | 'lab_report';
  parentReviewId?: string;
  basedOnEvidenceIds?: string[];
  basedOnReviewIds?: string[];
  specialists?: any[];
  transcripts?: any;
  report: any;
  readiness?: any;
}): CaseItem {
  const cases = getCases();
  const existing = cases.find((item) => item.id === caseId);
  if (!existing) throw new Error("Case not found");

  const now = new Date().toISOString();
  let updatedTitle = existing.title;
  const primaryCondition = report?.topDiagnoses?.[0]?.condition;
  if (primaryCondition) {
    if (existing.title.startsWith('Quick Consult:') || existing.title.endsWith('...')) {
      updatedTitle = `${primaryCondition} Investigation`;
    }
  }

  // Fulfill Promise 1 & 2: Synthesize or preserve multi-perspective specialist cards and stable clinical question IDs
  const rawPerspectives: SpecialistPerspective[] = report?.groundingVersion === 1 && Array.isArray(report.perspectives)
    ? report.perspectives.map((p: any) => ({
      id: p.id, specialty: p.specialty, doctorName: p.doctorName,
      uniqueContribution: p.interpretation || p.uniqueContribution || '',
      supportingEvidenceIds: p.evidenceConsidered || p.supportingEvidenceIds || [],
      remainingQuestions: p.missingInformation || [],
    })) : [];

  const snapshot: ReviewSnapshot = {
    id: id(),
    type,
    createdAt: now,
    parentReviewId,
    basedOn: { evidenceIds: basedOnEvidenceIds, reviewIds: basedOnReviewIds },
    specialists,
    transcripts,
    report,
    readiness,
    status: 'complete',
    perspectives: rawPerspectives,
  };

  // Fulfill Promise 2: Extract stable ClinicalQuestion items so Engine, Case Prep, and Canvas share IDs
  const rawQuestions: any[] = [
    ...(Array.isArray(report?.questionsForClinician) ? report.questionsForClinician : []),
    ...(Array.isArray(report?.unansweredQuestions) ? report.unansweredQuestions : []),
    ...(Array.isArray(report?.questions) ? report.questions : []),
  ];
  const existingQuestions = existing.questions || [];
  const existingTexts = new Set(existingQuestions.map(q => q.questionText.trim().toLowerCase()));
  const newQuestions: ClinicalQuestion[] = [];
  for (const raw of rawQuestions) {
    const questionText = (typeof raw === 'string' ? raw : raw?.questionText || raw?.question || '').trim();
    const key = questionText.toLowerCase();
    if (!questionText || existingTexts.has(key)) continue;
    existingTexts.add(key);
    newQuestions.push({
      id: typeof raw === 'object' && raw?.id ? raw.id : id(), questionText, raisedBySpecialty: raw?.raisedBySpecialty || specialists?.[0] || 'AI review',
      supportingEvidenceIds: raw?.supportingEvidenceIds || basedOnEvidenceIds || [], status: 'open', createdAt: now,
    });
  }
  const unifiedQuestions: ClinicalQuestion[] = [...existingQuestions, ...newQuestions];

  const priorActions = existing.actions || [];
  const rawActions = Array.isArray(report?.recommendedActionPlan) && report.recommendedActionPlan.length > 0
    ? report.recommendedActionPlan
    : Array.isArray(report?.doctorActionPlan?.confirmatoryTests)
      ? report.doctorActionPlan.confirmatoryTests.map((t: any) => ({
          title: typeof t === 'string' ? t : `Request ${t.test || 'Test'}`,
          description: typeof t === 'string' ? '' : t.rationale || '',
          category: 'diagnostic',
          priority: typeof t === 'string' ? 'high' : (t.priority?.toLowerCase() || 'high')
        }))
      : [];
  const nextActions = rawActions.map((action: any, index: number) => ({
    id: id(),
    ...action,
    status: 'pending' as const,
    order: priorActions.length + index,
  } as CaseAction));

  const updated: CaseItem = {
    ...existing,
    title: updatedTitle,
    currentStage: type === 'parallel' ? 'parallel_complete' : type === 'jarvis' ? 'jarvis_complete' : 'mdt_complete',
    currentSummary: report,
    updatedAt: now,
    reviews: [snapshot, ...(existing.reviews || [])].slice(0, 50),
    events: [
      {
        id: id(),
        date: now,
        label: type === 'jarvis' ? 'Clinical Data Engine Analysis complete' : type === 'parallel' ? 'Parallel review complete' : 'Board consensus reached',
        note: 'New specialist findings were added to this active case.',
      },
      ...(existing.events || []),
    ].slice(0, 100),
    actions: [...nextActions, ...priorActions].slice(0, 50),
    differentials: (Array.isArray(report?.topDiagnoses) && report.topDiagnoses.length > 0)
      ? report.topDiagnoses.map((d: any, idx: number) => ({
          id: `diff-${idx}-${Date.now()}`,
          condition: typeof d === 'string' ? d : d.condition || 'Clinical Finding',
          probability: typeof d.confidence === 'number' ? d.confidence : parseInt(d.confidence) || 75,
          trend: 'stable' as const,
          supportingEvidence: d.rationale ? [d.rationale] : [],
          refutingEvidence: [],
          nextBestTests: (report?.doctorActionPlan?.confirmatoryTests || []).map((t: any) => typeof t === 'string' ? t : t.test || '')
        }))
      : existing.differentials,
    questions: unifiedQuestions,
  };

  save(cases.map((item) => (item.id === caseId ? updated : item)));
  setActiveCase(caseId);
  recordHealthMemory({
    kind: type === 'mdt' ? 'deep_collab' : type === 'jarvis' ? 'research' : 'quick_consult',
    source: type === 'mdt' ? 'deep_collab' : type === 'jarvis' ? 'jarvis' : 'quick_consult',
    title: type === 'mdt' ? `Collaborative brief: ${updated.title}` : type === 'jarvis' ? `Clinical Data Engine: ${updated.title}` : `Quick Consult: ${updated.title}`,
    occurredAt: now,
    caseId,
    // The complete transcript remains in the case. Health Memory keeps the concise result users need over years.
    payload: { report, readiness, specialists, basedOnEvidenceIds, basedOnReviewIds, reviewId: snapshot.id },
    dedupeKey: `review:${snapshot.id}`,
  });
  return updated;
}

export function backfillCaseHealthMemory() {
  getCases().forEach((caseItem) => {
    if (caseItem.currentStage === 'case_prep_ready') {
      recordHealthMemory({ kind: 'case_prep', source: 'case_prep', title: `Case Prep: ${caseItem.title}`, occurredAt: caseItem.updatedAt, caseId: caseItem.id, payload: caseItem.intakeData || {}, dedupeKey: `case-prep:${caseItem.id}` });
    }
    (caseItem.reviews || []).forEach((review) => recordHealthMemory({
      id: review.id,
      kind: review.type === 'mdt' ? 'deep_collab' : review.type === 'jarvis' ? 'research' : 'quick_consult',
      source: review.type === 'mdt' ? 'deep_collab' : review.type === 'jarvis' ? 'jarvis' : 'quick_consult',
      title: review.type === 'mdt' ? `Collaborative brief: ${caseItem.title}` : review.type === 'jarvis' ? `Clinical Data Engine: ${caseItem.title}` : `Quick Consult: ${caseItem.title}`,
      occurredAt: review.createdAt,
      caseId: caseItem.id,
      payload: { report: review.report, readiness: review.readiness, specialists: review.specialists, reviewId: review.id },
      dedupeKey: `review:${review.id}`,
    }));
  });
}

export function addCaseEvent(caseId: string, note: string, label: string = 'Evidence update', currentSummary?: any) {
  const cases = getCases().map((item) =>
    item.id !== caseId
      ? item
      : {
          ...item,
          currentSummary: currentSummary || item.currentSummary,
          updatedAt: new Date().toISOString(),
          events: [
            { id: id(), date: new Date().toISOString(), label, note },
            ...item.events,
          ].slice(0, 100),
        }
  );
  save(cases);
}

export function toggleCaseAction(caseId: string, actionId: string) {
  const cases = getCases().map((item) =>
    item.id !== caseId
      ? item
      : {
          ...item,
          updatedAt: new Date().toISOString(),
          actions: item.actions.map((action) =>
            action.id === actionId
              ? { ...action, status: (action.status === 'completed' ? 'pending' : 'completed') as 'pending' | 'completed' }
              : action
          ),
        }
  );
  save(cases);
}

export function getCase(caseId: string): CaseItem | undefined {
  return getCases().find((item) => item.id === caseId);
}

export function addEvidenceToActiveCase({
  filename,
  findings,
  source = 'healthchain',
  type = 'report',
}: {
  filename: string;
  findings: string;
  source?: string;
  type?: string;
}): MedicalRecord | null {
  const activeCaseId = getActiveCaseId();
  if (!activeCaseId) return null;
  const evidence: MedicalRecord = ensureRecordPassages({
    id: id(),
    filename,
    findings,
    source,
    type,
    addedAt: new Date().toISOString(),
  });
  const cases = getCases().map((item) =>
    item.id !== activeCaseId
      ? item
      : {
          ...item,
          updatedAt: new Date().toISOString(),
          medicalRecords: [evidence, ...(item.medicalRecords || [])].slice(0, 50),
          events: [
            {
              id: id(),
              date: new Date().toISOString(),
              label: 'New evidence added',
              note: `${filename} was added to this case.`,
            },
            ...(item.events || []),
          ].slice(0, 100),
        }
  );
  save(cases);
  window.dispatchEvent(new Event('hc_active_case_updated'));
  return evidence;
}

export function updateCaseDifferentials(caseId: string, differentials: Differential[]) {
  const cases = getCases().map((item) => {
    if (item.id !== caseId) return item;
    
    const prevDifferentials = item.differentials || [];
    const historyEntry = { date: new Date().toISOString(), differentials: prevDifferentials };
    const newHistory = [historyEntry, ...(item.differentialHistory || [])].slice(0, 20);

    // Mathematically calculate trend based on previous probabilities
    const updatedDifferentials = differentials.map(ddx => {
      const prev = prevDifferentials.find(p => p.condition.toLowerCase() === ddx.condition.toLowerCase());
      let trend: 'up' | 'down' | 'stable' = 'stable';
      if (prev) {
        if (ddx.probability > prev.probability) trend = 'up';
        else if (ddx.probability < prev.probability) trend = 'down';
      }
      return { ...ddx, trend };
    });

    return {
      ...item,
      updatedAt: new Date().toISOString(),
      differentials: updatedDifferentials,
      differentialHistory: newHistory,
      events: [
        {
          id: id(),
          date: new Date().toISOString(),
          label: 'DDx Updated',
          note: `The AI generated ${updatedDifferentials.length} active differential hypotheses.`,
        },
        ...(item.events || []),
      ].slice(0, 100),
    };
  });
  save(cases);
  if (getActiveCaseId() === caseId) {
    window.dispatchEvent(new Event('hc_active_case_updated'));
  }
}

export async function initCaseEngine() {
  const requestedKey = getCasesKey();
  const { data: { session } } = await supabase.auth.getSession();
  if (getCasesKey() !== requestedKey) return;
  const key = getCasesKey();
  const currentProfileId = getActiveProfileId();
  if (currentCasesKey !== key) {
    cachedCases = null;
    currentCasesKey = key;
  }
  
  if (session?.user) {
    // 1. Fetch remote tombstones first so deleted cases are not resurrected
    const tombstones = await fetchRemoteTombstones(session.user.id, currentProfileId);
    if (getCasesKey() !== key) return;

    // Deliver queued writes before reading the remote snapshot so a device
    // switch does not briefly load an older case file over newer offline work.
    await flushSyncOutbox(session.user.id);
    if (getCasesKey() !== key) return;

    // Migration: upload existing local cases
    const indexedSnapshot = await idbGet(key) as string;
    if (getCasesKey() !== key) return;
    let localRaw = getItemSync(key) || indexedSnapshot;
    const initialMirror = getItemSync(key);
    if (localRaw) {
      try {
        const localCases = JSON.parse(localRaw);
        if (Array.isArray(localCases) && localCases.length > 0) {
          const eligibleCases: CaseItem[] = [];
          for (const c of localCases) {
            if (getCasesKey() !== key) return;
            const tomb = tombstones.find(t => t.id === c.id);
            if (tomb && new Date(tomb.deletedAt).getTime() >= new Date(c.updatedAt).getTime()) {
              // Deleted on another device: do not upload
              continue;
            }
            eligibleCases.push(c);
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
            if (!isUUID) continue;
            await enqueueSync('case_upsert', session.user.id, {
              id: c.id,
              user_id: session.user.id,
              title: c.title,
              status: c.status,
              specialty: c.currentStage,
              revision: c.revision || 1,
              data: { ...c, __profileId: currentProfileId },
              updated_at: safeIsoDate(c.updatedAt)
            });
          }
          if (eligibleCases.length !== localCases.length) {
            idbSet(key, JSON.stringify(eligibleCases)).catch(() => {});
            setItemSync(key, JSON.stringify(eligibleCases));
          }
          await flushSyncOutbox(session.user.id);
        }
      } catch (e) {
        console.error('Migration failed', e);
      }
    }
    
    // Fetch in bounded pages. Case data contains structured review history and
    // can grow substantially for long-running cases; one unbounded response
    // would make reinstall/device recovery fragile.
    const pageSize = 100;
    const data: { data: any }[] = [];
    let error: any = null;
    let page = 0;
    while (true) {
      if (getCasesKey() !== key) return;
      const result = await supabase
        .from('cases')
        .select('data')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);
      if (result.error) {
        error = result.error;
        break;
      }
      data.push(...(result.data || []));
      if (!result.data || result.data.length < pageSize) break;
      page += 1;
    }
       
    if (getCasesKey() !== key) return;
    if (getItemSync(key) !== initialMirror) {
      // A local edit occurred during the request. Its queued write will sync;
      // never replace it with a snapshot fetched before that edit completed.
      window.dispatchEvent(new Event('hc_cases_updated'));
      return;
    }
    if (!error && data && await getPendingSyncCount(session.user.id) === 0) {
       if (getCasesKey() !== key || getItemSync(key) !== initialMirror) return;
       // Filter remote cases by profile and active tombstones
       const remoteCases = data
         .map(row => row.data)
         .filter(d => (d.__profileId || 'profile_1') === currentProfileId && !tombstones.some(t => t.id === d.id));

       // Merge remote cases with existing local cases by stable ID
       const existingLocal = getCases().filter(c => !tombstones.some(t => t.id === c.id));
       const localMap = new Map<string, CaseItem>();
       for (const lc of existingLocal) localMap.set(lc.id, lc);

       const mergedList: CaseItem[] = [];
       for (const rc of remoteCases) {
         const lc = localMap.get(rc.id);
         if (lc) {
           const mergeRes = mergeCaseItems(lc, rc);
           mergedList.push(mergeRes.merged);
           localMap.delete(rc.id);
         } else {
           mergedList.push(rc);
         }
       }
       for (const remainingLocal of localMap.values()) {
         mergedList.push(remainingLocal);
       }

       cachedCases = mergedList;
       idbSet(key, JSON.stringify(cachedCases)).catch(() => {});
       setItemSync(key, JSON.stringify(cachedCases));
    } else if (localRaw) {
       // A transient remote read failure must never erase the last known case
       // list from the current device.
       try {
         const localCases = JSON.parse(localRaw);
         cachedCases = Array.isArray(localCases) ? localCases : [];
       } catch {
         cachedCases = cachedCases || [];
       }
    } else {
       cachedCases = cachedCases || [];
    }
  } else {
    // Guest
    const indexedSnapshot = await idbGet(key) as string;
    if (getCasesKey() !== key) return;
    // A review may have been saved while IndexedDB was loading. The synchronous
    // mirror contains that latest write; do not replace it with an older read.
    const localRaw = getItemSync(key) || indexedSnapshot;
    try {
      cachedCases = JSON.parse(localRaw || '[]');
    } catch {
      cachedCases = [];
    }
  }
  
  window.dispatchEvent(new Event('hc_cases_updated'));
}

export async function fetchCaseFromCloud(caseId: string): Promise<CaseItem | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data, error } = await supabase.from('cases').select('data').eq('id', caseId).eq('user_id', session.user.id).single();
  if (error || !data) return null;
  return data.data as CaseItem;
}

export function updateCaseConnectionMap(caseId: string, connectionMap: any) {
  const cases = getCases();
  const idx = cases.findIndex(c => c.id === caseId);
  if (idx !== -1) {
    const updated = {
      ...cases[idx],
      connectionMap,
      updatedAt: new Date().toISOString(),
    };
    save(cases.map((item, index) => index === idx ? updated : item));
    window.dispatchEvent(new Event('hc_cases_updated'));
  }
}

export function saveAppointmentBrief(caseId: string, brief: AppointmentBrief) {
  const cases = getCases();
  const index = cases.findIndex(item => item.id === caseId);
  if (index === -1) return;

  const existing = cases[index];
  const now = new Date().toISOString();
  const priorHistory = existing.appointmentBriefs?.history || [];
  const history = existing.appointmentBriefs?.current
    ? [existing.appointmentBriefs.current, ...priorHistory].slice(0, 20)
    : priorHistory.slice(0, 20);
  const updated: CaseItem = {
    ...existing,
    appointmentBriefs: { current: brief, history },
    events: [{
      id: id(),
      date: now,
      label: 'Appointment brief prepared',
      note: 'Patient generated a structured appointment brief.'
    }, ...(existing.events || [])].slice(0, 100),
    updatedAt: now,
  };
  save(cases.map((item, itemIndex) => itemIndex === index ? updated : item));
  return updated;
}

export function ensureRecordPassages(record: MedicalRecord): MedicalRecord {
  if (record.passages?.length) return record;
  // Legacy findings are a stored summary, not an original page transcription.
  return {
    ...record,
    passages: record.findings?.trim() ? [{
      id: 'summary_' + record.id,
      section: 'Stored summary (original page not available)',
      text: record.findings,
      originalText: record.originalText || record.findings,
      extractionStatus: record.extractionStatus || 'provisional',
      auditTrail: record.auditTrail || [],
    }] : []
  };
}

export function getRecordPassage(caseId: string, recordId: string, passageId?: string): { record: MedicalRecord; passage?: RecordPassage } | null {
  const caseItem = getCase(caseId);
  if (!caseItem) return null;
  const record = caseItem.medicalRecords?.find(r => r.id === recordId || r.filename === recordId);
  if (!record) return null;
  const enriched = ensureRecordPassages(record);
  const passage = passageId ? enriched.passages?.find(p => p.id === passageId || false) : enriched.passages?.[0];
  return { record: enriched, passage };
}

export function getCaseQuestions(caseId: string): ClinicalQuestion[] {
  const caseItem = getCase(caseId);
  if (!caseItem) return [];
  const explicit = caseItem.questions || [];
  if (explicit.length > 0) return explicit;

  const harvested: ClinicalQuestion[] = [];
  caseItem.reviews?.forEach(r => {
    r.perspectives?.forEach(p => {
      p.remainingQuestions?.forEach(q => {
        if (!harvested.some(h => h.id === q.id || h.questionText === q.questionText)) {
          harvested.push(q);
        }
      });
    });
  });
  return harvested;
}

export function addCaseQuestion(caseId: string, question: Omit<ClinicalQuestion, 'id' | 'createdAt' | 'status'> & { status?: QuestionLifecycleStatus }): ClinicalQuestion {
  const cases = getCases();
  const idx = cases.findIndex(c => c.id === caseId);
  const newQ: ClinicalQuestion = {
    ...question,
    id: `q_${id()}`,
    createdAt: new Date().toISOString(),
    status: question.status || 'open',
  };
  if (idx !== -1) {
    const existing = cases[idx];
    const questions = [...(existing.questions || []), newQ];
    const updated: CaseItem = {
      ...existing,
      questions,
      updatedAt: new Date().toISOString(),
    };
    save(cases.map((c, i) => i === idx ? updated : c));
    window.dispatchEvent(new Event('hc_cases_updated'));
  }
  return newQ;
}

export function transitionCaseQuestionLifecycle(
  caseId: string,
  questionId: string,
  nextStatus: QuestionLifecycleStatus,
  note?: string
): boolean {
  const cases = getCases();
  const idx = cases.findIndex(c => c.id === caseId);
  if (idx === -1) return false;
  const existing = cases[idx];
  const now = new Date().toISOString();
  let found = false;
  let targetQuestionText = '';

  const questions = (existing.questions || []).map(q => {
    if (q.id === questionId) {
      found = true;
      targetQuestionText = q.questionText;
      return {
        ...q,
        status: nextStatus,
        outcomeNote: note || q.outcomeNote,
        resolvedAt: nextStatus === 'resolved' || nextStatus === 'addressed' ? now : q.resolvedAt,
      };
    }
    return q;
  });

  if (!found) return false;

  const eventLabel = (nextStatus === 'resolved' || nextStatus === 'addressed')
    ? 'Physician Question Resolved'
    : `Question: ${nextStatus.toUpperCase()}`;

  const eventUpdate: CaseUpdate = {
    id: id(),
    date: now,
    label: eventLabel,
    note: note ? `"${targetQuestionText}": ${note}` : `"${targetQuestionText}" → ${nextStatus}`,
  };

  const updated: CaseItem = {
    ...existing,
    questions,
    events: [eventUpdate, ...(existing.events || [])].slice(0, 100),
    updatedAt: now,
  };

  save(cases.map((c, i) => i === idx ? updated : c));
  window.dispatchEvent(new Event('hc_cases_updated'));
  return true;
}

export function updateCaseQuestionOutcome(
  caseId: string,
  questionId: string,
  status: 'addressed' | 'deferred',
  outcomeNote: string
): boolean {
  return transitionCaseQuestionLifecycle(caseId, questionId, status, outcomeNote);
}

export function clearCaseEngineCache() {
  cachedCases = null;
}


/** Attach records to an explicit case, never whichever case became active later. */
export function appendCaseRecords(caseId:string, records:MedicalRecord[]):void {
  const cases=getCases(),target=cases.find(c=>c.id===caseId);
  if(!target || target.intakeData?.scenarioId) throw new Error('Case unavailable.');
  const existing=new Set((target.medicalRecords || []).map(r=>r.id));
  const additions=records.filter(r=>!existing.has(r.id)).map(ensureRecordPassages);
  save(cases.map(c=>c.id===caseId?{...c,medicalRecords:[...additions,...c.medicalRecords],updatedAt:new Date().toISOString()}:c));
}

if (typeof window !== 'undefined') {
  window.addEventListener('hc_case_merged', ((e: CustomEvent) => {
    const mergedCase = e.detail?.case as CaseItem;
    if (!mergedCase?.id) return;
    const current = getCases();
    const idx = current.findIndex(c => c.id === mergedCase.id);
    if (idx >= 0) {
      current[idx] = mergedCase;
      const key = getCasesKey();
      idbSet(key, JSON.stringify(current)).catch(() => {});
      setItemSync(key, JSON.stringify(current));
      cachedCases = current;
      window.dispatchEvent(new Event('hc_cases_updated'));
    }
  }) as EventListener);
}
