import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(root, 'supabase', 'migrations');
const outputPath = join(root, 'supabase', 'APPLY_ALL.sql');
const files = (await readdir(migrationsDir)).filter((name) => name.endsWith('.sql')).sort();
const header = `-- HealthChain production migration bundle.\n-- Generated from supabase/migrations in filename order.\n-- Run this once in the target Supabase SQL Editor.\n-- It is intended to be idempotent for the current migration chain.\n`;
const sections = await Promise.all(files.map(async (file) => {
  const sql = (await readFile(join(migrationsDir, file), 'utf8')).replace(/[ \t]+$/gm, '').trim();
  return `\n-- ===== ${file} =====\n${sql}\n`;
}));
await writeFile(outputPath, `${header}${sections.join('')}\n`, 'utf8');
console.log(`Built ${outputPath} from ${files.length} migrations.`);
