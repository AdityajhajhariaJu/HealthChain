import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastProvider';
import { ChevronDown, Pause, Play, FastForward, CheckCircle } from 'lucide-react';
import { triggerHapticLight, triggerHapticMedium } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessContent, FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import Confetti from 'react-confetti';

interface WorkoutPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  workout: any; // Using any to merge FitnessContent with steps for now
}

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({ isOpen, onClose, workout }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const toast = useToast();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  

  // Reset state when opening a new workout
  useEffect(() => {
    if (isOpen && workout) {
      setCurrentStepIndex(0);
      setTimeRemaining(workout.steps?.[0]?.duration || 60);
      setIsPlaying(true);
      setIsCompleted(false);
    }
  }, [isOpen, workout]);

    // Step Timer
  useEffect(() => {
    if (!isPlaying || isCompleted || !isOpen) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isCompleted, isOpen, currentStepIndex]);

  // Handle Step Transition
  useEffect(() => {
    if (timeRemaining === 0 && isPlaying && !isCompleted && isOpen) {
      handleNextStep();
    }
  }, [timeRemaining, isPlaying, isCompleted, isOpen]);

  const handleNextStep = () => {
    triggerHapticMedium();
    if (currentStepIndex < (workout?.steps?.length || 0) - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setTimeRemaining(workout.steps[nextIdx].duration || 60);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsCompleted(true);
    setIsPlaying(false);
    triggerHapticMedium();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && workout?.id) {
      try {
        await FitnessService.completeWorkoutSession(
          session.user.id, 
          workout.id, 
          workout.duration_minutes ? workout.duration_minutes * 60 : 600, 
          workout.calories_estimate || 0
        );
      } catch (err) {
        console.error("Failed to log session", err);
      }
    }
  };

  if (!isOpen || !workout) return null;

  const currentStep = workout.steps?.[currentStepIndex];
  const progressPercent = currentStep?.duration 
    ? ((currentStep.duration - timeRemaining) / currentStep.duration) * 100 
    : 0;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: '#000',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif',
          overflow: 'hidden'
        }}
      >
        {isCompleted ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A', color: 'white', padding: '24px', textAlign: 'center' }}>
            <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} />
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                <CheckCircle size={48} color="white" />
              </div>
            </motion.div>
            <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 16px' }}>Workout Complete!</h2>
            <p style={{ fontSize: '18px', color: '#94A3B8', marginBottom: '40px', maxWidth: '300px' }}>
              Awesome job! You've crushed the {workout.title} routine.
            </p>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '48px' }}>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px' }}>
                <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '4px' }}>Time</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{workout.duration_minutes || '--'}m</div>
              </div>
              <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '16px 24px', borderRadius: '16px' }}>
                <div style={{ fontSize: '14px', color: '#94A3B8', marginBottom: '4px' }}>Calories</div>
                <div style={{ fontSize: '24px', fontWeight: 700 }}>{workout.calories_estimate || '--'}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ padding: '18px 48px', backgroundColor: 'white', color: '#0F172A', borderRadius: '9999px', fontWeight: 800, fontSize: '18px', border: 'none', cursor: 'pointer', width: '100%' }}
            >
              Finish
            </button>
          </div>
        ) : (
          <>
            {/* Visual Background layer */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              {workout.video_url ? (
                <video 
                  src={workout.video_url} 
                  autoPlay 
                  playsInline 
                  loop 
                  muted={!isPlaying}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} 
                />
              ) : (
                <img 
                  src={currentStep?.image || workout.cover_image_url || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'} 
                  alt="Exercise"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.8) 100%)' }} />
            </div>

            {/* Top Bar */}
            <div style={{ position: 'relative', zIndex: 10, padding: 'env(safe-area-inset-top, 44px) 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <button 
                onClick={onClose}
                style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <ChevronDown size={24} color="white" />
              </button>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  {workout.title}
                </div>
                <div style={{ color: 'white', fontSize: '14px', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.4)', padding: '4px 12px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                  Step {currentStepIndex + 1} / {workout.steps?.length || 1}
                </div>
              </div>
              <div style={{ width: '40px' }} />
            </div>

            {/* Central Information */}
            <div style={{ flex: 1, position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 24px 40px' }}>
              <motion.div 
                key={currentStepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ marginBottom: '32px' }}
              >
                <h2 style={{ color: 'white', fontSize: '40px', fontWeight: 800, margin: '0 0 8px', lineHeight: 1.1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                  {currentStep?.name || 'Workout Step'}
                </h2>
                <div style={{ color: '#10B981', fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Up Next: {workout.steps?.[currentStepIndex + 1]?.name || 'Finish'}
                </div>
              </motion.div>

              {/* Controls & Timer Row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ position: 'relative', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="80" height="80" viewBox="0 0 80 80" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#10B981" strokeWidth="6" strokeDasharray="226.19" strokeDashoffset={226.19 - (226.19 * progressPercent / 100)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                  </svg>
                  <div style={{ color: 'white', fontSize: '24px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <button
                    onClick={() => { setIsPlaying(!isPlaying); triggerHapticLight(); }}
                    style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}
                  >
                    {isPlaying ? <Pause size={28} color="#0F172A" /> : <Play size={28} color="#0F172A" style={{ marginLeft: '4px' }} />}
                  </button>
                  <button 
                    onClick={handleNextStep}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <FastForward size={20} color="white" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};


