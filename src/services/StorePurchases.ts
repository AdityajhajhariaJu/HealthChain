import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { NativePurchases, PURCHASE_TYPE, type Transaction, type Product } from '@capgo/native-purchases';
import { STORE_PRODUCTS, STORE_BASE_PLANS } from '../../shared/store-products.js';
import { apiEndpoint } from './ApiEndpoint';
import { supabase } from './supabaseClient';
import { verifyProStatus } from './ProfileEngine';

export type StorePlan = keyof typeof STORE_PRODUCTS;
export const isNativeStore = () => ['ios', 'android'].includes(Capacitor.getPlatform());
type StoreConfig = { products: typeof STORE_PRODUCTS; accountToken: string; activeSubscription?: boolean };
export type StoreOutcome = { success: boolean; pending?: boolean; cancelled?: boolean; message: string };
async function session() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in to use store purchases.');
  return data.session;
}
async function config(owner?: Awaited<ReturnType<typeof session>>): Promise<StoreConfig> {
  owner ||= await session();
  const response = await fetch(apiEndpoint('/api/store-purchases') + '?platform=' + Capacitor.getPlatform(), {
    headers: { Authorization: 'Bearer ' + owner.access_token }, cache: 'no-store',
  });
  if (!response.ok) throw new Error('Store checkout is not available yet.');
  return response.json();
}
export async function loadStoreProducts(): Promise<{ products: Product[]; activeSubscription: boolean }> {
  if (!isNativeStore()) return { products: [], activeSubscription: false };
  const catalog = await config();
  const { products } = await NativePurchases.getProducts({ productIdentifiers: Object.values(catalog.products), productType: PURCHASE_TYPE.SUBS });
  return { products, activeSubscription: Boolean(catalog.activeSubscription) };
}
export function productForPlan(products: Product[], plan: StorePlan): Product | undefined {
  return products.find(product => Capacitor.getPlatform() === 'android'
    ? product.planIdentifier === STORE_PRODUCTS[plan] && product.identifier === STORE_BASE_PLANS[plan] && !product.offerId
    : product.identifier === STORE_PRODUCTS[plan]);
}
export async function manageStoreSubscription(): Promise<void> {
  await NativePurchases.manageSubscriptions();
}
const fulfilling = new Map<string, Promise<StoreOutcome>>();
function fulfill(transaction: Transaction, owner: Awaited<ReturnType<typeof session>>): Promise<StoreOutcome> {
  const key = owner.user.id + ':' + (transaction.purchaseToken || transaction.transactionId);
  const existing = fulfilling.get(key);
  if (existing) return existing;
  const task = fulfillOnce(transaction, owner).finally(() => fulfilling.delete(key));
  fulfilling.set(key, task);
  return task;
}
async function fulfillOnce(transaction: Transaction, owner: Awaited<ReturnType<typeof session>>): Promise<StoreOutcome> {
  if (!(Object.values(STORE_PRODUCTS) as string[]).includes(transaction.productIdentifier))
    return { success: false, message: 'This purchase is not a supported plan.' };
  if ((await session()).user.id !== owner.user.id) throw new Error('Sign in to the account that made this purchase, then restore.');
  const response = await fetch(apiEndpoint('/api/store-purchases'), { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + owner.access_token },
    body: JSON.stringify({ platform: Capacitor.getPlatform(), transactionId: transaction.transactionId, purchaseToken: transaction.purchaseToken }),
  });
  if (!response.ok) return { success: false, pending: true, message: 'Confirmation is pending. Restore purchases to retry; do not buy again.' };
  const result = await response.json();
  if (!result.success) return { success: false, pending: Boolean(result.pending), message: result.pending
    ? 'Payment is awaiting store confirmation. It has not unlocked access yet.'
    : result.revoked ? 'This purchase was refunded or revoked.' : 'This purchase period has ended.' };
  // Acknowledge only after durable server fulfillment. Never consume subscriptions.
  try {
    // Android is acknowledged by the server, including background RTDN grants.
    if (Capacitor.getPlatform() === 'ios')
      await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.transactionId });
  } catch {
    return { success: false, pending: true, message: 'Access was confirmed, but store completion needs a retry. Restore purchases; do not buy again.' };
  }
  if ((await session()).user.id === owner.user.id) await verifyProStatus();
  return { success: true, message: 'Your store purchase is confirmed.' };
}
export async function buyStorePlan(plan: StorePlan): Promise<StoreOutcome> {
  if (!isNativeStore()) throw new Error('Open the mobile app for store checkout.');
  const owner = await session();
  const catalog = await config(owner);
  if (!catalog.products[plan]) throw new Error('This store product is unavailable.');
  if (catalog.activeSubscription) throw new Error('You already have an active subscription. Use Manage subscription instead.');
  const { products } = await NativePurchases.getProducts({ productIdentifiers: [catalog.products[plan]], productType: PURCHASE_TYPE.SUBS });
  const selected = productForPlan(products, plan);
  if (!selected) throw new Error('This store plan is unavailable.');
  if ((await session()).user.id !== owner.user.id) throw new Error('Account changed. Open checkout from the intended account.');
  let transaction: Transaction;
  try {
    transaction = await NativePurchases.purchaseProduct({ productIdentifier: catalog.products[plan],
      productType: PURCHASE_TYPE.SUBS, appAccountToken: catalog.accountToken,
      planIdentifier: Capacitor.getPlatform() === 'android' ? selected.identifier : undefined,
      offerToken: selected.offerToken,
      quantity: 1, isConsumable: false, autoAcknowledgePurchases: false });
  } catch (error) {
    const message = String((error as { message?: string })?.message || '');
    if (/cancel/i.test(message)) return { success: false, cancelled: true, message: 'Purchase cancelled.' };
    if (/pending/i.test(message)) {
      // The Android SDK rejects a pending checkout without returning its token.
      // Query the account's pending purchases so the server can bind RTDNs to it.
      if (Capacitor.getPlatform() === 'android') {
        try {
          const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS, appAccountToken: catalog.accountToken });
          for (const purchase of purchases) await fulfill(purchase, owner);
        } catch { /* Foreground recovery/explicit restore retries an unavailable binding. */ }
      }
      return { success: false, pending: true, message: 'Payment is pending. Restore after the store confirms it.' };
    }
    throw new Error('Store checkout could not open. Please try again.');
  }
  return fulfill(transaction, owner);
}
export async function restoreStorePurchases(): Promise<StoreOutcome> {
  const owner = await session();
  const catalog = await config(owner);
  if ((await session()).user.id !== owner.user.id) throw new Error('Account changed. Restore from the purchasing account.');
  await NativePurchases.restorePurchases();
  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS,
    appAccountToken: catalog.accountToken, onlyCurrentEntitlements: true });
  let restored = 0, pending = false;
  for (const purchase of purchases) {
    const result = await fulfill(purchase, owner);
    if (result.success) restored++;
    if (result.pending) pending = true;
  }
  // Refresh account entitlements even when the store does not return an active purchase.
  if ((await session()).user.id === owner.user.id) await verifyProStatus();
  return { success: !pending, pending, message: pending ? 'Some purchases are awaiting confirmation. Try restoring again shortly.'
    : restored ? 'Purchases restored to this account.' : 'Your account access is refreshed. No additional purchases were found.' };
}

// Recover deferred/interrupted purchases without presenting the explicit restore sheet.
export function installStorePurchaseRecovery(): () => void {
  if (!isNativeStore()) return () => {};
  let disposed = false, recovering = false;
  const handles: { remove(): Promise<void> }[] = [];
  const recover = async () => {
    if (disposed || recovering) return;
    recovering = true;
    try {
      const owner = await session();
      const catalog = await config(owner);
      if (disposed) return;
      const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.SUBS,
        appAccountToken: catalog.accountToken, onlyCurrentEntitlements: true });
      for (const transaction of purchases) {
        if (disposed) break;
        await fulfill(transaction, owner);
      }
    } catch { /* Offline, signed out or store not enabled: retry on the next foreground. */ }
    finally { recovering = false; }
  };
  const registration = (promise: Promise<{ remove(): Promise<void> }>) => {
    void promise.then(handle => { if (disposed) void handle.remove(); else handles.push(handle); }).catch(() => {});
  };
  registration(NativeApp.addListener('appStateChange', ({ isActive }) => { if (isActive) void recover(); }));
  if (Capacitor.getPlatform() === 'ios') registration(NativePurchases.addListener('transactionUpdated', () => { void recover(); }));
  const { data } = supabase.auth.onAuthStateChange(event => {
    if (event === 'SIGNED_IN') setTimeout(() => { void recover(); }, 0);
  });
  void recover();
  return () => { disposed = true; data.subscription.unsubscribe(); handles.forEach(handle => { void handle.remove(); }); };
}
