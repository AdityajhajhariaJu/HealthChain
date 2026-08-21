import { test, expect } from '@playwright/test';

test('guest can enter the assessment workspace from the public page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/HealthChain.*Health Assessment/i);

  const consent = page.getByRole('button', { name: 'I Accept' });
  if (await consent.isVisible().catch(() => false)) {
    await consent.click();
  }

  await expect(page.getByRole('heading', { name: /Your Symptoms\. Finally Explained\./i })).toBeVisible();
  await page.getByRole('button', { name: 'Start Your Assessment' }).click();

  await expect(page).toHaveURL(/\/app\/collab\?new=true/);
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.getByText('Health Today')).toBeVisible();
  await expect(page.getByText(/Ready to find your root cause/i)).toHaveCount(0);
});

test('clean unauthenticated browsers cannot open account case routes', async ({ page }) => {
  await page.goto('/app/my-cases');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Welcome back|Create your account/i })).toBeVisible();
});
