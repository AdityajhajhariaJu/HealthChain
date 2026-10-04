import { expect, test } from '@playwright/test';
import { installLayoutFixture } from './helpers/layout';

test.use({ reducedMotion: 'reduce' });

for (const width of [320, 390, 1440]) {
  test(`settings makes policy links visible before preferences at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await installLayoutFixture(page);
    await page.goto('/app/settings');
    const navigation = page.getByRole('navigation', { name: 'Terms and privacy policies' });
    await expect(navigation.getByRole('link', { name: 'All policies', exact: true })).toBeInViewport();
    const heading = page.getByRole('heading', { name: 'Terms and policies', exact: true });
    const preferences = page.getByRole('heading', { name: 'Preferences', exact: true });
    expect((await heading.boundingBox())!.y).toBeLessThan((await preferences.boundingBox())!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    if (width === 390) await page.screenshot({ path: testInfo.outputPath('settings-policy-links.png') });
    await navigation.getByRole('link', { name: 'Terms of Service', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Terms of Service', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'United States', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'International', exact: true })).toBeVisible();
  });
}

test('phone More menu opens the full policy hub', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await installLayoutFixture(page);
  await page.goto('/app/today');
  await page.getByRole('button', { name: 'More Menu', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'More Health Tools' });
  const shortcut = dialog.getByRole('button', { name: 'Terms and policies', exact: true });
  await expect(shortcut).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath('more-policy-shortcut.png') });
  await shortcut.click();
  await expect(page.getByRole('heading', { name: 'Terms and policies', exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'United States', exact: true }).click();
  await expect(page.getByRole('button', { name: 'United States', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('navigation', { name: 'Legal documents' })).toContainText('Consumer Health Privacy');
});

test('website footer opens all policies without signing in', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_cookies_accepted', 'declined'));
  await page.route(/https:\/\//, route => route.abort());
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'All policies', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Terms and policies', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Legal documents' })).toContainText('Account Deletion');
});
