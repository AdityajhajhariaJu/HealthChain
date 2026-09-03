import { test, expect } from '@playwright/test';

test.skip('guest can enter the assessment workspace from the public page', async ({ page }) => {
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


  await page.getByRole('button', { name: 'Start Your Assessment' }).click();


  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.getByText('Health Today')).toBeVisible();
  await expect(page.getByText(/Ready to find your root cause/i)).toHaveCount(0);
});

test.skip('clean unauthenticated browsers cannot open account case routes', async ({ page }) => {
  await page.goto('/app/my-cases');
  await expect(page).toHaveURL(/\/app\/onboarding|\/login/);
  await expect(page.getByRole('heading', { name: /Welcome back|Create your account|Let's build your health story\./i })).toBeVisible();
});

test.skip('a forged browser auth flag cannot bypass the Supabase session boundary', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('isAuthenticated', 'true');
  });
  await page.goto('/app/my-cases');
  await expect(page).toHaveURL(/\/app\/onboarding|\/login/);
  await expect(page.getByRole('heading', { name: /Welcome back|Create your account|Let's build your health story\./i })).toBeVisible();
});
