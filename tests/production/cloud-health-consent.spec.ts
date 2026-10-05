import { expect, test } from '@playwright/test';

test('built signed-in app requires cloud permission and keeps declined records local', async ({
  page,
}, testInfo) => {
  const owner = '1cd902dd-6aba-442a-8a16-dfa46e4f48ba';
  const healthRequests: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(/https:\/\//, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (
      /^\/rest\/v1\/(?:profiles|healthchain_profiles|cases|case_tombstones|health_memory|health_observations|ava_messages|rpc\/)/.test(
        path
      )
    )
      healthRequests.push(path);
    if (path.startsWith('/rest/v1/')) return route.fulfill({ json: [] });
    if (path === '/auth/v1/user')
      return route.fulfill({
        json: {
          id: owner,
          email: 'synthetic@example.invalid',
          aud: 'authenticated',
          role: 'authenticated',
        },
      });
    return route.abort();
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
  await page.addInitScript((owner) => {
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const encode = (data: object) =>
      btoa(JSON.stringify(data)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    const user = {
      id: owner,
      email: 'synthetic@example.invalid',
      aud: 'authenticated',
      role: 'authenticated',
      user_metadata: {},
    };
    localStorage.setItem(
      'healthchain_auth_token',
      JSON.stringify({
        access_token:
          encode({ alg: 'HS256', typ: 'JWT' }) +
          '.' +
          encode({ sub: owner, exp: expires, aud: 'authenticated' }) +
          '.synthetic',
        refresh_token: 'synthetic-unused',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expires,
        user,
      })
    );
    localStorage.setItem('hc_account', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    localStorage.setItem(
      'hc_adult_eligibility_' + owner,
      JSON.stringify({
        version: '2026-10-05-age-18',
        minimumAge: 18,
        confirmed: true,
        confirmedAt: new Date().toISOString(),
      })
    );
    localStorage.setItem(
      'hc_unified_profile_' + owner,
      JSON.stringify({
        activeId: 'profile_1',
        profiles: {
          profile_1: {
            id: 'profile_1',
            profileName: 'Synthetic consent check',
            onboardingCompletedAt: new Date().toISOString(),
            demographics: { name: 'Synthetic consent check', age: 30 },
          },
        },
      })
    );
  }, owner);

  await page.goto('/app/settings');
  await expect(
    page.getByRole('heading', { name: 'Choose how to store your health records' })
  ).toBeVisible();
  await expect(page.getByRole('checkbox')).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Allow cloud health storage' })).toBeDisabled();
  expect(healthRequests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath('cloud-health-choice-phone.png') });
  await page.getByRole('button', { name: 'Keep records on this device' }).click();
  const tour = page.getByRole('button', { name: 'Skip Tour', exact: true });
  if (await tour.isVisible()) await tour.click();
  await expect(page.getByRole('region', { name: 'Privacy controls' })).toContainText(
    'Cloud health storage: Paused'
  );
  expect(healthRequests).toEqual([]);

  await page.getByRole('button', { name: 'Review cloud health permission' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Allow cloud health storage' }).click();
  if (await tour.isVisible()) await tour.click();
  await expect.poll(() => healthRequests.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Withdraw cloud health permission' }).click();
  await expect(page.getByRole('region', { name: 'Privacy controls' })).toContainText(
    'Cloud health storage: Paused'
  );
  const afterWithdrawal = healthRequests.length;
  await page.goto('/app/my-cases?new=true');
  await page.getByLabel('Case title', { exact: true }).fill('Synthetic local consent record');
  await page
    .getByLabel('What would you like help with?', { exact: true })
    .fill('Prepare questions from local records.');
  await page.getByRole('button', { name: 'Save case draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic local consent record' })).toBeVisible();
  expect(healthRequests.length).toBe(afterWithdrawal);
});
