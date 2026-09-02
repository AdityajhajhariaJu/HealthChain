import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface UpgradeToProCardProps {
  isPro?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function UpgradeToProCard({ isPro = false, compact = false, onNavigate, className = '', style = {} }: UpgradeToProCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    try { triggerHapticLight(); } catch {}
    if (onNavigate) onNavigate();
    navigate('/app/pricing');
  };

  if (isPro) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          padding: compact ? '10px 14px' : '14px 18px',
          borderRadius: compact ? '14px' : '20px',
          background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)',
          border: '1px solid rgba(5, 150, 105, 0.25)',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: compact ? '8px' : '12px',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '8px' : '12px', minWidth: 0 }}>
          <div
            style={{
              width: compact ? '28px' : '36px',
              height: compact ? '28px' : '36px',
              borderRadius: compact ? '8px' : '10px',
              background: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Sparkles size={compact ? 14 : 18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: compact ? '12px' : '14px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>HealthChain Pro Active</span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '1px 5px',
                  borderRadius: '999px',
                  background: '#059669',
                  color: '#FFFFFF',
                }}
              >
                Active
              </span>
            </div>
            {!compact && (
              <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                All clinical tools, multi-specialist consensus & priority quota unlocked
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handleClick}
          style={{
            border: 'none',
            background: '#047857',
            color: '#FFFFFF',
            fontSize: compact ? '11px' : '12px',
            fontWeight: 700,
            borderRadius: compact ? '8px' : '10px',
            padding: compact ? '6px 10px' : '8px 14px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(4, 120, 87, 0.2)',
            transition: 'opacity 0.2s',
          }}
        >
          Manage
        </button>
      </div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={handleClick}
      className={className}
      style={{
        width: '100%',
        padding: compact ? '10px 14px' : '16px 20px',
        borderRadius: compact ? '14px' : '22px',
        background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #0F172A 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        boxShadow: compact ? '0 6px 18px -3px rgba(4, 120, 87, 0.28)' : '0 12px 30px -5px rgba(4, 120, 87, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        color: '#FFFFFF',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Background glow decoration */}
      <div
        style={{
          position: 'absolute',
          top: '-25px',
          right: '-25px',
          width: compact ? '80px' : '120px',
          height: compact ? '80px' : '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%)',
          filter: 'blur(12px)', transform: 'translateZ(0)', willChange: 'transform',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '10px' : '14px', zIndex: 1, minWidth: 0 }}>
        <div
          style={{
            width: compact ? '32px' : '44px',
            height: compact ? '32px' : '44px',
            borderRadius: compact ? '10px' : '14px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.45)',
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <Sparkles size={compact ? 16 : 22} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: compact ? '1px' : '3px' }}>
            <span style={{ fontWeight: 800, fontSize: compact ? '13px' : '15px', letterSpacing: '-0.2px' }}>
              {compact ? 'Upgrade to Pro' : 'Upgrade to HealthChain Pro'}
            </span>
            <span
              style={{
                fontSize: '8px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '1px 5px',
                borderRadius: '999px',
                background: 'rgba(245, 158, 11, 0.25)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#FDE68A',
                letterSpacing: '0.5px',
              }}
            >
              Pro
            </span>
          </div>
          <p style={{ margin: 0, fontSize: compact ? '11px' : '12px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.3 }}>
            {compact ? 'Unlock Deep MDT, Specialists & Memory Vaults' : 'Unlock Deep MDT Consensus, Parallel Multi-Specialists & Unlimited Health Memory Vaults'}
          </p>
        </div>
      </div>

      <div
        style={{
          width: compact ? '26px' : '34px',
          height: compact ? '26px' : '34px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          flexShrink: 0,
          zIndex: 1,
          marginLeft: compact ? '8px' : '12px',
        }}
      >
        <ArrowRight size={compact ? 13 : 16} />
      </div>
    </motion.div>
  );
}
