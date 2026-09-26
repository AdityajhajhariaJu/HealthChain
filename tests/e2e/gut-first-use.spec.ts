import { test, expect } from '@playwright/test';
const guest = () => { localStorage.setItem('hc_guest_mode','true'); localStorage.setItem('hc_onboarded','true'); localStorage.setItem('hc_cookies_accepted','declined'); };

test('guided start fits a narrow phone and map branches open real destinations', async ({ page }) => {
  await page.addInitScript(guest); await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/app/today?gut=1'); const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByRole('button', { name: /Find a connection/ })).toHaveAttribute('aria-pressed','true');
  await expect(gut.getByRole('button', { name: 'Bloating', exact: true })).toBeVisible();
  await gut.getByLabel('Your question or situation').fill('Is chai linked to my bloating?');
  expect(await gut.getByRole('button',{name:'Connect my question'}).evaluate(el => el.getBoundingClientRect().bottom <= window.innerHeight)).toBe(true);
  if (test.info().project.name === 'chromium') await gut.screenshot({path:'test-results/gut-redesign-start-320.png'});
  await gut.getByRole('button',{name:'Explore without AI'}).click();
  await expect(gut.getByLabel('Food or situation')).toHaveValue('chai');
  await expect(gut.getByLabel('Symptom',{exact:true})).toHaveValue('bloating');
  await gut.getByRole('button',{name:'Open my connection map'}).click();
  await expect(gut.getByRole('region',{name:'Interactive connection map'})).toBeVisible();
  await gut.getByRole('button',{name:/SOURCE CONTEXT General research/}).click();
  await expect(gut.getByRole('region',{name:'General research details'})).toBeVisible();
  await gut.getByRole('button',{name:'Explore the research',exact:true}).click();
  await expect(gut.getByRole('heading',{name:'Research behind your question'})).toBeVisible();
  expect(await gut.locator('.gr-workspace').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test('review edits can remove inferred details and survive reopening', async ({ page }) => {
  await page.addInitScript(guest); await page.goto('/app/today?gut=1'); const gut=page.getByRole('dialog',{name:'Gut Health'});
  await gut.getByLabel('Your question or situation').fill('Is chai linked to my bloating?');
  await gut.getByRole('button',{name:'Explore without AI'}).click();
  await gut.getByLabel('Food or situation').fill('');
  await gut.getByLabel('Symptom',{exact:true}).selectOption('unspecified');
  await gut.getByRole('button',{name:'Open my connection map'}).click();
  await gut.getByRole('navigation',{name:'Question sections'}).getByRole('button',{name:'Explore more'}).click();
  await gut.getByRole('button',{name:'Question settings'}).click();
  await expect(gut.getByLabel('Meal or phrase',{exact:true})).toHaveValue('');
  await expect(gut.getByLabel('Compare outcome')).toHaveValue('unspecified');
  await page.goto('/app/today?gut=1'); await gut.getByRole('button',{name:/Continue/}).click();
  await expect(gut.getByRole('heading',{name:'Is chai linked to my bloating?',exact:true})).toBeVisible();
});

test('current concerns have focused care tools and a next step', async ({ page }) => {
  await page.addInitScript(guest); await page.goto('/app/today?gut=1'); const gut=page.getByRole('dialog',{name:'Gut Health'});
  await gut.getByRole('button',{name:/Understand a symptom/}).click();
  await gut.getByLabel('Your question or situation').fill('I have stomach pain after lunch today');
  await gut.getByRole('button',{name:'Explore without AI'}).click();
  await gut.getByRole('button',{name:'Open my connection map'}).click();
  await gut.getByRole('navigation',{name:'Question sections'}).getByRole('button',{name:'My answer',exact:true}).click();
  await expect(gut.getByText(/Do not wait for an AI answer/)).toBeVisible();
  await gut.getByRole('button',{name:'Prepare a care summary'}).click();
  await expect(gut.getByRole('heading',{name:'What you can do now'})).toBeVisible();
  await gut.getByRole('navigation',{name:'Question sections'}).getByRole('button',{name:'Next step'}).click();
  await expect(gut.getByRole('heading',{name:'One useful next step'})).toBeVisible();
});

test('desktop map preserves unknown records and reveals one research tool at a time', async ({ page }) => {
  await page.addInitScript(guest); await page.setViewportSize({width:1440,height:1000}); await page.goto('/app/today?gut=1'); const gut=page.getByRole('dialog',{name:'Gut Health'});
  if (test.info().project.name === 'chromium') await gut.screenshot({path:'test-results/gut-redesign-start-desktop.png'});
  await gut.getByLabel('Your question or situation').fill('Is chai linked to my bloating?'); await gut.getByRole('button',{name:'Explore without AI'}).click();
  if (test.info().project.name === 'chromium') await gut.screenshot({path:'test-results/gut-redesign-review-desktop.png'});
  await gut.getByRole('button',{name:'Open my connection map'}).click();
  await expect(gut.getByText('0 with symptoms · 0 without · 0 unknown or disputed. Only explicit reports count.')).toBeVisible();
  if (test.info().project.name === 'chromium') await gut.screenshot({path:'test-results/gut-redesign-map-desktop.png'});
  await gut.getByRole('navigation',{name:'Question sections'}).getByRole('button',{name:'Explore more'}).click();
  await gut.getByRole('button',{name:'Timeline',exact:true}).click();
  await expect(gut.getByText('When did this symptom start?')).toBeVisible();
  await expect(gut.getByLabel('Meal or phrase',{exact:true})).toBeHidden();
  await gut.getByRole('button',{name:'Question settings'}).click();
  await expect(gut.getByLabel('Meal or phrase',{exact:true})).toBeVisible();
  await expect(gut.getByText('When did this symptom start?')).toHaveCount(0);
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
        : { headline: 'The timing needs a closer look', personalReading: 'You asked about chai and bloating.', personalSourceIds: ['question:current'], researchReading: '', researchQuote: '', researchSourceIds: [], connectionReading: 'Your question alone cannot separate chai from other explanations. One timing detail can help us make sense of this.', uncertainties: [], nextAction: 'leave_open', nextReason: 'Consider whether this also happens at other times.', followUpQuestion: 'Does this happen without chai?', followUpWhy: 'This helps distinguish a broader pattern.', citationPassageIds: ['question:current#0'] };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });
  await page.route(/https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/search/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ resultList: { result: [] } }) }));
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('Is chai linked to my bloating?');
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await gut.getByRole('button', { name: 'Connect my question' }).click();
  await expect(gut.getByRole('listitem').filter({ hasText: 'Connect the details' })).toHaveAttribute('aria-current','step');
  expect(await page.evaluate(() => (window as typeof window & { __gutOperations?: string[] }).__gutOperations)).toContain('gut_frame');
  await expect(gut.getByText('Research topic: tea')).toBeVisible();
  await gut.getByRole('button', { name: 'Explore my answer' }).click();
  await expect(gut.getByRole('heading', { name: 'The timing needs a closer look' })).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-ai-brief-mobile.png' });
  await expect(gut.getByLabel('Does this happen without chai?')).toBeVisible();
  await gut.locator('summary').filter({ hasText: 'Sources & what could change this' }).click();
  await gut.getByRole('button', { name: /See how this connects/ }).click();
  await gut.getByRole('button', { name: /SOURCE CONTEXT General research/ }).click();
  await expect(gut.getByRole('region', { name: 'General research details' }).getByText(/No relevant research passage/)).toBeVisible();
  expect(await page.evaluate(() => (window as typeof window & { __gutOperations?: string[] }).__gutOperations)).toContain('gut_reasoning');
  expect(await page.evaluate(() => (window as typeof window & { __gutInvalidBody?: boolean }).__gutInvalidBody || false)).toBe(false);
});


test('decision exploration saves options without creating a meal report', async ({ page }) => {
  await page.addInitScript(guest); await page.goto('/app/today?gut=1'); const gut=page.getByRole('dialog',{name:'Gut Health'});
  await gut.getByRole('button',{name:/Compare my options/}).click();
  await gut.getByLabel('Your question or situation').fill('Should I choose tea or coffee tomorrow?');
  await gut.getByRole('button',{name:'Explore without AI'}).click();
  await gut.getByRole('button',{name:'Open my connection map'}).click();
  await gut.getByRole('navigation',{name:'Question sections'}).getByRole('button',{name:'Explore more'}).click();
  await expect(gut.getByRole('heading',{name:'Compare your options'})).toBeVisible();
  await gut.getByText('Add a priority or a symptom to compare').click();
  await gut.getByLabel('What matters most in this situation?').fill('Understand the uncertainty without making a broad food rule');
  await gut.getByRole('button',{name:'Save options for later'}).click();
  await expect(gut.getByText('Your options are saved. You can decide later.')).toBeVisible();
  await gut.getByRole('navigation',{name:'Question sections'}).getByRole('button',{name:'Connection map'}).click();
  await expect(gut.getByText('0 with symptoms · 0 without · 0 unknown or disputed. Only explicit reports count.')).toBeVisible();
});
