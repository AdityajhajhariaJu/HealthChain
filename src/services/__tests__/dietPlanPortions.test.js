import { describe, expect, it } from 'vitest';
import { alignMealPlanPortions, validateGeneratedMealPlan } from '../../../shared/diet-plan-validation.js';

const draft = () => ({ plan: Array.from({ length: 7 }, (_, i) => ({ day: i + 1, meals: [350, 600, 150, 550].map(calories => ({
  name: 'Draft meal', type: 'Meal', calories, protein: 12, carbs: 40, fat: 10,
  ingredients: [{ name: 'Rice', amount: 100, unit: 'g' }, { name: 'Oil', amount: 5, unit: 'ml' }], steps: ['Prepare the measured ingredients.'], prepMinutes: 10,
})) })) });

describe('meal-plan portions and target', () => {
  it('aligns every day, ingredient quantity and nutrient estimate to one consistent portion', () => {
    const original = draft();
    const adjusted = alignMealPlanPortions(original, 2114);
    expect(validateGeneratedMealPlan(adjusted, 7).valid).toBe(true);
    expect(adjusted.plan.map(day => day.meals.reduce((sum, meal) => sum + meal.calories, 0))).toEqual(Array(7).fill(2114));
    expect(adjusted.plan[0].meals[0].ingredients).toEqual([{ name: 'Rice', amount: 128.12, unit: 'g' }, { name: 'Oil', amount: 6.41, unit: 'ml' }]);
    expect(adjusted.plan[0].meals[0].protein).toBe(15.37);
    expect(original.plan[0].meals[0].ingredients[0].amount).toBe(100);
  });

  it('rejects an extreme target adjustment and incomplete recipes', () => {
    const tiny = draft();
    tiny.plan[0].meals.forEach(meal => { meal.calories = 50; });
    expect(alignMealPlanPortions(tiny, 2200)).toBeNull();
    const incomplete = draft();
    incomplete.plan[0].meals[0].ingredients = [];
    expect(alignMealPlanPortions(incomplete, 2200)).toBeNull();
  });
});
