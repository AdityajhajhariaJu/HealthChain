import { chromium, devices } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  });
  const page = await context.newPage();
  
  // Set safe area insets via Chrome CDP for testing the CSS variable logic
  const session = await context.newCDPSession(page);
  await session.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
  
  await page.goto('http://localhost:3001/');
  
  // Wait for the app shell to load
  await page.waitForSelector('.mobile-top-bar');
  
  // Get computed styles
  const styles = await page.evaluate(() => {
    const topBar = document.querySelector('.mobile-top-bar');
    const content = document.querySelector('.app-shell__content.mobile');
    return {
      topBarHeight: getComputedStyle(topBar).height,
      topBarPaddingTop: getComputedStyle(topBar).paddingTop,
      contentPaddingTop: content ? getComputedStyle(content).paddingTop : 'N/A',
      cssVar: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-top')
    };
  });
  
  console.log(JSON.stringify(styles, null, 2));
  
  await browser.close();
})();
