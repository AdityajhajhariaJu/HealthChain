import { test, expect } from '@playwright/test';
const setup = async (page: import('@playwright/test').Page) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true'); localStorage.setItem('hc_onboarded', 'true'); localStorage.setItem('hc_cookies_accepted', 'declined');
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (!String(input).includes('/api/gemini')) return original(input, init);
      const body = JSON.parse(String(init?.body || '{}'));
      const payload = body.gutPayload;
      const clarified = !!payload?.clarifications?.length;
      const output = body.gutFramePayload ? { proposedSymptom: 'discomfort', proposedMealPhrase: '', researchTopic: 'food', researchConcept: '', oneClarification: '' } : {
        headline: clarified ? 'The added timing changes the interpretation' : 'Location and timing can help explain the pattern',
        personalReading: clarified ? 'You added that this also happens before meals.' : 'You described stomach pain after lunch today.',
        personalSourceIds: clarified ? ['question:current', 'clarification:0'] : ['question:current'],
        researchReading: '', researchSourceIds: [], researchQuote: '',
        connectionReading: clarified ? 'Pain before meals too makes a lunch-only explanation less convincing. That timing is useful context for a clinician if it persists.' : 'Pain after lunch does not tell us which part of the situation matters. The location and whether it occurs at other times can help clarify your question.',
        uncertainties: ['The exact location is unknown.'], nextAction: 'leave_open', nextReason: 'One recalled detail can clarify whether this is only happening after lunch.',
        followUpQuestion: clarified ? '' : 'Does it happen before meals too?', followUpWhy: 'This helps separate meal timing from a broader pattern.',
        citationPassageIds: ['question:current#0', ...(clarified ? ['clarification:0#0'] : [])],
      };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });
  // This mocked AI/research-failure flow must not wait on analytics or font CDNs.
  await page.route(/https:\/\//, route => route.abort());
};
test('current concerns get an AI answer without logs; refinement survives reload when research fails', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1&view=deep', { waitUntil: 'domcontentloaded' }); const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('I have stomach pain after lunch today');
  await gut.getByRole('button', { name: 'Connect my question', exact: true }).click();
  await gut.getByRole('button', { name: 'Explore my answer' }).click();
  await expect(gut.getByRole('heading', { name: 'Location and timing can help explain the pattern' })).toBeVisible();
  await expect(gut.getByText('One recalled detail can clarify whether this is only happening after lunch.')).toBeVisible();
  await expect(gut.getByText(/Study search is unavailable/)).toBeVisible();
  await expect(gut.getByText(/Do not wait for an AI answer/)).toBeVisible();
  await gut.getByLabel('Does it happen before meals too?').fill('Yes, it happens before meals too.');
  await gut.getByRole('button', { name: 'Refine answer' }).click();
  await expect(gut.getByRole('heading', { name: 'The added timing changes the interpretation' })).toBeVisible();
  await page.goto('/app/today?gut=1&view=deep', { waitUntil: 'domcontentloaded' });
  await gut.getByRole('button', { name: /Continue/ }).click();
  await expect(gut.getByRole('heading', { name: 'The added timing changes the interpretation' })).toBeVisible();
  await gut.getByText('Sources & what could change this').click();
  await expect(gut.getByText('Your added details')).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-refined-answer-mobile.png' });
});

test('urgent Gut guidance appears while entering a question with all network requests unavailable', async ({page}) => {
  await setup(page);
  await page.route('**/api/**', route => route.abort());
  await page.goto('/app/today?gut=1&view=deep', {waitUntil:'domcontentloaded'});
  const gut = page.getByRole('dialog', {name:'Gut Health'});
  await gut.getByLabel('Your question or situation').fill('I have severe constant stomach pain right now.');
  const alert = gut.locator('[data-urgency="urgent_emergency_care"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Do not wait for an AI reply');
});
