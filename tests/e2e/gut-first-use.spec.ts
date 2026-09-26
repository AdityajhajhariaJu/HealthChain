import { test, expect } from '@playwright/test';

test('a first-time guest can ask one question without inventing a symptom', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
  });
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByRole('navigation', { name: 'Gut Health sections' })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I feel unwell/ })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I need to choose/ })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I want to understand/ })).toBeVisible();
  await expect(gut.getByRole('button', { name: /I have a care question/ })).toBeVisible();
  const firstCard = await gut.getByRole('button', { name: /I feel unwell/ }).boundingBox();
  const secondCard = await gut.getByRole('button', { name: /I need to choose/ }).boundingBox();
  expect(firstCard && secondCard && Math.abs(firstCard.y - secondCard.y) < 2 && secondCard.x > firstCard.x).toBe(true);
  await expect(gut.getByLabel('Your question or situation')).toHaveCount(0);
  await gut.getByRole('button', { name: /I want to understand/ }).click();
  await expect(gut.getByRole('heading', { name: 'What pattern are you curious about?' })).toBeVisible();
  const question = gut.getByLabel('Your question or situation');
  await gut.getByText('Add a meal or symptom from your records (optional)').click();
  await expect(gut.getByLabel('Symptom (optional)')).toHaveValue('unspecified');
  await gut.locator('details.gr-example-disclosure > summary').click();
  await gut.getByRole('button', { name: 'What pattern should I check after dinner?' }).click();
  await expect(question).toHaveValue('What pattern should I check after dinner?');
  await expect(gut.getByRole('heading', { name: 'What pattern should I check after dinner?' })).toHaveCount(0);
  await gut.getByRole('button', { name: 'Open my question' }).click();
  const trail = gut.getByRole('region', { name: 'What your saved information can say' });
  await expect(trail.getByText(/Your question is saved\. Choose a saved meal name only if you want to compare/)).toBeVisible();
  await expect(trail.getByRole('button', { name: /My records/ })).toBeVisible();
  expect(await trail.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await gut.locator('.gr-workspace').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await gut.getByRole('button', { name: 'Explore general research' }).click();
  await expect(gut.getByLabel('Which symptom would you like to read about?')).toBeVisible();
  await expect(gut.getByRole('group', { name: 'Research topic' })).toHaveCount(0);
  await gut.getByLabel('Which symptom would you like to read about?').selectOption('bloating');
  await expect(gut.getByRole('link', { name: /Read the NIDDK source/ })).toBeVisible();
});

test('choosing a current-concern path still requires the user to describe their situation', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
  });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I feel unwell/ }).click();
  await expect(gut.getByRole('button', { name: /I feel unwell/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(gut.getByRole('heading', { name: 'What is happening right now?' })).toBeVisible();
  await expect(gut.getByRole('button', { name: 'Open my question' })).toBeDisabled();
  await gut.getByLabel('Your question or situation').fill('I have stomach pain after lunch today');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  await expect(gut.getByRole('heading', { name: 'What you can do now' })).toBeVisible();
  await expect(gut.getByText('No records on this date')).toBeVisible();
  await expect(gut.getByRole('button', { name: /Copy focused care summary/ })).toBeVisible();
  await expect(gut.getByRole('heading', { name: 'I have stomach pain after lunch today' })).toBeVisible();
  await expect(gut.getByText(/No recorded meal names match/)).toHaveCount(0);
  await expect(gut.getByText('Question controls')).toHaveCount(0);
  await expect(gut.getByText('Reported with abdominal discomfort')).toHaveCount(0);
  await expect(gut.getByRole('button', { name: /Read source-backed general context/ })).toBeVisible();
  await expect(gut.getByText('Anchored to verified onset')).toHaveCount(0);
});

test('each card opens its own short onboarding prompt without creating a question', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_guest_mode', 'true'));
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  const paths = [
    [/I feel unwell/, 'What is happening right now?'],
    [/I need to choose/, 'What decision is coming up?'],
    [/I want to understand/, 'What pattern are you curious about?'],
    [/I have a care question/, 'What would you like to discuss at a visit?'],
  ] as const;
  for (const [card, heading] of paths) {
    await gut.getByRole('button', { name: card }).click();
    await expect(gut.getByRole('heading', { name: heading })).toBeVisible();
    await expect(gut.getByRole('button', { name: 'Open my question' })).toBeDisabled();
  }
  await expect(gut.getByText('Add a meal or symptom from your records (optional)')).toBeVisible();
});

test('meal recording is a visible optional source action linked to questions', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_guest_mode', 'true'));
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  const sourceAction = gut.getByRole('region', { name: 'Optional meal record' });
  await expect(sourceAction.getByText('Record a meal', { exact: true })).toBeVisible();
  expect(await gut.locator('.gr-workspace').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await sourceAction.getByRole('button', { name: 'Add meal' }).click();
  await expect(page.getByRole('dialog', { name: 'Quick meal entry' })).toBeVisible();
});

test('the main action confirms a useful record connection instead of losing it', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    localStorage.setItem('hc_unified_profile_guest', JSON.stringify({ activeId: 'profile_1', profiles: { profile_1: {
      id: 'profile_1', profileName: 'My Profile', nutrition: { recentLogs: [
        { id: 'chai-1', meal: 'Masala Chai', date: '2026-09-20', loggedAt: '2026-09-20T08:30:00Z', reaction: { label: 'Bloating', reactionType: 'bloat' } },
        { id: 'chai-2', meal: 'Chai with oat milk', date: '2026-09-21', loggedAt: '2026-09-21T08:30:00Z' },
      ] },
    } } }));
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I want to understand/ }).click();
  await gut.getByLabel('Your question or situation').fill('Is chai related to my bloating?');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  const review = gut.getByRole('region', { name: 'Confirm the details found in your question' });
  await expect(review.getByText('2 matching saved meals')).toBeVisible();
  await expect(review.getByText(/Possible symptom:.*Bloating/)).toBeVisible();
  await review.getByRole('button', { name: /Use these details/ }).click();
  const conclusion = gut.getByRole('region', { name: 'What your saved information can say' });
  await expect(conclusion.getByText(/1 linked report of bloating, with 1 outcome unknown/)).toBeVisible();
  await expect(conclusion.getByRole('button', { name: /Review one unanswered occasion/ })).toBeVisible();
  const actions = await conclusion.locator('.gr-conclusion-actions').boundingBox();
  expect(actions && actions.y + actions.height < 844).toBe(true);
});

test('a current concern produces a source-aware care summary and accepts a later outcome', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_guest_mode', 'true'));
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I feel unwell/ }).click();
  await gut.getByLabel('Your question or situation').fill('I have stomach pain after lunch today');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  const concern = gut.getByRole('region', { name: 'Current concern summary' });
  await expect(concern.getByText('No records on this date')).toBeVisible();
  await concern.getByText(/Later, what happened/).click();
  await concern.getByLabel('Your own account').fill('The pain settled later.');
  await concern.getByRole('button', { name: 'Save what happened' }).click();
  await expect(concern.getByText('Your saved follow-up: The pain settled later.')).toBeVisible();
});

test('an unsaved meal name stays a question focus, never a fabricated record', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_guest_mode', 'true'));
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I want to understand/ }).click();
  await gut.getByLabel('Your question or situation').fill('Is chai linked to my bloating?');
  await expect(gut.getByText(/No saved meal matches/)).toBeVisible();
  await gut.getByRole('button', { name: 'Open my question' }).click();
  const review = gut.getByRole('region', { name: 'Confirm the details found in your question' });
  await expect(review.getByText(/No saved meal matches/)).toBeVisible();
  await review.getByRole('button', { name: /Use these details/ }).click();
  await expect(gut.getByLabel('What your saved information').getByText(/No recorded meal names match “chai” yet/)).toBeVisible();
  await expect(gut.getByText('General context from NIDDK')).toBeVisible();
});

test('the simple reading leads to the evidence view', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hc_guest_mode', 'true'));
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I have a care question/ }).click();
  await gut.getByLabel('Your question or situation').fill('What should I ask at my visit?');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  const trail = gut.getByRole('region', { name: 'What your saved information can say' });
  await trail.getByRole('button', { name: /My records/ }).click();
  await expect(gut.getByRole('heading', { name: 'Evidence hearing' })).toBeVisible();
});
