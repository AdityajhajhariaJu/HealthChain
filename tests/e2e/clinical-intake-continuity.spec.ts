import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route('**/api/**', (route) => route.abort());
});

test('six screens carry choices and original attachments through save, exit and reload', async ({
  page,
}, testInfo) => {
  await page.goto('/app/consult?review=new&step=6');
  await expect(page.getByRole('heading', { name: 'Which symptoms bother you?' })).toBeVisible();
  await page.getByRole('button', { name: 'Fatigue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with 1 symptom' }).click();
  await page.getByRole('button', { name: '1–2 weeks', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Pattern (Step 3)' }).click();
  await page.getByRole('button', { name: 'Fluctuating / Comes & Goes ∿', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }).click();
  const notes = page.getByRole('textbox', { name: 'Clinical timeline and symptom notes' });
  await expect(notes).toHaveValue(/Primary symptoms: Fatigue/);
  await expect(notes).toHaveValue(/Onset: 1–2 weeks/);
  await expect(notes).toHaveValue(/Progression: Fluctuating/);
  const story =
    (await notes.inputValue()) +
    '\nSynthetic example: the reports disagree; collection times are unknown.';
  await notes.fill(story);
  await page.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }).click();
  // The bytes are a synthetic test image. No real medical records are used.
  const original = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5AAAAABJRU5ErkJggg==',
    'base64'
  );
  const upload = page.getByLabel('Upload medical records, lab reports, or health documents');
  await upload.setInputFiles({
    name: 'synthetic-panel.png',
    mimeType: 'image/png',
    buffer: original,
  });
  await expect(page.getByText('synthetic-panel.png', { exact: true })).toBeVisible();
  await upload.setInputFiles({
    name: 'synthetic-panel.png',
    mimeType: 'image/png',
    buffer: original,
  });
  await expect(page.getByText('Duplicate document name', { exact: true })).toBeVisible();
  await expect(page.getByText('synthetic-panel.png', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Next: Scope & Run (Step 6)' }).click();
  const summary = page.getByRole('region', { name: 'Review input summary' });
  await expect(summary).toContainText(story);
  await expect(summary).toContainText('synthetic-panel.png');
  const focus = page.getByRole('button', { name: /Doctor Visit Prep/ });
  await focus.click();
  await expect(focus).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Save & Exit', exact: true }).click();
  await expect(page).toHaveURL(/\/app\/(?:cases|my-cases)$/);
  await page.goto('/app/consult?review=new');
  await expect(page.getByRole('region', { name: 'Review input summary' })).toContainText(story);
  await expect(page.getByRole('button', { name: /Doctor Visit Prep/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await page.reload();
  await expect(page.getByRole('region', { name: 'Review input summary' })).toContainText(
    'synthetic-panel.png'
  );
  const staged = await page.evaluate(async () => {
    const drafts = await import('/src/services/ClinicalIntakeDraft.ts');
    const draft = await drafts.loadClinicalIntakeDraft(drafts.clinicalDraftKey(''));
    return {
      step: draft?.step,
      focus: draft?.focus,
      history: draft?.history,
      type: draft?.files[0].file.type,
      base64: draft?.files[0].base64,
    };
  });
  expect(staged).toEqual({
    step: 6,
    focus: 'doctor_prep',
    history: story,
    type: 'image/png',
    base64: original.toString('base64'),
  });
  await page.screenshot({ path: testInfo.outputPath('six-screen-launch.png'), fullPage: true });
});

test('editing the story clears obsolete guided choices when navigating back', async ({ page }) => {
  await page.goto('/app/consult?review=new');
  await page.getByRole('button', { name: 'Fatigue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue with 1 symptom' }).click();
  await page.getByRole('button', { name: '1–2 weeks', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Pattern (Step 3)' }).click();
  await page.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }).click();
  await page
    .getByRole('textbox', { name: 'Clinical timeline and symptom notes' })
    .fill('I no longer want the earlier selections included. The start date is unknown.');
  await page.getByRole('button', { name: '← Back to Pattern' }).click();
  await page.getByRole('button', { name: '← Back to Timeline' }).click();
  await page.getByRole('button', { name: '← Back to Symptoms' }).click();
  await expect(page.getByRole('button', { name: 'Remove Fatigue' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next: Timeline (Step 2)' })).toBeVisible();
});

test('correcting a daily source withholds its earlier Clinical interpretation', async ({
  page,
}) => {
  await page.goto('/app/my-cases');
  await expect(page.getByRole('heading', { name: 'My Cases' })).toBeVisible();
  const ids = await page.evaluate(async () => {
    const engine = await import('/src/services/CaseEngine.ts');
    const observations = await import('/src/services/HealthObservationService.ts');
    const daily = await import('/src/services/ClinicalDailyEvidence.ts');
    const fixture = await import('/src/services/testFixtures/groundedFixtures.ts');
    const scope = await observations.captureObservationScope();
    const input = {
      ...scope!,
      payload: { kind: 'hydration' as const, amountMl: 250, drinkType: 'water' as const },
      occurredAt: null,
      localDate: '2026-10-01',
      timezone: null,
      timePrecision: 'date_only' as const,
      source: 'today' as const,
      evidenceType: 'user_report' as const,
      idempotencyKey: 'freshness-example',
    };
    const created = await observations.createObservation(input);
    if (!created.ok) throw new Error('Synthetic observation failed');
    const c = engine.createCaseDraft({
      title: 'Daily source correction example',
      intakeData: { chiefComplaint: 'Knee discomfort' },
      medicalRecords: [],
    });
    await daily.attachReviewedDailyEvidence(c.id, [{ id: created.observation.id, revision: 1 }]);
    // Dynamic fixture imports may have a separate Vite URL from static imports.
    engine.clearCaseEngineCache();
    if (!engine.getCase(c.id)?.medicalRecords.length)
      throw new Error('Attached sources disappeared before saving the review');
    engine.saveReviewSnapshot({
      caseId: c.id,
      type: 'jarvis',
      report: fixture.groundedReview(),
      specialists: [],
    });
    if (!engine.getCase(c.id)?.medicalRecords.length)
      throw new Error('Saving the review lost attached sources');
    return { caseId: c.id, observationId: created.observation.id, input };
  });
  await page.goto('/app/consult?caseId=' + ids.caseId);
  await expect(page.getByRole('heading', { name: 'Your record review is ready' })).toBeVisible();
  const manifest = await page.evaluate(async (caseId) => {
    const engine = await import('/src/services/CaseEngine.ts');
    return engine.getCase(caseId)?.medicalRecords[0].evidenceManifest;
  }, ids.caseId);
  expect(manifest?.sources[0].revision).toBe(1);
  await page.evaluate(async ({ observationId, input }) => {
    const observations = await import('/src/services/HealthObservationService.ts');
    const result = await observations.reviseObservation(observationId, 1, {
      ...input,
      payload: { ...input.payload, amountMl: 500 },
    });
    if (!result.ok) throw new Error('Synthetic revision failed: ' + JSON.stringify(result));
  }, ids);
  const current = await page.evaluate(async () => {
    const observations = await import('/src/services/HealthObservationService.ts');
    return (await observations.listObservationHistory()).map((item) => ({
      id: item.id,
      revision: item.revision,
    }));
  });
  expect(current.find((item) => item.id === ids.observationId)?.revision).toBe(2);
  await expect(page.getByRole('heading', { name: 'Your record review is ready' })).toHaveCount(0);
  await expect(page.getByText('Records changed', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Which symptoms bother you?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your record review is ready' })).toHaveCount(0);
});
