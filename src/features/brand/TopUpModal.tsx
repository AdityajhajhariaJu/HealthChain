import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { useToast } from '../../components/ui/ToastProvider';
import { trackPurchase } from '../../services/analytics';
import { loadRazorpaySDK } from '../../services/razorpay';

interface TopUpModalProps {
  feature: 'ava_replies' | 'quick_consult' | 'deep_collab' | 'jarvis' | 'pharmacy_hub' | 'lab_report';
  onClose: () => void;
  onSuccess: () => void;
}

const TOPUPS = {
  ava_replies: { id: 'topup_ava', name: 'Ava Health Buddy', price: 99, qty: '10 Replies' },
  quick_consult: { id: 'topup_quick_consult', name: 'Quick Consult', price: 129, qty: '1 Session' },
  deep_collab: { id: 'topup_deep_collab', name: 'Deep Collab', price: 149, qty: '1 Session' },
  jarvis: { id: 'topup_jarvis', name: 'J.A.R.V.I.S.', price: 169, qty: '1 Session' },
  pharmacy_hub: { id: 'topup_pharmacy_hub', name: 'Pharmacy Hub', price: 99, qty: '30 Sessions' },
  lab_report: { id: 'topup_lab_report', name: 'Lab Report Analyzer', price: 99, qty: '2 Sessions' },
};

export default function TopUpModal({ feature, onClose, onSuccess }: TopUpModalProps) {
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const plan = TOPUPS[feature];

  const handleCheckout = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded) {
        toast.error('Payment Error', 'Razorpay SDK failed to load. Please check your internet connection.');
        setIsProcessing(false);
        return;
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const orderController = new AbortController();
      const orderTimeout = setTimeout(() => orderController.abort(), 20000);

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ plan_id: plan.id }),
        signal: orderController.signal
      }).finally(() => clearTimeout(orderTimeout));

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({ error: `Failed to create top-up order (${orderRes.status})` }));
        throw new Error(errData.error || 'Failed to create top-up order');
      }

      const orderData = await orderRes.json();
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      
      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HealthChain Top-Up',
        description: `${plan.name} (${plan.qty})`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyController = new AbortController();
            const verifyTimeout = setTimeout(() => verifyController.abort(), 25000);

            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: plan.id
              }),
              signal: verifyController.signal
            }).finally(() => clearTimeout(verifyTimeout));
            const verifyData = await verifyRes.json().catch(() => ({ success: false, error: `Verification failed (${verifyRes.status})` }));
            if (verifyData.success) {
              trackPurchase(orderData.amount / 100, plan.id);
              toast.success('Top-Up Activated!', `${plan.name} credit added successfully.`);
              onSuccess();
            } else {
              toast.error('Verification Failed', verifyData.error || 'Unable to verify payment.');
            }
          } catch (err) {
            toast.error('Network Issue', 'Payment verification encountered a network error.');
          } finally {
            setIsProcessing(false);
            onClose();
          }
        },
        prefill: { email: session.user.email },
        theme: { color: '#14b8a6' },
        modal: { ondismiss: () => setIsProcessing(false) }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      toast.error('Checkout Error', err.message || 'Unable to start checkout.');
      setIsProcessing(false);
    }
  };

  if (!plan) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24, margin: 16, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={20} />
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ background: 'var(--teal)', color: 'white', padding: 12, borderRadius: '50%' }}>
            <Sparkles size={24} />
          </div>
        </div>

        <h3 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
          Unlock {plan.name}
        </h3>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
          You've reached your limit. Buy a top-up now to get <strong>{plan.qty}</strong> instantly. Expires with your active subscription.
        </p>

        <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{plan.qty}</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--teal)' }}>₹{plan.price}</span>
        </div>

        <button 
          onClick={handleCheckout}
          disabled={isProcessing}
          className="btn btn-primary"
          style={{ width: '100%', padding: 12, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
        >
          {isProcessing ? <Loader2 size={18} className="spin" /> : null}
          {isProcessing ? 'Processing...' : 'Buy Now'}
        </button>
      </div>
    </div>
  );
}
