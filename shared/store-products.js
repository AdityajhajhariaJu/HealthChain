// Register these exact identifiers in both stores; prices come from the store.
export const STORE_PRODUCTS = Object.freeze({
  pro_30_days: 'com.healthchain.app.pro30',
  pro_90_days: 'com.healthchain.app.pro90',
});
export const STORE_BASE_PLANS = Object.freeze({ pro_30_days: 'monthly', pro_90_days: 'quarterly' });
// Offer only monthly subscriptions at launch. Keep legacy identifiers for restore/verification.
export const STORE_LAUNCH_PLANS = Object.freeze(['pro_30_days']);
export const STORE_LAUNCH_PRODUCTS = Object.freeze({ pro_30_days: STORE_PRODUCTS.pro_30_days });
