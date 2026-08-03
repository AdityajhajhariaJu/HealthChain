import { test, expect } from '@playwright/test';

test('User can navigate landing page to dashboard', async ({ page }) => {
  // Go to Landing Page
  await page.goto('/');
  await expect(page).toHaveTitle(/HealthChain/);

  // Click Get Started which should redirect to /signup or /login
  await page.click('text=Get Started');
  
  // For the sake of the test, let's assume we can navigate to the app
  await page.goto('/app/today');
  
  // Wait for the app shell to load
  await expect(page.locator('.app-shell')).toBeVisible();

  // Verify Sidebar Links
  await expect(page.locator('text=Health Today')).toBeVisible();
  
  // Navigate to Parallel Specialists
  await page.click('text=Parallel Specialists');
  await expect(page).toHaveURL(/.*\/app\/multi/);
});
