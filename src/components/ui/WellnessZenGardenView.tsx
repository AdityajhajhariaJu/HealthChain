import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Droplet, Info, Wind } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { triggerHapticLight } from '../../services/haptics';
import { getGardenState } from '../../services/WellnessGardenService';
import { tendIsland } from '../../services/GamificationHub';
import { ZenGarden } from '../../features/zen-garden/ZenGarden';
import { useGarden } from '../../features/zen-garden/useGarden';
import { getDailyStreak } from '../../services/VitalityPointsEngine';

interface WellnessZenGardenViewProps {
  onOpenMindfulness?: () => void;
  onClose?: () => void;
}

export const WellnessZenGardenView: React.FC<WellnessZenGardenViewProps> = ({
  onOpenMindfulness,
}) => {
  const island = useGarden();
  const garden = getGardenState(),
    dailyStreak = getDailyStreak();
  const reducedMotion = useReducedMotion();
  const [isWatering, setIsWatering] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [status, setStatus] = useState('');
  const wateringTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const gardenTendedToday = island.tendedToday;
  const streakCount = Math.max(dailyStreak.currentStreak, garden.streakDays);
  useEffect(() => () => clearTimeout(wateringTimer.current), []);
  const handleWater = () => {
    triggerHapticLight();
    const result = tendIsland();
    if (!result.saved) {
      setStatus('Your tending could not be saved. Please try again.');
      return;
    }
    setStatus('');
    setIsWatering(true);
    clearTimeout(wateringTimer.current);
    wateringTimer.current = setTimeout(() => setIsWatering(false), 1200);
  };

  return (
    <div className="zen-garden" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          position: 'relative',
          background: 'radial-gradient(ellipse at top, #FFFFFF 0%, #FFFAFA 45%, #FFF7F8 100%)',
          borderRadius: '28px',
          padding: '24px 20px',
          border: '1.5px solid #F1E5E7',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          minHeight: '260px',
        }}
      >
        <div style={{ position: 'relative', width: '100%' }}>
          <ZenGarden />
          <AnimatePresence>
            {isWatering && !reducedMotion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: -20 }}
                animate={{ opacity: 1, scale: 1.2, y: 0 }}
                exit={{ opacity: 0, scale: 1.4 }}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '45%',
                  left: '40%',
                  color: '#0284C7',
                  fontSize: '28px',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                💦 💧 ✨
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showGuide && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '16px',
              background: '#FFFAFA',
              borderRadius: '16px',
              padding: '8px 18px',
              border: '1px solid #F1E5E7',
              textAlign: 'center',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#CD3153',
                textTransform: 'uppercase',
              }}
            >
              How this garden works
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>
              One daily tending action grows one bloom. It does not judge symptoms, meals, or rest
              days.
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', lineHeight: 1.5, color: '#64748B' }}>
              The island grows slowly from saved records, reflections, calm, research and
              preparation. The first three different categories add 3, 2 and 1 growth each day, with
              up to 15 points. Tending and calm share one category. Rest never removes island
              progress.
            </p>
            {island.next && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748B' }}>
                Next: {island.next.name} — {island.nextGrowth} more growth and {island.nextDays}{' '}
                more participation days. Daily limits use {island.timezone}.
              </p>
            )}
          </motion.div>
        )}

        {status && (
          <p role="status" style={{ color: '#BE123C', fontSize: '12px', margin: '8px 0 0' }}>
            {status}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '18px',
            width: '100%',
            maxWidth: '340px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <button
              type="button"
              onClick={handleWater}
              disabled={isWatering || gardenTendedToday}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '14px',
                background: '#FFFFFF',
                color: '#0284C7',
                border: '1.5px solid #E2E8F0',
                fontSize: '13px',
                fontWeight: 700,
                cursor: gardenTendedToday ? 'default' : 'pointer',
                opacity: gardenTendedToday ? 0.72 : 1,
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.12)',
              }}
            >
              <Droplet size={16} fill="#0284C7" />{' '}
              {gardenTendedToday ? 'Garden Tended Today' : 'Water Garden'}
            </button>
            <button
              type="button"
              onClick={() => setShowGuide((value) => !value)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minHeight: '44px',
                padding: '10px 14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
              }}
            >
              <Info size={16} /> {showGuide ? 'Hide Guide' : 'How It Grows'}
            </button>
          </div>
          {onOpenMindfulness && (
            <button
              type="button"
              onClick={onOpenMindfulness}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                minHeight: '44px',
                padding: '9px 14px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #FFFAFA 100%)',
                color: '#0F766E',
                border: '1.5px solid #F1E5E7',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
            >
              <Wind size={14} strokeWidth={2.4} /> Explore Soundscapes & Breathwork →
            </button>
          )}
        </div>
      </div>

      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '22px',
          padding: '18px 20px',
          border: '1.5px solid #F1E5E7',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#8E9AAF',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
              }}
            >
              SANCTUARY METRICS
            </span>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>
              Garden Vitality: <strong style={{ color: '#10B981' }}>{garden.vitalityScore}%</strong>
            </div>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#CD3153',
              background: '#FEF2F3',
              padding: '4px 12px',
              borderRadius: '999px',
              border: '1px solid #F9D2D7',
            }}
          >
            Level {garden.level} • {garden.gardenStage.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '8px',
            background: '#F1E5E7',
            borderRadius: '999px',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={reducedMotion ? false : { width: 0 }}
            animate={{ width: `${garden.vitalityScore}%` }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
              borderRadius: '999px',
            }}
          />
        </div>

        {/* 3 Metric Cards: Blooms, Days Tended, Garden Streak */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '2px',
          }}
        >
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Blooms</div>
            <div style={metricValueStyle}>🌸 {garden.bloomCount}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Days Tended</div>
            <div style={{ ...metricValueStyle, color: '#059669' }}>💧 {garden.waterCount}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Garden Streak</div>
            <div style={{ ...metricValueStyle, color: '#D97706' }}>
              🔥 {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const metricCardStyle = {
  background: '#FFFAFA',
  padding: '10px 8px',
  borderRadius: '12px',
  textAlign: 'center',
  border: '1px solid #F1E5E7',
} as const;
const metricLabelStyle = { fontSize: '11px', color: '#64748B', fontWeight: 600 } as const;
const metricValueStyle = {
  fontSize: '15px',
  fontWeight: 800,
  color: '#0F172A',
  marginTop: '2px',
} as const;
