import { expect, test, type Page } from '@playwright/test';

async function seed(page: Page) {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: {
      id: 'profile_1', demographics: { age: 35, gender: 'male', height: 175, weight: 70, countryCode: 'JP', region: 'Osaka' },
      conditions: [], medications: [], allergies: [],
    } } }));
  });
  await page.route(/https:\/\//, route => route.abort());
}

test('food onboarding inherits residence and saves location and a chosen cuisine together', async ({ page }) => {
  await seed(page);
  await page.goto('/app/dietician');
  await page.getByRole('button', { name: 'Continue (details optional)' }).click();
  await page.getByRole('button', { name: /Metabolic Balance & Longevity/ }).click();
  await page.getByRole('button', { name: /Sedentary/ }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue to Cuisine Setup' }).click();
  await expect(page.getByRole('heading', { name: 'Location & culinary style' })).toBeVisible();
  const country = page.getByLabel('Country / territory', { exact: true });
  const region = page.getByLabel('State / region (optional)', { exact: true });
  await expect(country).toHaveValue('JP');
  await expect(region).toHaveValue('Osaka');
  await country.selectOption('');
  await expect(region).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Continue to Meal Schedule' })).toBeDisabled();
  await country.selectOption('IN');
  await region.fill('Tamil Nadu');
  await page.getByRole('button', { name: 'Western', exact: true }).click();
  await page.getByRole('button', { name: 'Continue to Meal Schedule' }).click();
  await page.getByRole('button', { name: /3 Meals \+ 1 Snack/ }).click();
  await page.getByRole('button', { name: 'Enter Dietician Dashboard' }).click();
  await expect(page.getByRole('heading', { name: 'AI Food Planner' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hc_unified_profile_guest')!).profiles.profile_1);
  expect(saved.demographics).toMatchObject({ countryCode: 'IN', region: 'Tamil Nadu' });
  expect(saved.dietProfile).toMatchObject({ countryCode: 'IN', region: 'Tamil Nadu', cuisine: 'Western' });
  expect(saved.dietician.profile).toMatchObject({ countryCode: 'IN', region: 'Tamil Nadu', cuisine: 'Western' });
  // A new page shares stored data without running the first page's seed script.
  const reopened = await page.context().newPage();
  await reopened.goto('/app/dietician?tab=mealplan');
  await expect(reopened.getByText(/Editable example · Western · Tamil Nadu, India/)).toBeVisible();
  await reopened.close();
});

for (const route of ['/onboarding', '/app/onboarding']) {
  test(`health onboarding asks country and region on ${route}`, async ({ page }) => {
    await seed(page);
    await page.goto(route);
    if (route === '/app/onboarding') {
      await page.getByRole('button', { name: 'Get Started' }).click();
      await page.getByRole('button', { name: /Track Calories/ }).click();
    }
    await expect(page.getByText('Where do you live?')).toBeVisible();
    await expect(page.getByLabel('Country / territory (optional)', { exact: true })).toHaveValue('JP');
    await expect(page.getByLabel('State / region (optional)', { exact: true })).toHaveValue('Osaka');
  });
}
