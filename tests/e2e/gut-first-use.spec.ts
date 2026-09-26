import { test, expect, type Locator } from '@playwright/test';

const guest = () => {
  localStorage.setItem('hc_guest_mode', 'true');
  localStorage.setItem('hc_onboarded', 'true');
  localStorage.setItem('hc_cookies_accepted', 'declined');
};

const openGuidedQuestion = async (gut: Locator, question: string) => {
  await gut.getByLabel('Your question or situation').fill(question);
  await gut.getByRole('button', { name: 'See my connections' }).click();
  await gut.getByRole('button', { name: /Yes, show my brief|Show my brief/ }).click();
};

test('the first Gut screen starts with a question and symptom choices on a narrow phone', async ({ page }) => {
  await page.addInitScript(guest);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByLabel('Your question or situation')).toBeVisible();
  await expect(gut.getByRole('button', { name: 'Bloating' })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I feel unwell/ })).toHaveCount(0);
  await expect(gut.locator('.gr-step-track i.gr-step-ready')).toHaveCount(1);
  expect(await gut.getByRole('button', { name: 'See my connections' }).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight - 16)).toBe(true);
  await gut.screenshot({ path: 'test-results/gut-first-use-mobile.png' });
  await gut.getByLabel('Your question or situation').fill('Is tea linked to my bloating?');
  await gut.getByRole('button', { name: 'See my connections' }).click();
  await expect(gut.getByText('STEP 2 OF 3')).toBeVisible();
  await expect(gut.locator('.gr-step-track i.gr-step-ready')).toHaveCount(2);
  await expect(gut.getByText(/MEAL FROM YOUR WORDS/)).toBeVisible();
  await expect(gut.getByText(/SYMPTOM FROM YOUR WORDS/)).toBeVisible();
  expect(await gut.getByRole('button', { name: 'Yes, show my brief' }).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight - 16)).toBe(true);
  await gut.screenshot({ path: 'test-results/gut-connections-mobile.png' });
  await gut.getByRole('button', { name: /Yes, show my brief/ }).click();
  await expect(gut.getByText('STEP 3 OF 3 · YOUR GUT BRIEF')).toBeVisible();
  await expect(gut.getByText(/No matching meal and symptom report is saved yet/)).toBeVisible();
  expect(await gut.getByRole('button', { name: 'Explore research' }).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight - 16)).toBe(true);
  await gut.screenshot({ path: 'test-results/gut-brief-mobile.png' });
  await gut.getByRole('button', { name: 'Explore research' }).click();
  await expect(gut.getByRole('heading', { name: 'General information' })).toBeVisible();
  expect(await gut.locator('.gr-workspace').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('desktop entry keeps the question and next action in one view', async ({ page }) => {
  await page.addInitScript(guest);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByLabel('Your question or situation')).toBeVisible();
  expect(await gut.getByRole('button', { name: 'See my connections' }).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight - 30)).toBe(true);
  await gut.screenshot({ path: 'test-results/gut-entry-desktop.png' });
});

test('the connection review preserves a user-confirmed meal and symptom without making the unknown occasion negative', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: {
      id: 'profile_1', profileName: 'My Profile', nutrition: { recentLogs: [
        { id: 'chai-1', meal: 'Masala Chai', date: '2026-09-20', loggedAt: '2026-09-20T08:30:00Z', reaction: { label: 'Bloating', reactionType: 'bloat' } },
        { id: 'chai-2', meal: 'Chai with oat milk', date: '2026-09-21', loggedAt: '2026-09-21T08:30:00Z' },
      ] },
    } } }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('Is chai related to my bloating?');
  await gut.getByRole('button', { name: 'See my connections' }).click();
  await expect(gut.getByText(/2 matching saved meals/)).toBeVisible();
  await gut.getByRole('button', { name: /Yes, show my brief/ }).click();
  await expect(gut.getByText(/1 explicitly with, 0 explicitly without, 1 unknown or disputed/)).toBeVisible();
  await gut.getByRole('button', { name: /YOUR SAVED REPORTS · OPEN/ }).click();
  await expect(gut.getByRole('heading', { name: 'Evidence hearing' })).toBeVisible();
});

test('the current concern shortcut remains available and leads to a focused care summary', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByText('Choose another way to start').click();
  await gut.getByRole('button', { name: /I feel unwell/ }).click();
  await openGuidedQuestion(gut, 'I have stomach pain after lunch today');
  await expect(gut.getByRole('heading', { name: 'What you can do now' })).toBeVisible();
  await expect(gut.getByRole('button', { name: /Copy focused care summary/ })).toBeVisible();
  await expect(gut.getByText('No records on this date')).toBeVisible();
});

test('a plainly current concern reaches the care path without choosing a mode first', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await openGuidedQuestion(gut, 'I have stomach pain after lunch today');
  await expect(gut.getByRole('heading', { name: 'What you can do now' })).toBeVisible();
  await expect(gut.getByRole('button', { name: /Copy focused care summary/ })).toBeVisible();
});

test('consented Gemini framing and brief use only server-owned operations and keep missing evidence open', async ({ page }) => {
  await page.addInitScript(guest);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    (window as typeof window & { __gutOperations?: string[]; __gutInvalidBody?: boolean }).__gutOperations = [];
    window.fetch = async (input, init) => {
      if (!String(input).includes('/api/gemini')) return originalFetch(input, init);
      const operation = new Headers(init?.headers).get('X-HC-Operation') || '';
      (window as typeof window & { __gutOperations?: string[] }).__gutOperations?.push(operation);
      const body = JSON.parse(String(init?.body || '{}'));
      if (body.systemInstruction || body.generationConfig) (window as typeof window & { __gutInvalidBody?: boolean }).__gutInvalidBody = true;
      const output = operation === 'gut_frame'
        ? { proposedSymptom: 'bloating', proposedMealPhrase: 'chai', researchTopic: 'caffeine', researchConcept: 'tea', oneClarification: '' }
        : { headline: 'Invented headline', personalReading: 'Invented diagnosis', personalSourceIds: [], researchReading: 'Invented paper', researchQuote: '', researchSourceIds: [], connectionReading: 'Invented cause', uncertainties: [], nextAction: 'leave_open', nextReason: 'Invented directive' };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });
  await page.route(/https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/search/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ resultList: { result: [] } }) }));
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('Is chai linked to my bloating?');
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await gut.locator('.gr-ai-optin input').check();
  await gut.getByRole('button', { name: 'See my connections' }).click();
  await expect(gut.getByText('STEP 2 OF 3')).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { __gutOperations?: string[] }).__gutOperations)).toContain('gut_frame');
  await expect(gut.getByText('Research topic: tea')).toBeVisible();
  await gut.getByRole('button', { name: /Yes, show my brief/ }).click();
  await expect(gut.getByRole('heading', { name: 'This question remains open' })).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-ai-brief-mobile.png' });
  expect(await gut.getByRole('button', { name: 'Leave this question open' }).evaluate((element) => element.getBoundingClientRect().bottom <= window.innerHeight - 16)).toBe(true);
  await gut.locator('summary').filter({ hasText: 'Why this answer? Open the records and research' }).click();
  await expect(gut.getByText(/No paper was retrieved for this question/)).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { __gutOperations?: string[] }).__gutOperations)).toContain('gut_reasoning');
  expect(await page.evaluate(() => (window as typeof window & { __gutInvalidBody?: boolean }).__gutInvalidBody || false)).toBe(false);
});
