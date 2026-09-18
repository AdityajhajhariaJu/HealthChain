// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { addNutritionLog, updateNutritionLogReaction, getProfile } from '../ProfileEngine';

describe('Post-Meal Reaction Timeline & Incubation Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds a nutrition log and initializes recentLogs properly', () => {
    addNutritionLog({
      meal: 'Pancakes with maple syrup',
      calories: 450,
      protein: 8,
      carbs: 72,
      fat: 14,
      slot: 'morning',
      tags: ['High Glycemic'],
    });

    const profile = getProfile();
    expect(profile.nutrition?.recentLogs).toHaveLength(1);
    expect(profile.nutrition.recentLogs[0].meal).toBe('Pancakes with maple syrup');
    expect(profile.nutrition.recentLogs[0].loggedAt).toBeDefined();
    expect(profile.nutrition.recentLogs[0].id).toBeDefined();
  });

  it('updates a postprandial reaction and records incubation details', () => {
    addNutritionLog({
      id: 'meal_test_1',
      meal: 'Spicy Masala Dal with Rice',
      calories: 420,
      slot: 'noon',
    });

    const reactionPayload = {
      reactionType: 'stomach_upset',
      system: 'stomach',
      severity: 2,
      label: 'Mild gastric burning',
      sublabel: 'Acid reflux',
      emoji: '🔥',
      incubationHours: 1.5,
      loggedAt: new Date().toISOString(),
    };

    updateNutritionLogReaction('meal_test_1', reactionPayload);

    const profile = getProfile();
    const updated = profile.nutrition.recentLogs.find((l: any) => l.id === 'meal_test_1');
    expect(updated).toBeDefined();
    expect(updated.reaction).toBeDefined();
    expect(updated.reaction.reactionType).toBe('stomach_upset');
    expect(updated.reaction.severity).toBe(2);
    expect(updated.reaction.label).toBe('Mild gastric burning');
    expect(updated.reaction.incubationHours).toBe(1.5);
  });

  it('dispatches hc_nutrition_reaction_updated custom event upon logging reaction', () => {
    addNutritionLog({
      id: 'meal_test_2',
      meal: 'Curd Rice with Tadka',
      calories: 320,
    });

    let eventFired = false;
    let eventDetail: any = null;

    const listener = (e: any) => {
      eventFired = true;
      eventDetail = e.detail;
    };
    window.addEventListener('hc_nutrition_reaction_updated', listener);

    updateNutritionLogReaction('meal_test_2', {
      reactionType: 'none',
      system: 'bloating',
      severity: 0,
      label: 'No bloating',
      emoji: '🙂',
      incubationHours: 2.0,
      loggedAt: new Date().toISOString(),
    });

    window.removeEventListener('hc_nutrition_reaction_updated', listener);
    expect(eventFired).toBe(true);
    expect(eventDetail?.logIdentifier).toBe('meal_test_2');
    expect(eventDetail?.reaction?.label).toBe('No bloating');
  });

  it('rejects write and prevents fallback corruption of latest meal when mealId is unknown (TICKET-102)', () => {
    addNutritionLog({
      id: 'meal_safe_latest',
      meal: 'Khichdi with Ghee',
      calories: 300,
    });

    const result = updateNutritionLogReaction('non_existent_meal_id', {
      reactionType: 'heartburn',
      system: 'stomach',
      severity: 3,
      label: 'Severe heartburn',
      emoji: '🔥',
      incubationHours: 1.0,
      loggedAt: new Date().toISOString(),
    });

    expect(result).toEqual({
      success: false,
      error: 'MEAL_NOT_FOUND',
      logIdentifier: 'non_existent_meal_id',
    });

    // Verify latest meal was NOT corrupted!
    const profile = getProfile();
    const latestMeal = profile.nutrition.recentLogs.find((l: any) => l.id === 'meal_safe_latest');
    expect(latestMeal.reaction).toBeUndefined();
  });
});

