import { describe, expect, it } from 'vitest';
import { formatGutCurrentConcernBrief, getGutConcernDate } from '../GutCurrentConcernService';
import type { GutQuestionThread } from '../GutResolutionService';
import type { GutSnapshot } from '../GutHealthSummary';

const thread = {
  intent: 'now', question: 'I have stomach pain after lunch today', createdAt: '2026-09-26T10:00:00Z',
  symptomOnset: null, reflection: null,
} as GutQuestionThread;

describe('current Gut concern brief', () => {
  it('does not turn the question time or same-date meal into symptom onset or cause', () => {
    const date = getGutConcernDate(thread);
    const snapshot = {
      meals: [{ id: 'meal-actual-1', name: 'Lunch', date, time: null, timePrecision: 'date_only', sourceKind: 'diet_meal' }],
      days: [],
    } as unknown as GutSnapshot;
    const brief = formatGutCurrentConcernBrief(thread, snapshot);
    expect(brief).toContain('When symptoms began: not recorded');
    expect(brief).toContain('The question date is not symptom onset');
    expect(brief).toContain('source diet_meal meal-actual-1; date only, order unknown');
    expect(brief).toContain('same-date context, not a cause or confirmed order');
  });

  it('uses an explicitly reported onset and keeps absence of records explicit', () => {
    const reported = { ...thread, symptomOnset: { occurredAt: '2026-09-25T09:00:00Z', precision: 'approximate' as const }, reflection: 'The pain settled later.' };
    const brief = formatGutCurrentConcernBrief(reported, { meals: [], days: [] } as unknown as GutSnapshot);
    expect(brief).toContain('approximate time, reported by me');
    expect(brief).toContain('No meal record saved for that date');
    expect(brief).toContain('The pain settled later.');
  });
});
