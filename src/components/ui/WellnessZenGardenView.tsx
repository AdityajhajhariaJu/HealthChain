import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Info, Sparkles } from 'lucide-react';
import { getGardenState, recordGardenAction, GardenState } from '../../services/TriggerEngine';
import { triggerHapticLight } from '../../services/haptics';
import { getDailyStreak } from '../../services/VitalityPointsEngine';

interface WellnessZenGardenViewProps { onOpenMindfulness?: () => void; }

export const WellnessZenGardenView: React.FC<WellnessZenGardenViewProps> = () => {
  const [garden, setGarden] = useState<GardenState>(getGardenState());
  const [dailyStreak, setDailyStreak] = useState(() => getDailyStreak());
  const [isWatering, setIsWatering] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const today = new Date().toLocaleDateString('en-CA');
  const gardenTendedToday = garden.lastWateredDate === today;

  const refreshStreak = () => {
    setDailyStreak(getDailyStreak());
    setGarden(getGardenState());
  };

  useEffect(() => {
    window.addEventListener('hc_points_updated', refreshStreak);
    window.addEventListener('hc_daily_checkin_completed', refreshStreak);
    window.addEventListener('hc_garden_updated', refreshStreak);
    return () => {
      window.removeEventListener('hc_points_updated', refreshStreak);
      window.removeEventListener('hc_daily_checkin_completed', refreshStreak);
      window.removeEventListener('hc_garden_updated', refreshStreak);
    };
  }, []);

  const streakCount = Math.max(dailyStreak?.currentStreak || 0, garden.streakDays || 0, 1);

  const handleWater = () => {
    triggerHapticLight();
    setIsWatering(true);
    setGarden(recordGardenAction('water'));
    setTimeout(() => setIsWatering(false), 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)', borderRadius: '20px', padding: '16px 18px', border: '1.5px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)', flexShrink: 0 }}>
          <Sparkles size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.6px', textTransform: 'uppercase' }}>YOUR ZEN GARDEN</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>A quiet record of consistency</div>
          <div style={{ fontSize: '12.5px', color: '#065F46', marginTop: '2px' }}>Tend it once each day. The garden is a gentle visual ritual—not a health score.</div>
        </div>
      </div>

      <div style={{ position: 'relative', background: 'radial-gradient(ellipse at top, #F0FDF4 0%, #DCFCE7 60%, #CCFBF1 100%)', borderRadius: '28px', padding: '24px 20px', border: '2px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 16px 40px rgba(13, 148, 136, 0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', minHeight: '260px' }}>
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }} transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }} style={{ position: 'absolute', top: '-20px', right: '20px', width: '90px', height: '90px', borderRadius: '50%', background: 'radial-gradient(circle, #FDE047 0%, rgba(251, 146, 60, 0) 70%)', pointerEvents: 'none' }} />
        <motion.div animate={{ y: [-5, -20, -5], opacity: [0.4, 0.9, 0.4] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} style={{ position: 'absolute', top: '40px', left: '30px', fontSize: '18px' }}>✨</motion.div>
        <motion.div animate={{ y: [0, -15, 0], opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 1 }} style={{ position: 'absolute', top: '70px', right: '50px', fontSize: '16px' }}>🌸</motion.div>

        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }} style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF1F2 100%)', border: '3px solid #FECDD3', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(225, 29, 72, 0.25)', zIndex: 2 }}>
            <span style={{ fontSize: '42px', display: 'block' }}>🧘</span>
            <div style={{ position: 'absolute', top: '-4px', background: '#E11D48', color: '#FFFFFF', fontSize: '9px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px', letterSpacing: '0.4px', textTransform: 'uppercase', boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)' }}>ZEN AVA</div>
          </motion.div>

          <div style={{ marginTop: '-18px', width: '210px', height: '56px', borderRadius: '50%', background: 'linear-gradient(180deg, #86EFAC 0%, #4ADE80 50%, #22C55E 100%)', border: '2.5px solid #BBF7D0', boxShadow: '0 12px 28px rgba(34, 197, 94, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', zIndex: 1 }}>
            <span style={{ fontSize: '20px' }}>🌸</span><span style={{ fontSize: '18px' }}>🌱</span><span style={{ fontSize: '20px' }}>🌺</span><span style={{ fontSize: '16px' }}>💧</span><span style={{ fontSize: '20px' }}>🌷</span>
          </div>

          <AnimatePresence>
            {isWatering && (
              <motion.div initial={{ opacity: 0, scale: 0.5, y: -20 }} animate={{ opacity: 1, scale: 1.2, y: 0 }} exit={{ opacity: 0, scale: 1.4 }} style={{ position: 'absolute', top: '10px', color: '#0284C7', fontSize: '28px', zIndex: 10 }}>💦 💧 ✨</motion.div>
            )}
          </AnimatePresence>
        </div>

        {showGuide && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: '16px', background: 'rgba(255, 255, 255, 0.95)', borderRadius: '16px', padding: '8px 18px', border: '1px solid #A7F3D0', textAlign: 'center', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.1)' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#E11D48', textTransform: 'uppercase' }}>How this garden works</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>One daily tending action grows one bloom. It does not judge symptoms, meals, or rest days.</div>
          </motion.div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', width: '100%', maxWidth: '320px' }}>
          <button type="button" onClick={handleWater} disabled={isWatering || gardenTendedToday} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '14px', background: '#FFFFFF', color: '#0284C7', border: '1.5px solid #BAE6FD', fontSize: '13px', fontWeight: 700, cursor: gardenTendedToday ? 'default' : 'pointer', opacity: gardenTendedToday ? 0.72 : 1, boxShadow: '0 4px 12px rgba(2, 132, 199, 0.12)' }}>
            <Droplet size={16} fill="#0284C7" /> {gardenTendedToday ? 'Garden Tended Today' : 'Water Garden'}
          </button>
          <button type="button" onClick={() => setShowGuide((value) => !value)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '14px', background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)', color: '#FFFFFF', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)' }}>
            <Info size={16} /> {showGuide ? 'Hide Guide' : 'How It Grows'}
          </button>
        </div>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: '22px', padding: '18px 20px', border: '1.5px solid #F1F5F9', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>SANCTUARY METRICS</span>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#1C1917', marginTop: '2px' }}>Garden Vitality: <strong style={{ color: '#10B981' }}>{garden.vitalityScore}%</strong></div>
          </div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#E11D48', background: '#FFF1F2', padding: '4px 12px', borderRadius: '999px', border: '1px solid #FECDD3' }}>Level {garden.level} • {garden.gardenStage.replace('_', ' ').toUpperCase()}</span>
        </div>
        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${garden.vitalityScore}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: '999px' }} />
        </div>

        {/* 3 Metric Cards: Blooms, Days Tended, Garden Streak */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '2px' }}>
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
            <div style={{ ...metricValueStyle, color: '#D97706' }}>🔥 {streakCount} {streakCount === 1 ? 'Day' : 'Days'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const metricCardStyle = { background: '#F8FAFC', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' } as const;
const metricLabelStyle = { fontSize: '11px', color: '#64748B', fontWeight: 600 } as const;
const metricValueStyle = { fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '2px' } as const;
