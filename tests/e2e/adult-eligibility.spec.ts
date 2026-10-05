import { expect, test } from '@playwright/test';

// Leave time for cold local compilation and WebKit policy navigation.
test.setTimeout(60_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, route => route.abort());
});

for (const path of ['/app/today', '/onboarding', '/pricing']) {
  test(`adult confirmation is required before opening ${path}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const aiRequests: string[] = [];
    await page.route('**/api/gemini', route => {
      aiRequests.push(route.request().url());
      return route.abort();
    });
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'HealthChain is for adults' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'I confirm that I am 18 or older.' })).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
    await expect(page.locator('.app-shell')).toHaveCount(0);
    expect(aiRequests).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (path === '/app/today') await page.screenshot({ path: testInfo.outputPath('adult-confirmation-phone.png') });
    await page.getByRole('link', { name: 'Leave the workspace' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: /Your Health Story\. Finally Connected\./i })).toBeVisible();
    expect(aiRequests).toEqual([]);
  });
}

test('policies remain accessible before age confirmation and confirming unlocks the workspace', async ({ page }) => {
  await page.goto('/app/settings', { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Privacy Policy', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Legal documents' }).getByRole('link', { name: 'Account Deletion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Account Deletion', exact: true })).toBeVisible();
  await page.goto('/app/settings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: 'I confirm that I am 18 or older.' }).check();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Preferences', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HealthChain is for adults' })).toHaveCount(0);
});
