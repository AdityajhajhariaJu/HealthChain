# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: journey.spec.ts >> a forged browser auth flag cannot bypass the Supabase session boundary
- Location: tests/e2e/journey.spec.ts:31:1

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/login$/
Received string:  "http://localhost:3001/app/onboarding"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:3001/app/onboarding"

```

```yaml
- region "Privacy and Terms Preferences":
  - heading "Privacy & Terms" [level=4]
  - paragraph: HealthChain uses necessary storage for sign-in and app operation. Optional analytics helps us understand product usage and is loaded only if you accept it. See our Terms of Service and Privacy Policy.
  - button "Necessary only"
  - button "I Accept"
- link "Skip to main content":
  - /url: "#main-content"
- complementary:
  - img "HealthChain360.ai"
  - text: HealthChain360.ai Health Assessment & Case Prep
  - button "5 PTS 🥉 Rewards →"
  - button "View notifications"
  - navigation "Main navigation":
    - link "Health Today":
      - /url: /app/today
    - link "Consult":
      - /url: /app/consult
    - link "Clinical Data Engine":
      - /url: /app/jarvis
    - link "Case Prep":
      - /url: /app/case-prep
    - link "Clinical Trials":
      - /url: /app/trials
    - link "My Cases":
      - /url: /app/my-cases
    - link "Medical Profile":
      - /url: /app/profile
    - link "Diet Plan":
      - /url: /app/dietician
    - link "Ava Health Buddy":
      - /url: /app/ava
    - link "Medicine & Lab Reports":
      - /url: /app/medicine-lab
    - link "Settings":
      - /url: /app/settings
  - link "What's New":
    - /url: /changelog
  - link "Help":
    - /url: /help
  - link "Pricing":
    - /url: /pricing
  - link "Privacy":
    - /url: /privacy
  - link "Terms":
    - /url: /terms
  - strong: "Disclaimer:"
  - text: HealthChain360.ai is an AI Navigational and Researcher tool, not a doctor. It is not a substitute for professional medical advice.
- main:
  - text: YOUR CASE CONTEXT
  - strong: Start a case so HealthChain can keep your story connected.
  - button "Start a Quick Consult"
  - dialog "Welcome Onboarding Flow":
    - heading "Let's build your health story." [level=1]
    - paragraph: Clinical precision meets daily wellness.
    - button "Begin Journey"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test('guest can enter the assessment workspace from the public page', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   await expect(page).toHaveTitle(/HealthChain.*Health Assessment/i);
  6  |
  7  |   const consent = page.getByRole('button', { name: 'I Accept' });
  8  |   if (await consent.isVisible().catch(() => false)) {
  9  |     // The banner animates in WebKit; wait for it to render, then use a forced
  10 |     // click so the test does not mistake its entrance animation for a broken
  11 |     // public-to-app transition.
  12 |     await consent.waitFor({ state: 'visible' });
  13 |     await consent.click({ force: true });
  14 |   }
  15 |
  16 |   await expect(page.getByRole('heading', { name: /Your Symptoms\. Finally Explained\./i })).toBeVisible();
  17 |   await page.getByRole('button', { name: 'Start Your Assessment' }).click();
  18 |
  19 |   await expect(page).toHaveURL(/\/app\/collab\?new=true/);
  20 |   await expect(page.locator('.app-shell')).toBeVisible();
  21 |   await expect(page.getByText('Health Today')).toBeVisible();
  22 |   await expect(page.getByText(/Ready to find your root cause/i)).toHaveCount(0);
  23 | });
  24 |
  25 | test('clean unauthenticated browsers cannot open account case routes', async ({ page }) => {
  26 |   await page.goto('/app/my-cases');
  27 |   await expect(page).toHaveURL(/\/login$/);
  28 |   await expect(page.getByRole('heading', { name: /Welcome back|Create your account/i })).toBeVisible();
  29 | });
  30 |
  31 | test('a forged browser auth flag cannot bypass the Supabase session boundary', async ({ page }) => {
  32 |   await page.addInitScript(() => {
  33 |     window.localStorage.setItem('isAuthenticated', 'true');
  34 |   });
  35 |   await page.goto('/app/my-cases');
> 36 |   await expect(page).toHaveURL(/\/login$/);
     |                      ^ Error: expect(page).toHaveURL(expected) failed
  37 |   await expect(page.getByRole('heading', { name: /Welcome back|Create your account/i })).toBeVisible();
  38 | });
  39 |
```