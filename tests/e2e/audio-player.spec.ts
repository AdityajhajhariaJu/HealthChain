import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    if (!localStorage.getItem('hc_unified_profile_guest'))
      localStorage.setItem(
        'hc_unified_profile_guest',
        JSON.stringify({
          activeId: 'profile_1',
          profiles: {
            profile_1: {
              id: 'profile_1',
              profileName: 'Audio test',
              demographics: { name: 'Synthetic guest', updatedAt: '2026-01-01T00:00:00Z' },
            },
          },
        })
      );
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
}
async function openPlayer(page: Page, navigate = true) {
  if (navigate) await page.goto('/app/today');
  const trigger = page.getByRole('button', { name: 'Play Full Meditation', exact: true });
  if (navigate) await trigger.click();
  else {
    await trigger.focus();
    await trigger.press('Enter');
  }
  const player = page.getByRole('dialog', { name: 'Calm audio player', exact: true });
  await expect(player.getByRole('heading', { name: 'Tranquil Breathing Space' })).toBeVisible();
  return player;
}

test('plays real audio, searches tracks, and honours rapid selections without resetting mute', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const player = await openPlayer(page);
  const audio = player.locator('audio').first();
  await expect(audio).toHaveAttribute('preload', 'metadata');
  await expect
    .poll(() => audio.evaluate((node: HTMLAudioElement) => node.readyState))
    .toBeGreaterThan(0);
  if (await player.getByRole('button', { name: 'Play', exact: true }).isVisible())
    await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() => audio.evaluate((node: HTMLAudioElement) => !node.paused && node.currentTime > 0))
    .toBe(true);
  await player.getByRole('slider', { name: 'Seek track' }).fill('40');
  await expect
    .poll(() => audio.evaluate((node: HTMLAudioElement) => node.currentTime))
    .toBeGreaterThanOrEqual(39);
  await page.screenshot({ path: '.git/audio-player-mobile.png' });
  await player.getByRole('button', { name: 'Mute', exact: true }).click();
  await expect.poll(() => audio.evaluate((node: HTMLAudioElement) => node.muted)).toBe(true);
  await player.getByRole('button', { name: 'Open sound library' }).click();
  const library = page.getByRole('dialog', { name: 'Sound library', exact: true });
  await page.screenshot({ path: '.git/audio-library-mobile.png' });
  await library.getByRole('searchbox', { name: 'Search sounds' }).fill('sacred');
  await expect(library.getByRole('button', { name: /^Play / })).toHaveCount(1);
  await library.getByRole('button', { name: 'Play Sacred Stillness', exact: true }).click();
  await expect(player.getByRole('heading', { name: 'Sacred Stillness' })).toBeVisible();
  await player.getByRole('button', { name: 'Next Track' }).click();
  await player.getByRole('button', { name: 'Next Track' }).click();
  await expect(player.getByRole('heading', { name: 'Celestial Reflection' })).toBeVisible();
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => node.currentSrc)
    )
    .toContain('Celestial%20Reflection');
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => node.muted)
    )
    .toBe(true);
  await player.getByRole('button', { name: 'Shuffle', exact: true }).click();
  await expect(player.getByRole('button', { name: 'Shuffle' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await player.getByRole('button', { name: 'Repeat: playlist' }).click();
  await expect(player.getByRole('button', { name: 'Repeat: one track' })).toBeVisible();
  await player
    .locator('audio')
    .first()
    .evaluate((node: HTMLAudioElement) => {
      node.currentTime = node.duration - 0.25;
    });
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => !node.paused && node.currentTime < 10)
    )
    .toBe(true);
  const closedAudio = await player.locator('audio').first().elementHandle();
  await player.getByRole('button', { name: 'Close Player' }).click();
  await expect(player).toHaveCount(0);
  expect(await closedAudio!.evaluate((node: HTMLAudioElement) => node.paused)).toBe(true);
  expect(errors).toEqual([]);
});

test('ambient layers pause with the main track and stop on close', async ({ page }) => {
  test.setTimeout(90_000);
  await setup(page);
  const player = await openPlayer(page);
  if (await player.getByRole('button', { name: 'Play', exact: true }).isVisible())
    await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => !node.paused)
    )
    .toBe(true);
  await player.getByRole('button', { name: 'Ambient Layer Mixer' }).click();
  await player.getByRole('button', { name: /Rain on Glass/ }).click();
  const ambient = player.locator('audio').nth(1);
  await expect
    .poll(() => ambient.evaluate((node: HTMLAudioElement) => !node.paused && node.currentTime > 0))
    .toBe(true);
  await page.keyboard.press('Escape');
  await player.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect.poll(() => ambient.evaluate((node: HTMLAudioElement) => node.paused)).toBe(true);
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect.poll(() => ambient.evaluate((node: HTMLAudioElement) => !node.paused)).toBe(true);
  const closedAmbient = await ambient.elementHandle();
  await player.getByRole('button', { name: 'Close Player' }).click();
  await expect(player).toHaveCount(0);
  expect(await closedAmbient!.evaluate((node: HTMLAudioElement) => node.paused)).toBe(true);
});

test('shuffle visits each track once and repeat off stops at the end of the collection', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await setup(page);
  const player = await openPlayer(page);
  await player.getByRole('button', { name: 'Open sound library' }).click();
  const library = page.getByRole('dialog', { name: 'Sound library', exact: true });
  const count = await library.getByRole('button', { name: /^Play / }).count();
  await page.keyboard.press('Escape');
  await player.getByRole('button', { name: 'Shuffle', exact: true }).click();
  await player.getByRole('button', { name: 'Repeat: playlist' }).click();
  await player.getByRole('button', { name: 'Repeat: one track' }).click();
  const titles = new Set<string>();
  for (let index = 0; index < count; index++) {
    const title = (await player.getByRole('heading', { level: 3 }).textContent())!;
    expect(titles.has(title)).toBe(false);
    titles.add(title);
    if (index < count - 1) {
      const next = player.getByRole('button', { name: 'Next Track' });
      await next.focus();
      await next.press('Enter');
    }
  }
  const lastTitle = await player.getByRole('heading', { level: 3 }).textContent();
  const audio = player.locator('audio').first();
  await expect
    .poll(() => audio.evaluate((node: HTMLAudioElement) => node.readyState), { timeout: 15_000 })
    .toBeGreaterThan(0);
  if (await player.getByRole('button', { name: 'Play', exact: true }).isVisible())
    await player.getByRole('button', { name: 'Play', exact: true }).click();
  await audio.evaluate((node: HTMLAudioElement) => {
    node.currentTime = node.duration - 0.25;
  });
  await expect
    .poll(() => audio.evaluate((node: HTMLAudioElement) => node.paused && node.ended))
    .toBe(true);
  await expect(player.getByRole('heading', { level: 3 })).toHaveText(lastTitle!);
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});

test('downloads persist across reload and can be cleared', async ({ page }) => {
  test.setTimeout(90_000);
  await setup(page);
  let player = await openPlayer(page);
  await player.getByRole('button', { name: 'Download current track' }).click();
  await expect(player.getByRole('button', { name: 'Track downloaded' })).toBeVisible({
    timeout: 30_000,
  });
  await page.reload();
  player = await openPlayer(page, false);
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => node.src.startsWith('blob:'))
    )
    .toBe(true);
  await player.getByRole('button', { name: 'Open sound library' }).click();
  const library = page.getByRole('dialog', { name: 'Sound library', exact: true });
  await library.getByRole('button', { name: 'Downloaded', exact: true }).click();
  await expect(library.getByRole('button', { name: /^Play / })).toHaveCount(1);
  await library.getByRole('button', { name: 'Clear downloads' }).click();
  await expect(library.getByText('Your offline collection', { exact: true })).toBeVisible();
  await expect(library.getByText('0.0 / 100 MB', { exact: true })).toBeVisible();
});

test('a downloaded track plays without network access', async ({ page, context, browserName }) => {
  test.skip(
    browserName === 'webkit' && process.platform === 'win32',
    'Windows WebKit uses a Media Foundation URL loader without Blob media support. Run on macOS or iPhone for Safari acceptance. https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/graphics/win/MediaPlayerPrivateMediaFoundation.cpp'
  );
  test.setTimeout(90_000);
  await setup(page);
  let player = await openPlayer(page);
  await player.getByRole('button', { name: 'Download current track' }).click();
  await expect(player.getByRole('button', { name: 'Track downloaded' })).toBeVisible({
    timeout: 30_000,
  });
  await page.reload();
  player = await openPlayer(page, false);
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => node.src.startsWith('blob:'))
    )
    .toBe(true);
  await context.setOffline(true);
  if (await player.getByRole('button', { name: 'Play', exact: true }).isVisible())
    await player.getByRole('button', { name: 'Play', exact: true }).click();
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => !node.paused && node.currentTime > 0)
    )
    .toBe(true);
  await expect(player.getByText('Playing offline', { exact: true })).toBeVisible();
  await context.setOffline(false);
});

test('a failed stream gives a recoverable error and retry loads the chosen track', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await setup(page);
  const player = await openPlayer(page);
  // WebKit's native media requests can bypass Playwright routing on Windows.
  // A genuinely absent URL exercises the real media error event in both engines.
  await expect
    .poll(
      () =>
        player
          .locator('audio')
          .first()
          .evaluate((node: HTMLAudioElement) => node.readyState),
      { timeout: 15_000 }
    )
    .toBeGreaterThan(0);
  await player
    .locator('audio')
    .first()
    .evaluate((node: HTMLAudioElement) => {
      node.src = '/audio/__unavailable_sound__.m4a';
      node.load();
    });
  await expect(player.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(player.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await player.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect
    .poll(() =>
      player
        .locator('audio')
        .first()
        .evaluate((node: HTMLAudioElement) => node.readyState)
    )
    .toBeGreaterThan(0);
  await expect(player.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
});

for (const viewport of [
  { width: 320, height: 760 },
  { width: 390, height: 460 },
  { width: 844, height: 390 },
]) {
  test(`player and searchable library fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await setup(page);
    await page.setViewportSize(viewport);
    const player = await openPlayer(page);
    const controls = player.getByRole('region', { name: 'Audio player' });
    const box = await controls.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await player.getByRole('button', { name: 'Open sound library' }).click();
    const library = page.getByRole('dialog', { name: 'Sound library', exact: true });
    await library.getByRole('searchbox').fill('zzzz');
    await expect(library.getByText('No sounds found')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(library).toHaveCount(0);
    await expect(player).toBeVisible();
  });
}
