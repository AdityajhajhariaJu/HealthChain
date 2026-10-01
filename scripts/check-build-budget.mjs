import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, 'dist/.vite/manifest.json'), 'utf8'));
const visited = new Set();
const assets = new Set();
function visit(key) {
  if (visited.has(key)) return;
  visited.add(key);
  const entry = manifest[key];
  if (!entry) throw new Error(`Missing manifest entry: ${key}`);
  assets.add(entry.file);
  for (const dependency of entry.imports || []) visit(dependency);
}
visit('index.html');
let bytes = 0;
let gzipBytes = 0;
for (const asset of assets) {
  if (/html2pdf|pdf-tools|SpatialGalleryCanvas|AreaChart/.test(asset))
    throw new Error(`Heavy feature entered startup graph: ${asset}`);
  const data = await readFile(join(root, 'dist', asset));
  bytes += data.length;
  gzipBytes += gzipSync(data).length;
}
// Baseline: 2,173,698 raw / 628,631 gzip bytes before this cleanup.
if (bytes > 950_000 || gzipBytes > 285_000)
  throw new Error(`Startup JavaScript exceeds budget: ${bytes} raw / ${gzipBytes} gzip bytes`);
console.log(
  `Startup JavaScript budget passed: ${bytes} raw / ${gzipBytes} gzip bytes across ${assets.size} assets.`
);
