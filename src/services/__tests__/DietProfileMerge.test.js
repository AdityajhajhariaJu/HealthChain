import { describe, expect, it } from 'vitest';
import { preserveDietPlanState } from '../DietProfileMerge';

describe('diet plan recovery across profile snapshots', () => {
  it('honors an explicit reset without resurrecting a previous plan', () => {
    const remote = { dietMealPlan: { id: 'old', updatedAt: '2026-09-30T09:00:00Z' },
      dietArchivedPlans: [{ id: 'archived', updatedAt: '2026-09-29T09:00:00Z' }] };
    const local = { dietMealPlan: null, dietResetAt: '2026-09-30T10:00:00Z' };
    const merged = preserveDietPlanState({ ...remote, ...local }, local, remote);
    expect(merged.dietMealPlan).toBeNull();
    expect(merged.dietician.mealPlan).toBeNull();
    expect(merged.dietArchivedPlans).toEqual([]);
  });

  it('unions retained archives and synchronizes flat and nested plan fields', () => {
    const remote = { dietician: { mealPlan: { id: 'old', updatedAt: '2026-09-30T09:00:00Z' },
      archivedPlans: [{ id: 'archive-without-date' }] } };
    const local = { dietMealPlan: { id: 'new', updatedAt: '2026-09-30T10:00:00Z' },
      dietArchivedPlans: [{ id: 'old', updatedAt: '2026-09-30T09:00:00Z' }] };
    const merged = preserveDietPlanState({ ...remote, ...local }, local, remote);
    expect(merged.dietMealPlan.id).toBe('new');
    expect(merged.dietician.mealPlan).toEqual(merged.dietMealPlan);
    expect(merged.dietArchivedPlans.map(plan => plan.id)).toEqual(['old', 'archive-without-date']);
  });
});
