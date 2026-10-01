import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
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
  /^(dist|playwright-report|test-results|supabase\/\.temp|scripts\/archive)\//.test(name)
);
if (scratch.length || generated.length)
  throw new Error(
    `Repository artifacts must stay outside source: ${[...scratch, ...generated].join(', ')}`
  );
console.log(
  'Repository hygiene passed: no tracked build/report/cache artifacts or root scratch scripts.'
);
