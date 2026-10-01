import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, route => route.abort());
});

test('actual logout retains unqueued owned records and daily logs, while another scope cannot read them', async ({ page }) => {
  await page.goto('/app/today');
  await expect(page.getByRole('button', { name: 'Quick log 250ml water' })).toBeVisible();
  const retained = await page.evaluate(async () => {
    const profile = await import('/src/services/ProfileEngine.js');
    const cases = await import('/src/services/CaseEngine.ts');
    const meals = await import('/src/services/MealCommandService.ts');
    const water = await import('/src/services/HydrationService.ts');
    const idb = await import('/node_modules/.vite/deps/idb-keyval.js');
    await profile.saveProfile({ ...profile.getProfile(), healthFocus: 'SYNTHETIC_OWNER_A_ONLY' });
    cases.createCaseDraft({ title: 'SYNTHETIC_UNQUEUED_CASE' });
    await meals.createMeal({ localDate: water.getTodayDateString(), captureMethod: 'diet_diary', entry: { id: crypto.randomUUID(), name: 'SYNTHETIC_UNQUEUED_MEAL' } });
    water.addWaterLog(300);
    const localKeys = Object.keys(localStorage).filter(key => key.includes('guest') && key !== 'hc_guest_mode');
    const indexedKeys = (await idb.keys()).filter(key => typeof key === 'string' && key.includes('guest'));
    const indexed = await Promise.all(indexedKeys.map(async key => [key, JSON.stringify(await idb.get(key))]));
    return { local: Object.fromEntries(localKeys.map(key => [key, localStorage.getItem(key)])), indexed };
  });
  expect(Object.keys(retained.local).some(key => key.startsWith('healthchain_hydration'))).toBe(true);
  expect(retained.indexed.some(([key]) => String(key).startsWith('hc_observations_v1:'))).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('hc_logout')));
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hc_account'))).toBeNull();
  const after = await page.evaluate(async (before) => {
    const idb = await import('/node_modules/.vite/deps/idb-keyval.js');
    return {
      local: Object.fromEntries(Object.keys(before.local).map(key => [key, localStorage.getItem(key)])),
      indexed: await Promise.all(before.indexed.map(async ([key]) => [key, JSON.stringify(await idb.get(key))])),
    };
  }, retained);
  expect(after).toEqual(retained);
  await page.goto('/app/today');
  const guest = await page.evaluate(async () => {
    localStorage.removeItem('hc_guest_mode');
    localStorage.setItem('hc_account', JSON.stringify({ id: 'synthetic-owner-b' }));
    const profile = await import('/src/services/ProfileEngine.js');
    const meals = await import('/src/services/MealCommandService.ts');
    const water = await import('/src/services/HydrationService.ts');
    return { focus: profile.getProfile().healthFocus, meals: await meals.listMealDiary(), water: water.getHydrationData().currentMl };
  });
  expect(JSON.stringify(guest)).not.toContain('SYNTHETIC_');
  expect(guest.water).toBe(0);
});

test('a delayed quick nutrition reply cannot create a meal in a newly selected account', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/gemini', async route => {
    await gate;
    await route.fulfill({ json: { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ items: [{ name: 'SYNTHETIC_PRIVATE_MEAL', calories: 100 }], total: { calories: 100 } }) }] } }] } });
  });
  await page.goto('/app/nutrition-log');
  await page.getByRole('textbox', { name: 'Describe what you ate' }).fill('SYNTHETIC_PRIVATE_MEAL');
  const request = page.waitForRequest('**/api/gemini');
  await page.getByRole('button', { name: 'Submit meal description for AI nutritional analysis' }).click();
  await request;
  await page.evaluate(() => {
    localStorage.removeItem('hc_guest_mode');
    localStorage.setItem('hc_account', JSON.stringify({ id: 'synthetic-owner-b' }));
  });
  const response = page.waitForResponse('**/api/gemini');
  release();
  await response;
  // Let the response parser and the attempted save complete before inspecting
  // records from the new account.
  await page.waitForTimeout(200);
  expect(await page.evaluate(async () => Object.values(await (await import('/src/services/MealCommandService.ts')).listMealDiary()).flat())).toEqual([]);
  await expect(page.getByText('Meal saved locally.', { exact: false })).toHaveCount(0);
});
