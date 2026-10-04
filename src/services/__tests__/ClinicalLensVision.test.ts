import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../AIConsent', () => ({ requestAIConsent: async () => {}, hasAIConsent: () => true, AI_CONSENT_VERSION: '2026-10-04' }));
import { analyzeFoodImage } from '../geminiService';
import {
  normalizeNutritionTo100g,
  scaleNutritionForPortion,
} from '../../components/ui/ARGroceryLens';

const nutrition = {
  detected: true,
  foodName: 'Example biscuits',
  foodType: 'packaged' as const,
  nutritionBasis: 'per_100g' as const,
  portionGrams: 60,
  calories: 480,
  protein: 8,
  carbs: 60,
  fats: 20,
  sugar: 10,
  fibre: 4,
  sodium: 350,
};

function reply(result: object) {
  global.fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(result) }] } }],
        }),
        { status: 200 }
      )
    );
}

describe('Clinical Lens safe nutrition estimate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('drops unsupported medical, allergy, and official score claims from AI output', async () => {
    reply({
      ...nutrition,
      nutriScore: 'A',
      novaGrade: 1,
      glycemicImpact: 'Low',
      allergens: ['None'],
      ingredientsList: ['No allergens'],
      flags: ['Safe for diabetes'],
      clinicalRationale: 'Prevents spikes',
      betterAlternatives: [{ name: 'Plain oats', reason: 'Clinically superior' }],
    });
    const result = await analyzeFoodImage('data:image/jpeg;base64,abc', {
      allergies: [{ name: 'Peanuts' }],
    });
    expect(result.detected).toBe(true);
    expect(result).not.toHaveProperty('nutriScore');
    expect(result).not.toHaveProperty('novaGrade');
    expect(result).not.toHaveProperty('glycemicImpact');
    expect(result).not.toHaveProperty('allergens');
    expect(result).not.toHaveProperty('ingredientsList');
    expect(result).not.toHaveProperty('clinicalRationale');
    expect(result.betterAlternatives?.[0].reason).not.toContain('Clinically');
    expect(result.warning).toContain('cannot verify allergens');
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/gemini');
    expect(String(options?.body)).not.toContain('Peanuts');
  });

  it('rejects missing nutrients instead of turning them into zeros', async () => {
    const { sodium: _missing, ...partial } = nutrition;
    reply(partial);
    const result = await analyzeFoodImage('data:image/jpeg;base64,abc', {});
    expect(result.detected).toBe(false);
    expect(result.errorMessage).toContain('incomplete');
  });

  it('rejects implausible nutrients and unclear serving basis', async () => {
    reply({ ...nutrition, calories: 1400 });
    expect((await analyzeFoodImage('data:image/jpeg;base64,abc', {})).detected).toBe(false);
    reply({ ...nutrition, nutritionBasis: 'unknown' });
    expect((await analyzeFoodImage('data:image/jpeg;base64,abc', {})).detected).toBe(false);
  });

  it('requires a printed serving weight before converting a package label', async () => {
    reply({ ...nutrition, nutritionBasis: 'per_serving', servingGrams: null });
    expect((await analyzeFoodImage('data:image/jpeg;base64,abc', {})).detected).toBe(false);
  });

  it('keeps a non-food result as an error', async () => {
    reply({ detected: false, errorMessage: 'No food visible' });
    expect(await analyzeFoodImage('data:image/jpeg;base64,abc', {})).toMatchObject({
      detected: false,
      errorMessage: 'No food visible',
    });
  });
});

describe('Clinical Lens portion calculation', () => {
  it('logs the 60g pack using its actual portion', () => {
    const normalized = normalizeNutritionTo100g(nutrition);
    expect(normalized.calories).toBe(480);
    expect(normalized.portionGrams).toBe(60);
    expect(scaleNutritionForPortion(normalized, 60).calories).toBe(288);
  });

  it('normalizes a small serving without a hidden cap', () => {
    const normalized = normalizeNutritionTo100g({
      ...nutrition,
      nutritionBasis: 'per_serving',
      servingGrams: 5,
      portionGrams: 5,
      calories: 25,
      protein: 0.5,
      carbs: 3,
      fats: 1,
      sugar: 0.5,
      fibre: 0.2,
      sodium: 15,
    });
    expect(normalized.calories).toBe(500);
    expect(normalized.portionGrams).toBe(5);
    expect(scaleNutritionForPortion(normalized, 5).calories).toBe(25);
  });

  it('requires complete and plausible values before scaling', () => {
    expect(() => normalizeNutritionTo100g({ ...nutrition, sodium: undefined })).toThrow(
      'Missing sodium'
    );
    expect(() => scaleNutritionForPortion(normalizeNutritionTo100g(nutrition), 0)).toThrow();
  });

  it('calculates a prepared meal for the actual portion', () => {
    const normalized = normalizeNutritionTo100g({
      ...nutrition,
      foodName: 'Lunch plate',
      foodType: 'meal',
      portionGrams: 370,
      calories: 138,
    });
    expect(normalized.foodType).toBe('meal');
    expect(scaleNutritionForPortion(normalized, 370).calories).toBe(511);
  });
});
