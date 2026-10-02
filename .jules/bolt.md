## 2024-10-02 - WebKit Playwright Test Flakiness
**Learning:** Found that a test tests/e2e/daily-trackers.spec.ts was flaking locally and in CI with 'locator resolved to button type=button - attempting click action - element is not stable' on WebKit when clicking 'Take Dose'. It turns out WebKit had not even been installed properly.
**Action:** When debugging Playwright timeouts that occur on specific browsers (like [webkit]), ensure all required browsers are installed with 'npx playwright install' before running tests to prevent weird execution states and timeouts.
