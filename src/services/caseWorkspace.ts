import type { CaseItem } from './CaseEngine';

const text = (value: unknown, limit = 3000): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

/** Keep reported evidence separate from machine-generated interpretations. */
export function buildCaseContext(item: CaseItem): string {
  return JSON.stringify({
    caseId: item.id,
    title: text(item.title),
    updatedAt: item.updatedAt,
    reportedConcern: text(item.intakeData?.chiefComplaint || item.intakeData?.concern),
    reportedTimeline: text(item.intakeData?.timeline),
    records: (item.medicalRecords || []).slice(0, 12).map(record => ({
      id: record.id, name: record.filename, source: record.source,
      recordedAt: record.addedAt, findings: text(record.findings, 1500),
    })),
    recentUpdates: (item.events || []).slice(0, 8).map(event => ({
      date: event.date, label: event.label, note: text(event.note, 1000),
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
  const searchable = [item.title, item.intakeData?.chiefComplaint, item.intakeData?.concern,
    ...(item.currentSummary?.topDiagnoses || []).map((d: { condition?: string }) => d?.condition),
    ...(item.medicalRecords || []).map(r => r.filename)].filter(Boolean).join(' ').toLocaleLowerCase();
  return terms.every(term => searchable.includes(term));
}

export function caseActionLabel(action: { step?: string; title?: string; description?: string }): string {
  return action.step || action.title || action.description || 'Review this next step';
}

export function localDayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
