import { describe, it, expect, vi } from 'vitest';
vi.mock('../ProfileEngine', () => ({
  getProfile: () => null,
  saveProfile: vi.fn(),
  getProfileKey: () => 'guest',
}));
import { favoriteFromMeal, reusedMealEntry, effectiveFoodLocation } from '../dietEveryday';
import { normalizeFullMealPlan } from '../dietPlanLifecycle';
import { preserveAcceptedMeals } from '../dietPlanChoices';
describe('reusable meal provenance and accepted plans', () => {
  it('retains the original catalog and scales a new matching portion', () => {
    const favorite = favoriteFromMeal({
      name: 'Drink',
      nutritionSource: 'food_catalog',
      sourceId: 'catalog:123',
      originalNutritionBasis: 'per_100ml',
      originalLabelNutrients: { calories: 40, protein: 2, carbs: 6, fat: 1 },
      per100Nutrients: { calories: 40, protein: 2, carbs: 6, fat: 1 },
      amountValue: 250,
      amountUnit: 'ml',
      calories: 100,
      protein: 5,
      carbs: 15,
      fat: 2.5,
    });
    expect(favorite).toMatchObject({
      nutritionSource: 'food_catalog',
      sourceId: 'catalog:123',
      originalLabelNutrients: { calories: 40 },
    });
    expect(reusedMealEntry(favorite, { amountValue: 125, amountUnit: 'ml' })).toMatchObject({
      calories: 50,
      protein: 2.5,
      amountValue: 125,
      sourceId: 'catalog:123',
    });
    expect(reusedMealEntry(favorite, { amountValue: 125, amountUnit: 'g' })).toMatchObject({
      calories: null,
      protein: null,
    });
    expect(reusedMealEntry(favorite, {})).toMatchObject({
      calories: 100,
      amountValue: 250,
      amountUnit: 'ml',
    });
  });
  it('does not keep recipe calories or ingredient quantities after an unrelated weight change', () => {
    const meal = {
      name: 'Rice bowl',
      calories: 500,
      protein: 15,
      carbs: 70,
      fat: 20,
      ingredients: [{ name: 'Rice', amount: 80, unit: 'g' }],
      servingMultiplier: 1.5,
    };
    expect(favoriteFromMeal(meal).ingredients?.[0].amount).toBe(120);
    const changed = reusedMealEntry(favoriteFromMeal(meal), { amountValue: 400, amountUnit: 'g' });
    expect(changed.calories).toBeNull();
    expect(changed.ingredients).toBeUndefined();
  });
  it('expires travel without overwriting residence and rejects imaginary countries/dates', () => {
    const profile = {
      countryCode: 'IN',
      region: 'Delhi',
      practical: { travelCountryCode: 'JP', travelRegion: 'Osaka', travelUntil: '2026-09-30' },
    };
    expect(effectiveFoodLocation(profile, '2026-09-30')).toEqual({
      countryCode: 'JP',
      region: 'Osaka',
    });
    expect(effectiveFoodLocation(profile, '2026-10-01')).toEqual({
      countryCode: 'IN',
      region: 'Delhi',
    });
    expect(
      effectiveFoodLocation(
        { ...profile, practical: { travelCountryCode: 'ZZ', travelUntil: '2026-02-30' } },
        '2026-01-01'
      )
    ).toEqual({ countryCode: 'IN', region: 'Delhi' });
  });
  it('preserves accepted meals by day and slot when replacing the rest of the week', () => {
    const previous = normalizeFullMealPlan({
      id: 'old',
      days: [
        {
          day: 1,
          meals: [
            {
              id: 'accepted',
              type: 'Breakfast',
              name: 'My breakfast',
              calories: 500,
              protein: 15,
              carbs: 70,
              fat: 15,
              pinned: true,
            },
          ],
        },
      ],
    });
    const next = normalizeFullMealPlan({
      id: 'new',
      days: [
        {
          day: 1,
          meals: [
            {
              id: 'replacement',
              type: 'Breakfast',
              name: 'New breakfast',
              calories: 400,
              protein: 12,
              carbs: 60,
              fat: 10,
            },
            {
              id: 'lunch',
              type: 'Lunch',
              name: 'New lunch',
              calories: 600,
              protein: 20,
              carbs: 90,
              fat: 15,
            },
          ],
        },
      ],
    });
    const kept = preserveAcceptedMeals(next, previous);
    expect(kept.days[0].meals.map((meal) => meal.name)).toEqual(['My breakfast', 'New lunch']);
    expect(kept.days[0].total_calories).toBe(1100);
  });
});
