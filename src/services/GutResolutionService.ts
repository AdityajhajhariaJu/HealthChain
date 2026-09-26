import { getProfile, getProfileEngineState, getProfileKey, saveProfile } from './ProfileEngine';
import { captureObservationScope, createObservation, listObservations, reviseObservation } from './HealthObservationService';
import { getAccountScope } from './RunContext';
import type { Answer, Observation } from '../domain/observations/types';
import type { TimePrecision } from '../domain/observations/types';
import type { GutDay, GutMeal } from './GutHealthSummary';

export type GutIntent = 'understand' | 'decide' | 'now' | 'care';
export type GutSymptom = 'unspecified' | 'bloating' | 'discomfort' | 'reflux' | 'nausea' | 'bowel_changes';
export const GUT_CONCLUSION_VERSION = 1 as const;

export interface GutDecisionPlan {
  priority: string;
  options: { a: { label: string; mealName: string }; b: { label: string; mealName: string } };
  chosen: 'a' | 'b' | null;
  chosenAt: string | null;
  outcome: string | null;
  outcomeAt: string | null;
  actualMealId?: string | null;
}

export interface GutQuestionThread {
  id: string;
  schemaVersion: 1;
  /** Version of deterministic conclusion rules; old threads read as version 1. */
  conclusionVersion?: typeof GUT_CONCLUSION_VERSION;
  ownerKey: string;
  profileId: string;
  intent: GutIntent;
  question: string;
  focus: string;
  symptom: GutSymptom;
  /** User-confirmed generic search concept; never a raw private narrative. */
  researchConcept?: string;
  researchTopic?: 'food' | 'caffeine' | 'dairy' | 'meal_timing';
  status: 'open' | 'closed';
  selectedStep: string | null;
  reflection: string | null;
  excludedMealIds: string[];
  reviewedEvidence: GutReviewSnapshot | null;
  reviewedResearch?: { at: string; topic: string; sources: { id: string; title: string; correctionNotice: string | null; publicationDate: string | null; status: 'active' | 'corrected' | 'retracted' | 'unavailable' }[] } | null;
  /** User-requested Gemini reading, tied to the exact personal evidence fingerprint shown. */
  gutSynthesis?: GutSynthesis | null;
  clarifications?: Array<{ question: string; answer: string }>;
  decision?: GutDecisionPlan | null;
  /** User-entered occurrence time. Never inferred from the question save time. */
  symptomOnset?: { occurredAt: string; precision: 'exact' | 'approximate' } | null;
  createdAt: string;
  updatedAt: string;
}

export interface GutSynthesis {
  at: string;
  promptVersion: string;
  evidenceFingerprint: string;
  researchTopic: string;
  researchIds: string[];
  headline: string;
  personalReading: string;
  personalSourceIds: string[];
  researchReading: string;
  researchSourceIds: string[];
  connectionReading: string;
  uncertainties: string[];
  nextAction: 'review_records' | 'open_research' | 'add_report' | 'prepare_care_question' | 'leave_open';
  nextReason: string;
  followUpQuestion?: string;
  followUpWhy?: string;
  supportingQuotes?: Array<{ sourceId: string; quote: string }>;
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
  mealSource: { id: string; revision: number | null; sourceKind: 'diet_meal' | 'observation'; timePrecision: TimePrecision };
  answerSources: { kind: 'gut_report' | 'diet_reaction'; id: string; revision: number | null; timePrecision: TimePrecision }[];
}

export interface GutEvidenceBundle {
  support: GutEvidenceEdge[];
  counterexamples: GutEvidenceEdge[];
  unknown: GutEvidenceEdge[];
  alternativeContext: GutAlternativeContext[];
  nameVariants: GutNameVariant[];
}

export interface GutNameVariant {
  name: string;
  preparation?: string;
  sourceIds: string[];
  support: number;
  counterexamples: number;
  unknown: number;
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

export interface GutBacktraceItem {
  id: string;
  kind: 'meal' | 'medication' | 'context' | 'digestion';
  label: string;
  detail?: string;
  occurredAt: string;
  localDate: string;
  sourceLocalDate?: string;
  hoursPrior: number;
  timePrecision: 'exact' | 'approximate';
  timeMeaning: 'user_reported_occurrence';
  sourceKind: 'diet_meal' | 'observation';
  sourceId: string;
  revision: number | null;
  reportedAt: string | null;
  sourceRecordId?: string;
}

export interface GutBacktraceDateOnlyItem {
  id: string;
  kind: 'meal' | 'medication' | 'context' | 'digestion';
  label: string;
  detail?: string;
  localDate: string;
  sourceKind: 'diet_meal' | 'observation' | 'daily_digest';
  sourceId: string;
  revision: number | null;
  reportedAt: string | null;
  sourceRecordId?: string;
}

export interface GutBacktraceProjection {
  anchorTimestamp: string;
  anchorType: 'symptom_onset' | 'question_time';
  anchorTimezone: string;
  anchorSymptom?: GutSymptom;
  windowHours: 48;
  timedItems: GutBacktraceItem[];
  dateOnlyItems: GutBacktraceDateOnlyItem[];
  summary: string;
  caveat: string;
}

export type GutAnswerState =
  | 'no_records'
  | 'needs_symptom'
  | 'needs_one_fact'
  | 'date_only'
  | 'reliable_timed'
  | 'conflicts'
  | 'single_confirmed'
  | 'mixed_counterexample'
  | 'now_acute'
  | 'decision_recorded'
  | 'visit_ready'
  | 'source_changed'
  | 'research_outage'
  | 'account_sync_error';

export interface DeterministicIntentResolution {
  intent: GutIntent;
  inferredFocus: string;
  inferredSymptom: GutSymptom;
  options?: { a: string; b: string };
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
  outcome: value.chosen === 'a' || value.chosen === 'b' ? limit(value.outcome, 1000) || null : null,
  outcomeAt: value.chosen === 'a' || value.chosen === 'b' ? value.outcomeAt || null : null,
  actualMealId: value.chosen === 'a' || value.chosen === 'b' ? limit(value.actualMealId, 160) || null : null,
});
const cleanClarifications = (value: unknown): Array<{ question: string; answer: string }> => Array.isArray(value) ? value.filter(item => item && typeof item.question === 'string' && typeof item.answer === 'string').slice(-3).map(item => ({ question: limit(item.question, 180), answer: limit(item.answer, 500) })) : [];
const cleanGutSynthesis = (value: unknown): GutSynthesis | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Partial<GutSynthesis>;
  const actions: GutSynthesis['nextAction'][] = ['review_records', 'open_research', 'add_report', 'prepare_care_question', 'leave_open'];
  const at = typeof source.at === 'string' && !Number.isNaN(Date.parse(source.at)) ? new Date(source.at).toISOString() : '';
  if (!at || typeof source.headline !== 'string' || typeof source.personalReading !== 'string' || typeof source.researchReading !== 'string') return null;
  const cleanIds = (ids: unknown, max: number) => Array.isArray(ids) ? [...new Set(ids.filter((id): id is string => typeof id === 'string').map((id) => limit(id, 180)).filter(Boolean))].slice(0, max) : [];
  return {
    at,
    promptVersion: limit(source.promptVersion, 40),
    evidenceFingerprint: limit(source.evidenceFingerprint, 240),
    researchTopic: limit(source.researchTopic, 40),
    researchIds: Array.isArray(source.researchIds) ? [...new Set(source.researchIds.filter((id): id is string => typeof id === 'string' && /^\d+$/.test(id)))].slice(0, 8) : [],
    headline: limit(source.headline, 180),
    personalReading: limit(source.personalReading, 900),
    personalSourceIds: cleanIds(source.personalSourceIds, 16),
    researchReading: limit(source.researchReading, 900),
    researchSourceIds: cleanIds(source.researchSourceIds, 8),
    connectionReading: limit(source.connectionReading, 600),
    uncertainties: Array.isArray(source.uncertainties) ? source.uncertainties.filter((item): item is string => typeof item === 'string').map((item) => limit(item, 220)).filter(Boolean).slice(0, 5) : [],
    nextAction: actions.includes(source.nextAction as GutSynthesis['nextAction']) ? source.nextAction as GutSynthesis['nextAction'] : 'leave_open',
    nextReason: limit(source.nextReason, 260),
    followUpQuestion: limit(source.followUpQuestion, 180),
    followUpWhy: limit(source.followUpWhy, 220),
    supportingQuotes: Array.isArray(source.supportingQuotes) ? source.supportingQuotes.filter(item => item && typeof item.sourceId === 'string' && typeof item.quote === 'string').slice(0, 8).map(item => ({ sourceId: limit(item.sourceId, 180), quote: limit(item.quote, 220) })) : [],
  };
};

/** Keep deterministic evidence out of storage; the optional AI brief carries a fingerprint and goes stale when its sources change. */
export function listGutThreads(): GutQuestionThread[] {
  const current = scope();
  const data = getProfile()?.[featureKey];
  return (Array.isArray(data) ? data : [])
    .filter((item): item is GutQuestionThread => item?.schemaVersion === 1 && item?.ownerKey === current.ownerKey && item?.profileId === current.profileId && typeof item?.id === 'string' && typeof item?.updatedAt === 'string' && typeof item?.question === 'string' && Array.isArray(item?.excludedMealIds) && ['understand', 'decide', 'now', 'care'].includes(item?.intent) && ['unspecified', 'bloating', 'discomfort', 'reflux', 'nausea', 'bowel_changes'].includes(item?.symptom))
    .map((item) => ({ ...item, conclusionVersion: GUT_CONCLUSION_VERSION, researchConcept: limit(item.researchConcept, 60), researchTopic: typeof item.researchTopic === 'string' && ['food', 'caffeine', 'dairy', 'meal_timing'].includes(item.researchTopic) ? item.researchTopic : undefined, clarifications: cleanClarifications(item.clarifications), gutSynthesis: cleanGutSynthesis(item.gutSynthesis) }))
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

export async function createGutThread(input: { intent: GutIntent; question: string; focus?: string; symptom?: GutSymptom; researchConcept?: string; researchTopic?: GutQuestionThread['researchTopic'] }): Promise<GutQuestionThread | null> {
  const question = clean(input.question).slice(0, 500);
  if (!question || !['understand', 'decide', 'now', 'care'].includes(input.intent)) return null;
  const current = scope();
  const now = new Date().toISOString();
  const thread: GutQuestionThread = {
    id: id(), schemaVersion: 1, conclusionVersion: GUT_CONCLUSION_VERSION, ...current, intent: input.intent, question,
    focus: clean(input.focus).slice(0, 120), symptom: input.symptom || 'unspecified', researchConcept: limit(input.researchConcept, 60), researchTopic: input.researchTopic, status: 'open',
    selectedStep: null, reflection: null, excludedMealIds: [], reviewedEvidence: null,
    decision: input.intent === 'decide' ? emptyGutDecision() : null,
    createdAt: now, updatedAt: now,
  };
  return await writeThreads([thread, ...listGutThreads()]) ? thread : null;
}

export async function updateGutThread(threadId: string, patch: Partial<Pick<GutQuestionThread, 'focus' | 'symptom' | 'researchConcept' | 'researchTopic' | 'status' | 'selectedStep' | 'reflection' | 'excludedMealIds' | 'reviewedEvidence' | 'reviewedResearch' | 'gutSynthesis' | 'clarifications' | 'decision' | 'symptomOnset'>>): Promise<GutQuestionThread | null> {
  const threads = listGutThreads();
  const original = threads.find((item) => item.id === threadId);
  if (!original) return null;
  // A rapid second edit still needs a later record timestamp for cross-device merging.
  const now = new Date(Math.max(Date.now(), Date.parse(original.updatedAt) + 1)).toISOString();
  const updated: GutQuestionThread = {
    ...original, ...patch,
    clarifications: cleanClarifications(patch.clarifications ?? original.clarifications),
    focus: patch.focus === undefined ? original.focus : clean(patch.focus).slice(0, 120),
    researchConcept: patch.researchConcept === undefined ? original.researchConcept : limit(patch.researchConcept, 60),
    researchTopic: patch.researchTopic === undefined ? original.researchTopic : patch.researchTopic,
    reflection: patch.reflection === undefined ? original.reflection : clean(patch.reflection).slice(0, 1000) || null,
    selectedStep: patch.selectedStep === undefined ? original.selectedStep : clean(patch.selectedStep).slice(0, 300) || null,
    excludedMealIds: patch.excludedMealIds === undefined ? original.excludedMealIds : [...new Set(patch.excludedMealIds)].slice(0, 200),
    decision: patch.decision === undefined ? original.decision : patch.decision === null ? null : cleanDecision(patch.decision),
    reviewedResearch: patch.reviewedResearch === undefined ? original.reviewedResearch : patch.reviewedResearch === null ? null : {
      at: new Date().toISOString(), topic: limit(patch.reviewedResearch.topic, 40),
      sources: patch.reviewedResearch.sources.filter((source) => /^\d+$/.test(source.id)).slice(0, 8).map((source) => ({ id: source.id, title: limit(source.title, 500), correctionNotice: limit(source.correctionNotice, 160) || null, publicationDate: limit(source.publicationDate, 16) || null, status: source.status === 'corrected' || source.status === 'retracted' || source.status === 'unavailable' ? source.status : 'active' })),
    },
    gutSynthesis: patch.gutSynthesis === undefined ? original.gutSynthesis : cleanGutSynthesis(patch.gutSynthesis),
    symptomOnset: patch.symptomOnset === undefined ? original.symptomOnset : patch.symptomOnset && !Number.isNaN(Date.parse(patch.symptomOnset.occurredAt)) && Date.parse(patch.symptomOnset.occurredAt) <= Date.now() && ['exact', 'approximate'].includes(patch.symptomOnset.precision) ? { occurredAt: new Date(patch.symptomOnset.occurredAt).toISOString(), precision: patch.symptomOnset.precision } : null,
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
  unspecified: 'a selected symptom', bloating: 'bloating', discomfort: 'abdominal discomfort', reflux: 'reflux', nausea: 'nausea', bowel_changes: 'bowel changes',
};
/** The Diet reaction selector has only two symptom labels specific enough to reuse. */
export function answerFromMealReaction(meal: GutMeal, symptom: GutSymptom): Answer {
  if (meal.reactionType === 'bloat' && symptom === 'bloating') return 'yes';
  if (meal.reactionType === 'heartburn' && symptom === 'reflux') return 'yes';
  return 'unanswered';
}

export function deriveGutEvidence(thread: GutQuestionThread, snapshot: { meals: GutMeal[]; days: GutDay[] }, observations: Observation[]): GutEvidence {
  const focus = normalize(thread.focus);
  const current = scope();
  // Profile meals can lack an owner field, so reject a foreign thread before considering them.
  const candidates = focus && thread.ownerKey === current.ownerKey && thread.profileId === current.profileId ? snapshot.meals.filter((meal) => normalize(meal.name).includes(focus) && !thread.excludedMealIds.includes(meal.id)) : [];
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
      mealSource: { id: meal.id, revision: meal.revision ?? null, sourceKind: meal.sourceKind || 'diet_meal', timePrecision: meal.timePrecision || (meal.occurredAt ? 'approximate' : 'date_only') },
      answerSources,
    };
    const otherMeals = snapshot.meals.filter((other) => other.date === meal.date && other.id !== meal.id);
    const alternativeContext: GutAlternativeContext[] = [
      ...otherMeals.map((other): GutAlternativeContext => ({
        kind: 'other_meal_same_date', sourceId: other.id, revision: other.revision ?? null,
        timePrecision: other.timePrecision || (other.occurredAt ? 'approximate' : 'date_only'), label: other.name,
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
  const nameVariants = [...occasions.reduce((groups, item) => {
    const key = `${normalize(item.meal.name)}:${item.meal.preparation?.source === 'user_confirmed' ? `${item.meal.preparation.kind}:${normalize(item.meal.preparation.detail)}` : 'unknown_preparation'}`;
    const group = groups.get(key) || { name: item.meal.name, ...(item.meal.preparation?.source === 'user_confirmed' ? { preparation: item.meal.preparation.detail } : {}), sourceIds: [], support: 0, counterexamples: 0, unknown: 0 };
    group.sourceIds.push(item.meal.id);
    if (item.edge.category === 'support') group.support += 1;
    else if (item.edge.category === 'counterexample') group.counterexamples += 1;
    else group.unknown += 1;
    groups.set(key, group);
    return groups;
  }, new Map<string, GutNameVariant>()).values()];
  const bundle: GutEvidenceBundle = {
    support: occasions.filter((item) => item.edge.category === 'support').map((item) => item.edge),
    counterexamples: occasions.filter((item) => item.edge.category === 'counterexample').map((item) => item.edge),
    unknown: occasions.filter((item) => item.edge.category === 'unknown').map((item) => item.edge),
    alternativeContext,
    nameVariants,
  };
  const support = bundle.support.length;
  const tension = bundle.counterexamples.length;
  const unknown = bundle.unknown.length;
  const conflicts = occasions.filter((item) => item.answerOrigin === 'conflict').length;
  const unstable = occasions.filter((item) => item.edge.inclusionRule === 'unstable_legacy_meal_id').length;
  const fingerprint = JSON.stringify([thread.focus, thread.symptom, thread.excludedMealIds, occasions.map(({ meal, answer, answerSource, edge, sameDay, alternativeContext }) => [meal.id, meal.date, meal.occurredAt, meal.loggedAt, meal.name, meal.preparation, meal.reaction, meal.reactionType, meal.reactionRecordedAt, answer, answerSource?.id, answerSource?.revision, edge.inclusionRule, sameDay, alternativeContext, meal.sourceKind, meal.sourceRecordId, meal.revision])]);
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
  const unansweredStableOccasions = occasions.filter((item) => item.answer === 'unanswered' && item.edge.inclusionRule === 'no_explicit_answer' && hasStableGutMealId(item.meal));
  // Ask only when one existing unanswered occasion is the single fact likely to change this comparison.
  // If several outcomes are missing, one answer would not resolve the uncertainty and should not be promoted.
  const nextQuestionOccasion = conflicts || (support > 0 && tension > 0) || unansweredStableOccasions.length !== 1 ? null : unansweredStableOccasions[0];
  const nextQuestion = conflicts ? 'Two reports about the same occasion disagree. Inspect their source and correct the record you trust.'
    : support > 0 && tension > 0 ? 'The record is already mixed. More tracking is optional; recipe and portion differences remain unverified.'
      : nextQuestionOccasion ? `For ${nextQuestionOccasion.meal.name} on ${nextQuestionOccasion.meal.date}, do you clearly remember whether ${label} was present? “Not sure” or leaving it open is valid.`
        : unansweredStableOccasions.length > 1 ? 'Several outcomes are unknown, so one answer would not settle this comparison. You can leave it open; no extra tracking is needed.'
        : unstable === unknown && unknown > 0 ? 'These older meal records cannot support a reliably linked answer. You can leave this question open.'
          : 'No single missing report would settle this. You can leave the question open or discuss it with a clinician.';
  if (thread.symptom === 'unspecified') {
    answer = 'Your question is saved. Choose a symptom only if you want to compare explicit reports for a saved meal; otherwise use the dated records or prepare a visit question.';
    return { occasions, bundle, support: 0, tension: 0, unknown: occasions.length, conflicts: 0, fingerprint, nextQuestion: 'Which symptom, if any, would make this comparison useful?', nextQuestionMealId: null, answer };
  }
  return { occasions, bundle, support, tension, unknown, conflicts, fingerprint, nextQuestion, nextQuestionMealId: nextQuestionOccasion?.meal.id || null, answer };
}

const reviewOccasion = (item: GutEvidenceOccasion) => ({
  id: item.meal.id,
  name: item.meal.name,
  date: item.meal.date,
  answer: item.answer,
  sourceVersion: JSON.stringify([item.meal.loggedAt, item.meal.reaction, item.meal.reactionType, item.meal.reactionRecordedAt, item.answerSource?.id, item.answerSource?.revision, item.edge.inclusionRule, item.sameDay, item.alternativeContext, item.meal.revision ?? null, item.meal.sourceKind || 'diet_meal', 'gut-edge-v3']),
});

function describeGutSourceChange(previous: string, current: string, mealId: string): string {
  try {
    const old = JSON.parse(previous);
    const next = JSON.parse(current);
    if (!Array.isArray(old) || !Array.isArray(next) || old[11] !== 'gut-edge-v3' || next[11] !== 'gut-edge-v3') throw new Error('Earlier snapshot format');
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
    if (old[9] !== next[9] || old[10] !== next[10]) return `Meal source ${mealId} was revised`;
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
  if (!observationScope || !hasStableGutMealId(meal) || symptom === 'unspecified') return { ok: false as const, error: 'Choose a symptom and stable saved meal first.' };
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

/** Save only an explicitly supplied preparation detail on its existing Diet meal. */
export async function saveGutMealPreparation(
  mealId: string,
  preparation: NonNullable<GutMeal['preparation']> | null,
): Promise<boolean> {
  if (!mealId || (preparation && (preparation.source !== 'user_confirmed' || !['ingredient_or_substitution', 'portion', 'fresh_or_reheated', 'cooking_method'].includes(preparation.kind) || !clean(preparation.detail)))) return false;
  const current = scope();
  const profile = getProfile();
  const logs = profile?.nutrition?.recentLogs;
  if (!Array.isArray(logs)) return false;
  const index = logs.findIndex((item: { id?: string }) => item.id === mealId);
  if (index < 0) return false;
  const next = preparation ? { ...preparation, detail: clean(preparation.detail).slice(0, 120) } : null;
  const updatedProfile = { ...profile, nutrition: { ...profile.nutrition, recentLogs: logs.map((item: Record<string, unknown>, position: number) => position === index ? { ...item, preparation: next } : item) } };
  try { await saveProfile(updatedProfile); }
  catch { return false; }
  if (scope().ownerKey !== current.ownerKey || scope().profileId !== current.profileId) return false;
  const saved = getProfile()?.nutrition?.recentLogs?.find((item: { id?: string }) => item.id === mealId);
  const ok = JSON.stringify(saved?.preparation || null) === JSON.stringify(next);
  if (ok && typeof window !== 'undefined') window.dispatchEvent(new Event('hc_profile_updated'));
  return ok;
}

/**
 * Pure deterministic function to route user query into one of 4 Gut branches,
 * extract inferred focus/options, and detect symptom mentions without AI hallucinations.
 */
export function resolveDeterministicGutIntent(query: string): DeterministicIntentResolution {
  const cleanQuery = (query || '').trim().toLowerCase();

  // 1. Detect Symptom
  let inferredSymptom: GutSymptom = 'unspecified';
  if (/reflux|heartburn|acid|gerd|burning|regurgitat/i.test(cleanQuery)) {
    inferredSymptom = 'reflux';
  } else if (/nausea|queasy|vomit|throw up|sick to (my )?stomach/i.test(cleanQuery)) {
    inferredSymptom = 'nausea';
  } else if (/diarrhea|constipat|bowel|stool|loose|bristol|poop|urgency/i.test(cleanQuery)) {
    inferredSymptom = 'bowel_changes';
  } else if (/cramp|pain|ache|discomfort|tender|hurt|spasm|stomachache/i.test(cleanQuery)) {
    inferredSymptom = 'discomfort';
  } else if (/bloat|distension|gas|gassy|swollen belly|fullness/i.test(cleanQuery)) {
    inferredSymptom = 'bloating';
  }

  // 2. Detect Intent
  let intent: GutIntent = 'understand';
  if (/unwell|sick|hurting|pain right now|right now|currently hurting|acute|emergency|severe pain|flare right now|feel unwell/i.test(cleanQuery)
    || /\b(?:i have|i'm having|i am having|i feel|experiencing)\b.{0,80}\b(?:pain|cramp|ache|nausea|vomit|diarrhea)\b.{0,60}\b(?:today|now)\b/i.test(cleanQuery)) {
    intent = 'now';
  } else if (/doctor|clinician|visit|appointment|prescribe|describe.*visit|handoff|brief|ask (my )?doctor|consult/i.test(cleanQuery)) {
    intent = 'care';
  } else if (/decide|choose|choice|versus|\bvs\b|should i (have|eat|drink|take)|which (is|one)|substitute|replace/i.test(cleanQuery)) {
    intent = 'decide';
  } else {
    intent = 'understand';
  }

  // 3. Extract Focus / Meal name or Options
  let inferredFocus = '';
  let options: { a: string; b: string } | undefined;

  if (intent === 'decide') {
    const orMatch = cleanQuery.match(/(?:should i (?:have|eat|drink|take) )?([a-z0-9\s]+?)\s+(?:or|versus|vs\.?)\s+([a-z0-9\s\?]+)/i);
    if (orMatch) {
      const optA = orMatch[1].replace(/^(either|a|an)\s+/i, '').trim();
      const optB = orMatch[2].replace(/\?+$/, '').replace(/^(a|an)\s+/i, '').trim();
      if (optA && optB) {
        options = { a: optA, b: optB };
        inferredFocus = optA;
      }
    }
  }

  if (!inferredFocus) {
    // "After lunch today" describes timing, not an exact saved meal name.
    // Infer a candidate only when the person explicitly asks about a named thing.
    const mealMatch = cleanQuery.match(/(?:is|does|about)\s+([a-z0-9\s]+?)\s+(?:linked to|related to|trigger|cause|affect)/i)
      || cleanQuery.match(/reaction to\s+([a-z0-9\s]+?)(?:\?|$)/i);
    const candidate = mealMatch?.[1]?.trim() || '';
    if (candidate && !/^(?:my|this|that|it|food|meal|breakfast|lunch|dinner|snack|today|yesterday|anything|everything)(?:\s+(?:today|yesterday|this morning|tonight))?$/i.test(candidate)) {
      inferredFocus = candidate;
    }
  }

  return { intent, inferredFocus, inferredSymptom, options };
}

function dateInZone(timestamp: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function recordKind(observation: Observation): GutBacktraceItem['kind'] {
  if (observation.payload.kind === 'meal') return 'meal';
  if (observation.payload.kind === 'context') return observation.payload.contextType === 'medication' ? 'medication' : 'context';
  return 'digestion';
}

function recordLabel(observation: Observation): string {
  if (observation.payload.kind === 'meal' || observation.payload.kind === 'context') return observation.payload.description;
  if (observation.payload.kind === 'symptom') return `Reported ${observation.payload.symptom}`;
  if (observation.payload.kind === 'bowel') return 'Bowel report';
  return 'Digestion check-in';
}

/**
 * Pure read-only 48-hour backtrace projection.
 * Anchored to verified symptom onset or question event timestamp.
 * Strictly avoids gastric kinetics simulations or causal verdicts.
 */
export function deriveGutBacktraceProjection(
  anchor: { type: 'symptom_onset' | 'question_time'; timestamp: string; symptom?: GutSymptom; timezone?: string },
  snapshot: { meals: GutMeal[]; days: GutDay[] },
  observations: Observation[]
): GutBacktraceProjection {
  const anchorMs = Date.parse(anchor.timestamp);
  const anchorValid = /(?:Z|[+-]\d{2}:\d{2})$/.test(anchor.timestamp) && Number.isFinite(anchorMs);
  let timezone = anchor.timezone || 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(); }
  catch { timezone = 'UTC'; }
  if (!anchorValid) {
    return {
      anchorTimestamp: anchor.timestamp, anchorType: anchor.type, anchorTimezone: timezone,
      anchorSymptom: anchor.symptom, windowHours: 48, timedItems: [], dateOnlyItems: [],
      summary: 'The question timestamp is unavailable, so no 48-hour window can be verified.',
      caveat: 'Open the dated record history. No meal or symptom order is inferred from an invalid time.',
    };
  }
  const anchorIso = new Date(anchorMs).toISOString();
  const windowMs = 48 * 3600 * 1000;
  const minMs = anchorMs - windowMs;

  // A 48-hour interval can touch different local calendar dates across time zones and DST.
  const relevantDates = new Set<string>();
  for (let ms = minMs; ms <= anchorMs; ms += 3600 * 1000) relevantDates.add(dateInZone(ms, timezone));
  relevantDates.add(dateInZone(anchorMs, timezone));

  const timedItems: GutBacktraceItem[] = [];
  const dateOnlyItems: GutBacktraceDateOnlyItem[] = [];
  const seenIds = new Set<string>();

  // Legacy Diet loggedAt is a write time. Only separately saved occurrence time is sequenced.
  for (const meal of snapshot.meals) {
    if (meal.occurredAt && (meal.timePrecision === 'exact' || meal.timePrecision === 'approximate')) {
      const ms = Date.parse(meal.occurredAt);
      if (/(?:Z|[+-]\d{2}:\d{2})$/.test(meal.occurredAt) && Number.isFinite(ms) && ms >= minMs && ms <= anchorMs) {
        const hoursPrior = Math.max(0, Math.round(((anchorMs - ms) / (3600 * 1000)) * 10) / 10);
        timedItems.push({
          id: meal.id,
          kind: 'meal',
          label: meal.name,
          detail: meal.reaction ? `Reaction: ${meal.reaction}` : undefined,
          occurredAt: new Date(ms).toISOString(),
          localDate: dateInZone(ms, timezone),
          sourceLocalDate: meal.date,
          hoursPrior,
          timePrecision: meal.timePrecision,
          timeMeaning: 'user_reported_occurrence',
          sourceKind: 'diet_meal', sourceId: meal.id, revision: null,
          reportedAt: meal.loggedAt || null,
          sourceRecordId: meal.id,
        });
        seenIds.add(meal.id);
      }
      // An out-of-window or invalid timed event must not reappear as date-only.
      continue;
    }

    if (meal.date && relevantDates.has(meal.date) && !seenIds.has(meal.id)) {
      dateOnlyItems.push({
        id: meal.id,
        kind: 'meal',
        label: meal.name,
        detail: meal.reaction ? `Reaction: ${meal.reaction}` : undefined,
        localDate: meal.date,
        sourceKind: 'diet_meal', sourceId: meal.id, revision: null,
        reportedAt: meal.loggedAt || null,
        sourceRecordId: meal.id,
      });
      seenIds.add(meal.id);
    }
  }

  // Observations must be scoped even when a caller accidentally passes a mixed array.
  const current = scope();
  for (const obs of observations) {
    if (obs.deletedAt || obs.ownerId !== getAccountScope() || obs.profileId !== current.profileId) continue;
    if (obs.sourceRecordId && seenIds.has(obs.sourceRecordId)) continue;
    if (seenIds.has(obs.id)) continue;

    if (obs.timePrecision === 'exact' || obs.timePrecision === 'approximate') {
      if (!obs.occurredAt || !/(?:Z|[+-]\d{2}:\d{2})$/.test(obs.occurredAt)) continue;
      const ms = Date.parse(obs.occurredAt);
      if (Number.isFinite(ms) && ms >= minMs && ms <= anchorMs) {
        const hoursPrior = Math.max(0, Math.round(((anchorMs - ms) / (3600 * 1000)) * 10) / 10);
        timedItems.push({
          id: obs.id,
          kind: recordKind(obs), label: recordLabel(obs),
          occurredAt: obs.occurredAt,
          localDate: dateInZone(ms, timezone),
          sourceLocalDate: obs.localDate || undefined,
          hoursPrior,
          timePrecision: obs.timePrecision,
          timeMeaning: 'user_reported_occurrence',
          sourceKind: 'observation', sourceId: obs.id, revision: obs.revision,
          reportedAt: obs.recordedAt,
          sourceRecordId: obs.sourceRecordId,
        });
        seenIds.add(obs.id);
        continue;
      }
      continue;
    }

    if (obs.timePrecision === 'date_only' && obs.localDate && relevantDates.has(obs.localDate) && !seenIds.has(obs.id)) {
      dateOnlyItems.push({
        id: obs.id,
        kind: recordKind(obs), label: recordLabel(obs),
        localDate: obs.localDate,
        sourceKind: 'observation', sourceId: obs.id, revision: obs.revision,
        reportedAt: obs.recordedAt,
        sourceRecordId: obs.sourceRecordId,
      });
      seenIds.add(obs.id);
    }
  }

  // 3. Process Daily Digestion Records
  for (const day of snapshot.days) {
    if (relevantDates.has(day.date)) {
      const dayId = `day-${day.date}`;
      if (!seenIds.has(dayId) && (day.bloating !== null || day.discomfort !== null)) {
        const parts: string[] = [];
        if (day.bloating !== null) parts.push(`Bloating ${day.bloating}/10`);
        if (day.discomfort !== null) parts.push(`Discomfort ${day.discomfort}/10`);
        dateOnlyItems.push({
          id: dayId,
          kind: 'digestion',
          label: `Digestion log: ${parts.join(', ')}`,
          localDate: day.date,
          sourceKind: 'daily_digest', sourceId: dayId, revision: null,
          reportedAt: null,
        });
        seenIds.add(dayId);
      }
    }
  }

  // Sort timed items chronologically (earliest to latest leading into anchor)
  timedItems.sort((a, b) => b.hoursPrior - a.hoursPrior);
  // Sort date-only items by date descending
  dateOnlyItems.sort((a, b) => b.localDate.localeCompare(a.localDate));

  const anchorLabel = anchor.type === 'symptom_onset' ? 'reported symptom onset' : 'question creation';
  const summary = `In the 48 hours before ${anchorLabel}: ${timedItems.length} timed report(s) and ${dateOnlyItems.length} date-only record(s).`;
  const caveat = `This is a record review window before ${anchorLabel}. It does not infer biological gastric transit or cause. A date-only record may have occurred before or after the anchor; its order is unknown.`;

  return {
    anchorTimestamp: anchorIso,
    anchorType: anchor.type,
    anchorTimezone: timezone,
    anchorSymptom: anchor.symptom,
    windowHours: 48,
    timedItems,
    dateOnlyItems,
    summary,
    caveat,
  };
}

/**
 * Deterministically classifies evidence & thread into one of 9 clean answer states.
 */
export function classifyGutAnswerState(
  evidence: GutEvidence | null,
  thread: GutQuestionThread
): GutAnswerState {
  if (thread.intent === 'now') {
    return 'now_acute';
  }
  if (thread.intent === 'care') return 'visit_ready';
  if (thread.intent === 'decide' && thread.decision?.chosen) return 'decision_recorded';
  if (thread.symptom === 'unspecified') return 'needs_symptom';
  if (!evidence || evidence.occasions.length === 0) {
    return 'no_records';
  }
  if (evidence.conflicts > 0) {
    return 'conflicts';
  }
  if (evidence.support > 0 && evidence.tension > 0) {
    return 'mixed_counterexample';
  }
  if (evidence.unknown > 0 && evidence.support === 0 && evidence.tension === 0 && evidence.nextQuestionMealId) {
    return 'needs_one_fact';
  }

  const hasTimed = evidence.occasions.some(
    (occ) => !!occ.meal.occurredAt && (occ.edge.mealSource.timePrecision === 'exact' || occ.edge.mealSource.timePrecision === 'approximate')
  );
  if (!hasTimed) {
    return 'date_only';
  }

  if (evidence.support === 1 && evidence.tension === 0 && evidence.unknown === 0) {
    return 'single_confirmed';
  }

  return 'reliable_timed';
}
