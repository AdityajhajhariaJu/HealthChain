import { expect, test } from '@playwright/test';

test.setTimeout(60000);

const guest = () => {
  localStorage.setItem('hc_guest_mode', 'true');
  localStorage.setItem('hc_onboarded', 'true');
  localStorage.setItem('hc_cookies_accepted', 'declined');
};

test('new user sees honest empty states and research is always one tap away', async ({ page }) => {
  await page.addInitScript(guest);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(gut.getByRole('heading', { name: 'What happened?' })).toBeVisible({ timeout: 15000 });
  if (test.info().project.name === 'chromium') await gut.screenshot({ path: 'test-results/gut-daily-empty-mobile.png' });
  await expect(gut.getByRole('button', { name: 'My research', exact: true }).first()).toBeVisible();
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await expect(gut.getByText('No investigations yet.')).toBeVisible();
  await gut.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(gut.getByText('Your week starts with an entry.')).toBeVisible();
  expect(await gut.locator('.gdh').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await gut.locator('.gr-modal-header').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  expect(await gut.locator('.gdh').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});

test('a real log appears in understanding and on its weekly date', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Bloating' }).click();
  await gut.getByRole('button', { name: 'Save & see my understanding' }).click();
  await expect(gut.getByRole('heading', { name: 'Your understanding' })).toBeVisible();
  if (test.info().project.name === 'chromium') await gut.screenshot({ path: 'test-results/gut-daily-understanding-mobile.png' });
  await expect(gut.getByText('Too early to see a pattern.', { exact: true })).toBeVisible();
  await expect(gut.locator('.gij-conclusion')).toContainText('1 bloating report saved');
  await expect(gut.locator('.gij-state.coral')).toContainText('note the meal and how you felt');
  await gut.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(gut.locator('.gdh-calendar .log')).toHaveCount(1);
  await expect(gut.locator('.gdh-day-list').getByText('Bloating', { exact: true })).toBeVisible();
  await expect(gut.locator('.gdh-day-list').getByText('What might explain bloating?')).toHaveCount(1);
});

test('a new kind of log opens its own question instead of an unrelated active one', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Bloating' }).click();
  await gut.getByRole('button', { name: 'Save & see my understanding' }).click();
  await gut.getByRole('button', { name: 'Log', exact: true }).click();
  await gut.getByRole('tab', { name: 'Meal' }).click();
  await gut.getByRole('textbox', { name: 'Describe a meal or how you felt' }).fill('Rice');
  await gut.getByRole('button', { name: 'Save & see my understanding' }).click();
  await expect(gut.locator('.gij-sub')).toContainText('What do my Rice logs show?');
  await expect(gut.locator('.gij-conclusion')).toContainText('1 Rice meal entry saved');
});

test('a saved question becomes a resumable investigation', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Your understanding' }).click();
  await gut.getByRole('button', { name: 'Or ask a question' }).click();
  await gut.getByLabel('Your gut question').fill('Does bloating follow my dinners?');
  await gut.getByRole('button', { name: 'Start investigation' }).click();
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await expect(gut.locator('.gdh-thread-list').getByText('Does bloating follow my dinners?')).toBeVisible();
  await gut.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(gut.getByRole('heading', { name: 'Your understanding' })).toBeVisible();
  await expect(gut.getByRole('button', { name: /Compare possibilities/ })).toBeVisible();
});

test('a requested Gemini reading is saved and shown without invented personal records', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      if (!String(input).includes('/api/gemini')) return originalFetch(input, init);
      const answer = {
        headline: 'The question is open', personalReading: 'Your question is saved, but there is no logged outcome to compare.',
        researchReading: '', connectionReading: 'There are no linked meal and symptom reports for this question.',
        uncertainties: ['The outcome is unknown.'], nextAction: 'add_report', nextReason: 'Add a report only when something worth remembering happens.',
        citationPassageIds: ['question:current#0'],
      };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
  });
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Your understanding' }).click();
  await gut.getByRole('button', { name: 'Or ask a question' }).click();
  await gut.getByLabel('Your gut question').fill('Could my dinner explain how I felt?');
  await gut.getByRole('button', { name: 'Start investigation' }).click();
  await gut.getByRole('button', { name: 'Get a Gemini reading' }).click();
  await expect(gut.getByRole('heading', { name: 'Use Gemini for this question?' })).toBeVisible();
  await gut.getByRole('checkbox', { name: 'Use these details for one Gemini reading' }).check();
  await gut.getByRole('button', { name: 'Explain my question' }).click();
  await expect(gut.locator('.gij').getByText('The question is open')).toBeVisible();
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await expect(gut.locator('.gdh-thread-list').getByText('The question is open')).toBeVisible();
  await gut.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(gut.getByText('What changed this week')).toBeVisible();
  await expect(gut.locator('.gdh-calendar .research')).toHaveCount(1);
});

test('optional details lead to a review and an editable original record', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('tab', { name: 'Meal' }).click();
  await gut.getByRole('textbox', { name: 'Describe a meal or how you felt' }).fill('Rice and yogurt');
  await gut.getByRole('button', { name: 'larger' }).click();
  await gut.getByRole('button', { name: 'Add details & review' }).click();
  await gut.getByRole('textbox', { name: 'Known ingredients' }).fill('rice, yogurt');
  await gut.getByRole('button', { name: 'Review entry' }).click();
  await expect(gut.locator('.gdh-review')).toContainText('Rice and yogurt');
  await expect(gut.locator('.gdh-review')).toContainText('rice, yogurt');
  await gut.getByRole('button', { name: 'Save & see my understanding' }).click();
  await expect(gut.getByRole('heading', { name: 'Your understanding' })).toBeVisible();
  if (test.info().project.name === 'chromium') await gut.screenshot({ path: 'test-results/gut-inner-home.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  if (test.info().project.name === 'chromium') await gut.screenshot({ path: 'test-results/gut-inner-home-mobile.png' });
  expect(await gut.locator('.gij').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });
  await gut.getByRole('button', { name: /Compare possibilities/ }).click();
  await gut.locator('.gij-list').getByRole('button', { name: /Rice and yogurt/ }).click();
  await gut.locator('.gij-list').getByRole('button', { name: /Rice and yogurt/ }).click();
  await expect(gut.getByText('ORIGINAL MEAL')).toBeVisible();
  await gut.getByRole('button', { name: 'Open exact source' }).click();
  await expect(gut.getByRole('region', { name: 'Exact source record' })).toBeVisible();
  await gut.getByRole('button', { name: 'Back to records' }).click();
  await expect(gut.getByText('ORIGINAL MEAL')).toBeVisible();
  await gut.getByRole('button', { name: 'Correct this record' }).click();
  await gut.getByRole('textbox', { name: 'Meal', exact: true }).fill('Rice and plain yogurt');
  await gut.getByRole('button', { name: 'Save correction' }).click();
  await expect(gut.getByRole('heading', { name: 'What changed?' })).toBeVisible();
  await expect(gut.locator('.gij').getByRole('status')).toContainText('corrected');
});

test('an insight can save a next step and log a later outcome without inventing one', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('tab', { name: 'Meal' }).click();
  await gut.getByRole('textbox', { name: 'Describe a meal or how you felt' }).fill('Dinner');
  await gut.getByRole('button', { name: 'Save & see my understanding' }).click();
  await gut.getByRole('button', { name: 'Keep this in mind' }).click();
  await gut.getByRole('textbox', { name: 'Your next step' }).fill('Notice what happens after another dinner');
  await gut.getByRole('button', { name: 'Save to my next log' }).click();
  await expect(gut.getByRole('heading', { name: 'Saved to your next log' })).toBeVisible();
  await gut.locator('summary').filter({ hasText: 'Remind me' }).click();
  const future = new Date(); future.setDate(future.getDate() + 2);
  await gut.getByLabel('Reminder date', { exact: true }).fill(`${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`);
  const download = page.waitForEvent('download');
  await gut.getByRole('button', { name: 'Add to calendar' }).click();
  expect((await download).suggestedFilename()).toBe('healthchain-reminder.ics');
  await expect(gut.locator('.gij').getByRole('status')).toContainText('confirm its alert');
  await gut.getByRole('button', { name: 'Log what happens later' }).click();
  await gut.getByRole('textbox', { name: 'Meal or drink' }).fill('Another dinner');
  await gut.getByRole('button', { name: 'Save & update insight' }).click();
  await expect(gut.getByRole('heading', { name: 'What changed?' })).toBeVisible();
  await expect(gut.locator('.gij-detail-rows')).toContainText('2 unknown');
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await expect(gut.getByText('Notice what happens after another dinner')).toBeVisible();
  await gut.getByRole('button', { name: 'This week', exact: true }).click();
  await expect(gut.getByText('Next step saved').first()).toBeVisible();
  await expect(gut.getByText('Follow-up recorded').first()).toBeVisible();
});

test('research is searched for a chosen symptom and a source is saved only on request', async ({ page }) => {
  test.setTimeout(60000);
  await page.route('**/europepmc/webservices/rest/search?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ resultList: { result: [{
      pmid: '12345678', title: 'Diet and abdominal bloating in adults: a review', abstractText: 'Diet and meal patterns were studied alongside abdominal bloating in adults.',
      journalTitle: 'Test Journal', pubYear: '2024', electronicPublicationDate: '2024-02-03', pubTypeList: { pubType: ['Review'] },
    }] } }) });
  });
  await page.addInitScript(guest);
  await page.goto('/app/today?gut=1');
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: 'Your understanding' }).click();
  await gut.getByRole('button', { name: 'Or ask a question' }).click();
  await gut.getByLabel('Your gut question').fill('What could help me understand bloating?');
  await gut.getByRole('button', { name: 'Start investigation' }).click();
  await gut.getByRole('button', { name: /Check research/ }).click();
  await gut.getByRole('combobox', { name: 'Symptom category' }).selectOption('bloating');
  await gut.getByRole('button', { name: 'Search indexed studies' }).click();
  await gut.locator('.gij-list').getByRole('button', { name: /Diet and abdominal bloating/ }).click();
  await expect(gut.getByText('INDEXED PUBLICATION · PMID 12345678')).toBeVisible();
  await gut.locator('.gij-topline').getByRole('button', { name: 'Back' }).click();
  await expect(gut.getByRole('heading', { name: 'Does research fit?' })).toBeVisible();
  await gut.locator('.gij-list').getByRole('button', { name: /Diet and abdominal bloating/ }).click();
  await gut.getByRole('button', { name: 'Save source to My research' }).click();
  await expect(gut.locator('.gij').getByRole('status')).toContainText('Source saved');
  await gut.getByRole('button', { name: 'My research', exact: true }).first().click();
  await gut.getByRole('button', { name: 'Saved sources' }).click();
  await expect(gut.getByText('Diet and abdominal bloating in adults: a review')).toBeVisible();
});
