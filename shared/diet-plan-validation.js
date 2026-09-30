const finiteNonnegative = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Shared browser/server gate. It checks structure, never ingredient or nutrient provenance. */
export function validateGeneratedMealPlan(value, expectedDays) {
  const errors = [];
  const days = Array.isArray(value?.plan) ? value.plan : Array.isArray(value?.days) ? value.days : null;
  if (!Number.isInteger(expectedDays) || !days || days.length !== expectedDays) {
    return { valid: false, errors: [`Expected ${expectedDays} complete plan days.`] };
  }
  const seen = new Set();
  for (const [index, day] of days.entries()) {
    const dayNumber = day?.day ?? day?.dayNumber;
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > expectedDays || seen.has(dayNumber)) {
      errors.push(`Day ${index + 1} has an invalid or repeated day number.`);
    } else seen.add(dayNumber);
    if (!Array.isArray(day?.meals) || day.meals.length < 1 || day.meals.length > 8) {
      errors.push(`Day ${index + 1} must contain 1–8 meals.`);
      continue;
    }
    for (const [mealIndex, meal] of day.meals.entries()) {
      if (typeof meal?.name !== 'string' || !meal.name.trim() || meal.name.length > 160 ||
          typeof meal?.type !== 'string' || !meal.type.trim()) {
        errors.push(`Day ${index + 1} meal ${mealIndex + 1} needs a name and type.`);
      }
      for (const nutrient of ['calories', 'protein', 'carbs', 'fat']) {
        if (!finiteNonnegative(meal?.[nutrient]) || meal[nutrient] > (nutrient === 'calories' ? 3000 : 500)) {
          errors.push(`Day ${index + 1} meal ${mealIndex + 1} has invalid ${nutrient}.`);
        }
      }
      if (meal?.calories === 0) errors.push(`Day ${index + 1} meal ${mealIndex + 1} has no energy estimate.`);
      if (!Array.isArray(meal?.ingredients) || meal.ingredients.length < 1 || meal.ingredients.length > 12 ||
          meal.ingredients.some((ingredient) => typeof ingredient?.name !== 'string' || !ingredient.name.trim() ||
            ingredient.name.length > 120 || !finiteNonnegative(ingredient.amount) || ingredient.amount === 0 ||
            ingredient.amount > 5000 || !['g', 'ml', 'piece'].includes(ingredient.unit))) {
        errors.push(`Day ${index + 1} meal ${mealIndex + 1} needs measured draft ingredients.`);
      }
      if (!Array.isArray(meal?.steps) || meal.steps.length < 1 || meal.steps.length > 6 ||
          meal.steps.some((step) => typeof step !== 'string' || !step.trim() || step.length > 300) ||
          !Number.isInteger(meal?.prepMinutes) || meal.prepMinutes < 1 || meal.prepMinutes > 360) {
        errors.push(`Day ${index + 1} meal ${mealIndex + 1} needs preparation steps and time.`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Match a planning target by scaling the whole recipe, never calories alone. */
export function alignMealPlanPortions(value, targetCalories) {
  if (!Number.isInteger(targetCalories) || targetCalories < 1200 || targetCalories > 4500 || !validateGeneratedMealPlan(value, 7).valid) return null;
  const round = (number) => Math.round(number * 100) / 100;
  const days = value.plan || value.days;
  const plan = [];
  for (const day of days) {
    const total = day.meals.reduce((sum, meal) => sum + meal.calories, 0);
    const factor = targetCalories / total;
    // Extreme changes indicate a bad draft; don't turn it into an impractical recipe.
    if (factor < 0.5 || factor > 2) return null;
    const meals = day.meals.map(meal => ({
      ...meal,
      calories: Math.round(meal.calories * factor),
      protein: round(meal.protein * factor), carbs: round(meal.carbs * factor), fat: round(meal.fat * factor),
      ingredients: meal.ingredients.map(ingredient => ({ ...ingredient, amount: Math.max(0.01, round(ingredient.amount * factor)) })),
    }));
    // Allocate integer rounding to the final meal so displayed day totals match.
    meals[meals.length - 1].calories += targetCalories - meals.reduce((sum, meal) => sum + meal.calories, 0);
    plan.push({ ...day, meals });
  }
  const aligned = { ...value, targetCalories, plan, ...(value.days ? { days: plan } : {}) };
  return validateGeneratedMealPlan(aligned, 7).valid ? aligned : null;
}
