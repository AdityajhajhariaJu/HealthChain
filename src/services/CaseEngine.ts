import { supabase } from './supabaseClient';
import { setItemSync, getItemSync, removeItemSync } from './storage';

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
  probability: number;
  trend: 'up' | 'down' | 'stable';
  supportingEvidence: string[];
  refutingEvidence: string[];
  nextBestTests: string[];
}

export interface CaseItem {
  id: string;
  title: string;
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
  differentialHistory?: { date: string; differentials: Differential[] }[];
}

const getActiveProfileId = () => {
  try {
    const profileData = getItemSync('hc_unified_profile');
    if (profileData) {
      const parsed = JSON.parse(profileData);
      if (parsed.activeId) return parsed.activeId;
    }
  } catch {}
  return 'profile_1';
};

const getCasesKey = () => `hc_cases_${getActiveProfileId()}`;
const getActiveCaseKey = () => `hc_active_case_${getActiveProfileId()}`;

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
  if (cachedCases) return cachedCases;
  try {
    const key = getCasesKey();
    let casesData = getItemSync(key);
    
    // Migration: If profile_1 cases are empty, try loading legacy global cases
    if (!casesData && key === 'hc_cases_profile_1') {
      const legacyCases = getItemSync('hc_cases');
      if (legacyCases) {
        casesData = legacyCases;
        setItemSync(key, legacyCases);
      }
    }

    let cases = JSON.parse(casesData || '[]');
    
    // Migration: Migrate legacy hc_history into cases if needed.
    const history = getItemSync('hc_history');
    if (history) {
      try {
        const legacyHistory = JSON.parse(history);
        if (legacyHistory.length > 0) {
          legacyHistory.forEach((legacyItem: any) => {
             const migratedCase: CaseItem = {
               id: legacyItem.id || id(),
               title: legacyItem.title || 'Migrated Case',
               status: 'active',
               createdAt: legacyItem.date ? new Date(legacyItem.date).toISOString() : new Date().toISOString(),
               updatedAt: new Date().toISOString(),
               intakeData: {},
               medicalRecords: [],
               reviews: [
                 {
                   id: id(),
                   type: legacyItem.type === 'mdt' ? 'mdt' : 'parallel',
                   createdAt: legacyItem.date ? new Date(legacyItem.date).toISOString() : new Date().toISOString(),
                   basedOn: { evidenceIds: [], reviewIds: [] },
                   specialists: [],
                   report: legacyItem.analysis || legacyItem.report || {},
                   status: 'complete',
                 }
               ],
               events: [
                 {
                   id: id(),
                   date: new Date().toISOString(),
                   label: 'Case Migrated',
                   note: 'This case was migrated from previous standalone history.',
                 }
               ],
               currentSummary: legacyItem.analysis || legacyItem.report || {},
               currentStage: legacyItem.type === 'mdt' ? 'mdt_complete' : 'parallel_complete',
               actions: [],
             };
             if (!cases.find((c: any) => c.id === migratedCase.id)) {
                cases.push(migratedCase);
             }
          });
          removeItemSync('hc_history');
          save(cases);
        }
      } catch (e) {}
    }

    // Migration for older hc_cases that don't match the new CaseItem signature
    cases = cases.filter(Boolean).map((c: any) => {
       if (c.reviewHistory || !c.reviews) {
          const reviews: ReviewSnapshot[] = (c.reviewHistory || []).map((r: any) => ({
             id: r.id || id(),
             type: r.mode === 'mdt' ? 'mdt' : 'parallel',
             createdAt: r.date || new Date().toISOString(),
             basedOn: { evidenceIds: c.medicalRecords?.map((m: any) => m.id) || [], reviewIds: [] },
             specialists: r.specialists || [],
             report: r.report || {},
             status: 'complete'
          }));
          return {
            id: c.id,
            title: c.title,
            status: c.status === 'active' || c.status === 'archived' ? c.status : 'active',
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            intakeData: c.intakeData || {},
            medicalRecords: c.medicalRecords || [],
            reviews: reviews,
            events: c.updates || [],
            currentSummary: c.report || {},
            currentStage: c.stage || 'parallel_complete',
            actions: c.actions || []
          } as CaseItem;
       }
       return c;
    });
    cachedCases = cases;
    return cases;
  } catch (err) {
    console.error('Failed to parse or migrate cases', err);
    setItemSync(getCasesKey(), '[]');
    return [];
  }
}

let syncTimeout: any = null;

async function save(cases: CaseItem[]) {
  try {
    const safeCases = JSON.parse(JSON.stringify(cases));
    cachedCases = safeCases;
    setItemSync(getCasesKey(), JSON.stringify(safeCases));
    window.dispatchEvent(new Event('hc_cases_updated'));

    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          
          // Fetch current timestamps to prevent overwriting newer cloud data with stale local data
          const { data: cloudData } = await supabase.from('cases').select('id, updated_at').in('id', safeCases.map((c: any) => c.id));
          const cloudMap = new Map((cloudData || []).map(c => [c.id, c.updated_at]));

          for (const c of safeCases) {
             const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.id);
             if (!isUUID) continue; // Skip legacy local IDs

             const cloudUpdated = cloudMap.get(c.id);
             if (cloudUpdated && new Date(cloudUpdated).getTime() > new Date(c.updatedAt).getTime()) {
               console.log(`Conflict: Cloud version of case ${c.id} is newer. Skipping upsert to prevent data loss.`);
               continue;
             }

             try {
               await supabase.from('cases').upsert({
                  id: c.id,
                  user_id: session.user.id,
                  title: c.title,
                  status: c.status,
                  specialty: c.currentStage,
                  data: c,
                  updated_at: new Date().toISOString()
               });
             } catch (upsertErr) {
               console.error(`Failed to sync case ${c.id} to cloud:`, upsertErr);
             }
          }
        }
      }, 2000);
    }
  } catch (err) {
    console.error('Failed to save cases. LocalStorage might be full.', err);
    alert('Storage Full: Unable to save case data. Please delete older cases to free up space.');
  }
}

export function getActiveCaseId(): string | null {
  return getItemSync(getActiveCaseKey());
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
  const cases = getCases();
  const updatedCases = cases.filter((c) => c.id !== caseId);
  save(updatedCases);
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

export function createCaseDraft({ title, intakeData = {}, specialists = [] }: { title?: string, intakeData?: any, specialists?: any[] }): CaseItem {
  const now = new Date().toISOString();
  const item: CaseItem = {
    id: id(),
    title: title || 'Untitled health case',
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
    currentStage: type === 'parallel' ? 'parallel_complete' : 'mdt_complete',
    currentSummary: report,
    updatedAt: now,
    reviews: [snapshot, ...(existing.reviews || [])].slice(0, 50),
    events: [
      {
        id: id(),
        date: now,
        label: type === 'parallel' ? 'Parallel review complete' : 'MDT consensus reached',
        note: 'New specialist findings were added to this active case.',
      },
      ...(existing.events || []),
    ].slice(0, 100),
    actions: [...nextActions, ...priorActions].slice(0, 50),
  };

  save(cases.map((item) => (item.id === caseId ? updated : item)));
  setActiveCase(caseId);
  return updated;
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

export async function syncCasesFromSupabase() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase.from('cases').select('*').eq('user_id', session.user.id);
    if (data && data.length > 0) {
      const localCases = getCases();
      const localCaseMap = new Map(localCases.map(c => [c.id, c]));
      
      data.forEach(cloudCase => {
         if (cloudCase.data) {
             const localCase = localCaseMap.get(cloudCase.id);
             if (!localCase || new Date(cloudCase.updated_at) > new Date(localCase.updatedAt)) {
                localCaseMap.set(cloudCase.id, cloudCase.data);
             }
         }
      });
      
      const mergedCases = Array.from(localCaseMap.values());
      setItemSync(getCasesKey(), JSON.stringify(mergedCases));
      window.dispatchEvent(new Event('hc_cases_updated'));
      console.log('Cases synced successfully from Supabase');
    }
  } catch (err) {
    console.error('Failed to sync cases from Supabase:', err);
  }
}
