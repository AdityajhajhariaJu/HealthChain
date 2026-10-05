import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const sdkVersion = lock.packages?.['node_modules/@supabase/supabase-js']?.version;
if (!/^\d+\.\d+\.\d+$/.test(sdkVersion || ''))
  throw new Error('A locked Supabase SDK version is required.');

const built = await build({
  entryPoints: ['supabase/functions/healthchain-health/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'es2022',
  write: false,
  minify: true,
  // The hosted Edge Runtime forbids environment mutation. Compile only these
  // non-secret runtime constants; credential reads remain server-side at runtime.
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env.HEALTHCHAIN_RUNTIME': '"supabase"',
  },
  external: ['node:*'],
  plugins: [
    {
      name: 'supabase-deno-import',
      setup(builder) {
        builder.onResolve({ filter: /^@supabase\/supabase-js$/ }, () => ({
          path: 'npm:@supabase/supabase-js@' + sdkVersion,
          external: true,
        }));
      },
    },
  ],
  logLevel: 'silent',
});
const files = [{ name: 'index.js', content: built.outputFiles[0].text }];
if (process.argv.includes('--stdout')) process.stdout.write(JSON.stringify(files));
else {
  const directory = process.argv[2];
  if (!directory) throw new Error('Provide a private output directory or --stdout.');
  await mkdir(resolve(directory), { recursive: true });
  await writeFile(resolve(directory, 'index.js'), files[0].content);
  console.log(
    `Health Edge bundle prepared: ${Buffer.byteLength(files[0].content)} bytes; no credentials embedded.`
  );
}
