import { expect, test } from '@playwright/test';

const guest = () => {
  localStorage.setItem('hc_guest_mode', 'true');
  localStorage.setItem('hc_onboarded', 'true');
  localStorage.setItem('hc_cookies_accepted', 'declined');
};

test('the retired medicine and lab page is absent from navigation and old links redirect', async ({ page }) => {
  await page.addInitScript(guest);
  await page.goto('/app/today');
  await expect(page.getByRole('link', { name: 'Medicine & Lab Reports' })).toHaveCount(0);

  await page.goto('/app/pharmacy');
  await expect(page).toHaveURL(/\/app\/profile(?:[?#]|$)/);
  await expect(page.getByText('Common medicines', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Records & Vitals' }).click();
  const medicationName = page.getByRole('textbox', { name: 'Medication name' });
  await medicationName.fill('Example medicine');
  await page.locator('form').filter({ has: medicationName }).getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Example medicine', { exact: true })).toBeVisible();

  await page.goto('/app/reports');
  await expect(page).toHaveURL(/\/app\/my-cases(?:[?#]|$)/);

  await page.goto('/app/medicine-lab');
  await expect(page).toHaveURL(/\/app\/profile(?:[?#]|$)/);
});
