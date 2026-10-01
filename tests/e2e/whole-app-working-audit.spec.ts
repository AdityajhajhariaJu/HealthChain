import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: { id: 'profile_1', demographics: { age: 35, gender: 'female', height: 165, weight: 65 }, conditions: [], medications: [], allergies: [] } } }));
  });
  await page.route(/https:\/\//, route => route.abort());
});

// These establish route/render availability, not authenticated provider/device
// acceptance. Feature interaction suites cover the health pillar workflows.
for (const route of ['/privacy', '/terms', '/review-demo', '/changelog', '/help', '/pricing', '/app/progress', '/app/trophies', '/app/health-memory', '/app/case-prep', '/app/trials', '/app/settings', '/app/profile', '/app/my-cases']) {
  test(`${route} loads its actual page without a runtime failure`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1,h2').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'A system error occurred' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /page not found/i })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

test('feedback database failure keeps the draft and offers retry/email without false success', async ({ page }) => {
  await page.route('**/rest/v1/user_feedback*', route => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'SYNTHETIC_REJECTION', message: 'Synthetic write rejection' }) }));
  await page.goto('/help');
  await page.getByLabel('Your Message / Description *').fill('SYNTHETIC_FEEDBACK_DRAFT');
  const submit = page.locator('form button[type="submit"]');
  await submit.click();
  await expect(page.getByRole('alert')).toContainText('Your message was not saved');
  await expect(page.getByText('Feedback Received! Thank You', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Your Message / Description *')).toHaveValue('SYNTHETIC_FEEDBACK_DRAFT');
  await expect(submit).toBeEnabled();
  await expect(page.getByRole('link', { name: 'Send this message by email' })).toHaveAttribute('href', /SYNTHETIC_FEEDBACK_DRAFT/);
});

test('a guest cannot open the privileged content editing surface', async ({ page }) => {
  await page.goto('/app/admin/content');
  await expect(page.getByRole('alert')).toContainText('authorized content administrator');
  await expect(page.getByRole('button', { name: 'Save clinical content' })).toHaveCount(0);
});

test('a guest quota action routes to pricing without opening account checkout', async ({ page }) => {
  await page.goto('/app/today');
  await expect(page.getByRole('button', { name: 'Quick log 250ml water' })).toBeVisible();
  // Guest requests route to pricing instead of launching payment without an account.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('hc_quota_exceeded', { detail: { operation: 'ava_chat' } })));
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByText('Buy Now', { exact: true })).toHaveCount(0);
});
