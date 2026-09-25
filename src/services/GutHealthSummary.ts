import { getDigestionLogs, getProfile } from './ProfileEngine';
import type { Observation } from '../domain/observations/types';

export interface GutDay {
  date: string;
  bloating: number | null;
  discomfort: number | null;
  stoolForm: number | null;
  comfort: string | null;
  bowelFrequency: number | null;
  distensionPattern: string | null;
  note: string | null;
}

export interface GutMeal {
  id: string;
  name: string;
  date: string;
  time: string | null;
  /** Only a separately confirmed meal occurrence belongs on an hourly timeline. */
  occurredAt?: string | null;
  timePrecision?: 'exact' | 'approximate' | 'date_only' | 'unknown';
  loggedAt?: string | null;
  reaction: string | null;
  reactionType?: string | null;
  reactionRecordedAt?: string | null;
  preparation?: { kind: 'ingredient_or_substitution' | 'portion' | 'fresh_or_reheated' | 'cooking_method'; detail: string; source: 'user_confirmed' } | null;
  /** Original store and source identity for merged records; never a derived event. */
  sourceKind?: 'diet_meal' | 'observation';
  sourceRecordId?: string | null;
  revision?: number | null;
}

export interface GutSnapshot {
  today: string;
  days: GutDay[];
  meals: GutMeal[];
  todayDay: GutDay | null;
  todayMeals: GutMeal[];
  /** Canonical records are passed in by the profile-scoped observation service. */
  observations: Observation[];
  digestionDateCount: number;
  /** Includes undated canonical meal reports; they remain unavailable to timed comparisons. */
  mealRecordCount: number;
  undatedMealObservations: Observation[];
}

const validScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10;
const validFrequency = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 30;
const comfortLabels: Record<string, string> = { calm: 'Comfortable', mild_acid: 'Mild burning', moderate_reflux: 'Reflux', severe_burning: 'Severe burning', nausea: 'Nausea' };
const patternLabels: Record<string, string> = { flat_all_day: 'No noticeable distension', flat_am_bloated_pm: 'More bloated by evening', post_meal_distension: 'Bloating after a meal', persistent_distension: 'Bloating throughout the day' };
export const hasRecordedDigestionEntry = (entry: unknown): boolean => {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
  const day = entry as Record<string, unknown>;
  return validScore(day.bloatingScore) || validScore(day.stomachScore) ||
    (Number.isInteger(day.bristolType) && Number(day.bristolType) >= 1 && Number(day.bristolType) <= 7) ||
    validFrequency(day.bowelFrequency) ||
    (typeof day.stomachComfort === 'string' && !!comfortLabels[day.stomachComfort]) ||
    (typeof day.distensionPattern === 'string' && !!patternLabels[day.distensionPattern]) ||
    (typeof day.stomachNotes === 'string' && !!day.stomachNotes.trim());
};
const validDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

/** A read-only view of recorded data. Missing fields stay missing. */
export function getGutSnapshot(now = new Date()): GutSnapshot {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const days: GutDay[] = Object.entries(getDigestionLogs() || {})
    .filter(([date, entry]) => validDate(date) && date <= today && hasRecordedDigestionEntry(entry))
    .map(([date, raw]) => {
      const entry = raw as Record<string, unknown>;
      return {
        date,
        bloating: validScore(entry.bloatingScore) ? entry.bloatingScore : null,
        discomfort: validScore(entry.stomachScore) ? entry.stomachScore : null,
        stoolForm: Number.isInteger(entry.bristolType) && Number(entry.bristolType) >= 1 && Number(entry.bristolType) <= 7 ? Number(entry.bristolType) : null,
        comfort: typeof entry.stomachComfort === 'string' ? comfortLabels[entry.stomachComfort] || null : null,
        bowelFrequency: validFrequency(entry.bowelFrequency) ? entry.bowelFrequency : null,
        distensionPattern: typeof entry.distensionPattern === 'string' ? patternLabels[entry.distensionPattern] || null : null,
        note: typeof entry.stomachNotes === 'string' && entry.stomachNotes.trim() ? entry.stomachNotes.trim() : null,
      };
    })
    .filter((entry) => entry.bloating !== null || entry.discomfort !== null || entry.stoolForm !== null || entry.comfort !== null || entry.bowelFrequency !== null || entry.distensionPattern !== null || !!entry.note)
    .sort((a, b) => b.date.localeCompare(a.date));

  const profile = getProfile();
  const meals: GutMeal[] = (Array.isArray(profile?.nutrition?.recentLogs) ? profile.nutrition.recentLogs : [])
    .filter((raw: any) => raw && typeof raw === 'object')
    .map((raw: any, index: number) => {
      const date = String(raw.date || raw.loggedAt || '').slice(0, 10);
      const timestamp = typeof raw.loggedAt === 'string' && !Number.isNaN(Date.parse(raw.loggedAt)) ? raw.loggedAt : null;
      const occurrence = typeof raw.occurredAt === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(raw.occurredAt) && !Number.isNaN(Date.parse(raw.occurredAt)) ? raw.occurredAt : null;
      const timePrecision = occurrence && ['exact', 'approximate'].includes(raw.timePrecision) ? raw.timePrecision as 'exact' | 'approximate' : 'date_only';
      let displayTime: string | null = null;
      if (occurrence && timePrecision !== 'date_only') {
        try { displayTime = new Date(occurrence).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...(typeof raw.timezone === 'string' ? { timeZone: raw.timezone } : {}) }); }
        catch { displayTime = null; }
      }
      return {
        id: String(raw.id || raw.loggedAt || `meal-${index}`),
        name: String(raw.meal || raw.name || 'Meal'),
        date,
        time: displayTime,
        occurredAt: timePrecision !== 'date_only' ? occurrence : null,
        timePrecision,
        loggedAt: timestamp,
        reaction: typeof raw.reaction?.label === 'string' && raw.reaction.label.trim() ? raw.reaction.label.trim() :
          typeof raw.reaction?.notes === 'string' && raw.reaction.notes.trim() ? raw.reaction.notes.trim() :
          typeof raw.reaction?.symptom === 'string' && raw.reaction.symptom.trim() ? raw.reaction.symptom.trim() : null,
        reactionType: typeof raw.reaction?.reactionType === 'string' ? raw.reaction.reactionType : null,
        reactionRecordedAt: typeof raw.reaction?.loggedAt === 'string' && !Number.isNaN(Date.parse(raw.reaction.loggedAt)) ? raw.reaction.loggedAt : null,
        preparation: raw.preparation?.source === 'user_confirmed' && ['ingredient_or_substitution', 'portion', 'fresh_or_reheated', 'cooking_method'].includes(raw.preparation.kind) && typeof raw.preparation.detail === 'string' && raw.preparation.detail.trim() ? {
          kind: raw.preparation.kind, detail: raw.preparation.detail.trim().slice(0, 120), source: 'user_confirmed' as const,
        } : null,
        sourceKind: 'diet_meal' as const,
        sourceRecordId: typeof raw.sourceRecordId === 'string' ? raw.sourceRecordId : String(raw.id || raw.loggedAt || `meal-${index}`),
        revision: null,
      };
    })
    .filter((meal: GutMeal) => validDate(meal.date) && meal.date <= today)
    .sort((a: GutMeal, b: GutMeal) => b.date.localeCompare(a.date));

  return { today, days, meals, todayDay: days.find((day) => day.date === today) || null,
    todayMeals: meals.filter((meal) => meal.date === today), observations: [], digestionDateCount: days.length,
    mealRecordCount: meals.length, undatedMealObservations: [] };
}

/**
 * Combine the existing Gut/Diet read with profile-scoped canonical observations.
 * A canonical observation linked to an existing Diet meal is provenance for that
 * meal, not a second occasion. Other observations remain individually inspectable.
 */
export function mergeGutSnapshotWithObservations(snapshot: GutSnapshot, observations: Observation[]): GutSnapshot {
  const active = observations.filter((item) => !item.deletedAt);
  const representedIds = new Set<string>();
  for (const meal of snapshot.meals) {
    representedIds.add(meal.id);
    if (meal.sourceRecordId) representedIds.add(meal.sourceRecordId);
  }

  const observedMeals: GutMeal[] = active.flatMap((item) => {
    if (item.payload.kind !== 'meal' || !validDate(item.localDate || '')) return [];
    if (representedIds.has(item.id) || (item.sourceRecordId && representedIds.has(item.sourceRecordId))) return [];
    representedIds.add(item.id);
    if (item.sourceRecordId) representedIds.add(item.sourceRecordId);
    const hasTimedOccurrence = (item.timePrecision === 'exact' || item.timePrecision === 'approximate') && !!item.occurredAt;
    let time: string | null = null;
    if (hasTimedOccurrence) {
      try { time = new Date(item.occurredAt!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...(item.timezone ? { timeZone: item.timezone } : {}) }); }
      catch { time = null; }
    }
    return [{
      id: item.id, name: item.payload.description, date: item.localDate!, time,
      occurredAt: hasTimedOccurrence ? item.occurredAt : null,
      timePrecision: item.timePrecision, loggedAt: item.recordedAt, reaction: null,
      preparation: null, sourceKind: 'observation', sourceRecordId: item.sourceRecordId || null,
      revision: item.revision,
    }];
  });
  const meals = [...snapshot.meals, ...observedMeals].sort((a, b) => b.date.localeCompare(a.date) ||
    (b.occurredAt || '').localeCompare(a.occurredAt || '') || (b.loggedAt || '').localeCompare(a.loggedAt || ''));
  const undatedMealObservations: Observation[] = [];
  for (const item of active) {
    if (item.payload.kind !== 'meal' || representedIds.has(item.id) || (item.sourceRecordId && representedIds.has(item.sourceRecordId))) continue;
    undatedMealObservations.push(item);
    representedIds.add(item.id);
  }
  const datedDigestion = new Set(snapshot.days.map((day) => day.date));
  for (const item of active) {
    if (item.localDate && item.payload.kind !== 'meal' && item.payload.kind !== 'context' && validDate(item.localDate)) datedDigestion.add(item.localDate);
  }
  return { ...snapshot, meals, todayMeals: meals.filter((meal) => meal.date === snapshot.today),
    observations: active, digestionDateCount: datedDigestion.size,
    mealRecordCount: meals.length + undatedMealObservations.length, undatedMealObservations };
}

export function formatGutVisitNote(snapshot: GutSnapshot): string {
  const lines = [
    'Gut Health — recorded observations',
    `Prepared: ${snapshot.today}`,
    `Digestion dates with at least one recorded source: ${snapshot.digestionDateCount}`,
    `Meal records: ${snapshot.mealRecordCount} (${snapshot.meals.length} with a valid date for comparison; ${snapshot.undatedMealObservations.length} without a date)`,
    '',
    'Recent digestion records:',
    ...snapshot.days.slice(0, 14).map((day) => `${day.date}: bloating ${day.bloating === null ? 'not recorded' : `${day.bloating}/10`}; discomfort ${day.discomfort === null ? 'not recorded' : `${day.discomfort}/10`}; stool form ${day.stoolForm ?? 'not recorded'}${day.comfort ? `; comfort: ${day.comfort}` : ''}${day.bowelFrequency !== null ? `; bowel movements: ${day.bowelFrequency}` : ''}${day.distensionPattern ? `; distension: ${day.distensionPattern}` : ''}${day.note ? `; note: ${day.note}` : ''}`),
    '',
    'Recent meals:',
    ...snapshot.meals.slice(0, 14).map((meal) => `${meal.date}: ${meal.name}${meal.reaction ? `; user report: ${meal.reaction}` : '; no reaction report'}`),
    '',
    'Meal reports without a date (excluded from dated comparisons):',
    ...snapshot.undatedMealObservations.slice(0, 20).map((item) => item.payload.kind === 'meal' ? `Date not recorded: ${item.payload.description}; ${item.timePrecision} timing; source ${item.id}, revision ${item.revision}; entered ${item.recordedAt}` : ''),
    '',
    'Other saved digestive observations:',
    ...snapshot.observations.filter((item) => item.payload.kind !== 'meal' && item.payload.kind !== 'context').slice(0, 20).map((item) => {
      const date = item.localDate || 'date not recorded';
      const precision = item.timePrecision === 'exact' || item.timePrecision === 'approximate' ? `${item.timePrecision} occurrence ${item.occurredAt}` : `${item.timePrecision} occurrence time`;
      const detail = item.payload.kind === 'symptom' ? `${item.payload.symptom}${item.payload.severity ? ` ${item.payload.severity.value}/${item.payload.severity.max}` : ''}${item.payload.note ? `; ${item.payload.note}` : ''}` :
        item.payload.kind === 'bowel' ? `bowel report${item.payload.bristolType ? `; stool form ${item.payload.bristolType}` : ''}${item.payload.note ? `; ${item.payload.note}` : ''}` :
          item.payload.kind === 'daily_checkin' ? `digestion check-in${item.payload.note ? `; ${item.payload.note}` : ''}` : '';
      return `${date}: ${detail}; ${precision}; source ${item.id}, revision ${item.revision}; entered ${item.recordedAt}`;
    }),
    '',
    'Saved context notes (not proof of exposure or a dose taken):',
    ...snapshot.observations.filter((item) => item.payload.kind === 'context').slice(0, 20).map((item) =>
      `${item.localDate || 'date not recorded'}: ${item.payload.kind === 'context' ? `${item.payload.contextType} note — ${item.payload.description}` : ''}; ${item.timePrecision} timing; source ${item.id}, revision ${item.revision}; entered ${item.recordedAt}`),
    '',
    'Missing dates and fields were not interpreted as symptom-free. These observations cannot establish a food trigger or diagnosis.',
  ];
  return lines.join('\n');
}

/** A literal comparison of recorded bloating ratings; it makes no missing-day assumption. */
export function summarizeRecordedBloating(snapshot: ReturnType<typeof getGutSnapshot>) {
  const end = new Date(`${snapshot.today}T12:00:00`);
  const dates = (from: number, to: number) => {
    const values = new Set<string>();
    for (let offset = from; offset <= to; offset += 1) {
      const day = new Date(end);
      day.setDate(day.getDate() - offset);
      values.add(`${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`);
    }
    return values;
  };
  const currentDates = dates(0, 6);
  const previousDates = dates(7, 13);
  const current = snapshot.days.filter((day) => currentDates.has(day.date) && day.bloating !== null).map((day) => day.bloating as number);
  const previous = snapshot.days.filter((day) => previousDates.has(day.date) && day.bloating !== null).map((day) => day.bloating as number);
  const average = (values: number[]) => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10 : null;
  return { current: { count: current.length, average: average(current) }, previous: { count: previous.length, average: average(previous) },
    comparable: current.length >= 3 && previous.length >= 3 };
}
