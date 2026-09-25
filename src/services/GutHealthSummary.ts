import { getDigestionLogs, getProfile } from './ProfileEngine';

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
export function getGutSnapshot(now = new Date()) {
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
      };
    })
    .filter((meal: GutMeal) => validDate(meal.date) && meal.date <= today)
    .sort((a: GutMeal, b: GutMeal) => b.date.localeCompare(a.date));

  return { today, days, meals, todayDay: days.find((day) => day.date === today) || null,
    todayMeals: meals.filter((meal) => meal.date === today) };
}

export function formatGutVisitNote(snapshot: ReturnType<typeof getGutSnapshot>): string {
  const lines = [
    'Gut Health — recorded observations',
    `Prepared: ${snapshot.today}`,
    `Digestion dates recorded: ${snapshot.days.length}`,
    `Meals recorded: ${snapshot.meals.length}`,
    '',
    'Recent digestion records:',
    ...snapshot.days.slice(0, 14).map((day) => `${day.date}: bloating ${day.bloating === null ? 'not recorded' : `${day.bloating}/10`}; discomfort ${day.discomfort === null ? 'not recorded' : `${day.discomfort}/10`}; stool form ${day.stoolForm ?? 'not recorded'}${day.comfort ? `; comfort: ${day.comfort}` : ''}${day.bowelFrequency !== null ? `; bowel movements: ${day.bowelFrequency}` : ''}${day.distensionPattern ? `; distension: ${day.distensionPattern}` : ''}${day.note ? `; note: ${day.note}` : ''}`),
    '',
    'Recent meals:',
    ...snapshot.meals.slice(0, 14).map((meal) => `${meal.date}: ${meal.name}${meal.reaction ? `; user report: ${meal.reaction}` : '; no reaction report'}`),
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
