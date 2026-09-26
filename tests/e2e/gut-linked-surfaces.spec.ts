import { test, expect } from '@playwright/test';

const seedGuest = () => {
  localStorage.clear();
  localStorage.setItem('hc_guest_mode', 'true');
  localStorage.setItem('hc_onboarded', 'true');
  localStorage.setItem('hc_cookies_accepted', 'declined');
  localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: {
    id: 'profile_1', profileName: 'My Profile', nutrition: { recentLogs: [
      { id: 'chai-1', meal: 'Masala Chai', date: '2026-09-20', loggedAt: '2026-09-20T08:30:00Z', reaction: { label: 'Bloating', reactionType: 'bloat' } },
    ] },
  } } }));
};

test('records and visit notes show linked summaries and open the exact source', async ({ page }) => {
  await page.addInitScript(seedGuest);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'My records' }).click();
  await expect(gut.getByRole('heading', { name: 'Your meals and digestion, together' })).toBeVisible();
  await expect(gut.getByLabel('From saved meals and digestion to a question')).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-records-linked-mobile.png' });
  await gut.getByLabel('From saved meals and digestion to a question').getByRole('button').first().click();
  const meal = page.getByRole('dialog', { name: 'Record a meal' });
  await expect(meal.getByLabel('What did you eat or drink?')).toBeVisible();
  await expect(meal.getByText('CIRCADIAN MEAL INTAKE')).toHaveCount(0);
  await meal.screenshot({ path: 'test-results/gut-meal-simple-mobile.png' });
  await meal.getByLabel('What did you eat or drink?').fill('Toast');
  await meal.getByRole('button', { name: 'Save meal' }).click();
  await expect(meal).toHaveCount(0);
  await gut.getByRole('button', { name: 'Visit notes' }).click();
  await expect(gut.getByLabel('From your question and records to a visit note')).toBeVisible();
  await expect(gut.getByRole('button', { name: 'Copy recorded history' }).first()).toBeVisible();
  await expect(gut.getByText('Recent meals')).toBeHidden();
  await gut.screenshot({ path: 'test-results/gut-visit-linked-mobile.png' });
  await gut.getByText('Inspect the records in this note').click();
  await gut.getByRole('button', { name: /2026-09-20 · Masala Chai/ }).click();
  await expect(gut.getByLabel('Exact source record')).toBeVisible();
  await expect(gut.getByRole('button', { name: 'My records' })).toHaveAttribute('aria-current', 'page');
  await expect(gut.getByText('Explore your dates')).toHaveCount(0);
});

test('question sections keep the source chain compact on a phone', async ({ page }) => {
  await page.addInitScript(seedGuest);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('Is chai related to my bloating?');
  await gut.getByRole('button', { name: 'See my connections' }).click();
  await gut.getByRole('button', { name: /Yes, show my brief/ }).click();
  await gut.getByRole('button', { name: /YOUR SAVED REPORTS · OPEN/ }).click();
  await expect(gut.getByLabel('How saved records relate to this question')).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-evidence-linked-mobile.png' });
  await gut.getByRole('button', { name: 'Research', exact: true }).click();
  await expect(gut.getByLabel('How general research relates to your Gut brief')).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-research-linked-mobile.png' });
  await gut.getByRole('button', { name: 'Next step' }).click();
  await expect(gut.getByLabel('Your question, chosen step and later outcome')).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-next-linked-mobile.png' });
  expect(await gut.locator('.gr-workspace').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});
