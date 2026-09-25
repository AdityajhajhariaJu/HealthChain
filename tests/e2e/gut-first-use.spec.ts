import { test, expect } from '@playwright/test';

test('a first-time guest can ask one question without inventing a symptom', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  const question = gut.getByLabel('Your question or situation');
  await gut.getByRole('button', { name: 'What pattern should I check after dinner?' }).click();
  await expect(question).toHaveValue('What pattern should I check after dinner?');
  await expect(gut.getByRole('heading', { name: 'What pattern should I check after dinner?' })).toHaveCount(0);
  await gut.getByRole('button', { name: 'Open my question' }).click();
  await expect(gut.getByText('Symptom not selected')).toBeVisible();
  await expect(gut.getByText(/Your question is saved/)).toBeVisible();
  expect(await gut.locator('.gr-workspace').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('the current-concern path never labels question creation as verified symptom onset', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
  });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /Check now/ }).click();
  await expect(gut.getByText('Current concern')).toBeVisible();
  await expect(gut.getByText('Anchored to verified onset')).toHaveCount(0);
});
