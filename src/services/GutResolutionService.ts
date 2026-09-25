import { getProfile, getProfileEngineState, getProfileKey, saveProfile } from './ProfileEngine';
import { captureObservationScope, createObservation, listObservations, reviseObservation } from './HealthObservationService';
import { getAccountScope } from './RunContext';
import type { Answer, Observation } from '../domain/observations/types';
import type { TimePrecision } from '../domain/observations/types';
import type { GutDay, GutMeal } from './GutHealthSummary';

export type GutIntent = 'understand' | 'decide' | 'now' | 'care';
export type GutSymptom = 'bloating' | 'discomfort' | 'reflux' | 'nausea' | 'bowel_changes';

export interface GutDecisionPlan {
  priority: string;
  options: { a: { label: string; mealName: string }; b: { label: string; mealName: string } };
  chosen: 'a' | 'b' | null;
  chosenAt: string | null;
  outcome: string | null;
  outcomeAt: string | null;
}

export interface GutQuestionThread {
  id: string;
  schemaVersion: 1;
  ownerKey: string;
  profileId: string;
  intent: GutIntent;
  question: string;
  focus: string;
  symptom: GutSymptom;
  status: 'open' | 'closed';
  selectedStep: string | null;
  reflection: string | null;
  excludedMealIds: string[];
  reviewedEvidence: GutReviewSnapshot | null;
  decision?: GutDecisionPlan | null;
  createdAt: string;
  updatedAt: string;
}

export interface GutEvidenceOccasion {
  meal: GutMeal;
  answer: Answer;
  answerSource: Observation | null;
  answerOrigin: 'canonical' | 'meal_reaction' | 'both' | 'conflict' | 'none';
  mealReactionAnswer: Answer;
  sameDay: GutDay | null;
  otherMeals: GutMeal[];
  alternativeContext: GutAlternativeContext[];
  edge: GutEvidenceEdge;
}

export interface GutAlternativeContext {
  kind: 'other_meal_same_date' | 'recorded_context_same_date';
  sourceId: string;
  revision: number | null;
  timePrecision: TimePrecision;
  label: string;
  contextType?: 'medication' | 'illness' | 'sleep' | 'stress' | 'other';
}

export interface GutEvidenceEdge {
  category: 'support' | 'counterexample' | 'unknown';
  inclusionRule: 'linked_explicit_report' | 'symptom_specific_diet_reaction' | 'concordant_reports' | 'conflicting_reports' | 'no_explicit_answer' | 'unstable_legacy_meal_id';
  mealSource: { id: string; revision: null; timePrecision: TimePrecision };
  answerSources: { kind: 'gut_report' | 'diet_reaction'; id: string; revision: number | null; timePrecision: TimePrecision }[];
}

export interface GutEvidenceBundle {
  support: GutEvidenceEdge[];
  counterexamples: GutEvidenceEdge[];
  unknown: GutEvidenceEdge[];
  alternativeContext: GutAlternativeContext[];
}

export interface GutEvidence {
  occasions: GutEvidenceOccasion[];
  bundle: GutEvidenceBundle;
  support: number;
  tension: number;
  unknown: number;
  conflicts: number;
  fingerprint: string;
  nextQuestion: string;
  nextQuestionMealId: string | null;
  answer: string;
}

export interface GutReviewSnapshot {
  fingerprint: string;
  support: number;
  tension: number;
  unknown: number;
  at: string;
  focus?: string;
  symptom?: GutSymptom;
  occasions?: { id: string; name: string; date: string; answer: Answer; sourceVersion: string }[];
}

export interface GutChangeReceipt {
  changed: boolean;
  comparisonChanged: boolean;
  changes: { mealId: string; label: string; detail: string }[];
  previous: { support: number; tension: number; unknown: number };
  current: { support: number; tension: number; unknown: number };
}

const featureKey = 'gutResolutionThreads';
const id = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `gut-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const clean = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const limit = (value: unknown, max: number) => clean(value).slice(0, max);
const scope = () => ({ ownerKey: getProfileKey(), profileId: getProfileEngineState()?.activeId || 'profile_1' });
/** Older profile meals with no id/loggedAt receive an index fallback that changes when logs reorder. */
export const hasStableGutMealId = (meal: GutMeal): boolean => !!meal.id && !/^meal-\d+$/.test(meal.id);
export const emptyGutDecision = (): GutDecisionPlan => ({ priority: '', options: { a: { label: '', mealName: '' }, b: { label: '', mealName: '' } }, chosen: null, chosenAt: null, outcome: null, outcomeAt: null });
const cleanDecision = (value: GutDecisionPlan): GutDecisionPlan => ({
  priority: limit(value.priority, 160),
  options: {
    a: { label: limit(value.options?.a?.label, 120), mealName: limit(value.options?.a?.mealName, 120) },
    b: { label: limit(value.options?.b?.label, 120), mealName: limit(value.options?.b?.mealName, 120) },
  },
  chosen: value.chosen === 'a' || value.chosen === 'b' ? value.chosen : null,
  chosenAt: value.chosen === 'a' || value.chosen === 'b' ? value.chosenAt || null : null,
  outcome: limit(value.outcome, 1000) || null, outcomeAt: value.outcomeAt || null,
});

/** Keep derived evidence out of storage so source edits cannot leave a frozen claim. */
export function listGutThreads(): GutQuestionThread[] {
  const current = scope();
  const data = getProfile()?.[featureKey];
  return (Array.isArray(data) ? data : [])
    .filter((item): item is GutQuestionThread => item?.schemaVersion === 1 && item?.ownerKey === current.ownerKey && item?.profileId === current.profileId && typeof item?.id === 'string' && typeof item?.updatedAt === 'string' && typeof item?.question === 'string' && Array.isArray(item?.excludedMealIds) && ['understand', 'decide', 'now', 'care'].includes(item?.intent) && ['bloating', 'discomfort', 'reflux', 'nausea', 'bowel_changes'].includes(item?.symptom))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function writeThreads(threads: GutQuestionThread[]): Promise<boolean> {
  const current = scope();
  if (threads.some((item) => item.ownerKey !== current.ownerKey || item.profileId !== current.profileId)) return false;
  const profile = getProfile();
  profile[featureKey] = threads;
  await saveProfile(profile);
  if (scope().ownerKey !== current.ownerKey || scope().profileId !== current.profileId) return false;
  return threads.every((thread) => getProfile()?.[featureKey]?.some((saved: GutQuestionThread) => saved.id === thread.id && saved.updatedAt === thread.updatedAt));
}

export async function createGutThread(input: { intent: GutIntent; question: string; focus?: string; symptom?: GutSymptom }): Promise<GutQuestionThread | null> {
  const question = clean(input.question).slice(0, 500);
  if (!question || !['understand', 'decide', 'now', 'care'].includes(input.intent)) return null;
  const current = scope();
  const now = new Date().toISOString();
  const thread: GutQuestionThread = {
    id: id(), schemaVersion: 1, ...current, intent: input.intent, question,
    focus: clean(input.focus).slice(0, 120), symptom: input.symptom || 'bloating', status: 'open',
    selectedStep: null, reflection: null, excludedMealIds: [], reviewedEvidence: null,
    decision: input.intent === 'decide' ? emptyGutDecision() : null,
    createdAt: now, updatedAt: now,
  };
  return await writeThreads([thread, ...listGutThreads()]) ? thread : null;
}

export async function updateGutThread(threadId: string, patch: Partial<Pick<GutQuestionThread, 'focus' | 'symptom' | 'status' | 'selectedStep' | 'reflection' | 'excludedMealIds' | 'reviewedEvidence' | 'decision'>>): Promise<GutQuestionThread | null> {
  const threads = listGutThreads();
  const original = threads.find((item) => item.id === threadId);
  if (!original) return null;
  // A rapid second edit still needs a later record timestamp for cross-device merging.
  const now = new Date(Math.max(Date.now(), Date.parse(original.updatedAt) + 1)).toISOString();
  const updated: GutQuestionThread = {
    ...original, ...patch,
    focus: patch.focus === undefined ? original.focus : clean(patch.focus).slice(0, 120),
    reflection: patch.reflection === undefined ? original.reflection : clean(patch.reflection).slice(0, 1000) || null,
    selectedStep: patch.selectedStep === undefined ? original.selectedStep : clean(patch.selectedStep).slice(0, 300) || null,
    excludedMealIds: patch.excludedMealIds === undefined ? original.excludedMealIds : [...new Set(patch.excludedMealIds)].slice(0, 200),
    decision: patch.decision === undefined ? original.decision : patch.decision === null ? null : cleanDecision(patch.decision),
    updatedAt: now,
  };
  return await writeThreads(threads.map((item) => item.id === threadId ? updated : item)) ? updated : null;
}

/** An exact saved name is a memory cue, never a prediction or safety verdict. */
export function deriveGutChoiceHistory(thread: GutQuestionThread, mealName: string, snapshot: { meals: GutMeal[]; days: GutDay[] }, observations: Observation[]) {
  const exactName = mealName.trim().toLocaleLowerCase();
  if (!exactName) return { matched: 0, withSymptom: 0, withoutSymptom: 0, unknown: 0, sourceIds: [] as string[] };
  const matchedMeals = snapshot.meals.filter((meal) => meal.name.trim().toLocaleLowerCase() === exactName);
  const evidence = deriveGutEvidence({ ...thread, focus: mealName }, { ...snapshot, meals: matchedMeals }, observations);
  return { matched: evidence.occasions.length, withSymptom: evidence.support, withoutSymptom: evidence.tension, unknown: evidence.unknown, sourceIds: evidence.occasions.map((item) => item.meal.id) };
}

const normalize = (value: string) => value.trim().toLocaleLowerCase();
const symptomLabel: Record<GutSymptom, string> = {
  bloating: 'bloating', discomfort: 'abdominal discomfort', reflux: 'reflux', nausea: 'nausea', bowel_changes: 'bowel changes',
};
/** The Diet reaction selector has only two symptom labels specific enough to reuse. */
export function answerFromMealReaction(meal: GutMeal, symptom: GutSymptom): Answer {
  if (meal.reactionType === 'bloat' && symptom === 'bloating') return 'yes';
  if (meal.reactionType === 'heartburn' && symptom === 'reflux') return 'yes';
  return 'unanswered';
}

export function deriveGutEvidence(thread: GutQuestionThread, snapshot: { meals: GutMeal[]; days: GutDay[] }, observations: Observation[]): GutEvidence {
  const focus = normalize(thread.focus);
  const candidates = focus ? snapshot.meals.filter((meal) => normalize(meal.name).includes(focus) && !thread.excludedMealIds.includes(meal.id)) : [];
  const current = scope();
  const scopedObservations = observations.filter((item) => item.ownerId === getAccountScope() && item.profileId === current.profileId && !item.deletedAt);
  const scoped = scopedObservations.filter((item) => item.payload.kind === 'daily_checkin');
  const occasions: GutEvidenceOccasion[] = candidates.map((meal) => {
    const reports = scoped.filter((item) => item.sourceRecordId === meal.id && item.localDate === meal.date && item.payload.kind === 'daily_checkin' && item.payload.answers[thread.symptom]);
    reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const report = reports[0] || null;
    const canonicalAnswer = report?.payload.kind === 'daily_checkin' ? report.payload.answers[thread.symptom] || 'unanswered' : 'unanswered';
    const mealReactionAnswer = answerFromMealReaction(meal, thread.symptom);
    const conflict = canonicalAnswer !== 'unanswered' && mealReactionAnswer !== 'unanswered' && canonicalAnswer !== mealReactionAnswer;
    const unstableId = !hasStableGutMealId(meal);
    const answer = unstableId || conflict ? 'unanswered' : canonicalAnswer !== 'unanswered' ? canonicalAnswer : mealReactionAnswer;
    const answerOrigin: GutEvidenceOccasion['answerOrigin'] = conflict ? 'conflict' : canonicalAnswer !== 'unanswered' && mealReactionAnswer !== 'unanswered' ? 'both' : canonicalAnswer !== 'unanswered' ? 'canonical' : mealReactionAnswer !== 'unanswered' ? 'meal_reaction' : 'none';
    const answerSources: GutEvidenceEdge['answerSources'] = [];
    if (report && canonicalAnswer !== 'unanswered') answerSources.push({ kind: 'gut_report', id: report.id, revision: report.revision, timePrecision: report.timePrecision });
    // Diet records when the reaction was entered, not when the symptom began.
    if (mealReactionAnswer !== 'unanswered') answerSources.push({ kind: 'diet_reaction', id: meal.id, revision: null, timePrecision: 'date_only' });
    const inclusionRule: GutEvidenceEdge['inclusionRule'] = unstableId ? 'unstable_legacy_meal_id' : conflict ? 'conflicting_reports'
      : canonicalAnswer !== 'unanswered' && mealReactionAnswer !== 'unanswered' ? 'concordant_reports'
        : canonicalAnswer !== 'unanswered' ? 'linked_explicit_report'
          : mealReactionAnswer !== 'unanswered' ? 'symptom_specific_diet_reaction' : 'no_explicit_answer';
    const edge: GutEvidenceEdge = {
      category: answer === 'yes' ? 'support' : answer === 'no' ? 'counterexample' : 'unknown',
      inclusionRule,
      mealSource: { id: meal.id, revision: null, timePrecision: meal.loggedAt ? 'exact' : 'date_only' },
      answerSources,
    };
    const otherMeals = snapshot.meals.filter((other) => other.date === meal.date && other.id !== meal.id);
    const alternativeContext: GutAlternativeContext[] = [
      ...otherMeals.map((other): GutAlternativeContext => ({
        kind: 'other_meal_same_date', sourceId: other.id, revision: null,
        timePrecision: other.loggedAt ? 'exact' : 'date_only', label: other.name,
      })),
      ...scopedObservations.filter((item) => item.localDate === meal.date && item.payload.kind === 'context')
        .map((item): GutAlternativeContext => ({
          kind: 'recorded_context_same_date', sourceId: item.id, revision: item.revision,
          timePrecision: item.timePrecision,
          label: item.payload.kind === 'context' ? item.payload.description : '',
          contextType: item.payload.kind === 'context' ? item.payload.contextType : 'other',
        })),
    ];
    return {
      meal, answer, answerSource: report, answerOrigin, mealReactionAnswer,
      sameDay: snapshot.days.find((day) => day.date === meal.date) || null,
      otherMeals,
      alternativeContext,
      edge,
    };
  });
  const alternativeContext = [...new Map(occasions.flatMap((item) => item.alternativeContext)
    .map((item) => [`${item.kind}:${item.sourceId}`, item])).values()];
  const bundle: GutEvidenceBundle = {
    support: occasions.filter((item) => item.edge.category === 'support').map((item) => item.edge),
    counterexamples: occasions.filter((item) => item.edge.category === 'counterexample').map((item) => item.edge),
    unknown: occasions.filter((item) => item.edge.category === 'unknown').map((item) => item.edge),
    alternativeContext,
  };
  const support = bundle.support.length;
  const tension = bundle.counterexamples.length;
  const unknown = bundle.unknown.length;
  const conflicts = occasions.filter((item) => item.answerOrigin === 'conflict').length;
  const unstable = occasions.filter((item) => item.edge.inclusionRule === 'unstable_legacy_meal_id').length;
  const fingerprint = JSON.stringify([thread.focus, thread.symptom, thread.excludedMealIds, occasions.map(({ meal, answer, answerSource, edge, sameDay, alternativeContext }) => [meal.id, meal.date, meal.loggedAt, meal.name, meal.reaction, meal.reactionType, meal.reactionRecordedAt, answer, answerSource?.id, answerSource?.revision, edge.inclusionRule, sameDay, alternativeContext])]);
  const label = symptomLabel[thread.symptom];
  let answer = 'Choose a recorded meal or phrase to examine. A question can still be saved without prior records.';
  if (focus && occasions.length === 0) answer = `No recorded meal names match “${thread.focus}” yet. This does not mean it was never eaten.`;
  else if (conflicts) answer = `${conflicts} matching occasion${conflicts === 1 ? ' has' : 's have'} disagreeing meal-linked reports. ${support} other report${support === 1 ? '' : 's'} with ${label}, ${tension} without and ${unknown - conflicts} unresolved. Review the sources before drawing a conclusion.`;
  else if (occasions.length && support + tension === 0) answer = unstable
    ? `${occasions.length} matching occasion${occasions.length === 1 ? '' : 's'} recorded. ${unstable} older meal record${unstable === 1 ? ' has' : 's have'} no stable source ID, so its report cannot be counted reliably. The records cannot test this idea yet.`
    : `${occasions.length} matching occasion${occasions.length === 1 ? '' : 's'} recorded. None has an explicit ${label} answer linked to that meal, so the records cannot test this idea yet.`;
  else if (support && tension) answer = `${support} linked report${support === 1 ? '' : 's'} of ${label} and ${tension} explicit report${tension === 1 ? '' : 's'} without it. The record is mixed; it cannot identify a cause.`;
  else if (support) answer = `${support} linked report${support === 1 ? '' : 's'} of ${label}${unknown ? `, with ${unknown} outcome${unknown === 1 ? '' : 's'} unknown` : ''}. This association alone cannot identify a cause.`;
  else if (tension) answer = `${tension} explicit report${tension === 1 ? '' : 's'} without ${label}${unknown ? `, with ${unknown} outcome${unknown === 1 ? '' : 's'} unknown` : ''}. This does not prove the meal is safe in every setting.`;
  const nextQuestionOccasion = conflicts || (support > 0 && tension > 0) ? null
    : occasions.find((item) => item.answer === 'unanswered' && item.edge.inclusionRule === 'no_explicit_answer' && hasStableGutMealId(item.meal)) || null;
  const nextQuestion = conflicts ? 'Two reports about the same occasion disagree. Inspect their source and correct the record you trust.'
    : support > 0 && tension > 0 ? 'The record is already mixed. More tracking is optional; recipe and portion differences remain unverified.'
      : nextQuestionOccasion ? `For ${nextQuestionOccasion.meal.name} on ${nextQuestionOccasion.meal.date}, do you clearly remember whether ${label} was present? “Not sure” or leaving it open is valid.`
        : unstable === unknown && unknown > 0 ? 'These older meal records cannot support a reliably linked answer. You can leave this question open.'
          : 'No single missing report would settle this. You can leave the question open or discuss it with a clinician.';
  return { occasions, bundle, support, tension, unknown, conflicts, fingerprint, nextQuestion, nextQuestionMealId: nextQuestionOccasion?.meal.id || null, answer };
}

const reviewOccasion = (item: GutEvidenceOccasion) => ({
  id: item.meal.id,
  name: item.meal.name,
  date: item.meal.date,
  answer: item.answer,
  sourceVersion: JSON.stringify([item.meal.loggedAt, item.meal.reaction, item.meal.reactionType, item.meal.reactionRecordedAt, item.answerSource?.id, item.answerSource?.revision, item.edge.inclusionRule, item.sameDay, item.alternativeContext, 'gut-edge-v2']),
});

function describeGutSourceChange(previous: string, current: string, mealId: string): string {
  try {
    const old = JSON.parse(previous);
    const next = JSON.parse(current);
    if (!Array.isArray(old) || !Array.isArray(next) || old[9] !== 'gut-edge-v2' || next[9] !== 'gut-edge-v2') throw new Error('Earlier snapshot format');
    if (old[4] !== next[4] || old[5] !== next[5]) return `Gut report ${next[4] || old[4] || mealId} was added, removed or revised`;
    if (old[1] !== next[1] || old[2] !== next[2] || old[3] !== next[3]) return `Diet reaction on meal ${mealId} changed`;
    if (JSON.stringify(old[8]) !== JSON.stringify(next[8])) {
      const prior = new Map<string, string>((Array.isArray(old[8]) ? old[8] : []).map((item: GutAlternativeContext): [string, string] => [`${item.kind}:${item.sourceId}`, JSON.stringify(item)]));
      const latest = new Map<string, string>((Array.isArray(next[8]) ? next[8] : []).map((item: GutAlternativeContext): [string, string] => [`${item.kind}:${item.sourceId}`, JSON.stringify(item)]));
      const source = [...new Set([...prior.keys(), ...latest.keys()])].find((id) => prior.get(id) !== latest.get(id));
      return `Same-date context changed${source ? ` (source ${source.split(':').slice(1).join(':')})` : ''}`;
    }
    if (JSON.stringify(old[7]) !== JSON.stringify(next[7])) return 'Same-date digestion record changed';
    if (old[6] !== next[6]) return 'Counting rule changed';
    if (old[0] !== next[0]) return 'Saved meal time changed';
  } catch { /* Older snapshots still get a truthful generic change notice. */ }
  return 'A linked source or context changed; the reported outcome is unchanged';
}

function outcomeChangeSource(version: string, mealId: string): string {
  try {
    const data = JSON.parse(version);
    if (Array.isArray(data) && typeof data[4] === 'string' && data[4]) return data[4];
  } catch { /* Use the meal source for older snapshots. */ }
  return mealId;
}

export function makeGutReviewSnapshot(thread: GutQuestionThread, evidence: GutEvidence, at = new Date().toISOString()): GutReviewSnapshot {
  return { fingerprint: evidence.fingerprint, support: evidence.support, tension: evidence.tension, unknown: evidence.unknown, at,
    focus: thread.focus, symptom: thread.symptom, occasions: evidence.occasions.map(reviewOccasion) };
}

/** Describes source changes without turning count changes into a causal or safety verdict. */
export function deriveGutChangeReceipt(previous: GutReviewSnapshot, thread: GutQuestionThread, evidence: GutEvidence): GutChangeReceipt {
  const current = { support: evidence.support, tension: evidence.tension, unknown: evidence.unknown };
  const oldCounts = { support: previous.support, tension: previous.tension, unknown: previous.unknown };
  const changed = previous.fingerprint !== evidence.fingerprint;
  const comparisonChanged = previous.focus !== undefined && (previous.focus !== thread.focus || previous.symptom !== thread.symptom);
  const reviewedOccasions = Array.isArray(previous.occasions) ? previous.occasions.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.sourceVersion === 'string') : null;
  const oldItems = new Map((reviewedOccasions || []).map((item) => [item.id, item]));
  const newItems = new Map(evidence.occasions.map((item) => [item.meal.id, reviewOccasion(item)]));
  const changes: GutChangeReceipt['changes'] = [];
  for (const [id, item] of newItems) {
    if (!reviewedOccasions) break;
    const old = oldItems.get(id);
    if (!old) changes.push({ mealId: id, label: item.name, detail: 'New matching occasion in your records' });
    else if (old.answer !== item.answer || old.sourceVersion !== item.sourceVersion) changes.push({ mealId: id, label: item.name, detail: old.answer !== item.answer ? `Reported outcome changed from ${old.answer === 'unanswered' ? 'unknown' : old.answer} to ${item.answer === 'unanswered' ? 'unknown' : item.answer} (source ${outcomeChangeSource(item.sourceVersion, id)})` : describeGutSourceChange(old.sourceVersion, item.sourceVersion, id) });
  }
  for (const [id, item] of oldItems) if (!newItems.has(id)) changes.push({ mealId: id, label: item.name, detail: 'No longer included in this comparison' });
  return { changed, comparisonChanged, changes, previous: oldCounts, current };
}

export async function recordGutMealOutcome(meal: GutMeal, symptom: GutSymptom, answer: 'yes' | 'no') {
  const observationScope = await captureObservationScope();
  if (!observationScope || !hasStableGutMealId(meal)) return { ok: false as const, error: 'A stable saved meal and active profile are required.' };
  const existing = (await listObservations()).find((item) => item.sourceRecordId === meal.id && item.localDate === meal.date && item.payload.kind === 'daily_checkin' && Object.prototype.hasOwnProperty.call(item.payload.answers, symptom));
  const draft = {
    ...observationScope,
    payload: { kind: 'daily_checkin' as const, localDate: meal.date, answers: { ...(existing?.payload.kind === 'daily_checkin' ? existing.payload.answers : {}), [symptom]: answer } },
    occurredAt: null, localDate: meal.date, timezone: null, timePrecision: 'date_only' as const,
    source: 'gut' as const, evidenceType: 'user_report' as const, sourceRecordId: meal.id,
    idempotencyKey: existing?.idempotencyKey || `gut-meal-outcome:${meal.id}:${symptom}`,
  };
  return existing ? reviseObservation(existing.id, existing.revision, draft) : createObservation(draft);
}
