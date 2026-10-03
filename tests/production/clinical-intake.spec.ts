import { expect, test } from '@playwright/test';
import { expectReadableWidth, expectUsableControl, settleLayout } from './helpers/layout';

for (const width of [320, 390]) {
  test(`built Clinical intake keeps all six screens usable at ${width}px and preserves the draft`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('hc_guest_mode', 'true');
      localStorage.setItem('hc_onboarded', 'true');
      localStorage.setItem('hc_cookies_accepted', 'declined');
    });
    await page.route(/https:\/\//, (route) => route.abort());
    await page.route('**/api/**', (route) => route.abort());
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/consult?review=new&step=6');
    const advance = async (name: string) => {
      await settleLayout(page);
      await expectReadableWidth(page);
      const next = page.getByRole('button', { name, exact: true });
      await expectUsableControl(next, page);
      await next.click();
    };
    await expect(page.getByRole('heading', { name: 'Which symptoms bother you?' })).toBeVisible();
    await page.getByRole('button', { name: 'Fatigue', exact: true }).click();
    await advance('Continue with 1 symptom');
    await page.getByRole('button', { name: '1–2 weeks', exact: true }).click();
    await advance('Next: Pattern (Step 3)');
    await page.getByRole('button', { name: 'Fluctuating / Comes & Goes ∿', exact: true }).click();
    await advance('Next: Tell Your Story (Step 4)');
    const notes = page.getByRole('textbox', { name: 'Clinical timeline and symptom notes' });
    const story =
      (await notes.inputValue()) +
      '\nSynthetic build example: doses and collection times remain unknown.';
    await notes.fill(story);
    const keyboard = await page.addStyleTag({
      content: ':root { --app-viewport-height:460px!important; }',
    });
    await expectUsableControl(notes, page);
    await advance('Next: Add Evidence (Step 5)');
    await keyboard.evaluate((el) => el.remove());
    await page
      .getByLabel('Upload medical records, lab reports, or health documents')
      .setInputFiles({
        name: 'synthetic-original.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5AAAAABJRU5ErkJggg==',
          'base64'
        ),
      });
    await expect(page.getByText('synthetic-original.png', { exact: true })).toBeVisible();
    await advance('Next: Scope & Run (Step 6)');
    await page.getByRole('button', { name: /Doctor Visit Prep/ }).click();
    await settleLayout(page);
    await expectReadableWidth(page);
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
}
