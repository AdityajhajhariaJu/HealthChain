import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ authenticated: true, enabled: true, verify: vi.fn(), rpc: vi.fn(), acknowledge: vi.fn() }));
vi.mock('../../../server/rate-limit.js', () => ({ checkRateLimit: () => true }));
vi.mock('../../../server/store-verification.js', () => ({
  storeEnabled: () => m.enabled, storeAccountToken: () => 'synthetic-account-token', storeTransactionKey: () => 'synthetic-key',
  verifyStorePurchase: m.verify, verifyAppleNotification: vi.fn(), verifyGoogleNotification: vi.fn(),
  acknowledgeGooglePurchase: m.acknowledge,
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: m.authenticated ? { id: 'authenticated-owner' } : null }, error: null }) }, rpc: m.rpc,
}) }));
import handler from '../../../server/store-purchases.js';
import paymentHandler from '../../../api/verify-payment.js';
beforeEach(() => {
  vi.resetAllMocks(); m.authenticated = true; m.enabled = true;
  m.verify.mockResolvedValue({ transactionKey: 'synthetic-key', groupKey: 'synthetic-group', productId: 'com.healthchain.app.pro30',
    planId: 'pro_30_days', purchasedAt: '2026-10-05T00:00:00Z', expiresAt: '2026-11-05T00:00:00Z', revoked: false });
  m.rpc.mockResolvedValue({ data: { success: true }, error: null });
});
async function call(platform = 'ios', endpoint = handler, query = undefined) {
  const result = {}; const res = { setHeader() {}, status(code) { result.code = code; return res; }, json(body) { result.body = body; return res; } };
  await endpoint({ method: 'POST', query, headers: { authorization: 'Bearer synthetic-auth' }, body: {
    platform, userId: 'attacker-selected-owner', transactionId: '123', purchaseToken: 'synthetic-token', amount: 1, expiresAt: '2099-01-01',
  } }, res); return result;
}
it('derives owner from verified authentication and entitlements from store proof', async () => {
  expect(await call()).toMatchObject({ code: 200, body: { success: true } });
  expect(m.verify.mock.calls[0][2]).toBe('authenticated-owner');
  expect(m.rpc.mock.calls[0][1]).toMatchObject({ p_user_id: 'authenticated-owner', p_expires_at: '2026-11-05T00:00:00Z' });
  expect(m.rpc.mock.calls[0][1]).not.toHaveProperty('amount');
});
it('acknowledges Google only after successful durable fulfillment', async () => {
  const events = [];
  m.rpc.mockImplementation(async () => { events.push('grant'); return { data: { success: true }, error: null }; });
  m.acknowledge.mockImplementation(async () => { events.push('acknowledge'); });
  expect((await call('android')).code).toBe(200); expect(events).toEqual(['grant', 'acknowledge']);
  m.rpc.mockResolvedValue({ data: null, error: new Error('synthetic-database-failure') });
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect((await call('android')).code).toBe(503); expect(m.acknowledge).toHaveBeenCalledTimes(1); log.mockRestore();
});
it('rejects invalid authentication before checking a receipt', async () => {
  m.authenticated = false; expect((await call()).code).toBe(401); expect(m.verify).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
});
it('fails closed while store setup is disabled', async () => {
  m.enabled = false; expect((await call()).code).toBe(503); expect(m.verify).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
});
it('dispatches the rewritten native route without requiring web gateway credentials', async () => {
  expect(await call('android', paymentHandler, { checkout: 'store' })).toMatchObject({ code: 200, body: { success: true } });
  expect(m.verify).toHaveBeenCalledWith('android', expect.objectContaining({ purchaseToken: 'synthetic-token' }), 'authenticated-owner');
});
it('preserves native authentication and disabled-checkout behavior through the rewritten route', async () => {
  m.authenticated = false;
  expect((await call('ios', paymentHandler, { checkout: 'store' })).code).toBe(401);
  m.authenticated = true; m.enabled = false;
  expect((await call('ios', paymentHandler, { checkout: 'store' })).code).toBe(503);
  expect(m.verify).not.toHaveBeenCalled(); expect(m.rpc).not.toHaveBeenCalled();
});
it('does not claim fulfillment or expose provider errors when verification fails', async () => {
  m.verify.mockRejectedValue(new Error('synthetic-private-token-or-provider-url'));
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  const result = await call(); expect(result.code).toBe(503); expect(result.body.success).not.toBe(true);
  expect(m.rpc).not.toHaveBeenCalled(); expect(log.mock.calls).toEqual([['Store verification or fulfillment unavailable.']]); log.mockRestore();
});
