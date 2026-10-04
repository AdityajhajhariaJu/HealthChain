import { createHash } from 'node:crypto';
import { readFile, readdir, access, stat } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, 'dist-native');
const targets = ['android/app/src/main/assets/public', 'ios/App/App/public'];
const digest = (data) => createHash('sha256').update(data).digest('hex');
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path)));
    // OneDrive placeholders can be reported as links even when stat/readFile
    // resolve a regular file. Include them in the hash comparison as well.
    else if ((await stat(path)).isFile()) result.push(path);
    else throw new Error(`Unsupported native asset: ${path}`);
  }
  return result;
}
const expected = await files(source);
const failures = [];
for (const target of targets) {
  if (
    await access(join(root, target, 'audio')).then(
      () => true,
      () => false
    )
  )
    failures.push(`${target}/audio must not be bundled`);
  for (const file of expected) {
    const path = relative(source, file);
    const actual = await readFile(join(root, target, path)).catch(() => undefined);
    if (!actual || digest(actual) !== digest(await readFile(file)))
      failures.push(`${target}/${path}`);
  }
}
if (failures.length)
  throw new Error(
    `Native assets are missing or stale. Copy again before packaging:\n${failures.join('\n')}`
  );
console.log(
  `Native assets verified: ${expected.length} files match by SHA-256 on both platforms; no bundled audio.`
);
