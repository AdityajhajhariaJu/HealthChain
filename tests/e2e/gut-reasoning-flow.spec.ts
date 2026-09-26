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
  await page.route(/https:\/\/www\.ebi\.ac\.uk/, route => route.abort());
};
test('current concerns get an AI answer without logs; refinement survives reload when research fails', async ({ page }) => {
  await setup(page); await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1'); const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('I have stomach pain after lunch today');
  await gut.getByRole('button', { name: 'Answer with Gemini', exact: true }).click();
  await gut.getByRole('button', { name: /Yes, show my brief|Show my brief/ }).click();
  await expect(gut.getByRole('heading', { name: 'Location and timing can help explain the pattern' })).toBeVisible();
  await expect(gut.getByText(/Study search is unavailable/)).toBeVisible();
  await expect(gut.getByText(/Do not wait for an AI answer/)).toBeVisible();
  await gut.getByLabel('Does it happen before meals too?').fill('Yes, it happens before meals too.');
  await gut.getByRole('button', { name: 'Refine answer' }).click();
  await expect(gut.getByRole('heading', { name: 'The added timing changes the interpretation' })).toBeVisible();
  await page.goto('/app/today?gut=1');
  await gut.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(gut.getByRole('heading', { name: 'The added timing changes the interpretation' })).toBeVisible();
  await gut.getByText('Why this answer? Open the records and research').click();
  await expect(gut.getByText('Your added details')).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-refined-answer-mobile.png' });
});
