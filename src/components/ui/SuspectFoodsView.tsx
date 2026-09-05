import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Clock, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';
import { getSuspectFoodsLeaderboard, SuspectFoodItem } from '../../services/TriggerEngine';
import { triggerHapticLight } from '../../services/haptics';

interface SuspectFoodsViewProps {
  onStartTrial?: (protocolId: string) => void;
}

export const SuspectFoodsView: React.FC<SuspectFoodsViewProps> = ({ onStartTrial }) => {
  const suspectFoods = getSuspectFoodsLeaderboard();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #FECDD3',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #E11D48 0%, #BE123C 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
            flexShrink: 0,
          }}
        >
          <TrendingUp size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#BE123C', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            STATISTICAL CORRELATION LEADERBOARD
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
            Suspect Foods & Culprit Ranking
          </div>
          <div style={{ fontSize: '12.5px', color: '#78716C', marginTop: '2px' }}>
            Ingredients statistically linked to symptom flare episodes based on your logged meal timelines.
          </div>
        </div>
      </div>

      {/* Suspect Foods List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {suspectFoods.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '16px 18px',
              border: '1.5px solid #F1F5F9',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>{item.emoji}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#1C1917' }}>{item.name}</span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: '#F8FAFC',
                        color: '#64748B',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      {item.category}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#E11D48', fontWeight: 700 }}>
                    {item.primarySensitivity}
                  </span>
                </div>
              </div>

              {/* Correlation percentage pill */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                }}
              >
                <div
                  style={{
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: '#FFF1F2',
                    color: '#E11D48',
                    fontSize: '14px',
                    fontWeight: 800,
                    border: '1px solid #FECDD3',
                  }}
                >
                  +{item.correlationPercent}%
                </div>
                <span style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '2px' }}>
                  flare likelihood
                </span>
              </div>
            </div>

            {/* Progress bar representing correlation intensity */}
            <div style={{ width: '100%', height: '7px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, item.correlationPercent * 2.2)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #FF6B4A 0%, #E11D48 100%)',
                  borderRadius: '999px',
                }}
              />
            </div>

            {/* Metrics Chips */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '11.5px',
                  color: '#475569',
                }}
              >
                <Clock size={13} color="#64748B" />
                <span>Reaction: <strong>{item.reactionWindow}</strong></span>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  fontSize: '11.5px',
                  color: '#475569',
                }}
              >
                <AlertTriangle size={13} color="#D97706" />
                <span><strong>{item.flaresTracked}</strong> flares observed ({item.daysObserved}d)</span>
              </div>
            </div>

            {/* Clinical Mechanism */}
            <div
              style={{
                fontSize: '12px',
                color: '#64748B',
                lineHeight: 1.4,
                background: '#FFF8F5',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #FFE4D6',
              }}
            >
              <strong style={{ color: '#1C1917' }}>Biological Action: </strong>
              {item.mechanism}
            </div>

            {/* Safe Swap Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '12px',
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} color="#16A34A" />
                <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                  Safe Swap: {item.safeSwap}
                </span>
              </div>

              {onStartTrial && (
                <button
                  type="button"
                  onClick={() => {
                    triggerHapticLight();
                    onStartTrial('low_histamine');
                  }}
                  style={{
                    background: '#DCFCE7',
                    border: 'none',
                    color: '#15803D',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Test in Trial <ArrowRight size={12} />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
