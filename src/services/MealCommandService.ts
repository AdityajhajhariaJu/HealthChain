import type { NutritionAssessmentV1, Observation } from '../domain/observations/types';
import { captureObservationScope, createObservation, deleteObservation, listObservationHistory, reviseObservation, type ObservationCommandResult } from './HealthObservationService';
import { getProfile } from './ProfileEngine';
import { deleteDietMealEntry, type DietMealEntry } from './legacyDietMealWrites';

export type MealCaptureMethod = 'diet_diary' | 'quick_nutrition' | 'clinical_lens' | 'plan_confirmation';
export type MealCommand = { localDate: string; entry: DietMealEntry; captureMethod: MealCaptureMethod };
export type MealDiary = Record<string, DietMealEntry[]>;
export type MealRemovalResult = { ok: true; sync: 'local_only' | 'pending' | 'queue_failed' } |
  { ok: false; error: 'scope_changed' | 'not_found' | 'revision_conflict' | 'storage_failure' | 'validation' };

/** A description submitted once is one eaten occasion, even if AI recognizes several foods. */
export function mealEntryFromAnalysis(description: string, items: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}): DietMealEntry {
  const sum = (key: string, alternate?: string): number | null => {
    const values = items.map((item) => nutrient(item[key] ?? (alternate ? item[alternate] : undefined)));
    return values.length && values.every((value) => value !== null)
      ? values.reduce<number>((total, value) => total + (value as number), 0) : null;
  };
  return {
    id: crypto.randomUUID?.() || `meal_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: description.trim(), calories: sum('calories'), protein: sum('protein'),
    carbs: sum('carbs'), fat: sum('fat', 'fats'), sugar: sum('sugar'),
    nutritionSource: 'text_estimate', ...extra,
  };
}

const nutrient = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

const nutrientSet = (raw: any) => raw && typeof raw === 'object' ? {
  calories: nutrient(raw.calories), protein: nutrient(raw.protein), carbs: nutrient(raw.carbs),
  fat: nutrient(raw.fat ?? raw.fats), sugar: nutrient(raw.sugar), fibre: nutrient(raw.fibre), sodium: nutrient(raw.sodium),
} : undefined;

function assessmentFrom(entry: DietMealEntry, captureMethod: MealCaptureMethod, assessedAt: string): NutritionAssessmentV1 {
  const nutrients = {
    calories: nutrient(entry.calories), protein: nutrient(entry.protein),
    carbs: nutrient(entry.carbs), fat: nutrient(entry.fat ?? entry.fats),
    sugar: nutrient(entry.sugar), fibre: nutrient(entry.fibre), sodium: nutrient(entry.sodium),
  };
  const known = Object.values(nutrients).some((value) => value !== null);
  const catalog = entry.nutritionSource === 'food_catalog';
  const packaged = !catalog && (entry.nutritionSource === 'package_label' || captureMethod === 'clinical_lens' && entry.foodType === 'packaged');
  const planned = captureMethod === 'plan_confirmation';
  const amount = nutrient(entry.amountValue ?? entry.portionGrams);
  const amountUnit = entry.amountUnit === 'ml' ? 'ml' : 'g';
  const originalServing = nutrient(entry.originalServingGrams);
  return {
    version: 1, status: !known ? 'unknown' : packaged ? 'label_transcribed_unverified' : 'estimated',
    sourceType: !known ? 'none' : entry.nutritionSource === 'food_catalog' ? 'food_catalog' : entry.nutritionSource === 'manual' ? 'manual' : packaged ? 'package_label' : planned || ['plan_estimate','recipe'].includes(entry.nutritionSource as string) ? 'recipe' : entry.nutritionSource === 'photo_ai' || captureMethod === 'clinical_lens' ? 'photo_ai' : entry.nutritionSource === 'legacy' ? 'legacy' : 'text_ai',
    sourceId: typeof entry.sourceId === 'string' ? entry.sourceId : undefined,
    sourceVersion: typeof entry.sourceVersion === 'string' ? entry.sourceVersion : undefined,
    originalBasis: entry.originalNutritionBasis ? {
      kind: entry.originalNutritionBasis === 'per_serving' ? 'per_serving' :
        entry.originalNutritionBasis === 'per_100g' ? 'per_100g' : entry.originalNutritionBasis === 'per_100ml' ? 'per_100ml' : 'unknown',
      metricServing: entry.originalNutritionBasis === 'per_serving' && originalServing && originalServing > 0
        ? { value: originalServing, unit: 'g' } : undefined,
    } : undefined,
    originalNutrients: nutrientSet(entry.originalLabelNutrients),
    per100Nutrients: nutrientSet(entry.per100Nutrients),
    consumedAmount: amount && amount > 0 ? { value: amount, unit: amountUnit } : null,
    nutrients, assessedAt, calculationVersion: 'meal-capture-v1',
  };
}

/** One persisted meal occurrence. The supplied entry ID is the retry key, not a second record ID. */
export async function createMeal(command: MealCommand): Promise<ObservationCommandResult> {
  const scope = await captureObservationScope();
  if (!scope) return { ok: false, error: 'scope_changed' };
  const { localDate, entry, captureMethod } = command;
  const name = String(entry.name || '').trim();
  const sourceRecordId = String(entry.id || '').trim();
  if(localDate > new Date().toLocaleDateString('en-CA') || typeof entry.occurredAt==='string' && Date.parse(entry.occurredAt)>Date.now()) return {ok:false,error:'validation',details:['Only log food that was actually eaten. Choose a date and time that are not in the future.']};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || !name || !sourceRecordId)
    return { ok: false, error: 'validation', details: ['Choose a date and describe the meal.'] };
  const grams = nutrient(entry.amountValue ?? entry.portionGrams);
  const amountUnit = entry.amountUnit === 'ml' ? 'ml' : 'g';
  const occurredAt = typeof entry.occurredAt === 'string' ? entry.occurredAt : null;
  const precision = occurredAt ? entry.timePrecision === 'approximate' ? 'approximate' : 'exact' : 'date_only';
  const prior = (await listObservationHistory()).filter((item) => item.payload.kind === 'meal' &&
    item.sourceRecordId === sourceRecordId && item.idempotencyKey.startsWith(`meal:${sourceRecordId}`));
  const previous = prior.find((item) => !item.deletedAt);
  const lastDeleted = prior.filter((item) => item.deletedAt)
    .sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)) || b.revision - a.revision)[0];
  const idempotencyKey = previous?.idempotencyKey || (lastDeleted
    ? `meal:${sourceRecordId}:after:${lastDeleted.id}:${lastDeleted.revision}` : `meal:${sourceRecordId}`);
  const assessedAt = previous?.payload.kind === 'meal' && previous.payload.nutritionAssessment
    ? previous.payload.nutritionAssessment.assessedAt
    : typeof entry.loggedAt === 'string' && !Number.isNaN(Date.parse(entry.loggedAt)) ? entry.loggedAt : new Date().toISOString();
  return createObservation({
    ...scope,
    payload: {
      kind: 'meal', description: name, mealType: typeof entry.type === 'string' ? entry.type : undefined,
      note: typeof entry.note === 'string' ? entry.note : undefined,
      hunger: typeof entry.hunger === 'number' ? entry.hunger : undefined, fullness: typeof entry.fullness === 'number' ? entry.fullness : undefined,
      captureMethod,
      amount: grams && grams > 0 ? { value: grams, unit: amountUnit } : null,
      nutritionAssessment: assessmentFrom(entry, captureMethod, assessedAt),
      ingredients: Array.isArray(entry.ingredients) ? entry.ingredients
        .filter((ingredient: any) => typeof ingredient?.name === 'string' && ingredient.name.trim())
        .map((ingredient: any) => ({ name: ingredient.name.trim(), status: ingredient.verified === true || ingredient.status === 'user_confirmed' ? 'user_confirmed' as const : 'unverified' as const, ...(Number.isFinite(ingredient.amount) && ['g','ml','piece'].includes(ingredient.unit) ? {amount:ingredient.amount,unit:ingredient.unit} : {}) })) : undefined,
      steps: Array.isArray(entry.steps) ? entry.steps : undefined, prepMinutes: typeof entry.prepMinutes === 'number' && entry.prepMinutes > 0 ? entry.prepMinutes : undefined,
    },
    occurredAt, localDate, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    timePrecision: precision, source: 'diet', evidenceType: 'user_report', sourceRecordId,
    idempotencyKey,
  });
}

function toDiaryEntry(item: Observation): DietMealEntry {
  if (item.payload.kind !== 'meal') throw new Error('Expected a meal observation');
  const assessment = item.payload.nutritionAssessment;
  const nutrients = assessment?.nutrients;
  return {
    id: item.id, sourceRecordId: item.sourceRecordId || undefined,
    name: item.payload.description, meal: item.payload.description,
    date: item.localDate || undefined, loggedAt: item.recordedAt,
    occurredAt: item.occurredAt, timePrecision: item.timePrecision, timezone: item.timezone,
    type: item.payload.mealType || 'Meal',
    note: item.payload.note, hunger: item.payload.hunger, fullness: item.payload.fullness,
    ingredients: item.payload.ingredients, steps: item.payload.steps, prepMinutes: item.payload.prepMinutes,
    amountValue: item.payload.amount?.value, amountUnit: item.payload.amount?.unit,
    calories: nutrients?.calories ?? null, protein: nutrients?.protein ?? null,
    carbs: nutrients?.carbs ?? null, fat: nutrients?.fat ?? null,
    sugar: nutrients?.sugar ?? null,
    fibre: nutrients?.fibre ?? null, sodium: nutrients?.sodium ?? null,
    sourceId: assessment?.sourceId, sourceVersion: assessment?.sourceVersion,
    nutritionSource: assessment?.sourceType || 'name_only', nutritionStatus: assessment?.status || 'unknown',
    originalNutritionBasis: assessment?.originalBasis?.kind, originalServingGrams: assessment?.originalBasis?.metricServing?.value,
    per100Nutrients: assessment?.per100Nutrients, originalLabelNutrients: assessment?.originalNutrients,
    portionGrams: assessment?.consumedAmount?.unit === 'g' ? assessment.consumedAmount.value : undefined,
    revision: item.revision, syncRecordId: item.id,
  };
}

/** Canonical meals take precedence; tombstones suppress old profile projections. */
export function projectMealDiary(legacy: MealDiary, observations: Observation[]): MealDiary {
  const represented = new Set<string>();
  for (const observation of observations) {
    if (observation.payload.kind !== 'meal') continue;
    represented.add(observation.id);
    if (observation.sourceRecordId) represented.add(observation.sourceRecordId);
  }
  const diary: MealDiary = {};
  for (const [date, entries] of Object.entries(legacy || {})) {
    if (!Array.isArray(entries)) continue;
    diary[date] = entries.filter((entry) => entry && !represented.has(String(entry.id)) &&
      (!entry.sourceRecordId || !represented.has(String(entry.sourceRecordId))));
  }
  for (const item of observations) {
    if (item.deletedAt || item.payload.kind !== 'meal' || !item.localDate) continue;
    (diary[item.localDate] ||= []).push(toDiaryEntry(item));
  }
  const reactions = new Map<string, Observation>();
  for(const record of observations) if(!record.deletedAt && record.payload.kind === 'daily_checkin' && record.payload.mealReaction) {
    for(const reference of record.references || []) if(reference.kind === 'observation') {
      const prior=reactions.get(reference.id);
      if(!prior || record.updatedAt > prior.updatedAt) reactions.set(reference.id,record);
    }
  }
  for(const entries of Object.values(diary)) for(const entry of entries) {
    const report=reactions.get(String(entry.id));
    if(report?.payload.kind === 'daily_checkin') entry.reaction=report.payload.mealReaction;
    else if(entry.sourceRecordId) {
      const old=Object.values(legacy || {}).flat().find(item=>String(item.id)===entry.sourceRecordId);
      if(old?.reaction)entry.reaction=old.reaction;
    }
  }
  for (const entries of Object.values(diary)) entries.sort((a, b) => String(b.loggedAt || '').localeCompare(String(a.loggedAt || '')));
  return diary;
}

function legacyDiary(): MealDiary {
  const profile = getProfile();
  const diet = profile?.dietFoodLogs || profile?.dietician?.foodLogs || {};
  const result: MealDiary = {};
  const resetAt = typeof profile?.dietResetAt === 'string' && !Number.isNaN(Date.parse(profile.dietResetAt)) ? profile.dietResetAt : null;
  const afterReset = (entry: DietMealEntry, date: string) => !resetAt ||
    (typeof entry.loggedAt === 'string' && !Number.isNaN(Date.parse(entry.loggedAt))
      ? Date.parse(entry.loggedAt) > Date.parse(resetAt) : date > resetAt.slice(0, 10));
  for (const [date, entries] of Object.entries(diet)) if (Array.isArray(entries))
    result[date] = (entries as DietMealEntry[]).filter((entry) => afterReset(entry, date));
  for (const entry of profile?.nutrition?.recentLogs || []) {
    const date = String(entry.date || entry.loggedAt || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const day = result[date] ||= [];
    if (!day.some((existing) => String(existing.id) === String(entry.id)) && afterReset(entry, date))
      day.push({ ...entry, name: String(entry.name || entry.meal || 'Meal') });
  }
  return result;
}

export async function listMealDiary(): Promise<MealDiary> {
  return projectMealDiary(legacyDiary(), await listObservationHistory());
}

export type LegacyMealMigrationPreview = { ready: Array<{ date: string; entry: DietMealEntry }>; skipped: Array<{ date: string; id: string; reason: string }> };

async function legacyObservationId(ownerId: string, profileId: string, sourceId: string): Promise<string | null> {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`healthchain:legacy-meal:v1:${ownerId}:${profileId}:${sourceId}`)));
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/** Conservatively select records with stable IDs. Ambiguous same-ID records remain in the legacy view. */
export function previewLegacyMealMigration(legacy: MealDiary, history: Observation[]): LegacyMealMigrationPreview {
  const ready: LegacyMealMigrationPreview['ready'] = [];
  const skipped: LegacyMealMigrationPreview['skipped'] = [];
  const candidates = Object.entries(legacy).flatMap(([date, entries]) =>
    Array.isArray(entries) ? entries.map((entry) => ({ date, entry })) : []);
  const counts = new Map<string, number>();
  for (const { entry } of candidates) {
    const id = String(entry?.id ?? '');
    if (id) counts.set(id, (counts.get(id) || 0) + 1);
  }
  for (const item of candidates) {
    const id = String(item.entry?.id ?? '');
    const reason = !id || !item.entry?.name?.trim() ? 'missing_identity_or_name' :
      counts.get(id) !== 1 ? 'ambiguous_id' :
      history.some((record) => record.payload.kind === 'meal' && record.sourceRecordId === id) ? 'already_migrated' :
      typeof item.entry.loggedAt !== 'string' || Number.isNaN(Date.parse(item.entry.loggedAt)) ? 'missing_timestamp' :
      !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ? 'invalid_date' : '';
    if (reason) skipped.push({ date: item.date, id, reason });
    else ready.push(item);
  }
  return { ready, skipped };
}

/** Existing profile food records are preserved until independently reconciled and retained. */
export async function migrateLegacyDietMeals(): Promise<{ imported: number; skipped: number; failed: number }> {
  const preview = previewLegacyMealMigration(legacyDiary(), await listObservationHistory());
  if (preview.ready.length === 0) return { imported: 0, skipped: preview.skipped.length, failed: 0 };
  const scope = await captureObservationScope();
  if (!scope) return { imported: 0, skipped: preview.skipped.length, failed: preview.ready.length };
  let imported = 0;
  let failed = 0;
  for (const { date, entry } of preview.ready) {
    const stableId = await legacyObservationId(scope.ownerId, scope.profileId, String(entry.id));
    if (!stableId) { failed++; continue; }
    const assessedAt = typeof entry.loggedAt === 'string' && !Number.isNaN(Date.parse(entry.loggedAt))
      ? entry.loggedAt : new Date().toISOString();
    const nutritionAssessment = assessmentFrom(entry, 'diet_diary', assessedAt);
    nutritionAssessment.sourceType = 'legacy';
    const result = await createObservation({
      ...scope, payload: { kind: 'meal', description: entry.name.trim(),
        mealType: typeof entry.type === 'string' ? entry.type : undefined,
        captureMethod: 'legacy_import', nutritionAssessment },
      occurredAt: null, localDate: date, timezone: null, timePrecision: 'date_only',
      source: 'legacy', evidenceType: 'user_report', sourceRecordId: String(entry.id),
      idempotencyKey: `legacy-meal:${String(entry.id)}`,
    }, stableId);
    if (result.ok) imported++;
    else failed++;
  }
  return { imported, skipped: preview.skipped.length, failed };
}

export async function removeMeal(localDate: string, id: string | number): Promise<MealRemovalResult> {
  const history = await listObservationHistory();
  const canonical = history.find((item) => item.id === String(id) && item.payload.kind === 'meal');
  if (canonical) return canonical.deletedAt ? { ok: false, error: 'not_found' } : deleteObservation(canonical.id, canonical.revision);
  const removed = await deleteDietMealEntry(localDate, id);
  return removed.ok ? { ok: true, sync: 'local_only' } :
    { ok: false, error: removed.error === 'not_found' ? 'not_found' : 'storage_failure' };
}

/** Reset Diet-owned meal observations before clearing legacy profile snapshots. */
export async function removeAllDietMeals(): Promise<{ ok: boolean; removed: number; error?: string }> {
  if (!await captureObservationScope()) return { ok: false, removed: 0, error: 'scope_changed' };
  const meals = (await listObservationHistory()).filter((item) => !item.deletedAt && item.payload.kind === 'meal' && (item.source === 'diet' || item.source === 'legacy'));
  let removed = 0;
  for (const meal of meals) {
    const result = await deleteObservation(meal.id, meal.revision);
    if (!result.ok) return { ok: false, removed, error: result.error };
    removed++;
    if (result.sync === 'queue_failed') return { ok: false, removed, error: 'queue_failed' };
  }
  return { ok: true, removed };
}

export async function correctMeal(id: string, expectedRevision: number, changes: { name?: string; nutrients?: Partial<NutritionAssessmentV1['nutrients']>; portionGrams?: number | null; amountValue?:number|null; amountUnit?:'g'|'ml'; localDate?: string; occurredAt?: string | null; timePrecision?: 'exact' | 'approximate' | 'date_only'; note?: string; hunger?: number|null; fullness?: number|null }): Promise<ObservationCommandResult> {
  if (changes.localDate && changes.localDate > new Date().toLocaleDateString('en-CA') || changes.occurredAt && Date.parse(changes.occurredAt) > Date.now()) return {ok:false,error:'validation',details:['Choose an eating date and time that are not in the future.']};
  const original = (await listObservationHistory()).find((item) => item.id === id && !item.deletedAt);
  if (!original || original.payload.kind !== 'meal') return { ok: false, error: 'not_found' };
  const payload = original.payload;
  const assessment = payload.nutritionAssessment || assessmentFrom({ id, name: payload.description }, 'diet_diary', new Date().toISOString());
  const correctedNutrients = { ...assessment.nutrients, ...changes.nutrients };
  const hasKnown = Object.values(correctedNutrients).some((value) => typeof value === 'number' && Number.isFinite(value));
  let nextAssessment: NutritionAssessmentV1 = changes.nutrients ? {
    ...assessment, status: hasKnown ? 'estimated' : 'unknown', sourceType: hasKnown ? 'manual' : 'none',
    nutrients: correctedNutrients, per100Nutrients: undefined, assessedAt: new Date().toISOString(),
  } : assessment;
  const amountValue=changes.amountValue===undefined?changes.portionGrams:changes.amountValue;
  const amountUnit=changes.amountUnit||'g';
  const nextAmount = amountValue === undefined ? payload.amount : amountValue === null ? null : {value:amountValue,unit:amountUnit};
  const amountChanged=amountValue!==undefined && (nextAmount?.value!==payload.amount?.value || nextAmount?.unit!==payload.amount?.unit);
  if(amountChanged&&!changes.nutrients) {
    const basisMatches=nextAmount && assessment.per100Nutrients && assessment.originalBasis?.kind===(amountUnit==='ml'?'per_100ml':'per_100g');
    const nutrients=basisMatches?Object.fromEntries(Object.entries(assessment.per100Nutrients!).map(([key,value])=>[key,value===null?null:Math.round(value*nextAmount!.value)/100])):Object.fromEntries(Object.keys(assessment.nutrients).map(key=>[key,null]));
    nextAssessment={...assessment,nutrients:nutrients as NutritionAssessmentV1['nutrients'],status:basisMatches?'estimated':'unknown',sourceType:basisMatches?assessment.sourceType:'none',assessedAt:new Date().toISOString()};
  }
  const { id: _id, schemaVersion: _schema, recordedAt: _recorded, revision: _revision,
    createdAt: _created, updatedAt: _updated, deletedAt: _deleted, ...draft } = original;
  return reviseObservation(id, expectedRevision, {
    ...draft, localDate: changes.localDate ?? draft.localDate, occurredAt: changes.occurredAt === undefined ? draft.occurredAt : changes.occurredAt,
    timePrecision: changes.timePrecision ?? draft.timePrecision,
    payload: { ...payload, description: changes.name ?? payload.description,
      note: changes.note ?? payload.note, hunger: changes.hunger === null ? undefined : changes.hunger ?? payload.hunger, fullness: changes.fullness === null ? undefined : changes.fullness ?? payload.fullness,
      amount: nextAmount, nutritionAssessment: amountValue !== undefined
        ? { ...nextAssessment, consumedAmount: amountValue === null ? null : { value: amountValue, unit: amountUnit } }
        : nextAssessment },
  });
}
