import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ChevronDown, Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { FitnessContent, FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import Confetti from 'react-confetti';

interface MeditationPlayerProps {
  content: FitnessContent | null;
  onClose: () => void;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({ content, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [phase, setPhase] = useState<'Prepare' | 'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Prepare');
  const [isCompleted, setIsCompleted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  
  const pattern = content?.breathwork_pattern || { inhale: 4, hold: 4, exhale: 4, rest: 0 };
  const totalDuration = (content?.duration_minutes || 5) * 60;

  useEffect(() => {
    if (content) {
      setTimeRemaining(totalDuration);
      setIsPlaying(true);
      setIsCompleted(false);
      setPhase('Prepare');
    }
  }, [content, totalDuration]);

    // Timer Countdown
  useEffect(() => {
    if (!isPlaying || isCompleted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isCompleted]); // Removed timeRemaining from deps to prevent re-creation every second

  useEffect(() => {
    if (timeRemaining === 0 && isPlaying && !isCompleted) {
      handleComplete();
    }
  }, [timeRemaining, isPlaying, isCompleted]);

  // Breathing Phase Logic
  useEffect(() => {
    if (!isPlaying || isCompleted) return;
    
    // Auto-hide controls after 3 seconds of playing
    const hideTimer = setTimeout(() => setShowControls(false), 3000);

    let timeoutId: NodeJS.Timeout;
    
    const nextPhase = () => {
      triggerHapticLight();
      setPhase(current => {
        switch (current) {
          case 'Prepare': return 'Inhale';
          case 'Inhale': return pattern.hold > 0 ? 'Hold' : 'Exhale';
          case 'Hold': return 'Exhale';
          case 'Exhale': return pattern.rest > 0 ? 'Rest' : 'Inhale';
          case 'Rest': return 'Inhale';
          default: return 'Inhale';
        }
      });
    };

    const getPhaseDuration = (p: string) => {
      if (p === 'Prepare') return 3000;
      if (p === 'Inhale') return pattern.inhale * 1000;
      if (p === 'Hold') return pattern.hold * 1000;
      if (p === 'Exhale') return pattern.exhale * 1000;
      if (p === 'Rest') return pattern.rest * 1000;
      return 4000;
    };

    timeoutId = setTimeout(nextPhase, getPhaseDuration(phase));

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(hideTimer);
    };
  }, [isPlaying, phase, pattern, isCompleted]);

  const handleComplete = async () => {
    setIsCompleted(true);
    setIsPlaying(false);
    triggerHapticLight();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && content) {
      try {
        await FitnessService.completeWorkoutSession(
          session.user.id, 
          content.id, 
          totalDuration, 
          content.calories_estimate || 0
        );
      } catch (err) {
        console.error("Failed to log session", err);
      }
    }
  };

  if (!content) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getRingScale = () => {
    if (phase === 'Prepare') return 0.8;
    if (phase === 'Inhale') return 1.5;
    if (phase === 'Hold') return 1.5;
    if (phase === 'Exhale') return 0.8;
    if (phase === 'Rest') return 0.8;
    return 1;
  };

  const getRingTransition = () => {
    if (phase === 'Inhale') return { duration: pattern.inhale, ease: "linear" as any };
    if (phase === 'Exhale') return { duration: pattern.exhale, ease: "linear" as any };
    return { duration: 0.5 };
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        onClick={() => setShowControls(true)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          fontFamily: 'sans-serif'
        }}
      >
        {/* Ken Burns Background */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -20,
            backgroundImage: `url(${content.cover_image_url || 'https://images.unsplash.com/photo-1518085250985-78e7bbdf6a62?auto=format&fit=crop&q=80'})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.6,
            filter: 'brightness(0.7) blur(2px)'
          }}
        />

        {/* Top Bar */}
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'env(safe-area-inset-top, 24px) 24px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}
            >
              <button 
                onClick={onClose}
                style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ChevronDown size={24} color="white" />
              </button>
              <div style={{ color: 'white', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {content.title}
              </div>
              <div style={{ width: '40px' }} /> {/* Spacer */}
            </motion.div>
          )}
        </AnimatePresence>

        {isCompleted ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ zIndex: 10, textAlign: 'center', color: 'white' }}
          >
            <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} colors={['#10B981', '#34D399', '#A7F3D0', '#ffffff']} />
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '2px solid #10B981' }}>
              <Play size={32} color="#10B981" />
            </div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px' }}>Session Complete</h2>
            <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', marginBottom: '32px' }}>
              You completed {content.duration_minutes} mindful minutes.
            </p>
            <button
              onClick={onClose}
              style={{ padding: '16px 32px', backgroundColor: 'white', color: '#0F172A', borderRadius: '24px', fontWeight: 700, fontSize: '16px', border: 'none', cursor: 'pointer' }}
            >
              Return Home
            </button>
          </motion.div>
        ) : (
          <>
            {/* Cinematic Breathing Rings */}
            <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
              <motion.div
                animate={{ scale: getRingScale() }}
                transition={getRingTransition()}
                style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 0 40px rgba(255,255,255,0.1)' }}
              />
              <motion.div
                animate={{ scale: getRingScale() }}
                transition={getRingTransition()}
                style={{ position: 'absolute', inset: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 0 30px rgba(255,255,255,0.15)' }}
              />
              <motion.div
                animate={{ scale: getRingScale() }}
                transition={getRingTransition()}
                style={{ position: 'absolute', inset: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', boxShadow: '0 0 20px rgba(255,255,255,0.2)' }}
              />
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={phase}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  style={{ color: 'white', fontSize: '24px', fontWeight: 300, letterSpacing: '2px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                >
                  {phase}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  style={{ position: 'absolute', bottom: 'env(safe-area-inset-bottom, 32px)', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', zIndex: 10 }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeRemaining)}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTimeRemaining(p => Math.max(0, p - 15)); triggerHapticLight(); }}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}
                    >
                      <RotateCcw size={28} />
                    </button>
                    
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); triggerHapticLight(); }}
                      style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}
                    >
                      {isPlaying ? <Pause size={28} color="#0F172A" /> : <Play size={28} color="#0F172A" style={{ marginLeft: '4px' }} />}
                    </button>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setTimeRemaining(p => Math.min(totalDuration, p + 15)); triggerHapticLight(); }}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}
                    >
                      <RotateCw size={28} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};


