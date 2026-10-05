import { createClient } from '@supabase/supabase-js';
import { PRODUCT_CATALOG } from '../shared/productCatalog.js';

export function latestRecoverableEntitlements(payments, now = Date.now()) {
  const latest = new Map();
  for (const payment of payments || []) {
    const subscription = payment.product_type === 'subscription' || PRODUCT_CATALOG[payment.plan_id]?.type === 'subscription' ||
      (!payment.plan_id && !payment.product_type); // Older subscription receipts lack product metadata.
    const expiry = Date.parse(payment.entitlement_expires_at);
    if (!payment.user_id || !['paid', 'partially_refunded'].includes(payment.status) || !subscription || !Number.isFinite(expiry) || expiry <= now) continue;
    const previous = latest.get(payment.user_id);
    if (!previous || expiry > Date.parse(previous)) latest.set(payment.user_id, new Date(expiry).toISOString());
  }
  return latest;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'method_not_allowed' });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'unauthorized' });
  try {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return res.status(503).json({ error: 'recovery_unavailable' });
    const database = createClient(url, key, { auth: { persistSession: false } });
    const now = Date.now();
    const latest = new Map();
    // Page the ledger so paid owners beyond PostgREST's row limit are included.
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await database.from('payments').select('user_id,status,plan_id,product_type,entitlement_expires_at')
        .in('status', ['paid', 'partially_refunded']).gt('entitlement_expires_at', new Date(now).toISOString()).order('id').range(offset, offset + 499);
      if (error) throw error;
      for (const [owner, expiry] of latestRecoverableEntitlements(data, now)) {
        if (!latest.has(owner) || Date.parse(expiry) > Date.parse(latest.get(owner))) latest.set(owner, expiry);
      }
      if (!data || data.length < 500) break;
    }
    let recovered = 0;
    let failed = 0;
    for (const owner of latest.keys()) {
      const result = await database.rpc('recover_subscription_entitlement', { p_user_id: owner });
      if (result.error) failed++;
      else if (result.data?.recovered === true) recovered++;
    }
    return res.status(failed ? 503 : 200).json({ success: failed === 0, recovered, failed, message: failed ? 'Some entitlements need another recovery attempt.' : `Recovered ${recovered} lost entitlements.` });
  } catch {
    console.error('Entitlement recovery failed:');
    return res.status(503).json({ error: 'recovery_unavailable' });
  }
}
