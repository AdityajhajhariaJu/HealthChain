import { normalizeFullMealPlan, type FullMealPlan } from './dietPlanLifecycle';
/** Regeneration replaces unaccepted slots, preserving the exact accepted recipe snapshot. */
export function preserveAcceptedMeals(
  generated: FullMealPlan,
  previous: FullMealPlan | null
): FullMealPlan {
  if (!previous?.days?.some((day) => day.meals.some((meal) => meal.pinned))) return generated;
  const days = generated.days.map((day) => {
    const old = previous.days.find((item) => item.day === day.day);
    return {
      ...day,
      meals: day.meals.map(
        (meal) =>
          old?.meals.find(
            (item) => item.pinned && item.type.toLowerCase() === meal.type.toLowerCase()
          ) || meal
      ),
    };
  });
  return normalizeFullMealPlan({ ...generated, days, plan: days });
}
