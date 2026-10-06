import { expect, test, type Locator, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

async function setup(page: Page, foodPlannerReady = false, completedProfile = false) {
  await page.addInitScript(
    ({ foodPlannerReady, completedProfile }) => {
      localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
      localStorage.setItem('hc_onboarded', 'true');
      localStorage.setItem('hc_cookies_accepted', 'declined');
      localStorage.setItem(
        'hc_unified_profile_guest',
        JSON.stringify({
          activeId: 'profile_1',
          profiles: {
            profile_1: {
              id: 'profile_1',
              profileName: 'Synthetic layout audit',
              onboardingCompletedAt: completedProfile ? '2026-10-01T10:00:00Z' : undefined,
              demographics: {
                name: 'A deliberately long synthetic profile name',
                age: 35,
                gender: 'female',
                height: 165,
                weight: 65,
              },
              conditions: [],
              medications: [],
              allergies: [],
              dietProfile: foodPlannerReady
                ? {
                    age: '35',
                    gender: 'female',
                    height: '165',
                    weight: '65',
                    weightUnit: 'kg',
                    heightUnit: 'cm',
                    goal: 'Maintain',
                    activityLevel: 'sedentary',
                    cuisine: 'Local',
                    mealSchedule: '3 Meals',
                    medicalConditions: [],
                    restrictions: [],
                  }
                : undefined,
            },
          },
        })
      );
    },
    { foodPlannerReady, completedProfile }
  );
  await page.route(/https:\/\//, (route) => route.abort());
}

for (const viewport of [
  { width: 320, height: 760 },
  { width: 390, height: 844 },
  { width: 390, height: 460 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test(`saved-profile editor keeps its controls above navigation at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    await setup(page, false, true);
    await page.goto('/app/today');
    const trigger = page.getByRole('button', { name: 'Edit Baseline', exact: true });
    await expect(trigger).toBeVisible({ timeout: 30000 });
    const landscape = viewport.width > viewport.height && viewport.height < 600;
    await simulateInsets(page, landscape);
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Edit saved health profile', exact: true });
    const panel = dialog.locator('[data-overlay-panel]');
    await expectFits(panel, page, landscape ? 12 : 59, landscape ? 44 : 12, landscape ? 21 : 34);
    expect(await dialog.evaluate((el) => el.closest('#main-content') === null)).toBe(true);
    await expectHeaderControlsSeparate(dialog, page);
    const header = dialog.locator('[data-overlay-header]');
    const footer = dialog.locator('[data-overlay-footer]');
    const body = dialog.locator('[data-overlay-scroll]');
    const save = dialog.getByRole('button', {
      name: 'Save profile',
      exact: true,
    });
    const close = dialog.getByRole('button', { name: 'Close health profile editor', exact: true });
    await expect(save).toBeInViewport();
    await expect(close).toBeInViewport();
    const h = await header.boundingBox(),
      b = await body.boundingBox(),
      f = await footer.boundingBox();
    expect(h!.y + h!.height).toBeLessThanOrEqual(b!.y + 1);
    expect(b!.y + b!.height).toBeLessThanOrEqual(f!.y + 1);
    expect(
      await page.locator('#main-content').evaluate((el) => getComputedStyle(el).overflowY)
    ).toBe('hidden');

    // Page animations must not turn the dialog into a child of the scrolling page.
    await page.locator('#main-content').evaluate((el) => {
      el.style.transform = 'translateZ(0)';
    });
    await expectFits(panel, page, landscape ? 12 : 59, landscape ? 44 : 12, landscape ? 21 : 34);
    await dialog.getByRole('spinbutton', { name: 'Age', exact: true }).fill('36');
    if (viewport.width === 390 && viewport.height === 844) {
      await page.addStyleTag({ content: ':root { --app-viewport-height:440px!important; }' });
      await expect
        .poll(async () => {
          const box = await panel.boundingBox();
          return !!box && box.y >= 59 && box.y + box.height <= 406;
        })
        .toBe(true);
    }
    await body.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const allergies = dialog.getByRole('heading', { name: /^4\. Known Allergies/ });
    await allergies.scrollIntoViewIfNeeded();
    await expect(allergies).toBeInViewport();
    await body.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(dialog.getByRole('button', { name: /Latex/ })).toBeInViewport();
    await expect(header).toBeInViewport();
    await expect(save).toBeInViewport();
    expect(
      await save.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })
    ).toBe(true);
    await save.click();
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('hc_unified_profile_guest')!).profiles.profile_1
            .demographics.age
      )
    ).toBe(36);
    expect(
      await page.locator('#main-content').evaluate((el) => getComputedStyle(el).overflowY)
    ).toBe('auto');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

async function simulateInsets(page: Page, landscape = false) {
  await page.addStyleTag({
    content: landscape
      ? ':root { --safe-area-top: 0px !important; --safe-area-bottom: 21px !important; --safe-area-left: 44px !important; --safe-area-right: 44px !important; }'
      : ':root { --safe-area-top: 59px !important; --safe-area-bottom: 34px !important; }',
  });
}

async function expectFits(panel: Locator, page: Page, top: number, side = 0, bottom = 0) {
  await expect(panel).toBeVisible();
  await expect
    .poll(async () => {
      const b = await panel.boundingBox(),
        v = page.viewportSize()!;
      return (
        !!b &&
        b.y >= top - 1 &&
        b.x >= side - 1 &&
        b.x + b.width <= v.width - side + 1 &&
        b.y + b.height <= v.height - bottom + 1
      );
    })
    .toBe(true);
  expect(await panel.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
}

async function expectHeaderControlsSeparate(dialog: Locator, page: Page) {
  const header = dialog.locator('[data-overlay-header], .vitality-header').first();
  await expect(header).toBeVisible();
  const overlaps = await header.evaluate((el) => {
    const buttons = Array.from(el.querySelectorAll('button')).filter(
      (button) => button.getBoundingClientRect().width > 0
    );
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT),
      errors: string[] = [];
    for (let text; (text = walker.nextNode());) {
      if (!text.textContent?.trim() || text.parentElement?.closest('button')) continue;
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const box of range.getClientRects())
        for (const button of buttons) {
          const b = button.getBoundingClientRect();
          if (
            box.left < b.right - 1 &&
            box.right > b.left + 1 &&
            box.top < b.bottom - 1 &&
            box.bottom > b.top + 1
          )
            errors.push(text.textContent.trim());
        }
    }
    return errors;
  });
  expect(overlaps).toEqual([]);
  for (const button of await header.getByRole('button').all()) {
    if (!(await button.isVisible())) continue;
    // Dialog transforms can still be settling after visibility is satisfied.
    // Keep the touch-target limit and measure once its rendered height reaches it.
    await expect
      .poll(() => button.evaluate((el) => el.getBoundingClientRect().height))
      .toBeGreaterThanOrEqual(43);
    const b = await button.boundingBox();
    expect(b!.x + b!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
}

for (const viewport of [
  { width: 320, height: 760 },
  { width: 390, height: 844 },
  { width: 390, height: 460 },
  { width: 844, height: 390 },
]) {
  test(`daily dialogs keep navigation and actions in bounds at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(90000);
    await page.setViewportSize(viewport);
    await setup(page);
    await page.goto('/app/today');
    await expect(page.getByRole('button', { name: 'Quick log 250ml water' })).toBeVisible({
      timeout: 30000,
    });
    const landscape = viewport.width > viewport.height,
      top = landscape ? 0 : 59,
      side = landscape ? 44 : 0;
    await simulateInsets(page, landscape);
    for (const [name, entry, action] of [
      [
        'Vitality Points & Rewards',
        () =>
          page
            .locator(
              'button[aria-label="View activity"]:visible, button[title="View activity"]:visible'
            )
            .first(),
        undefined,
      ],
      [
        'Daily Notifications and Care Reminders',
        () =>
          page
            .locator(
              'button[aria-label="View notifications"]:visible, button[title="Notifications"]:visible'
            )
            .first(),
        'Close',
      ],
      [
        'Hydration Tracker',
        () =>
          page.getByRole('button', {
            name: 'Daily Hydration - Open intake tracker',
            exact: true,
          }),
        'Done',
      ],
      [
        'Medication & Chrono-Schedule',
        () => page.getByRole('button', { name: /Daily Meds & Vitamins -/ }),
        'Save Schedule',
      ],
    ] as const) {
      await entry().click();
      const dialog = page.getByRole('dialog', { name, exact: true });
      await expectFits(
        dialog,
        page,
        top,
        side,
        name === 'Vitality Points & Rewards' ? (landscape ? 21 : 34) : 0
      );
      await expectHeaderControlsSeparate(dialog, page);
      if (action) {
        const button = dialog.getByRole('button', {
          name: action,
          exact: true,
        });
        await expect(button).toBeInViewport();
        const footer = dialog.locator('[data-overlay-footer]');
        await expect(footer).toBeVisible();
        const body = dialog.locator('[data-overlay-scroll]').first();
        const b = await body.boundingBox(),
          f = await footer.boundingBox();
        expect(b!.y + b!.height).toBeLessThanOrEqual(f!.y + 1);
        if (name === 'Hydration Tracker') {
          await body.evaluate((el) => {
            el.scrollTop = el.scrollHeight;
          });
          await expect(
            dialog.getByRole('button', { name: 'Toggle daylight reminders' })
          ).toBeInViewport();
        }
      } else {
        await dialog.getByRole('button', { name: 'History', exact: true }).click();
        await expect(
          dialog.getByText('No points history recorded yet.', { exact: true })
        ).toBeVisible();
      }
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
    }
  });
}

test('profile steps, garden navigation and meal entry stay reachable on a narrow phone', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 320, height: 760 });
  await setup(page);
  await page.goto('/app/today');
  await expect(
    page.getByRole('button', { name: 'Complete health profile', exact: true })
  ).toBeVisible({ timeout: 30000 });
  await simulateInsets(page);
  await page.getByRole('button', { name: 'Complete health profile', exact: true }).click();
  const profile = page.getByRole('dialog', {
    name: 'Complete Health Profile',
    exact: true,
  });
  await expectFits(profile, page, 59);
  await expectHeaderControlsSeparate(profile, page);
  for (const name of ['Profile', 'Conditions', 'Meds', 'Allergies']) {
    const step = profile.getByRole('button', { name, exact: true });
    await expect(step).toBeInViewport();
    await step.click();
    expect(await profile.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(2);
  }
  await page.keyboard.press('Escape');
  await expect(profile).not.toBeVisible();
  await page.getByRole('button', { name: 'Open Zen Garden', exact: true }).click();
  const garden = page.getByRole('dialog', { name: 'Zen Garden', exact: true });
  await expectFits(garden.locator('.zen-modal-sheet'), page, 59, 0, 34);
  await expect(garden.getByRole('button', { name: 'Back', exact: true })).toBeInViewport();
  await garden.getByRole('button', { name: 'Back', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Gut Health - Ask a question and explore your records and research',
      exact: true,
    })
    .click();
  const gut = page.getByRole('dialog', { name: 'Gut Health', exact: true });
  await expectFits(gut.locator('.gr-modal-dialog'), page, 0);
  await expectHeaderControlsSeparate(gut, page);
  const header = await gut.locator('.gr-modal-header h1').boundingBox();
  expect(header!.y).toBeGreaterThanOrEqual(59);
  await gut.getByRole('button', { name: 'History', exact: true }).click();
  await expectHeaderControlsSeparate(gut, page);
  await gut.getByRole('button', { name: /^Meals/ }).click();
  const meal = page.getByRole('dialog', { name: 'Record a meal', exact: true });
  await page.setViewportSize({ width: 320, height: 460 });
  await expectFits(meal.locator('.gr-meal-sheet'), page, 59, 0, 34);
  await meal
    .getByLabel('What did you eat or drink?')
    .fill('Synthetic meal for layout verification');
  await expect(meal.getByRole('button', { name: 'Save meal' })).toBeInViewport();
});

test('Ava composer gives the editor, attachment, camera and send button separate space', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await setup(page);
  await page.goto('/app/ava');
  const editor = page.getByRole('textbox', {
    name: 'Ask Ava Health Buddy a question',
  });
  await editor.fill(
    'A long synthetic draft that wraps across several lines without covering the camera or send buttons.'
  );
  const composer = page.locator('.ava-composer'),
    fields = [
      editor,
      composer.getByRole('button', { name: 'Add attachment' }),
      composer.getByRole('button', { name: 'Log a meal or food photo' }),
      composer.getByRole('button', { name: 'Send message' }),
    ];
  const boxes = await Promise.all(fields.map((field) => field.boundingBox()));
  for (let n = 0; n < boxes.length; n++)
    for (let m = n + 1; m < boxes.length; m++) {
      const a = boxes[n]!,
        b = boxes[m]!;
      expect(
        a.x + a.width <= b.x + 1 ||
          b.x + b.width <= a.x + 1 ||
          a.y + a.height <= b.y + 1 ||
          b.y + b.height <= a.y + 1
      ).toBe(true);
    }
  await composer.getByRole('button', { name: 'Log a meal or food photo' }).click();
  const meal = page.getByRole('dialog', {
    name: 'Quick meal entry',
    exact: true,
  });
  await expectFits(meal.locator('[data-overlay-panel]'), page, 12);
});

test('main routes have no clipped readable text after scrolling at 320px', async ({ page }) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 320, height: 760 });
  await setup(page, false, true);
  for (const route of [
    '/app/today',
    '/app/profile',
    '/app/my-cases',
    '/app/case-prep',
    '/app/consult',
    '/app/dietician',
    '/app/ava',
    '/app/trials',
    '/app/settings',
    '/app/trophies',
    '/app/progress',
    '/app/health-memory',
    '/app/onboarding',
    '/pricing',
    '/help',
    '/privacy',
    '/terms',
    '/review-demo',
    '/changelog',
  ]) {
    await page.goto(route);
    await expect(page.locator('h1,h2,h3,[role="log"]').first()).toBeVisible({ timeout: 30000 });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    );
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined))
      )
    );
    for (const fraction of [0, 0.5, 1]) {
      await page.evaluate((fraction) => {
        const content = document.querySelector('#main-content') || document.scrollingElement;
        if (content) content.scrollTop = fraction * (content.scrollHeight - content.clientHeight);
      }, fraction);
      const clipped = await page.evaluate(() => {
        const issues: string[] = [],
          walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node; (node = walker.nextNode());) {
          const el = node.parentElement,
            value = node.textContent?.trim();
          if (
            !el ||
            !value ||
            value.length < 4 ||
            el.closest('script,style,svg,[aria-hidden="true"],.sr-only,[hidden]')
          )
            continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const box of range.getClientRects()) {
            if (box.bottom < 0 || box.top > innerHeight || box.width < 2 || box.height < 3)
              continue;
            let visible = true,
              scrollable = false,
              cut = false;
            for (let p: HTMLElement | null = el; p; p = p.parentElement) {
              const s = getComputedStyle(p),
                b = p.getBoundingClientRect();
              if (
                s.visibility === 'hidden' ||
                s.display === 'none' ||
                s.opacity === '0' ||
                b.width < 2 ||
                b.height < 2 ||
                (/auto|scroll|hidden|clip/.test(s.overflowY) &&
                  (box.bottom < b.top + 2 || box.top > b.bottom - 2))
              ) {
                visible = false;
                break;
              }
              if (/auto|scroll/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 2)
                scrollable = true;
              if (
                /hidden|clip/.test(s.overflowX) &&
                (box.left < b.left - 2 || box.right > b.right + 2) &&
                s.textOverflow !== 'ellipsis'
              )
                cut = true;
            }
            if (visible && !scrollable && (cut || box.left < -2 || box.right > innerWidth + 2))
              issues.push(value.slice(0, 90));
          }
        }
        return [...new Set(issues)];
      });
      expect(clipped, `${route} at scroll ${fraction}`).toEqual([]);
    }
  }
});

test('profile menu, More Tools and article sheet fit the same small viewport', async ({ page }) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 320, height: 460 });
  await setup(page);
  await page.goto('/app/today');
  await expect(page.getByRole('button', { name: 'Open Zen Garden' })).toBeVisible({
    timeout: 30000,
  });
  await simulateInsets(page);
  await page.getByRole('button', { name: 'Open profile menu' }).click();
  const menu = page.getByRole('menu', { name: 'User Profile Menu' });
  await expectFits(menu, page, 59, 0, 34);
  await expect(menu.getByText('A deliberately long synthetic profile name')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await page.getByRole('button', { name: 'More Menu', exact: true }).click();
  const more = page.getByRole('dialog', { name: 'More Health Tools' });
  await expectFits(more, page, 59);
  await expect(more.getByRole('button', { name: 'Close More Menu' })).toBeInViewport();
  await more.getByRole('button', { name: 'Close More Menu' }).click();
  await page.getByRole('button', { name: /Gut Health · 6 min read Gut and brain health/ }).click();
  const article = page.locator('.hc-bottom-sheet');
  await expectFits(article, page, 59);
  const handle = await article.getByRole('button', { name: 'Dismiss bottom sheet' }).boundingBox();
  const content = await article.locator('article').boundingBox();
  expect(content!.y).toBeGreaterThanOrEqual(handle!.y + handle!.height);
  await expect(article.getByRole('button', { name: 'Close sheet' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(article).not.toBeVisible();
  expect(
    await page.locator('#main-content').evaluate((el) => getComputedStyle(el).overflowY)
  ).not.toBe('hidden');
});

test('the software keyboard uses its visible height even while the layout viewport stays tall', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.goto('/app/ava');
  const editor = page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' });
  await editor.fill('Synthetic keyboard layout draft');
  await simulateInsets(page);
  await page.addStyleTag({ content: ':root { --app-viewport-height:440px!important; }' });
  await page.evaluate(() => (document.documentElement.dataset.viewportCompact = 'true'));
  await expect
    .poll(async () => {
      const box = await editor.boundingBox();
      return !!box && box.y + box.height <= 440;
    })
    .toBe(true);
  await page.locator('button[aria-label="View activity"]:visible').click();
  const points = page.getByRole('dialog', { name: 'Vitality Points & Rewards' });
  await expect
    .poll(async () => {
      const box = await points.boundingBox();
      return !!box && box.y >= 59 && box.y + box.height <= 406;
    })
    .toBe(true);
  await expect(points.getByRole('button', { name: 'History', exact: true })).toBeInViewport();
  await expectHeaderControlsSeparate(points, page);
});

test('everyday food tools stay within phone and landscape cutouts', async ({ page }) => {
  await setup(page, true);
  for (const viewport of [
    { width: 320, height: 760 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/app/dietician');
    await simulateInsets(page, viewport.width > 768);
    await page.getByRole('button', { name: 'My meals & history', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Everyday food tools' });
    await expectFits(
      dialog,
      page,
      viewport.width > 768 ? 12 : 59,
      viewport.width > 768 ? 44 : 0,
      viewport.width > 768 ? 21 : 34
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Log Meal', exact: true }).click();
    const logger = page.getByRole('dialog', { name: 'Log Meal', exact: true });
    await expectFits(
      logger,
      page,
      viewport.width > 768 ? 12 : 59,
      viewport.width > 768 ? 44 : 0,
      viewport.width > 768 ? 21 : 34
    );
    await expectHeaderControlsSeparate(logger, page);
    await logger.getByRole('button', { name: 'Close meal logger' }).click();
    await expect(logger).toHaveCount(0);
  }
});

test('feedback remains reachable in short and landscape views', async ({ page }) => {
  await setup(page);
  for (const viewport of [
    { width: 320, height: 460 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/app/profile');
    await simulateInsets(page, viewport.width > 768);
    await page.getByRole('button', { name: 'Send Feedback', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Send Feedback', exact: true });
    await expectFits(
      dialog,
      page,
      viewport.width > 768 ? 16 : 59,
      viewport.width > 768 ? 44 : 0,
      viewport.width > 768 ? 21 : 34
    );
    await dialog.getByRole('button', { name: 'Close feedback popover' }).click();
    await expect(dialog).toHaveCount(0);
  }
});
