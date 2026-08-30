import { chromium, devices } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13']
  });
  const page = await context.newPage();
  
  await page.goto('http://localhost:3001/app/dashboard');
  
  await page.waitForTimeout(3000);
  
  const info = await page.evaluate(() => {
    return {
      width: window.innerWidth,
      hasTopBar: !!document.querySelector('.mobile-top-bar'),
      html: document.body.innerHTML.substring(0, 500)
    };
  });
  console.log(info);
  
  await browser.close();
})();
