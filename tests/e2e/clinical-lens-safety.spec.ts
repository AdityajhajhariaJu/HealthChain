import { expect, test } from '@playwright/test';

const whitePixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lN8AAAAASUVORK5CYII=', 'base64');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new Error('Camera denied in test')) } });
  });
  await page.route(/https:\/\//, route => route.abort());
});

function modelResult(food: object) {
  return JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(food) }] } }] });
}

test('pack scan saves only the amount eaten and avoids unsupported claims', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/gemini', route => route.fulfill({ status: 200, contentType: 'application/json', body: modelResult({
    detected: true, foodName: 'Audit Biscuits', servingSize: 'Per 100g (Pack size: 60g)', calories: 480, protein: 6, carbs: 64, fats: 20, sugar: 18, fibre: 2, sodium: 300,
    nutriScore: 'A', novaGrade: 1, allergens: ['None'], glycemicImpact: 'Low',
  }) }));
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'Clinical AR Food Lens' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await expect(lens.getByText('Camera Not Available')).toBeVisible();
  await expect(lens.getByRole('button', { name: 'Retry Camera' })).toBeVisible();
  await lens.locator('input[type=file]').setInputFiles({ name: 'pack.png', mimeType: 'image/png', buffer: whitePixel });
  await expect(lens.getByText('Audit Biscuits')).toBeVisible();
  await expect(lens.getByText('Nutri-Score A')).toHaveCount(0);
  await expect(lens.getByText('Low', { exact: true })).toHaveCount(0);
  await expect(lens.getByLabel('Amount you ate (grams)')).toHaveValue('60');
  await lens.getByRole('checkbox').check();
  await lens.getByRole('button', { name: 'Log estimate' }).click();
  await expect(lens).toHaveCount(0);
  const saved = await page.evaluate(async () => {
    const engine = await import(/* @vite-ignore */ '/src/services/ProfileEngine.js');
    const profile = engine.getProfile();
    return { nutrition: profile.nutrition.recentLogs.at(-1), diary: Object.values(profile.dietFoodLogs || {}).flat().at(-1) };
  });
  expect(saved.nutrition.calories).toBe(288);
  expect(saved.diary.calories).toBe(288);
  expect(saved.diary.portion).toBe('60g consumed');
});

test('incomplete AI output cannot be logged', async ({ page }) => {
  await page.route('**/api/gemini', route => route.fulfill({ status: 200, contentType: 'application/json', body: modelResult({ detected: true, foodName: 'Mystery Snack' }) }));
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'Clinical AR Food Lens' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await lens.locator('input[type=file]').setInputFiles({ name: 'unknown.png', mimeType: 'image/png', buffer: whitePixel });
  await expect(lens.getByText('Nutrition Not Clear')).toBeVisible();
  await expect(lens.getByRole('button', { name: 'Log estimate' })).toHaveCount(0);
});

test('invalid upload is rejected before the AI request and camera can retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/gemini', route => { requests++; return route.abort(); });
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'Clinical AR Food Lens' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await lens.getByRole('button', { name: 'Retry Camera' }).click();
  await expect(lens.getByText('Camera Not Available')).toBeVisible();
  await lens.locator('input[type=file]').setInputFiles({ name: 'not-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
  await expect(lens.getByText('Unsupported photo')).toBeVisible();
  expect(requests).toBe(0);
});

test('dietician entry point saves the same portion math', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ demographics: { name: 'Test', age: 28, height: 172, weight: 70 } })));
  await page.route('**/api/gemini', route => route.fulfill({ status: 200, contentType: 'application/json', body: modelResult({
    detected: true, foodName: 'Lunch Plate', servingSize: 'Per 100g (Full Plate: ~370g)', calories: 138, protein: 4.2, carbs: 25.8, fats: 2.3, sugar: 1.1, fibre: 2.9, sodium: 185,
  }) }));
  await page.goto('/app/dietician');
  await page.getByRole('button', { name: 'Snap Gallery' }).click();
  const lens = page.getByRole('dialog', { name: 'Clinical AR Food & Nutrition Scanner' });
  await lens.locator('input[type=file]').setInputFiles({ name: 'plate.png', mimeType: 'image/png', buffer: whitePixel });
  await expect(lens.getByText('Lunch Plate')).toBeVisible();
  await expect(lens.getByLabel('Amount you ate (grams)')).toHaveValue('370');
  await lens.getByRole('checkbox').check();
  await lens.getByRole('button', { name: 'Log estimate' }).click();
  await expect(lens).toHaveCount(0);
  const saved = await page.evaluate(async () => {
    const engine = await import(/* @vite-ignore */ '/src/services/ProfileEngine.js');
    const profile = engine.getProfile();
    return { nutrition: profile.nutrition.recentLogs.at(-1), diary: Object.values(profile.dietFoodLogs || {}).flat().at(-1) };
  });
  expect(saved.nutrition.calories).toBe(511);
  expect(saved.diary.calories).toBe(511);
  expect(saved.diary.portion).toBe('370g consumed');
});
