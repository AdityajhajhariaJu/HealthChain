import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running the Supabase smoke check.');
}

const client = createClient(url, key, { auth: { persistSession: false } });
const requiredRelations = [
  'profiles',
  'cases',
  'health_memory',
  'healthchain_profiles',
  'user_devices',
  'analytics_events',
  'ai_requests',
  'ai_usage_daily',
  'payments',
  'healthchain_user_summary',
  'healthchain_case_overview',
  'healthchain_memory_overview',
];
const expectedAnonDenied = new Set([
  'healthchain_profiles',
  'ai_requests',
  'ai_usage_daily',
  'payments',
  'healthchain_user_summary',
  'healthchain_case_overview',
  'healthchain_memory_overview',
]);
const checks = [];

for (const relation of requiredRelations) {
  const { data, error } = await client.from(relation).select('*').limit(1);
  const permissionDenied = error?.code === '42501';
  const check = {
    relation,
    ok: !error || (permissionDenied && expectedAnonDenied.has(relation)),
    error: error?.code || error?.message || null,
    protected_from_anon: permissionDenied && expectedAnonDenied.has(relation),
  };
  if (Array.isArray(data) && data.length > 0) {
    check.ok = false;
    check.error = 'anonymous_data_visible';
  }
  checks.push(check);
}

const missing = checks.filter((check) => !check.ok);
console.log(JSON.stringify({ project: new URL(url).hostname, checks }, null, 2));
if (missing.length) {
  throw new Error(`Supabase smoke check failed for: ${missing.map((check) => check.relation).join(', ')}`);
}

console.log('Supabase anonymous smoke check passed: relations exist and server-only tables expose no rows.');
