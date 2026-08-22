import { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';

export default function Pricing() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (planId: string) => {
    if (isProcessing) return;
    try {
      setIsProcessing(planId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        setIsProcessing(null);
        return;
      }

      const res = await loadRazorpayScript();
      if (!res) {
        alert('Razorpay SDK failed to load. Please check your connection.');
        setIsProcessing(null);
        return;
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ plan_id: planId })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
          throw new Error(errData.error || 'Failed to create order');
      }

      const orderData = await orderRes.json();
      
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        alert('Payment system is being configured. Please try again shortly.');
        setIsProcessing(null);
        return;
      }

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HealthChain Pro',
        description: `Upgrade to Pro (${planId === 'pro_30_days' ? '30' : '90'} Days)`,
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
                plan_id: planId
              })
            });
            
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              alert('Welcome to HealthChain Pro! Your features and quotas are now unlocked.');
              window.location.href = '/app';
            } else {
              alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
            }
          } catch (err: any) {
            alert('Payment verification encountered a network error. If you were charged, please contact support.');
          } finally {
            setIsProcessing(null);
          }
        },
        prefill: {
          email: session.user.email,
        },
        theme: {
          color: '#14b8a6'
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(null);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        alert(response.error.description);
        setIsProcessing(null);
      });
      paymentObject.open();

    } catch (err: any) {
      console.error(err);
      alert('Checkout Error: ' + err.message);
      setIsProcessing(null);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '24px 16px' : '40px 24px', paddingBottom: '80px' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: isMobile ? '32px' : '48px', fontWeight: 900, color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-1.5px' }}>
          Choose your diagnostic power
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '700px', margin: '0 auto', marginBottom: '16px' }}>
          Select a metered tier that fits your needs. Burn through your limits early? You can always buy top-ups individually later.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--surface)', borderRadius: '20px', fontSize: '14px', color: 'var(--text-muted)' }}>
          <Info size={16} /> Any purchased top-ups expire when your base subscription expires.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '20px', maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Basic Tier */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>Basic</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: '14px', minHeight: '40px' }}>Essential tools for basic health tracking.</p>
          <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
            ₹0 <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ free</span>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', marginBottom: '24px', padding: '12px' }}>Current Plan</button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {[
              { f: 'Medical Profile', v: true },
              { f: 'Quick Consult', v: false },
              { f: 'Deep Collab', v: false },
              { f: 'J.A.R.V.I.S.', v: false },
              { f: 'Ava Health Buddy (10 Replies)', v: true },
              { f: 'Case Prep & Trials', v: false },
              { f: 'Dietician', v: false },
              { f: 'Pharmacy Hub', v: true },
              { f: 'Lab Report Analyzer', v: true },
            ].map(item => (
              <div key={item.f} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', color: item.v ? 'var(--text-main)' : '#9ca3af', opacity: item.v ? 1 : 0.7 }}>
                {item.v ? <Check size={18} color="#10B981" /> : <div style={{ width: '18px' }} />} 
                <span style={{ textDecoration: item.v ? 'none' : 'line-through' }}>{item.f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pro 30-Days */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', border: '2px solid var(--teal)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--teal)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            STANDARD PRO
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', color: 'var(--teal)' }}>Pro 30-Days</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: '14px', minHeight: '40px' }}>Perfect for resolving an acute medical case.</p>
          <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
            ₹499 <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ 30 Days</span>
          </div>
          <button 
            onClick={() => handleCheckout('pro_30_days')}
            disabled={isProcessing !== null}
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '24px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {isProcessing === 'pro_30_days' ? <Loader2 size={18} className="spin" /> : null}
            {isProcessing === 'pro_30_days' ? 'Processing...' : 'Upgrade 30-Days'}
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {[
              '3 Quick Consults',
              '2 Deep Collab Sessions',
              '1 J.A.R.V.I.S. Session',
              'Ava Health Buddy (30 Replies)',
              'Case Prep & Trials (Unlimited)',
              'Dietician (Unlimited)',
              'Pharmacy Hub',
              'Lab Report Analyzer',
            ].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 500 }}>
                <Check size={18} color="var(--teal)" /> {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Pro 90-Days */}
        <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', border: '2px solid var(--teal)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--teal)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} /> BEST VALUE
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', color: 'var(--teal)' }}>Pro 90-Days</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: '14px', minHeight: '40px' }}>Comprehensive tools for chronic condition management.</p>
          <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
            ₹899 <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ 90 Days</span>
          </div>
          <button 
            onClick={() => handleCheckout('pro_90_days')}
            disabled={isProcessing !== null}
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '24px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {isProcessing === 'pro_90_days' ? <Loader2 size={18} className="spin" /> : null}
            {isProcessing === 'pro_90_days' ? 'Processing...' : 'Upgrade 90-Days'}
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {[
              '10 Quick Consults',
              '8 Deep Collab Sessions',
              '3 J.A.R.V.I.S. Sessions',
              'Ava Health Buddy (120 Replies)',
              'Case Prep & Trials (Unlimited)',
              'Dietician (Unlimited)',
              'Pharmacy Hub',
              'Lab Report Analyzer',
            ].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 500 }}>
                <Check size={18} color="var(--teal)" /> {feature}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
