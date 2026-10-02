import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page, days = 0, noWebGL = false) {
  await page.addInitScript(
    ({ days, noWebGL }) => {
      localStorage.setItem('hc_guest_mode', 'true');
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
  await expect(garden.getByRole('heading', { name: 'Your little island' })).toBeVisible();
  return garden;
};

test('live island loads 3D on demand, tends once, persists its atmosphere and shares point history', async ({
  page,
}) => {
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
  await garden.getByRole('button', { name: 'Tend your island', exact: false }).click();
  await expect(
    garden.getByRole('button', { name: 'Your island is tended today', exact: false })
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
    reopened.getByRole('button', { name: 'Your island is tended today', exact: false })
  ).toBeDisabled();
  await reopened.getByRole('button', { name: 'Points & activity' }).click();
  const points = page.getByRole('dialog', { name: 'Vitality points', exact: true });
  await expect(points).toBeVisible();
  await points.getByRole('button', { name: 'History', exact: true }).click();
  await expect(points.getByText('Your island tended', { exact: true })).toBeVisible();
  await expect(
    points.locator('.points-history').getByText('+5 points', { exact: false })
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
  await expect(garden.getByText('Your cozy haven', { exact: true })).toBeVisible();
  await expect(garden.getByText('Your haven is flourishing', { exact: true })).toBeVisible();
  await garden.getByRole('button', { name: 'Trophy Cabinet', exact: false }).click();
  await expect(page).toHaveURL(/\/app\/trophies$/);
  await expect(page.getByText('A cozy haven', { exact: true })).toBeVisible();
  await expect(page.getByText('Still waters', { exact: true })).toBeVisible();
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
  await expect(garden.getByText('A peaceful pond', { exact: true })).toBeVisible();
  await garden.getByRole('button', { name: 'Turn island left' }).click();
  await garden.getByRole('button', { name: 'Reset island view' }).click();
  await garden.getByRole('button', { name: 'Blossom', exact: true }).click();
  await garden.getByText('How your island grows', { exact: true }).click();
  await expect(garden.getByText('Daily limits use UTC.', { exact: false })).toBeVisible();
  expect(await garden.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await garden
    .getByRole('button', { name: 'Trophy Cabinet', exact: false })
    .scrollIntoViewIfNeeded();
  await expect(garden.getByRole('button', { name: 'Points & activity' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(garden).toBeHidden();
  await expect(page.getByRole('button', { name: 'Open Zen Garden' })).toBeFocused();
});

test('WebGL-unavailable devices retain the illustrated island and functioning tending', async ({
  page,
}) => {
  await setup(page, 0, true);
  await page.goto('/app/today');
  const garden = await open(page);
  await expect(garden.locator('.zen-canvas .island-artwork')).toBeVisible();
  await garden.getByRole('button', { name: 'Tend your island', exact: false }).click();
  await expect(
    garden.locator('.zen-recent').getByText('Your island tended', { exact: false })
  ).toBeVisible();
  expect(Object.keys((await ledger(page)).receipts)).toHaveLength(1);
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
  await garden.getByRole('button', { name: 'Tend your island', exact: false }).click();
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
  await garden.getByRole('button', { name: 'Points & activity' }).click();
  const points = page.getByRole('dialog', { name: 'Vitality points', exact: true });
  await expect(points.locator('.points-totals').getByText('20', { exact: true })).toBeVisible();
  await points.getByRole('button', { name: 'History', exact: true }).click();
  await expect(points.locator('.points-history li')).toHaveCount(3);
});
