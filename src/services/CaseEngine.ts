import { supabase } from './supabaseClient';
import { setItemSync, getItemSync, removeItemSync } from './storage';
import { recordHealthMemory } from './HealthMemory';
import { enqueueSync, flushSyncOutbox } from './SyncOutbox';

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

export interface MedicalRecord {
  id: string;
  filename: string;
  findings: string;
  source: string;
  type: string;
  addedAt: string;
}

export interface ReviewSnapshot {
  id: string;
  type: 'parallel' | 'mdt';
  createdAt: string;
  parentReviewId?: string;
  basedOn: { evidenceIds: string[]; reviewIds: string[] };
  specialists: any[];
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
  mode?: 'multi' | 'mdt';
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
  connectionMap?: any;
  differentialHistory?: { date: string; differentials: Differential[] }[];
  appointmentBriefs?: { current?: AppointmentBrief; history?: AppointmentBrief[] };
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
window.addEventListener('hc_logout', () => {
  cachedCases = null;
});

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

let cachedCases: CaseItem[] | null = [];

export function getCases(): CaseItem[] {
  return cachedCases || [];
}

let syncTimeout: any = null;
let currentCasesKey: string | null = null;

async function save(cases: CaseItem[]) {
  const safeCases = JSON.parse(JSON.stringify(cases));
  
  // Find changed cases by checking updatedAt or lengths
  const changedCases = safeCases.filter((c: any) => {
    if (!cachedCases) return true;
    const old = cachedCases.find(o => o.id === c.id);
    return !old || old.updatedAt !== c.updatedAt || old.events?.length !== c.events?.length;
  });
  
  cachedCases = safeCases;
  window.dispatchEvent(new Event('hc_cases_updated'));

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    const currentProfileId = getActiveProfileId();
    // Queue before attempting network delivery. This keeps the local update
    // recoverable if the app is closed or Supabase is temporarily unavailable.
    for (const c of (changedCases.length > 0 ? changedCases : safeCases)) {
       const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
       if (!isUUID) continue;
       await enqueueSync('case_upsert', session.user.id, {
          id: c.id,
          user_id: session.user.id,
          title: c.title,
          status: c.status,
          specialty: c.currentStage,
          data: { ...c, __profileId: currentProfileId },
          updated_at: new Date(c.updatedAt || new Date()).toISOString()
       });
    }
    await flushSyncOutbox(session.user.id);
    // ensure no big blob in localStorage
    removeItemSync(getCasesKey());
  } else {
    // Guest - cap at 3 cases
    const capped = safeCases.slice(0, 3);
    setItemSync(getCasesKey(), JSON.stringify(capped));
  }
}

export function getActiveCaseId(): string | null {
  const explicitId = getItemSync(getActiveCaseKey());
  const cases = getCases();
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
  if (caseId) setItemSync(getActiveCaseKey(), caseId);
  else removeItemSync(getActiveCaseKey());
  window.dispatchEvent(new Event('hc_active_case_updated'));
}

export function deleteCase(caseId: string) {
  try {
    const queue = JSON.parse(localStorage.getItem('hc_deleted_cases') || '[]');
    if (!queue.includes(caseId)) queue.push(caseId);
    localStorage.setItem('hc_deleted_cases', JSON.stringify(queue));
  } catch(e) {}
  const cases = getCases();
  const updatedCases = cases.filter((c) => c.id !== caseId);
  save(updatedCases);
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (!session?.user) return;
    await enqueueSync('case_delete', session.user.id, { id: caseId });
    await flushSyncOutbox(session.user.id);
  }).catch((error) => window.dispatchEvent(new CustomEvent('hc_sync_error', { detail: error })));
  if (getActiveCaseId() === caseId) {
    setActiveCase(null);
  }
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

export function createCaseDraft({ title, intakeData = {}, specialists = [], mode }: { title?: string, intakeData?: any, specialists?: any[], mode?: 'multi' | 'mdt' }): CaseItem {
  const now = new Date().toISOString();
  const item: CaseItem = {
    id: id(),
    title: title || 'Untitled health case',
    mode,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    intakeData,
    medicalRecords: [],
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
  type: 'parallel' | 'mdt';
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
    status: 'complete'
  };

  const priorActions = existing.actions || [];
  const nextActions = (Array.isArray(report?.recommendedActionPlan) ? report.recommendedActionPlan : []).map((action: any, index: number) => ({
    id: id(),
    ...action,
    status: 'pending' as const,
    order: priorActions.length + index,
  } as CaseAction));

  const updated: CaseItem = {
    ...existing,
    title: updatedTitle,
    currentStage: type === 'parallel' ? 'parallel_complete' : 'mdt_complete',
    currentSummary: report,
    updatedAt: now,
    reviews: [snapshot, ...(existing.reviews || [])].slice(0, 50),
    events: [
      {
        id: id(),
        date: now,
        label: type === 'parallel' ? 'Parallel review complete' : 'Board consensus reached',
        note: 'New specialist findings were added to this active case.',
      },
      ...(existing.events || []),
    ].slice(0, 100),
    actions: [...nextActions, ...priorActions].slice(0, 50),
  };

  save(cases.map((item) => (item.id === caseId ? updated : item)));
  setActiveCase(caseId);
  recordHealthMemory({
    kind: type === 'mdt' ? 'deep_collab' : 'quick_consult',
    source: type === 'mdt' ? 'deep_collab' : 'quick_consult',
    title: type === 'mdt' ? `Collaborative brief: ${updated.title}` : `Quick Consult: ${updated.title}`,
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
      kind: review.type === 'mdt' ? 'deep_collab' : 'quick_consult',
      source: review.type === 'mdt' ? 'deep_collab' : 'quick_consult',
      title: review.type === 'mdt' ? `Collaborative brief: ${caseItem.title}` : `Quick Consult: ${caseItem.title}`,
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
  const evidence: MedicalRecord = {
    id: id(),
    filename,
    findings,
    source,
    type,
    addedAt: new Date().toISOString(),
  };
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
  const { data: { session } } = await supabase.auth.getSession();
  const key = getCasesKey();
  const currentProfileId = getActiveProfileId();
  
  if (session?.user) {
    // Migration: upload existing local cases
    const localRaw = getItemSync(key);
    if (localRaw) {
      try {
        const localCases = JSON.parse(localRaw);
        if (Array.isArray(localCases) && localCases.length > 0) {
          for (const c of localCases) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
            if (!isUUID) continue;
            await supabase.from('cases').upsert({
              id: c.id,
              user_id: session.user.id,
              title: c.title,
              status: c.status,
              specialty: c.currentStage,
              data: { ...c, __profileId: currentProfileId },
              updated_at: new Date(c.updatedAt || new Date()).toISOString()
            });
          }
        }
      } catch (e) {
        console.error('Migration failed', e);
      }
      removeItemSync(key);
    }
    
    // Fetch from Supabase
    const { data, error } = await supabase
       .from('cases')
       .select('data')
       .eq('user_id', session.user.id)
       .order('updated_at', { ascending: false });
       
    if (!error && data) {
       // Filter by profile
       cachedCases = data.map(row => row.data).filter(d => (d.__profileId || 'profile_1') === currentProfileId);
    } else {
       cachedCases = [];
    }
  } else {
    // Guest
    const localRaw = getItemSync(key);
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
    cases[idx].connectionMap = connectionMap;
    cases[idx].updatedAt = new Date().toISOString();
    save(cases);
    window.dispatchEvent(new Event('hc_cases_updated'));
  }
}

export function saveAppointmentBrief(caseId: string, brief: AppointmentBrief) {
  const cases = getCases();
  const c = cases.find(item => item.id === caseId);
  if (!c) return;
  
  if (!c.appointmentBriefs) c.appointmentBriefs = { history: [] };
  if (!c.appointmentBriefs.history) c.appointmentBriefs.history = [];
  
  if (c.appointmentBriefs.current) {
    c.appointmentBriefs.history.push(c.appointmentBriefs.current);
  }
  c.appointmentBriefs.current = brief;
  
  if (!c.events) c.events = [];
  c.events.push({
    id: 'evt_' + Math.random().toString(36).substr(2, 9),
    date: new Date().toISOString(),
    label: 'Appointment brief prepared',
    note: 'Patient generated a structured appointment brief.'
  });
  
  c.updatedAt = new Date().toISOString();
  save(cases);
  return c;
}

export function clearCaseEngineCache() {
  cachedCases = null;
}
