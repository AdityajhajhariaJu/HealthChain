import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
function duration(buffer, start = 0, end = buffer.length) {
  for (let offset = start; offset + 8 <= end;) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      size = Number(buffer.readBigUInt64BE(offset + 8));
      header = 16;
    }
    if (size === 0) size = end - offset;
    if (size < header || offset + size > end) break;
    const body = offset + header;
    if (type === 'moov') return duration(buffer, body, offset + size);
    if (type === 'mvhd') {
      const version = buffer[body];
      const scale = buffer.readUInt32BE(body + (version === 1 ? 20 : 12));
      const ticks =
        version === 1 ? Number(buffer.readBigUInt64BE(body + 24)) : buffer.readUInt32BE(body + 16);
      return scale ? Math.round(ticks / scale) : 0;
    }
    offset += size;
  }
  return 0;
}
const manifest = {};
for (const name of (await readdir(new URL('public/audio/', root))).sort()) {
  if (!name.endsWith('.m4a')) continue;
  const data = await readFile(new URL(`public/audio/${encodeURIComponent(name)}`, root));
  manifest['/audio/' + name] = {
    bytes: data.length,
    seconds: duration(data),
    sha256: createHash('sha256').update(data).digest('hex'),
  };
}
const destination = new URL('src/data/audio-manifest.json', root);
for (const file of ['src/data/MeditationTracks.ts', 'src/features/calm/MeditationPlayer.tsx']) {
  const source = await readFile(new URL(file, root), 'utf8');
  for (const [, path] of source.matchAll(/['"](\/audio\/[^'"]+\.m4a)['"]/g)) {
    if (!manifest[path]) throw new Error(`Missing audio referenced by ${file}: ${path}`);
  }
}
const output = JSON.stringify(manifest, null, 2) + '\n';
if ((await readFile(destination, 'utf8').catch(() => '')) !== output)
  await writeFile(destination, output);
console.log(
  `Audio manifest: ${Object.keys(manifest).length} verified tracks (${fileURLToPath(destination)}).`
);
