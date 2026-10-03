import { expect, test } from '@playwright/test';
import {
  caseTitle,
  conditionName,
  expectDialogFits,
  expectReadableWidth,
  expectUsableControl,
  installLayoutFixture,
  recordName,
  settleLayout,
} from './helpers/layout';

test.use({ reducedMotion: 'reduce' });

for (const viewport of [
  { width: 320, height: 760 },
  { width: 390, height: 460 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test(`populated records and public forms remain readable at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(240000);
    await page.setViewportSize(viewport);
    await installLayoutFixture(page);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    for (const route of [
      '/app/today',
      '/app/profile',
      '/app/my-cases',
      '/app/cases/layout-case',
      '/app/cases/layout-case?tab=records',
      '/app/case-prep',
      '/app/dietician',
      '/app/ava',
      '/app/health-memory',
      '/onboarding',
      '/login',
      '/signup',
      '/update-password',
    ]) {
      await page.goto(route);
      await expect(
        route === '/onboarding'
          ? page.getByRole('textbox', { name: 'Full name' })
          : page.locator('h1,h2,h3,[role="log"]').first()
      ).toBeVisible({ timeout: 30000 });
      await settleLayout(page);
      for (const fraction of [0, 0.5, 1]) {
        await page.evaluate((f) => {
          const el = document.querySelector('#main-content') || document.scrollingElement;
          if (el) el.scrollTop = f * (el.scrollHeight - el.clientHeight);
        }, fraction);
        await expectReadableWidth(page);
      }
      if (route === '/app/profile') {
        await expectUsableControl(
          page.getByRole('button', { name: `Remove ${conditionName}`, exact: true }),
          page
        );
      }
      if (route.includes('?tab=records')) {
        await page.getByText(recordName, { exact: true }).scrollIntoViewIfNeeded();
        await expectReadableWidth(page);
        await expect(page.getByRole('heading', { name: caseTitle })).toBeVisible();
      }
      if (route === '/onboarding') {
        await page.getByRole('textbox', { name: 'Full name' }).fill('Synthetic layout person');
        for (let step = 0; step < 2; step++) {
          await page.getByRole('button', { name: 'Continue', exact: true }).click();
          await settleLayout(page);
          for (const fraction of [0, 1]) {
            await page.evaluate((f) => {
              const el = document.scrollingElement;
              if (el) el.scrollTop = f * (el.scrollHeight - el.clientHeight);
            }, fraction);
            await expectReadableWidth(page);
          }
        }
      }
    }
    expect(errors).toEqual([]);
  });
}

for (const viewport of [
  { width: 320, height: 460 },
  { width: 844, height: 390 },
]) {
  test(`page dialogs escape chrome and scrolling at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.setViewportSize(viewport);
    await installLayoutFixture(page);
    const landscape = viewport.width > 768;
    const open = async (route: string, trigger: string | RegExp, name: string | RegExp) => {
      await page.goto(route);
      await page.addStyleTag({
        content: `:root { --safe-area-top:${landscape ? 0 : 59}px!important; --safe-area-bottom:${landscape ? 21 : 34}px!important; --safe-area-left:${landscape ? 44 : 0}px!important; --safe-area-right:${landscape ? 44 : 0}px!important; }`,
      });
      await page.getByRole('button', { name: trigger, exact: true }).first().click();
      const dialog = page.getByRole('dialog', { name, exact: true });
      await page.locator('#main-content').evaluate((el) => {
        (el as HTMLElement).style.transform = 'translateZ(0)';
        el.scrollTop = el.scrollHeight;
      });
      await expectDialogFits(dialog, page, landscape);
      return dialog;
    };
    const meal = await open('/app/dietician', 'Log Meal', 'Log Meal');
    await meal
      .getByRole('textbox', { name: 'Describe your meal' })
      .fill('Synthetic lentil soup with vegetables');
    await expectUsableControl(
      meal.getByRole('button', { name: 'Save meal name', exact: true }),
      page
    );
    await expectUsableControl(meal.getByRole('button', { name: 'Close meal logger' }), page);
    await meal.getByRole('button', { name: 'Close meal logger' }).click();
    await expect(meal).toHaveCount(0);
    expect(
      await page.locator('#main-content').evaluate((el) => getComputedStyle(el).overflowY)
    ).not.toBe('hidden');
    const memory = await open('/app/ava', 'Review memories', 'Review Ava memories');
    await memory.locator('[data-overlay-scroll]').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expectUsableControl(memory.getByRole('button', { name: 'Close memories' }), page);
    await memory.getByRole('button', { name: 'Close memories' }).click();
    await page.evaluate(() => window.dispatchEvent(new Event('hc_open_whole_health_river')));
    const timeline = page.getByRole('dialog', { name: 'Whole health timeline' });
    await expectDialogFits(timeline, page, landscape);
    await timeline.getByRole('button', { name: 'Add Moment', exact: true }).click();
    await timeline
      .getByRole('textbox', { name: 'Moment title' })
      .fill('Synthetic observation for the next appointment');
    await timeline
      .getByRole('textbox', { name: 'Moment items' })
      .fill('A long descriptive note about the timing of a saved observation');
    await expectReadableWidth(page);
    await expectUsableControl(
      timeline.getByRole('button', { name: "Save to Today's River", exact: true }),
      page
    );
    await timeline.getByRole('button', { name: "Save to Today's River", exact: true }).click();
    await expect(
      timeline.getByText('Synthetic observation for the next appointment', { exact: true })
    ).toBeVisible();
    await expectUsableControl(timeline.getByRole('button', { name: 'Done', exact: true }), page);
    await timeline.getByRole('button', { name: 'Done', exact: true }).click();
    await page.goto('/app/case-prep');
    await page.addStyleTag({
      content: `:root { --safe-area-top:${landscape ? 0 : 59}px!important; --safe-area-bottom:${landscape ? 21 : 34}px!important; --safe-area-left:${landscape ? 44 : 0}px!important; --safe-area-right:${landscape ? 44 : 0}px!important; }`,
    });
    await page.getByRole('button', { name: 'See supporting case detail' }).click();
    const detail = page.getByRole('dialog', { name: 'Supporting detail' });
    await settleLayout(page);
    expect(await detail.evaluate((el) => !!el.closest('#main-content'))).toBe(false);
    await expectReadableWidth(page);
    await expectUsableControl(
      detail.getByRole('button', { name: 'Close supporting detail drawer' }),
      page
    );
    await detail.getByRole('button', { name: 'Close supporting detail drawer' }).click();
    const trophy = await open(
      '/app/trophies',
      'First Health Check-in - recorded',
      'Achievement: First Health Check-in'
    );
    await expectUsableControl(
      trophy.getByRole('button', { name: 'Share milestone', exact: true }),
      page
    );
    await expectUsableControl(trophy.getByRole('button', { name: 'Close milestone dialog' }), page);
    await trophy.getByRole('button', { name: 'Close milestone dialog' }).click();
    const reset = await open(
      '/app/profile',
      'Clear clinical profile data',
      'Reset Medical Profile'
    );
    await expectUsableControl(reset.getByRole('button', { name: 'Cancel', exact: true }), page);
    await reset.getByRole('button', { name: 'Cancel', exact: true }).click();
    const deletion = await open('/app/my-cases', 'Delete case', 'Delete Clinical Case');
    await expectUsableControl(deletion.getByRole('button', { name: 'Cancel', exact: true }), page);
    await deletion.getByRole('button', { name: 'Cancel', exact: true }).click();
    const medication = await open(
      '/app/today',
      /Daily Meds & Vitamins -/,
      'Medication & Chrono-Schedule'
    );
    await medication.locator('[data-overlay-scroll]').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expectReadableWidth(page);
    await expectUsableControl(medication.getByRole('button', { name: /Save Schedule/ }), page);
    await page.keyboard.press('Escape');
    const feedback = await open('/app/profile', 'Send Feedback', 'Send Feedback');
    await expectUsableControl(
      feedback.getByRole('button', { name: 'Close feedback popover' }),
      page
    );
    await feedback.getByRole('button', { name: 'Close feedback popover' }).click();
  });
}
