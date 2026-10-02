import { expect, test } from '@playwright/test';

const whitePixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=',
  'base64'
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(new Error('Camera denied in test')) },
    });
  });
  await page.route(/https:\/\//, (route) => route.abort());
});

function modelResult(food: object) {
  return JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(food) }] } }] });
}

test('pack scan saves only the amount eaten and avoids unsupported claims', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/gemini', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: modelResult({
        detected: true,
        foodName: 'Audit Biscuits',
        foodType: 'packaged',
        nutritionBasis: 'per_serving',
        servingGrams: 30,
        portionGrams: 60,
        calories: 144,
        protein: 1.8,
        carbs: 19.2,
        fats: 6,
        sugar: 5.4,
        fibre: 0.6,
        sodium: 90,
        nutriScore: 'A',
        novaGrade: 1,
        allergens: ['None'],
        glycemicImpact: 'Low',
      }),
    })
  );
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'Clinical AR Food Lens' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await expect(lens.getByText('Camera Not Available')).toBeVisible();
  await expect(lens.getByRole('button', { name: 'Retry Camera' })).toBeVisible();
  await lens
    .locator('input[type=file]')
    .setInputFiles({ name: 'pack.png', mimeType: 'image/png', buffer: whitePixel });
  await expect(lens.getByText('Audit Biscuits')).toBeVisible();
  await expect(lens.getByText('PACKAGE LABEL READ · PER 100 G')).toBeVisible();
  await expect(lens.getByText('480 kcal')).toBeVisible();
  await expect(lens.getByText('Nutri-Score A')).toHaveCount(0);
  await expect(lens.getByText('Low', { exact: true })).toHaveCount(0);
  await expect(lens.getByLabel('Amount you ate (grams)')).toHaveValue('60');
  await lens.getByRole('checkbox').check();
  await lens.getByRole('button', { name: 'Log estimate' }).click();
  await expect(lens).toHaveCount(0);
  const saved = await page.evaluate(async () => {
    const engine = await import(/* @vite-ignore */ '/src/services/ProfileEngine.js');
    const meals = await import(/* @vite-ignore */ '/src/services/MealCommandService.ts');
    const observations = await import(
      /* @vite-ignore */ '/src/services/HealthObservationService.ts'
    );
    return {
      legacyCount: engine.getProfile().nutrition.recentLogs.length,
      diary: Object.values(await meals.listMealDiary())
        .flat()
        .at(-1),
      observation: (await observations.listObservations()).find(
        (item: any) => item.payload.kind === 'meal'
      ),
    };
  });
  expect(saved.legacyCount).toBe(0);
  expect(saved.diary.calories).toBe(288);
  expect(saved.diary.portionGrams).toBe(60);
  expect(saved.observation.payload.nutritionAssessment.originalBasis).toMatchObject({
    kind: 'per_serving',
    metricServing: { value: 30, unit: 'g' },
  });
});

test('incomplete AI output cannot be logged', async ({ page }) => {
  await page.route('**/api/gemini', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: modelResult({ detected: true, foodName: 'Mystery Snack' }),
    })
  );
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'Clinical AR Food Lens' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await lens
    .locator('input[type=file]')
    .setInputFiles({ name: 'unknown.png', mimeType: 'image/png', buffer: whitePixel });
  await expect(lens.getByText('Nutrition Not Clear')).toBeVisible();
  await expect(lens.getByRole('button', { name: 'Log estimate' })).toHaveCount(0);
});

test('invalid upload is rejected before the AI request and camera can retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/gemini', (route) => {
    requests++;
    return route.abort();
  });
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'Clinical AR Food Lens' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await lens.getByRole('button', { name: 'Retry Camera' }).click();
  await expect(lens.getByText('Camera Not Available')).toBeVisible();
  await lens
    .locator('input[type=file]')
    .setInputFiles({
      name: 'not-image.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });
  await expect(lens.getByText('Unsupported photo')).toBeVisible();
  expect(requests).toBe(0);
});

test('meal with unknown portion waits for an entered weight', async ({ page }) => {
  test.setTimeout(60000);
  await page.route('**/api/gemini', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: modelResult({
        detected: true,
        foodName: 'Homemade rice',
        foodType: 'meal',
        nutritionBasis: 'per_100g',
        portionGrams: null,
        calories: 130,
        protein: 2.7,
        carbs: 28,
        fats: 0.3,
        sugar: 0.1,
        fibre: 0.4,
        sodium: 1,
      }),
    })
  );
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'Clinical AR Food Lens' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await lens
    .locator('input[type=file]')
    .setInputFiles({ name: 'meal.png', mimeType: 'image/png', buffer: whitePixel });
  // Image decoding, compression and the asynchronous result render run before this assertion.
  await expect(lens.getByText('MEAL ESTIMATE · ENTER PORTION')).toBeVisible({ timeout: 30000 });
  await expect(lens.getByText('130 kcal')).toHaveCount(0);
  await expect(lens.getByRole('button', { name: 'Log estimate' })).toBeDisabled();
  await lens.getByLabel('Amount you ate (grams)').fill('250');
  await expect(lens.getByText('325 kcal')).toBeVisible();
});

test('dietician entry point saves the same portion math', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'hc_unified_profile_guest',
      JSON.stringify({
        activeId: 'profile_1',
        profiles: {
          profile_1: {
            demographics: { name: 'Test', age: 28, height: 172, weight: 70 },
            dietician: {
              profile: {
                age: 28,
                height: 172,
                weight: 70,
                goal: 'Maintain',
                activityLevel: 'moderate',
                gender: 'male',
                restrictions: [],
              },
              foodLogs: {},
              hydration: {},
              groceryList: [],
            },
          },
        },
      })
    )
  );
  await page.route('**/api/gemini', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: modelResult({
        detected: true,
        foodName: 'Lunch Plate',
        foodType: 'meal',
        nutritionBasis: 'per_100g',
        portionGrams: 370,
        calories: 138,
        protein: 4.2,
        carbs: 25.8,
        fats: 2.3,
        sugar: 1.1,
        fibre: 2.9,
        sodium: 185,
      }),
    })
  );
  await page.goto('/app/dietician');
  await page.getByRole('button', { name: 'Food Scanner' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await lens
    .locator('input[type=file]')
    .setInputFiles({ name: 'plate.png', mimeType: 'image/png', buffer: whitePixel });
  await expect(lens.getByText('Lunch Plate')).toBeVisible();
  await expect(lens.getByText('MEAL ESTIMATE · 370 G PORTION')).toBeVisible();
  await expect(lens.getByText('511 kcal')).toBeVisible();
  await expect(lens.getByLabel('Amount you ate (grams)')).toHaveValue('370');
  await lens.getByLabel('Amount you ate (grams)').fill('200');
  await expect(lens.getByText('MEAL ESTIMATE · 200 G PORTION')).toBeVisible();
  await expect(lens.getByText('276 kcal')).toBeVisible();
  await lens.getByRole('checkbox').check();
  await lens.getByRole('button', { name: 'Log estimate' }).click();
  await expect(lens).toHaveCount(0);
  const saved = await page.evaluate(async () => {
    const engine = await import(/* @vite-ignore */ '/src/services/ProfileEngine.js');
    const meals = await import(/* @vite-ignore */ '/src/services/MealCommandService.ts');
    return {
      legacyCount: engine.getProfile().nutrition.recentLogs.length,
      diary: Object.values(await meals.listMealDiary())
        .flat()
        .at(-1),
    };
  });
  expect(saved.legacyCount).toBe(0);
  expect(saved.diary.calories).toBe(276);
  expect(saved.diary.portionGrams).toBe(200);
});
