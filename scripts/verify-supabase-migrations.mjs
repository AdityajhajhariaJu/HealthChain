import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRODUCT_CATALOG } from '../shared/productCatalog.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const migrationsDir = join(root, 'supabase', 'migrations');
const verifierPath = join(root, 'supabase', 'verify_production.sql');
const bundlePath = join(root, 'supabase', 'APPLY_ALL.sql');

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
  '20260911_conflict_safe_sync.sql',
  '20260911_payment_lifecycle_resilience.sql',
  '20260917_ai_quota_reservations.sql',
  '20260924_gut_observations.sql',
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
const bundle = await readFile(bundlePath, 'utf8');
const missingBundleFiles = files.filter((file) => !bundle.includes(`===== ${file} =====`));
if (missingBundleFiles.length) {
  throw new Error(`Unified Supabase bundle is missing migrations: ${missingBundleFiles.join(', ')}`);
}
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
  'public.health_observations',
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
  'revoke all on table public.healthchain_profiles from anon',
  'revoke all on public.healthchain_user_overview',
  'healthchain_set_updated_at',
  'public.case_tombstones',
];
const missingSchemaTokens = requiredSchemaTokens.filter((token) => !allSql.includes(token));
if (missingSchemaTokens.length) {
  throw new Error(`Migration chain is missing required schema references: ${missingSchemaTokens.join(', ')}`);
}

const quotaMigration = await readFile(join(migrationsDir, '20260911_payment_lifecycle_resilience.sql'), 'utf8');
const quotaFunction = quotaMigration.split('create or replace function public.provision_base_quota')[1] || '';
const quotaBranches = quotaFunction.split("if p_plan_id = 'pro_90_days' then")[1] || '';
for (const planId of ['pro_30_days', 'pro_90_days']) {
  const plan = PRODUCT_CATALOG[planId];
  const planSection = planId === 'pro_90_days'
    ? quotaBranches.split('else')[0] || ''
    : quotaBranches.split('else')[1]?.split('end if')[0] || '';
  const expected = {
    v_ava: plan.quotas.ava_replies,
    v_qc: plan.quotas.quick_consult,
    v_collab: plan.quotas.deep_collab,
    v_jarvis: plan.quotas.jarvis,
    v_pharmacy: plan.quotas.pharmacy_hub,
    v_lab: plan.quotas.lab_report,
  };
  for (const [variable, value] of Object.entries(expected)) {
    if (!planSection.includes(`${variable} := ${value};`)) {
      throw new Error(`Product catalog drift: ${planId} ${variable} does not match database quota ${value}.`);
    }
  }
}

console.log(`Supabase migration contract passed: ${files.length} SQL files, ${requiredSchemaTokens.length} schema checks.`);
