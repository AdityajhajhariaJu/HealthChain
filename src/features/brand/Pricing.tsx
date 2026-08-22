import { useState } from 'react';
import { ArrowLeft, Check, Sparkles, Loader2, Info, Stethoscope, Users, Zap, ShieldCheck, Pill, FileText } from 'lucide-react';
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

      const isTopup = planId.startsWith('topup_');

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: isTopup ? 'HealthChain Top-Up' : 'HealthChain Pro',
        description: orderData.description || (isTopup ? 'Feature Add-On' : `Upgrade to Pro (${planId === 'pro_30_days' ? '30' : '90'} Days)`),
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
              alert(isTopup ? 'Top-up successful! Your feature add-on is now ready to use.' : 'Welcome to HealthChain Pro! Your features and quotas are now unlocked.');
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
              'Medical Profile',
              'Ava Health Buddy (10 Replies)',
              'Pharmacy Hub',
              'Lab Report Analyzer',
            ].map(feature => (
              <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 500, color: 'var(--text-main)' }}>
                <Check size={18} color="var(--teal)" /> {feature}
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

      {/* Standalone Flexible Add-Ons */}
      <div style={{ maxWidth: '1100px', margin: '56px auto 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: '999px', color: 'var(--teal)', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
            <Zap size={14} /> NO SUBSCRIPTION LOCK-IN
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main)' }}>
            Need Just a Single Session?
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
            Grab instant 1-time add-ons whenever you need them without committing to a larger plan.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            {
              id: 'topup_quick_consult',
              name: 'Quick Consult Add-On',
              qty: '1 Full Session',
              price: 129,
              desc: 'Targeted single-specialist clinical evaluation & triaging.',
              icon: Stethoscope,
              color: '#0284C7',
              bg: '#F0F9FF',
            },
            {
              id: 'topup_deep_collab',
              name: 'Deep Collab (MDT) Add-On',
              qty: '1 Complete Board Review',
              price: 149,
              desc: 'Multi-specialist consensus, debates & hospital-grade dossier.',
              icon: Users,
              color: 'var(--teal)',
              bg: '#F0FDFA',
            },
            {
              id: 'topup_jarvis',
              name: 'J.A.R.V.I.S. Deep Link Add-On',
              qty: '1 Investigation',
              price: 169,
              desc: 'Atypical root-cause discovery & missing clinical link scan.',
              icon: Sparkles,
              color: '#EA580C',
              bg: '#FFF7ED',
            },
            {
              id: 'topup_ava',
              name: 'Ava Health Buddy',
              qty: '10 Replies',
              price: 99,
              desc: 'Chief of Staff conversational memory & clinical guidance.',
              icon: Zap,
              color: '#8B5CF6',
              bg: '#F5F3FF',
            },
            {
              id: 'topup_pharmacy_hub',
              name: 'Pharmacy Hub',
              qty: '30 Drug Lookups',
              price: 99,
              desc: 'Interaction cross-referencing & medication warnings.',
              icon: Pill,
              color: '#059669',
              bg: '#ECFDF5',
            },
            {
              id: 'topup_lab_report',
              name: 'Lab Report Analyzer',
              qty: '2 Full Reports',
              price: 99,
              desc: 'Biomarker OCR extraction & abnormality flags.',
              icon: FileText,
              color: '#4F46E5',
              bg: '#EEF2FF',
            },
          ].map((topup) => {
            const Icon = topup.icon;
            return (
              <div
                key={topup.id}
                className="card"
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  border: '1px solid #E2E8F0',
                  background: '#FFFFFF',
                  boxShadow: '0 2px 10px rgba(15,23,42,0.02)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: topup.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: topup.color }}>
                      <Icon size={18} />
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>
                      ₹{topup.price}
                    </div>
                  </div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {topup.name}
                  </h4>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: topup.color, marginBottom: '6px' }}>
                    {topup.qty}
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {topup.desc}
                  </p>
                </div>

                <button
                  onClick={() => handleCheckout(topup.id)}
                  disabled={isProcessing !== null}
                  className="btn btn-outline"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderColor: 'var(--teal)',
                    color: 'var(--teal)',
                  }}
                >
                  {isProcessing === topup.id ? <Loader2 size={14} className="spin" /> : null}
                  {isProcessing === topup.id ? 'Processing...' : 'Instant Top-Up'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
