import { expect, test } from '@playwright/test';

test('optional measurement waits for permission and excludes private route/query data', async ({ page }) => {
  const events: any[] = [];
  await page.route(/https:\/\//, route => route.abort());
  await page.route('**/api/product-metrics', route => {
    events.push(route.request().postDataJSON());
    expect(route.request().headers()['x-hc-measurement-consent']).toBe('2026-10-04-aggregate-v2');
    return route.fulfill({ status: 204 });
  });
  await page.goto('/privacy?record=private-record&email=private@example.test');
  await expect(page.getByRole('heading', { name: 'Privacy Policy', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Privacy preferences' })).toBeVisible();
  expect(events).toEqual([]);
  await page.getByRole('button', { name: 'Allow optional measurement', exact: true }).click();
  await expect.poll(() => events.length).toBe(1);
  expect(events).toEqual([{ event: 'page_view', dimension: '/privacy', platform: 'web' }]);
  expect(await page.evaluate(() => localStorage.getItem('hc_anon_id'))).toBeNull();
  await page.getByRole('navigation', { name: 'Legal documents' }).getByRole('link', { name: 'Terms of Service', exact: true }).click();
  await expect.poll(() => events.length).toBe(2);
  expect(events[1]).toEqual({ event: 'page_view', dimension: '/terms', platform: 'web' });
});

test('Global Privacy Control overrides accepted optional measurement', async ({ page }) => {
  const events: string[] = [];
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { value: true });
    localStorage.setItem('hc_cookies_accepted', 'accepted');
    localStorage.setItem('hc_measurement_version', '2026-10-04-aggregate-v2');
  });
  await page.route(/https:\/\//, route => route.abort());
  await page.route('**/api/product-metrics', route => { events.push(route.request().url()); return route.fulfill({ status: 204 }); });
  await page.goto('/privacy');
  await page.getByRole('button', { name: 'Allow optional measurement', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Privacy preferences' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('hc_cookies_accepted'))).toBe('declined');
  expect(events).toEqual([]);
});
