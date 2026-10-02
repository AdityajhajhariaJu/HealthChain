import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, 'dist/.vite/manifest.json'), 'utf8'));
const deferredFeatures =
  /html2pdf|pdf-tools|SpatialGalleryCanvas|AreaChart|AccountLifecycle|CaseEngine|ProfileEngine|HealthMemory|geminiService|clinicalReasoningEngine|supabaseClient/;

async function checkGraph(label, keys, rawLimit, gzipLimit) {
  const visited = new Set();
  const assets = new Set();
  function visit(key) {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (!entry) throw new Error(`Missing manifest entry: ${key}`);
    if (deferredFeatures.test(entry.name || '') || deferredFeatures.test(entry.file))
      throw new Error(`Deferred feature entered ${label} graph: ${entry.file}`);
    assets.add(entry.file);
    for (const dependency of entry.imports || []) visit(dependency);
  }
  keys.forEach(visit);
  let bytes = 0;
  let gzipBytes = 0;
  for (const asset of assets) {
    const data = await readFile(join(root, 'dist', asset));
    bytes += data.length;
    gzipBytes += gzipSync(data).length;
  }
  if (bytes > rawLimit || gzipBytes > gzipLimit)
    throw new Error(`${label} JavaScript exceeds budget: ${bytes} raw / ${gzipBytes} gzip bytes`);
  console.log(
    `${label} JavaScript budget passed: ${bytes} raw / ${gzipBytes} gzip bytes across ${assets.size} assets.`
  );
}

// Auth and feature engines load after the first render. The Rollup module
// boundary also prevents animation runtimes entering the public render graph.
await checkGraph('Startup', ['index.html'], 350_000, 110_000);
// The landing route is lazy, so checking index.html alone misses its imports.
const landing = Object.keys(manifest).find((key) => manifest[key].name === 'Landing');
if (!landing) throw new Error('Missing public Landing manifest entry');
await checkGraph('Public landing', ['index.html', landing], 390_000, 129_000);
