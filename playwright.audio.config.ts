import { defineConfig } from '@playwright/test';
import development from './playwright.config';

export default defineConfig({
  ...development,
  testMatch: 'audio-player.spec.ts',
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 3001 --strictPort',
    url: 'http://localhost:3001',
    reuseExistingServer: false,
  },
});
