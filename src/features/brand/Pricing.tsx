import { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Sparkles,
  Loader2,
  Info,
  Stethoscope,
  Brain,
  Network,
  Heart,
  FolderHeart,
  Pill,
  FileText,
  Apple,
  FlaskConical,
  ShieldCheck,
  Zap,
  Star,
  Lock,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';
import { supabase } from '../../services/supabaseClient';

interface FeatureItem {
  name: string;
  desc?: string;
  icon: any;
  color: string;
  bg: string;
  highlight?: boolean;
}

const BASIC_FEATURES: FeatureItem[] = [
  { name: 'Medical Profile & Vault', desc: 'Encrypted personal history', icon: FolderHeart, color: '#0D9488', bg: '#F0FDFA' },
  { name: 'Ava Health Buddy (10 Replies)', desc: 'Concierge medical Q&A', icon: Heart, color: '#E11D48', bg: '#FFF1F2' },
  { name: 'Pharmacy Hub (Unlimited)', desc: 'Interactions & safe dosage', icon: Pill, color: '#EA580C', bg: '#FFF7ED' },
  { name: 'Lab Report PDF Analyzer', desc: 'Basic vital extraction', icon: FileText, color: '#6366F1', bg: '#EEF2FF' },
];

const PRO_30_FEATURES: FeatureItem[] = [
  { name: '3 Quick Consult Sessions', desc: 'Instant single-specialist reviews', icon: Stethoscope, color: '#059669', bg: '#ECFDF5', highlight: true },
  { name: '2 Deep Collab Specialist Boards', desc: 'Multi-specialist clinical consensus', icon: Brain, color: '#2563EB', bg: '#EFF6FF', highlight: true },
  { name: '1 J.A.R.V.I.S. Investigation', desc: 'Full-body autonomous biomarker correlation', icon: Sparkles, color: '#7C3AED', bg: '#F5F3FF', highlight: true },
  { name: 'Ava Health Buddy (30 Replies)', desc: 'AI Chief of Staff assistance', icon: Heart, color: '#E11D48', bg: '#FFF1F2' },
  { name: 'Case Prep & Clinical Trials (Unlimited)', desc: 'Doctor dossiers & trial matches', icon: FlaskConical, color: '#0284C7', bg: '#F0F9FF' },
  { name: 'Clinical Dietician (Unlimited)', desc: 'Precision metabolic meal plans', icon: Apple, color: '#16A34A', bg: '#F0FDF4' },
  { name: 'Pharmacy Hub & Drug Interactions', desc: 'Full profile contraindication screening', icon: Pill, color: '#EA580C', bg: '#FFF7ED' },
  { name: 'Lab Report PDF Analyzer (Full)', desc: 'Sub-clinical biomarkers & graph trends', icon: FileText, color: '#6366F1', bg: '#EEF2FF' },
];

const PRO_90_FEATURES: FeatureItem[] = [
  { name: '10 Quick Consult Sessions', desc: 'Continuous specialist evaluation', icon: Stethoscope, color: '#059669', bg: '#ECFDF5', highlight: true },
  { name: '8 Deep Collab Specialist Boards', desc: 'Complex multi-system case reviews', icon: Brain, color: '#2563EB', bg: '#EFF6FF', highlight: true },
  { name: '3 J.A.R.V.I.S. Investigations', desc: 'Deep systemic pattern discovery', icon: Sparkles, color: '#7C3AED', bg: '#F5F3FF', highlight: true },
  { name: 'Ava Health Buddy (120 Replies)', desc: 'Extended longitudinal health guidance', icon: Heart, color: '#E11D48', bg: '#FFF1F2' },
  { name: 'Case Prep & Clinical Trials (Unlimited)', desc: 'Printable dossiers & active study matches', icon: FlaskConical, color: '#0284C7', bg: '#F0F9FF' },
  { name: 'Clinical Dietician (Unlimited)', desc: 'Condition-specific Indian nutritional plans', icon: Apple, color: '#16A34A', bg: '#F0FDF4' },
  { name: 'Pharmacy Hub & Interactions', desc: 'Real-time multi-drug safety monitoring', icon: Pill, color: '#EA580C', bg: '#FFF7ED' },
  { name: 'Lab Report PDF Analyzer (Full)', desc: 'Multi-report historical comparison', icon: FileText, color: '#6366F1', bg: '#EEF2FF' },
];

const FAQS = [
  {
    q: 'How do J.A.R.V.I.S. Investigations and Deep Collab Boards work?',
    a: 'Deep Collab convenes up to 4 AI specialists simultaneously to debate symptoms, lab markers, and differential diagnoses. J.A.R.V.I.S. acts as our autonomous investigator, uncovering non-obvious sub-clinical patterns across multiple body systems.',
  },
  {
    q: 'What happens if I finish my consult quotas early?',
    a: 'You retain full access to all your historical reports, dossiers, and profiles. You can continue using unlimited tools (Dietician, Pharmacy, Case Prep) or purchase flexible single top-ups whenever needed.',
  },
  {
    q: 'Is my personal health data encrypted and private?',
    a: 'Yes. HealthChain is built with zero-knowledge AES-256 architecture. Your medical history, PDFs, and consultations are 100% private, never sold to insurers or third-party advertisers.',
  },
  {
    q: 'Can I renew or switch between 30-Day and 90-Day plans?',
    a: 'Absolutely. When your plan expires, you can renew seamlessly. All your cases, timeline events, and notes are preserved permanently in your encrypted HealthChain Vault.',
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
          color: '#059669'
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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '20px 16px' : '40px 24px', paddingBottom: '80px' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', marginBottom: '24px', fontWeight: 600, fontSize: '14px' }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: isMobile ? '32px' : '48px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', color: '#059669', padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '14px', border: '1px solid #A7F3D0' }}>
          <Sparkles size={14} /> Clinical AI Diagnostic Power
        </div>
        <h1 style={{ fontSize: isMobile ? '30px' : '46px', fontWeight: 900, color: '#0F172A', marginBottom: '14px', letterSpacing: '-1.5px', lineHeight: 1.15 }}>
          Invest in Clarity. Resolve Medical Ambiguity.
        </h1>
        <p style={{ fontSize: isMobile ? '15px' : '17px', color: '#64748B', maxWidth: '720px', margin: '0 auto 16px', lineHeight: 1.5 }}>
          Equip yourself with parallel AI specialist evaluations, autonomous J.A.R.V.I.S. biomarker cross-correlation, and structured clinical dossiers before your next doctor appointment.
        </p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#F8FAFC', borderRadius: '20px', fontSize: '13px', color: '#475569', border: '1px solid #E2E8F0' }}>
          <Info size={15} color="#059669" /> All plans include full profile persistence & bank-grade AES-256 data privacy.
        </div>
      </div>

      {/* 3 Pricing Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '24px', maxWidth: '1120px', margin: '0 auto 50px', alignItems: 'stretch' }}>

        {/* BASIC PLAN */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '1px solid #E2E8F0',
            padding: isMobile ? '24px 20px' : '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
            position: 'relative',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Free Starter
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>Basic</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, minHeight: '36px', lineHeight: 1.4 }}>
              Essential baseline health tracking and preliminary AI assistance.
            </p>
          </div>

          <div style={{ margin: '14px 0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '42px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px' }}>₹0</span>
              <span style={{ fontSize: '15px', color: '#64748B', fontWeight: 600 }}>/ Free Forever</span>
            </div>
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700, marginTop: '4px' }}>
              ✓ No credit card required
            </div>
          </div>

          <button
            className="btn btn-outline"
            style={{ width: '100%', marginBottom: '24px', padding: '12px', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}
            disabled
          >
            Current Active Plan
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Included Features:
            </div>
            {BASIC_FEATURES.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', lineHeight: 1.3 }}>{item.name}</div>
                  {item.desc && <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.2 }}>{item.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PRO 30-DAYS */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            border: '2px solid #38BDF8',
            padding: isMobile ? '24px 20px' : '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 30px rgba(56, 189, 248, 0.12)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-13px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#0284C7',
              color: '#FFFFFF',
              padding: '4px 14px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 800,
              letterSpacing: '0.6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
            }}
          >
            <Star size={13} fill="#FFFFFF" /> ACUTE CASE RESOLUTION
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Standard Pro
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>Pro 30-Days</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, minHeight: '36px', lineHeight: 1.4 }}>
              Ideal for thoroughly investigating and preparing a single acute medical condition.
            </p>
          </div>

          <div style={{ margin: '14px 0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '42px', fontWeight: 900, color: '#0F172A', letterSpacing: '-1px' }}>₹499</span>
              <span style={{ fontSize: '15px', color: '#64748B', fontWeight: 600 }}>/ 30 Days</span>
            </div>
            <div style={{ fontSize: '12.5px', color: '#0284C7', fontWeight: 700, marginTop: '4px' }}>
              Just ₹16.6 / day · Complete acute coverage
            </div>
          </div>

          <button
            onClick={() => handleCheckout('pro_30_days')}
            disabled={isProcessing !== null}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginBottom: '24px',
              padding: '13px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '14.5px',
              background: '#0284C7',
              borderColor: '#0284C7',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.25)',
            }}
          >
            {isProcessing === 'pro_30_days' ? <Loader2 size={18} className="spin" /> : null}
            {isProcessing === 'pro_30_days' ? 'Opening Payment...' : 'Unlock Pro 30-Days'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Everything in Basic, plus:
            </div>
            {PRO_30_FEATURES.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: item.highlight ? 800 : 700, color: item.highlight ? '#0F172A' : '#334155', lineHeight: 1.3 }}>{item.name}</div>
                  {item.desc && <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.2 }}>{item.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PRO 90-DAYS (CHRONIC & BEST VALUE) */}
        <div
          style={{
            background: 'linear-gradient(180deg, #FFFFFF 0%, #F0FDF4 100%)',
            borderRadius: '24px',
            border: '2.5px solid #059669',
            padding: isMobile ? '24px 20px' : '30px 24px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 16px 45px -8px rgba(5, 150, 105, 0.22)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-14px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#FFFFFF',
              padding: '5px 16px',
              borderRadius: '999px',
              fontSize: '11.5px',
              fontWeight: 900,
              letterSpacing: '0.8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 4px 15px rgba(5, 150, 105, 0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            <Sparkles size={13} fill="#FFFFFF" /> 👑 BEST VALUE · SAVE 40%
          </div>

          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Comprehensive Pro
            </span>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '4px 0' }}>Pro 90-Days</h3>
            <p style={{ color: '#64748B', fontSize: '13px', margin: 0, minHeight: '36px', lineHeight: 1.4 }}>
              Complete ongoing multi-specialist care for chronic, systemic, or undifferentiated conditions.
            </p>
          </div>

          <div style={{ margin: '14px 0 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '42px', fontWeight: 900, color: '#065F46', letterSpacing: '-1px' }}>₹899</span>
              <span style={{ fontSize: '15px', color: '#64748B', fontWeight: 600 }}>/ 90 Days</span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 800, marginTop: '6px' }}>
              🔥 Just ₹9.9 / day · 40% Monthly Savings
            </div>
          </div>

          <button
            onClick={() => handleCheckout('pro_90_days')}
            disabled={isProcessing !== null}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginBottom: '24px',
              padding: '13px',
              borderRadius: '12px',
              fontWeight: 800,
              fontSize: '14.5px',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              borderColor: '#059669',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 6px 18px rgba(5, 150, 105, 0.35)',
            }}
          >
            {isProcessing === 'pro_90_days' ? <Loader2 size={18} className="spin" /> : null}
            {isProcessing === 'pro_90_days' ? 'Opening Payment...' : 'Unlock Pro 90-Days (Best Value)'}
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, borderTop: '1px solid #BBF7D0', paddingTop: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Maximum Power & Quota:
            </div>
            {PRO_90_FEATURES.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <item.icon size={15} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: item.highlight ? 800 : 700, color: item.highlight ? '#065F46' : '#334155', lineHeight: 1.3 }}>{item.name}</div>
                  {item.desc && <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.2 }}>{item.desc}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Trust & Guarantee Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '16px',
          maxWidth: '1100px',
          margin: '0 auto 60px',
        }}
      >
        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>AES-256 Vault Encryption</h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
              Your private health data is strictly segregated and never shared or sold to third parties.
            </p>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={22} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Instant Activation</h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
              Quotas unlock immediately with seamless UPI, Netbanking, Credit/Debit cards via Razorpay.
            </p>
          </div>
        </div>

        <div style={{ background: '#FFFFFF', padding: '20px', borderRadius: '18px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#FAF5FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={22} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Permanent Health Memory</h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#64748B', lineHeight: 1.4 }}>
              All cases, clinical timelines, and PDF dossiers remain accessible even after plan expiration.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h3 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: '24px' }}>
          Frequently Asked Questions
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQS.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#0F172A' }}>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="#64748B" /> : <ChevronDown size={18} color="#64748B" />}
                </button>
                {isOpen && (
                  <div style={{ padding: '0 20px 18px', fontSize: '13.5px', color: '#475569', lineHeight: 1.5, borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
