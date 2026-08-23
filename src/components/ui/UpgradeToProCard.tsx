import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface UpgradeToProCardProps {
  isPro?: boolean;
  onNavigate?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export default function UpgradeToProCard({ isPro = false, onNavigate, className = '', style = {} }: UpgradeToProCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    try { triggerHapticLight(); } catch {}
    if (onNavigate) onNavigate();
    navigate('/pricing');
  };

  if (isPro) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          padding: '14px 18px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDFA 100%)',
          border: '1px solid rgba(5, 150, 105, 0.25)',
          boxShadow: '0 4px 16px rgba(5, 150, 105, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          ...style,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>HealthChain Pro Active</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '999px',
                  background: '#059669',
                  color: '#FFFFFF',
                }}
              >
                Active
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
              All clinical tools, multi-specialist consensus & priority quota unlocked
            </div>
          </div>
        </div>
        <button
          onClick={handleClick}
          style={{
            border: 'none',
            background: '#047857',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '10px',
            padding: '8px 14px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(4, 120, 87, 0.2)',
            transition: 'opacity 0.2s',
          }}
        >
          Manage Plan
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
        padding: '16px 20px',
        borderRadius: '22px',
        background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #0F172A 100%)',
        border: '1px solid rgba(16, 185, 129, 0.4)',
        boxShadow: '0 12px 30px -5px rgba(4, 120, 87, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
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
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, transparent 70%)',
          filter: 'blur(12px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', zIndex: 1, minWidth: 0 }}>
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.45)',
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          <Sparkles size={22} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <span style={{ fontWeight: 800, fontSize: '15px', letterSpacing: '-0.2px' }}>Upgrade to HealthChain Pro</span>
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '2px 7px',
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
          <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.35 }}>
            Unlock Deep MDT Consensus, Parallel Multi-Specialists & Unlimited Health Memory Vaults
          </p>
        </div>
      </div>

      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          flexShrink: 0,
          zIndex: 1,
          marginLeft: '12px',
        }}
      >
        <ArrowRight size={16} />
      </div>
    </motion.div>
  );
}
