import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'dist');
const target = resolve(root, 'dist-native');
if (target !== join(root, 'dist-native') || target === root)
  throw new Error('Invalid native output path.');
// This dedicated generated directory is never the web output or a source directory.
await readdir(source);
await rm(target, { recursive: true, force: true });
await mkdir(target);
await cp(source, target, {
  recursive: true,
  filter: (path) => resolve(path) !== join(source, 'audio'),
});
console.log('Native assets prepared in dist-native; audio remains in the Vercel web output.');
