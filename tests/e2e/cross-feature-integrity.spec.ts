import { AI_CONSENT_VERSION } from '../../shared/privacy-consent.js';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((consentVersion: string) => {
    localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    // Existing affirmative AI permission for this feature-specific fixture.
    localStorage.setItem('hc_ai_consent_guest', JSON.stringify({ accepted: true, version: consentVersion, acceptedAt: '2026-10-05T00:00:00Z' }));
  }, AI_CONSENT_VERSION);
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
  // A guest already has no account key. Wait for completed logout navigation,
  // otherwise the next page.goto can race the asynchronous sign-out redirect.
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('hc_account'))).toBeNull();
  const after = await page.evaluate(async (before) => {
    const idb = await import('/node_modules/.vite/deps/idb-keyval.js');
    return {
      local: Object.fromEntries(Object.keys(before.local).map(key => [key, localStorage.getItem(key)])),
      indexed: await Promise.all(before.indexed.map(async ([key]) => [key, JSON.stringify(await idb.get(key))])),
    };
  }, retained);
  // Canonical daily history can rebuild the display timestamp and key order.
  // Assert the owned health facts survive logout, rather than their JSON bytes.
  const normalized = (snapshot: typeof retained) => ({
    ...snapshot,
    indexed: snapshot.indexed.map(([key, value]) => [key, value ? JSON.parse(value) : value]),
    local: Object.fromEntries(Object.entries(snapshot.local).map(([key, value]) => {
      if (!key.startsWith('healthchain_hydration_data_') || !value) return [key, value];
      const parsed = JSON.parse(value);
      return [key, { date: parsed.date, currentMl: parsed.currentMl, targetMl: parsed.targetMl,
        logs: parsed.logs.map((log: any) => ({ id: log.id, amountMl: log.amountMl,
          occurredAt: log.occurredAt, type: log.type })) }];
    })),
  });
  const beforeFacts = normalized(retained);
  const afterFacts = normalized(after);
  expect(afterFacts.local).toEqual(beforeFacts.local);
  for (const [key, value] of beforeFacts.indexed) {
    const current = afterFacts.indexed.find(([storedKey]) => storedKey === key)?.[1];
    if (Array.isArray(value)) {
      expect(Array.isArray(current)).toBe(true);
      for (const row of value) expect(current).toContainEqual(row);
    } else expect(current).toEqual(value);
  }
  await page.goto('/app/today');
  const guest = await page.evaluate(async () => {
    localStorage.removeItem('hc_guest_mode');
    localStorage.setItem('hc_account', JSON.stringify({ id: 'synthetic-owner-b' }));
    localStorage.setItem('hc_adult_eligibility_' + 'synthetic-owner-b', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
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
    localStorage.setItem('hc_adult_eligibility_' + 'synthetic-owner-b', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
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
