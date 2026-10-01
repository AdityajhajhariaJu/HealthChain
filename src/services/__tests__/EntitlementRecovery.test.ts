import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ writes: [] as any[], writeError: false, changed: false }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  rpc: async (name: string, params: any) => { state.writes.push({ name, params }); return { data: { recovered: !state.changed && !state.writeError }, error: state.writeError ? new Error('Synthetic write failure') : null }; },
  from: (table: string) => {
  let payload: any;
  const query: any = { select: () => query, eq: () => query, in: () => query, gt: () => query, order: () => query, range: () => query, is: () => query, maybeSingle: () => query,
    update: (value: any) => { payload = value; state.writes.push(value); return query; },
    then: (resolve: any) => Promise.resolve(table === 'payments' ? { data: [{ user_id: 'owner', status: 'paid', plan_id: 'pro_30_days', entitlement_expires_at: '2098-01-01T00:00:00Z' }] } : payload ? { data: state.changed ? [] : [{ id: 'owner' }], error: state.writeError ? new Error('Synthetic write failure') : null } : { data: { is_pro: false, pro_expires_at: '2099-01-01T00:00:00Z' } }).then(resolve),
  }; return query;
} }) }));
import handler, { latestRecoverableEntitlements } from '../../../api/recover.js';
beforeEach(() => { state.writes = []; state.writeError = false; state.changed = false; vi.stubEnv('CRON_SECRET', 'synthetic'); vi.stubEnv('SUPABASE_URL', 'https://synthetic.supabase.co'); vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-only'); });
afterEach(() => vi.unstubAllEnvs());
const response = () => ({ code: 200, body: null as any, setHeader() {}, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } });
it('uses the latest valid paid subscription and ignores top-ups, refunds and malformed receipts', () => {
  const row = { user_id: 'owner', status: 'paid', plan_id: 'pro_30_days', entitlement_expires_at: '2098-01-01' };
  const result = latestRecoverableEntitlements([row, { ...row, entitlement_expires_at: '2099-01-01' }, { ...row, plan_id: 'topup_ava', entitlement_expires_at: '2100-01-01' }, { ...row, status: 'refunded', entitlement_expires_at: '2101-01-01' }, { ...row, entitlement_expires_at: 'bad' }]);
  expect(result.get('owner')).toBe('2099-01-01T00:00:00.000Z');
});
it('delegates recovery to the transactional owner-specific database function', async () => {
  const res = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer synthetic' } }, res);
  expect(res.code).toBe(200); expect(res.body.recovered).toBe(1);
  expect(state.writes).toEqual([{ name: 'recover_subscription_entitlement', params: { p_user_id: 'owner' } }]);
});
it('does not claim failed writes or concurrent repairs as recovered', async () => {
  state.writeError = true; const failed = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer synthetic' } }, failed);
  expect(failed.code).toBe(503); expect(failed.body.recovered).toBe(0);
  state.writeError = false; state.changed = true; const concurrent = response(); await handler({ method: 'POST', headers: { authorization: 'Bearer synthetic' } }, concurrent); expect(concurrent.body.recovered).toBe(0);
});
it('requires the private operator credential before accessing the ledger', async () => {
  const res = response(); await handler({ method: 'POST', headers: {} }, res); expect(res.code).toBe(401); expect(state.writes).toEqual([]);
});
