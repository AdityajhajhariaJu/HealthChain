import { describe, expect, it } from 'vitest';
import { calculateDietTargets } from '../dietTargets';
import { hasUnverifiableDietConstraints, validateGeneratedMealPlan } from '../dietPlanValidation';

describe('Diet estimate and generated-plan boundary', () => {
  const metric = {
    age: 30, gender: 'male', weight: '70', weightUnit: 'kg', height: '175.26', heightUnit: 'cm',
    activityLevel: 'moderate', goal: 'Lose weight', targetWeight: '67', targetDays: '90',
  };

  it('produces the same estimate for equivalent metric and imperial inputs', () => {
    const metricResult = calculateDietTargets(metric);
    const imperialResult = calculateDietTargets({ ...metric, weight: String(70 / 0.45359237), weightUnit: 'lbs',
      height: '', heightUnit: 'ft', heightFt: '5', heightIn: '9', targetWeight: String(67 / 0.45359237) });
    expect(metricResult.available).toBe(true);
    expect(imperialResult.available).toBe(true);
    if (metricResult.available && imperialResult.available) {
      expect(imperialResult.targets.targetCalories).toBeCloseTo(metricResult.targets.targetCalories, 0);
      expect(imperialResult.targets.targetWeightKg).toBeCloseTo(67, 5);
    }
  });

  it('leaves unsupported or incomplete targets unset', () => {
    expect(calculateDietTargets({ ...metric, age: 12 }).available).toBe(false);
    expect(calculateDietTargets({ ...metric, gender: '' }).available).toBe(false);
    expect(calculateDietTargets({ ...metric, gender: 'female', pregnancyStatus: 'unknown' }).available).toBe(false);
    expect(calculateDietTargets({ ...metric, heightUnit: 'ft', heightFt: '5', heightIn: '13' }).available).toBe(false);
    expect(calculateDietTargets({ ...metric, targetWeight: '' }).available).toBe(false);
    expect(calculateDietTargets({ ...metric, goal: 'Unspecified' }).available).toBe(false);
  });

  it('does not turn a lean-mass preservation preference into a weight-gain target', () => {
    const maintenance = calculateDietTargets({ ...metric, goal: 'Maintain', targetWeight: '' });
    const preservation = calculateDietTargets({ ...metric, goal: 'Lean mass preservation', targetWeight: '' });
    expect(maintenance.available).toBe(true);
    expect(preservation.available).toBe(true);
    if (maintenance.available && preservation.available) {
      expect(preservation.targets.targetCalories).toBe(maintenance.targets.targetCalories);
      expect(preservation.targets.targetWeightKg).toBeNull();
    }
  });

  const plan = { plan: Array.from({ length: 7 }, (_, index) => ({
    day: index + 1,
    meals: [{ type: 'Lunch', name: `Meal ${index + 1}`, calories: 400, protein: 20, carbs: 45, fat: 15,
      ingredients: [{ name: 'Rice', amount: 80, unit: 'g' }], steps: ['Cook rice'], prepMinutes: 20 }],
  })) };

  it('rejects partial plans and fabricated or invalid nutrient values', () => {
    expect(validateGeneratedMealPlan(plan, 7).valid).toBe(true);
    expect(validateGeneratedMealPlan({ plan: plan.plan.slice(0, 6) }, 7).valid).toBe(false);
    expect(validateGeneratedMealPlan({ plan: plan.plan.map((day, index) => index === 1 ? { ...day, day: 1 } : day) }, 7).valid).toBe(false);
    expect(validateGeneratedMealPlan({ plan: plan.plan.map((day, index) => index === 1 ? { ...day, meals: [{ ...day.meals[0], calories: -1 }] } : day) }, 7).valid).toBe(false);
    expect(validateGeneratedMealPlan({ plan: plan.plan.map((day, index) => index === 1 ? { ...day, meals: [{ ...day.meals[0], protein: undefined }] } : day) }, 7).valid).toBe(false);
  });

  it('permits broad menu preferences while blocking constraints requiring verified ingredients', () => {
    expect(hasUnverifiableDietConstraints({ restrictions: ['None'] }, [])).toBe(false);
    expect(hasUnverifiableDietConstraints({ restrictions: ['Vegan'] }, [])).toBe(false);
    expect(hasUnverifiableDietConstraints({ restrictions: ['Gluten Free'] }, [])).toBe(true);
    expect(hasUnverifiableDietConstraints({ restrictions: ['None'] }, [{ name: 'Peanut' }])).toBe(true);
  });
});
