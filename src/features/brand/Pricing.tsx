import { useState } from 'react';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function Pricing() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

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

        <div style={{ display: 'inline-flex', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '99px', padding: '4px', marginTop: '32px' }}>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '8px 24px',
              borderRadius: '99px',
              border: 'none',
              background: billingCycle === 'monthly' ? 'var(--teal)' : 'transparent',
              color: billingCycle === 'monthly' ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            style={{
              padding: '8px 24px',
              borderRadius: '99px',
              border: 'none',
              background: billingCycle === 'annual' ? 'var(--teal)' : 'transparent',
              color: billingCycle === 'annual' ? 'white' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Annually <span style={{ background: '#ECFDF5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>Save 20%</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '16px', maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Free Tier */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>Basic</h3>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 24px', fontSize: '14px' }}>Essential tools for personal health tracking.</p>
          <div style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '20px' }}>
            $0 <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ forever</span>
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
            ${billingCycle === 'monthly' ? '29' : '24'} <span style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ month</span>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: '20px', padding: '12px' }}>Upgrade to Pro</button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            {['Everything in Basic', 'MDT Consensus Hub (Unlimited)', 'Advanced Clinical Synthesis', 'Priority Support', 'Cloud Sync & Portability'].map(feature => (
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
