import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Sparkles } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

export default function PointsAwardedToast() {
  const [toastData, setToastData] = useState<{ amount: number; reason: string; id: number } | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleAwarded = (event: Event) => {
      const custom = event as CustomEvent;
      if (custom.detail && custom.detail.amount > 0) {
        setToastData({
          amount: custom.detail.amount,
          reason: custom.detail.reason || 'Health Points Earned',
          id: Date.now(),
        });

        setTimeout(() => {
          setToastData(null);
        }, 4000);
      }
    };

    window.addEventListener('hc_points_awarded', handleAwarded);
    return () => {
      window.removeEventListener('hc_points_awarded', handleAwarded);
    };
  }, []);

  if (!toastData) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={toastData.id}
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: isMobile ? '64px' : '24px',
          right: isMobile ? '16px' : '32px',
          zIndex: 100001,
          background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
          color: '#FFFFFF',
          padding: '10px 16px',
          borderRadius: '16px',
          boxShadow: '0 12px 30px -4px rgba(4, 120, 87, 0.4), 0 4px 10px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          border: '1px solid #34D399',
          cursor: 'pointer',
        }}
        onClick={() => {
          setToastData(null);
          window.dispatchEvent(new Event('hc_open_points_modal'));
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}
        >
          🏆
        </div>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '-0.2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>+{toastData.amount} Vitality Points!</span>
            <Sparkles size={13} color="#FDE047" />
          </div>
          <div style={{ fontSize: '11px', color: '#D1FAE5' }}>{toastData.reason}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
