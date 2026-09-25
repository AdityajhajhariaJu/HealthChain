import { test, expect } from '@playwright/test';

test('a guest chooses a case before a Gut question enters appointment prep', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, route => route.abort());
  await page.goto('/app/my-cases?new=true', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Case title', { exact: true }).fill('Digestive visit');
  await page.getByLabel('What would you like help with?', { exact: true }).fill('I want to discuss recurring bloating.');
  await page.getByRole('button', { name: 'Save case draft', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/cases\//);
  const caseId = new URL(page.url()).pathname.split('/').pop();
  expect(caseId).toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByText('GUT RESOLUTION STUDIO')).toBeVisible();
  await gut.getByRole('button', { name: /I have a care question/ }).click();
  await gut.getByLabel('Your question or situation').fill('What should I ask about recurring bloating?');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  await expect(gut.getByText('Bring this question to a visit')).toBeVisible();
  const handoff = gut.getByRole('region', { name: 'Prepare this question for a visit' });
  expect(await handoff.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await expect(gut.getByRole('button', { name: 'Add question and open brief' })).toBeDisabled();
  await gut.getByLabel('Case', { exact: true }).selectOption(caseId!);
  await gut.getByRole('button', { name: 'Add question and open brief' }).click();

  await expect(page).toHaveURL(new RegExp(`/app/case-prep\\?caseId=${caseId}`));
  await expect(page.getByText('What should I ask about recurring bloating?').first()).toBeVisible();
  await expect(page.getByText('From your Gut Health question · patient report, not a clinician finding')).toBeVisible();
});
