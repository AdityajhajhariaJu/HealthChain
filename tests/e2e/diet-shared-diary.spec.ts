import { expect, test } from '@playwright/test';

test('a planned meal becomes one shared eaten record and a retry does not duplicate it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    const profile = { age: 30, gender: 'male', height: 175, weight: 70, goal: 'Maintain', activityLevel: 'moderate', restrictions: [], cuisine: 'Indian' };
    const mealPlan = { id: 'planned-week-1', title: 'Test plan', plan: [{ day: 1, meals: [{
      id: 'lunch-1', name: 'Rice and dal', type: 'Lunch', calories: 420, protein: 17, carbs: 66, fat: 10,
      ingredients: [{ name: 'Rice', amount: 80, unit: 'g' }, { name: 'Lentils', amount: 90, unit: 'g' }],
      steps: ['Cook rice', 'Cook lentils'], prepMinutes: 30,
    }] }] };
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: {
      id: 'profile_1', demographics: { age: 30, height: 175, weight: 70 },
      dietProfile: profile, dietMealPlan: mealPlan, dietFoodLogs: {},
      dietician: { profile, mealPlan, foodLogs: {}, hydration: {}, groceryList: [] },
    } } }));
  });
  await page.route(/https:\/\//, route => route.abort());
  await page.goto('/app/dietician?tab=mealplan');
  const log = page.getByRole('button', { name: 'Record this meal as eaten' });
  await expect(log).toBeVisible();
  await log.click();
  await page.getByRole('dialog',{name:'Confirm planned meal eaten'}).getByRole('button',{name:'Confirm meal was eaten'}).click();
  await expect(page.getByRole('button', { name: 'Logged in diary' })).toBeDisabled();
  const records = await page.evaluate(async () => {
    const meals = await import(/* @vite-ignore */ '/src/services/MealCommandService.ts');
    const observations = await import(/* @vite-ignore */ '/src/services/HealthObservationService.ts');
    const gut = await import(/* @vite-ignore */ '/src/services/GutHealthSummary.ts');
    const saved = await observations.listObservations();
    const diary = Object.values(await meals.listMealDiary()).flat();
    const gutMeals = gut.mergeGutSnapshotWithObservations(gut.getGutSnapshot(), saved).meals;
    return { saved: saved.map((item: any) => ({ id: item.id, kind: item.payload.kind, sourceId: item.payload.nutritionAssessment?.sourceId })),
      diary: diary.map((item: any) => ({ id: item.id, calories: item.calories })), gutIds: gutMeals.map((item: any) => item.id) };
  });
  expect(records.saved).toHaveLength(1);
  expect(records.saved[0]).toMatchObject({ kind: 'meal', sourceId: 'planned-week-1:1:lunch-1' });
  expect(records.diary).toEqual([{ id: records.saved[0].id, calories: 420 }]);
  expect(records.gutIds).toContain(records.saved[0].id);
});
