import { createHash, createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AppStoreServerAPIClient, SignedDataVerifier, Environment } from '@apple/app-store-server-library';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { STORE_PRODUCTS, STORE_BASE_PLANS } from '../shared/store-products.js';

const bundle = 'com.healthchain.app';
export const storeTransactionKey = (platform, id) => `${platform}:${createHash('sha256').update(id).digest('hex')}`;
export function storeAccountToken(userId) {
  const secret = process.env.STORE_ACCOUNT_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error('Store configuration incomplete');
  const hex = createHmac('sha256', secret).update(userId).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export function storeEnabled(platform) {
  const tokenSecret = process.env.STORE_ACCOUNT_TOKEN_SECRET?.length >= 32;
  if (platform === 'ios') return Boolean(tokenSecret && process.env.APPLE_STORE_ENABLED === 'true'
    && process.env.APPLE_STORE_PRIVATE_KEY && process.env.APPLE_STORE_KEY_ID && process.env.APPLE_STORE_ISSUER_ID
    && process.env.APPLE_STORE_APP_ID && process.env.APPLE_STORE_NOTIFICATIONS_VERIFIED === 'true');
  if (platform === 'android') return Boolean(tokenSecret && process.env.GOOGLE_STORE_ENABLED === 'true'
    && process.env.GOOGLE_STORE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_STORE_PUBSUB_AUDIENCE
    && process.env.GOOGLE_STORE_PUBSUB_EMAIL && process.env.GOOGLE_STORE_NOTIFICATIONS_VERIFIED === 'true');
  return false;
}
async function appleClient() {
  const environment = process.env.APPLE_STORE_ENVIRONMENT === 'Sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
  const roots = [await readFile(new URL('./certificates/AppleRootCA-G3.cer', import.meta.url))];
  return {
    verifier: new SignedDataVerifier(roots, true, environment, bundle, Number(process.env.APPLE_STORE_APP_ID)),
    client: new AppStoreServerAPIClient(process.env.APPLE_STORE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      process.env.APPLE_STORE_KEY_ID, process.env.APPLE_STORE_ISSUER_ID, bundle, environment),
  };
}
export async function verifyAppleNotification(signedPayload) {
  const { verifier } = await appleClient();
  const notification = await verifier.verifyAndDecodeNotification(signedPayload);
  if (!notification.data?.signedTransactionInfo) return null;
  return verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo);
}
export async function verifyGoogleNotification(req) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  const ticket = await new OAuth2Client().verifyIdToken({ idToken: token,
    audience: process.env.GOOGLE_STORE_PUBSUB_AUDIENCE });
  const claims = ticket.getPayload();
  if (!claims?.email_verified || claims.email !== process.env.GOOGLE_STORE_PUBSUB_EMAIL)
    throw new Error('Unverified store notification');
  const payload = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf8'));
  if (payload.packageName !== bundle) throw new Error('Unexpected package');
  const purchaseToken = payload.subscriptionNotification?.purchaseToken || payload.voidedPurchaseNotification?.purchaseToken;
  return purchaseToken ? { purchaseToken, voidedOrderId: payload.voidedPurchaseNotification?.orderId } : null;
}
export async function verifyStorePurchase(platform, evidence, userId) {
  const accountToken = storeAccountToken(userId);
  let productId, purchasedAt, expiresAt, transactionKey, groupKey, revoked = false, pending = false, acknowledgementRequired = false;
  if (platform === 'ios') {
    if (typeof evidence.transactionId !== 'string' || !/^\d{1,40}$/.test(evidence.transactionId))
      throw new Error('Invalid transaction');
    const { verifier, client } = await appleClient();
    // Fetch current status, not an old device JWS that could predate a refund.
    const info = await client.getTransactionInfo(evidence.transactionId);
    const initial = await verifier.verifyAndDecodeTransaction(info.signedTransactionInfo);
    if (initial.appAccountToken?.toLowerCase() !== accountToken || initial.transactionId !== evidence.transactionId)
      throw new Error('Purchase ownership mismatch');
    const statuses = await client.getAllSubscriptionStatuses(evidence.transactionId);
    const latest = statuses.data?.flatMap(group => group.lastTransactions || [])
      .find(item => item.originalTransactionId === initial.originalTransactionId);
    if (!latest?.signedTransactionInfo) throw new Error('Subscription status unavailable');
    const transaction = initial.revocationDate ? initial : await verifier.verifyAndDecodeTransaction(latest.signedTransactionInfo);
    if (transaction.appAccountToken?.toLowerCase() !== accountToken || transaction.type !== 'Auto-Renewable Subscription'
      || transaction.originalTransactionId !== initial.originalTransactionId || transaction.inAppOwnershipType !== 'PURCHASED'
      || transaction.quantity !== 1) throw new Error('Purchase ownership mismatch');
    productId = transaction.productId; purchasedAt = transaction.purchaseDate;
    expiresAt = transaction.expiresDate;
    if (latest.status === 4 && latest.signedRenewalInfo) {
      const renewal = await verifier.verifyAndDecodeRenewalInfo(latest.signedRenewalInfo);
      if (renewal.originalTransactionId !== transaction.originalTransactionId) throw new Error('Renewal mismatch');
      expiresAt = renewal.gracePeriodExpiresDate || expiresAt;
    }
    revoked = Boolean(transaction.revocationDate) || latest.status === 5;
    if ([2,3].includes(latest.status)) expiresAt = Math.min(expiresAt, Date.now());
    transactionKey = storeTransactionKey(platform, transaction.transactionId);
    groupKey = storeTransactionKey(platform, transaction.originalTransactionId);
  } else if (platform === 'android') {
    if (typeof evidence.purchaseToken !== 'string' || evidence.purchaseToken.length < 10 || evidence.purchaseToken.length > 4096)
      throw new Error('Invalid purchase token');
    const client = await new GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_STORE_SERVICE_ACCOUNT_JSON),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'] }).getClient();
    const response = await client.request({ url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${bundle}/purchases/subscriptionsv2/tokens/${encodeURIComponent(evidence.purchaseToken)}`, timeout: 15000 });
    const purchase = response.data;
    if (purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId !== accountToken || purchase.lineItems?.length !== 1
      || (purchase.testPurchase && process.env.GOOGLE_STORE_ALLOW_TEST !== 'true')) throw new Error('Purchase ownership mismatch');
    const state = purchase.subscriptionState;
    if (!['SUBSCRIPTION_STATE_PENDING','SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
      'SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_EXPIRED','SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED'].includes(state))
      throw new Error('Subscription status unavailable');
    const item = purchase.lineItems[0];
    const selectedPlan = Object.keys(STORE_PRODUCTS).find(plan => STORE_PRODUCTS[plan] === item.productId);
    if (!item.autoRenewingPlan || !selectedPlan || item.offerDetails?.basePlanId !== STORE_BASE_PLANS[selectedPlan])
      throw new Error('Unsupported subscription plan');
    productId = item.productId; purchasedAt = Date.parse(purchase.startTime); expiresAt = Date.parse(item.expiryTime);
    pending = state === 'SUBSCRIPTION_STATE_PENDING';
    acknowledgementRequired = purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING';
    if (!pending && !['ACKNOWLEDGEMENT_STATE_PENDING','ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'].includes(purchase.acknowledgementState))
      throw new Error('Acknowledgement status unavailable');
    revoked = state === 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED';
    if (['SUBSCRIPTION_STATE_ON_HOLD','SUBSCRIPTION_STATE_PAUSED','SUBSCRIPTION_STATE_EXPIRED'].includes(state))
      expiresAt = Math.min(expiresAt, Date.now());
    if (!pending && !revoked && !item.latestSuccessfulOrderId) throw new Error('Missing renewal order');
    transactionKey = storeTransactionKey(platform, evidence.purchaseToken + ':' + (item.latestSuccessfulOrderId || 'pending'));
    groupKey = storeTransactionKey(platform, evidence.purchaseToken);
  } else throw new Error('Unsupported store');
  const planId = Object.keys(STORE_PRODUCTS).find(plan => STORE_PRODUCTS[plan] === productId);
  if (!planId || (!pending && !revoked && (!Number.isFinite(purchasedAt) || !Number.isFinite(expiresAt))) || purchasedAt > Date.now() + 300000)
    throw new Error('Unsupported store purchase');
  return { transactionKey, groupKey, productId, planId,
    purchasedAt: Number.isFinite(purchasedAt) ? new Date(purchasedAt).toISOString() : null,
    expiresAt: Number.isFinite(expiresAt) ? new Date(expiresAt).toISOString() : null, revoked, pending, acknowledgementRequired };
}

export async function acknowledgeGooglePurchase(evidence, verified) {
  if (!verified.acknowledgementRequired || verified.pending || verified.revoked) return;
  const client = await new GoogleAuth({ credentials: JSON.parse(process.env.GOOGLE_STORE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'] }).getClient();
  await client.request({ method: 'POST',
    url: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${bundle}/purchases/subscriptions/${encodeURIComponent(verified.productId)}/tokens/${encodeURIComponent(evidence.purchaseToken)}:acknowledge`,
    data: {}, timeout: 15000 });
}
