import { test, expect } from '@playwright/test';

test('Gut evidence separates saved meal names without inferring recipes on mobile', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify({
      activeId: 'profile_1', profiles: { profile_1: {
        id: 'profile_1', profileName: 'My Profile',
        nutrition: { recentLogs: [
          { id: 'chai-masala', meal: 'Masala Chai', date: '2026-09-20', loggedAt: '2026-09-20T08:30:00Z', reaction: { label: 'Bloating', reactionType: 'bloat', loggedAt: '2026-09-20T10:00:00Z' } },
          { id: 'chai-oat', meal: 'Chai with oat milk', date: '2026-09-21', loggedAt: '2026-09-21T08:30:00Z' },
        ] },
      } },
    }));
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I want to understand/ }).click();
  await gut.getByLabel('Your question or situation').fill('Is chai related to bloating?');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  const trail = gut.getByRole('region', { name: 'Question reading' });
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await trail.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await trail.getByRole('button', { name: /My records/ }).click();
  await gut.locator('#gr-occasion-chai-masala').getByRole('button', { name: 'Open meal' }).click();
  const exactSource = gut.getByRole('region', { name: 'Exact source record' });
  await expect(exactSource.getByRole('heading', { name: 'Masala Chai' })).toBeVisible();
  await expect(exactSource.getByText('chai-masala')).toBeVisible();
  await gut.getByRole('button', { name: 'My questions' }).click();
  await gut.getByRole('button', { name: 'My answer' }).click();
  await trail.getByRole('button', { name: /Why ask/ }).click();
  await trail.getByRole('button', { name: /Review this detail/ }).click();
  await expect(page.locator('#gr-occasion-chai-oat')).toBeFocused();
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await gut.locator('.gr-evidence-view').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  const variants = gut.getByRole('region', { name: 'Saved meal name variants' });
  await expect(variants.getByText('2 saved name or user-confirmed preparation groups match “chai”')).toBeVisible();
  await expect(variants.getByRole('button', { name: /Masala Chai.*1 with.*0 without.*0 unknown/ })).toBeVisible();
  await expect(variants.getByRole('button', { name: /Chai with oat milk.*0 with.*0 without.*1 unknown/ })).toBeVisible();
  await expect(variants.getByText(/Unknown preparation remains unknown; no ingredient is inferred/)).toBeVisible();
  await variants.getByRole('button', { name: /Chai with oat milk.*0 with.*0 without.*1 unknown/ }).click();
  await expect(page.locator('#gr-occasion-chai-oat')).toBeFocused();
  expect(await variants.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});
