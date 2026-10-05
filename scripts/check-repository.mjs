import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const rootFiles = (await readdir(root, { withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name);
const scratch = rootFiles.filter(
  (name) =>
    /\.(py|pdf|txt)$/.test(name) ||
    /^(scratch_|temp_old_|migration_payload|restored\.|replace\.|update\.)/.test(name)
);
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0');
const generated = tracked.filter((name) =>
  /^(dist|dist-native|playwright-report|test-results|supabase\/\.temp|scripts\/archive)\//.test(
    name
  )
);
if (scratch.length || generated.length)
  throw new Error(
    `Repository artifacts must stay outside source: ${[...scratch, ...generated].join(', ')}`
  );
// This Vite project maps each standalone api/ entry to a Vercel function.
// Keep within the current Hobby deployment limit before pushing a preview.
async function apiEntries(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? apiEntries(join(directory, entry.name))
    : /\.(js|mjs|cjs|ts|py|go|rb)$/.test(entry.name) && !entry.name.endsWith('.d.ts')
      ? [join(directory, entry.name)] : []))).flat();
}
const functions = await apiEntries(join(root, 'api'));
if (functions.length > 12)
  throw new Error(`Vercel Hobby supports 12 standalone API functions; found ${functions.length}. Consolidate an endpoint before deployment.`);
console.log(
  `Repository hygiene passed: no tracked build/report/cache artifacts or root scratch scripts; ${functions.length}/12 Vercel API functions.`
);
