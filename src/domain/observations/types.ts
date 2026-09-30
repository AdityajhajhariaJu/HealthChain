export type ObservationSource = 'gut' | 'diet' | 'today' | 'ava' | 'import' | 'legacy';
export type EvidenceType = 'user_report' | 'imported_record' | 'documented_clinician_record';
export type TimePrecision = 'exact' | 'approximate' | 'date_only' | 'unknown';
export type Answer = 'yes' | 'no' | 'unanswered';
export interface MealReactionRecord {
  reactionType:'none'|'bloat'|'heartburn'|'palpitations'|'brain_fog'|'stomach_upset';
  system:'stomach'|'bloating'|'vitals'|'neuro';
  severity:0|1|2|3|null; label:string; sublabel?:string; emoji:string;
  incubationHours:number|null; loggedAt:string;
}

export interface NutritionAssessmentV1 {
  version: 1;
  status: 'unknown' | 'estimated' | 'label_transcribed_unverified' | 'calculated';
  sourceType: 'none' | 'text_ai' | 'photo_ai' | 'package_label' | 'recipe' | 'food_catalog' | 'manual' | 'legacy';
  sourceId?: string;
  sourceVersion?: string;
  originalBasis?: { kind: 'per_100g' | 'per_100ml' | 'per_serving' | 'per_package' | 'unknown'; amount?: number; metricServing?: { value: number; unit: 'g' | 'ml' } };
  originalNutrients?: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; sugar?: number | null; fibre?: number | null; sodium?: number | null };
  per100Nutrients?: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; sugar?: number | null; fibre?: number | null; sodium?: number | null };
  consumedAmount?: { value: number; unit: 'g' | 'ml' | 'serving' } | null;
  nutrients: { calories: number | null; protein: number | null; carbs: number | null; fat: number | null; sugar?: number | null; fibre?: number | null; sodium?: number | null };
  assessedAt: string;
  calculationVersion: string;
}

export type ObservationPayload =
  | { kind: 'meal'; description: string; note?: string; hunger?: number; fullness?: number; amount?: { value: number; unit: string } | null; portionSize?: 'smaller' | 'usual' | 'larger'; ingredients?: Array<{ name: string; status: 'user_confirmed' | 'unverified'; amount?: number; unit?: 'g' | 'ml' | 'piece' }>; steps?: string[]; prepMinutes?: number; nutritionAssessment?: NutritionAssessmentV1; mealType?: string; captureMethod?: 'gut_quick_log' | 'diet_diary' | 'quick_nutrition' | 'clinical_lens' | 'plan_confirmation' | 'legacy_import' }
  | { kind: 'symptom'; symptom: string; symptomCode?: 'bloating' | 'discomfort' | 'reflux' | 'nausea' | 'bowel_changes'; severity?: { value: number; max: number } | null; severityLabel?: 'mild' | 'moderate' | 'severe'; note?: string; explicitMealIds?: string[] }
  | { kind: 'bowel'; bristolType?: number | null; urgency?: Answer; straining?: Answer; note?: string }
  | { kind: 'daily_checkin'; localDate: string; answers: Record<string, Answer>; note?: string; mealReaction?:MealReactionRecord }
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
    if (payload.note !== undefined && (typeof payload.note !== 'string' || payload.note.length > 500)) errors.push('Keep meal notes within 500 characters.');
    for (const value of [payload.hunger, payload.fullness]) if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > 5)) errors.push('Hunger and fullness must be 1–5 or unrecorded.');
    if (payload.portionSize !== undefined && !['smaller', 'usual', 'larger'].includes(payload.portionSize)) errors.push('Choose a valid portion size.');
    if (payload.amount != null && (!Number.isFinite(payload.amount.value) || payload.amount.value <= 0 || !text(payload.amount.unit))) errors.push('Enter a valid amount and unit or leave the amount unknown.');
    if (payload.ingredients?.some((ingredient) => !text(ingredient.name) || !['user_confirmed', 'unverified'].includes(ingredient.status))) errors.push('Check the ingredient names and their source status.');
    if (payload.ingredients?.some(item => item.amount !== undefined && (!Number.isFinite(item.amount) || item.amount <= 0 || item.amount > 60000 || !['g','ml','piece'].includes(item.unit || '')))) errors.push('Check the recipe ingredient quantities and units.');
    if (payload.steps && (!Array.isArray(payload.steps) || payload.steps.length > 6 || payload.steps.some(step => !text(step) || step.length > 300))) errors.push('Use up to six recipe steps.');
    if (payload.prepMinutes !== undefined && (!Number.isInteger(payload.prepMinutes) || payload.prepMinutes < 1 || payload.prepMinutes > 360)) errors.push('Check the recipe preparation time.');
    if (payload.mealType !== undefined && (typeof payload.mealType !== 'string' || payload.mealType.length > 60)) errors.push('Choose a valid meal type.');
    if (payload.captureMethod !== undefined && !['gut_quick_log', 'diet_diary', 'quick_nutrition', 'clinical_lens', 'plan_confirmation', 'legacy_import'].includes(payload.captureMethod)) errors.push('Choose a valid meal capture method.');
    const assessment = payload.nutritionAssessment;
    if (assessment) {
      if (assessment.version !== 1 || !['unknown', 'estimated', 'label_transcribed_unverified', 'calculated'].includes(assessment.status) ||
          !['none', 'text_ai', 'photo_ai', 'package_label', 'recipe', 'food_catalog', 'manual', 'legacy'].includes(assessment.sourceType) ||
          !isInstant(assessment.assessedAt) || !text(assessment.calculationVersion)) errors.push('The nutrition assessment needs a valid version, source, and timestamp.');
      const basis = assessment.originalBasis;
      if (basis && (!['per_100g', 'per_100ml', 'per_serving', 'per_package', 'unknown'].includes(basis.kind) ||
          (basis.amount !== undefined && (!Number.isFinite(basis.amount) || basis.amount <= 0)) ||
          (basis.metricServing && (!Number.isFinite(basis.metricServing.value) || basis.metricServing.value <= 0 || !['g', 'ml'].includes(basis.metricServing.unit))))) errors.push('Check the original nutrition-label basis.');
      if (assessment.consumedAmount && (!Number.isFinite(assessment.consumedAmount.value) || assessment.consumedAmount.value <= 0 ||
          !['g', 'ml', 'serving'].includes(assessment.consumedAmount.unit))) errors.push('Check the amount eaten.');
      const nutrients = assessment.nutrients;
      if (!nutrients || ['calories', 'protein', 'carbs', 'fat'].some((key) => !(key in nutrients)) ||
          Object.values(nutrients || {}).some((value) => value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0))) errors.push('Nutrients must be nonnegative numbers or unknown.');
      if (assessment.status === 'unknown' && nutrients && Object.values(nutrients).some((value) => value !== null)) errors.push('Unknown nutrition cannot contain measured values.');
      if (assessment.status === 'calculated' && !['recipe', 'food_catalog', 'manual'].includes(assessment.sourceType)) errors.push('Calculated nutrition requires a traceable source.');
      for (const values of [assessment.originalNutrients, assessment.per100Nutrients]) {
        if (values && (['calories', 'protein', 'carbs', 'fat'].some((key) => !(key in values)) ||
          Object.values(values).some((value) => value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)))) errors.push('Label nutrient values must be nonnegative numbers or unknown.');
      }
    }
  } else if (payload.kind === 'symptom') {
    if (!text(payload.symptom)) errors.push('Name the symptom.');
    if (payload.symptomCode !== undefined && !['bloating', 'discomfort', 'reflux', 'nausea', 'bowel_changes'].includes(payload.symptomCode)) errors.push('Choose a valid symptom category.');
    if (payload.severityLabel !== undefined && !['mild', 'moderate', 'severe'].includes(payload.severityLabel)) errors.push('Choose a valid severity label.');
    if (payload.severity != null && (!Number.isFinite(payload.severity.value) || !Number.isFinite(payload.severity.max) || payload.severity.max <= 0 || payload.severity.value < 0 || payload.severity.value > payload.severity.max)) errors.push('Enter a severity within its recorded scale.');
  } else if (payload.kind === 'bowel') {
    if (payload.bristolType != null && (!Number.isInteger(payload.bristolType) || payload.bristolType < 1 || payload.bristolType > 7)) errors.push('Stool form must be 1–7 or unknown.');
    if (payload.urgency !== undefined && !isAnswer(payload.urgency)) errors.push('Choose yes, no, or unanswered for urgency.');
    if (payload.straining !== undefined && !isAnswer(payload.straining)) errors.push('Choose yes, no, or unanswered for straining.');
  } else if (payload.kind === 'daily_checkin') {
    if (!isDate(payload.localDate) || payload.localDate !== draft.localDate) errors.push('The check-in period must match its local date.');
    if (!payload.answers || Object.keys(payload.answers).length === 0 || Object.values(payload.answers).some((answer) => !isAnswer(answer))) errors.push('Record at least one explicit answer.');
    if(payload.mealReaction && (!['none','bloat','heartburn','palpitations','brain_fog','stomach_upset'].includes(payload.mealReaction.reactionType) || !isInstant(payload.mealReaction.loggedAt) || !text(payload.mealReaction.label) || payload.mealReaction.label.length>120 || payload.mealReaction.severity!==null && (!Number.isInteger(payload.mealReaction.severity) || payload.mealReaction.severity<0 || payload.mealReaction.severity>3))) errors.push('Check the explicit meal reaction and report time.');
  } else if (payload.kind === 'context') {
    if (!text(payload.description) || !['medication', 'illness', 'sleep', 'stress', 'other'].includes(payload.contextType)) errors.push('Describe the context and choose its type.');
  } else errors.push('Select a supported observation type.');

  return errors.length ? { ok: false, errors } : { ok: true, value: draft };
}
