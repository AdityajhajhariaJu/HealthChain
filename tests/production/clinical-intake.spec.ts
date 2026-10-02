import { expect, test } from '@playwright/test';

test('built mobile Clinical intake preserves the six-screen draft and original attachment', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route('**/api/**', (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/consult?review=new&step=6');
  await expect(page.getByRole('heading', { name: 'Which symptoms bother you?' })).toBeVisible();
  await page.getByRole('button', { name: 'Fatigue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with 1 symptom' }).click();
  await page.getByRole('button', { name: '1–2 weeks', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Pattern (Step 3)' }).click();
  await page.getByRole('button', { name: 'Fluctuating / Comes & Goes ∿', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }).click();
  const notes = page.getByRole('textbox', { name: 'Clinical timeline and symptom notes' });
  const story =
    (await notes.inputValue()) +
    '\nSynthetic build example: doses and collection times remain unknown.';
  await notes.fill(story);
  await page.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }).click();
  await page.getByLabel('Upload medical records, lab reports, or health documents').setInputFiles({
    name: 'synthetic-original.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5AAAAABJRU5ErkJggg==',
      'base64'
    ),
  });
  await expect(page.getByText('synthetic-original.png', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next: Scope & Run (Step 6)' }).click();
  await page.getByRole('button', { name: /Doctor Visit Prep/ }).click();
  await page.getByRole('button', { name: 'Save & Exit', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/my-cases$/);
  await expect(page.getByRole('heading', { name: 'My Cases', exact: true })).toBeVisible();
  await page.goto('/app/consult?review=new');
  await expect(page.getByRole('region', { name: 'Review input summary' })).toContainText(story);
  await page.reload();
  const summary = page.getByRole('region', { name: 'Review input summary' });
  await expect(summary).toContainText(story);
  await expect(summary).toContainText('synthetic-original.png');
  await expect(page.getByRole('button', { name: /Doctor Visit Prep/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  expect(errors).toEqual([]);
});
