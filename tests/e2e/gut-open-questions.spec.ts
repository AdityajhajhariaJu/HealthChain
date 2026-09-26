import { test, expect } from '@playwright/test';

test('older open Gut questions remain reachable without another intake', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /Understand a symptom/ }).click();
  await gut.getByLabel('Your question or situation').fill('What happened after breakfast?');
  await gut.getByRole('button', { name: 'Explore without AI' }).click();
  await gut.getByRole('button', { name: 'Open my connection map' }).click();
  await gut.getByRole('button', { name: 'All questions' }).click();
  await expect(gut.getByLabel('Your question or situation')).toHaveCount(0);
  await gut.getByRole('button', { name: 'Ask something new' }).click();
  await gut.getByRole('button', { name: /Prepare for a visit/ }).click();
  await gut.getByLabel('Your question or situation').fill('What should I ask at my visit?');
  await gut.getByRole('button', { name: 'Explore without AI' }).click();
  await gut.getByRole('button', { name: 'Open my connection map' }).click();
  await gut.getByRole('button', { name: 'All questions' }).click();

  await expect(gut.getByText('What should I ask at my visit?')).toBeVisible();
  await gut.getByRole('button', { name: /What happened after breakfast\?/ }).click();
  await expect(gut.getByRole('heading', { name: /What happened after breakfast\?/ })).toBeVisible();
});
