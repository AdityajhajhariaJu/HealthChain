import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route(/https:\/\//, (route) => route.abort());
});

test('anonymous landing does not download account recovery or clinical workspaces', async ({
  page,
}) => {
  const modules: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.endsWith('.js') || request.url().includes('/src/'))
      modules.push(request.url());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Your Health Story. Finally Connected.' })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Necessary only' }).click();
  await expect(page.getByRole('region', { name: 'Privacy and Terms Preferences' })).toHaveCount(0);
  expect(
    modules.filter((url) =>
      /AccountLifecycle|CaseEngine|HealthMemory|geminiService|clinicalReasoningEngine/.test(url)
    )
  ).toEqual([]);
});

test('landing text is visible immediately, zoom is available, and declining consent loads no tracking', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const tracking: string[] = [];
  page.on('request', (request) => {
    if (/googletagmanager|googleadservices|doubleclick/.test(request.url()))
      tracking.push(request.url());
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const heading = page.getByRole('heading', { name: 'Your Health Story. Finally Connected.' });
  await expect(heading).toBeVisible();
  expect(
    await heading.evaluate((element) => {
      let current: Element | null = element;
      while (current) {
        if (getComputedStyle(current).opacity !== '1') return false;
        current = current.parentElement;
      }
      return true;
    })
  ).toBe(true);
  await expect(page.locator('meta[name="viewport"]')).not.toHaveAttribute(
    'content',
    /user-scalable=no|maximum-scale=1/
  );
  await page.getByRole('button', { name: 'Necessary only' }).click();
  await expect(page.getByRole('region', { name: 'Privacy and Terms Preferences' })).toHaveCount(0);
  expect(tracking).toEqual([]);
  await page.screenshot({ path: `test-results/landing-mobile-top-${testInfo.project.name}.png` });
  const showcase = page.getByRole('region', { name: 'Connected case workflow examples' });
  const cards = showcase.getByRole('article');
  await expect(cards).toHaveCount(6);
  await cards.first().scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('heading', {
      name: 'What is HealthChain and How Can It Improve Doctor Visits?',
      exact: true,
    })
  ).toBeInViewport();
  const lastReport = page.getByRole('heading', {
    name: 'When a Report Is Hard to Interpret, Keep the Source Visible',
    exact: true,
  });
  await lastReport.scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('heading', {
      name: 'When a Report Is Hard to Interpret, Keep the Source Visible',
      exact: true,
    })
  ).toBeInViewport();
  for (const card of await cards.all()) {
    const title = card.getByRole('heading');
    await title.scrollIntoViewIfNeeded();
    await expect(title).toBeInViewport();
    expect(await card.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  }
  await cards.first().scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      showcase
        .locator('img')
        .first()
        .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)
    )
    .toBe(true);
  await page.screenshot({ path: `test-results/landing-mobile-cards-${testInfo.project.name}.png` });
  // Scrolling to distant interactive sections must preserve their controls.
  const question = page.getByRole('button', { name: /replacement for my doctor/i });
  await question.scrollIntoViewIfNeeded();
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  expect(tracking).toEqual([]);
});

test('accepting consent loads one Google SDK and configures Analytics and Ads', async ({
  page,
}) => {
  const tracking: string[] = [];
  await page.route('https://www.googletagmanager.com/gtag/js**', (route) => {
    tracking.push(route.request().url());
    return route.fulfill({ contentType: 'application/javascript', body: '/* consent SDK stub */' });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'I Accept', exact: true }).click();
  await expect.poll(() => tracking.length).toBe(1);
  const commands = await page.evaluate(() => (window as any).dataLayer);
  expect(commands).toContainEqual(['config', 'G-0JPQJJHTB6', { anonymize_ip: true }]);
  expect(commands).toContainEqual(['config', 'AW-18407555330']);
  expect(await page.evaluate(() => localStorage.getItem('hc_cookies_accepted'))).toBe('accepted');
});
