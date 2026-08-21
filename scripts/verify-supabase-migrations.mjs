import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(root, 'supabase', 'migrations');
const verifierPath = join(root, 'supabase', 'verify_production.sql');

const requiredFiles = [
  '20260818_health_memory.sql',
  '20260821_account_deletion.sql',
  '20260821_ai_control.sql',
  '20260821_ai_quota.sql',
  '20260821_base_events_payments.sql',
  '20260821_data_integrity.sql',
  '20260821_operator_views.sql',
  '20260821_payment_entitlement.sql',
  '20260821_payment_integrity.sql',
  '20260822_caregiver_profiles.sql',
];

const requiredVerifierTokens = [
  'healthchain_user_overview',
  'healthchain_user_summary',
  'healthchain_case_overview',
  'healthchain_memory_overview',
  'delete_healthchain_user_data',
  'activate_payment_entitlement',
];

const files = (await readdir(migrationsDir, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => entry.name)
  .sort();

const missingFiles = requiredFiles.filter((file) => !files.includes(file));
if (missingFiles.length) {
  throw new Error(`Missing required Supabase migrations: ${missingFiles.join(', ')}`);
}

const verifier = await readFile(verifierPath, 'utf8');
const missingVerifierTokens = requiredVerifierTokens.filter((token) => !verifier.includes(token));
if (missingVerifierTokens.length) {
  throw new Error(`Production verifier is missing required checks: ${missingVerifierTokens.join(', ')}`);
}

const migrationText = await Promise.all(
  files.map(async (file) => [file, await readFile(join(migrationsDir, file), 'utf8')]),
);
const allSql = migrationText.map(([, sql]) => sql).join('\n');
const requiredSchemaTokens = [
  'public.health_memory',
  'public.healthchain_profiles',
  'public.user_devices',
  'public.ai_requests',
  'public.ai_usage_daily',
  'public.analytics_events',
  'public.payments',
  'public.healthchain_user_summary',
  'public.healthchain_memory_overview',
  'revoke all on table public.ai_requests from anon, authenticated',
  'revoke all on table public.ai_usage_daily from anon, authenticated',
  'revoke all on table public.payments from anon, authenticated',
  'healthchain_set_updated_at',
];
const missingSchemaTokens = requiredSchemaTokens.filter((token) => !allSql.includes(token));
if (missingSchemaTokens.length) {
  throw new Error(`Migration chain is missing required schema references: ${missingSchemaTokens.join(', ')}`);
}

console.log(`Supabase migration contract passed: ${files.length} SQL files, ${requiredSchemaTokens.length} schema checks.`);
