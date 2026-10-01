import type { Answer, MealReactionRecord } from '../domain/observations/types';
import {
  captureObservationScope,
  createObservation,
  listObservationHistory,
  reviseObservation,
  type ObservationCommandResult,
} from './HealthObservationService';
/** An explicit reaction is a user report linked to the meal; report time is not symptom onset. */
export async function recordDietMealReaction(
  mealId: string,
  reaction: MealReactionRecord
): Promise<ObservationCommandResult> {
  const scope = await captureObservationScope();
  if (!scope) return { ok: false, error: 'scope_changed' };
  const records = await listObservationHistory();
  const meal = records.find(
    (record) => record.id === mealId && !record.deletedAt && record.payload.kind === 'meal'
  );
  if (!meal?.localDate) return { ok: false, error: 'not_found' };
  const key = `diet-meal-reaction:${mealId}`;
  const previous = records.find((record) => record.idempotencyKey === key && !record.deletedAt);
  const keys = ['bloating', 'reflux', 'discomfort', 'palpitations', 'brain_fog'];
  const selected = {
    bloat: 'bloating',
    heartburn: 'reflux',
    stomach_upset: 'discomfort',
    palpitations: 'palpitations',
    brain_fog: 'brain_fog',
  }[reaction.reactionType];
  const answers = Object.fromEntries(
    keys.map((name) => [
      name,
      reaction.reactionType === 'none' ? 'no' : name === selected ? 'yes' : 'unanswered',
    ])
  ) as Record<string, Answer>;
  const draft = {
    ...scope,
    payload: {
      kind: 'daily_checkin' as const,
      localDate: meal.localDate,
      answers,
      mealReaction: { ...reaction, incubationHours: null },
    },
    localDate: meal.localDate,
    occurredAt: null,
    timezone: meal.timezone,
    timePrecision: 'date_only' as const,
    source: 'diet' as const,
    evidenceType: 'user_report' as const,
    references: [{ ...scope, kind: 'observation' as const, id: mealId }],
    idempotencyKey: key,
  };
  return previous
    ? reviseObservation(previous.id, previous.revision, draft)
    : createObservation(draft);
}
