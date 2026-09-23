import { describe, expect, it, vi, beforeEach } from 'vitest';
import { analyzeFoodImage } from '../geminiService';
import { normalizeNutritionTo100g } from '../../components/ui/ARGroceryLens';

describe('Clinical Lens Front-of-Pack Vision & Smart Alternatives', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  it('correctly maps front-of-pack CPG recognition, clinical verdict, and craving-matched smart swaps', async () => {
    const mockModelResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  detected: true,
                  foodName: 'Britannia 50-50 Maska Chaska Biscuits',
                  brand: 'Britannia',
                  servingSize: '1 pack (50g)',
                  calories: 240,
                  protein: 3.2,
                  carbs: 34,
                  fats: 10.5,
                  sugar: 7.2,
                  fibre: 0.8,
                  healthVerdict: 'caution_swap_recommended',
                  verdictHeadline: 'Ultra-Processed · High Glycemic Spike',
                  clinicalRationale: 'Made of 65% refined maida and baked in palm oil with invert syrup. Triggers rapid glucose spikes and systemic inflammation.',
                  novaGrade: 4,
                  flags: ['Palm Oil', 'Refined Maida', 'Invert Sugar Syrup', 'High Sodium'],
                  betterAlternatives: [
                    {
                      name: 'Herb Roasted Makhana',
                      swapType: 'whole_food',
                      reason: 'Zero palm oil, 4x fiber, low glycemic index',
                      satisfactionMatch: 'Same salty, buttery crunch without the refined flour spike',
                      estimatedCalories: 110,
                      protein: 3.8
                    },
                    {
                      name: 'Baked Multigrain Crackers',
                      swapType: 'packaged',
                      reason: 'Whole grains and seeds, clean oil, sustained energy',
                      satisfactionMatch: 'Crisp biscuit texture with high dietary fiber',
                      estimatedCalories: 130,
                      protein: 4.2
                    }
                  ]
                })
              }
            ]
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModelResponse
    } as any);

    const result = await analyzeFoodImage('data:image/jpeg;base64,mockbase64', {
      conditions: ['Fatty Liver', 'Prediabetes'],
      healthFocus: 'Metabolic Health'
    });

    expect(result.detected).toBe(true);
    expect(result.foodName).toBe('Britannia 50-50 Maska Chaska Biscuits');
    expect(result.brand).toBe('Britannia');
    expect(result.healthVerdict).toBe('caution_swap_recommended');
    expect(result.novaGrade).toBe(4);
    expect(result.flags).toContain('Palm Oil');
    expect(result.flags).toContain('Refined Maida');
    expect(result.betterAlternatives?.length).toBe(2);
    expect(result.betterAlternatives?.[0].name).toBe('Herb Roasted Makhana');
    expect(result.betterAlternatives?.[0].swapType).toBe('whole_food');

    // Backward compatibility check
    expect(result.betterAlternative).not.toBeNull();
    expect(result.betterAlternative?.name).toBe('Herb Roasted Makhana');
  });

  it('correctly maps web-scraped ingredients, chemical additives, and Nutri-Score ratings', async () => {
    const mockScrapedResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  detected: true,
                  foodName: 'Karare Peanuts',
                  brand: "Haldiram's",
                  servingSize: '1 pack (40g)',
                  calories: 220,
                  protein: 8.0,
                  carbs: 16.0,
                  fats: 14.0,
                  sugar: 2.0,
                  fibre: 2.0,
                  sodium: 380,
                  healthVerdict: 'caution_swap_recommended',
                  verdictHeadline: 'Ultra-Processed · High Sodium & Inflammatory Fats',
                  clinicalRationale: 'Contains palm oil coating and 380mg sodium per pack. Spikes blood pressure and gut inflammation.',
                  novaGrade: 4,
                  nutriScore: 'D',
                  glycemicImpact: 'High',
                  flags: ['Palm Oil', 'Refined Maida', 'High Sodium'],
                  ingredientsList: ['Peanuts (65%)', 'Palmolein Oil', 'Refined Wheat Flour (Maida)', 'Spices & Condiments', 'Iodised Salt', 'Acidity Regulator (INS 330)'],
                  additives: [
                    { code: 'INS 330', name: 'Citric Acid', purpose: 'Acidity Regulator', riskLevel: 'low' },
                    { code: 'INS 627', name: 'Disodium Guanylate', purpose: 'Flavor Enhancer', riskLevel: 'moderate' }
                  ],
                  allergens: ['Peanuts', 'Gluten (Wheat)'],
                  betterAlternatives: [
                    {
                      name: 'Dry Roasted Salted Peanuts',
                      swapType: 'whole_food',
                      reason: 'Zero palm oil, 60% less sodium, no maida coating',
                      satisfactionMatch: 'Same savory, crunchy peanut bite',
                      estimatedCalories: 160,
                      protein: 7.5,
                      carbs: 6,
                      fats: 12,
                      sugar: 1,
                      fibre: 3,
                      sodium: 120
                    }
                  ]
                })
              }
            ]
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockScrapedResponse
    } as any);

    const result = await analyzeFoodImage('data:image/jpeg;base64,mockKarare', {
      conditions: ['Hypertension'],
      healthFocus: 'Cardiovascular Health'
    });

    expect(result.detected).toBe(true);
    expect(result.foodName).toBe('Karare Peanuts');
    expect(result.sodium).toBe(380);
    expect(result.nutriScore).toBe('D');
    expect(result.glycemicImpact).toBe('High');
    expect(result.ingredientsList?.length).toBe(6);
    expect(result.additives?.length).toBe(2);
    expect(result.additives?.[0].code).toBe('INS 330');
    expect(result.allergens).toContain('Peanuts');
    expect(result.betterAlternatives?.[0].sodium).toBe(120);
    expect(result.topIngredients?.length).toBe(3);
    expect(result.topIngredients?.[0]).toContain('Peanuts');
    expect(result.negatives).toContain('Palmolein Oil Base');
  });

  it('handles non-food detection gracefully', async () => {
    const mockModelResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  detected: false,
                  errorMessage: 'No food or grocery item detected in frame. Please point the camera directly at a meal or food packet.'
                })
              }
            ]
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockModelResponse
    } as any);

    const result = await analyzeFoodImage('data:image/jpeg;base64,mockbase64', {});
    expect(result.detected).toBe(false);
    expect(result.errorMessage).toContain('No food or grocery item detected');
  });

  it('correctly deconstructs plated home-cooked Indian meals (2 roti, rice, curry)', async () => {
    const mockPlatedResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  detected: true,
                  foodName: 'Indian Meal (2 Rotis, Steamed Rice & Dal Curry)',
                  brand: null,
                  servingSize: 'Per 100g (Full Plate: ~370g · Total ~510 kcal)',
                  calories: 138,
                  protein: 4.2,
                  carbs: 25.8,
                  fats: 2.3,
                  sugar: 1.1,
                  fibre: 2.9,
                  sodium: 185,
                  healthVerdict: 'clean_choice',
                  verdictHeadline: 'Whole-Food Balanced Meal · High Starch Ratio',
                  clinicalRationale: 'Nutrient-dense combination of whole wheat and lentils providing complete amino acids. Consider swapping white rice if managing postprandial glucose.',
                  novaGrade: 1,
                  nutriScore: 'A',
                  glycemicImpact: 'Moderate',
                  flags: ['Home Cooked', 'Zero Preservatives'],
                  deceptionAlert: null,
                  positives: ['Fresh Whole Food (NOVA 1)', 'Complete Plant Protein (Dal + Rice)'],
                  negatives: ['Double Starch Load (Roti + Rice combo)'],
                  topIngredients: ['Whole Wheat Atta (2 Rotis)', 'Steamed Basmati Rice', 'Yellow Lentil Dal Tadka'],
                  ingredientsList: ['Whole Wheat Flour (Atta)', 'Basmati Rice', 'Toor Dal (Pigeon Peas)', 'Onion, Tomato, Ginger, Garlic', 'Mustard Oil / Ghee', 'Cumin, Turmeric, Salt'],
                  additives: [],
                  allergens: ['Gluten (Wheat)'],
                  betterAlternatives: [
                    {
                      name: 'Roti & Dal Thali with Cucumber Salad',
                      swapType: 'whole_food',
                      reason: 'Drops white rice to slash glycemic spike by 45% and increase micronutrient density',
                      satisfactionMatch: 'Full satiety with rotis and hearty bowl of dal',
                      estimatedCalories: 115,
                      protein: 4.8
                    }
                  ]
                })
              }
            ]
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPlatedResponse
    } as any);

    const result = await analyzeFoodImage('data:image/jpeg;base64,mockRotiRiceCurry', {
      conditions: ['Prediabetes'],
      healthFocus: 'Metabolic Health'
    });

    expect(result.detected).toBe(true);
    expect(result.foodName).toContain('2 Rotis');
    expect(result.novaGrade).toBe(1);
    expect(result.nutriScore).toBe('A');
    expect(result.topIngredients?.length).toBe(3);
    expect(result.topIngredients?.[0]).toContain('Rotis');
    expect(result.additives?.length).toBe(0);
    expect(result.deceptionAlert).toBeNull();
    expect(result.positives).toContain('Fresh Whole Food (NOVA 1)');
    expect(result.negatives).toContain('Double Starch Load (Roti + Rice combo)');

    // Test 100g normalization extraction of the full plate
    const normalized = normalizeNutritionTo100g({
      foodName: result.foodName,
      servingSize: result.servingSize,
      calories: result.calories,
      protein: result.protein
    });

    expect(normalized.servingSize).toBe('100g');
    expect(normalized.packSizeNote).toBe('Plate: ~370g');
  });

  it('correctly analyzes desserts and restaurant dishes (e.g. 2 Gulab Jamun in syrup)', async () => {
    const mockDessertResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  detected: true,
                  foodName: 'Gulab Jamun (2 pieces in Sugar Syrup)',
                  brand: null,
                  servingSize: 'Per 100g (Portion: 2 pcs [~100g] · Total ~330 kcal)',
                  calories: 330,
                  protein: 4.5,
                  carbs: 52.0,
                  fats: 11.8,
                  sugar: 38.5,
                  fibre: 0.4,
                  sodium: 85,
                  healthVerdict: 'caution_swap_recommended',
                  verdictHeadline: 'High Glycemic Density · Concentrated Added Sugar',
                  clinicalRationale: 'Deep-fried mawa soaked in refined sucrose syrup creates a severe spike in insulin and triglycerides. Best consumed in moderation.',
                  novaGrade: 3,
                  nutriScore: 'E',
                  glycemicImpact: 'High',
                  flags: ['Deep Fried', 'High Sugar', 'Refined Syrup'],
                  deceptionAlert: null,
                  positives: ['Traditional Milk Solid Base (Mawa)'],
                  negatives: ['High Sugar Spike (38.5g/100g)', 'Deep Fried in Fat'],
                  topIngredients: ['Whole Milk Mawa (Khoya)', 'Refined Sugar Syrup', 'Edible Cooking Oil / Ghee'],
                  ingredientsList: ['Mawa (Condensed Milk Solids)', 'Refined Wheat Flour (Maida)', 'Sugar Syrup', 'Cardamom & Rose Water', 'Ghee / Oil for Frying'],
                  additives: [],
                  allergens: ['Dairy (Milk)', 'Gluten (Wheat)'],
                  betterAlternatives: [
                    {
                      name: 'Date & Walnut Halwa or Baked Rasgulla',
                      swapType: 'whole_food',
                      reason: 'Sweetened with whole dates, 3x fiber, healthy omega fats from walnuts, zero refined sugar spike',
                      satisfactionMatch: 'Rich, comforting sweet mouthfeel without the sugar crash',
                      estimatedCalories: 190,
                      protein: 5.2
                    }
                  ]
                })
              }
            ]
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockDessertResponse
    } as any);

    const result = await analyzeFoodImage('data:image/jpeg;base64,mockGulabJamun', {
      conditions: ['Type 2 Diabetes'],
      healthFocus: 'Blood Glucose Control'
    });

    expect(result.detected).toBe(true);
    expect(result.foodName).toContain('Gulab Jamun');
    expect(result.sugar).toBe(38.5);
    expect(result.healthVerdict).toBe('caution_swap_recommended');
    expect(result.nutriScore).toBe('E');
    expect(result.glycemicImpact).toBe('High');
    expect(result.negatives).toContain('High Sugar Spike (38.5g/100g)');
    expect(result.betterAlternatives?.[0].name).toContain('Date & Walnut');
  });
});

describe('100g Standardization Engine', () => {
  it('correctly rescales packaged portion (e.g. 60g biscuits) to standard 100g benchmark', () => {
    const raw60gFood = {
      foodName: 'Sour Cream & Onion Biscuits',
      servingSize: '1 pack (60g)',
      calories: 290,
      protein: 3.8,
      carbs: 38.2,
      fats: 12.5,
      sugar: 1.8,
      fibre: 1.2,
      sodium: 210
    };

    const normalized = normalizeNutritionTo100g(raw60gFood);

    // 100 / 60 = 1.66667
    expect(normalized.calories).toBe(483);
    expect(normalized.protein).toBe(6.3);
    expect(normalized.carbs).toBe(63.7);
    expect(normalized.fats).toBe(20.8);
    expect(normalized.sugar).toBe(3.0);
    expect(normalized.fibre).toBe(2.0);
    expect(normalized.sodium).toBe(350);
    expect(normalized.servingSize).toBe('100g');
    expect(normalized.packSizeNote).toBe('Pack: 60g');
  });

  it('preserves values when already explicitly normalized to 100g', () => {
    const per100gFood = {
      foodName: 'Dark Chocolate Almonds',
      servingSize: 'Per 100g (Pack size: 40g)',
      calories: 540,
      protein: 12.0,
      carbs: 45.0,
      fats: 36.0,
      sugar: 22.0,
      fibre: 8.0,
      sodium: 80
    };

    const normalized = normalizeNutritionTo100g(per100gFood);

    expect(normalized.calories).toBe(540);
    expect(normalized.protein).toBe(12.0);
    expect(normalized.carbs).toBe(45.0);
    expect(normalized.fats).toBe(36.0);
    expect(normalized.sugar).toBe(22.0);
    expect(normalized.fibre).toBe(8.0);
    expect(normalized.sodium).toBe(80);
    expect(normalized.servingSize).toBe('100g');
    expect(normalized.packSizeNote).toBe('Pack: 40g');
  });
});
