import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Observation } from '../../domain/observations/types';
import type { GutDay, GutMeal } from '../GutHealthSummary';
import type { GutQuestionThread } from '../GutResolutionService';
import { deriveGutDossier, gutDossierLens } from '../GutResearchDossierService';

const state = vi.hoisted(() => ({ profile: {} as Record<string, any> }));
vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => 'hc_unified_profile_acct',
  getProfileEngineState: () => ({ activeId: 'profile_1' }),
  getProfile: () => state.profile,
  saveProfile: vi.fn(async (profile) => { state.profile = profile; }),
}));
vi.mock('../RunContext', () => ({ getAccountScope: () => 'acct' }));

import {
  classifyGutAnswerState,
  createGutThread,
  deriveGutBacktraceProjection,
  deriveGutChangeReceipt,
  deriveGutChoiceHistory,
  deriveGutEvidence,
  hasStableGutMealId,
  listGutThreads,
  makeGutReviewSnapshot,
  resolveDeterministicGutIntent,
  saveGutMealPreparation,
  updateGutThread
} from '../GutResolutionService';

const thread: GutQuestionThread = {
  id: 'q1', schemaVersion: 1, ownerKey: 'hc_unified_profile_acct', profileId: 'profile_1',
  intent: 'understand', question: 'Is chai linked to bloating?', focus: 'chai', symptom: 'bloating',
  status: 'open', selectedStep: null, reflection: null, excludedMealIds: [], reviewedEvidence: null,
  createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:00:00Z',
};
const meals: GutMeal[] = [
  { id: 'meal-1-stable', name: 'Masala Chai', date: '2026-09-20', time: '8:30 PM', reaction: null },
  { id: 'meal-2-stable', name: 'Chai with oat milk', date: '2026-09-21', time: null, reaction: null },
  { id: 'meal-3-stable', name: 'Masala Chai', date: '2026-09-22', time: null, reaction: null },
];
const day: GutDay = { date: '2026-09-20', bloating: 8, discomfort: null, stoolForm: null, comfort: null, bowelFrequency: null, distensionPattern: null, note: null };
const report = (meal: GutMeal, answer: 'yes' | 'no', ownerId = 'acct'): Observation => ({
  id: `report-${meal.id}`, schemaVersion: 1, ownerId, profileId: 'profile_1',
  payload: { kind: 'daily_checkin', localDate: meal.date, answers: { bloating: answer } },
  occurredAt: null, localDate: meal.date, timezone: null, timePrecision: 'date_only',
  source: 'gut', evidenceType: 'user_report', sourceRecordId: meal.id, idempotencyKey: `outcome:${meal.id}`,
  recordedAt: '2026-09-23T10:00:00Z', revision: 1, createdAt: '2026-09-23T10:00:00Z',
  updatedAt: '2026-09-23T10:00:00Z', deletedAt: null,
});

describe('Gut Resolution evidence ledger', () => {
  beforeEach(() => { state.profile = {}; });
  it('keeps a same-day high symptom score and missing follow-up out of causal counts', () => {
    const evidence = deriveGutEvidence(thread, { meals, days: [day] }, []);
    expect(evidence.support).toBe(0);
    expect(evidence.tension).toBe(0);
    expect(evidence.unknown).toBe(3);
    expect(evidence.answer).toContain('cannot test this idea');
    expect(evidence.occasions[0].sameDay?.bloating).toBe(8);
  });

  it('keeps an explicit counterexample and a different recipe visible', () => {
    const evidence = deriveGutEvidence(thread, { meals, days: [day] }, [report(meals[0], 'yes'), report(meals[1], 'no')]);
    expect([evidence.support, evidence.tension, evidence.unknown]).toEqual([1, 1, 1]);
    expect(evidence.bundle.support[0].answerSources).toEqual([{ kind: 'gut_report', id: `report-${meals[0].id}`, revision: 1, timePrecision: 'date_only' }]);
    expect(evidence.bundle.counterexamples[0].inclusionRule).toBe('linked_explicit_report');
    expect(evidence.bundle.unknown[0].inclusionRule).toBe('no_explicit_answer');
    expect(evidence.bundle.nameVariants).toEqual([
      { name: 'Masala Chai', sourceIds: [meals[0].id, meals[2].id], support: 1, counterexamples: 0, unknown: 1 },
      { name: 'Chai with oat milk', sourceIds: [meals[1].id], support: 0, counterexamples: 1, unknown: 0 },
    ]);
    expect(evidence.answer).toContain('mixed');
    expect(evidence.occasions[1].meal.name).toBe('Chai with oat milk');
    expect(evidence.nextQuestionMealId).toBeNull();
    expect(evidence.nextQuestion).toContain('already mixed');
  });

  it('projects typed dossier links without counting date context as explicit evidence', () => {
    const evidence = deriveGutEvidence(thread, { meals, days: [day] }, [report(meals[0], 'yes'), report(meals[1], 'no')]);
    const dossier = deriveGutDossier(thread, evidence, null, new Set(meals.map((meal) => meal.id)));
    expect(dossier.links.filter((link) => link.relation === 'explicit_with')).toHaveLength(1);
    expect(dossier.links.filter((link) => link.relation === 'explicit_without')).toHaveLength(1);
    expect(dossier.links.find((link) => link.relation === 'explicit_without')?.source.id).toBe(meals[1].id);
    expect(gutDossierLens(dossier, 'explicit_only').every((link) => link.lane !== 'context')).toBe(true);
    expect(dossier.reading).toContain('mixed picture');
  });

  it('rejects a foreign question before linking profile meals', () => {
    const foreign = { ...thread, profileId: 'profile_2' };
    const evidence = deriveGutEvidence(foreign, { meals, days: [day] }, [report(meals[0], 'yes')]);
    expect(evidence.occasions).toHaveLength(0);
    expect(deriveGutDossier(foreign, evidence, null, new Set(meals.map((meal) => meal.id))).links).toHaveLength(0);
  });

  it('stores a user-reported onset separately and never infers it from question time', async () => {
    const created = await createGutThread({ intent: 'now', question: 'Pain today' });
    expect(created?.symptomOnset).toBeUndefined();
    const saved = await updateGutThread(created!.id, { symptomOnset: { occurredAt: '2026-09-20T12:00:00Z', precision: 'approximate' } });
    expect(saved?.symptomOnset).toEqual({ occurredAt: '2026-09-20T12:00:00.000Z', precision: 'approximate' });
    expect(saved?.createdAt).not.toBe(saved?.symptomOnset?.occurredAt);
    const cleared = await updateGutThread(created!.id, { symptomOnset: null });
    expect(cleared?.symptomOnset).toBeNull();
  });

  it('persists only exact reviewed PMID metadata, separate from personal evidence', async () => {
    const created = await createGutThread({ intent: 'understand', question: 'Is chai linked to bloating?' });
    const saved = await updateGutThread(created!.id, { reviewedResearch: { at: '', topic: 'food', sources: [
      { id: '12345', title: 'A review', correctionNotice: null, publicationDate: '2025-01-01', status: 'active' },
      { id: 'https://other.example', title: 'Untrusted', correctionNotice: null, publicationDate: null, status: 'active' },
    ] } });
    expect(saved?.reviewedResearch?.sources.map((source) => source.id)).toEqual(['12345']);
    expect(saved?.reviewedEvidence).toBeNull();
  });

  it('separates same-name meals only after the user confirms a preparation difference', async () => {
    const duplicate = { ...meals[0], id: 'same-name-2', date: '2026-09-21' };
    state.profile = { nutrition: { recentLogs: [{ id: meals[0].id, meal: meals[0].name, date: meals[0].date }] } };
    expect(await saveGutMealPreparation(meals[0].id, { kind: 'ingredient_or_substitution', detail: 'oat milk instead of dairy', source: 'user_confirmed' })).toBe(true);
    const confirmed = { ...meals[0], preparation: state.profile.nutrition.recentLogs[0].preparation };
    const evidence = deriveGutEvidence(thread, { meals: [confirmed, duplicate], days: [] }, []);
    expect(evidence.bundle.nameVariants).toHaveLength(2);
    expect(evidence.bundle.nameVariants[0].preparation).toBe('oat milk instead of dairy');
    expect(evidence.bundle.nameVariants[1].preparation).toBeUndefined();
  });

  it('keeps a planned choice separate from a user-linked actual meal and allows correction', async () => {
    const created = await createGutThread({ intent: 'decide', question: 'What should I order?' });
    expect(created?.decision?.actualMealId).toBeUndefined();
    const linked = await updateGutThread(created!.id, { decision: { ...created!.decision!, chosen: 'a', chosenAt: '2026-09-23T10:00:00Z', actualMealId: meals[0].id, outcome: 'I ate it', outcomeAt: '2026-09-23T12:00:00Z' } });
    expect(linked?.decision?.actualMealId).toBe(meals[0].id);
    const corrected = await updateGutThread(created!.id, { decision: { ...linked!.decision!, actualMealId: null, outcome: null, outcomeAt: null } });
    expect(corrected?.decision?.actualMealId).toBeNull();
    expect(corrected?.decision?.outcome).toBeNull();
    const undecided = await updateGutThread(created!.id, { decision: { ...linked!.decision!, chosen: null } });
    expect(undecided?.decision?.actualMealId).toBeNull();
    expect(undecided?.decision?.outcome).toBeNull();
  });

  it('asks about one specific stable unknown occasion only when its answer may change the reading', () => {
    const evidence = deriveGutEvidence(thread, { meals: meals.slice(0, 2), days: [] }, [report(meals[0], 'yes')]);
    expect(evidence.nextQuestionMealId).toBe(meals[1].id);
    expect(evidence.nextQuestion).toContain(meals[1].name);
    expect(evidence.nextQuestion).toContain(meals[1].date);
  });

  it('does not prompt on several unknown occasions when one answer would not resolve the uncertainty', () => {
    const evidence = deriveGutEvidence(thread, { meals, days: [] }, []);
    expect(evidence.nextQuestionMealId).toBeNull();
    expect(evidence.nextQuestion).toContain('one answer would not settle');
    expect(evidence.nextQuestion).toContain('leave it open');
  });

  it('ignores reports from another account and deleted reports', () => {
    const deleted = { ...report(meals[0], 'yes'), deletedAt: '2026-09-23T11:00:00Z' };
    const evidence = deriveGutEvidence(thread, { meals, days: [] }, [report(meals[1], 'no', 'other-account'), deleted]);
    expect([evidence.support, evidence.tension, evidence.unknown]).toEqual([0, 0, 3]);
  });

  it('shows scoped medication notes as same-date context without counting a dose or changing the symptom answer', () => {
    const context: Observation = {
      ...report(meals[0], 'yes'), id: 'context-1', sourceRecordId: undefined,
      payload: { kind: 'context', description: 'Medication listed for this date', contextType: 'medication' },
    };
    const otherAccount = { ...context, id: 'other-account-context', ownerId: 'different-account' };
    const evidence = deriveGutEvidence(thread, { meals: [meals[0]], days: [] }, [context, otherAccount]);
    expect([evidence.support, evidence.tension, evidence.unknown]).toEqual([0, 0, 1]);
    expect(evidence.bundle.alternativeContext).toEqual([{
      kind: 'recorded_context_same_date', sourceId: 'context-1', revision: 1,
      timePrecision: 'date_only', label: 'Medication listed for this date', contextType: 'medication',
    }]);
    const reviewed = makeGutReviewSnapshot(thread, evidence);
    const revised = deriveGutEvidence(thread, { meals: [meals[0]], days: [] }, [{ ...context, revision: 2, payload: { kind: 'context', description: 'Medication note corrected', contextType: 'medication' } }]);
    expect(deriveGutChangeReceipt(reviewed, thread, revised).changes[0].detail).toContain('context changed');
    const earlierFormat = { ...reviewed, occasions: [{ ...reviewed.occasions![0], sourceVersion: JSON.stringify([null, null, null, null, null, null, 'no_explicit_answer', null, []]) }] };
    expect(deriveGutChangeReceipt(earlierFormat, thread, revised).changes[0].detail).toContain('linked source or context changed');
  });

  it('lets the user keep a different meal separate without deleting its source', () => {
    const evidence = deriveGutEvidence({ ...thread, excludedMealIds: [meals[1].id] }, { meals, days: [] }, [report(meals[1], 'no')]);
    expect(evidence.occasions.map((item) => item.meal.id)).not.toContain(meals[1].id);
    expect(evidence.unknown).toBe(2);
  });

  it('changes the review fingerprint when a linked report is revised', () => {
    const initial = deriveGutEvidence(thread, { meals, days: [] }, [report(meals[0], 'yes')]);
    const revised = deriveGutEvidence(thread, { meals, days: [] }, [{ ...report(meals[0], 'no'), revision: 2 }]);
    expect(revised.fingerprint).not.toBe(initial.fingerprint);
    expect([revised.support, revised.tension]).toEqual([0, 1]);
  });

  it('reuses only symptom-specific Diet reaction selections as linked user reports', () => {
    const selected: GutMeal[] = [
      { ...meals[0], reaction: 'Bloating', reactionType: 'bloat', reactionRecordedAt: '2026-09-20T22:00:00Z' },
      { ...meals[1], reaction: 'No reaction', reactionType: 'none' },
      { ...meals[2], reaction: 'Heartburn', reactionType: 'heartburn' },
    ];
    const bloating = deriveGutEvidence(thread, { meals: selected, days: [] }, []);
    expect([bloating.support, bloating.tension, bloating.unknown]).toEqual([1, 0, 2]);
    expect(bloating.occasions[0].answerOrigin).toBe('meal_reaction');
    expect(bloating.bundle.support[0].answerSources[0]).toEqual({ kind: 'diet_reaction', id: meals[0].id, revision: null, timePrecision: 'date_only' });
    expect(bloating.occasions[1].answer).toBe('unanswered');
    expect(bloating.occasions[2].answer).toBe('unanswered');
    const reflux = deriveGutEvidence({ ...thread, symptom: 'reflux' }, { meals: selected, days: [] }, []);
    expect(reflux.support).toBe(1);
    expect(reflux.occasions[2].answerOrigin).toBe('meal_reaction');
    expect(deriveGutEvidence(thread, { meals, days: [] }, []).fingerprint).not.toBe(bloating.fingerprint);
  });

  it('keeps a legacy meal with an unstable fallback ID out of counted outcomes', () => {
    const legacy = { ...meals[0], id: 'meal-0', reaction: 'Bloating', reactionType: 'bloat' };
    const evidence = deriveGutEvidence(thread, { meals: [legacy], days: [] }, []);
    expect([evidence.support, evidence.unknown]).toEqual([0, 1]);
    expect(evidence.bundle.unknown[0].inclusionRule).toBe('unstable_legacy_meal_id');
  });

  it('keeps a contradictory Gut report and Diet reaction unresolved', () => {
    const meal = { ...meals[0], reaction: 'Bloating', reactionType: 'bloat' };
    const evidence = deriveGutEvidence(thread, { meals: [meal], days: [] }, [report(meal, 'no')]);
    expect([evidence.support, evidence.tension, evidence.unknown, evidence.conflicts]).toEqual([0, 0, 1, 1]);
    expect(evidence.occasions[0].answerOrigin).toBe('conflict');
    expect(evidence.answer).toContain('disagreeing');
    expect(evidence.nextQuestion).toContain('disagree');
  });

  it('explains added, revised and removed occasions after a review even if totals are unchanged', () => {
    const original = deriveGutEvidence(thread, { meals: [meals[0]], days: [] }, [report(meals[0], 'yes')]);
    const reviewed = makeGutReviewSnapshot(thread, original, '2026-09-23T10:00:00Z');
    expect(deriveGutChangeReceipt(reviewed, thread, original).changed).toBe(false);

    const revised = deriveGutEvidence(thread, { meals: [meals[0], meals[1]], days: [] }, [{ ...report(meals[0], 'yes'), revision: 2 }]);
    const receipt = deriveGutChangeReceipt(reviewed, thread, revised);
    expect(receipt.changed).toBe(true);
    expect(receipt.changes.map((item) => item.detail)).toEqual([
      `Gut report report-${meals[0].id} was added, removed or revised`,
      'New matching occasion in your records',
    ]);
    const removed = deriveGutChangeReceipt(reviewed, thread, deriveGutEvidence(thread, { meals: [], days: [] }, []));
    expect(removed.changes[0].detail).toBe('No longer included in this comparison');
  });

  it('marks a changed symptom comparison even when its counts happen to match', () => {
    const initial = deriveGutEvidence(thread, { meals: [meals[0]], days: [] }, []);
    const reviewed = makeGutReviewSnapshot(thread, initial);
    const refluxThread = { ...thread, symptom: 'reflux' as const };
    const reflux = deriveGutEvidence(refluxThread, { meals: [meals[0]], days: [] }, []);
    const receipt = deriveGutChangeReceipt(reviewed, refluxThread, reflux);
    expect(receipt.changed).toBe(true);
    expect(receipt.comparisonChanged).toBe(true);
    expect(receipt.current).toEqual(receipt.previous);
  });

  it('allows stable saved meal ids while rejecting index-generated fallbacks', () => {
    expect(hasStableGutMealId(meals[0])).toBe(true);
    expect(hasStableGutMealId({ ...meals[0], id: 'meal-0' })).toBe(false);
  });

  it('matches a decision option to the exact saved meal name and leaves other variants out', () => {
    const history = deriveGutChoiceHistory(thread, 'Masala Chai', { meals, days: [day] }, [report(meals[0], 'yes'), report(meals[1], 'no')]);
    expect([history.matched, history.withSymptom, history.withoutSymptom, history.unknown]).toEqual([2, 1, 0, 1]);
    expect(history.sourceIds).not.toContain(meals[1].id);
    expect(deriveGutChoiceHistory(thread, '', { meals, days: [] }, []).matched).toBe(0);
  });

  it('persists a decision and filters malformed or out-of-scope question rows', async () => {
    const created = await createGutThread({ intent: 'decide', question: 'What should I choose at dinner?' });
    expect(created?.decision?.chosen).toBeNull();
    if (!created?.decision) throw new Error('Decision thread was not saved');
    const updated = await updateGutThread(created.id, { decision: { ...created.decision, options: { a: { label: 'My usual meal', mealName: 'Masala Chai' }, b: { label: 'Something else', mealName: '' } }, chosen: 'a', chosenAt: '2026-09-25T12:00:00Z' } });
    expect(updated?.decision?.options.a.mealName).toBe('Masala Chai');
    expect(updated?.decision?.chosen).toBe('a');
    state.profile.gutResolutionThreads.push({ id: 'bad', schemaVersion: 1, ownerKey: thread.ownerKey, profileId: thread.profileId });
    state.profile.gutResolutionThreads.push({ ...created, id: 'other', ownerKey: 'different-account' });
    expect(listGutThreads().map((item) => item.id)).toEqual([created.id]);
  });

  it('gives consecutive edits distinct timestamps even in the same millisecond', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-09-25T12:00:00.000Z'));
      const created = await createGutThread({ intent: 'understand', question: 'Does chai relate to bloating?' });
      if (!created) throw new Error('Question was not saved');
      const first = await updateGutThread(created.id, { reflection: 'First note' });
      const second = await updateGutThread(created.id, { reflection: 'Revised note' });
      expect(first && second && created.updatedAt < first.updatedAt && first.updatedAt < second.updatedAt).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('Deterministic Routing Engine', () => {
    it('accurately routes retrospective questions and extracts focus', () => {
      const result = resolveDeterministicGutIntent('Is chai linked to my bloating?');
      expect(result.intent).toBe('understand');
      expect(result.inferredFocus).toBe('chai');
      expect(result.inferredSymptom).toBe('bloating');
    });

    it('identifies pattern questions after dinner', () => {
      const result = resolveDeterministicGutIntent('What pattern should I check after dinner?');
      expect(result.intent).toBe('understand');
      expect(result.inferredFocus).toBe('');
      expect(result.inferredSymptom).toBe('unspecified');
    });

    it('does not turn a current symptom time phrase into a named meal', () => {
      const result = resolveDeterministicGutIntent('I have stomach pain after lunch today');
      expect(result.inferredFocus).toBe('');
      expect(result.inferredSymptom).toBe('discomfort');
    });

    it('identifies decision questions between options', () => {
      const result = resolveDeterministicGutIntent('Should I have oat milk chai or dairy chai?');
      expect(result.intent).toBe('decide');
      expect(result.inferredSymptom).toBe('unspecified');
      expect(result.options).toEqual({ a: 'oat milk chai', b: 'dairy chai' });
    });

    it('routes acute unwell questions to now intent and detects symptom', () => {
      const result = resolveDeterministicGutIntent('I feel unwell now with stomach cramps and pain');
      expect(result.intent).toBe('now');
      expect(result.inferredSymptom).toBe('discomfort');
    });

    it('routes visit prep questions to care intent', () => {
      const result = resolveDeterministicGutIntent('How do I describe my digestion at a visit?');
      expect(result.intent).toBe('care');
    });

    it('detects reflux, heartburn and nausea symptoms correctly', () => {
      expect(resolveDeterministicGutIntent('Is severe heartburn triggered by coffee?').inferredSymptom).toBe('reflux');
      expect(resolveDeterministicGutIntent('Why do I have nausea after eating?').inferredSymptom).toBe('nausea');
      expect(resolveDeterministicGutIntent('Bowel changes and loose stool after lunch').inferredSymptom).toBe('bowel_changes');
    });
  });

  describe('48-Hour Backtrace Projection', () => {
    it('gathers timed items and date-only items within 48h without causal verdict', () => {
      const anchor = {
        type: 'question_time' as const,
        timestamp: '2026-09-22T12:00:00.000Z',
        symptom: 'bloating' as const,
      };

      const timedMeals = [{ ...meals[0], occurredAt: '2026-09-20T20:30:00.000Z', timePrecision: 'approximate' as const, loggedAt: '2026-09-22T10:00:00.000Z' }, ...meals.slice(1)];
      const projection = deriveGutBacktraceProjection(anchor, { meals: timedMeals, days: [day] }, []);
      expect(projection.windowHours).toBe(48);
      expect(projection.timedItems.length).toBeGreaterThanOrEqual(1);
      // The user-reported occurrence is within 48 hours; entry time is later.
      expect(projection.timedItems.some((item) => item.label === 'Masala Chai')).toBe(true);
      expect(projection.timedItems[0].occurredAt).toBe('2026-09-20T20:30:00.000Z');
      expect(projection.timedItems[0].reportedAt).toBe('2026-09-22T10:00:00.000Z');
      // meals[1] has no time (date-only)
      expect(projection.dateOnlyItems.some((item) => item.label === 'Chai with oat milk')).toBe(true);
      // disclaimer must be present and honest
      expect(projection.caveat).toContain('does not infer biological gastric transit');
      expect(projection.caveat).toContain('its order is unknown');
    });

    it('does not turn a legacy log timestamp into a meal occurrence', () => {
      const projection = deriveGutBacktraceProjection(
        { type: 'question_time', timestamp: '2026-09-22T12:00:00Z', timezone: 'UTC' },
        { meals: [{ ...meals[0], date: '2026-09-22', time: '8:30 PM', loggedAt: '2026-09-22T11:00:00Z' }], days: [] }, []);
      expect(projection.timedItems).toHaveLength(0);
      expect(projection.dateOnlyItems).toHaveLength(1);
    });

    it('excludes timed events after the anchor or before the window rather than relabeling them date-only', () => {
      const projection = deriveGutBacktraceProjection(
        { type: 'question_time', timestamp: '2026-09-22T12:00:00Z', timezone: 'UTC' },
        { meals: [
          { ...meals[0], date: '2026-09-22', occurredAt: '2026-09-22T13:00:00Z', timePrecision: 'exact' },
          { ...meals[1], date: '2026-09-20', occurredAt: '2026-09-20T11:59:00Z', timePrecision: 'exact' },
        ], days: [] }, []);
      expect(projection.timedItems).toHaveLength(0);
      expect(projection.dateOnlyItems).toHaveLength(0);
    });

    it('uses local dates across an offset and excludes observations from other profiles', () => {
      const localMeal = { ...meals[0], date: '2026-09-23', occurredAt: '2026-09-22T18:30:00Z', timePrecision: 'exact' as const };
      const otherProfile = { ...report(meals[0], 'yes'), id: 'other-profile', profileId: 'profile_2', localDate: '2026-09-23' };
      const projection = deriveGutBacktraceProjection(
        { type: 'question_time', timestamp: '2026-09-23T18:30:00Z', timezone: 'Asia/Kolkata' },
        { meals: [localMeal], days: [] }, [otherProfile]);
      expect(projection.timedItems.map((item) => item.sourceId)).toEqual([localMeal.id]);
      expect(projection.dateOnlyItems).toHaveLength(0);
      expect(projection.timedItems[0].localDate).toBe('2026-09-23');
    });

    it('uses real elapsed hours across daylight saving and keeps the source date distinct', () => {
      const projection = deriveGutBacktraceProjection(
        { type: 'question_time', timestamp: '2026-03-09T04:30:00Z', timezone: 'America/New_York' },
        { meals: [{ ...meals[0], date: '2026-03-09', occurredAt: '2026-03-08T06:30:00Z', timePrecision: 'exact' }], days: [] }, []);
      expect(projection.timedItems).toHaveLength(1);
      expect(projection.timedItems[0].hoursPrior).toBe(22);
      expect(projection.timedItems[0].localDate).toBe('2026-03-08');
      expect(projection.timedItems[0].sourceLocalDate).toBe('2026-03-09');
      expect(projection.anchorTimezone).toBe('America/New_York');
    });
  });

  describe('Answer Card State Classification', () => {
    it('classifies empty records, date-only, reliable timed, and acute states', () => {
      expect(classifyGutAnswerState(null, thread)).toBe('no_records');

      const emptyEvidence = deriveGutEvidence(thread, { meals: [], days: [] }, []);
      expect(classifyGutAnswerState(emptyEvidence, thread)).toBe('no_records');

      // Now intent takes precedence
      expect(classifyGutAnswerState(emptyEvidence, { ...thread, intent: 'now' })).toBe('now_acute');

      // Service outages remain separate from the personal evidence state.
      expect(classifyGutAnswerState(emptyEvidence, thread)).toBe('no_records');
      expect(classifyGutAnswerState(emptyEvidence, { ...thread, symptom: 'unspecified' })).toBe('needs_symptom');

      // Date only vs timed
      const dateOnlyEvidence = deriveGutEvidence(thread, { meals: [meals[1]], days: [] }, [report(meals[1], 'yes')]);
      expect(classifyGutAnswerState(dateOnlyEvidence, thread)).toBe('date_only');

      const timedMeal = { ...meals[0], occurredAt: '2026-09-20T20:30:00Z', timePrecision: 'approximate' as const };
      const singleEvidence = deriveGutEvidence(thread, { meals: [timedMeal], days: [] }, [report(meals[0], 'yes')]);
      expect(classifyGutAnswerState(singleEvidence, thread)).toBe('single_confirmed');

      const timedMeal2 = { ...timedMeal, id: 'meal-4-stable', date: '2026-09-21' };
      const multiEvidence = deriveGutEvidence(thread, { meals: [timedMeal, timedMeal2], days: [] }, [report(meals[0], 'yes'), report(timedMeal2, 'yes')]);
      expect(classifyGutAnswerState(multiEvidence, thread)).toBe('reliable_timed');
    });

    it('covers the eleven planned personal conclusion states without making an unavailable research result personal', () => {
      const noRecords = deriveGutEvidence(thread, { meals: [], days: [] }, []);
      expect(classifyGutAnswerState(noRecords, thread)).toBe('no_records');
      expect(classifyGutAnswerState(noRecords, { ...thread, symptom: 'unspecified' })).toBe('needs_symptom');

      const oneUnknown = deriveGutEvidence(thread, { meals: [meals[0]], days: [] }, []);
      expect(classifyGutAnswerState(oneUnknown, thread)).toBe('needs_one_fact');

      const dateOnly = deriveGutEvidence(thread, { meals: [meals[0]], days: [] }, [report(meals[0], 'yes')]);
      expect(classifyGutAnswerState(dateOnly, thread)).toBe('date_only');
      const explicitWithout = deriveGutEvidence(thread, { meals: [meals[0]], days: [] }, [report(meals[0], 'no')]);
      expect(explicitWithout.tension).toBe(1);
      expect(classifyGutAnswerState(explicitWithout, thread)).toBe('date_only');

      const reportedWith = { ...meals[0], occurredAt: '2026-09-20T20:30:00Z', timePrecision: 'exact' as const };
      const oneReportedWith = deriveGutEvidence(thread, { meals: [reportedWith], days: [] }, [report(reportedWith, 'yes')]);
      expect(classifyGutAnswerState(oneReportedWith, thread)).toBe('single_confirmed');

      const reportedWithout = { ...meals[1], occurredAt: '2026-09-21T20:30:00Z', timePrecision: 'approximate' as const };
      const mixed = deriveGutEvidence(thread, { meals: [reportedWith, reportedWithout], days: [] }, [report(reportedWith, 'yes'), report(reportedWithout, 'no')]);
      expect(classifyGutAnswerState(mixed, thread)).toBe('mixed_counterexample');

      const conflictMeal = { ...meals[0], reaction: 'Bloating', reactionType: 'bloat' };
      const conflict = deriveGutEvidence(thread, { meals: [conflictMeal], days: [] }, [report(conflictMeal, 'no')]);
      expect(classifyGutAnswerState(conflict, thread)).toBe('conflicts');

      const twoWith = deriveGutEvidence(thread, { meals: [reportedWith, { ...reportedWith, id: 'meal-4-stable', date: '2026-09-22' }], days: [] }, [report(reportedWith, 'yes'), report({ ...reportedWith, id: 'meal-4-stable', date: '2026-09-22' }, 'yes')]);
      expect(classifyGutAnswerState(twoWith, thread)).toBe('reliable_timed');

      expect(classifyGutAnswerState(noRecords, { ...thread, intent: 'now' })).toBe('now_acute');
      expect(classifyGutAnswerState(noRecords, { ...thread, intent: 'care' })).toBe('visit_ready');
      expect(classifyGutAnswerState(noRecords, { ...thread, intent: 'decide', decision: { chosen: 'a' } as any })).toBe('decision_recorded');
      // Research outage is handled in the research view and leaves the personal evidence state intact.
      expect(classifyGutAnswerState(mixed, thread)).toBe('mixed_counterexample');
    });
  });
});
