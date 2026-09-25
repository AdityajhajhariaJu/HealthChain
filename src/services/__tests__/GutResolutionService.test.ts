import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Observation } from '../../domain/observations/types';
import type { GutDay, GutMeal } from '../GutHealthSummary';
import type { GutQuestionThread } from '../GutResolutionService';

const state = vi.hoisted(() => ({ profile: {} as Record<string, any> }));
vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => 'hc_unified_profile_acct',
  getProfileEngineState: () => ({ activeId: 'profile_1' }),
  getProfile: () => state.profile,
  saveProfile: vi.fn(async (profile) => { state.profile = profile; }),
}));
vi.mock('../RunContext', () => ({ getAccountScope: () => 'acct' }));

import { createGutThread, deriveGutChangeReceipt, deriveGutChoiceHistory, deriveGutEvidence, hasStableGutMealId, listGutThreads, makeGutReviewSnapshot, updateGutThread } from '../GutResolutionService';

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

  it('asks about one specific stable unknown occasion only when its answer may change the reading', () => {
    const evidence = deriveGutEvidence(thread, { meals, days: [] }, [report(meals[0], 'yes')]);
    expect(evidence.nextQuestionMealId).toBe(meals[1].id);
    expect(evidence.nextQuestion).toContain(meals[1].name);
    expect(evidence.nextQuestion).toContain(meals[1].date);
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
});
