import { useState } from 'react';
import { ArrowLeft, PlusCircle, Sparkles, Zap, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const log = [
  {
    version: 'v2.1.0',
    date: 'August 15, 2026',
    changes: [
      { type: 'feature', text: 'Added MDT Consensus Hub for cross-specialty reviews' },
      { type: 'feature', text: 'New Data Portability (Export/Import JSON) in Settings' },
      { type: 'improvement', text: 'Added Skeleton Loaders across the app for better perceived performance' },
      { type: 'fix', text: 'Fixed mobile view for Medical Profile timeline' }
    ]
  },
  {
    version: 'v2.0.0',
    date: 'August 1, 2026',
    changes: [
      { type: 'feature', text: 'Launch of HealthChain 2.0 with advanced AI reasoning capabilities' },
      { type: 'feature', text: 'Ava Health Buddy voice-first consultation interface' },
      { type: 'feature', text: 'Comprehensive Dietician integration' }
    ]
  }
];

export default function Changelog() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '20px' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px', letterSpacing: '-1px' }}>
        What's New
      </h1>
      <p style={{ fontSize: '18px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        The latest updates, improvements, and fixes to HealthChain.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
        {log.map((release) => (
          <div key={release.version} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
            <div style={{ width: '120px', flexShrink: 0, textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>{release.version}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{release.date}</div>
            </div>
            
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '132px', top: '24px', bottom: '-40px', width: '2px', background: 'var(--border)' }} />
            <div style={{ position: 'absolute', left: '127px', top: '6px', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--teal)', border: '2px solid white' }} />
            
            <div style={{ flex: 1, paddingLeft: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {release.changes.map((change, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ marginTop: '2px' }}>
                      {change.type === 'feature' ? <Sparkles size={16} color="#8B5CF6" /> : 
                       change.type === 'improvement' ? <Zap size={16} color="#F59E0B" /> : 
                       <ShieldCheck size={16} color="#10B981" />}
                    </div>
                    <div style={{ fontSize: '15px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                      {change.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
