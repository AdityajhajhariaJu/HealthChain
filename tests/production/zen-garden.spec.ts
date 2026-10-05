import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page, days = 0, noWebGL = false) {
  await page.addInitScript(
    ({ days, noWebGL }) => {
      localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
      localStorage.setItem('hc_onboarded', 'true');
      localStorage.setItem('hc_cookies_accepted', 'declined');
      if (!localStorage.getItem('hc_unified_profile_guest')) {
        const receipts: Record<string, object> = {};
        for (let n = days; n > 0; n--) {
          const date = new Date();
          date.setUTCDate(date.getUTCDate() - n);
          date.setUTCHours(9, 0, 0, 0);
          ['garden.tended', 'record.saved', 'research.saved'].forEach((type, index) => {
            date.setUTCHours(9 + index);
            const id = `${type}:fixture-${n}`,
              at = date.toISOString();
            receipts[id] = { id, type, at, day: at.slice(0, 10) };
          });
        }
        localStorage.setItem(
          'hc_unified_profile_guest',
          JSON.stringify({
            activeId: 'profile_1',
            profiles: {
              profile_1: {
                id: 'profile_1',
                profileName: 'Synthetic island audit',
                demographics: { name: 'Synthetic guest', updatedAt: '2026-01-01T00:00:00Z' },
                gamification: {
                  version: 1,
                  timezone: 'UTC',
                  legacyPoints: 5,
                  legacyLifetime: 5,
                  legacyGardenLevel: 1,
                  legacyLastTended: '',
                  legacySourceKeys: [],
                  receipts,
                  importedBadges: [],
                  theme: { value: 'meadow', at: '' },
                },
              },
            },
          })
        );
      }
      if (noWebGL) {
        const native = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
          if (/webgl/i.test(type)) return null;
          return (native as any).call(this, type, ...args);
        } as any;
      }
    },
    { days, noWebGL }
  );
  await page.route(/https:\/\//, (route) => route.abort());
}
const ledger = (page: Page) =>
  page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('hc_unified_profile_guest')!).profiles.profile_1.gamification
  );
const open = async (page: Page) => {
  await page.getByRole('button', { name: 'Open Zen Garden', exact: true }).click();
  const garden = page.getByRole('dialog', { name: 'Zen Garden', exact: true });
  await expect(garden.getByRole('heading', { name: 'Zen Garden' })).toBeVisible();
  return garden;
};
const openPoints = async (page: Page) => {
  await page
    .locator('button[title="View activity"]:visible, button[aria-label="View activity"]:visible')
    .first()
    .click();
  const points = page.getByRole('dialog', { name: 'Vitality Points & Rewards', exact: true });
  await expect(points).toBeVisible();
  return points;
};

test('live island loads 3D on demand, tends once, persists its atmosphere and shares point history', async ({
  page,
}) => {
  // This journey opens three dialogs and reloads the application. Windows
  // WebKit needs a larger overall budget; individual assertions stay bounded.
  test.setTimeout(60000);
  await setup(page);
  const sceneRequests: string[] = [],
    errors: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('CozyIslandScene')) sceneRequests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/app/today');
  await expect(page.getByRole('button', { name: 'Open Zen Garden' })).toBeVisible();
  expect(sceneRequests).toEqual([]);
  const garden = await open(page);
  await expect.poll(() => sceneRequests.length).toBeGreaterThan(0);
  await expect(page.locator('.zen-preview')).toContainText('Zen Sanctuary');
  await expect(page.locator('.zen-preview')).toContainText('Grow your own garden');
  await expect(garden.getByText('SANCTUARY METRICS', { exact: true })).toBeVisible();
  for (const label of ['Blooms', 'Days Tended', 'Garden Streak'])
    await expect(garden.getByText(label, { exact: true })).toBeVisible();
  await expect(garden.locator('.zen-next, .zen-summary, .zen-recent, .zen-links')).toHaveCount(0);
  await garden.getByRole('button', { name: 'Water Garden', exact: true }).click();
  await expect(
    garden.getByRole('button', { name: 'Garden Tended Today', exact: true })
  ).toBeDisabled();
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(1);
  await garden.getByRole('button', { name: 'Golden dusk', exact: true }).click();
  await expect(garden.getByRole('button', { name: 'Golden dusk' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('hc_unified_profile_guest')!).profiles.profile_1
          .demographics.updatedAt
    )
  ).toBe('2026-01-01T00:00:00Z');
  await garden.getByRole('button', { name: 'Close modal' }).click();
  await expect(page.locator('.zen-preview')).toHaveAttribute('data-level', '1');
  await page.reload();
  const reopened = await open(page);
  await expect(reopened.getByRole('button', { name: 'Golden dusk' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(
    reopened.getByRole('button', { name: 'Garden Tended Today', exact: true })
  ).toBeDisabled();
  await reopened.getByRole('button', { name: 'Close modal' }).click();
  const points = await openPoints(page);
  await points.getByRole('button', { name: 'History', exact: true }).click();
  await expect(points.getByText('Your island tended', { exact: true })).toBeVisible();
  await expect(
    points.getByTestId('points-history').getByText('+5 PTS', { exact: true })
  ).toBeVisible();
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('a mature island and trophy cabinet show the same sixty days of progress', async ({
  page,
}) => {
  await setup(page, 60);
  await page.goto('/app/today');
  await expect(page.locator('.zen-preview')).toHaveAttribute('data-level', '5');
  const garden = await open(page);
  await expect(garden.getByRole('img', { name: /Your island: Your cozy haven/ })).toBeVisible();
  await expect(garden.getByText('Level 5 • ZEN MASTER', { exact: true })).toBeVisible();
  await expect(garden.getByText('🔥 60 Days', { exact: true })).toBeVisible();
  await garden.getByRole('button', { name: 'Close modal' }).click();
  await page.getByRole('button', { name: 'Trophies', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/trophies$/);
  await expect(page.getByText('First Health Check-in', { exact: true })).toBeVisible();
  await expect(page.getByText('Three Check-ins Recorded', { exact: true })).toBeVisible();
  await expect(page.getByText('Research Reviewed', { exact: true })).toBeVisible();
  await expect(page.getByText('A cozy haven', { exact: true })).toHaveCount(0);
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(180);
});

test('320px reduced-motion garden fits, all controls are reachable and Escape restores the trigger', async ({
  page,
}) => {
  await setup(page, 10);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app/today');
  const garden = await open(page);
  await expect(garden.getByRole('img', { name: /Your island: A peaceful pond/ })).toBeVisible();
  await expect(garden.locator('.zen-camera')).toHaveCount(0);
  await garden.getByRole('button', { name: 'Blossom', exact: true }).click();
  const guide = garden.getByRole('button', { name: 'How it grows', exact: true });
  await expect(guide).toHaveAttribute('aria-expanded', 'false');
  const guideBox = await guide.boundingBox(),
    sceneBox = await garden.locator('.zen-scene').boundingBox();
  expect(guideBox!.y + guideBox!.height).toBeLessThanOrEqual(sceneBox!.y + 1);
  expect(guideBox!.x).toBeGreaterThan(sceneBox!.x + sceneBox!.width / 2);
  await guide.click();
  await expect(guide).toHaveAttribute('aria-expanded', 'true');
  await expect(garden.getByText('Daily limits use UTC.', { exact: false })).toBeVisible();
  expect(await garden.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await garden.getByText('Garden Streak', { exact: true }).scrollIntoViewIfNeeded();
  await expect(garden.getByRole('button', { name: /Explore Soundscapes/ })).toHaveCount(0);
  await guide.click();
  await expect(garden.getByText('How this garden works', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(garden).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open Zen Garden' })).toBeFocused();
});

test('WebGL-unavailable devices retain the matching island and functioning tending', async ({
  page,
}) => {
  await setup(page, 0, true);
  await page.goto('/app/today');
  const garden = await open(page);
  await expect(garden.locator('.zen-canvas > img.island-snapshot')).toBeVisible();
  await garden.getByRole('button', { name: 'Water Garden', exact: true }).click();
  await expect(
    garden.getByRole('button', { name: 'Garden Tended Today', exact: true })
  ).toBeDisabled();
  await expect(garden.getByText('🌸 1', { exact: true })).toBeVisible();
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(1);
});

test('a slow graphics driver falls back without blocking the original garden controls', async ({
  page,
}) => {
  // Deliberately stalled draws and Windows WebKit presentation share this
  // overall budget; the actual fallback must still appear within 15 seconds.
  test.setTimeout(60000);
  await setup(page);
  await page.addInitScript(() => {
    (window as any).__islandDraws = 0;
    for (const name of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced',
    ] as const) {
      const original = WebGL2RenderingContext.prototype[name];
      (WebGL2RenderingContext.prototype as any)[name] = function (...args: any[]) {
        (window as any).__islandDraws++;
        const start = performance.now();
        while (performance.now() - start < 1) {
          /* Synthetic slow GPU submission. */
        }
        return (original as any).apply(this, args);
      };
    }
  });
  await page.goto('/app/today');
  const garden = await open(page);
  await expect.poll(() => page.evaluate(() => (window as any).__islandDraws)).toBeGreaterThan(0);
  await expect(garden.locator('.zen-canvas > img.island-snapshot')).toBeVisible({ timeout: 15000 });
  await expect(garden.locator('canvas')).toHaveCount(0);
  await expect(garden.getByRole('button', { name: 'Turn island left', exact: true })).toHaveCount(
    0
  );
  await garden.getByRole('button', { name: 'Water Garden', exact: true }).click();
  await expect(
    garden.getByRole('button', { name: 'Garden Tended Today', exact: true })
  ).toBeDisabled();
  await garden.getByRole('button', { name: 'How it grows', exact: true }).click();
  await expect(garden.getByText('How this garden works', { exact: true })).toBeVisible();
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(1);
});

test('the original garden counters and streak survive migration, watering and reload', async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() => {
    if (sessionStorage.getItem('garden_migration_fixture')) return;
    sessionStorage.setItem('garden_migration_fixture', 'seeded');
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const day = yesterday.toISOString().slice(0, 10);
    const profile = JSON.parse(localStorage.getItem('hc_unified_profile_guest')!);
    profile.profiles.profile_1.gamification.legacyGardenLevel = 2;
    profile.profiles.profile_1.gamification.legacyLastTended = day;
    delete profile.profiles.profile_1.gamification.legacyGarden;
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify(profile));
    localStorage.setItem(
      'hc_wellness_zen_garden:hc_unified_profile_guest:profile_1',
      JSON.stringify({
        level: 2,
        vitalityScore: 47,
        bloomCount: 11,
        waterCount: 8,
        streakDays: 6,
        lastWateredDate: day,
      })
    );
  });
  await page.goto('/app/today');
  const garden = await open(page);
  await expect(garden.getByText('🌸 11', { exact: true })).toBeVisible();
  await expect(garden.getByText('💧 8', { exact: true })).toBeVisible();
  await expect(garden.getByText('🔥 6 Days', { exact: true })).toBeVisible();
  await garden.getByRole('button', { name: 'Water Garden', exact: true }).click();
  await expect(garden.getByText('🌸 12', { exact: true })).toBeVisible();
  await expect(garden.getByText('💧 9', { exact: true })).toBeVisible();
  await expect(garden.getByText('🔥 7 Days', { exact: true })).toBeVisible();
  await page.reload();
  const restored = await open(page);
  await expect(restored.getByText('🌸 12', { exact: true })).toBeVisible();
  await expect(restored.getByText('🔥 7 Days', { exact: true })).toBeVisible();
  await expect(
    restored.getByRole('button', { name: 'Garden Tended Today', exact: true })
  ).toBeDisabled();
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(1);
});

test('the thumbnail uses pre-rendered scenery without WebGL and refreshes after theme and growth changes', async ({
  page,
}) => {
  test.setTimeout(60000);
  await setup(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    (window as any).__previewDraws = 0;
    for (const name of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced',
    ] as const) {
      const original = WebGL2RenderingContext.prototype[name];
      (WebGL2RenderingContext.prototype as any)[name] = function (...args: any[]) {
        (window as any).__previewDraws++;
        return (original as any).apply(this, args);
      };
    }
  });
  await page.goto('/app/today');
  const preview = page.getByRole('button', { name: 'Open Zen Garden', exact: true });
  await preview.scrollIntoViewIfNeeded();
  const snapshot = preview.locator('.island-snapshot');
  await expect(snapshot).toBeVisible({ timeout: 15000 });
  await expect
    .poll(() => snapshot.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBe(512);
  await expect(preview.locator('canvas')).toHaveCount(0);
  expect(await snapshot.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  const firstImage = await snapshot.getAttribute('src');
  const draws = await page.evaluate(() => (window as any).__previewDraws);
  expect(draws).toBe(0);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => (window as any).__previewDraws)).toBe(draws);
  const garden = await open(page);
  await garden.getByRole('button', { name: 'Golden dusk', exact: true }).click();
  await garden.getByRole('button', { name: 'Close modal', exact: true }).click();
  await expect(garden).toBeHidden();
  await expect(preview).toHaveAttribute('data-theme', 'dusk');
  await expect(snapshot).toBeVisible({ timeout: 15000 });
  await expect.poll(() => snapshot.getAttribute('src')).not.toBe(firstImage);
  const duskImage = await snapshot.getAttribute('src');
  // Two different saved categories reach the next flower-count boundary.
  await page.getByRole('button', { name: 'Quick log 250ml water', exact: true }).click();
  const reopened = await open(page);
  await reopened.getByRole('button', { name: 'Water Garden', exact: true }).click();
  await reopened.getByRole('button', { name: 'Close modal', exact: true }).click();
  await expect(snapshot).toBeVisible({ timeout: 15000 });
  await expect.poll(() => snapshot.getAttribute('src')).not.toBe(duskImage);
  await expect(preview.locator('canvas')).toHaveCount(0);
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(2);
});

test('thumbnail and garden share the exact same image when WebGL is unavailable', async ({
  page,
}) => {
  await setup(page, 60, true);
  await page.goto('/app/today');
  const preview = page.getByRole('button', { name: 'Open Zen Garden', exact: true });
  const garden = await open(page);
  await expect(preview.locator('canvas')).toHaveCount(0);
  await expect(garden.locator('.zen-canvas > img.island-snapshot')).toBeVisible();
  await garden.getByRole('button', { name: 'Blossom', exact: true }).click();
  const theme = await garden.locator('.zen-scene').getAttribute('data-theme');
  await expect(preview).toHaveAttribute('data-theme', theme!);
  expect(await preview.locator('.island-snapshot').getAttribute('src')).toBe(
    await garden.locator('.zen-canvas > img.island-snapshot').getAttribute('src')
  );
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(180);
});

test('repeated successful and failed API calls are observable without producing rewards', async ({
  page,
}) => {
  await setup(page);
  await page.route('**/api/gemini**', (route) =>
    route.fulfill({
      status: route.request().url().includes('failure') ? 503 : 200,
      json: { audit: true },
    })
  );
  await page.goto('/app/today');
  await expect(page.getByRole('button', { name: 'Open Zen Garden' })).toBeVisible();
  await page.evaluate(async () => {
    for (let n = 0; n < 20; n++)
      await fetch('/api/gemini?private=fake', {
        method: 'POST',
        body: 'synthetic private payload',
      });
    await fetch('/api/gemini?failure=true');
    window.dispatchEvent(new Event('pagehide'));
  });
  const receipts = (await ledger(page)).receipts;
  expect(receipts).toEqual({});
  const telemetry = await page.evaluate(() =>
    sessionStorage.getItem('hc_gamification_activity:hc_unified_profile_guest:profile_1')
  );
  expect(telemetry).not.toMatch(/fake|payload|failure=true/);
  expect(JSON.parse(telemetry!).counts['api:/api/gemini']).toEqual({ completed: 20, failed: 1 });
});

test('saved water records, a Gut question and tending share one capped daily ledger', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/app/today');
  const water = page.getByRole('button', { name: 'Quick log 250ml water', exact: true });
  await water.click();
  await expect.poll(async () => Object.keys((await ledger(page)).receipts).length).toBe(1);
  await water.click();
  await page.goto('/app/today?gut=1&view=deep');
  const gut = page.getByRole('dialog', { name: 'Gut Health', exact: true });
  await gut
    .getByLabel('Your question or situation')
    .fill('Could a change in meal timing explain this week’s bloating?');
  await gut.getByRole('button', { name: 'Explore without AI', exact: true }).click();
  await gut.getByRole('button', { name: 'Open my connection map', exact: true }).click();
  await expect.poll(async () => Object.keys((await ledger(page)).receipts).length).toBe(2);
  await page.goto('/app/today');
  const garden = await open(page);
  await garden.getByRole('button', { name: 'Water Garden', exact: true }).click();
  await expect(
    garden.getByRole('img', {
      name: /Your island: A little sanctuary, 6 growth, 1 participation days/,
    })
  ).toBeVisible();
  const receipts = Object.values((await ledger(page)).receipts) as { type: string }[];
  expect(receipts.map((item) => item.type).sort()).toEqual([
    'garden.tended',
    'record.saved',
    'reflection.saved',
  ]);
  await garden.getByRole('button', { name: 'Close modal' }).click();
  const points = await openPoints(page);
  await expect(points.getByTestId('vitality-total')).toHaveText('20');
  await points.getByRole('button', { name: 'History', exact: true }).click();
  await expect(
    points.getByTestId('points-history').getByText('+5 PTS', { exact: true })
  ).toHaveCount(3);
});

test('Back remains reachable inside phone safe areas and restores the dashboard without changing rewards', async ({
  page,
}) => {
  test.setTimeout(60000);
  await setup(page, 10, true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app/today');
  const trigger = page.getByRole('button', { name: 'Open Zen Garden', exact: true });
  for (const device of [
    { width: 320, height: 568, top: 0, bottom: 0, side: 0 },
    { width: 390, height: 844, top: 44, bottom: 34, side: 0 },
    { width: 844, height: 390, top: 0, bottom: 21, side: 44 },
  ]) {
    await page.setViewportSize({ width: device.width, height: device.height });
    const insets = await page.addStyleTag({
      content:
        '.zen-modal-backdrop { --safe-area-top: ' +
        device.top +
        'px; --safe-area-bottom: ' +
        device.bottom +
        'px; --safe-area-left: ' +
        device.side +
        'px; --safe-area-right: ' +
        device.side +
        'px; }',
    });
    const garden = await open(page);
    const sheet = garden.locator('.zen-modal-sheet');
    const back = garden.getByRole('button', { name: 'Back', exact: true });
    const bounds = await sheet.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(Math.max(8, device.side) - 1);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      device.width - Math.max(8, device.side) + 1
    );
    expect(bounds!.y).toBeGreaterThanOrEqual(Math.max(12, device.top) - 1);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
      device.height - Math.max(8, device.bottom) + 1
    );
    expect(
      await sheet.evaluate((node) => {
        const style = getComputedStyle(node);
        return [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomLeftRadius,
          style.borderBottomRightRadius,
        ].every((radius) => parseFloat(radius) >= 16);
      })
    ).toBe(true);
    expect(await garden.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    const start = await back.boundingBox();
    expect(start!.width).toBeGreaterThanOrEqual(44);
    expect(start!.height).toBeGreaterThanOrEqual(44);
    await garden.getByRole('button', { name: 'How it grows', exact: true }).click();
    await garden
      .getByText('Garden Streak', { exact: true })
      .evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await expect(garden.getByText('Garden Streak', { exact: true })).toBeInViewport();
    await expect(back).toBeInViewport();
    await expect(garden.getByRole('button', { name: 'Close modal', exact: true })).toBeInViewport();
    expect((await back.boundingBox())!.y).toBeCloseTo(start!.y, 0);
    const content = await garden.locator('.zen-modal-content').boundingBox();
    const metrics = await garden.locator('.zen-garden-metrics').boundingBox();
    expect(metrics!.y + metrics!.height).toBeLessThanOrEqual(content!.y + content!.height + 1);
    const background = page.locator('#main-content');
    const scrollTop = await background.evaluate((node) => node.scrollTop);
    await back.hover();
    await page.mouse.wheel(0, 320);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
    );
    expect(await background.evaluate((node) => node.scrollTop)).toBe(scrollTop);
    const receipts = Object.keys((await ledger(page)).receipts).length;
    await back.click();
    await expect(garden).toBeHidden();
    await expect(page).toHaveURL(/\/app\/today$/);
    await expect(trigger).toBeFocused();
    expect(Object.keys((await ledger(page)).receipts)).toHaveLength(receipts);
    await insets.evaluate((node) => node.remove());
  }
});

test('Back from the embedded garden returns to Whole Health without closing its dialog', async ({
  page,
}) => {
  await setup(page, 3, true);
  await page.goto('/app/ava');
  const trigger = page.getByRole('button', { name: 'Whole Health', exact: true });
  // WebKit does not focus buttons on pointer clicks; establish keyboard focus.
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', {
    name: 'Whole Health Picture and Food Sensitivities',
    exact: true,
  });
  await dialog.getByRole('button', { name: 'Zen Garden', exact: true }).click();
  const back = dialog.getByRole('button', { name: 'Back', exact: true });
  await expect(back).toBeInViewport();
  await expect(dialog.locator('.zen-garden')).toBeVisible();
  const receipts = Object.keys((await ledger(page)).receipts).length;
  await back.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.zen-garden')).toHaveCount(0);
  await expect(back).toHaveCount(0);
  await expect(page).toHaveURL(/\/app\/ava$/);
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(receipts);
  await dialog.getByRole('button', { name: 'Close modal', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Whole Health', exact: true })).toBeFocused();
});
