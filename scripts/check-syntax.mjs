import { readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
async function sourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
    else if (/\.(js|mjs|cjs)$/.test(entry.name)) files.push(path);
  }
  return files;
}
const groups = await Promise.all(
  ['api', 'server', 'shared', 'scripts'].map((dir) => sourceFiles(join(root, dir)))
);
const files = groups.flat();
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log(
  `JavaScript syntax passed: ${files.length} API, server, shared and operational files, including nested endpoints.`
);
