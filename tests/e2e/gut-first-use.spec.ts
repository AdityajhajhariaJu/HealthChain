import { test, expect } from '@playwright/test';

test('a first-time guest can ask one question without inventing a symptom', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByRole('navigation', { name: 'Gut Health sections' })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I feel unwell/ })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I need to choose/ })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I want to understand/ })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I have a care question/ })).toBeVisible();
  const firstCard = await gut.getByRole('button', { name: /I feel unwell/ }).boundingBox();
  const secondCard = await gut.getByRole('button', { name: /I need to choose/ }).boundingBox();
  expect(firstCard && secondCard && Math.abs(firstCard.y - secondCard.y) < 2 && secondCard.x > firstCard.x).toBe(true);
  await expect(gut.getByLabel('Your question or situation')).toHaveCount(0);
  await gut.getByRole('button', { name: /I want to understand/ }).click();
  await expect(gut.getByRole('heading', { name: 'What pattern are you curious about?' })).toBeVisible();
  const question = gut.getByLabel('Your question or situation');
  await gut.getByText('Add a meal or symptom from your records (optional)').click();
  await expect(gut.getByLabel('Symptom (optional)')).toHaveValue('unspecified');
  await gut.locator('details.gr-example-disclosure > summary').click();
  await gut.getByRole('button', { name: 'What pattern should I check after dinner?' }).click();
  await expect(question).toHaveValue('What pattern should I check after dinner?');
  await expect(gut.getByRole('heading', { name: 'What pattern should I check after dinner?' })).toHaveCount(0);
  await gut.getByRole('button', { name: 'Open my question' }).click();
  await expect(gut.getByText('Symptom not selected')).toBeVisible();
  await expect(gut.getByText(/Your question is saved/)).toBeVisible();
  expect(await gut.locator('.gr-workspace').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('choosing a current-concern path still requires the user to describe their situation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
  });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I feel unwell/ }).click();
  await expect(gut.getByRole('button', { name: /I feel unwell/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(gut.getByRole('heading', { name: 'What is happening right now?' })).toBeVisible();
  await expect(gut.getByRole('button', { name: 'Open my question' })).toBeDisabled();
  await gut.getByLabel('Your question or situation').fill('I have abdominal pain after lunch');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  await expect(gut.getByText('Current concern')).toBeVisible();
  await expect(gut.getByText('Anchored to verified onset')).toHaveCount(0);
});

test('each card opens its own short onboarding prompt without creating a question', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_guest_mode', 'true'));
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  const paths = [
    [/I feel unwell/, 'What is happening right now?'],
    [/I need to choose/, 'What decision is coming up?'],
    [/I want to understand/, 'What pattern are you curious about?'],
    [/I have a care question/, 'What would you like to discuss at a visit?'],
  ] as const;
  for (const [card, heading] of paths) {
    await gut.getByRole('button', { name: card }).click();
    await expect(gut.getByRole('heading', { name: heading })).toBeVisible();
    await expect(gut.getByRole('button', { name: 'Open my question' })).toBeDisabled();
  }
  await expect(gut.getByText('Add a meal or symptom from your records (optional)')).toBeVisible();
});
