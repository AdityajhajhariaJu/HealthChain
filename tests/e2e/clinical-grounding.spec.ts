import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (r) => r.abort());
  await page.route('**/api/**', (r) => r.abort());
});

async function seed(page: any) {
  await page.goto('/app/my-cases', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My Cases' })).toBeVisible();
  return page.evaluate(async () => {
    const engine = await import('/src/services/CaseEngine.ts');
    const fixture = await import('/src/services/testFixtures/groundedFixtures.ts');
    const c = engine.createCaseDraft({
      title: 'Grounding regression case',
      intakeData: { chiefComplaint: 'Knee discomfort' },
      medicalRecords: [],
    });
    engine.saveReviewSnapshot({
      caseId: c.id,
      type: 'jarvis',
      report: fixture.groundedReview(),
      specialists: ['Clinical Data Engine'],
    });
    return c.id;
  });
}

async function advanceToStep(page: any, step: 4 | 5 | 6) {
  await page.getByRole('button', { name: 'Next: Timeline (Step 2)' }).click();
  await page.getByRole('button', { name: 'Next: Pattern (Step 3)' }).click();
  await page.getByRole('button', { name: 'Next: Tell Your Story (Step 4)' }).click();
  if (step >= 5) await page.getByRole('button', { name: 'Next: Add Evidence (Step 5)' }).click();
  if (step >= 6) await page.getByRole('button', { name: 'Next: Scope & Run (Step 6)' }).click();
}

test('saved review has one reasoning view and one perspective view', async ({ page }) => {
  const id = await seed(page);
  await page.goto('/app/consult?caseId=' + id);
  await expect(page.getByRole('heading', { name: 'Your record review is ready' })).toBeVisible();
  await page.getByText('Review reasoning', { exact: true }).click();
  await expect(page.getByText('Clinical reasoning and follow-up', { exact: true })).toHaveCount(1);
  await page.getByText(/Perspectives \(\d+\)/).click();
  await expect(page.getByText('Clinical perspectives', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Save clarification', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Recorded Measurement: Postural Tachycardia Delta (+34 bpm)', { exact: true })
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Open case', exact: true }).click();
  await expect(page.getByRole('tab', { name: /Reviews & Timeline/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review summary', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'What the records show', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your next step', exact: true })).toBeVisible();
});

test('clarification survives reload and remains a report, not a resolved conclusion', async ({
  page,
}) => {
  const id = await seed(page);
  await page.goto('/app/consult?caseId=' + id);
  await page.getByText('Review reasoning', { exact: true }).click();
  const input = page.locator('form textarea').first();
  await input.fill('I do not know the exact activity timing');
  await page.getByText('Save clarification', { exact: true }).click();
  await expect(page.getByText('Clarification saved', { exact: true })).toBeVisible();
  await page.reload();
  const report = await page.evaluate(async (id) => {
    const engine = await import('/src/services/CaseEngine.ts');
    return engine.getCase(id)?.reviews[0].report;
  }, id);
  expect(
    report.documentedFacts.some((f: any) => f.fact === 'I do not know the exact activity timing')
  ).toBe(true);
  expect(report.selectiveUpdate.resolvedQuestions).toEqual([]);
});

test('invalid engine case cannot silently use another case', async ({ page }) => {
  await seed(page);
  await page.goto('/app/consult?caseId=missing&review=new');
  await advanceToStep(page, 4);
  await page
    .getByRole('textbox', { name: 'Clinical timeline and symptom notes' })
    .fill('A new concern');
  await page.getByRole('textbox', { name: 'Clinical timeline and symptom notes' }).blur();
  for (const name of [
    'Next: Add Evidence (Step 5)',
    'Next: Scope & Run (Step 6)',
    'Review and save to My Cases',
  ]) {
    await page.getByRole('button', { name }).focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.getByText('Case unavailable', { exact: true })).toBeVisible();
});

test('mobile saved review stays within viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await seed(page);
  await page.goto('/app/consult?caseId=' + id);
  await expect(page.getByRole('heading', { name: 'Your record review is ready' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await page.screenshot({ path: testInfo.outputPath('mobile-review.png'), fullPage: true });
});

test('current chest pressure and breathlessness shows emergency guidance before sign-in or a review call', async ({
  page,
}) => {
  await page.goto('/app/consult?review=new', { waitUntil: 'domcontentloaded' });
  await advanceToStep(page, 4);
  await page
    .getByRole('textbox', { name: 'Clinical timeline and symptom notes' })
    .fill(
      'I have chest pressure and breathlessness right now, starting 20 minutes ago. My ECG six months ago was normal.'
    );
  const alert = page.locator('[data-urgency="urgent_emergency_care"]');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Do not wait for an AI reply');
});

test('an older saved interpretation requires refresh and cannot reopen as a current verdict', async ({
  page,
}) => {
  const id = await seed(page);
  await page.evaluate(async (id) => {
    const engine = await import('/src/services/CaseEngine.ts');
    engine.saveReviewSnapshot({
      caseId: id,
      type: 'jarvis',
      report: {
        groundingVersion: 1,
        executiveSummary: 'You have confirmed coeliac disease.',
        primaryHypothesis: 'Confirmed coeliac disease',
      },
      specialists: [],
    });
  }, id);
  await page.goto('/app/consult?caseId=' + id);
  await expect(
    page.getByText(
      'An earlier review predates the current evidence checks or its source records have changed. Run a fresh review from your original records before relying on its interpretation.'
    )
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your record review is ready' })).toHaveCount(0);
  await expect(page.getByText('You have confirmed coeliac disease.', { exact: true })).toHaveCount(
    0
  );
});

test('conflicting lab review exposes all essential evidence without opening disclosures', async ({
  page,
}, testInfo) => {
  await page.goto('/app/my-cases');
  await expect(page.getByRole('heading', { name: 'My Cases' })).toBeVisible();
  const caseId = await page.evaluate(async () => {
    const engine = await import('/src/services/CaseEngine.ts');
    const review = await import('/src/services/clinicalReview.ts');
    const records = ['Hemoglobin 8.2 g/dL.', 'Hemoglobin 13.2 g/dL.'].map((text, index) => ({
      id: 'lab-' + index,
      filename: 'Panel-' + index + '.pdf',
      findings: text,
      addedAt: '2026-10-01T12:00:00Z',
      reportDate: '2026-10-01',
      source: 'uploaded_document',
      passages: [{ id: 'passage-' + index, text, page: index + 2 }],
    }));
    const c = engine.createCaseDraft({
      title: 'Conflicting lab example',
      intakeData: { chiefComplaint: 'Mild fatigue; collection times are unknown.' },
      medicalRecords: records,
    });
    const evidence = review.buildReviewEvidence('Mild fatigue; collection times are unknown.', c);
    const normalized = review.normalizeClinicalReview(
      {
        executiveSummary:
          'The two hemoglobin entries differ. Collection times are unknown. Neither entry can silently replace the other. Check the original reports before interpreting the difference.',
        primaryHypothesis: 'Conflicting hemoglobin entries',
        documentedFacts: evidence,
        uncertainties: [
          'Collection times are unknown.',
          'Recent medicines are not supplied.',
          'Reference intervals are absent.',
          'A current symptom timeline is needed.',
        ],
        questionsForClinician: [
          'Which collection time and original report does each value belong to?',
        ],
      },
      null,
      undefined,
      { evidence }
    );
    engine.saveReviewSnapshot({
      caseId: c.id,
      type: 'jarvis',
      report: normalized,
      specialists: [],
    });
    return c.id;
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/consult?caseId=' + caseId);
  const outcome = page.locator('.hc-outcome').first();
  await expect(outcome.getByRole('heading', { name: 'Review summary' })).toBeVisible();
  await expect(
    outcome.getByText(/Check the original reports before interpreting the difference/)
  ).toBeVisible();
  await expect(outcome.getByRole('heading', { name: 'Records that need checking' })).toBeVisible();
  await expect(outcome.getByRole('heading', { name: 'What the records show' })).toBeVisible();
  await expect(
    outcome.getByText('Recent medicines are not supplied.', { exact: true })
  ).toBeVisible();
  await expect(
    outcome.getByText('A current symptom timeline is needed.', { exact: true })
  ).toBeVisible();
  await expect(outcome.getByRole('heading', { name: 'Your next step' })).toBeVisible();
  expect(await outcome.locator('details[open]').count()).toBe(0);
  const targets = await outcome
    .locator('button')
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.getClientRects().length)
        .map((element) => element.getBoundingClientRect().height)
    );
  expect(targets.every((height) => height >= 44)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true
  );
  await page.screenshot({
    path: testInfo.outputPath('conflicting-lab-outcome-mobile.png'),
    fullPage: true,
  });
  await outcome.locator('.hc-outcome-next').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('clinical-next-step-mobile.png') });
  await outcome.getByRole('button', { name: 'Inspect source passage' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Panel-0.pdf');
  await expect(page.getByRole('dialog')).toContainText('Hemoglobin 8.2 g/dL.');
  await page.getByRole('dialog').getByRole('button', { name: 'Correct extraction' }).click();
  await page.getByRole('dialog').locator('textarea').first().fill('Hemoglobin 13.2 g/dL.');
  await page.getByRole('dialog').getByRole('button', { name: 'Save Correction' }).click();
  await expect(page.getByRole('heading', { name: 'Your record review is ready' })).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
