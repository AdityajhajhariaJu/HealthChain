import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

interface TopUpModalProps {
  feature: 'ava_replies' | 'quick_consult' | 'deep_collab' | 'jarvis' | 'pharmacy_hub' | 'lab_report';
  onClose: () => void;
  onSuccess: () => void;
}

const TOPUPS = {
  ava_replies: { id: 'topup_ava', name: 'Ava Health Buddy', price: 99, qty: '10 Replies' },
  quick_consult: { id: 'topup_quick_consult', name: 'Quick Consult', price: 129, qty: '1 Use' },
  deep_collab: { id: 'topup_deep_collab', name: 'Deep Collab', price: 149, qty: '1 Session' },
  jarvis: { id: 'topup_jarvis', name: 'J.A.R.V.I.S.', price: 169, qty: '1 Use' },
  pharmacy_hub: { id: 'topup_pharmacy_hub', name: 'Pharmacy Hub', price: 99, qty: '30 Uses' },
  lab_report: { id: 'topup_lab_report', name: 'Lab Report Analyzer', price: 99, qty: '2 Uses' },
};

export default function TopUpModal({ feature, onClose, onSuccess }: TopUpModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const plan = TOPUPS[feature];

  const handleCheckout = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ plan_id: plan.id })
      });

      if (!orderRes.ok) throw new Error('Failed to create order');
      const orderData = await orderRes.json();
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HealthChain Top-Up',
        description: `${plan.name} (${plan.qty})`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: plan.id
              })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              onSuccess();
            } else {
              alert('Verification failed: ' + verifyData.error);
            }
          } catch (err) {
            alert('Verification encountered an error.');
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
      alert('Checkout Error: ' + err.message);
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
