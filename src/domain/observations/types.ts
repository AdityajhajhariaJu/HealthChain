export type ObservationSource = 'gut' | 'diet' | 'today' | 'ava' | 'import' | 'legacy';
export type EvidenceType = 'user_report' | 'imported_record' | 'documented_clinician_record';
export type TimePrecision = 'exact' | 'approximate' | 'date_only' | 'unknown';
export type Answer = 'yes' | 'no' | 'unanswered';

export type ObservationPayload =
  | { kind: 'meal'; description: string; amount?: { value: number; unit: string } | null; ingredients?: Array<{ name: string; status: 'user_confirmed' | 'unverified' }> }
  | { kind: 'symptom'; symptom: string; severity?: { value: number; max: number } | null; note?: string; explicitMealIds?: string[] }
  | { kind: 'bowel'; bristolType?: number | null; urgency?: Answer; straining?: Answer; note?: string }
  | { kind: 'daily_checkin'; localDate: string; answers: Record<string, Answer>; note?: string }
  | { kind: 'context'; description: string; contextType: 'medication' | 'illness' | 'sleep' | 'stress' | 'other' };

export interface ObservationScope { ownerId: string; profileId: string }
export interface ObservationReference extends ObservationScope { id: string; kind: 'observation' | 'case' | 'trial' }
export interface ObservationDraft extends ObservationScope {
  payload: ObservationPayload;
  occurredAt: string | null;
  localDate: string | null;
  timezone: string | null;
  timePrecision: TimePrecision;
  source: ObservationSource;
  evidenceType: EvidenceType;
  sourceRecordId?: string;
  sourceLocator?: { page?: number; section?: string; quotedRange?: string };
  references?: ObservationReference[];
  idempotencyKey: string;
}
export interface Observation extends ObservationDraft {
  id: string;
  schemaVersion: 1;
  recordedAt: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export type ObservationValidation = { ok: true; value: ObservationDraft } | { ok: false; errors: string[] };

const isDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const isInstant = (value: unknown): value is string => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  !Number.isNaN(Date.parse(value));
const isAnswer = (value: unknown): value is Answer => value === 'yes' || value === 'no' || value === 'unanswered';
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/** Validate the command boundary, preserving missing values instead of choosing defaults. */
export function validateObservationDraft(draft: ObservationDraft): ObservationValidation {
  const errors: string[] = [];
  if (!text(draft.ownerId) || !text(draft.profileId)) errors.push('A current account and profile are required.');
  if (!text(draft.idempotencyKey)) errors.push('A stable idempotency key is required.');
  if (!['gut', 'diet', 'today', 'ava', 'import', 'legacy'].includes(draft.source)) errors.push('Select a valid observation source.');
  if (!['user_report', 'imported_record', 'documented_clinician_record'].includes(draft.evidenceType)) errors.push('Select a valid evidence type.');
  if (draft.evidenceType === 'documented_clinician_record' && (draft.source !== 'import' || !text(draft.sourceRecordId) || !draft.sourceLocator || (!draft.sourceLocator.page && !text(draft.sourceLocator.section) && !text(draft.sourceLocator.quotedRange)))) errors.push('A clinician record requires an imported source and document locator.');
  if (draft.source === 'ava' && draft.evidenceType !== 'user_report') errors.push('An AI draft cannot create a clinician record.');

  if (draft.timePrecision === 'exact' || draft.timePrecision === 'approximate') {
    if (!isInstant(draft.occurredAt)) errors.push('Enter a valid occurrence time with a time zone.');
  } else if (draft.timePrecision === 'date_only') {
    if (draft.occurredAt !== null || !isDate(draft.localDate)) errors.push('A date-only record requires a real local date and no invented time.');
  } else if (draft.timePrecision === 'unknown') {
    if (draft.occurredAt !== null || draft.localDate !== null) errors.push('An unknown occurrence time must remain unknown.');
  } else errors.push('Select a valid time precision.');
  if (draft.localDate !== null && !isDate(draft.localDate)) errors.push('Enter a valid local date.');
  if (draft.timezone !== null) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: draft.timezone }).format(); }
    catch { errors.push('Enter a valid IANA time zone or leave it unknown.'); }
  }
  if (draft.references?.some((reference) => reference.ownerId !== draft.ownerId || reference.profileId !== draft.profileId || !text(reference.id))) errors.push('Linked records must belong to the same account and profile.');

  const payload = draft.payload;
  if (!payload || typeof payload !== 'object') errors.push('Add an observation.');
  else if (payload.kind === 'meal') {
    if (!text(payload.description)) errors.push('Describe the meal.');
    if (payload.amount != null && (!Number.isFinite(payload.amount.value) || payload.amount.value <= 0 || !text(payload.amount.unit))) errors.push('Enter a valid amount and unit or leave the amount unknown.');
    if (payload.ingredients?.some((ingredient) => !text(ingredient.name) || !['user_confirmed', 'unverified'].includes(ingredient.status))) errors.push('Check the ingredient names and their source status.');
  } else if (payload.kind === 'symptom') {
    if (!text(payload.symptom)) errors.push('Name the symptom.');
    if (payload.severity != null && (!Number.isFinite(payload.severity.value) || !Number.isFinite(payload.severity.max) || payload.severity.max <= 0 || payload.severity.value < 0 || payload.severity.value > payload.severity.max)) errors.push('Enter a severity within its recorded scale.');
  } else if (payload.kind === 'bowel') {
    if (payload.bristolType != null && (!Number.isInteger(payload.bristolType) || payload.bristolType < 1 || payload.bristolType > 7)) errors.push('Stool form must be 1–7 or unknown.');
    if (payload.urgency !== undefined && !isAnswer(payload.urgency)) errors.push('Choose yes, no, or unanswered for urgency.');
    if (payload.straining !== undefined && !isAnswer(payload.straining)) errors.push('Choose yes, no, or unanswered for straining.');
  } else if (payload.kind === 'daily_checkin') {
    if (!isDate(payload.localDate) || payload.localDate !== draft.localDate) errors.push('The check-in period must match its local date.');
    if (!payload.answers || Object.keys(payload.answers).length === 0 || Object.values(payload.answers).some((answer) => !isAnswer(answer))) errors.push('Record at least one explicit answer.');
  } else if (payload.kind === 'context') {
    if (!text(payload.description) || !['medication', 'illness', 'sleep', 'stress', 'other'].includes(payload.contextType)) errors.push('Describe the context and choose its type.');
  } else errors.push('Select a supported observation type.');

  return errors.length ? { ok: false, errors } : { ok: true, value: draft };
}
