import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Play, Square, CheckCircle2, Wind, Activity, Volume2, VolumeX, Info } from 'lucide-react';
import { awardMindfulPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticTick, triggerHapticHeartbeat, triggerHapticSelection } from '../../services/haptics';
import { useIsMobile } from '../../hooks/useIsMobile';

function getLocalDateKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const VIBRATIONAL_TRACKS = [
  {
    id: '528hz',
    label: '528Hz Solfeggio',
    desc: 'Cellular Renewal & Transformation',
    url: '/audio/Solfeggio 528Hz Transformation.m4a',
    frequency: '528Hz',
  },
  {
    id: '432hz',
    label: '432Hz Clarity',
    desc: 'Autonomic Nerve Balance',
    url: '/audio/432Hz Clarity.m4a',
    frequency: '432Hz',
  },
  {
    id: 'tranquil',
    label: 'Tranquil Breathing Space',
    desc: 'Organic Sine Waves & Vagus Reset',
    url: '/audio/Tranquil Breathing Space.m4a',
    frequency: 'Calm Wave',
  },
  {
    id: 'neural',
    label: 'Deep Neural Resonance',
    desc: 'Subterranean Bass Drone',
    url: '/audio/Deep Neural Harmony.m4a',
    frequency: 'Delta/Theta',
  },
];

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
  const [showScienceRationale, setShowScienceRationale] = useState(false);
  const [breathCompletedToday, setBreathCompletedToday] = useState<boolean>(() => {
    try {
      return localStorage.getItem(breathKey) === 'true' || localStorage.getItem(isoBreathKey) === 'true';
    } catch {
      return false;
    }
  });

  // Vibrational Audio Management
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const playSeqRef = useRef<number>(0);

  const [selectedTrackIndex, setSelectedTrackIndex] = useState(0);
  const [isSoundMuted, setIsSoundMuted] = useState(false);

  // Guaranteed instant audio termination (iOS & Desktop safe, zero lingering decoder)
  const stopAudio = () => {
    isPlayingRef.current = false;
    playSeqRef.current += 1;

    if (audioInstanceRef.current) {
      try {
        const audio = audioInstanceRef.current;
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src'); // Explicitly detach source to clear Dynamic Island / iOS audio session
        audio.load();
      } catch (e) {
        console.warn('Error terminating audio:', e);
      }
      audioInstanceRef.current = null;
    }
  };

  // Glitch-free audio player
  const playAudio = (trackIdx = selectedTrackIndex) => {
    if (isSoundMuted) return;

    // Immediately halt previous audio instance
    stopAudio();

    const currentSeq = ++playSeqRef.current;
    isPlayingRef.current = true;

    const track = VIBRATIONAL_TRACKS[trackIdx];
    if (!track) return;

    try {
      // Use encoded URL to prevent URI parsing anomalies in iOS WebViews
      const audio = new Audio(encodeURI(track.url));
      audio.loop = true;
      audio.preload = 'auto';
      audioInstanceRef.current = audio;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // If user stopped or changed track while promise was resolving, halt immediately
            if (!isPlayingRef.current || playSeqRef.current !== currentSeq) {
              audio.pause();
              audio.currentTime = 0;
              audio.removeAttribute('src');
              audio.load();
              if (audioInstanceRef.current === audio) {
                audioInstanceRef.current = null;
              }
            }
          })
          .catch((err) => {
            console.warn('Audio playback prevented or interrupted:', err);
          });
      }
    } catch (e) {
      console.error('Failed to initialize vibrational audio:', e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Breathwork timer interval with haptic tick on decrement
  useEffect(() => {
    if (!breathActive) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        const nextVal = Math.max(0, prev - 1);
        if (nextVal > 0) {
          triggerHapticTick();
        }
        return nextVal;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [breathActive]);

  // Handle phase transitions cleanly
  useEffect(() => {
    if (!breathActive || secondsRemaining > 0) return;

    if (breathPhase === 'Inhale') {
      setBreathPhase('Hold');
      setSecondsRemaining(4);
      triggerHapticTick();
    } else if (breathPhase === 'Hold') {
      setBreathPhase('Exhale');
      setSecondsRemaining(4);
      triggerHapticTick();
    } else if (breathPhase === 'Exhale') {
      setBreathPhase('Rest');
      setSecondsRemaining(4);
      triggerHapticTick();
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
        triggerHapticHeartbeat();
        triggerHapticSuccess();
        setSecondsRemaining(4);
        stopAudio();
      } else {
        setBreathPhase('Inhale');
        setSecondsRemaining(4);
        triggerHapticHeartbeat();
      }
    }
  }, [secondsRemaining, breathActive, breathPhase, cycleCount, breathKey]);

  const startBreathwork = () => {
    triggerHapticLight();
    setBreathPhase('Inhale');
    setCycleCount(0);
    setSecondsRemaining(4);
    setBreathActive(true);
    playAudio();
  };

  const resetBreathwork = () => {
    triggerHapticLight();
    setBreathActive(false);
    setBreathPhase('Inhale');
    setCycleCount(0);
    setSecondsRemaining(4);
    stopAudio();
  };

  const handleSelectTrack = (idx: number) => {
    setSelectedTrackIndex(idx);
    triggerHapticSelection();
    triggerHapticTick();
    if (breathActive && !isSoundMuted) {
      playAudio(idx);
    }
  };

  const toggleMute = () => {
    triggerHapticLight();
    if (!isSoundMuted) {
      setIsSoundMuted(true);
      stopAudio();
    } else {
      setIsSoundMuted(false);
      if (breathActive) {
        playAudio(selectedTrackIndex);
      }
    }
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
        background: 'linear-gradient(135deg, #F0FDF4 0%, #FFFFFF 55%, #FAF5FF 100%)',
        border: '1px solid rgba(16, 185, 129, 0.22)',
        boxShadow: '0 8px 32px -4px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
        padding: isMobile ? '16px' : '20px 24px',
        color: '#0F172A',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle ambient accent glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, rgba(167, 139, 250, 0.08) 60%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          gap: isMobile ? '16px' : '24px',
        }}
      >
        {/* Left Side: Info & Controls */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <span
              className="micro-badge"
              style={{
                color: '#059669',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                padding: '3px 9px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}
            >
              <Wind size={12} /> 1-Min Reset
            </span>
            <span
              className="tabular-nums micro-badge"
              style={{
                color: '#7C3AED',
                background: '#F5F3FF',
                border: '1px solid #DDD6FE',
                padding: '3px 9px',
                borderRadius: '999px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}
            >
              +3 PTS
            </span>
            <button
              type="button"
              onClick={() => {
                triggerHapticSelection();
                setShowScienceRationale(prev => !prev);
              }}
              aria-label="Toggle clinical baroreflex science rationale"
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#047857',
                background: showScienceRationale ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '3px 9px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
                transition: 'all 0.2s ease'
              }}
            >
              <Info size={11} /> {showScienceRationale ? 'Hide Science' : 'Clinical Rationale'}
            </button>
          </div>

          <h3 style={{ margin: '0 0 4px', fontSize: isMobile ? '17px' : '19px', fontWeight: 800, letterSpacing: '-0.3px', color: '#0F172A' }}>
            60-Second Mindful HRV Reset
          </h3>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#64748B', lineHeight: 1.45, maxWidth: '460px' }}>
            {breathActive
              ? getPhaseInstruction()
              : breathCompletedToday
              ? '✨ Session completed today (+3 PTS awarded). Practice again anytime.'
              : `4-4-4 box breathing with ${VIBRATIONAL_TRACKS[selectedTrackIndex].label} (${VIBRATIONAL_TRACKS[selectedTrackIndex].desc}).`}
          </p>

          {/* Direct Frequency Selector Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {VIBRATIONAL_TRACKS.map((t, idx) => {
              const isSelected = selectedTrackIndex === idx;
              const isCurrentlyPlaying = isSelected && breathActive && !isSoundMuted;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTrack(idx)}
                  aria-label={`Select ${t.label} frequency (${t.desc})`}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: isSelected ? 800 : 600,
                    color: isSelected ? (isCurrentlyPlaying ? '#059669' : '#0D9488') : '#64748B',
                    background: isSelected ? (isCurrentlyPlaying ? '#ECFDF5' : '#F0FDFA') : '#F8FAFC',
                    border: isSelected ? (isCurrentlyPlaying ? '1.5px solid #10B981' : '1.5px solid #14B8A6') : '1px solid #E2E8F0',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 1px 4px rgba(16, 185, 129, 0.15)' : 'none',
                  }}
                  title={`${t.label} - ${t.desc}`}
                >
                  {isCurrentlyPlaying ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', height: '10px' }}>
                      <motion.span
                        animate={{ height: ['3px', '10px', '3px'] }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ width: '2px', backgroundColor: '#059669', borderRadius: '1px', display: 'inline-block' }}
                      />
                      <motion.span
                        animate={{ height: ['9px', '3px', '9px'] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                        style={{ width: '2px', backgroundColor: '#059669', borderRadius: '1px', display: 'inline-block' }}
                      />
                      <motion.span
                        animate={{ height: ['3px', '11px', '4px'] }}
                        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                        style={{ width: '2px', backgroundColor: '#059669', borderRadius: '1px', display: 'inline-block' }}
                      />
                    </span>
                  ) : null}
                  <span>{t.frequency}</span>
                </button>
              );
            })}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!breathActive ? (
              <button
                type="button"
                onClick={startBreathwork}
                aria-label={breathCompletedToday ? 'Practice 60-second mindful HRV reset again' : 'Begin 60-second mindful HRV reset with vibrational music'}
                style={{
                  padding: '9px 18px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Play size={14} fill="#FFFFFF" /> {breathCompletedToday ? 'Practice Again' : 'Begin 60s Reset'}
              </button>
            ) : (
              <button
                type="button"
                onClick={resetBreathwork}
                aria-label="Stop 60-second mindful HRV session"
                style={{
                  padding: '9px 16px',
                  borderRadius: '12px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  border: '1px solid #FCA5A5',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <Square size={13} fill="#DC2626" /> Stop Session
              </button>
            )}

            {/* Quick Audio Mute Toggle */}
            <button
              type="button"
              onClick={toggleMute}
              aria-label={isSoundMuted ? 'Unmute vibrational frequency audio' : 'Mute vibrational frequency audio'}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '11px',
                border: isSoundMuted ? '1px solid #FCA5A5' : '1px solid #E2E8F0',
                background: isSoundMuted ? '#FEF2F2' : '#F8FAFC',
                color: isSoundMuted ? '#DC2626' : '#475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title={isSoundMuted ? 'Unmute vibrational frequency audio' : 'Mute vibrational frequency audio'}
            >
              {isSoundMuted ? <VolumeX size={15} color="#DC2626" /> : <Volume2 size={15} color="#059669" />}
              <span>{isSoundMuted ? 'Muted' : 'Sound On'}</span>
            </button>

            {breathActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', padding: '6px 12px', borderRadius: '10px', border: '1px solid #A7F3D0' }}>
                <Activity size={13} color="#059669" />
                <span style={{ fontSize: '12px', color: '#065F46', fontWeight: 700 }}>
                  Cycle {cycleCount + 1} of 3
                </span>
              </div>
            )}

            {breathCompletedToday && !breathActive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '12.5px', fontWeight: 700 }}>
                <CheckCircle2 size={15} /> Completed Today
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
            minWidth: isMobile ? '100%' : '110px',
            padding: isMobile ? '6px 0 0' : '0',
          }}
        >
          <div
            style={{
              width: '90px',
              height: '90px',
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
                    ? [1, 1.35, 1.25]
                    : [1.25, 0.85, 0.9]
                  : [1, 1.08, 1],
                opacity: breathActive ? [0.25, 0.5, 0.3] : 0.2,
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
                background: 'radial-gradient(circle, rgba(52, 211, 153, 0.35) 0%, rgba(167, 139, 250, 0.15) 70%, transparent 100%)',
              }}
            />

            {/* Main Interactive Core Orb Button */}
            <motion.button
              type="button"
              onClick={breathActive ? resetBreathwork : startBreathwork}
              whileHover={{ scale: breathActive ? 1.05 : 1.06 }}
              whileTap={{ scale: 0.95 }}
              animate={{
                scale: breathActive
                  ? breathPhase === 'Inhale'
                    ? 1.2
                    : breathPhase === 'Exhale'
                    ? 0.85
                    : breathPhase === 'Hold'
                    ? 1.2
                    : 0.85
                  : 1,
              }}
              transition={{ duration: breathActive ? 4 : 0.2, ease: 'easeInOut' }}
              title={breathActive ? 'Click to stop / reset' : 'Click to begin 60s HRV reset'}
              aria-label={breathActive ? `Current phase: ${breathPhase}, ${secondsRemaining} seconds remaining. Tap to stop.` : 'Tap calm breathing orb to begin 60-second mindful HRV reset with vibrational music'}
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: breathActive
                  ? breathPhase === 'Inhale'
                    ? 'radial-gradient(circle, #34D399 0%, #059669 90%)'
                    : breathPhase === 'Hold'
                    ? 'radial-gradient(circle, #60A5FA 0%, #2563EB 90%)'
                    : breathPhase === 'Exhale'
                    ? 'radial-gradient(circle, #C084FC 0%, #7C3AED 90%)'
                    : 'radial-gradient(circle, #38BDF8 0%, #0284C7 90%)'
                  : 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                boxShadow: breathActive
                  ? '0 0 28px rgba(52, 211, 153, 0.5), inset 0 1px 0 rgba(255,255,255,0.85)'
                  : '0 2px 10px rgba(5, 150, 105, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: breathActive ? '#FFFFFF' : '#059669',
                textAlign: 'center',
                border: breathActive ? '2px solid rgba(255, 255, 255, 0.6)' : '1.5px solid #A7F3D0',
                zIndex: 2,
                cursor: 'pointer',
                outline: 'none',
                padding: 0,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: '10.5px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {breathActive ? breathPhase : 'Calm'}
              </span>
              {breathActive ? (
                <span 
                  className="tabular-nums"
                  style={{ 
                    fontSize: '15px', 
                    fontWeight: 900, 
                    marginTop: '1px', 
                    lineHeight: 1,
                    fontVariantNumeric: 'tabular-nums',
                    fontFeatureSettings: '"tnum" 1',
                    letterSpacing: '0.02em'
                  }}
                >
                  {secondsRemaining}s
                </span>
              ) : (
                <Heart size={14} style={{ marginTop: '2px' }} fill="#059669" color="#059669" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Progressive Clinical Disclosure */}
      <AnimatePresence>
        {showScienceRationale && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            style={{
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(16px)',
              borderRadius: '16px',
              padding: '12px 16px',
              border: '1px solid rgba(16, 185, 129, 0.28)',
              boxShadow: '0 4px 16px rgba(5, 150, 105, 0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span className="micro-badge" style={{ color: '#047857', letterSpacing: '0.08em' }}>
                Clinical Baroreflex Science
              </span>
              <span className="tabular-nums micro-badge" style={{ color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '6px' }}>
                0.1 Hz RSA Resonance
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#334155', margin: 0, lineHeight: 1.45, fontWeight: 500 }}>
              <strong>Vagal Nerve & Autonomic Tone:</strong> 4-4-4 resonant box breathing synchronizes pulmonary stretch receptor input with aortic baroreceptors. This slow pacing stimulates cholinergic efferent vagal nerve firing, accelerating acetylcholine release at the sinoatrial node to lower resting blood pressure, expand High-Frequency HRV (RMSSD), and extinguish acute adrenergic fight-or-flight signaling within 60 seconds.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

