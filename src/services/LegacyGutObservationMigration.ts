import type { ObservationDraft, ObservationScope } from '../domain/observations/types';
import { validateObservationDraft } from '../domain/observations/types';

type LegacyDay = Record<string, unknown>;
export interface LegacyMigrationPreview {
  drafts: ObservationDraft[];
  skipped: Array<{ date: string; field: string; reason: string }>;
}

const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const validScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
const validStool = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 7;

/**
 * Pure staging preview. The caller must verify owner/profile provenance and
 * persist the drafts through the canonical command after migration rehearsal.
 */
export function previewLegacyDigestionMigration(
  scope: ObservationScope,
  legacyLogs: Record<string, unknown>,
  today: string,
): LegacyMigrationPreview {
  const drafts: ObservationDraft[] = [];
  const skipped: LegacyMigrationPreview['skipped'] = [];
  if (!scope.ownerId || !scope.profileId || scope.ownerId === 'guest') {
    return { drafts, skipped: [{ date: '', field: 'owner', reason: 'Account ownership must be verified before import.' }] };
  }
  for (const [date, raw] of Object.entries(legacyLogs || {})) {
    if (!validDate(date) || date > today || !raw || typeof raw !== 'object' || Array.isArray(raw)) {
      skipped.push({ date, field: 'record', reason: 'Invalid, future, or unrecognized saved date.' });
      continue;
    }
    const day = raw as LegacyDay;
    const base = (field: string): Omit<ObservationDraft, 'payload'> => ({
      ...scope, occurredAt: null, localDate: date, timezone: null, timePrecision: 'date_only',
      source: 'legacy', evidenceType: 'user_report', sourceRecordId: `digestion:${date}:${field}`,
      idempotencyKey: `legacy-digestion-v1:${scope.ownerId}:${scope.profileId}:${date}:${field}`,
    });
    const append = (draft: ObservationDraft) => {
      const valid = validateObservationDraft(draft);
      if (valid.ok) drafts.push(draft);
      else skipped.push({ date, field: draft.sourceRecordId || 'unknown', reason: valid.errors.join(' ') });
    };
    for (const [field, symptom] of [['bloatingScore', 'Bloating'], ['stomachScore', 'Stomach discomfort']] as const) {
      if (day[field] === undefined || day[field] === null) continue;
      if (validScore(day[field])) append({ ...base(field), payload: { kind: 'symptom', symptom, severity: { value: day[field], max: 10 } } });
      else skipped.push({ date, field, reason: 'Score was outside the recorded 0–10 scale.' });
    }
    if (day.bristolType !== undefined && day.bristolType !== null) {
      if (validStool(day.bristolType)) append({ ...base('bristolType'), payload: { kind: 'bowel', bristolType: day.bristolType } });
      else skipped.push({ date, field: 'bristolType', reason: 'Stool form was outside the recorded 1–7 scale.' });
    }
    if (typeof day.stomachNotes === 'string' && day.stomachNotes.trim()) {
      append({ ...base('stomachNotes'), payload: { kind: 'context', contextType: 'other', description: day.stomachNotes.trim() } });
    }
    for (const field of ['bowelFrequency', 'stomachComfort', 'distensionPattern']) {
      if (day[field] !== undefined && day[field] !== null) skipped.push({ date, field, reason: 'No exact canonical field; preserve in the legacy record for review.' });
    }
  }
  return { drafts, skipped };
}
