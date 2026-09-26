import { test, expect } from '@playwright/test';

test('a guest chooses a case before a Gut question enters appointment prep', async ({ page }) => {
  const caseId = 'case-digestive-visit';
  await page.addInitScript(({ caseId }) => {
    if (!sessionStorage.getItem('hc_e2e_handoff_init')) {
      sessionStorage.setItem('hc_e2e_handoff_init', '1');
      localStorage.clear();
      localStorage.setItem('hc_guest_mode', 'true');
      localStorage.setItem('hc_onboarded', 'true');
      localStorage.setItem('hc_cookies_accepted', 'declined');
      localStorage.setItem('hc_unified_profile_guest', JSON.stringify({
        activeId: 'profile_1',
        profiles: {
          profile_1: {
            id: 'profile_1',
            profileName: 'Guest Profile',
          },
        },
      }));
      const now = new Date().toISOString();
      const mockCase = {
        id: caseId,
        title: 'Digestive visit',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        revision: 1,
        intakeData: { chiefComplaint: 'I want to discuss recurring bloating.' },
        medicalRecords: [],
        reviews: [],
        events: [{ id: 'evt_1', date: now, label: 'Case created', note: 'Your case file is open.' }],
        currentSummary: {},
        currentStage: 'gathering_evidence',
        actions: [],
      };
      localStorage.setItem('hc_cases_guest_profile_1', JSON.stringify([mockCase]));
    }
  }, { caseId });
  await page.route(/https:\/\//, route => route.abort());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByText('Choose another way to start').click();
  await gut.getByRole('button', { name: /I have a care question/ }).click();
  await gut.getByLabel('Your question or situation').fill('What should I ask my doctor about recurring bloating?');
  await gut.getByRole('button', { name: 'See my connections' }).click();
  await gut.getByRole('button', { name: /Yes, show my brief/ }).click();
  await expect(gut.getByText('Bring this question to a visit')).toBeVisible();
  const handoff = gut.getByRole('region', { name: 'Prepare this question for a visit' });
  expect(await handoff.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await expect(gut.getByRole('button', { name: 'Add question and open brief' })).toBeDisabled();
  await gut.getByLabel('Case', { exact: true }).selectOption(caseId);
  await gut.getByRole('button', { name: 'Add question and open brief' }).click();

  await expect(page).toHaveURL(new RegExp(`/app/case-prep\\?caseId=${caseId}`));
  await expect(page.getByText('What should I ask my doctor about recurring bloating?').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Live Gut question context' })).toBeVisible();
  await expect(page.getByText('Patient report · read from current records')).toBeVisible();

  await page.getByPlaceholder('What do you remember discussing? Saved as your report.').fill('We discussed a follow-up visit.');
  await page.getByRole('button', { name: 'Save my visit note' }).click();
  await expect(page.getByText('Patient-entered visit note:').first()).toBeVisible();
  await page.getByRole('region', { name: 'Live Gut question context' }).getByRole('button', { name: 'Open Gut question and exact sources' }).click();
  const returnedGut = page.getByRole('dialog', { name: 'Gut Health' });
  await expect(returnedGut.getByRole('heading', { name: 'What should I ask my doctor about recurring bloating?' })).toBeVisible();
  await expect(returnedGut.getByText('Visit follow-through from Case Prep')).toBeVisible();
  await expect(returnedGut.getByText('We discussed a follow-up visit.')).toBeVisible();
  await expect(returnedGut.getByText('Patient-entered visit report:')).toBeVisible();
});
