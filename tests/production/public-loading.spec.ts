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
  await page.route(/https:\/\//, (route) => route.abort());
  await page.addInitScript(() => localStorage.clear());
  return { release, requested: () => requested };
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

test('all workflow examples and FAQ remain readable while account loading is unavailable', async ({
  page,
}) => {
  const dependencies = await holdAuthClient(page);
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Necessary only' }).click();
    await expect(page.getByRole('region', { name: 'Privacy and Terms Preferences' })).toHaveCount(
      0
    );
    const overview = page.getByRole('region', { name: 'Connected case workflow examples' });
    const cards = overview.getByRole('article');
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      const heading = card.getByRole('heading');
      await heading.scrollIntoViewIfNeeded();
      await expect(heading).toBeInViewport();
      expect(await card.evaluate((element) => getComputedStyle(element).animationName)).toBe(
        'none'
      );
    }
    const question = page.getByRole('button', { name: /replacement for my doctor/i });
    await question.click();
    await expect(question).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('region', { name: /replacement for my doctor/i })).toContainText(
      'does not diagnose'
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
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

test('a workflow example supports keyboard navigation, view changes and return focus', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.route(/https:\/\//, (route) => route.abort());
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const trigger = page
    .getByRole('button', { name: 'Inspect Reasoning Design', exact: true })
    .first();
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-modal', 'true');
  const close = dialog.getByRole('button', { name: 'Close workflow example' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Open example case' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  const comparison = dialog.getByRole('button', { name: 'Compare example readings' });
  await comparison.click();
  await expect(comparison).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByRole('button', { name: 'Evidence and questions' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
  const details = dialog.getByRole('region', { name: 'Workflow example details' });
  expect(await details.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true
  );
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('opening an example closes its dialog and shows loading until account restoration finishes', async ({
  page,
}) => {
  test.setTimeout(60_000);
  const auth = await holdAuthClient(page);
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Necessary only' }).click();
    await page
      .getByRole('button', { name: 'Inspect Reasoning Design', exact: true })
      .first()
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Open example case' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText('Opening your workspace…', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('hc_guest_mode'))).toBeNull();
    auth.release();
    await expect(page).toHaveURL(/\/app\/cases\/[^/]+$/);
    await expect(
      page.getByRole('heading', {
        name: '[Example] Fatigue, Iron Results & a Post-Viral Timeline',
        exact: true,
      })
    ).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('hc_guest_mode'))).toBe('true');
  } finally {
    auth.release();
  }
});
