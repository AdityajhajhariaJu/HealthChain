import { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';

export default function Pricing() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handleCheckout = async () => {
    if (isProcessing) return;
    try {
      setIsProcessing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        setIsProcessing(false);
        return;
      }

      const res = await loadRazorpayScript();
      if (!res) {
        alert('Razorpay SDK failed to load. Please check your connection.');
        setIsProcessing(false);
        return;
      }

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Create order via Vercel Backend with server-enforced pricing
      const orderRes = await fetch('https://healthchain-backend-pi.vercel.app/api/create-razorpay-order', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ billingCycle })
      });

      if (!orderRes.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderRes.json();

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_placeholder',
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'HealthChain Pro',
        description: `Upgrade to Pro (${billingCycle})`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            // Verify payment on server
            const verifyRes = await fetch('https://healthchain-backend-pi.vercel.app/api/verify-razorpay-payment', {
              method: 'POST',
              headers: authHeaders,
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                billingCycle
              })
            });
            
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              alert('Welcome to HealthChain Pro! Your features are now unlocked.');
              window.location.href = '/app';
            } else {
              alert('Payment verification failed: ' + (verifyData.error || 'Unknown error'));
            }
          } catch (err: any) {
            alert('Payment verification encountered a network error. If you were charged, please contact support.');
          } finally {
            setIsProcessing(false);
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
            setIsProcessing(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        alert(response.error.description);
        setIsProcessing(false);
      });
      paymentObject.open();

    } catch (err) {
      console.error(err);
      alert('Checkout failed unexpectedly.');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '24px 16px' : '40px 24px', paddingBottom: '80px' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '24px' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: isMobile ? '32px' : '48px', fontWeight: 900, color: 'var(--text-main)', marginBottom: '16px', letterSpacing: '-1.5px' }}>
          Simple, transparent pricing
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Start for free, then upgrade to unlock unlimited AI specialist consultations and premium features.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Free Tier */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>Basic</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: '14px' }}>Essential tools for personal health tracking.</p>
          <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
            ₹0 <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ forever</span>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', marginBottom: '20px', padding: '12px' }}>Current Plan</button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {['Basic Medical Profile', '3 Active Cases', 'Standard Lab Report Analyzer', 'Local Data Storage'].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px' }}>
                <Check size={18} color="#10B981" /> {feature}
              </div>
            ))}
          </div>
        </div>

        {/* Pro Tier */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', border: '2px solid var(--teal)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--teal)', color: 'white', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} /> MOST POPULAR
          </div>
          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px', color: 'var(--teal)' }}>Pro</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: '14px' }}>Advanced AI synthesis for complex medical cases.</p>
          <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
            ₹499 <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ 30 Days</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={isProcessing}
            className="btn btn-primary" 
            style={{ width: '100%', marginBottom: '20px', padding: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {isProcessing ? <Loader2 size={18} className="spin" /> : null}
            {isProcessing ? 'Processing...' : 'Upgrade to Pro'}
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {['Everything in Basic', 'Deep Collaborative Specialists (Unlimited)', 'Advanced Clinical Synthesis', 'Priority Support', 'Cloud Sync & Portability'].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: feature.includes('Everything') ? 600 : 400 }}>
                <Check size={18} color="var(--teal)" /> {feature}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
