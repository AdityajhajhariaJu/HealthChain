import { describe, expect, it, vi, beforeEach } from 'vitest';
import { analyzeFoodImage } from '../geminiService';

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
});
