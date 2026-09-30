import type { Observation } from '../domain/observations/types';
export type PatternCategory = 'Bloating' | 'Stomach' | 'Bowel';
/** A missing score/answer stays unknown. Conflicting answers require source review. */
export function dietPatternAnswers(legacy: Record<string, any>, observations: Observation[]) {
  const answers: Record<string, Partial<Record<PatternCategory, Set<boolean>>>> = {};
  const add = (date: string, category: PatternCategory, value: boolean) => {
    ((answers[date] ||= {})[category] ||= new Set()).add(value);
  };
  for (const [date, log] of Object.entries(legacy || {})) {
    if (typeof log.bloatingScore === 'number') add(date, 'Bloating', log.bloatingScore > 0);
    if (typeof log.stomachScore === 'number') add(date, 'Stomach', log.stomachScore > 0);
    if (typeof log.acidReflux === 'boolean') add(date, 'Stomach', log.acidReflux);
    if (Number.isInteger(log.bristolType) && log.bristolType >= 1 && log.bristolType <= 7)
      add(date, 'Bowel', log.bristolType <= 2 || log.bristolType >= 6);
  }
  const categories: Record<string, PatternCategory> = {
    bloating: 'Bloating',
    discomfort: 'Stomach',
    reflux: 'Stomach',
    bowel_changes: 'Bowel',
  };
  for (const record of observations) {
    if (record.deletedAt || !record.localDate) continue;
    const payload = record.payload,
      date = record.localDate;
    if (
      payload.kind === 'daily_checkin' &&
      payload.mealReaction &&
      !(record.references || []).some((reference) =>
        observations.some(
          (meal) =>
            !meal.deletedAt &&
            meal.id === reference.id &&
            meal.payload.kind === 'meal' &&
            meal.localDate === date
        )
      )
    )
      continue;
    if (payload.kind === 'daily_checkin')
      for (const [key, value] of Object.entries(payload.answers)) {
        if (categories[key] && (value === 'yes' || value === 'no'))
          add(date, categories[key], value === 'yes');
      }
    if (payload.kind === 'symptom' && categories[payload.symptomCode || ''])
      add(
        date,
        categories[payload.symptomCode!],
        payload.severity ? payload.severity.value > 0 : true
      );
    if (payload.kind === 'bowel' && payload.bristolType)
      add(date, 'Bowel', payload.bristolType <= 2 || payload.bristolType >= 6);
  }
  return Object.fromEntries(
    Object.entries(answers).map(([date, byCategory]) => [
      date,
      Object.fromEntries(
        Object.entries(byCategory).map(([category, values]) => [
          category,
          values.size === 1 ? [...values][0] : null,
        ])
      ),
    ])
  ) as Record<string, Partial<Record<PatternCategory, boolean | null>>>;
}
