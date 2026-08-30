import { chromium, devices } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13']
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3001/app/dashboard');
  
  await page.waitForTimeout(3000);
  console.log('Current URL:', page.url());
  
  await browser.close();
})();
