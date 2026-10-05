import { expect, test } from '@playwright/test';

test('built guest workspace saves a case and retains an Ava reply across reload', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route('**/api/gemini', (route) =>
    route.fulfill({
      json: {
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              parts: [
                {
                  text: 'Synthetic audit reply. Keep your original records visible for your appointment.',
                },
              ],
            },
          },
        ],
      },
    })
  );
  await page.goto('/app/my-cases?new=true');
  await page.getByLabel('Case title', { exact: true }).fill('Synthetic build verification');
  await page
    .getByLabel('What would you like help with?', { exact: true })
    .fill('Prepare questions from my saved records.');
  await page.getByRole('button', { name: 'Save case draft', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Synthetic build verification' })).toBeVisible();
  await page.getByRole('link', { name: 'Ava Health Buddy', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' });
  await expect(input).toBeVisible();
  await input.fill('A synthetic build check question.');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await page.getByRole('button', { name: 'Allow AI processing', exact: true }).click();
  await expect(page.getByText('Synthetic audit reply.', { exact: false }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText('Synthetic audit reply.', { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
