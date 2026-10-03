import { expect, test } from '@playwright/test';
import {
  expectDialogFits,
  expectReadableWidth,
  expectUsableControl,
  installLayoutFixture,
  settleLayout,
} from './helpers/layout';

test.use({ reducedMotion: 'reduce' });

for (const viewport of [
  { width: 320, height: 460 },
  { width: 844, height: 390 },
]) {
  test(`check-in, breathing, starter workflows and research details fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.setViewportSize(viewport);
    await installLayoutFixture(page);
    const landscape = viewport.width > 768;
    const insets = async () => {
      await page.addStyleTag({
        content: `:root { --safe-area-top:${landscape ? 0 : 59}px!important; --safe-area-bottom:${landscape ? 21 : 34}px!important; --safe-area-left:${landscape ? 44 : 0}px!important; --safe-area-right:${landscape ? 44 : 0}px!important; }`,
      });
      await page.locator('#main-content').evaluate((el) => {
        (el as HTMLElement).style.transform = 'translateZ(0)';
      });
    };
    await page.goto('/app/ava');
    await insets();
    await page.getByRole('button', { name: /Log your day/ }).click();
    const checkin = page.getByRole('dialog', { name: 'Log your day', exact: true });
    await expectDialogFits(checkin, page, landscape);
    await checkin.getByRole('combobox', { name: 'Did sleep feel restful?' }).selectOption('yes');
    await checkin
      .getByRole('textbox', { name: 'Day check-in notes' })
      .fill('Synthetic observation about sleep and timing for layout verification.');
    const save = checkin.getByRole('button', { name: 'Save today’s check-in', exact: true });
    await expectUsableControl(save, page);
    await save.click();
    await expect(checkin.getByRole('status')).toContainText('Check-in saved');
    await expectUsableControl(checkin.getByRole('button', { name: 'Close day check-in' }), page);
    await page.keyboard.press('Escape');
    await expect(checkin).toHaveCount(0);

    await page.evaluate(() => window.dispatchEvent(new Event('hc_reopen_meditation')));
    const breathing = page.getByRole('dialog', { name: 'Comfortable breathing guide' });
    await expectDialogFits(breathing, page, landscape);
    await breathing.getByRole('combobox', { name: 'Session length' }).selectOption('120');
    await expectUsableControl(breathing.getByRole('button', { name: 'Start', exact: true }), page);
    await breathing.getByRole('button', { name: 'Start', exact: true }).click();
    const finish = breathing.getByRole('button', { name: 'Finish and save participation' });
    await expect(finish).toBeEnabled();
    await breathing.getByRole('button', { name: 'Pause', exact: true }).click();
    await expectUsableControl(finish, page);
    await finish.click();
    await expect(breathing.getByRole('status')).toContainText('Saved on this device');
    await expectUsableControl(
      breathing.getByRole('button', { name: 'Close breathing guide' }),
      page
    );
    await page.keyboard.press('Escape');
    await expect(breathing).toHaveCount(0);

    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('hc_open_trial_modal', {
          detail: {
            lockedFeature:
              'Synthetic clinical review with a deliberately long feature name for layout checks',
          },
        })
      )
    );
    const starter = page.getByRole('dialog', { name: 'Starter workflows' });
    await expectDialogFits(starter, page, landscape);
    await starter.locator('[data-overlay-scroll]').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expectUsableControl(
      starter.getByRole('button', { name: 'Close modal', exact: true }),
      page
    );
    await page.keyboard.press('Escape');
    await expect(starter).toHaveCount(0);

    const title =
      'Synthetic fatigue study with long-term symptom monitoring and specialist follow-up questions';
    await page.route(/\/api\/trials(?:\?|$)/, (route) =>
      route.fulfill({
        json: {
          studies: [
            {
              id: 'NCT00000000',
              title,
              status: 'RECRUITING',
              phase: 'PHASE2',
              location: 'Synthetic regional clinical research facility with multiple departments',
              summary: 'Synthetic study summary for layout verification only. '.repeat(16),
              conditions: ['Fatigue'],
              interventions: ['Synthetic observational monitoring'],
              eligibility: {
                minimumAge: '18 Years',
                maximumAge: '70 Years',
                sex: 'ALL',
                eligibilityCriteria:
                  'Synthetic inclusion and exclusion details for checking the scrolling layout. '.repeat(
                    12
                  ),
              },
            },
          ],
        },
      })
    );
    await page.goto('/app/trials');
    await insets();
    await page
      .getByRole('button', { name: `View clinical trial details for ${title}`, exact: true })
      .click();
    const research = page.getByRole('dialog', { name: 'Research Detail Modal' });
    await expectDialogFits(research, page, landscape);
    const researchBody = research.locator('[data-overlay-scroll]').first();
    for (const fraction of [0, 0.5, 1]) {
      await researchBody.evaluate((el, f) => {
        el.scrollTop = f * (el.scrollHeight - el.clientHeight);
      }, fraction);
      await expectReadableWidth(page);
    }
    await research
      .locator('[data-overlay-scroll]')
      .nth(1)
      .evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    await expectReadableWidth(page);
    await page.screenshot({
      path: test.info().outputPath('research-bottom.png'),
      animations: 'disabled',
    });
    await researchBody.evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: test.info().outputPath('research-top.png'),
      animations: 'disabled',
    });
    await expectUsableControl(
      research.getByRole('button', { name: 'Save to case', exact: true }),
      page
    );
    await research.getByRole('button', { name: 'Save to case', exact: true }).click();
    await expect(
      research.getByRole('button', { name: 'Saved to this case', exact: true })
    ).toBeVisible();
    await expectUsableControl(
      research.getByRole('button', { name: 'Discuss with Ava', exact: true }),
      page
    );
    await expectUsableControl(
      research.getByRole('button', { name: 'View full external source in new tab' }),
      page
    );
    await expectUsableControl(
      research.getByRole('button', { name: 'Close research details' }),
      page
    );
    await settleLayout(page);
    await page.keyboard.press('Escape');
    await expect(research).toHaveCount(0);
  });
}
