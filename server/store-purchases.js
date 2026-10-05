import { createClient } from '@supabase/supabase-js';
import { setCors } from './cors.js';
import { checkRateLimit } from './rate-limit.js';
import { STORE_PRODUCTS } from '../shared/store-products.js';
import { storeEnabled, storeAccountToken, storeTransactionKey, verifyStorePurchase,
  verifyAppleNotification, verifyGoogleNotification, acknowledgeGooglePurchase } from './store-verification.js';

export default async function handler(req, res) {
  setCors(req, res, { methods: 'GET, POST, OPTIONS' });
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkRateLimit(req, 30, 60000))) return res.status(429).json({ error: 'Please try again shortly.' });
  try {
    const db = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const platform = req.query?.platform || req.body?.platform;
    // Authenticated store notifications use the same endpoint, with store-specific proof.
    if (req.body?.signedPayload || req.body?.message?.data) {
      const ios = Boolean(req.body.signedPayload);
      const store = ios ? 'ios' : 'android';
      if (!storeEnabled(store)) return res.status(503).json({ error: 'Store not configured' });
      const transaction = ios ? await verifyAppleNotification(req.body.signedPayload) : null;
      const googleNotice = ios ? null : await verifyGoogleNotification(req);
      const googleToken = googleNotice?.purchaseToken;
      if (ios && !transaction) return res.status(200).json({ received: true });
      if (!ios && !googleToken) return res.status(200).json({ received: true });
      const key = storeTransactionKey(store, ios ? transaction.originalTransactionId : googleToken);
      const { data: entries, error } = await db.from('healthchain_store_purchases').select('user_id').eq('purchase_group_key', key).limit(1);
      const ledger = entries?.[0];
      if (error) throw error;
      // Unknown/purchase-before-fulfillment notifications are safe to replay on verification.
      if (!ledger) return res.status(200).json({ received: true });
      const verified = await verifyStorePurchase(store,
        ios ? { transactionId: transaction.transactionId } : { purchaseToken: googleToken }, ledger.user_id);
      if (!ios && googleNotice.voidedOrderId) {
        verified.revoked = true;
        verified.transactionKey = storeTransactionKey(store, googleToken + ':' + googleNotice.voidedOrderId);
      }
      const applied = await apply(db, ledger.user_id, store, verified);
      if (applied.error) throw applied.error;
      if (!ios && applied.data?.success) await acknowledgeGooglePurchase({ purchaseToken: googleToken }, verified);
      return res.status(200).json({ received: true });
    }
    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Sign in to continue.' });
    if (!storeEnabled(platform)) return res.status(503).json({ error: 'Store checkout is not available yet.' });
    if (req.method === 'GET') {
      const { data: active, error: activeError } = await db.from('healthchain_store_purchases').select('transaction_key')
        .eq('user_id', user.id).eq('granted', true).eq('revoked', false).gt('expires_at', new Date().toISOString()).limit(1);
      if (activeError) throw activeError;
      return res.status(200).json({ products: STORE_PRODUCTS, accountToken: storeAccountToken(user.id), activeSubscription: Boolean(active?.length) });
    }
    const verified = await verifyStorePurchase(platform, req.body, user.id);
    const result = await apply(db, user.id, platform, verified);
    if (result.error) throw result.error;
    if (platform === 'android' && result.data?.success) await acknowledgeGooglePurchase(req.body, verified);
    return res.status(200).json(result.data);
  } catch {
    console.error('Store verification or fulfillment unavailable.');
    return res.status(503).json({ error: 'Your purchase could not be confirmed. Use Restore purchases to retry; do not buy again.' });
  }
}
function apply(db, owner, platform, verified) {
  if (verified.pending) return db.from('healthchain_store_purchases').upsert({
    transaction_key: verified.transactionKey, purchase_group_key: verified.groupKey, user_id: owner, platform,
    product_id: verified.productId, plan_id: verified.planId,
  }, { onConflict: 'transaction_key', ignoreDuplicates: true })
    .then(result => ({ error: result.error, data: { success: false, pending: true } }));
  return db.rpc('apply_healthchain_store_purchase', { p_user_id: owner, p_platform: platform,
    p_transaction_key: verified.transactionKey, p_group_key: verified.groupKey, p_product_id: verified.productId,
    p_plan_id: verified.planId, p_purchased_at: verified.purchasedAt, p_expires_at: verified.expiresAt, p_revoked: verified.revoked });
}
