import { expect, test, type Page } from '@playwright/test';
async function seed(page: Page) {
  await page.addInitScript(() => {
    if (localStorage.getItem('diet-everyday-seeded')) return;
    localStorage.clear();
    localStorage.setItem('diet-everyday-seeded', 'true');
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    const profile: any = {
      id: 'profile_1',
      demographics: {
        age: 35,
        gender: 'male',
        weight: 70,
        height: 175,
        countryCode: 'JP',
        region: 'Osaka',
      },
      conditions: [],
      medications: [],
      allergies: [],
      dietProfile: {
        age: '35',
        gender: 'male',
        weight: '70',
        height: '175',
        weightUnit: 'kg',
        heightUnit: 'cm',
        goal: 'Maintain',
        activityLevel: 'sedentary',
        cuisine: 'Local',
        countryCode: 'JP',
        region: 'Osaka',
        mealSchedule: '3 Meals',
        restrictions: ['None'],
        medicalConditions: ['None'],
        practical: { maxPrepMinutes: 15, equipment: ['Hob'], householdSize: 1, showNumbers: true },
      },
      dietMealPlan: {
        id: 'test-plan',
        status: 'draft',
        createdAt: '2026-09-29T00:00:00Z',
        updatedAt: '2026-09-29T00:00:00Z',
        plan: Array.from({ length: 7 }, (_, i) => ({
          day: i + 1,
          meals: ['Breakfast', 'Lunch', 'Dinner'].map((type) => ({
            id: `meal-${type}`,
            type,
            name: `Test ${type}`,
            calories: 500,
            protein: 12,
            carbs: 60,
            fat: 15,
            ingredients: [
              { name: 'Oats', amount: 80, unit: 'g' },
              { name: 'Milk', amount: 200, unit: 'ml' },
            ],
            steps: ['Cook oats'],
            prepMinutes: 10,
          })),
        })),
      },
    };
    localStorage.setItem(
      'hc_unified_profile_guest',
      JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: profile } })
    );
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.goto('/app/dietician');
  await expect(page.getByRole('heading', { name: 'AI Food Planner' })).toBeVisible({
    timeout: 15000,
  });
}
const tools = (page: Page) =>
  page.getByRole('dialog', { name: 'Everyday food tools', exact: true });

test('personal library, name-only offline logging and reload preserve unknown nutrition', async ({
  page,
}) => {
  await seed(page);
  await expect(page.getByRole('heading', { name: 'Breakfast', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Morning Snack', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'My meals & history', exact: true }).click();
  const dialog = tools(page);
  await dialog
    .getByLabel('New favorite name')
    .pressSequentially('My familiar breakfast', { delay: 20 });
  await dialog.getByRole('button', { name: 'Save favorite', exact: true }).click();
  await expect(
    dialog.getByText('Meal saved to your library. It has not been logged as eaten.')
  ).toBeVisible();
  await page.context().setOffline(true);
  await dialog.getByRole('button', { name: 'Log favorite as eaten' }).click();
  await expect(
    dialog.getByText(
      'Meal recorded for the selected date. Reused nutrient values remain estimates.'
    )
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close tools' }).click();
  await expect(page.getByText('My familiar breakfast', { exact: true })).toBeVisible();
  await expect(page.getByText('Nutrition unknown; this meal is still recorded.')).toBeVisible();
  await page.context().setOffline(false);
  await page.reload();
  await expect(page.getByText('My familiar breakfast', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'My meals & history', exact: true }).click();
  await expect(tools(page).getByRole('heading', { name: 'My familiar breakfast' })).toBeVisible();
});

test('everyday preferences, household recipes, pantry and selected shopping stay connected', async ({
  page,
}) => {
  test.setTimeout(60000);
  await seed(page);
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  const dialog = tools(page);
  await dialog.getByLabel('People sharing the recipe').fill('3');
  await dialog.getByLabel('Use my pantry stock in planning and shopping').check();
  await dialog.getByLabel('Show calories and nutrient numbers').uncheck();
  await dialog.getByRole('button', { name: 'Save everyday preferences' }).click();
  await expect(dialog.getByText('Everyday preferences saved.')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Pantry', exact: true }).click();
  await dialog.getByLabel('Ingredient name').fill('oats');
  await dialog.getByLabel('Available amount').fill('100');
  await dialog.getByRole('button', { name: 'Add pantry stock' }).click();
  await expect(dialog.getByText('Pantry stock saved.')).toBeVisible();
  await dialog.getByRole('tab', { name: 'Plan choices', exact: true }).click();
  await dialog.getByRole('button', { name: 'Clear shopping selection' }).click();
  await expect(dialog.getByText('Shopping selection cleared.')).toBeVisible();
  await dialog.getByText('Day 1 · Date not assigned', { exact: true }).click();
  await dialog.getByLabel('Breakfast: Test Breakfast', { exact: true }).first().check();
  await expect(dialog.getByText('Oats: 240 g', { exact: true }).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Close tools' }).click();
  await page.getByRole('button', { name: 'Grocery List', exact: true }).first().click();
  await expect(page.getByRole('checkbox', { name: 'oats — 140 g', exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'milk — 600 ml', exact: true })).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('hc_unified_profile_guest')!).profiles.profile_1
  );
  expect(saved.dietProfile.practical).toMatchObject({
    householdSize: 3,
    showNumbers: false,
    usePantry: true,
  });
  expect(saved.dietEveryday.selectedMeals).toEqual(['1:meal-Breakfast']);
});

test('plan meals are only logged after reviewing actual portion and eating date', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: '7-Day Plan', exact: true }).click();
  await page.getByRole('button', { name: 'Record this meal as eaten' }).first().click();
  const confirm = page.getByRole('dialog', { name: 'Confirm planned meal eaten' });
  await expect(confirm).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirm).toHaveCount(0);
  await page.getByRole('button', { name: 'Record this meal as eaten' }).first().click();
  await confirm.getByLabel('Portion compared with this planned serving').selectOption('0.5');
  await confirm.getByRole('button', { name: 'Confirm meal was eaten' }).click();
  await expect(confirm).toHaveCount(0);
  await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('Test Breakfast', { exact: true })).toBeVisible();
  await expect(page.getByText('250 kcal', { exact: false }).first()).toBeVisible();
});

test('barcode lookup presents per-100 source and records actual quantity', async ({ page }) => {
  await seed(page);
  await page.route('**/api/food-product?*', (route) =>
    route.fulfill({
      json: {
        product: {
          code: '3017620422003',
          name: 'Test packaged oats',
          brands: 'Test only',
          per100: {
            calories: 400,
            protein: 10,
            carbs: 60,
            fat: 12,
            sugar: null,
            fibre: 8,
            sodium: 0,
          },
          basis: 'per_100g',
          sourceId: 'https://world.openfoodfacts.org/product/3017620422003',
          sourceVersion: 'test-version',
          issues: [],
          ingredients: 'Oats',
          allergens: 'Unknown',
          license: 'ODbL',
        },
      },
    })
  );
  await page.getByRole('button', { name: 'Packaged food', exact: true }).click();
  const dialog = tools(page);
  await dialog.getByLabel('Printed barcode').fill('3017620422003');
  await dialog.getByRole('button', { name: 'Look up barcode' }).click();
  await expect(dialog.getByLabel('calories per 100 g (kcal)')).toHaveValue('400');
  await dialog.getByLabel('Actual amount consumed (g)').fill('35');
  await dialog
    .getByLabel('I checked the product, values and per-100 basis against my package')
    .check();
  await dialog.getByRole('button', { name: 'Record consumed product' }).click();
  await expect(
    dialog.getByText('Product and consumed amount recorded. Catalog data remains unverified.')
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close tools' }).click();
  await expect(page.getByText('Test packaged oats', { exact: true })).toBeVisible();
  await expect(page.getByText('140 kcal', { exact: false }).first()).toBeVisible();
});

test('browser reminders explain closed-browser capability before opt-in', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Reminders', exact: true }).click();
  const dialog = tools(page);
  await expect(dialog.getByText(/Closed-browser delivery is not supported/)).toBeVisible();
  await dialog.getByLabel('Enable this reminder').first().check();
  await dialog.getByRole('button', { name: 'Save food reminders' }).click();
  await expect(dialog.getByText(/In-app reminders saved/)).toBeVisible();
});

test('new diary meals, reactions, history and exports use the same canonical records', async ({
  page,
}) => {
  test.setTimeout(60000);
  await seed(page);
  await page.getByRole('button', { name: 'My meals & history', exact: true }).click();
  const dialog = tools(page);
  await dialog.getByLabel('New favorite name').fill('My timeline meal');
  await dialog.getByRole('button', { name: 'Save favorite', exact: true }).click();
  await expect(
    dialog.getByText('Meal saved to your library. It has not been logged as eaten.')
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Log favorite as eaten' }).click();
  await expect(
    dialog.getByText(
      'Meal recorded for the selected date. Reused nutrient values remain estimates.'
    )
  ).toBeVisible();
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Export all dated food records (CSV)' }).click();
  expect((await download).suggestedFilename()).toMatch(/food-records.*csv/);
  await dialog.getByRole('button', { name: 'Close tools' }).click();
  await page.getByRole('button', { name: 'Timeline Recorded history' }).click();
  await expect(page.getByText('My timeline meal', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tap to log reaction' }).click();
  await page.getByRole('button', { name: /Bloating.*Distension/ }).click();
  await expect(page.getByText('Recorded: Bloating', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('My timeline meal', { exact: true })).toBeVisible();
  await expect(page.getByText('Bloating', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Timing not recorded', { exact: true })).toBeVisible();
});

test('preferences survive unrelated profile updates and fit a narrow screen', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  const dialog = tools(page);
  await dialog.getByLabel('People sharing the recipe').fill('3');
  await page.evaluate(() => window.dispatchEvent(new Event('hc_profile_updated')));
  await expect(dialog.getByLabel('People sharing the recipe')).toHaveValue('3');
  await dialog.getByLabel('Currency (optional, 3-letter code)').fill('INR');
  await dialog.getByLabel('No cooking', { exact: true }).check();
  await expect(dialog.getByLabel('Hob', { exact: true })).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Save everyday preferences' }).click();
  await expect(dialog.getByText('Everyday preferences saved.')).toBeVisible();
  const overflow = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
  expect(overflow).toBe(false);
  const feedbackCanCoverForm = await page
    .getByRole('button', { name: 'Send Feedback', exact: true })
    .evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return hit === button || button.contains(hit);
    });
  expect(feedbackCanCoverForm).toBe(false);
  await dialog.getByRole('button', { name: 'Close tools' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await expect(tools(page).getByLabel('Currency (optional, 3-letter code)')).toHaveValue('INR');
  await expect(tools(page).getByLabel('People sharing the recipe')).toHaveValue('3');
});
