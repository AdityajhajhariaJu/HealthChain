import { AI_CONSENT_VERSION } from '../../shared/privacy-consent.js';
import { test, expect } from '@playwright/test';
const setup = async (page: import('@playwright/test').Page) => {
  await page.addInitScript((consentVersion: string) => {
    localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    // This journey starts with an existing affirmative, current-version AI choice.
    localStorage.setItem('hc_ai_consent_guest', JSON.stringify({ accepted: true, version: consentVersion, acceptedAt: '2026-10-05T00:00:00Z' }));
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (!String(input).includes('/api/gemini')) return original(input, init);
      const body = JSON.parse(String(init?.body || '{}'));
      const payload = body.gutPayload;
      const clarified = !!payload?.clarifications?.length;
      const output = body.gutFramePayload
        ? {
            proposedSymptom: 'discomfort',
            proposedMealPhrase: '',
            researchTopic: 'food',
            researchConcept: '',
            oneClarification: '',
          }
        : {
            headline: clarified
              ? 'The added timing changes the interpretation'
              : 'Location and timing can help explain the pattern',
            personalReading: clarified
              ? 'You added that this also happens before meals.'
              : 'You described stomach pain after lunch today.',
            personalSourceIds: clarified
              ? ['question:current', 'clarification:0']
              : ['question:current'],
            researchReading: '',
            researchSourceIds: [],
            researchQuote: '',
            connectionReading: clarified
              ? 'Pain before meals too makes a lunch-only explanation less convincing. That timing is useful context for a clinician if it persists.'
              : 'Pain after lunch does not tell us which part of the situation matters. The location and whether it occurs at other times can help clarify your question.',
            uncertainties: ['The exact location is unknown.'],
            nextAction: 'leave_open',
            nextReason:
              'One recalled detail can clarify whether this is only happening after lunch.',
            followUpQuestion: clarified ? '' : 'Does it happen before meals too?',
            followUpWhy: 'This helps separate meal timing from a broader pattern.',
            citationPassageIds: ['question:current#0', ...(clarified ? ['clarification:0#0'] : [])],
          };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };
  }, AI_CONSENT_VERSION);
  // This mocked AI/research-failure flow must not wait on analytics or font CDNs.
  await page.route(/https:\/\//, (route) => route.abort());
};
test('current concerns get an AI answer without logs; refinement survives reload when research fails', async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1&view=deep', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('I have stomach pain after lunch today');
  await gut.getByRole('button', { name: 'Connect my question', exact: true }).click();
  await gut.getByRole('button', { name: 'Explore my answer' }).click();
  await expect(
    gut.getByRole('heading', { name: 'Location and timing can help explain the pattern' })
  ).toBeVisible();
  await expect(
    gut.getByText('One recalled detail can clarify whether this is only happening after lunch.')
  ).toBeVisible();
  await expect(gut.getByText(/Study search is unavailable/)).toBeVisible();
  await expect(gut.getByText(/Do not wait for an AI answer/)).toBeVisible();
  await gut
    .getByLabel('Does it happen before meals too?')
    .fill('Yes, it happens before meals too.');
  await gut.getByRole('button', { name: 'Refine answer' }).click();
  await expect(
    gut.getByRole('heading', { name: 'The added timing changes the interpretation' })
  ).toBeVisible();
  await page.goto('/app/today?gut=1&view=deep', { waitUntil: 'domcontentloaded' });
  await gut.getByRole('button', { name: /Continue/ }).click();
  await expect(
    gut.getByRole('heading', { name: 'The added timing changes the interpretation' })
  ).toBeVisible();
  await gut.getByText('Sources & what could change this').click();
  await expect(gut.getByText('Your added details')).toBeVisible();
  await gut.screenshot({ path: 'test-results/gut-refined-answer-mobile.png' });
});

test('urgent Gut guidance appears while entering a question with all network requests unavailable', async ({
  page,
}) => {
  await setup(page);
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/app/today?gut=1&view=deep', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut
    .getByLabel('Your question or situation')
    .fill('I have severe constant stomach pain right now.');
  const alert = gut.locator('[data-urgency="urgent_emergency_care"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Do not wait for an AI reply');
});

test('the single answer includes personal reading, research limits, gaps and next action after offline reload', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await setup(page);
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (!String(input).includes('/api/gemini')) return original(input, init);
      const body = JSON.parse(String(init?.body || '{}'));
      const payload = body.gutPayload;
      const paper = payload?.citationPassages?.find(
        (passage: any) => passage.sourceId === 'paper:13579'
      );
      const output = body.gutFramePayload
        ? {
            proposedSymptom: 'bloating',
            proposedMealPhrase: 'milk',
            researchTopic: 'dairy',
            researchConcept: 'milk',
            oneClarification: '',
          }
        : {
            headline: 'One report does not establish a milk trigger',
            connectionReading:
              'Your question remains open. A personal cause is not established by a group study.',
            personalReading:
              'You asked whether milk could explain bloating. There are no linked meal outcomes to compare.',
            personalSourceIds: ['question:current'],
            researchReading:
              'The supplied study describes children. Its comparator and measured outcome are not established for your situation.',
            researchSourceIds: ['paper:13579'],
            uncertainties: [
              'Your meal outcome is unknown.',
              'The study comparator is not verified.',
              'Your exact symptom timing is unknown.',
            ],
            nextAction: 'review_records',
            nextReason: 'Inspect the saved information before treating milk as a personal trigger.',
            followUpQuestion: '',
            followUpWhy: '',
            citationPassageIds: ['question:current#0', ...(paper ? [paper.id] : [])],
          };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(output) }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };
  });
  await page.route(/https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/search/, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        resultList: {
          result: [
            {
              pmid: '13579',
              title: 'Milk and bloating in children',
              abstractText:
                'A study of milk and bloating in children. Comparator and measured outcomes need checking.',
              pubYear: '2024',
              electronicPublicationDate: '2024-05-19',
              pubTypeList: { pubType: ['Journal Article'] },
            },
          ],
        },
      }),
    })
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1&view=deep');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByLabel('Your question or situation').fill('Could milk explain my bloating?');
  await gut.getByRole('button', { name: 'Connect my question', exact: true }).click();
  await gut.getByRole('button', { name: 'Explore my answer' }).click();
  const answer = gut.locator('.gr-reasoning');
  await expect(
    answer.getByRole('heading', { name: 'One report does not establish a milk trigger' })
  ).toBeVisible();
  await expect(
    answer.getByText(
      'You asked whether milk could explain bloating. There are no linked meal outcomes to compare.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    answer.getByText(
      'The supplied study describes children. Its comparator and measured outcome are not established for your situation.',
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    answer.getByText('Your exact symptom timing is unknown.', { exact: true })
  ).toBeVisible();
  await expect(answer.getByRole('button', { name: 'Review my records' })).toBeVisible();
  await expect(answer.getByText(/Title population cue: children or adolescents/)).toBeVisible();
  expect(await answer.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true
  );
  await page.route(/https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/search/, (route) =>
    route.abort()
  );
  await page.reload();
  await page
    .getByRole('button', {
      name: 'Gut Health - Ask a question and explore your records and research',
      exact: true,
    })
    .click();
  await expect(gut).toBeVisible();
  const resume = gut.getByRole('button', { name: /Continue/ }).first();
  if (await resume.isVisible()) await resume.click();
  await expect(answer.getByText(/Title population cue: children or adolescents/)).toBeVisible();
  await expect(answer.getByText(/2024-05-19/)).toBeVisible();
  await expect(
    answer.locator('article').getByText('Milk and bloating in children', { exact: true })
  ).toBeVisible();
  await gut.screenshot({ path: testInfo.outputPath('gut-complete-answer-mobile.png') });
  await answer
    .getByRole('heading', { name: 'Research and how it applies' })
    .scrollIntoViewIfNeeded();
  await gut.screenshot({ path: testInfo.outputPath('gut-research-context-mobile.png') });
  await answer.locator('.hc-outcome-next').scrollIntoViewIfNeeded();
  await gut.screenshot({ path: testInfo.outputPath('gut-next-step-mobile.png') });
});
