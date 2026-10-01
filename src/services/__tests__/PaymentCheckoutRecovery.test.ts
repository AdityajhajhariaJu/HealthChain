// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../ProfileEngine', () => ({ verifyProStatus: vi.fn(async () => undefined) }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => 'web' } }));
import { initiateRazorpayCheckout, getPendingPayment, recordPendingPayment } from '../razorpay';
const user = { id: 'synthetic-owner', email: 'synthetic@example.test' };
beforeEach(() => { localStorage.clear(); vi.stubEnv('VITE_RAZORPAY_KEY_ID', 'rzp_test_synthetic'); vi.stubEnv('VITE_BACKEND_URL', ''); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); delete (window as any).Razorpay; });
function checkout(verification: any) {
  (window as any).Razorpay = function (options: any) { this.open = () => void options.handler({ razorpay_order_id: 'order-synthetic', razorpay_payment_id: 'payment-synthetic', razorpay_signature: 'synthetic' }); };
  const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'order-synthetic', amount: 9900, currency: 'INR' }) }).mockResolvedValueOnce(verification);
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
it.each([409, 429, 502, 503])('keeps a payment receipt after HTTP %s verification failure', async status => {
  checkout({ ok: false, status, json: async () => ({ error: 'Confirmation is delayed.' }) });
  const result = await initiateRazorpayCheckout('topup_ava', user, 'synthetic-token');
  expect(result.success).toBe(false);
  expect(getPendingPayment(user.id)?.orderId).toBe('order-synthetic');
});
it('preserves the order if the verification response is unreadable', async () => {
  checkout({ ok: true, json: async () => { throw new Error('broken response'); } });
  await initiateRazorpayCheckout('topup_ava', user, 'synthetic-token');
  expect(getPendingPayment(user.id)?.orderId).toBe('order-synthetic');
});
it('blocks a second checkout while the previous payment needs confirmation', async () => {
  recordPendingPayment({ orderId: 'previous-order', planId: 'topup_ava', userId: user.id, timestamp: Date.now() });
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  const result = await initiateRazorpayCheckout('topup_ava', user, 'synthetic-token');
  expect(result.success).toBe(false); expect(fetch).not.toHaveBeenCalled();
  if (!result.success) expect(result.pendingOrderId).toBe('previous-order');
});
it('reports an SDK opening failure without trapping the UI in processing', async () => {
  const fetch = checkout({ ok: true, json: async () => ({ success: true }) });
  (window as any).Razorpay = function () { this.open = () => { throw new Error('SDK failed'); }; };
  const result = await initiateRazorpayCheckout('topup_ava', user, 'synthetic-token');
  expect(result.success).toBe(false); expect(fetch).toHaveBeenCalledTimes(1); expect(getPendingPayment(user.id)).toBeNull();
});
