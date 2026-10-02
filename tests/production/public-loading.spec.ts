import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

async function holdAuthClient(page: Page) {
  const manifest: Record<string, { name: string; file: string; isDynamicEntry?: boolean }> =
    JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
  const authChunks = Object.values(manifest).filter(
    (entry) => entry.name === 'supabaseClient' && entry.isDynamicEntry
  );
  expect(authChunks).toHaveLength(1);
  const [auth] = authChunks;
  const animations = manifest['src/features/auth/landingMotionFeatures.ts'];
  expect(animations).toBeDefined();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested = false;
  await page.route(`**/${auth.file}`, async (route) => {
    requested = true;
    await gate;
    await route.continue();
  });
  await page.route(`**/${animations.file}`, async (route) => {
    await gate;
    await route.continue();
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.addInitScript(() => localStorage.clear());
  return { release, animationFile: animations.file, requested: () => requested };
}

test('built landing renders and accepts consent while the auth client is still loading', async ({
  page,
}) => {
  const auth = await holdAuthClient(page);
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Your Health Story. Finally Connected.' })
    ).toBeVisible();
    await expect.poll(auth.requested).toBe(true);
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();
    await page.getByRole('button', { name: 'Necessary only' }).click();
    await expect(page.getByRole('region', { name: 'Privacy and Terms Preferences' })).toHaveCount(
      0
    );
    expect(await page.evaluate(() => localStorage.getItem('hc_cookies_accepted'))).toBe('declined');
  } finally {
    auth.release();
  }
});

test('unavailable optional animations leave the full landing and consent controls usable', async ({
  page,
}) => {
  const dependencies = await holdAuthClient(page);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.route(`**/${dependencies.animationFile}`, (route) => route.abort());
  const failedAnimation = page.waitForEvent('requestfailed', {
    predicate: (request) => request.url().endsWith(`/${dependencies.animationFile}`),
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await failedAnimation;
    await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();
    await page.getByRole('button', { name: 'Necessary only' }).click();
    await expect(page.getByRole('region', { name: 'Privacy and Terms Preferences' })).toHaveCount(
      0
    );
    expect(runtimeErrors).toEqual([]);
  } finally {
    dependencies.release();
  }
});

test('a built guest launch waits for auth restoration before choosing its storage scope', async ({
  page,
}) => {
  const auth = await holdAuthClient(page);
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Necessary only' }).click();
    await page.getByRole('button', { name: 'Get Started', exact: true }).click();
    await expect.poll(auth.requested).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('hc_guest_mode'))).toBeNull();
    auth.release();
    await expect(page).toHaveURL(/\/app\/consult\?new=true$/);
    await expect(page.getByRole('heading', { name: 'Which symptoms bother you?' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('hc_guest_mode'))).toBe('true');
  } finally {
    auth.release();
  }
});
