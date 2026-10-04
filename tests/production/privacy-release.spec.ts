import { expect, test } from '@playwright/test';
import { installLayoutFixture, conditionName } from './helpers/layout';
test('opening saved medical records keeps AI optional until an explicit request', async ({ page }) => {
  await installLayoutFixture(page);
  const sent: string[] = [];
  await page.route('**/api/gemini', route => { sent.push(route.request().url()); return route.abort(); });
  await page.goto('/app/profile');
  await expect(page.getByRole('button', { name: `Remove ${conditionName}`, exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Insights', exact: true }).click();
  const create = page.getByRole('button', { name: 'Create AI profile summary', exact: true });
  await expect(create).toBeEnabled();
  expect(sent).toEqual([]);
  await expect(page.getByRole('dialog', { name: 'Choose whether to use AI' })).toHaveCount(0);
  await create.click();
  await page.getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(create).toBeEnabled();
  expect(sent).toEqual([]);
});
test('regional policies and section navigation stay readable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => localStorage.setItem('hc_cookies_accepted', 'declined'));
  await page.route(/https:\/\//, route => route.abort());
  await page.goto('/privacy?region=us');
  await expect(page.getByRole('button', { name: 'United States', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'United States privacy supplement', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'International', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'International privacy supplement', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: '9. Your controls and requests' }).click();
  await expect(page.getByRole('heading', { name: '9. Your controls and requests', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('navigation', { name: 'Legal documents' }).getByRole('link', { name: 'Account Deletion', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Account Deletion', exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toContainText('healthchain360@gmail.com');
});
test('Health Connect privacy and public deletion instructions render without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage(); await page.goto('/privacypolicy.html');
    await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('steps, sleep, heart rate and total calories');
    await page.getByRole('link', { name: 'Account deletion', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Account Deletion', exact: true })).toBeVisible();
    await expect(page.locator('main')).toContainText('healthchain360@gmail.com');
    expect(await page.locator('script').count()).toBe(0);
  } finally { await context.close(); }
});
