import type { GutQuestionThread } from './GutResolutionService';
import type { GutSnapshot } from './GutHealthSummary';

/** The question date is a record-browsing anchor, never a claimed symptom onset. */
export function getGutConcernDate(thread: GutQuestionThread): string {
  const anchor = thread.symptomOnset?.occurredAt || thread.createdAt;
  const date = new Date(anchor);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** A short, source-aware account for a care conversation, not a diagnosis. */
export function formatGutCurrentConcernBrief(thread: GutQuestionThread, snapshot: GutSnapshot): string {
  const date = getGutConcernDate(thread);
  const meals = snapshot.meals.filter((meal) => meal.date === date);
  const day = snapshot.days.find((item) => item.date === date);
  const lines = [
    'GUT HEALTH · PATIENT-REPORTED CARE SUMMARY',
    `My concern: ${thread.question}`,
    ...(thread.clarifications || []).map(item => `My added detail — ${item.question}: ${item.answer}`),
    thread.symptomOnset
      ? `When I recall it began: ${new Date(thread.symptomOnset.occurredAt).toLocaleString()} (${thread.symptomOnset.precision} time, reported by me).`
      : 'When symptoms began: not recorded. The question date is not symptom onset.',
    `Records dated ${date || 'unknown'} (same-date context, not a cause or confirmed order):`,
    ...(meals.length
      ? meals.slice(0, 6).map((meal) => `Meal: ${meal.name}; source ${meal.sourceKind || 'diet_meal'} ${meal.id}; ${meal.timePrecision === 'exact' || meal.timePrecision === 'approximate' ? `${meal.timePrecision} occurrence time ${meal.time || 'recorded'}` : 'date only, order unknown'}.`)
      : ['No meal record saved for that date. This does not mean no meal was eaten.']),
    ...(day ? [`Digestion record: bloating ${day.bloating === null ? 'not rated' : `${day.bloating}/10`}; discomfort ${day.discomfort === null ? 'not rated' : `${day.discomfort}/10`}. These are date-level reports, not meal-linked outcomes.`] : ['No dated digestion rating saved for that date.']),
    `What happened afterward, in my words: ${thread.reflection || 'not recorded'}.`,
    'Question for a clinician: What should I do about this concern, and what details would help evaluate it?',
    'These are patient reports and saved records. This summary does not establish a cause, diagnosis, or care instruction.',
  ];
  return lines.join('\n');
}
