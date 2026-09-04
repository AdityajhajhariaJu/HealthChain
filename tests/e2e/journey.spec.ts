import { test, expect } from '@playwright/test';

test('guest can enter the assessment workspace from the public page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/HealthChain.*Health Assessment/i);

  const consent = page.getByRole('button', { name: 'I Accept' });
  if (await consent.isVisible().catch(() => false)) {
    // The banner animates in WebKit; wait for it to render, then use a forced
    // click so the test does not mistake its entrance animation for a broken
    // public-to-app transition.
    await consent.waitFor({ state: 'visible' });
    await consent.click({ force: true });
  }

  await expect(page.getByRole('heading', { name: /Your Symptoms.*Finally Explained/i })).toBeVisible();
  await page.getByRole('button', { name: 'Analyze →' }).click();

  await expect(page).toHaveURL(/\/app\/collab\?new=true|\/app\/onboarding/);
  await expect(page.locator('.app-shell')).toBeVisible();
});

test('clean unauthenticated browsers cannot open account case routes', async ({ page }) => {
  await page.goto('/app/my-cases');
  await expect(page).toHaveURL(/\/app\/onboarding|\/login/);
});

test('a forged browser auth flag cannot bypass the Supabase session boundary', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('isAuthenticated', 'true');
  });
  await page.goto('/app/my-cases');
  await expect(page).toHaveURL(/\/app\/onboarding|\/login/);
});
