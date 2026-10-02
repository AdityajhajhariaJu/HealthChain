/** Evaluate real examples through production prompts and normalizers. */
import { config } from 'dotenv';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
config({ path: resolve(root, '.env.local'), quiet: true });
config({ path: resolve(root, '.env'), quiet: true });
if (!process.env.GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY) {
  console.error(
    'Live evaluation did not run: configure GEMINI_API_KEY in the environment or .env.local. No simulated pass is reported.'
  );
  process.exit(1);
}
if (process.argv.length > 2) {
  console.error(
    'Use environment configuration for evaluation. API keys must not be passed on the command line.'
  );
  process.exit(1);
}
console.log(
  'Evaluating 12 Gut and 7 clinical synthetic examples. Urgent cases use the local care path; other cases call Gemini. Authentication, quota and persistence are excluded.'
);
const result = spawnSync(
  process.execPath,
  [
    resolve(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    'src/services/__tests__/VerdictExamplesLive.test.ts',
  ],
  {
    cwd: root,
    env: { ...process.env, VERDICT_LIVE_EVAL: '1' },
    stdio: 'inherit',
    windowsHide: true,
  }
);
if (result.error) console.error('Could not start live evaluation:', result.error.message);
process.exit(result.status ?? 1);
