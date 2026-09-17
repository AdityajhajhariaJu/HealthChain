import { test, expect } from '@playwright/test';

test('Diet Plan opens without a runtime failure', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify({
      id: 'profile_1',
      demographics: { age: 35, gender: 'male', height: 175, weight: 70 },
      conditions: [],
      medications: [],
      dietician: {
        profile: {
          age: 35,
          gender: 'male',
          height: 175,
          weight: 70,
          goal: 'Maintain',
          activityLevel: 'moderate',
          medicalConditions: [],
          restrictions: [],
          cuisine: 'Indian',
        },
        foodLogs: {},
        hydration: {},
        groceryList: [],
      },
    }));
  });
  await page.route(/https:\/\//, route => route.abort());

  await page.goto('/app/dietician', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'AI Food Planner' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'A system error occurred' })).toHaveCount(0);
  expect(pageErrors.filter(message => !message.toLowerCase().includes('tailwind'))).toEqual([]);
});

test('Google login starts a Supabase OAuth request with the callback URL', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, route => route.abort());
  await page.goto('/login', { waitUntil: 'domcontentloaded' });

  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/auth/v1/authorize')),
    page.getByRole('button', { name: 'Google', exact: true }).click(),
  ]);

  const oauthUrl = new URL(request.url());
  expect(oauthUrl.searchParams.get('provider')).toBe('google');
  expect(oauthUrl.searchParams.get('redirect_to')).toBe('http://localhost:3001/auth/callback');
});
