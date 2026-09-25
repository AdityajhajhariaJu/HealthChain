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

async function advanceToClinicalStep(page: any, step: 4 | 5 | 6) {
  await page.getByRole('button', { name: 'Next: Timeline (Step 2)' }).click();
  await page.getByRole('button', { name: 'Next: Pattern (Step 3)' }).click();
  await page.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }).click();
  if (step >= 5) await page.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }).click();
  if (step >= 6) await page.getByRole('button', { name: 'Next: Scope & Run (Step 6)' }).click();
}

test('a draft remains visible and connects My Cases, Ava, and the engine', async ({ page }) => {
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
  await page.goto(`/app/consult?caseId=${caseId}&review=new`, { waitUntil: 'domcontentloaded' });
  await advanceToClinicalStep(page, 6);
  await expect(page.getByLabel('Where should this review be saved?')).toHaveValue(caseId!);
  await expect(page.getByText(/Clinical Timeline.*12 words/)).toBeVisible();
  await expect(page.getByText('Uses this case’s saved context.')).toBeVisible();
  await page.screenshot({ path: 'test-results/connected-engine-desktop.png', fullPage: true });
});

test('mobile Today and Ava keep their main actions inside the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (String(input).includes('/api/gemini')) {
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Let us review that together.' }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return originalFetch(input, init);
    };
  });
  await page.goto('/app/today', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText(/days streak/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open Zen Garden' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Calm Space' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Soundscapes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Articles', exact: true })).toBeVisible();
  const quickWater = page.getByRole('button', { name: 'Quick log 250ml water' });
  await quickWater.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Daily Hydration - Open intake tracker' })).toContainText(/250\s*\/\s*2,000 ml/);
  await expect(page.getByRole('dialog', { name: /Hydration/i })).toHaveCount(0);
  await page.getByRole('button', { name: 'View all 10 articles' }).click();
  await expect(page.getByRole('button', { name: 'Show recommended' })).toBeVisible();
  await page.screenshot({ path: 'test-results/connected-today-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Open Zen Garden' }).click();
  const garden = page.getByRole('dialog', { name: 'Zen Garden' });
  await expect(garden.getByRole('heading', { name: 'Zen Garden' })).toBeVisible();
  await expect(garden.getByText(/SANCTUARY METRICS/)).toBeVisible();
  await expect(garden.getByRole('button', { name: /Water Garden/i })).toBeVisible();
  await garden.getByRole('button', { name: 'Close modal' }).click();
  await page.getByRole('link', { name: 'Ava', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Log your day/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Guided Calm/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Connection Detective/i })).toHaveCount(0);
  const avaInput = page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' });
  await page.getByRole('button', { name: /Log your day/i }).click();
  await expect(avaInput).toHaveValue(/Help me log my day/);
  await avaInput.fill('');
  await page.getByRole('button', { name: /Discomfort Check/i }).click();
  await expect(page.getByText('Let us review that together.', { exact: true })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'test-results/connected-ava-mobile.png', fullPage: true });
});

test('Connection Detective keeps empty domains clear without duplicating engine or dossier workspaces', async ({ page }) => {
  await page.goto('/app/ava?tool=connection-detective', { waitUntil: 'domcontentloaded' });
  const detective = page.getByRole('dialog', { name: 'Clinical Connections' });
  await expect(detective.getByRole('heading', { name: 'Gut Health & Connections' })).toBeVisible();
  const gutDomain = detective.getByRole('button', { name: 'Open Gut & Food' });
  await expect(gutDomain).toContainText('No food history in this case');
  await gutDomain.click();
  await expect(detective.getByRole('button', { name: 'Open Meal Records & Digestion Calendar' })).toBeVisible();
  await expect(detective.getByRole('button', { name: 'Open Food Records & Patterns' })).toBeVisible();
  await expect(detective.getByText('Evidence Connection Graph')).toHaveCount(0);
});

test('the engine rejects unsupported documents and preserves written notes', async ({ page }) => {
  await page.goto('/app/consult', { waitUntil: 'domcontentloaded' });
  await advanceToClinicalStep(page, 4);
  const notes = page.getByRole('textbox', { name: 'Clinical timeline and symptom notes' });
  await notes.fill('My own timeline, with no invented measurements.');
  await page.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }).click();
  await page.getByLabel('Upload medical records, lab reports, or health documents').setInputFiles({ name: 'not-a-report.txt', mimeType: 'text/plain', buffer: Buffer.from('text') });
  await expect(page.getByText('Unsupported document', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '← Back to Story' }).click();
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
