import { expect, test } from '@playwright/test';

const guest = () => {
  localStorage.setItem('hc_guest_mode', 'true');
  localStorage.setItem('hc_onboarded', 'true');
  localStorage.setItem('hc_cookies_accepted', 'declined');
};

test('new user sees honest empty states and research is always one tap away', async ({ page }) => {
  await page.addInitScript(guest);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByRole('heading', { name: 'What happened?' })).toBeVisible();
  if (test.info().project.name === 'chromium') await gut.screenshot({ path: 'test-results/gut-daily-empty-mobile.png' });
  await expect(gut.getByRole('button', { name: 'My research', exact: true }).first()).toBeVisible();
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await expect(gut.getByText('No investigations yet.')).toBeVisible();
  await gut.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(gut.getByText('Your week starts with an entry.')).toBeVisible();
  expect(await gut.locator('.gdh').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await gut.locator('.gr-modal-header').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await gut.locator('.gdh').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('a real log appears in understanding and on its weekly date', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Bloating' }).click();
  await gut.getByRole('button', { name: 'Save & see my understanding' }).click();
  await expect(gut.getByRole('heading', { name: 'Your understanding' })).toBeVisible();
  if (test.info().project.name === 'chromium') await gut.screenshot({ path: 'test-results/gut-daily-understanding-mobile.png' });
  await expect(gut.getByText('1 symptom report saved. Too early to name a cause.')).toBeVisible();
  await gut.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(gut.locator('.gdh-calendar .log')).toHaveCount(1);
  await expect(gut.locator('.gdh-day-list').getByText('Bloating', { exact: true })).toBeVisible();
});

test('a saved question becomes a resumable investigation', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Your understanding' }).click();
  await gut.getByRole('button', { name: 'Or ask a question' }).click();
  await gut.getByLabel('Your gut question').fill('Does bloating follow my dinners?');
  await gut.getByRole('button', { name: 'Start investigation' }).click();
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await expect(gut.locator('.gdh-thread-list').getByText('Does bloating follow my dinners?')).toBeVisible();
  await gut.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(gut.getByRole('navigation', { name: 'Question sections' })).toBeVisible();
});

test('a requested Gemini reading is saved and shown without invented personal records', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (!String(input).includes('/api/gemini')) return originalFetch(input, init);
      const answer = {
        headline: 'The question is open', personalReading: 'Your question is saved, but there is no logged outcome to compare.',
        researchReading: '', connectionReading: 'There are no linked meal and symptom reports for this question.',
        uncertainties: ['The outcome is unknown.'], nextAction: 'add_report', nextReason: 'Add a report only when something worth remembering happens.',
        citationPassageIds: ['question:current#0'],
      };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Your understanding' }).click();
  await gut.getByRole('button', { name: 'Or ask a question' }).click();
  await gut.getByLabel('Your gut question').fill('Could my dinner explain how I felt?');
  await gut.getByRole('button', { name: 'Start investigation' }).click();
  await gut.getByRole('button', { name: 'Get a Gemini reading' }).click();
  await expect(gut.locator('.gdh').getByText('The question is open')).toBeVisible();
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await expect(gut.locator('.gdh-thread-list').getByText('The question is open')).toBeVisible();
  await gut.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(gut.getByText('What changed this week')).toBeVisible();
  await expect(gut.locator('.gdh-calendar .research')).toHaveCount(1);
});
