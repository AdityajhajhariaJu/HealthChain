/** Real-provider release check using synthetic profiles only; no account quota or health records. */
import 'dotenv/config';
import { buildDietPlanProviderPayload } from '../shared/diet-plan-request.js';
import { validateGeneratedMealPlan } from '../shared/diet-plan-validation.js';

const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
if (!key) throw new Error('Set GEMINI_API_KEY to run the live meal-plan evaluation.');
const schedules = process.argv.slice(2);
for (const mealSchedule of schedules.length ? schedules : ['3 Meals', '3 Meals + 1 Snack', '5 Small Meals']) {
  const body = buildDietPlanProviderPayload({ age: 30, gender: 'male', targetCalories: 2200, cuisine: 'North Indian', mealSchedule, goal: 'Maintain' });
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
  const mealCount = mealSchedule === '5 Small Meals' ? 5 : mealSchedule === '3 Meals' ? 3 : 4;
  if (candidate.finishReason !== 'STOP' || !validation.valid || plan.plan.some(day => day.meals.length !== mealCount))
    throw new Error(`Meal-plan contract failed: ${candidate.finishReason}; ${validation.errors.join('; ')}`);
  console.log(JSON.stringify({ mealSchedule, days: plan.plan.length, mealsPerDay: mealCount, outputTokens: data.usageMetadata?.candidatesTokenCount,
    durationMs: Date.now() - start, dailyEstimatedCalories: plan.plan.map(day => day.meals.reduce((sum, meal) => sum + meal.calories, 0)), valid: true }));
}
