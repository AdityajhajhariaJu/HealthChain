import { test, expect } from '@playwright/test';

test('Gut research appraises indexed metadata without sending the personal question', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem('hc_guest_mode', 'true');
    localStorage.setItem('hc_onboarded', 'true');
    localStorage.setItem('hc_cookies_accepted', 'declined');
  });
  await page.route(/https:\/\//, (route) => route.abort());
  let literatureQuery = '';
  await page.route(/https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/search/, (route) => {
    literatureQuery = new URL(route.request().url()).searchParams.get('query') || '';
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ resultList: { result: [{
      pmid: '13579', title: 'Diet and bloating in children', abstractText: 'A study of children.',
      journalInfo: { journal: { title: 'Example Journal' } }, pubTypeList: { pubType: ['Journal Article'] },
      pubYear: '2024', electronicPublicationDate: '2024-05-19',
    }] } }) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/today?gut=1', { waitUntil: 'domcontentloaded' });
  const gut = page.getByRole('dialog', { name: 'Gut Health' });
  await gut.getByRole('button', { name: /I want to understand/ }).click();
  await gut.getByLabel('Your question or situation').fill('Is my private chai recipe linked to bloating?');
  await gut.getByRole('button', { name: 'Open my question' }).click();
  await gut.getByRole('button', { name: 'Explore research' }).click();
  const card = gut.getByRole('article').filter({ hasText: 'Diet and bloating in children' });
  await expect(card.getByText('The title names children or adolescents.')).toBeVisible();
  await expect(card.getByText('The comparator and measured outcome require checking the original paper.')).toBeVisible();
  await expect(card.getByText('2024-05-19 (electronic date)')).toBeVisible();
  await expect(card.getByRole('link', { name: 'Open original' })).toHaveAttribute('href', 'https://pubmed.ncbi.nlm.nih.gov/13579/');
  expect(literatureQuery).toContain('abdominal bloating');
  expect(literatureQuery).not.toContain('private chai recipe');
  expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});
