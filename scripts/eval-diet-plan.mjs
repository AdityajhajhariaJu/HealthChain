/** Real-provider release check using synthetic profiles only; no account quota or health records. */
import 'dotenv/config';
import { validateDietPreferenceFit } from '../shared/diet-preference-fit.js';
import { buildDietPlanProviderPayload } from '../shared/diet-plan-request.js';
import { validateGeneratedMealPlan, alignMealPlanPortions } from '../shared/diet-plan-validation.js';

const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY to run the live meal-plan evaluation.');
const schedules = process.argv.slice(2);
const countryCode = process.env.DIET_EVAL_COUNTRY_CODE;
const region = process.env.DIET_EVAL_REGION || '';
const preferences = process.env.DIET_EVAL_PREFERENCES ? JSON.parse(process.env.DIET_EVAL_PREFERENCES) : undefined;
for (const mealSchedule of schedules.length ? schedules : ['3 Meals', '3 Meals + 1 Snack', '5 Small Meals']) {
  const body = buildDietPlanProviderPayload({ age: 30, gender: 'male', targetCalories: 2200, cuisine: countryCode ? 'Local' : 'North Indian', mealSchedule, goal: 'Maintain', ...(countryCode ? { countryCode, region } : {}), ...(preferences ? {preferences} : {}) });
  const start = Date.now();
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(50000),
  });
  if (!response.ok) throw new Error(`Meal-plan provider returned HTTP ${response.status}.`);
  const data = await response.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.filter(part => !part.thought && typeof part.text === 'string').map(part => part.text).join('');
  let plan;
  try { plan = JSON.parse(text); } catch { throw new Error('The provider returned incomplete meal-plan JSON.'); }
  const validation = validateGeneratedMealPlan(plan, 7);
  const fit = validateDietPreferenceFit(plan, preferences, mealSchedule);
  const adjusted = validation.valid ? alignMealPlanPortions(plan, 2200) : null;
  const mealCount = mealSchedule === '5 Small Meals' ? 5 : mealSchedule === '3 Meals' ? 3 : 4;
  if (!fit.valid) console.error(JSON.stringify({preferenceFailures:plan.plan.flatMap(day=>day.meals.filter(meal=>!validateDietPreferenceFit({plan:[{meals:[meal]}]},preferences).valid).map(meal=>({day:day.day,name:meal.name,ingredients:meal.ingredients,steps:meal.steps})))}));
  if (candidate.finishReason !== 'STOP' || !validation.valid || !fit.valid || !adjusted || plan.plan.some(day => day.meals.length !== mealCount))
    throw new Error(`Meal-plan contract failed: ${candidate.finishReason}; ${[...validation.errors,...fit.errors].join('; ')}`);
  console.log(JSON.stringify({ mealSchedule, countryCode, region, preferences, firstDayMeals: plan.plan[0].meals.map(meal => meal.name), days: plan.plan.length, mealsPerDay: mealCount, outputTokens: data.usageMetadata?.candidatesTokenCount,
    durationMs: Date.now() - start, dailyEstimatedCalories: adjusted.plan.map(day => day.meals.reduce((sum, meal) => sum + meal.calories, 0)), valid: true }));
}
