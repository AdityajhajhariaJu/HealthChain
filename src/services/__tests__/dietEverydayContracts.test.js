import { describe, it, expect } from 'vitest';
import {
  validProductBarcode,
  normalizeFoodProduct,
  productPortion,
} from '../../../shared/food-product.js';
import {
  normalizeDietPreferences,
  validPlanningPreferences,
  dietPlanningPreferences,
  dietMealSlots,
  mealSlotFor,
} from '../../../shared/diet-preferences.js';
import { validateDietPreferenceFit } from '../../../shared/diet-preference-fit.js';
import { mealReminderEvents, quietMealMinute } from '../../../shared/diet-reminders.js';
import { dietPatternAnswers } from '../dietPatternRecords';
import { dietDiaryCsv } from '../dietDiaryExport';
import { preserveDietPlanState } from '../DietProfileMerge.js';

describe('everyday food boundaries', () => {
  it('bounds practical data and keeps chosen meal slots distinct from unscheduled food', () => {
    const p = normalizeDietPreferences({
      householdSize: 999,
      maxPrepMinutes: 0,
      dislikes: [' tomato ', 'tomato'],
      showNumbers: false,
    });
    expect(p).toMatchObject({
      householdSize: 1,
      maxPrepMinutes: 30,
      dislikes: ['tomato'],
      showNumbers: false,
    });
    const request = dietPlanningPreferences({ practical: p, restrictions: ['Vegan'] });
    expect(validPlanningPreferences(request)).toBe(true);
    expect(validPlanningPreferences({ ...request, householdSize: 2 })).toBe(false);
    expect(dietMealSlots('3 Meals')).toHaveLength(3);
    expect(dietMealSlots('5 Small Meals')).toHaveLength(5);
    expect(mealSlotFor('Evening Snack', '3 Meals + 1 Snack')).toBe('Snack');
    expect(mealSlotFor('Quick meal', '3 Meals')).toBe('Other meals');
  });
  it('rejects obvious diet pattern, preparation and avoided ingredient conflicts', () => {
    const pref = dietPlanningPreferences({
      practical: { maxPrepMinutes: 15, dislikes: ['tomato'], equipment: ['No cooking'] },
      restrictions: ['Vegan'],
    });
    const bad = {
      days: [
        {
          meals: [
            {
              prepMinutes: 30,
              ingredients: [{ name: 'Chicken' }, { name: 'Milk' }, { name: 'Tomato' }],
              steps: ['Boil rice'],
            },
          ],
        },
      ],
    };
    expect(validateDietPreferenceFit(bad, pref).errors).toHaveLength(5);
    expect(
      validateDietPreferenceFit(
        {
          days: [
            {
              meals: [
                {
                  prepMinutes: 5,
                  ingredients: [{ name: 'Oat milk' }],
                  steps: ['Combine ingredients'],
                },
              ],
            },
          ],
        },
        pref
      ).valid
    ).toBe(true);
  });
  it('accepts explicitly prepared staples for no-cooking meals and rejects raw staples',()=>{
    const p=dietPlanningPreferences({practical:{equipment:['No cooking']},restrictions:['Vegetarian']});
    const meal={prepMinutes:5,steps:['Peel eggs and combine the salad.'],ingredients:[{name:'Hard-boiled eggs'},{name:'Canned chickpeas'}]};
    expect(validateDietPreferenceFit({days:[{meals:[meal]}]},p).valid).toBe(true);
    expect(validateDietPreferenceFit({days:[{meals:[{...meal,ingredients:[{name:'Dry chickpeas'}]}]}]},p).valid).toBe(false);
  });
  it('checks barcode identity, keeps missing nutrients unknown and converts kJ only from the kJ field', () => {
    expect(validProductBarcode('3017620422003')).toBe(true);
    expect(validProductBarcode('3017620422004')).toBe(false);
    expect(validProductBarcode('http://example.com')).toBe(false);
    const product = normalizeFoodProduct(
      {
        product: {
          code: '3017620422003',
          product_name: 'Test',
          nutrition_data_per: '100g',
          nutriments: {
            'energy-kj_100g': 418.4,
            proteins_100g: 4,
            carbohydrates_100g: 12,
            fat_100g: 2,
          },
        },
      },
      '3017620422003'
    );
    expect(product.per100).toMatchObject({ calories: 100, protein: 4, sugar: null });
    expect(productPortion(product.per100, 35)).toMatchObject({
      calories: 35,
      protein: 1.4,
      sugar: null,
    });
    expect(
      normalizeFoodProduct({ product: { code: '1234567890128' } }, '3017620422003')
    ).toBeNull();
    expect(() => productPortion(product.per100, 0)).toThrow();
  });
  it('does not invent mass-volume conversion or use estimated catalog fields', () => {
    const product = normalizeFoodProduct(
      {
        product: {
          nutrition_data_per: '100g',
          product_quantity_unit: 'ml',
          nutriments_estimated: { proteins_100g: 12 },
          nutriments: { energy_100g: 900 },
        },
      },
      '3017620422003'
    );
    expect(product.basis).toBe('unknown');
    expect(product.per100).toMatchObject({ calories: null, protein: null });
  });
  it('handles overnight preparation and quiet hours without scheduling a duplicate meal', () => {
    expect(quietMealMinute(23 * 60, '22:00', '07:00')).toBe(true);
    expect(quietMealMinute(12 * 60, '22:00', '07:00')).toBe(false);
    const reminders = [
      { id: 'midnight', label: 'Breakfast', enabled: true, time: '00:10', prepMinutes: 30 },
    ];
    expect(mealReminderEvents(reminders)).toMatchObject([
      { minute: 10, kind: 'meal' },
      { minute: 1420, kind: 'prep' },
    ]);
    expect(mealReminderEvents(reminders, '22:00', '07:00')).toEqual([]);
    expect(mealReminderEvents([{ ...reminders[0], enabled: false }])).toEqual([]);
  });
  it('excludes missing or conflicting symptom answers from the denominator and escapes exported text', () => {
    const answers = dietPatternAnswers(
      { '2026-09-29': { bristolType: 3 }, '2026-09-28': { bloatingScore: 0 } },
      [
        {
          localDate: '2026-09-28',
          payload: { kind: 'daily_checkin', answers: { bloating: 'yes', reflux: 'unanswered' } },
        },
      ]
    );
    expect(answers['2026-09-29'].Bloating).toBeUndefined();
    expect(answers['2026-09-28'].Bloating).toBeNull();
    const csv = dietDiaryCsv({
      '2026-09-29': [
        {
          id: 'test',
          name: '=HYPERLINK("bad")',
          calories: null,
          protein: 0,
          timePrecision: 'date_only',
        },
      ],
    });
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"date_only"');
    expect(csv).toContain('"0"');
  });
  it('does not restore pre-reset preferences, reminders or library records from an older device', () => {
    const old = {
      dietProfile: {
        preferencesUpdatedAt: '2026-09-29T00:00:00Z',
        practical: { showNumbers: true },
      },
      dietGroceryUpdatedAt: '2026-09-29T00:00:00Z',
      dietGrocery: [{ category: 'old' }],
      dietEveryday: {
        updatedAt: '2026-09-29T00:00:00Z',
        reminders: [{ enabled: true }],
        favorites: [{ id: 'f1', name: 'Toast', updatedAt: '2026-09-29T00:00:00Z' }],
        pantry: [],
      },
    };
    const reset = { dietResetAt: '2026-09-30T00:00:00Z', dietProfile: null, dietMealPlan: null };
    const merged = preserveDietPlanState(old, reset, old);
    expect(merged.dietProfile).toBeNull();
    expect(merged.dietGrocery).toEqual([]);
    expect(merged.dietEveryday.reminders).toEqual([]);
    expect(merged.dietEveryday.favorites[0].deletedAt).toBeTruthy();
  });
  it('merges library and pantry tombstones independently of plan state', () => {
    const old = {
      dietEveryday: {
        updatedAt: '2026-09-29T00:00:00Z',
        favorites: [{ id: 'f1', name: 'Toast', updatedAt: '2026-09-29T00:00:00Z' }],
        pantry: [],
      },
    };
    const deleted = {
      dietEveryday: {
        updatedAt: '2026-09-30T00:00:00Z',
        favorites: [
          {
            id: 'f1',
            name: 'Toast',
            updatedAt: '2026-09-30T00:00:00Z',
            deletedAt: '2026-09-30T00:00:00Z',
          },
          { id: 'f2', name: 'Rice', updatedAt: '2026-09-30T00:00:00Z' },
        ],
        pantry: [],
      },
    };
    const merged = preserveDietPlanState(old, old, deleted);
    expect(merged.dietEveryday.favorites).toHaveLength(2);
    expect(merged.dietEveryday.favorites.find((item) => item.id === 'f1').deletedAt).toBeTruthy();
  });
});
