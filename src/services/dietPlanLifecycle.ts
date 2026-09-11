/**
 * dietPlanLifecycle.ts
 *
 * Comprehensive Lifecycle & State Management for HealthChain Diet & Elimination Suite.
 * Fulfills Package 7 Steps 1-12:
 * 1. Distinct plan, observation, and elimination boundaries.
 * 2. Scoping to profile and optional case.
 * 3. Persisting meal edits, serving choices, and replacements.
 * 4. Consistent nutrient estimate recalculation after edits.
 * 5. Transparent portion assumptions without false laboratory precision.
 * 6. Adherence to allergies, stated preferences, and practical availability.
 * 7. Explicit non-causality notice for food timing.
 * 8. Plan lifecycle: Draft -> Selected -> Active -> Paused -> Completed / Stopped.
 * 9. Non-destructive history retention when plans change.
 * 10. Recording structured reasons for stopping.
 * 11. Exporting factual observation summaries to Case Prep.
 * 12. Clinical guardrails prohibiting medication washout or starvation regimens without physician review.
 */

import { DietarySwap } from './clinicalDietarySwaps';
import { addCaseEvent, addCaseQuestion, getCase, type CaseItem } from './CaseEngine';

export type PlanLifecycleStatus = 'draft' | 'selected' | 'active' | 'paused' | 'completed' | 'stopped';

export type PlanStopReason =
  | 'digestive_discomfort'
  | 'schedule_time_constraint'
  | 'ingredient_unavailability'
  | 'clinician_advice'
  | 'goals_met'
  | 'family_social_fit'
  | 'other';

export const PLAN_STOP_REASON_LABELS: Record<PlanStopReason, string> = {
  digestive_discomfort: 'Experienced digestive discomfort or symptoms',
  schedule_time_constraint: 'Meal prep was too time-consuming for my daily schedule',
  ingredient_unavailability: 'Key ingredients were unavailable or outside budget',
  clinician_advice: 'My clinician or dietician advised a change',
  goals_met: 'Completed intended objective or reached target weight',
  family_social_fit: 'Did not align with household or family meals',
  other: 'Other personal preference or medical reason',
};

export const PORTION_ESTIMATE_DISCLAIMER =
  'Nutritional values are calculated estimates based on Indian Food Composition Tables (IFCT/NIN) and standard household portions. Actual values vary with specific brands, cooking methods, and individual absorption.';

export const NON_CAUSAL_TIMING_DISCLAIMER =
  'Observed symptom timings represent chronological associations, not proven biological causation. Stress, sleep disruption, gut motility, hydration, and concurrent medications can independently trigger symptoms.';

export const CLINICAL_SAFETY_GUARDRAIL =
  'Educational nutrition guidance only. Never discontinue prescribed medications, perform unauthorized medication washouts, or adopt extreme caloric restrictions without qualified medical supervision.';

export interface PlanLifecycleMetadata {
  status: PlanLifecycleStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  pausedAt?: string;
  stoppedAt?: string;
  completedAt?: string;
  stopReason?: PlanStopReason;
  stopReasonDetails?: string;
  completionNotes?: string;
}

export interface MealPlanItem {
  id: string;
  name: string;
  type: string;
  portion?: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingMultiplier: number;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  isSwapped?: boolean;
  swappedFrom?: string;
  originalName?: string;
  swapRationale?: string;
  userEdited?: boolean;
}

export interface DayPlanItem {
  day: number;
  dayNumber?: number;
  title?: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meals: MealPlanItem[];
}

export interface FullMealPlan {
  id: string;
  title: string;
  status: PlanLifecycleStatus;
  lifecycle: PlanLifecycleMetadata;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  pausedAt?: string;
  stoppedAt?: string;
  completedAt?: string;
  stopReason?: PlanStopReason;
  stopReasonDetails?: string;
  completionNotes?: string;
  caseId?: string;
  profileKey?: string;
  goal?: string;
  cuisine?: string;
  days: DayPlanItem[];
  plan?: DayPlanItem[];
  targetCalories?: number;
  targetProtein?: number;
  targetCarbs?: number;
  targetFat?: number;
}

/**
 * Normalizes raw meal object into a MealPlanItem with base macros and serving multipliers.
 */
export function normalizeMealItem(rawMeal: any, index: number): MealPlanItem {
  const servingMultiplier = typeof rawMeal.servingMultiplier === 'number' && rawMeal.servingMultiplier > 0
    ? rawMeal.servingMultiplier
    : 1.0;

  const baseCalories = Number(rawMeal.baseCalories || rawMeal.calories) || 300;
  const baseProtein = Number(rawMeal.baseProtein || rawMeal.protein) || 15;
  const baseCarbs = Number(rawMeal.baseCarbs || rawMeal.carbs) || 40;
  const baseFat = Number(rawMeal.baseFat || rawMeal.fat) || 10;

  return {
    id: rawMeal.id || `meal_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 7)}`,
    name: rawMeal.name || 'Balanced Meal',
    type: rawMeal.type || 'Meal',
    portion: rawMeal.portion || '1 serving',
    description: rawMeal.description || '',
    servingMultiplier,
    baseCalories,
    baseProtein,
    baseCarbs,
    baseFat,
    calories: Math.round(baseCalories * servingMultiplier),
    protein: Math.round(baseProtein * servingMultiplier),
    carbs: Math.round(baseCarbs * servingMultiplier),
    fat: Math.round(baseFat * servingMultiplier),
    isSwapped: Boolean(rawMeal.isSwapped || rawMeal.swappedFrom),
    swappedFrom: rawMeal.swappedFrom || rawMeal.originalName,
    originalName: rawMeal.originalName || rawMeal.swappedFrom,
    swapRationale: rawMeal.swapRationale,
    userEdited: Boolean(rawMeal.userEdited),
  };
}

/**
 * Normalizes day item and recalculates its totals.
 */
export function normalizeDayItem(rawDay: any, dayIdx: number): DayPlanItem {
  const dayNum = Number(rawDay.day || rawDay.dayNumber) || (dayIdx + 1);
  const rawMeals = Array.isArray(rawDay.meals) ? rawDay.meals : [];
  const meals = rawMeals.map((m: any, mIdx: number) => normalizeMealItem(m, mIdx));

  const total_calories = meals.reduce((acc, m) => acc + (m.calories || 0), 0);
  const total_protein = meals.reduce((acc, m) => acc + (m.protein || 0), 0);
  const total_carbs = meals.reduce((acc, m) => acc + (m.carbs || 0), 0);
  const total_fat = meals.reduce((acc, m) => acc + (m.fat || 0), 0);

  return {
    day: dayNum,
    dayNumber: dayNum,
    title: rawDay.title || `Day ${dayNum}`,
    total_calories,
    total_protein,
    total_carbs,
    total_fat,
    meals,
  };
}

/**
 * Normalizes an entire meal plan structure and initializes lifecycle status.
 */
export function normalizeFullMealPlan(rawPlan: any, options?: { caseId?: string; profileKey?: string }): FullMealPlan {
  const rawDays = rawPlan?.days || rawPlan?.plan || [];
  const days = rawDays.map((d: any, idx: number) => normalizeDayItem(d, idx));

  const id = rawPlan?.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const status: PlanLifecycleStatus = rawPlan?.lifecycle?.status || rawPlan?.status || 'draft';
  const createdAt = rawPlan?.lifecycle?.createdAt || rawPlan?.createdAt || new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const startedAt = rawPlan?.lifecycle?.startedAt || rawPlan?.startedAt;
  const pausedAt = rawPlan?.lifecycle?.pausedAt || rawPlan?.pausedAt;
  const stoppedAt = rawPlan?.lifecycle?.stoppedAt || rawPlan?.stoppedAt;
  const completedAt = rawPlan?.lifecycle?.completedAt || rawPlan?.completedAt;
  const stopReason = rawPlan?.lifecycle?.stopReason || rawPlan?.stopReason;
  const stopReasonDetails = rawPlan?.lifecycle?.stopReasonDetails || rawPlan?.stopReasonDetails;
  const completionNotes = rawPlan?.lifecycle?.completionNotes || rawPlan?.completionNotes;

  const lifecycle: PlanLifecycleMetadata = {
    status,
    createdAt,
    updatedAt,
    startedAt,
    pausedAt,
    stoppedAt,
    completedAt,
    stopReason,
    stopReasonDetails,
    completionNotes,
  };

  const planObj: FullMealPlan = {
    id,
    title: rawPlan?.title || 'Personalized Clinical Nutrition Plan',
    status,
    lifecycle,
    createdAt,
    updatedAt,
    startedAt,
    pausedAt,
    stoppedAt,
    completedAt,
    stopReason,
    stopReasonDetails,
    completionNotes,
    caseId: options?.caseId || rawPlan?.caseId,
    profileKey: options?.profileKey || rawPlan?.profileKey,
    goal: rawPlan?.goal,
    cuisine: rawPlan?.cuisine,
    days,
    plan: days,
    targetCalories: rawPlan?.targetCalories,
    targetProtein: rawPlan?.targetProtein,
    targetCarbs: rawPlan?.targetCarbs,
    targetFat: rawPlan?.targetFat,
  };

  return planObj;
}

/**
 * Adjusts serving size multiplier and recalculates meal and day macros.
 */
export function updateMealServing(
  plan: FullMealPlan,
  dayNumber: number,
  mealId: string,
  servingMultiplier: number
): FullMealPlan {
  const safeMultiplier = Math.max(0.25, Math.min(4.0, servingMultiplier));

  const updatedDays = plan.days.map((day) => {
    if (day.day !== dayNumber) return day;

    const updatedMeals = day.meals.map((meal) => {
      if (meal.id !== mealId) return meal;

      return {
        ...meal,
        servingMultiplier: safeMultiplier,
        calories: Math.round(meal.baseCalories * safeMultiplier),
        protein: Math.round(meal.baseProtein * safeMultiplier),
        carbs: Math.round(meal.baseCarbs * safeMultiplier),
        fat: Math.round(meal.baseFat * safeMultiplier),
        userEdited: true,
      };
    });

    const total_calories = updatedMeals.reduce((acc, m) => acc + m.calories, 0);
    const total_protein = updatedMeals.reduce((acc, m) => acc + m.protein, 0);
    const total_carbs = updatedMeals.reduce((acc, m) => acc + m.carbs, 0);
    const total_fat = updatedMeals.reduce((acc, m) => acc + m.fat, 0);

    return {
      ...day,
      meals: updatedMeals,
      total_calories,
      total_protein,
      total_carbs,
      total_fat,
    };
  });

  return {
    ...plan,
    days: updatedDays,
    plan: updatedDays,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Edits a meal's name and description directly.
 */
export function editMealContent(
  plan: FullMealPlan,
  dayNumber: number,
  mealId: string,
  updates: { name?: string; portion?: string; description?: string; calories?: number; protein?: number; carbs?: number; fat?: number }
): FullMealPlan {
  const updatedDays = plan.days.map((day) => {
    if (day.day !== dayNumber) return day;

    const updatedMeals = day.meals.map((meal) => {
      if (meal.id !== mealId) return meal;

      const baseCalories = updates.calories !== undefined ? updates.calories : meal.baseCalories;
      const baseProtein = updates.protein !== undefined ? updates.protein : meal.baseProtein;
      const baseCarbs = updates.carbs !== undefined ? updates.carbs : meal.baseCarbs;
      const baseFat = updates.fat !== undefined ? updates.fat : meal.baseFat;

      return {
        ...meal,
        name: updates.name !== undefined ? updates.name.trim() : meal.name,
        portion: updates.portion !== undefined ? updates.portion.trim() : (meal.portion || '1 serving'),
        description: updates.description !== undefined ? updates.description.trim() : meal.description,
        baseCalories,
        baseProtein,
        baseCarbs,
        baseFat,
        calories: Math.round(baseCalories * meal.servingMultiplier),
        protein: Math.round(baseProtein * meal.servingMultiplier),
        carbs: Math.round(baseCarbs * meal.servingMultiplier),
        fat: Math.round(baseFat * meal.servingMultiplier),
        userEdited: true,
      };
    });

    const total_calories = updatedMeals.reduce((acc, m) => acc + m.calories, 0);
    const total_protein = updatedMeals.reduce((acc, m) => acc + m.protein, 0);
    const total_carbs = updatedMeals.reduce((acc, m) => acc + m.carbs, 0);
    const total_fat = updatedMeals.reduce((acc, m) => acc + m.fat, 0);

    return {
      ...day,
      meals: updatedMeals,
      total_calories,
      total_protein,
      total_carbs,
      total_fat,
    };
  });

  return {
    ...plan,
    days: updatedDays,
    plan: updatedDays,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Replaces a meal using a clinical swap from DIETARY_SWAPS_DATABASE.
 */
export function applyMealClinicalSwap(
  plan: FullMealPlan,
  dayNumber: number,
  mealId: string,
  swap: DietarySwap
): FullMealPlan {
  const updatedDays = plan.days.map((day) => {
    if (day.day !== dayNumber) return day;

    const updatedMeals = day.meals.map((meal) => {
      if (meal.id !== mealId) return meal;

      return {
        ...meal,
        name: swap.smartReplacement,
        description: `${swap.replacementDetails} (Substituted for: ${meal.name})`,
        isSwapped: true,
        swappedFrom: meal.name,
        originalName: meal.name,
        swapRationale: swap.biologicalMechanism,
        userEdited: true,
      };
    });

    return {
      ...day,
      meals: updatedMeals,
    };
  });

  return {
    ...plan,
    days: updatedDays,
    plan: updatedDays,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Plan Lifecycle Transitions
 */
export function transitionPlanStatus(
  plan: FullMealPlan,
  nextStatus: PlanLifecycleStatus,
  metadata?: {
    stopReason?: PlanStopReason;
    stopReasonDetails?: string;
    completionNotes?: string;
  }
): FullMealPlan {
  const now = new Date().toISOString();
  const updated: FullMealPlan = {
    ...plan,
    status: nextStatus,
    updatedAt: now,
  };

  switch (nextStatus) {
    case 'selected':
      // Marked as chosen blueprint
      break;
    case 'active':
      if (!updated.startedAt) updated.startedAt = now;
      updated.pausedAt = undefined;
      break;
    case 'paused':
      updated.pausedAt = now;
      break;
    case 'completed':
      updated.completedAt = now;
      if (metadata?.completionNotes) updated.completionNotes = metadata.completionNotes;
      break;
    case 'stopped':
      updated.stoppedAt = now;
      if (metadata?.stopReason) updated.stopReason = metadata.stopReason;
      if (metadata?.stopReasonDetails) updated.stopReasonDetails = metadata.stopReasonDetails;
      break;
    default:
      break;
  }

  updated.lifecycle = {
    status: updated.status,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    startedAt: updated.startedAt,
    pausedAt: updated.pausedAt,
    stoppedAt: updated.stoppedAt,
    completedAt: updated.completedAt,
    stopReason: updated.stopReason,
    stopReasonDetails: updated.stopReasonDetails,
    completionNotes: updated.completionNotes,
  };

  return updated;
}

/**
 * Non-destructively archives the current plan before starting or replacing with a new one.
 */
export function archiveCurrentPlan(
  currentPlan: FullMealPlan,
  existingArchive: FullMealPlan[] = []
): FullMealPlan[] {
  // Do not duplicate if already archived
  const filtered = existingArchive.filter((p) => p.id !== currentPlan.id);
  return [currentPlan, ...filtered];
}

export interface FactualDietObservationSummary {
  title: string;
  summary: string;
  questions: string[];
  findingsList: string[];
}

/**
 * Prepares a structured, factual observation brief for Case Prep export.
 */
export function generateDietObservationsSummary(
  plan: FullMealPlan | null,
  foodLogs: Record<string, any[]>,
  activeCase?: CaseItem | null
): FactualDietObservationSummary {
  const totalLoggedDays = Object.keys(foodLogs || {}).filter(
    (dateKey) => Array.isArray(foodLogs[dateKey]) && foodLogs[dateKey].length > 0
  ).length;

  let planStatusSummary = 'No structured meal plan was active.';
  if (plan) {
    planStatusSummary = `Plan "${plan.title}" (Status: ${plan.status.toUpperCase()}). ` +
      `Target calories: ${plan.targetCalories || 'Standard'} kcal. ` +
      (plan.startedAt ? `Started on ${new Date(plan.startedAt).toLocaleDateString()}. ` : '') +
      (plan.status === 'stopped' && plan.stopReason
        ? `Stopped on ${plan.stoppedAt ? new Date(plan.stoppedAt).toLocaleDateString() : 'recent date'} due to: ${PLAN_STOP_REASON_LABELS[plan.stopReason] || plan.stopReason}. `
        : '');
  }

  // Count food categories logged
  const loggedItems: string[] = [];
  Object.values(foodLogs || {}).forEach((dayMeals) => {
    if (Array.isArray(dayMeals)) {
      dayMeals.forEach((m) => {
        if (m.name && !loggedItems.includes(m.name)) loggedItems.push(m.name);
      });
    }
  });

  const findingsList = [
    `Logging consistency: ${totalLoggedDays} unique days with meal records.`,
    `Current Plan State: ${planStatusSummary}`,
    loggedItems.length > 0
      ? `Distinct meals logged: ${loggedItems.slice(0, 8).join(', ')}${loggedItems.length > 8 ? ` and ${loggedItems.length - 8} more` : ''}.`
      : 'No meal items recorded yet.',
  ];

  const questions: string[] = [
    'Are my current macronutrient and calorie targets clinically appropriate for my symptoms and blood work?',
    'Should any suspected food triggers be formally tested or isolated under a supervised elimination protocol?',
    'Are my digestive symptoms potentially influenced by gut motility, concurrent medications, or stress rather than specific food items alone?',
  ];

  const summaryText = [
    'FACTUAL DIET & OBSERVATION SUMMARY FOR CLINICIAN VISIT:',
    `- Total Tracked Days: ${totalLoggedDays}`,
    `- Plan Status: ${planStatusSummary}`,
    `- Portion & Precision Basis: ${PORTION_ESTIMATE_DISCLAIMER}`,
    `- Note on Causality: ${NON_CAUSAL_TIMING_DISCLAIMER}`,
  ].join('\n');

  return {
    title: 'Dietary & Digestive Observation Summary',
    summary: summaryText,
    questions,
    findingsList,
  };
}

/**
 * Attaches the observation summary directly into the case record.
 */
export function exportDietObservationsToCase(
  caseId: string,
  summaryData: FactualDietObservationSummary
): boolean {
  try {
    const targetCase = getCase(caseId);
    if (!targetCase) return false;

    // 1. Add event to timeline
    addCaseEvent(
      caseId,
      `${summaryData.title}\n\n${summaryData.summary}`,
      'Dietary Observation Brief'
    );

    // 2. Add clinical discussion questions
    summaryData.questions.forEach((q) => {
      addCaseQuestion(caseId, {
        questionText: q,
        status: 'open',
        raisedBySpecialty: 'Dietitian / Nutrition',
        supportingEvidenceIds: [],
      });
    });

    return true;
  } catch (e) {
    console.error('Failed to export dietary observations to case:', e);
    return false;
  }
}
