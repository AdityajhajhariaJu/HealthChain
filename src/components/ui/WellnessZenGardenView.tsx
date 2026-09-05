import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplet, Wind, Sparkles, Sun, Heart, Flame, RefreshCw, Award } from 'lucide-react';
import { getGardenState, recordGardenAction, GardenState } from '../../services/TriggerEngine';
import { triggerHapticLight } from '../../services/haptics';

interface WellnessZenGardenViewProps {
  onOpenMindfulness?: () => void;
}

export const WellnessZenGardenView: React.FC<WellnessZenGardenViewProps> = ({ onOpenMindfulness }) => {
  const [garden, setGarden] = useState<GardenState>(getGardenState());
  const [isWatering, setIsWatering] = useState(false);
  const [isBreathingInGarden, setIsBreathingInGarden] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale (4s)' | 'Hold (7s)' | 'Exhale (8s)'>('Inhale (4s)');

  const handleWater = () => {
    triggerHapticLight();
    setIsWatering(true);
    const updated = recordGardenAction('water');
    setGarden(updated);
    setTimeout(() => setIsWatering(false), 1200);
  };

  const toggleGardenBreathing = () => {
    triggerHapticLight();
    if (isBreathingInGarden) {
      setIsBreathingInGarden(false);
      return;
    }
    setIsBreathingInGarden(true);
    const updated = recordGardenAction('breathwork');
    setGarden(updated);

    // Simple 4-7-8 breathing loop demo
    setBreathPhase('Inhale (4s)');
    setTimeout(() => {
      setBreathPhase('Hold (7s)');
      setTimeout(() => {
        setBreathPhase('Exhale (8s)');
      }, 7000);
    }, 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Top Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FFF7F2 0%, #FFEFE6 100%)',
          borderRadius: '20px',
          padding: '16px 18px',
          border: '1.5px solid #FCD9C6',
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
            background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(255, 107, 74, 0.3)',
            flexShrink: 0,
          }}
        >
          <Sparkles size={20} />
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#EA580C', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
            AUTONOMIC GUT-BRAIN EQUILIBRIUM
          </div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917', lineHeight: 1.2 }}>
            Calm Your Body & Mind, Grow Your Garden
          </div>
          <div style={{ fontSize: '12.5px', color: '#78716C', marginTop: '2px' }}>
            Every clean meal, breathwork reset, and flare-free day blooms rare flowers and restores gut microbiome serenity.
          </div>
        </div>
      </div>

      {/* Floating Garden Island Container */}
      <div
        style={{
          position: 'relative',
          background: 'radial-gradient(ellipse at top, #FFF0E6 0%, #FED7C3 60%, #FDBA99 100%)',
          borderRadius: '28px',
          padding: '24px 20px',
          border: '2px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 16px 40px rgba(234, 88, 12, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflow: 'hidden',
          minHeight: '260px',
        }}
      >
        {/* Sun Glow in background */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          style={{
            position: 'absolute',
            top: '-20px',
            right: '20px',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #FDE047 0%, rgba(251, 146, 60, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Floating Sparkles */}
        <motion.div
          animate={{ y: [-5, -20, -5], opacity: [0.4, 0.9, 0.4] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          style={{ position: 'absolute', top: '40px', left: '30px', fontSize: '18px' }}
        >
          ✨
        </motion.div>
        <motion.div
          animate={{ y: [0, -15, 0], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', delay: 1 }}
          style={{ position: 'absolute', top: '70px', right: '50px', fontSize: '16px' }}
        >
          🌸
        </motion.div>

        {/* Garden Island Graphic / Mascot */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Animated Mascot Ava in Zen Meditation */}
          <motion.div
            animate={
              isBreathingInGarden
                ? { scale: [1, 1.22, 1], y: [0, -10, 0] }
                : { y: [0, -6, 0] }
            }
            transition={{
              repeat: Infinity,
              duration: isBreathingInGarden ? 6 : 3,
              ease: 'easeInOut',
            }}
            style={{
              position: 'relative',
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF1F2 100%)',
              border: '3px solid #FECDD3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(225, 29, 72, 0.25)',
              zIndex: 2,
            }}
          >
            {/* Meditating Ava Face */}
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '42px', display: 'block' }}>🧘</span>
            </div>

            {/* Pink Headband Badge */}
            <div
              style={{
                position: 'absolute',
                top: '-4px',
                background: '#E11D48',
                color: '#FFFFFF',
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '999px',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)',
              }}
            >
              ZEN AVA
            </div>
          </motion.div>

          {/* Lush Island Pedestal */}
          <div
            style={{
              marginTop: '-18px',
              width: '210px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(180deg, #86EFAC 0%, #4ADE80 50%, #22C55E 100%)',
              border: '2.5px solid #BBF7D0',
              boxShadow: '0 12px 28px rgba(34, 197, 94, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              zIndex: 1,
            }}
          >
            <span style={{ fontSize: '20px' }}>🌸</span>
            <span style={{ fontSize: '18px' }}>🌱</span>
            <span style={{ fontSize: '20px' }}>🌺</span>
            <span style={{ fontSize: '16px' }}>💧</span>
            <span style={{ fontSize: '20px' }}>🌷</span>
          </div>

          {/* Water Splash Animation */}
          <AnimatePresence>
            {isWatering && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: -20 }}
                animate={{ opacity: 1, scale: 1.2, y: 0 }}
                exit={{ opacity: 0, scale: 1.4 }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  color: '#0284C7',
                  fontSize: '28px',
                  zIndex: 10,
                }}
              >
                💦 💧 ✨
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Breathing Guide Banner during active breathwork */}
        {isBreathingInGarden && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: '16px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '8px 18px',
              border: '1px solid #FCD9C6',
              textAlign: 'center',
              boxShadow: '0 4px 14px rgba(234, 88, 12, 0.1)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#E11D48', textTransform: 'uppercase' }}>
              Vagus Nerve Pacing
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1C1917' }}>
              {breathPhase}
            </div>
          </motion.div>
        )}

        {/* Garden Controls */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '18px', width: '100%', maxWidth: '320px' }}>
          <button
            type="button"
            onClick={handleWater}
            disabled={isWatering}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '14px',
              background: '#FFFFFF',
              color: '#0284C7',
              border: '1.5px solid #BAE6FD',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.12)',
            }}
          >
            <Droplet size={16} fill="#0284C7" /> Water Garden
          </button>

          <button
            type="button"
            onClick={toggleGardenBreathing}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #FF6B4A 0%, #FF8A65 100%)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(255, 107, 74, 0.3)',
            }}
          >
            <Wind size={16} /> {isBreathingInGarden ? 'Stop Reset' : '4-7-8 Breath'}
          </button>
        </div>
      </div>

      {/* Garden Vitality & Stats Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '22px',
          padding: '18px 20px',
          border: '1.5px solid #F1F5F9',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#8E9AAF', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
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
              color: '#E11D48',
              background: '#FFF1F2',
              padding: '4px 12px',
              borderRadius: '999px',
              border: '1px solid #FECDD3',
            }}
          >
            Level {garden.level} • {garden.gardenStage.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Vitality Bar */}
        <div style={{ width: '100%', height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${garden.vitalityScore}%` }}
            transition={{ duration: 0.6 }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)', borderRadius: '999px' }}
          />
        </div>

        {/* 4-Column Garden Milestones */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          <div style={{ background: '#F8FAFC', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Blooms</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginTop: '2px' }}>
              🌸 {garden.bloomCount}
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Streak</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#EA580C', marginTop: '2px' }}>
              🔥 {garden.streakDays}d
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Calm Min</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>
              🍃 {garden.breathworkMinutes}m
            </div>
          </div>

          <div style={{ background: '#F8FAFC', padding: '10px 8px', borderRadius: '12px', textAlign: 'center', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>Clean Meals</div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
              🥗 {garden.cleanMealsCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
