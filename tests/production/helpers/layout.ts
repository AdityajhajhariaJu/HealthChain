import { expect, type Locator, type Page } from '@playwright/test';

export const caseTitle =
  'Long-running fatigue, digestive symptoms and specialist follow-up questions';
export const recordName =
  'Specialist-follow-up-report-with-laboratory-results-and-patient-questions-2026.pdf';
export const conditionName =
  'Chronic Rhinosinusitis (CRS) with secondary neurological symptoms under review';

export async function installLayoutFixture(page: Page) {
  await page.route(/https:\/\//, (route) => route.abort());
  await page.route('**/api/**', (route) => route.abort());
  await page.addInitScript(
    ({ caseTitle, recordName, conditionName }) => {
      const now = '2026-10-01T10:00:00Z';
      localStorage.setItem('hc_guest_mode', 'true');
    // Synthetic adult fixture; fresh-entry tests confirm through the UI.
    localStorage.setItem('hc_adult_eligibility_guest', JSON.stringify({ version: '2026-10-05-age-18', minimumAge: 18, confirmed: true, confirmedAt: '2026-10-05T00:00:00Z' }));
      localStorage.setItem('hc_onboarded', 'true');
      localStorage.setItem('hc_cookies_accepted', 'declined');
      localStorage.setItem(
        'hc_unified_profile_guest',
        JSON.stringify({
          activeId: 'profile_1',
          profiles: {
            profile_1: {
              id: 'profile_1',
              profileName: 'Synthetic responsive audit',
              onboardingCompletedAt: now,
              gamification: {
                version: 1,
                timezone: 'UTC',
                legacyPoints: 302,
                legacyLifetime: 302,
                legacyGardenLevel: 1,
                legacyLastTended: '',
                legacySourceKeys: [],
                receipts: {},
                importedBadges: ['first_checkin'],
                theme: { value: 'meadow', at: '' },
              },
              demographics: {
                name: 'Synthetic person with a long family name',
                age: 35,
                gender: 'female',
                height: 165,
                weight: 65,
              },
              conditions: [conditionName, 'Gastroesophageal reflux disease with ongoing follow-up'],
              medications: [
                {
                  name: 'Specialist-prescribed extended-release medicine with reminder instructions',
                  dosage: 'One tablet after the evening meal as prescribed',
                  time: '20:00',
                  circadianSlot: 'evening',
                },
              ],
              allergies: ['A documented allergy requiring discussion before a new prescription'],
              dietProfile: {
                age: '35',
                gender: 'female',
                height: '165',
                weight: '65',
                weightUnit: 'kg',
                heightUnit: 'cm',
                goal: 'Maintain',
                activityLevel: 'sedentary',
                cuisine: 'Local',
                mealSchedule: '3 Meals',
                medicalConditions: [],
                restrictions: [],
              },
            },
          },
        })
      );
      localStorage.setItem(
        'hc_cases_guest_profile_1',
        JSON.stringify([
          {
            id: 'layout-case',
            title: caseTitle,
            status: 'active',
            createdAt: now,
            updatedAt: now,
            intakeData: {
              symptoms: ['Fatigue'],
              timeline: '1–2 weeks',
              notes: 'Synthetic case for layout testing only.',
            },
            medicalRecords: [
              {
                id: 'layout-record',
                filename: recordName,
                findings: 'Synthetic record details for responsive checks.',
                source: 'Uploaded document',
                type: 'pdf',
                addedAt: now,
              },
            ],
            reviews: [],
            events: [
              {
                id: 'event-1',
                date: now,
                label: 'Follow-up notes recorded for the next specialist appointment',
                note: 'A saved note that needs to remain readable on a narrow display.',
              },
            ],
            currentSummary: null,
            currentStage: 'intake',
            actions: [
              {
                id: 'action-1',
                step: 'Discuss chronic rhinosinusitis and secondary neurological symptoms with your clinician',
                timeline: 'At next scheduled appointment',
                type: 'discussion',
                status: 'pending',
                order: 0,
              },
            ],
            differentials: [],
            questions: [],
          },
        ])
      );
      localStorage.setItem('hc_active_case_guest_profile_1', 'layout-case');
      localStorage.setItem(
        'hc_health_memory_guest_profile_1',
        JSON.stringify(
          Array.from({ length: 8 }, (_, i) => ({
            id: 'layout-memory-' + i,
            profileId: 'profile_1',
            kind: 'health_buddy',
            source: 'ava_confirmed_memory',
            title:
              'Synthetic confirmed memory about the questions and records to bring to a scheduled appointment ' +
              i,
            occurredAt: now,
            createdAt: now,
            updatedAt: now,
            payload: { userConfirmed: true },
          }))
        )
      );
    },
    { caseTitle, recordName, conditionName }
  );
}

export async function settleLayout(page: Page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => undefined))
    )
  );
}

/** Test rendered text, including overflow hidden by a parent; allow deliberate ellipsis and scrollable tabs. */
export async function expectReadableWidth(page: Page) {
  const issues = await page.evaluate(() => {
    const issues: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node; (node = walker.nextNode());) {
      const el = node.parentElement,
        text = node.textContent?.trim();
      if (
        !el ||
        !text ||
        text.length < 4 ||
        el.closest('script,style,svg,[aria-hidden="true"],.sr-only,[hidden]')
      )
        continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const b of range.getClientRects()) {
        if (b.bottom < 0 || b.top > innerHeight || b.width < 2 || b.height < 3) continue;
        let visible = true,
          scrollable = false,
          ellipsis = false,
          cut = false;
        for (let p: HTMLElement | null = el; p; p = p.parentElement) {
          const s = getComputedStyle(p),
            a = p.getBoundingClientRect();
          if (
            s.visibility === 'hidden' ||
            s.display === 'none' ||
            s.opacity === '0' ||
            a.width < 2 ||
            a.height < 2 ||
            (/auto|scroll|hidden|clip/.test(s.overflowY) &&
              (b.bottom < a.top + 2 || b.top > a.bottom - 2))
          ) {
            visible = false;
            break;
          }
          if (s.textOverflow === 'ellipsis') ellipsis = true;
          if (/auto|scroll/.test(s.overflowX) && p.scrollWidth > p.clientWidth + 2)
            scrollable = true;
          if (/hidden|clip/.test(s.overflowX) && (b.left < a.left - 2 || b.right > a.right + 2))
            cut = true;
        }
        if (visible && !scrollable && !ellipsis && (cut || b.left < -2 || b.right > innerWidth + 2))
          issues.push(text.slice(0, 100));
      }
    }
    return [...new Set(issues)];
  });
  expect(issues, 'Text should wrap rather than spill outside the viewport').toEqual([]);
}

export async function expectUsableControl(control: Locator, page: Page) {
  await control.scrollIntoViewIfNeeded();
  await control.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expect(control).toBeVisible();
  await expect
    .poll(() =>
      control.evaluate((el) => {
        const b = el.getBoundingClientRect();
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        const style = getComputedStyle(document.documentElement);
        const heightValue = style.getPropertyValue('--app-viewport-height').trim();
        const height = heightValue.endsWith('px') ? parseFloat(heightValue) : innerHeight;
        const bottomInset = parseFloat(style.getPropertyValue('--safe-area-bottom')) || 0;
        return (
          b.top >= 0 &&
          b.bottom <= height - bottomInset + 1 &&
          b.left >= 0 &&
          b.right <= innerWidth + 1 &&
          !!hit &&
          el.contains(hit)
        );
      })
    )
    .toBe(true);
}

export async function expectDialogFits(dialog: Locator, page: Page, landscape = false) {
  await expect(dialog).toBeVisible();
  await settleLayout(page);
  const panel = dialog.locator('[data-overlay-panel]').first();
  const target = (await panel.count()) ? panel : dialog;
  await expect
    .poll(() =>
      target
        .evaluate((el) => {
          const b = el.getBoundingClientRect();
          const style = getComputedStyle(document.documentElement);
          const height = parseFloat(style.getPropertyValue('--app-viewport-height')) || innerHeight;
          return {
            top: b.top,
            bottom: b.bottom,
            left: b.left,
            right: b.right,
            height,
            width: innerWidth,
            overflow: el.scrollWidth - el.clientWidth,
            sheet: !!el.closest('[data-overlay-viewport="sheet"]'),
          };
        })
        .then(
          (b) =>
            b.top >= (landscape ? 12 : 59) - 1 &&
            b.bottom <= b.height - (b.sheet ? 0 : landscape ? 21 : 34) + 1 &&
            b.left >= (landscape ? 44 : 0) - 1 &&
            b.right <= b.width - (landscape ? 44 : 0) + 1 &&
            b.overflow <= 2
        )
    )
    .toBe(true);
  expect(await dialog.evaluate((el) => !!el.closest('#main-content'))).toBe(false);
  const header = dialog.locator('[data-overlay-header]').first();
  const scroll = dialog.locator('[data-overlay-scroll]').first();
  if ((await header.count()) && (await scroll.count())) {
    const h = await header.boundingBox(),
      b = await scroll.boundingBox();
    expect(b!.y).toBeGreaterThanOrEqual(h!.y + h!.height - 1);
  }
  await expectReadableWidth(page);
}
