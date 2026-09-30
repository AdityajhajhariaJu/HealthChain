import { test, expect, type Page } from '@playwright/test';

async function setup(
  page: Page,
  reply = 'Review your records. You might ask your doctor: Could we discuss this symptom?'
) {
  const requests: any[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route('**/rest/v1/fitness_content*', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/gemini', (route) => {
    requests.push({
      operation: route.request().headers()['x-hc-operation'],
      body: route.request().postDataJSON(),
    });
    return route.fulfill({
      json: { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: reply }] } }] },
    });
  });
  await page.goto('/app/ava');
  await expect(
    page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' })
  ).toBeVisible();
  return requests;
}
async function send(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' }).fill(text);
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
}
async function choose(page: Page, label: RegExp) {
  await page.getByRole('button', { name: /Conversation: .*Change/ }).click();
  await page.getByRole('button', { name: label }).click();
}
test('case and General transcripts survive reload without leaking context or extracting memory', async ({
  page,
}) => {
  const requests = await setup(page);
  const ids = await page.evaluate(async () => {
    const c = await import('/src/services/CaseEngine.ts');
    const p = await import('/src/services/ProfileEngine.js');
    const a = c.createCaseDraft({
      title: 'Synthetic case A',
      intakeData: { chiefComplaint: 'CASE_A_CONCERN' },
    });
    const b = c.createCaseDraft({
      title: 'Synthetic case B',
      intakeData: { chiefComplaint: 'CASE_B_CONCERN' },
    });
    await p.saveProfile({
      ...p.getProfile(),
      allergies: ['SYNTHETIC_PENICILLIN_ALLERGY'],
      medications: [{ name: 'Synthetic medicine', dose: '10 mg', status: 'discontinued' }],
    });
    return { a: a.id, b: b.id };
  });
  await choose(page, /Synthetic case A/);
  await send(page, 'CASE_A_MESSAGE');
  await expect(page.getByText('CASE_A_MESSAGE', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save this observation' })).toBeVisible();
  await choose(page, /Synthetic case B/);
  await expect(page.getByText('CASE_A_MESSAGE', { exact: true })).toHaveCount(0);
  await send(page, 'CASE_B_MESSAGE');
  await expect(page.getByRole('button', { name: 'Save this observation' })).toBeVisible();
  const b = requests.filter((request) => request.operation === 'ava_chat').at(-1).body.avaRequest;
  expect(b.mode).toBe('case');
  expect(JSON.stringify(b)).not.toContain('CASE_A_MESSAGE');
  expect(JSON.stringify(b)).not.toContain('CASE_A_CONCERN');
  expect(b.safetyContext).toContain('SYNTHETIC_PENICILLIN_ALLERGY');
  expect(b.safetyContext).toContain('10 mg');
  expect(b.safetyContext).toContain('discontinued');
  expect(requests.filter((request) => request.operation === 'memory_extraction')).toHaveLength(0);
  await choose(page, /General Health Conversation/);
  await expect(page.getByLabel('Conversation context')).toHaveValue('');
  await send(page, 'GENERAL_MESSAGE');
  await expect(page.getByRole('button', { name: 'Save this observation' })).toBeVisible();
  expect(requests.at(-1).body.avaRequest.mode).toBe('general');
  expect(JSON.stringify(requests.at(-1))).not.toContain('CASE_B_CONCERN');
  await page.goto('/app/ava?caseId=' + ids.a);
  await expect(page.getByText('CASE_A_MESSAGE', { exact: true })).toBeVisible();
  await expect(page.getByText('CASE_B_MESSAGE', { exact: true })).toHaveCount(0);
});
test('mixed cards preserve diary identity, launch distinct tools and restore disclosures', async ({
  page,
}) => {
  await setup(
    page,
    'First [WIDGET:BREATHWORK] Second [WIDGET:WORKOUT] Third [WIDGET:DIARY_TIMELINE] End'
  );
  await page.evaluate(async () => {
    const meal = await import('/src/services/MealCommandService.ts');
    await meal.createMeal({
      localDate: new Date().toLocaleDateString('en-CA'),
      captureMethod: 'diet_diary',
      entry: { id: crypto.randomUUID(), name: 'Synthetic lunch' },
    });
  });
  await send(page, 'Show my options');
  await expect(
    page.getByText('Diary records included in this reply', { exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () =>
        Object.values(
          await (await import('/src/services/MealCommandService.ts')).listMealDiary()
        ).flat().length
    )
  ).toBe(1);
  await page.getByRole('button', { name: 'Open breathing guide' }).click();
  const dialog = page.getByRole('dialog', { name: 'Comfortable breathing guide' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.waitForTimeout(1200);
  await dialog.getByRole('button', { name: 'Finish and save participation' }).click();
  await expect(dialog.getByRole('status')).toContainText('Saved');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Browse activities' }).click();
  await expect(page.getByRole('dialog', { name: 'Movement activities' })).toBeVisible();
  await expect(
    page.getByText(/Activity catalog is unavailable|No published movement/).first()
  ).toBeVisible();
  await page.keyboard.press('Escape');
  const summary = page.getByText('Optional comfortable breathing', { exact: true });
  await summary.click();
  await expect(page.getByRole('button', { name: 'Open breathing guide' })).not.toBeVisible();
  await page.reload();
  await expect(summary).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open breathing guide' })).not.toBeVisible();
});
test('reviewed case save records once and retains its receipt after reload', async ({ page }) => {
  await setup(page);
  await page.evaluate(async () => {
    (await import('/src/services/CaseEngine.ts')).createCaseDraft({
      title: 'Synthetic receipt case',
    });
  });
  await choose(page, /Synthetic receipt case/);
  await send(page, 'My symptom observation');
  await page.getByRole('button', { name: 'Save this observation' }).click();
  const dialog = page.getByRole('dialog', { name: 'Save Observation to Case' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm & Save' }).click();
  await expect(page.getByRole('button', { name: 'Observation saved' })).toBeDisabled();
  const count = () =>
    page.evaluate(async () => {
      const c = (await import('/src/services/CaseEngine.ts'))
        .getCases()
        .find((c) => c.title === 'Synthetic receipt case');
      return c?.events.filter((e) => e.id.startsWith('ava_observation_')).length;
    });
  expect(await count()).toBe(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Observation saved' })).toBeDisabled();
  expect(await count()).toBe(1);
});
test('320px picker and dialog support focus, Escape and meal intake', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await setup(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', { name: /Conversation: .*Change/ }).click();
  await page.waitForTimeout(80);
  expect(
    await page.getByRole('dialog').evaluate((dialog) => dialog.contains(document.activeElement))
  ).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Log a meal or food photo' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByLabel('Upload medical file or health image')).toHaveCount(1);
});
test('a reviewed day check-in is saved once and reaches the next General reply with exact answers', async ({
  page,
}) => {
  const requests = await setup(page);
  await page.getByRole('button', { name: /Log your day/i }).click();
  const dialog = page.getByRole('dialog', { name: 'Log your day' });
  await dialog.getByLabel('Did sleep feel restful?').selectOption('no');
  await dialog.getByLabel('Did you have enough energy?').selectOption('yes');
  await dialog
    .getByLabel('Day check-in notes')
    .fill('SYNTHETIC_DAY_NOTE: no symptom time recorded');
  await dialog.getByRole('button', { name: 'Save today’s check-in' }).click();
  await expect(dialog.getByRole('status')).toContainText('Check-in saved');
  await expect(dialog.getByRole('button', { name: 'Save today’s check-in' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close day check-in' }).click();
  await page.getByRole('button', { name: /Using [1-9]\d* context item/ }).click();
  await expect(page.getByText('Daily check-in', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await send(page, 'Review my saved check-in');
  await expect(page.getByRole('button', { name: 'Save this observation' })).toBeVisible();
  const context = requests.at(-1).body.avaRequest.context;
  expect(context).toContain('SYNTHETIC_DAY_NOTE');
  expect(context).toContain('"sleep":"no"');
  expect(context).toContain('"energy":"yes"');
  expect(context).toContain('"symptoms":"unanswered"');
  expect(context).toContain('"occurredAt":null');
  expect(context).toContain('"timePrecision":"date_only"');
  const rows = await page.evaluate(async () =>
    (await import('/src/services/HealthObservationService.ts')).listObservations()
  );
  expect(rows.filter((row) => row.payload.kind === 'daily_checkin')).toHaveLength(1);
  await page.reload();
  await expect(page.getByText('Review my saved check-in', { exact: true })).toBeVisible();
});
test('negated recommendations, malformed history and study URLs remain usable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await setup(page, 'Do not use 4-7-8 breathing for this concern.');
  await send(page, 'Discuss this suggestion');
  await expect(
    page.getByText('Do not use 4-7-8 breathing for this concern.', { exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open breathing guide' })).toHaveCount(0);
  await page.goto('/app/ava?studyId=NCT00000000');
  await expect(
    page.getByRole('textbox', { name: 'Ask Ava Health Buddy a question' })
  ).toBeVisible();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});
test('current backup previews and restores durable chat and offline memory', async ({ page }) => {
  await setup(page);
  await send(page, 'SYNTHETIC_CHAT_ARCHIVE');
  await expect(page.getByRole('button', { name: 'Save this observation' })).toBeVisible();
  await page.evaluate(async () => {
    const m = await import('/src/services/HealthMemory.ts');
    m.recordHealthMemory({
      kind: 'health_buddy',
      source: 'ava',
      title: 'SYNTHETIC_OFFLINE_MEMORY',
      occurredAt: new Date().toISOString(),
      payload: { userConfirmed: true },
    });
    await m.flushHealthMemory();
  });
  await page.goto('/app/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let raw = '';
  for await (const chunk of stream!) raw += chunk.toString();
  expect(raw).toContain('SYNTHETIC_CHAT_ARCHIVE');
  expect(raw).toContain('SYNTHETIC_OFFLINE_MEMORY');
  await page.getByLabel('Import health record JSON backup file').setInputFiles({
    name: 'synthetic.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw),
  });
  await expect(page.getByRole('dialog', { name: 'Review backup restore' })).toBeVisible();
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  await expect(page.getByText(/^\d+ local data stores restored/)).toBeVisible();
  await page.waitForTimeout(1700);
  await page.goto('/app/ava');
  await expect(page.getByText('SYNTHETIC_CHAT_ARCHIVE', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(async () =>
      (await import('/src/services/HealthMemory.ts'))
        .getHealthMemory()
        .some((item) => item.title === 'SYNTHETIC_OFFLINE_MEMORY')
    )
  ).toBe(true);
});
