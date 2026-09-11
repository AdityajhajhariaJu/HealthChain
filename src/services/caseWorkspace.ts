import type { CaseItem } from './CaseEngine';
import { getCase, getActiveCase, getActiveCaseId, getCases, setActiveCase } from './CaseEngine';
import { getProfileKey, getProfileEngineState } from './ProfileEngine';

const text = (value: unknown, limit = 3000): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

export interface UnifiedCaseScope {
  caseItem: CaseItem | null;
  caseId: string | null;
  allCases: CaseItem[];
  scopeKey: string;
}

export interface DocumentedAnswerItem {
  topic: string;
  value: string;
  source: string;
  category: 'symptom' | 'timeline' | 'medication' | 'measurement' | 'diagnosis' | 'allergy';
}

/**
 * Single canonical source of truth for resolving active case scope across all features.
 * Permanently resolves Point 10 Gap #5: Unifies ConsultPage and Case Workspace loading.
 */
export function getUnifiedCaseScope(preferredCaseId?: string | null): UnifiedCaseScope {
  const allCases = typeof getCases === 'function' ? getCases() : [];
  let resolvedCase: CaseItem | null = null;

  if (preferredCaseId) {
    resolvedCase = allCases.find(c => c.id === preferredCaseId) || null;
  } else {
    resolvedCase = (typeof getActiveCase === 'function' ? getActiveCase() : null) || allCases.find(c => !c.intakeData?.scenarioId) || null;
  }
  if (resolvedCase?.intakeData?.scenarioId) resolvedCase = null;
  const profileKey = getProfileKey();
  const profileId = getProfileEngineState()?.activeId || 'profile_1';
  const scopeKey = `${profileKey}_${profileId}_${resolvedCase?.id || 'none'}`;

  return {
    caseItem: resolvedCase,
    caseId: resolvedCase?.id || null,
    allCases,
    scopeKey,
  };
}

/**
 * Extracts facts already documented in records and intake to prevent Ava from re-asking.
 * Fulfills Point 9 Item 3 & Point 10 Gap #4.
 */
export function getCaseDocumentedAnswers(item: CaseItem): DocumentedAnswerItem[] {
  const answers: DocumentedAnswerItem[] = [];

  const complaint = item.intakeData?.chiefComplaint || item.intakeData?.concern;
  if (complaint && typeof complaint === 'string') {
    answers.push({
      topic: 'Chief Complaint / Primary Concern',
      value: complaint,
      source: 'Intake Record',
      category: 'symptom',
    });
  }

  const timeline = item.intakeData?.timeline;
  if (timeline && typeof timeline === 'string') {
    answers.push({
      topic: 'Symptom Onset & Duration',
      value: timeline,
      source: 'Intake Timeline',
      category: 'timeline',
    });
  }

  const meds = item.intakeData?.currentMedications || item.intakeData?.medications;
  if (meds) {
    const medList = Array.isArray(meds) ? meds.map(m => typeof m === 'string' ? m : m.name).join(', ') : String(meds);
    if (medList.trim()) {
      answers.push({
        topic: 'Current Medications',
        value: medList.trim(),
        source: 'Intake Medications',
        category: 'medication',
      });
    }
  }

  const allergies = item.intakeData?.allergies;
  if (allergies) {
    const allergyList = Array.isArray(allergies) ? allergies.map(a => typeof a === 'string' ? a : a.name).join(', ') : String(allergies);
    if (allergyList.trim()) {
      answers.push({
        topic: 'Known Allergies',
        value: allergyList.trim(),
        source: 'Intake Allergies',
        category: 'allergy',
      });
    }
  }

  if (Array.isArray(item.medicalRecords)) {
    for (const rec of item.medicalRecords) {
      if (rec.findings && typeof rec.findings === 'string') {
        const lines = rec.findings.split(/\n+/).filter(l => l.trim().length > 3).slice(0, 5);
        lines.forEach(line => {
          answers.push({
            topic: rec.filename || 'Medical Record',
            value: line.trim(),
            source: rec.filename || 'Uploaded Document',
            category: 'measurement',
          });
        });
      }
    }
  }

  if (Array.isArray(item.events)) {
    item.events.filter(ev => /^(User clarification|User observation|Evidence update|Observation|Measurement|Question|Appointment outcome|Ava update|Case update)$/i.test(ev.label || '')).slice(0, 5).forEach(ev => {
      if (ev.note) {
        answers.push({
          topic: ev.label || 'Case Update',
          value: ev.note,
          source: ev.date || 'Case Timeline',
          category: 'symptom',
        });
      }
    });
  }

  return answers;
}

/** Keep reported evidence separate from machine-generated interpretations. */
export function buildCaseContext(item: CaseItem): string {
  if (item.intakeData?.scenarioId) return JSON.stringify({ notice: 'Illustrative example. Not patient evidence.' });
  const documentedAnswers = getCaseDocumentedAnswers(item);

  return JSON.stringify({
    caseId: item.id,
    title: text(item.title),
    updatedAt: item.updatedAt,
    reportedConcern: text(item.intakeData?.chiefComplaint || item.intakeData?.concern),
    reportedTimeline: text(item.intakeData?.timeline),
    alreadyDocumentedInRecords: documentedAnswers.map(a => `${a.topic}: ${a.value} (${a.source})`),
    records: (item.medicalRecords || []).slice(0, 12).map(record => ({
      id: record.id,
      name: record.filename,
      source: record.source,
      recordedAt: record.addedAt,
      findings: text(record.findings, 1500),
    })),
    recentUpdates: (item.events || []).slice(0, 8).map(event => ({
      date: event.date,
      label: event.label,
      note: text(event.note, 1000),
    })),
    priorAIInterpretation: {
      notice: 'Unverified AI output, not a confirmed diagnosis or a patient-reported fact.',
      summary: text(item.currentSummary?.executiveSummary),
      possibilities: (item.currentSummary?.topDiagnoses || []).slice(0, 5).map((entry: { condition?: string }) => text(entry?.condition, 200)),
    },
  });
}

export function caseMatchesSearch(item: CaseItem, query: string): boolean {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const searchable = [
    item.title,
    item.intakeData?.chiefComplaint,
    item.intakeData?.concern,
    ...(item.currentSummary?.topDiagnoses || []).map((d: { condition?: string }) => d?.condition),
    ...(item.medicalRecords || []).map(r => r.filename),
  ].filter(Boolean).join(' ').toLocaleLowerCase();
  return terms.every(term => searchable.includes(term));
}

export function caseActionLabel(action: { step?: string; title?: string; description?: string }): string {
  return action.step || action.title || action.description || 'Review this next step';
}

export function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
