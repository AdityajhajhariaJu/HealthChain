import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ platform: 'ios', owner: 'owner-a', products: vi.fn(), purchase: vi.fn(), finish: vi.fn(), consume: vi.fn(), refresh: vi.fn(), restore: vi.fn(), list: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => m.platform } }));
vi.mock('@capacitor/app', () => ({ App: {} }));
vi.mock('@capgo/native-purchases', () => ({ PURCHASE_TYPE: { SUBS: 'subs' }, NativePurchases: {
  getProducts: m.products,
  purchaseProduct: m.purchase, acknowledgePurchase: m.finish, consumePurchase: m.consume,
  restorePurchases: m.restore, getPurchases: m.list,
} }));
vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: m.owner }, access_token: 'synthetic-auth' } } }) } } }));
vi.mock('../ProfileEngine', () => ({ verifyProStatus: m.refresh }));
vi.mock('../ApiEndpoint', () => ({ apiEndpoint: (path: string) => path }));
import { buyStorePlan, restoreStorePurchases } from '../StorePurchases';
beforeEach(() => {
  vi.resetAllMocks(); m.platform = 'ios'; m.owner = 'owner-a';
  m.purchase.mockResolvedValue({ transactionId: '123', productIdentifier: 'com.healthchain.app.pro30', purchaseToken: 'synthetic-token' });
  m.finish.mockResolvedValue(undefined); m.consume.mockResolvedValue(undefined);
  m.products.mockImplementation(async () => ({ products: [m.platform === 'ios' ? { identifier: 'com.healthchain.app.pro30' }
    : { identifier: 'monthly', planIdentifier: 'com.healthchain.app.pro30' }] }));
  m.list.mockResolvedValue({ purchases: [] });
  vi.stubGlobal('fetch', vi.fn(async (_path, options) => ({ ok: true, json: async () => options?.method === 'POST'
    ? { success: true } : { products: { pro_30_days: 'com.healthchain.app.pro30' }, accountToken: 'synthetic-account-token' } })));
});
it('requires server fulfillment before finishing an Apple purchase', async () => {
  expect((await buyStorePlan('pro_30_days')).success).toBe(true);
  expect(m.purchase).toHaveBeenCalledWith(expect.objectContaining({ autoAcknowledgePurchases: false, appAccountToken: 'synthetic-account-token' }));
  expect(m.finish).toHaveBeenCalledWith({ purchaseToken: '123' }); expect(m.consume).not.toHaveBeenCalled();
});
it('does not finish or unlock when backend verification is unavailable', async () => {
  vi.mocked(fetch).mockImplementation(async (_url, options) => ({ ok: options?.method !== 'POST', json: async () => ({ products: { pro_30_days: 'com.healthchain.app.pro30' }, accountToken: 'synthetic-account-token' }) }) as any);
  expect(await buyStorePlan('pro_30_days')).toMatchObject({ success: false, pending: true });
  expect(m.finish).not.toHaveBeenCalled(); expect(m.refresh).not.toHaveBeenCalled();
});
it('never assigns a completed payment to an account switched during checkout', async () => {
  m.purchase.mockImplementation(async () => { m.owner = 'owner-b'; return { transactionId: '123', productIdentifier: 'com.healthchain.app.pro30' }; });
  await expect(buyStorePlan('pro_30_days')).rejects.toThrow('account');
  expect(vi.mocked(fetch).mock.calls.filter(([,options]) => options?.method === 'POST')).toHaveLength(0);
  expect(m.finish).not.toHaveBeenCalled();
});
it('uses server acknowledgement for Android subscriptions without consuming them', async () => {
  m.platform = 'android'; expect((await buyStorePlan('pro_30_days')).success).toBe(true);
  expect(m.finish).not.toHaveBeenCalled(); expect(m.consume).not.toHaveBeenCalled();
});
it('handles cancellation without verification or an error', async () => {
  m.purchase.mockRejectedValue(new Error('User cancelled'));
  expect(await buyStorePlan('pro_30_days')).toMatchObject({ cancelled: true, success: false });
  expect(m.finish).not.toHaveBeenCalled();
});
it('registers Android pending payments for later server notification without unlocking access', async () => {
  m.platform = 'android'; m.purchase.mockRejectedValue(new Error('Purchase is pending'));
  m.list.mockResolvedValue({ purchases: [{ transactionId: 'pending', purchaseToken: 'synthetic-token', productIdentifier: 'com.healthchain.app.pro30' }] });
  vi.mocked(fetch).mockImplementation(async (_url, options) => ({ ok: true, json: async () => options?.method === 'POST'
    ? { success: false, pending: true } : { products: { pro_30_days: 'com.healthchain.app.pro30' }, accountToken: 'synthetic-account-token' } }) as any);
  expect(await buyStorePlan('pro_30_days')).toMatchObject({ success: false, pending: true });
  expect(vi.mocked(fetch).mock.calls.filter(([,options]) => options?.method === 'POST')).toHaveLength(1);
  expect(m.finish).not.toHaveBeenCalled(); expect(m.refresh).not.toHaveBeenCalled();
});
it('refreshes server account access when no active purchase is returned by the device', async () => {
  m.platform = 'android'; expect((await restoreStorePurchases()).success).toBe(true);
  expect(m.refresh).toHaveBeenCalled(); expect(m.purchase).not.toHaveBeenCalled();
});
