import { defineConfig } from '@playwright/test';
import development from './playwright.config';

export default defineConfig({
  ...development,
  testDir: './tests',
  testMatch: ['e2e/landing-loading.spec.ts', 'e2e/journey.spec.ts', 'production/*.spec.ts'],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 3001 --strictPort',
    url: 'http://localhost:3001',
    reuseExistingServer: false,
  },
});
