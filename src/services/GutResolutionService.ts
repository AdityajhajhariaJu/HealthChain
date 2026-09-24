import { getProfile, getProfileEngineState, getProfileKey, saveProfile } from './ProfileEngine';
import { captureObservationScope, createObservation, listObservations, reviseObservation } from './HealthObservationService';
import { getAccountScope } from './RunContext';
import type { Answer, Observation } from '../domain/observations/types';
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
  reviewedEvidence: { fingerprint: string; support: number; tension: number; unknown: number; at: string } | null;
  decision?: GutDecisionPlan | null;
  createdAt: string;
  updatedAt: string;
}

export interface GutEvidenceOccasion {
  meal: GutMeal;
  answer: Answer;
  answerSource: Observation | null;
  sameDay: GutDay | null;
  otherMeals: GutMeal[];
}

export interface GutEvidence {
  occasions: GutEvidenceOccasion[];
  support: number;
  tension: number;
  unknown: number;
  fingerprint: string;
  nextQuestion: string;
  answer: string;
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
  const now = new Date().toISOString();
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

export function deriveGutEvidence(thread: GutQuestionThread, snapshot: { meals: GutMeal[]; days: GutDay[] }, observations: Observation[]): GutEvidence {
  const focus = normalize(thread.focus);
  const candidates = focus ? snapshot.meals.filter((meal) => normalize(meal.name).includes(focus) && !thread.excludedMealIds.includes(meal.id)) : [];
  const current = scope();
  const scoped = observations.filter((item) => item.ownerId === getAccountScope() && item.profileId === current.profileId && !item.deletedAt && item.payload.kind === 'daily_checkin');
  const occasions: GutEvidenceOccasion[] = candidates.map((meal) => {
    const reports = scoped.filter((item) => item.sourceRecordId === meal.id && item.localDate === meal.date && item.payload.kind === 'daily_checkin' && item.payload.answers[thread.symptom]);
    reports.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const report = reports[0] || null;
    const answer = report?.payload.kind === 'daily_checkin' ? report.payload.answers[thread.symptom] || 'unanswered' : 'unanswered';
    return {
      meal, answer, answerSource: report,
      sameDay: snapshot.days.find((day) => day.date === meal.date) || null,
      otherMeals: snapshot.meals.filter((other) => other.date === meal.date && other.id !== meal.id).slice(0, 4),
    };
  });
  const support = occasions.filter((item) => item.answer === 'yes').length;
  const tension = occasions.filter((item) => item.answer === 'no').length;
  const unknown = occasions.filter((item) => item.answer === 'unanswered').length;
  const fingerprint = JSON.stringify(occasions.map(({ meal, answer, answerSource }) => [meal.id, meal.date, meal.name, meal.reaction, answer, answerSource?.id, answerSource?.revision]));
  const label = symptomLabel[thread.symptom];
  let answer = 'Choose a recorded meal or phrase to examine. A question can still be saved without prior records.';
  if (focus && occasions.length === 0) answer = `No recorded meal names match “${thread.focus}” yet. This does not mean it was never eaten.`;
  else if (occasions.length && support + tension === 0) answer = `${occasions.length} matching occasion${occasions.length === 1 ? '' : 's'} recorded. None has an explicit ${label} answer linked to that meal, so the records cannot test this idea yet.`;
  else if (support && tension) answer = `${support} linked report${support === 1 ? '' : 's'} of ${label} and ${tension} explicit report${tension === 1 ? '' : 's'} without it. The record is mixed; it cannot identify a cause.`;
  else if (support) answer = `${support} linked report${support === 1 ? '' : 's'} of ${label}${unknown ? `, with ${unknown} outcome${unknown === 1 ? '' : 's'} unknown` : ''}. This association alone cannot identify a cause.`;
  else if (tension) answer = `${tension} explicit report${tension === 1 ? '' : 's'} without ${label}${unknown ? `, with ${unknown} outcome${unknown === 1 ? '' : 's'} unknown` : ''}. This does not prove the meal is safe in every setting.`;
  const nextQuestion = unknown > 0 ? `If you remember a recent occasion clearly, was ${label} present with that meal? “Not sure” is a valid answer.`
    : 'What was different between these occasions? Recipe, portion and other meals are not confirmed from a name alone.';
  return { occasions, support, tension, unknown, fingerprint, nextQuestion, answer };
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
