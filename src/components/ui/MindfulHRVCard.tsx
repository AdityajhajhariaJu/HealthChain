import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, RotateCcw, CheckCircle2, Sparkles, Wind, ShieldCheck, Activity } from 'lucide-react';
import { awardMindfulPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

function getLocalDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function MindfulHRVCard() {
  const isMobile = useIsMobile();
  const todayStr = getLocalDateKey();
  const isoStr = new Date().toISOString().split('T')[0];
  const breathKey = `hc_breath_${todayStr}`;
  const isoBreathKey = `hc_breath_${isoStr}`;

  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [cycleCount, setCycleCount] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(4);
  const [breathCompletedToday, setBreathCompletedToday] = useState<boolean>(() => {
    try {
      return localStorage.getItem(breathKey) === 'true' || localStorage.getItem(isoBreathKey) === 'true';
    } catch {
      return false;
    }
  });

  // Breathwork timer interval
  useEffect(() => {
    if (!breathActive) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [breathActive]);

  // Handle phase transitions cleanly
  useEffect(() => {
    if (!breathActive || secondsRemaining > 0) return;

    if (breathPhase === 'Inhale') {
      setBreathPhase('Hold');
      setSecondsRemaining(4);
      triggerHapticLight();
    } else if (breathPhase === 'Hold') {
      setBreathPhase('Exhale');
      setSecondsRemaining(4);
      triggerHapticLight();
    } else if (breathPhase === 'Exhale') {
      setBreathPhase('Rest');
      setSecondsRemaining(4);
      triggerHapticLight();
    } else {
      const nextCycle = cycleCount + 1;
      setCycleCount(nextCycle);
      if (nextCycle >= 3) {
        setBreathActive(false);
        setBreathCompletedToday(true);
        try {
          localStorage.setItem(breathKey, 'true');
        } catch {}
        awardMindfulPoints();
        triggerHapticSuccess();
        setSecondsRemaining(4);
      } else {
        setBreathPhase('Inhale');
        setSecondsRemaining(4);
        triggerHapticLight();
      }
    }
  }, [secondsRemaining, breathActive, breathPhase, cycleCount, breathKey]);

  const startBreathwork = () => {
    triggerHapticLight();
    setBreathPhase('Inhale');
    setCycleCount(0);
    setSecondsRemaining(4);
    setBreathActive(true);
  };

  const resetBreathwork = () => {
    triggerHapticLight();
    setBreathActive(false);
    setBreathPhase('Inhale');
    setCycleCount(0);
    setSecondsRemaining(4);
  };

  const getPhaseInstruction = () => {
    switch (breathPhase) {
      case 'Inhale': return 'Fill your diaphragm slowly through the nose';
      case 'Hold': return 'Hold gently without straining';
      case 'Exhale': return 'Release slowly through the mouth';
      case 'Rest': return 'Rest in calm stillness';
    }
  };

  return (
    <div
      style={{
        borderRadius: isMobile ? '20px' : '24px',
        background: 'linear-gradient(135deg, #0B132B 0%, #1C2541 60%, #0F3B36 100%)',
        border: '1px solid rgba(52, 211, 153, 0.2)',
        boxShadow: '0 12px 36px -8px rgba(11, 19, 43, 0.35)',
        padding: isMobile ? '20px 16px' : '26px 28px',
        color: '#FFFFFF',
        marginBottom: '20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow ring */}
      <div
        style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167, 139, 250, 0.15) 0%, rgba(52, 211, 153, 0.12) 50%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '20px' : '32px',
        }}
      >
        {/* Left Side: Info & Controls */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#34D399',
                background: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                padding: '3px 10px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Wind size={13} /> Vagal Nerve Optimization
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#DDD6FE',
                background: 'rgba(167, 139, 250, 0.15)',
                border: '1px solid rgba(167, 139, 250, 0.3)',
                padding: '3px 10px',
                borderRadius: '999px',
              }}
            >
              +3 PTS Daily Reward
            </span>
          </div>

          <h3 style={{ margin: '0 0 6px', fontSize: isMobile ? '18px' : '22px', fontWeight: 800, letterSpacing: '-0.3px', color: '#FFFFFF' }}>
            60-Second Mindful HRV Reset
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#94A3B8', lineHeight: 1.5, maxWidth: '540px' }}>
            {breathActive
              ? getPhaseInstruction()
              : breathCompletedToday
              ? '✨ Today’s parasympathetic recovery session is complete (+3 PTS awarded). Practice again anytime to de-stress.'
              : 'Follow the 4-4-4 box breathing sphere for 3 cycles (1 minute) to boost Heart Rate Variability, lower cortisol, and steady your pulse.'}
          </p>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {!breathActive ? (
              <button
                onClick={startBreathwork}
                style={{
                  padding: isMobile ? '10px 18px' : '11px 22px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Play size={15} fill="#FFFFFF" /> {breathCompletedToday ? 'Practice Again (60s)' : 'Begin 60s HRV Reset'}
              </button>
            ) : (
              <button
                onClick={resetBreathwork}
                style={{
                  padding: isMobile ? '10px 16px' : '11px 18px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#CBD5E1',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RotateCcw size={14} /> Stop / Reset
              </button>
            )}

            {breathActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.06)', padding: '6px 14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <Activity size={14} color="#34D399" />
                <span style={{ fontSize: '12.5px', color: '#E2E8F0', fontWeight: 700 }}>
                  Cycle {cycleCount + 1} of 3
                </span>
              </div>
            )}

            {breathCompletedToday && !breathActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#34D399', fontSize: '13px', fontWeight: 700 }}>
                <CheckCircle2 size={16} /> Session Completed Today
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Visual Paced Breathing Sphere */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: isMobile ? '100%' : '180px',
            padding: isMobile ? '10px 0' : '0',
          }}
        >
          <div
            style={{
              width: '140px',
              height: '140px',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Pulsing outer ring */}
            <motion.div
              animate={{
                scale: breathActive
                  ? breathPhase === 'Inhale' || breathPhase === 'Hold'
                    ? [1, 1.4, 1.3]
                    : [1.3, 0.85, 0.9]
                  : [1, 1.08, 1],
                opacity: breathActive ? [0.3, 0.7, 0.4] : 0.25,
              }}
              transition={{
                duration: breathActive ? 4 : 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(52, 211, 153, 0.3) 0%, rgba(167, 139, 250, 0.1) 70%, transparent 100%)',
              }}
            />

            {/* Main Interactive Core Orb */}
            <motion.div
              animate={{
                scale: breathActive
                  ? breathPhase === 'Inhale'
                    ? 1.25
                    : breathPhase === 'Exhale'
                    ? 0.8
                    : breathPhase === 'Hold'
                    ? 1.25
                    : 0.8
                  : 1,
              }}
              transition={{ duration: 4, ease: 'easeInOut' }}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: breathActive
                  ? breathPhase === 'Inhale'
                    ? 'radial-gradient(circle, #34D399 0%, #059669 85%)'
                    : breathPhase === 'Hold'
                    ? 'radial-gradient(circle, #60A5FA 0%, #2563EB 85%)'
                    : breathPhase === 'Exhale'
                    ? 'radial-gradient(circle, #C084FC 0%, #7C3AED 85%)'
                    : 'radial-gradient(circle, #38BDF8 0%, #0284C7 85%)'
                  : 'radial-gradient(circle, rgba(52, 211, 153, 0.5) 0%, rgba(5, 150, 105, 0.25) 85%)',
                boxShadow: breathActive
                  ? '0 0 35px rgba(52, 211, 153, 0.55)'
                  : '0 0 18px rgba(52, 211, 153, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                textAlign: 'center',
                border: '2px solid rgba(255, 255, 255, 0.35)',
                zIndex: 2,
              }}
            >
              <span style={{ fontSize: '11.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                {breathActive ? breathPhase : 'Calm'}
              </span>
              {breathActive ? (
                <span style={{ fontSize: '18px', fontWeight: 900, marginTop: '2px', lineHeight: 1 }}>
                  {secondsRemaining}s
                </span>
              ) : (
                <Heart size={18} style={{ marginTop: '3px' }} fill="rgba(255,255,255,0.7)" />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
