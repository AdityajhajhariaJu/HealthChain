import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ apple: vi.fn(), statuses: vi.fn(), decode: vi.fn(), google: vi.fn(), verifier: vi.fn() }));
vi.mock('@apple/app-store-server-library', () => ({ Environment: { SANDBOX: 'Sandbox', PRODUCTION: 'Production' },
  AppStoreServerAPIClient: class { getTransactionInfo = m.apple; getAllSubscriptionStatuses = m.statuses; },
  SignedDataVerifier: class { constructor(...args) { m.verifier(...args); } verifyAndDecodeTransaction = m.decode; },
}));
vi.mock('google-auth-library', () => ({ GoogleAuth: class { async getClient() { return { request: m.google }; } }, OAuth2Client: class {} }));
import { storeAccountToken, storeEnabled, verifyStorePurchase, acknowledgeGooglePurchase } from '../../../server/store-verification.js';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STORE_ACCOUNT_TOKEN_SECRET', 'synthetic-secret-at-least-32-characters-long');
  vi.stubEnv('APPLE_STORE_PRIVATE_KEY', 'synthetic-not-a-key'); vi.stubEnv('APPLE_STORE_KEY_ID', 'synthetic');
  vi.stubEnv('APPLE_STORE_ISSUER_ID', 'synthetic'); vi.stubEnv('APPLE_STORE_APP_ID', '123');
  vi.stubEnv('APPLE_STORE_ENVIRONMENT', 'Production'); vi.stubEnv('APPLE_STORE_ENABLED', 'true');
  vi.stubEnv('APPLE_STORE_NOTIFICATIONS_VERIFIED', 'true');
  vi.stubEnv('GOOGLE_STORE_SERVICE_ACCOUNT_JSON', '{}'); vi.stubEnv('GOOGLE_STORE_ALLOW_TEST', 'false');
  m.apple.mockResolvedValue({ signedTransactionInfo: 'fresh-server-status' });
  m.statuses.mockResolvedValue({ data: [{ lastTransactions: [{ originalTransactionId: '123', status: 1, signedTransactionInfo: 'current-renewal' }] }] });
  m.decode.mockResolvedValue({ transactionId: '123', originalTransactionId: '123', type: 'Auto-Renewable Subscription', quantity: 1,
    inAppOwnershipType: 'PURCHASED', appAccountToken: storeAccountToken('owner-a'), productId: 'com.healthchain.app.pro30',
    purchaseDate: Date.now() - 1000, expiresDate: Date.now() + 86400000 });
});
it('fetches fresh Apple status and requires certificate revocation, bundle and production verification', async () => {
  const result = await verifyStorePurchase('ios', { transactionId: '123', jwsRepresentation: 'stale-device-jws' }, 'owner-a');
  expect(result.planId).toBe('pro_30_days'); expect(m.apple).toHaveBeenCalledWith('123');
  expect(m.decode).toHaveBeenCalledWith('fresh-server-status'); expect(m.decode).toHaveBeenCalledWith('current-renewal');
  expect(m.verifier).toHaveBeenCalledWith([expect.any(Buffer)], true, 'Production', 'com.healthchain.app', 123);
});
it('does not accept a purchase from another account', async () => {
  await expect(verifyStorePurchase('ios', { transactionId: '123' }, 'owner-b')).rejects.toThrow('ownership');
});
it('rejects unverified signatures rather than falling back to client claims', async () => {
  m.decode.mockRejectedValue(new Error('bad-signature'));
  await expect(verifyStorePurchase('ios', { transactionId: '123' }, 'owner-a')).rejects.toThrow('bad-signature');
});
it('returns revocation instead of granting an old refunded receipt', async () => {
  m.decode.mockResolvedValue({ ...(await m.decode()), revocationDate: Date.now() });
  expect((await verifyStorePurchase('ios', { transactionId: '123' }, 'owner-a')).revoked).toBe(true);
});
it('requires notification setup before enabling a store', () => {
  expect(storeEnabled('ios')).toBe(true); vi.stubEnv('APPLE_STORE_NOTIFICATIONS_VERIFIED', 'false');
  expect(storeEnabled('ios')).toBe(false); expect(storeEnabled('web')).toBe(false);
});
it('acknowledges pending Google acknowledgements without consuming a subscription', async () => {
  m.google.mockResolvedValue({ data: {} });
  await acknowledgeGooglePurchase({ purchaseToken: 'synthetic-token' }, { acknowledgementRequired: true, productId: 'com.healthchain.app.pro30' });
  expect(m.google.mock.calls[0][0]).toMatchObject({ method: 'POST', url: expect.stringContaining('/subscriptions/com.healthchain.app.pro30/tokens/synthetic-token:acknowledge') });
  m.google.mockClear();
  await acknowledgeGooglePurchase({ purchaseToken: 'synthetic-token' }, { acknowledgementRequired: false });
  expect(m.google).not.toHaveBeenCalled();
});
function googlePurchase(state = 'SUBSCRIPTION_STATE_ACTIVE') {
  return { externalAccountIdentifiers: { obfuscatedExternalAccountId: storeAccountToken('owner-a') }, subscriptionState: state,
    acknowledgementState: 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED',
    startTime: new Date(Date.now() - 1000).toISOString(),
    lineItems: [{ productId: 'com.healthchain.app.pro90', autoRenewingPlan: { autoRenewEnabled: true },
      offerDetails: { basePlanId: 'quarterly' }, latestSuccessfulOrderId: 'synthetic-order-1', expiryTime: new Date(Date.now() + 86400000).toISOString() }] };
}
it('checks Google publisher status, account binding and exact product rather than client values', async () => {
  m.google.mockResolvedValue({ data: googlePurchase() });
  expect((await verifyStorePurchase('android', { purchaseToken: 'synthetic-token' }, 'owner-a')).planId).toBe('pro_90_days');
  await expect(verifyStorePurchase('android', { purchaseToken: 'synthetic-token' }, 'owner-b')).rejects.toThrow('ownership');
});
it('registers pending Google payment without granting access', async () => {
  const data = googlePurchase('SUBSCRIPTION_STATE_PENDING'); delete data.startTime;
  m.google.mockResolvedValue({ data });
  expect(await verifyStorePurchase('android', { purchaseToken: 'synthetic-token' }, 'owner-a')).toMatchObject({ pending: true, purchasedAt: null, revoked: false });
});
it('rejects Google test transactions when production testing is disabled', async () => {
  m.google.mockResolvedValue({ data: { ...googlePurchase(), testPurchase: {} } });
  await expect(verifyStorePurchase('android', { purchaseToken: 'synthetic-token' }, 'owner-a')).rejects.toThrow('ownership');
});
it('keeps paid access after cancellation until the store expiry', async () => {
  m.google.mockResolvedValue({ data: googlePurchase('SUBSCRIPTION_STATE_CANCELED') });
  const verified = await verifyStorePurchase('android', { purchaseToken: 'synthetic-token' }, 'owner-a');
  expect(verified.revoked).toBe(false); expect(Date.parse(verified.expiresAt)).toBeGreaterThan(Date.now());
});
it('uses distinct renewal keys while retaining the subscription group for notifications', async () => {
  const purchase = googlePurchase(); m.google.mockResolvedValue({ data: purchase });
  const first = await verifyStorePurchase('android', { purchaseToken: 'synthetic-token' }, 'owner-a');
  purchase.lineItems[0].latestSuccessfulOrderId = 'synthetic-order-2';
  const second = await verifyStorePurchase('android', { purchaseToken: 'synthetic-token' }, 'owner-a');
  expect(second.transactionKey).not.toBe(first.transactionKey); expect(second.groupKey).toBe(first.groupKey);
});
