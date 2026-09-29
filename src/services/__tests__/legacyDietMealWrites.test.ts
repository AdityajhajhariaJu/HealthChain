// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getProfile } from '../ProfileEngine';
import { deleteDietMealEntry, saveDietMealEntries } from '../legacyDietMealWrites';

describe('interim Diet meal write boundary', () => {
  beforeEach(() => localStorage.clear());

  it('saves one ID to flat, nested and shared nutrition views, then removes it from all three', async () => {
    const date = '2026-09-29';
    const saved = await saveDietMealEntries(date, [{ id: 'meal-test-1', name: 'Rice and lentils', calories: 410, nutritionSource: 'text_estimate' }]);
    expect(saved.ok).toBe(true);
    expect(getProfile().dietFoodLogs[date].map((meal: any) => meal.id)).toContain('meal-test-1');
    expect(getProfile().dietician.foodLogs[date].map((meal: any) => meal.id)).toContain('meal-test-1');
    expect(getProfile().nutrition.recentLogs.map((meal: any) => meal.id)).toContain('meal-test-1');

    expect(await saveDietMealEntries(date, [{ id: 'meal-test-1', name: 'Rice and lentils' }])).toMatchObject({ ok: false, error: 'conflict' });
    expect(await deleteDietMealEntry(date, 'meal-test-1')).toMatchObject({ ok: true });
    expect(getProfile().dietFoodLogs[date]).toHaveLength(0);
    expect(getProfile().dietician.foodLogs[date]).toHaveLength(0);
    expect(getProfile().nutrition.recentLogs).toHaveLength(0);
  });
});
