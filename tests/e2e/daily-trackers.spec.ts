import { test, expect, Page } from '@playwright/test';

test.setTimeout(90000);
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => console.error('Browser error:', error.message));
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.goto('/app/today');
  await expect(page.getByRole('button', { name: 'Quick log 250ml water' })).toBeVisible({
    timeout: 30000,
  });
});

async function seedProfile(page: Page) {
  await page.evaluate(async () => {
    const path = '/src/services/ProfileEngine.js';
    const engine = await import(/* @vite-ignore */ path);
    const profile = engine.getProfile();
    profile.demographics = { age: 28, gender: 'Male', height: '172', weight: '70' };
    profile.medications = [
      {
        id: 'audit_med',
        name: 'Metformin',
        dosage: 'My saved directions',
        time: '08:30',
        enabled: true,
        source: 'audit',
      },
    ];
    await engine.saveProfile(profile);
  });
}

test('water quick add, modal undo, target and reload share the same data', async ({ page }) => {
  const card = page.getByRole('button', { name: 'Daily Hydration - Open intake tracker' });
  await page.getByRole('button', { name: 'Quick log 250ml water' }).click();
  await expect(card).toContainText(/250\s*\/\s*2,000 ml/);
  await card.click();
  const dialog = page.getByRole('dialog', { name: 'Hydration Tracker' });
  await dialog.getByRole('button', { name: /500 ml/ }).click();
  await expect(card).toContainText(/750\s*\/\s*2,000 ml/);
  await dialog.getByRole('button', { name: 'Undo last' }).click();
  await expect(card).toContainText(/250\s*\/\s*2,000 ml/);
  await dialog.getByRole('button', { name: '2.5 L', exact: true }).click();
  await expect(card).toContainText(/250\s*\/\s*2,500 ml/);
  await dialog.getByRole('button', { name: 'Toggle daylight reminders' }).click();
  await expect(dialog.getByText(/Reminders unavailable/)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(card).toContainText(/250\s*\/\s*2,500 ml/);
});

test('mobile scheduler additions appear in the baseline and baseline removal removes the schedule', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedProfile(page);
  await page.getByRole('button', { name: /Daily Meds & Vitamins -/ }).click();
  await page
    .getByPlaceholder('Medication or supplement name', { exact: false })
    .fill('My supplement');
  await page
    .getByPlaceholder("Your label or prescriber's directions (optional)")
    .fill('My directions');
  await page.getByLabel('Choose your reminder time').fill('14:00');
  await page.getByRole('button', { name: '+ Add to Daily Regimen', exact: true }).click();
  await expect(page.getByLabel('Reminder time for My supplement')).toHaveValue('14:00');
  await page.keyboard.press('Escape');
  const banner = page.locator('.feature-profile-data-banner');
  await expect(banner).toContainText('My supplement');
  await banner.getByLabel('Remove medication My supplement').click();
  await page.getByRole('button', { name: /Daily Meds & Vitamins -/ }).click();
  await expect(page.getByLabel('Reminder time for My supplement')).toHaveCount(0);
});

for (const timezoneId of ['UTC', 'Asia/Kolkata']) {
  test.describe(`daily boundary in ${timezoneId}`, () => {
    test.use({ timezoneId });
    test('open dashboard and scheduler reset daily status at local midnight', async ({ page }) => {
      // Construct the instant in the browser's local zone, pause in the future,
      // then mount the app so all of its timers belong to the controlled clock.
      const start = await page.evaluate(() => new Date(2026, 8, 29, 23, 59, 0).getTime());
      await page.clock.install({ time: start });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.reload();
      await expect(page.getByRole('button', { name: 'Quick log 250ml water' })).toBeVisible({
        timeout: 30000,
      });
      // Let lazy route initialization run before pausing five seconds before midnight.
      await page.clock.pauseAt(start + 55000);
      await seedProfile(page);
      await page.getByRole('button', { name: 'Quick log 250ml water' }).click();
      await page.getByRole('button', { name: 'Mark daily meds taken' }).click();
      await page.getByRole('button', { name: /Daily Meds & Vitamins -/ }).click();
      await expect(page.getByText('1 of 1 scheduled doses taken')).toBeVisible();
      await page.clock.runFor(6000);
      await expect(page.getByText('0 of 1 scheduled doses taken')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Daily Hydration - Open intake tracker' })
      ).toContainText(/0\s*\/\s*2,000 ml/);
    });
  });
}

test('legacy schedule migrates with existing dose logs and deleted entries do not return', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const path = '/src/services/ProfileEngine.js';
    const engine = await import(/* @vite-ignore */ path);
    const scope = `${engine.getProfileKey()}:profile_1`;
    localStorage.removeItem(`hc_medication_schedule_linked:${scope}`);
    const state = engine.getProfileEngineState();
    delete state.profiles.profile_1.medicationScheduleLinked;
    state.profiles.profile_1.medications = [];
    localStorage.setItem(engine.getProfileKey(), JSON.stringify(state));
    localStorage.setItem(
      `healthchain_vitamins_schedule_v2:${scope}`,
      JSON.stringify([
        { id: 'legacy_custom', name: 'Legacy medicine', time: '10:00', enabled: true },
      ])
    );
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem(
      `healthchain_vitamins_taken_logs_${day}:${scope}`,
      JSON.stringify({ legacy_custom: true })
    );
    window.dispatchEvent(new Event('hc_profile_updated'));
  });
  const card = page.getByRole('button', { name: /Daily Meds & Vitamins -/ });
  await expect(card).toHaveAttribute('aria-label', /All Taken/);
  await card.click();
  await expect(page.getByLabel('Reminder time for Legacy medicine')).toHaveValue('10:00');
  await page.getByRole('button', { name: 'Remove Legacy medicine', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(card).toContainText('0 Active');
});

test('baseline medicines reach the schedule and baseline edits preserve time, ID and adherence', async ({
  page,
}) => {
  await seedProfile(page);
  const card = page.getByRole('button', { name: /Daily Meds & Vitamins -/ });
  await expect(card).toContainText('1 dose remaining');
  await card.click();
  const time = page.getByLabel('Reminder time for Metformin');
  await expect(time).toHaveValue('08:30');
  await time.fill('21:30');
  await page.getByRole('button', { name: 'Take Dose', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(card).toHaveAttribute('aria-label', /All Taken/);
  await page.getByRole('button', { name: 'Edit Baseline' }).click();
  await page.getByRole('button', { name: 'Save Baseline & Sync Across Features' }).click();
  await page.reload();
  await card.click();
  await expect(time).toHaveValue('21:30');
  const med = await page.evaluate(async () => {
    const path = '/src/services/VitaminScheduleService.ts';
    return (await import(/* @vite-ignore */ path)).getVitaminSchedule()[0];
  });
  expect(med).toMatchObject({ id: 'audit_med', source: 'audit', takenToday: true, time: '21:30' });
  await page.getByRole('button', { name: 'Remove Metformin', exact: true }).last().click();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(card).toContainText('0 Active');
  await expect(page.locator('.feature-profile-data-banner')).not.toContainText('Metformin');
});

test('baseline-only medicine needs an explicit time and zero medicines cannot show all taken', async ({
  page,
}) => {
  await seedProfile(page);
  await page.evaluate(async () => {
    const path = '/src/services/ProfileEngine.js';
    const engine = await import(/* @vite-ignore */ path);
    const profile = engine.getProfile();
    profile.medications = ['New baseline medicine'];
    await engine.saveProfile(profile);
  });
  const card = page.getByRole('button', { name: /Daily Meds & Vitamins -/ });
  await expect(card).toContainText('0 Active');
  await card.click();
  await expect(page.getByText('Choose a time', { exact: true })).toBeVisible();
  await page.getByLabel('Reminder time for New baseline medicine').fill('09:15');
  await page.keyboard.press('Escape');
  await expect(card).toContainText('1 dose remaining');
});

test('baseline edits preserve two reminders for the same medicine and reject invalid measurements', async ({
  page,
}) => {
  await seedProfile(page);
  await page.evaluate(async () => {
    const path = '/src/services/VitaminScheduleService.ts';
    const service = await import(/* @vite-ignore */ path);
    const first = service.getVitaminSchedule()[0];
    await service.saveVitaminSchedule([first, { ...first, id: 'second_dose', time: '20:30' }]);
    service.markAllVitaminsTaken();
  });
  await page.getByRole('button', { name: 'Edit Baseline' }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit saved health profile' });
  await dialog.getByLabel('Height', { exact: true }).fill('0');
  await dialog.getByRole('button', { name: 'Save Baseline & Sync Across Features' }).click();
  await expect(dialog.getByRole('alert')).toContainText('positive values');
  await dialog.getByLabel('Height', { exact: true }).fill('172');
  await dialog.getByRole('button', { name: 'Save Baseline & Sync Across Features' }).click();
  const meds = await page.evaluate(async () => {
    const path = '/src/services/VitaminScheduleService.ts';
    return (await import(/* @vite-ignore */ path)).getVitaminSchedule();
  });
  expect(meds.map((m: any) => [m.id, m.time, m.takenToday])).toEqual([
    ['audit_med', '08:30', true],
    ['second_dose', '20:30', true],
  ]);
  await page
    .locator('.feature-profile-data-banner')
    .getByLabel('Remove medication Metformin')
    .first()
    .click();
  const habit = await page.evaluate(async () => {
    const path = '/src/services/profileScope.ts';
    const scope = await import(/* @vite-ignore */ path);
    const svcPath = '/src/services/VitaminScheduleService.ts';
    const svc = await import(/* @vite-ignore */ svcPath);
    return JSON.parse(
      localStorage.getItem(scope.getHabitStorageKey(svc.getTodayDateString())) || '{}'
    ).vitamins;
  });
  expect(habit).toBe(false);
});

test('dashboard refreshes when account scope changes and restores isolated values', async ({
  page,
}) => {
  await seedProfile(page);
  await page.getByRole('button', { name: 'Quick log 250ml water' }).click();
  await page.evaluate(async () => {
    const path = '/src/services/ProfileEngine.js';
    const engine = await import(/* @vite-ignore */ path);
    localStorage.setItem('hc_guest_mode', 'false');
    localStorage.setItem('hc_account', JSON.stringify({ id: 'audit_other' }));
    window.dispatchEvent(new Event('hc_profile_updated'));
  });
  await expect(
    page.getByRole('button', { name: 'Daily Hydration - Open intake tracker' })
  ).toContainText(/0\s*\/\s*2,000 ml/);
  await expect(page.getByRole('button', { name: /Daily Meds & Vitamins -/ })).toContainText(
    '0 Active'
  );
  await page.evaluate(async () => {
    const path = '/src/services/ProfileEngine.js';
    const engine = await import(/* @vite-ignore */ path);
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.removeItem('hc_account');
    window.dispatchEvent(new Event('hc_profile_updated'));
  });
  await expect(
    page.getByRole('button', { name: 'Daily Hydration - Open intake tracker' })
  ).toContainText(/250\s*\/\s*2,000 ml/);
  await expect(page.getByRole('button', { name: /Daily Meds & Vitamins -/ })).toContainText(
    '1 dose remaining'
  );
});

test('notification drawer actions record a dose and a glass in the shared trackers', async ({
  page,
}) => {
  await seedProfile(page);
  await page.getByRole('button', { name: 'View notifications' }).click();
  const drawer = page.getByRole('dialog', { name: 'Daily Notifications and Care Reminders' });
  await drawer.getByRole('button', { name: 'Mark Taken: Scheduled: Metformin' }).click();
  await drawer.getByRole('button', { name: '+1 Glass: Cellular Hydration Rhythm' }).click();
  const saved = await page.evaluate(async () => {
    const vitaminsPath = '/src/services/VitaminScheduleService.ts';
    const hydrationPath = '/src/services/HydrationService.ts';
    const vitamins = await import(/* @vite-ignore */ vitaminsPath);
    const hydration = await import(/* @vite-ignore */ hydrationPath);
    return {
      taken: vitamins.getVitaminSchedule()[0].takenToday,
      water: hydration.getHydrationData().currentMl,
    };
  });
  expect(saved).toEqual({ taken: true, water: 250 });
});

test('in-app dose banner reads the shared profile schedule at the saved minute', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 8, 29, 8, 59, 55) });
  await page.reload();
  await seedProfile(page);
  await page.evaluate(async () => {
    const path = '/src/services/VitaminScheduleService.ts';
    const service = await import(/* @vite-ignore */ path);
    await service.saveVitaminSchedule([{ ...service.getVitaminSchedule()[0], time: '09:00' }]);
  });
  await page.clock.runFor(26000);
  await expect(page.getByText('PILL ALERT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Take (+5)' }).click();
  await expect(page.getByText('PILL ALERT', { exact: true })).toHaveCount(0);
  const taken = await page.evaluate(async () => {
    const path = '/src/services/VitaminScheduleService.ts';
    return (await import(/* @vite-ignore */ path)).getVitaminSchedule()[0].takenToday;
  });
  expect(taken).toBe(true);
});

test('a test alert previews the pill banner without recording a dose', async ({ page }) => {
  await seedProfile(page);
  await page.getByRole('button', { name: /Daily Meds & Vitamins -/ }).click();
  await page.getByRole('button', { name: 'Test Alert' }).click();
  await expect(page.getByText('PILL ALERT', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss preview' }).click();
  const taken = await page.evaluate(async () => {
    const path = '/src/services/VitaminScheduleService.ts';
    return (await import(/* @vite-ignore */ path)).getVitaminSchedule()[0].takenToday;
  });
  expect(taken).toBe(false);
});
