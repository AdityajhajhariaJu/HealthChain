import { describe, expect, it } from 'vitest';
import { normalizeFullMealPlan, updateMealServing, applyMealClinicalSwap } from '../dietPlanLifecycle';
import { projectDietGroceries } from '../dietGroceryProjection';

const plan = () => normalizeFullMealPlan({ id: 'plan-1', plan: [
  { day: 1, meals: [{ id: 'breakfast', name: 'Oats', type: 'Breakfast', calories: 300, protein: 12, carbs: 40, fat: 10,
    ingredients: [{ name: 'Oats', amount: 80, unit: 'g' }, { name: 'Milk', amount: 200, unit: 'ml' }],
    steps: ['Cook oats'], prepMinutes: 10 }] },
  { day: 2, meals: [{ id: 'lunch', name: 'Oats again', type: 'Lunch', calories: 300, protein: 12, carbs: 40, fat: 10,
    ingredients: [{ name: 'oats', amount: 40, unit: 'g' }], steps: ['Cook'], prepMinutes: 10 }] },
] });

describe('deterministic Diet shopping projection', () => {
  it('aggregates ingredient amounts, scales servings, and keeps checks by stable key', () => {
    const original = projectDietGroceries(plan());
    expect(original[0].items.find((item) => item.ingredient === 'Oats')?.amount).toBe(120);
    const checked = [{ ...original[0], items: original[0].items.map((item) => ({ ...item, checked: item.ingredient === 'Oats' })) }];
    const scaled = projectDietGroceries(updateMealServing(plan(), 1, 'breakfast', 1.5), checked);
    expect(scaled[0].items.find((item) => item.ingredient === 'Oats')).toMatchObject({ amount: 160, checked: true });
    expect(scaled[0].items.find((item) => item.ingredient === 'Milk')?.amount).toBe(300);
  });

  it('removes old recipe ingredients after a replacement', () => {
    const replacement = applyMealClinicalSwap(plan(), 1, 'breakfast', { smartReplacement: 'New dish', replacementDetails: 'User selection', biologicalMechanism: 'User note' } as any);
    const items = projectDietGroceries(replacement)[0].items;
    expect(items).toHaveLength(1);
    expect(items[0].amount).toBe(40);
  });
});
