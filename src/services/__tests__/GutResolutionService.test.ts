import { describe, expect, it, vi } from 'vitest';
import type { Observation } from '../../domain/observations/types';
import type { GutDay, GutMeal } from '../GutHealthSummary';
import type { GutQuestionThread } from '../GutResolutionService';

vi.mock('../ProfileEngine', () => ({
  getProfileKey: () => 'hc_unified_profile_acct',
  getProfileEngineState: () => ({ activeId: 'profile_1' }),
  getProfile: () => ({}),
  saveProfile: vi.fn(),
}));
vi.mock('../RunContext', () => ({ getAccountScope: () => 'acct' }));

import { deriveGutEvidence, hasStableGutMealId } from '../GutResolutionService';

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
    expect(evidence.answer).toContain('mixed');
    expect(evidence.occasions[1].meal.name).toBe('Chai with oat milk');
  });

  it('ignores reports from another account and deleted reports', () => {
    const deleted = { ...report(meals[0], 'yes'), deletedAt: '2026-09-23T11:00:00Z' };
    const evidence = deriveGutEvidence(thread, { meals, days: [] }, [report(meals[1], 'no', 'other-account'), deleted]);
    expect([evidence.support, evidence.tension, evidence.unknown]).toEqual([0, 0, 3]);
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

  it('allows stable saved meal ids while rejecting index-generated fallbacks', () => {
    expect(hasStableGutMealId(meals[0])).toBe(true);
    expect(hasStableGutMealId({ ...meals[0], id: 'meal-0' })).toBe(false);
  });
});
