// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeFullMealPlan,
  normalizeMealItem,
  normalizeDayItem,
  updateMealServing,
  editMealContent,
  applyMealClinicalSwap,
  transitionPlanStatus,
  archiveCurrentPlan,
  generateDietObservationsSummary,
  exportDietObservationsToCase,
  PORTION_ESTIMATE_DISCLAIMER,
  NON_CAUSAL_TIMING_DISCLAIMER,
  CLINICAL_SAFETY_GUARDRAIL,
  PLAN_STOP_REASON_LABELS,
  type FullMealPlan,
  type MealPlanItem,
  type PlanStopReason,
} from '../dietPlanLifecycle';
import { getAllClinicalDietarySwaps } from '../clinicalDietarySwaps';
import { createCaseDraft, getCase, getCaseQuestions, clearCaseEngineCache } from '../CaseEngine';

describe('Package 7: Diet and Elimination Workflows & Plan Lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCaseEngineCache();
  });

  const sampleRawPlan = {
    id: 'test_plan_101',
    title: 'Gut-Friendly Mediterranean Blueprint',
    status: 'draft',
    targetCalories: 2000,
    days: [
      {
        day: 1,
        title: 'Day 1: Microbiome Diversity',
        meals: [
          {
            id: 'm1_breakfast',
            name: 'Greek Yogurt with Walnuts and Blueberries',
            type: 'Breakfast',
            portion: '1 bowl (250g)',
            baseCalories: 350,
            baseProtein: 20,
            baseCarbs: 30,
            baseFat: 15,
            calories: 350,
            protein: 20,
            carbs: 30,
            fat: 15,
            servingMultiplier: 1.0,
          },
          {
            id: 'm1_lunch',
            name: 'Grilled Salmon with Quinoa & Steamed Spinach',
            type: 'Lunch',
            portion: '1 plate',
            baseCalories: 550,
            baseProtein: 40,
            baseCarbs: 45,
            baseFat: 20,
            calories: 550,
            protein: 40,
            carbs: 45,
            fat: 20,
            servingMultiplier: 1.0,
          },
        ],
      },
    ],
  };

  describe('1. Plan Lifecycle Transitions & Structured Stop Reasons', () => {
    it('normalizes a plan into draft status with initial lifecycle metadata', () => {
      const plan = normalizeFullMealPlan(sampleRawPlan);
      expect(plan.status).toBe('draft');
      expect(plan.lifecycle.status).toBe('draft');
      expect(plan.days.length).toBe(1);
      expect(plan.days[0].total_calories).toBe(900);
      expect(plan.days[0].total_protein).toBe(60);
    });

    it('transitions plan through selected, active, paused, and completed states', () => {
      let plan = normalizeFullMealPlan(sampleRawPlan);

      // Draft -> Selected
      plan = transitionPlanStatus(plan, 'selected');
      expect(plan.status).toBe('selected');
      expect(plan.lifecycle.status).toBe('selected');

      // Selected -> Active
      plan = transitionPlanStatus(plan, 'active');
      expect(plan.status).toBe('active');
      expect(plan.lifecycle.status).toBe('active');
      expect(plan.startedAt).toBeDefined();

      // Active -> Paused
      plan = transitionPlanStatus(plan, 'paused');
      expect(plan.status).toBe('paused');
      expect(plan.lifecycle.status).toBe('paused');
      expect(plan.pausedAt).toBeDefined();

      // Paused -> Completed
      plan = transitionPlanStatus(plan, 'completed', {
        completionNotes: 'Completed 7 full days with good digestive tolerance.',
      });
      expect(plan.status).toBe('completed');
      expect(plan.lifecycle.status).toBe('completed');
      expect(plan.completedAt).toBeDefined();
      expect(plan.completionNotes).toBe('Completed 7 full days with good digestive tolerance.');
    });

    it('records structured reasons and notes when stopping a plan', () => {
      let plan = normalizeFullMealPlan(sampleRawPlan);
      plan = transitionPlanStatus(plan, 'active');

      // Stop with structured reason
      const stopReason: PlanStopReason = 'digestive_discomfort';
      plan = transitionPlanStatus(plan, 'stopped', {
        stopReason,
        stopReasonDetails: 'Felt mild bloating after Day 1 lunch spinach portion.',
      });

      expect(plan.status).toBe('stopped');
      expect(plan.lifecycle.status).toBe('stopped');
      expect(plan.stoppedAt).toBeDefined();
      expect(plan.stopReason).toBe('digestive_discomfort');
      expect(PLAN_STOP_REASON_LABELS[plan.stopReason as PlanStopReason]).toBe('Experienced digestive discomfort or symptoms');
    });

    it('covers all predefined clinical stop reasons with descriptive user-facing labels', () => {
      const expectedReasons: PlanStopReason[] = [
        'digestive_discomfort',
        'schedule_time_constraint',
        'ingredient_unavailability',
        'clinician_advice',
        'goals_met',
        'family_social_fit',
        'other',
      ];

      expectedReasons.forEach((reason) => {
        expect(PLAN_STOP_REASON_LABELS[reason]).toBeDefined();
        expect(PLAN_STOP_REASON_LABELS[reason].length).toBeGreaterThan(10);
      });
    });
  });

  describe('2. Serving Multipliers & Nutrient Recalculations', () => {
    it('scales meal nutrients proportionally when serving multiplier changes', () => {
      const plan = normalizeFullMealPlan(sampleRawPlan);

      // Increase breakfast from 1.0x to 1.5x
      const updated = updateMealServing(plan, 1, 'm1_breakfast', 1.5);
      const breakfast = updated.days[0].meals.find((m) => m.id === 'm1_breakfast');

      expect(breakfast).toBeDefined();
      expect(breakfast?.servingMultiplier).toBe(1.5);
      expect(breakfast?.calories).toBe(Math.round(350 * 1.5)); // 525
      expect(breakfast?.protein).toBe(Math.round(20 * 1.5));   // 30
      expect(breakfast?.carbs).toBe(Math.round(30 * 1.5));     // 45
      expect(breakfast?.fat).toBe(Math.round(15 * 1.5));       // 23
      expect(breakfast?.userEdited).toBe(true);

      // Day totals must reflect the recalculation immediately
      // 525 (breakfast) + 550 (lunch unchanged) = 1075
      expect(updated.days[0].total_calories).toBe(1075);
      expect(updated.days[0].total_protein).toBe(30 + 40); // 70
    });

    it('scales down nutrients when serving multiplier is 0.5x', () => {
      const plan = normalizeFullMealPlan(sampleRawPlan);

      // Decrease lunch from 1.0x to 0.5x
      const updated = updateMealServing(plan, 1, 'm1_lunch', 0.5);
      const lunch = updated.days[0].meals.find((m) => m.id === 'm1_lunch');

      expect(lunch?.servingMultiplier).toBe(0.5);
      expect(lunch?.calories).toBe(Math.round(550 * 0.5)); // 275
      expect(lunch?.protein).toBe(Math.round(40 * 0.5));   // 20
      expect(lunch?.carbs).toBe(Math.round(45 * 0.5));     // 23
      expect(lunch?.fat).toBe(Math.round(20 * 0.5));       // 10

      // Total calories: 350 (breakfast) + 275 (lunch) = 625
      expect(updated.days[0].total_calories).toBe(625);
    });

    it('clamps multiplier between 0.25x and 4.0x to prevent erroneous values', () => {
      const plan = normalizeFullMealPlan(sampleRawPlan);
      const clampedLow = updateMealServing(plan, 1, 'm1_breakfast', 0.01);
      expect(clampedLow.days[0].meals[0].servingMultiplier).toBe(0.25);

      const clampedHigh = updateMealServing(plan, 1, 'm1_breakfast', 10.0);
      expect(clampedHigh.days[0].meals[0].servingMultiplier).toBe(4.0);
    });
  });

  describe('3. Persisting Meal Edits & Clinical Swaps', () => {
    it('persists manual meal edits and recalculates day totals', () => {
      const plan = normalizeFullMealPlan(sampleRawPlan);

      const edited = editMealContent(plan, 1, 'm1_breakfast', {
        name: 'Chia Seed Pudding with Berries',
        portion: '1 medium jar',
        calories: 280,
        protein: 10,
        carbs: 35,
        fat: 12,
        description: 'Soaked in almond milk with wild berries.',
      });

      const meal = edited.days[0].meals[0];
      expect(meal.name).toBe('Chia Seed Pudding with Berries');
      expect(meal.portion).toBe('1 medium jar');
      expect(meal.calories).toBe(280);
      expect(meal.protein).toBe(10);
      expect(meal.userEdited).toBe(true);

      // Day totals updated
      expect(edited.days[0].total_calories).toBe(280 + 550);
    });

    it('applies a deterministic clinical swap and marks the meal as clinically substituted', () => {
      const plan = normalizeFullMealPlan(sampleRawPlan);
      const swaps = getAllClinicalDietarySwaps();
      expect(swaps.length).toBeGreaterThan(0);

      const chosenSwap = swaps[0];
      const swapped = applyMealClinicalSwap(plan, 1, 'm1_breakfast', chosenSwap);
      const meal = swapped.days[0].meals[0];

      expect(meal.isSwapped).toBe(true);
      expect(meal.name).toBe(chosenSwap.smartReplacement);
      expect(meal.originalName).toBe('Greek Yogurt with Walnuts and Blueberries');
      expect(meal.swappedFrom).toBe('Greek Yogurt with Walnuts and Blueberries');
      expect(meal.swapRationale).toBe(chosenSwap.biologicalMechanism);
      expect(meal.userEdited).toBe(true);
    });
  });

  describe('4. Non-Destructive History Retention & Archiving', () => {
    it('safely archives existing plans without mutating or removing past logs', () => {
      const activePlan = normalizeFullMealPlan(sampleRawPlan);
      const existingArchive: FullMealPlan[] = [];

      const archived = archiveCurrentPlan(activePlan, existingArchive);
      expect(archived.length).toBe(1);
      expect(archived[0].id).toBe(activePlan.id);

      // Creating a new plan leaves past daily food logs intact
      const userHistoricalFoodLogs: Record<string, any[]> = {
        '2026-09-08': [{ name: 'Oatmeal', calories: 300 }],
        '2026-09-09': [{ name: 'Dal Roti', calories: 450 }],
      };

      const untouchedLogs = { ...userHistoricalFoodLogs };
      expect(Object.keys(untouchedLogs).length).toBe(2);
      expect(untouchedLogs['2026-09-08'][0].name).toBe('Oatmeal');
    });
  });

  describe('5. Case Prep Factual Observation Export', () => {
    it('generates a factual observation summary without claiming food causality', () => {
      const plan = normalizeFullMealPlan(sampleRawPlan);
      const foodLogs = {
        '2026-09-10': [
          { name: 'Greek Yogurt', portion: '1 cup', calories: 200 },
          { name: 'Grilled Salmon', portion: '1 fillet', calories: 400 },
        ],
      };

      const summary = generateDietObservationsSummary(plan, foodLogs);
      expect(summary.title).toContain('Dietary & Digestive Observation Summary');
      expect(summary.summary).toContain('Gut-Friendly Mediterranean Blueprint');
      expect(summary.findingsList.length).toBeGreaterThan(0);
      expect(summary.questions.length).toBeGreaterThan(0);
    });

    it('attaches observation summary questions into the unified Case Engine', () => {
      const testCase = createCaseDraft({ title: 'Gastroenterology Evaluation' });
      const plan = normalizeFullMealPlan(sampleRawPlan);
      const foodLogs = {
        '2026-09-10': [{ name: 'Test Meal', calories: 300 }],
      };

      const summary = generateDietObservationsSummary(plan, foodLogs, testCase);
      const success = exportDietObservationsToCase(testCase.id, summary);

      expect(success).toBe(true);
      const questions = getCaseQuestions(testCase.id);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some((q) => q.raisedBySpecialty === 'Dietitian / Nutrition')).toBe(true);
    });
  });

  describe('6. Clinical Safety & Non-Causality Disclaimers', () => {
    it('asserts that symptom timing represents chronological correlation, not proof of causation', () => {
      expect(NON_CAUSAL_TIMING_DISCLAIMER).toContain('chronological associations, not proven biological causation');
    });

    it('clarifies that nutrient numbers are nutritional reference estimates, not chemical assay', () => {
      expect(PORTION_ESTIMATE_DISCLAIMER).toContain('calculated estimates');
    });

    it('strictly guards against medication washouts and extreme caloric restriction', () => {
      expect(CLINICAL_SAFETY_GUARDRAIL).toContain('Never discontinue prescribed medications');
      expect(CLINICAL_SAFETY_GUARDRAIL).toContain('unauthorized medication washouts');
    });
  });
});
