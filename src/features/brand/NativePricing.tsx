import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Product } from '@capgo/native-purchases';
import { STORE_LAUNCH_PLANS } from '../../../shared/store-products.js';
import { PRODUCT_CATALOG } from '../../../shared/productCatalog.js';
import { buyStorePlan, loadStoreProducts, restoreStorePurchases, manageStoreSubscription, productForPlan, type StorePlan } from '../../services/StorePurchases';
import { useToast } from '../../components/ui/ToastProvider';

export default function NativePricing() {
  const navigate = useNavigate();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState('Loading store prices…');
  const [activeSubscription, setActiveSubscription] = useState(false);
  useEffect(() => {
    let current = true;
    loadStoreProducts().then(({ products: items, activeSubscription: active }) => {
      if (current) { setProducts(items); setActiveSubscription(active); setStatus(active
        ? 'Your subscription is active. Use Manage subscription to change or cancel it.'
        : items.length ? '' : 'Store checkout is not available yet.'); }
    }).catch(() => { if (current) setStatus('Store checkout is not available yet. Sign in and try again.'); });
    return () => { current = false; };
  }, []);
  const checkout = async (plan: StorePlan | 'restore') => {
    if (busy) return;
    setBusy(plan);
    try {
      const result = plan === 'restore' ? await restoreStorePurchases() : await buyStorePlan(plan);
      if (result.success) {
        toast.success(plan === 'restore' ? 'Purchases restored' : 'Purchase confirmed', result.message);
        if (plan !== 'restore') {
          setActiveSubscription(true);
          setStatus('Your subscription is active. Use Manage subscription to change or cancel it.');
        }
        try {
          const catalog = await loadStoreProducts();
          setProducts(catalog.products); setActiveSubscription(catalog.activeSubscription);
          setStatus(catalog.activeSubscription ? 'Your subscription is active. Use Manage subscription to change or cancel it.' : '');
        } catch { /* Confirmed fulfillment remains valid if refreshing the catalog is offline. */ }
      }
      else if (!result.cancelled) toast.info('Store purchase', result.message);
    } catch { toast.error('Store purchase', 'Sign in to the purchasing account and use Restore purchases.'); }
    finally { setBusy(null); }
  };
  return <main style={{ maxWidth: 720, margin: 'auto', padding: '24px 16px 96px' }}>
    <button className="btn btn-outline" onClick={() => navigate('/app')}>Back to your workspace</button>
    <h1 style={{ fontSize: 32, marginBottom: 8 }}>Choose your Pro plan</h1>
    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>Pay through your device’s app store.
      Subscriptions renew automatically until you cancel through the store. Your store shows
      the recurring price and confirms your purchase. Cancel before renewal to stop the next charge.</p>
    {status && <p role="status">{status}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, margin: '24px 0' }}>
      {STORE_LAUNCH_PLANS.map((plan: StorePlan) => {
        const product = productForPlan(products, plan);
        const details = PRODUCT_CATALOG[plan];
        return <section key={plan} style={{ padding: 24, border: '1px solid var(--border)', borderRadius: 20, background: 'var(--surface)' }}>
          <h2 style={{ marginTop: 0 }}>Pro · {plan === 'pro_30_days' ? 'Monthly' : 'Every three months'}</h2>
          <p style={{ fontSize: 30, fontWeight: 800 }}>{product?.priceString || 'Unavailable'}
            <span style={{ fontSize: 14 }}> / {plan === 'pro_30_days' ? 'month' : 'three months'}</span></p>
          <p>{details.quotas.quick_consult} quick perspectives · {details.quotas.deep_collab} detailed perspectives</p>
          <p>{details.quotas.jarvis} case reviews · {details.quotas.ava_replies} Ava replies</p>
          <p>{details.quotas.pharmacy_hub} medicine references · {details.quotas.lab_report} lab summaries</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>For organizing information and preparing clinician questions. AI does not provide medical care.</p>
          <button className="btn btn-primary" style={{ width: '100%', minHeight: 48 }}
            disabled={Boolean(busy) || !product || activeSubscription} onClick={() => checkout(plan)}>
            {busy === plan ? 'Confirming…' : `Subscribe${product ? ' · ' + product.priceString : ''}`}
          </button>
        </section>;
      })}
    </div>
    <button className="btn btn-outline" disabled={Boolean(busy)} onClick={() => checkout('restore')}>
      {busy === 'restore' ? 'Restoring…' : 'Restore purchases'}
    </button>
    <button className="btn btn-outline" style={{ marginLeft: 12 }} onClick={() => {
      void manageStoreSubscription().catch(() => toast.error('Subscription management', 'Open subscriptions in your App Store or Play Store account.'));
    }}>Manage subscription</button>
    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Restore to the HealthChain account used for the purchase.
      Separate top-ups are not offered in the mobile app yet. The store handles refund requests.</p>
    <p><Link to="/terms">Terms of Service</Link> · <Link to="/privacy">Privacy Policy</Link></p>
  </main>;
}
