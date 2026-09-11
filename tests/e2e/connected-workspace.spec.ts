import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, route => route.abort());
});

test('a draft remains visible and connects My Cases, Ava, Today, and the engine', async ({ page }) => {
  await page.goto('/app/my-cases?new=true', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Case title', { exact: true }).fill('My energy timeline');
  await page.getByLabel('What would you like help with?', { exact: true }).fill('My energy changes after lunch. I want to prepare for my appointment.');
  await page.getByRole('button', { name: 'Save case draft', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/cases\//);
  const caseId = new URL(page.url()).pathname.split('/').pop();
  await page.goto('/app/my-cases', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My energy timeline' })).toBeVisible();
  await page.getByRole('link', { name: 'Discuss My energy timeline with Ava' }).click();
  await expect(page).toHaveURL(/\/app\/ava\?caseId=/);
  await expect(page.getByLabel('Conversation context')).toHaveValue(caseId!);
  const input = page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' });
  await input.fill('A change I noticed today');
  await page.getByRole('button', { name: 'Save draft as a case update' }).click();
  await expect(input).toHaveValue('');
  await page.goto('/app/today', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Pick up where you left off' })).toBeVisible();
  await page.getByRole('link', { name: /Review your records/ }).click();
  await expect(page.getByLabel('Where should this review be saved?')).toHaveValue(caseId!);
  await expect(page.getByRole('textbox', { name: 'Clinical timeline and symptom notes' })).toHaveValue(/My energy changes/);
  await page.screenshot({ path: 'test-results/connected-engine-desktop.png', fullPage: true });
});

test('mobile Today and Ava keep their main actions inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /A clearer picture starts here|Pick up where you left off/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/connected-today-mobile.png', fullPage: true });
  await page.getByRole('link', { name: /Check in with Ava/ }).click();
  await expect(page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'test-results/connected-ava-mobile.png', fullPage: true });
});

test('the engine rejects unsupported documents and preserves written notes', async ({ page }) => {
  await page.goto('/app/consult', { waitUntil: 'domcontentloaded' });
  const notes = page.getByRole('textbox', { name: 'Clinical timeline and symptom notes' });
  await notes.fill('My own timeline, with no invented measurements.');
  await page.getByLabel('Upload medical records, lab reports, or health documents').setInputFiles({ name: 'not-a-report.txt', mimeType: 'text/plain', buffer: Buffer.from('text') });
  await expect(page.getByText('Unsupported document', { exact: true })).toBeVisible();
  await expect(notes).toHaveValue('My own timeline, with no invented measurements.');
});

test('Ava retries a failed reply without duplicating the question or spending trial usage on failure', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    (window as any).__avaRequests = [];
    (window as any).__avaShouldFail = true;
    window.fetch = async (input, init) => {
      if (String(input).includes('/api/gemini')) {
        (window as any).__avaRequests.push(JSON.parse(String(init?.body || '{}')));
        if ((window as any).__avaShouldFail) return new Response('{"error":"Temporary failure"}', { status: 500, headers: { 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Let us prepare your appointment questions together.' }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    };
  });
  await page.goto('/app/ava', { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' }).fill('Help me prepare for my visit');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry message' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('hc_trial_ava_count'))).toBeNull();
  await page.evaluate(() => { (window as any).__avaShouldFail = false; });
  await page.getByRole('button', { name: 'Retry message' }).click();
  await expect(page.getByText('Let us prepare your appointment questions together.', { exact: true })).toBeVisible();
  const requests = await page.evaluate(() => (window as any).__avaRequests);
  expect(requests[requests.length - 1].contents.filter((entry: any) => entry.role === 'user')).toHaveLength(1);
  expect(await page.evaluate(() => localStorage.getItem('hc_trial_ava_count'))).toBe('1');
});
