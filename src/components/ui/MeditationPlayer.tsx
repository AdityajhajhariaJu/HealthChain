import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastProvider';
import { 
  Pause, 
  Play, 
  SkipBack, 
  SkipForward, 
  ListMusic, 
  Volume2, 
  VolumeX, 
  X, 
  Clock, 
  Wind,
  Check 
} from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessContent, FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import Confetti from 'react-confetti';
import { 
  MEDITATION_TRACKS, 
  DEEP_SLEEP_TRACKS, 
  DEEP_FOCUS_TRACKS, 
  HAPPY_HIGH_ENERGY_TRACKS, 
  FOCUS_FREQUENCIES_TRACKS, 
  FOREST_AMBIENCE_TRACKS, 
  RAIN_SOUNDS_TRACKS 
} from '../../data/MeditationTracks';

interface MeditationPlayerProps {
  content: FitnessContent | null;
  onClose: () => void;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({ content, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const toast = useToast();
  const [timeRemaining, setTimeRemaining] = useState((content?.duration_minutes || 5) * 60);
  const [phase, setPhase] = useState<"Prepare" | "Inhale" | "Hold" | "Exhale" | "Rest">("Prepare");
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState(3);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [enableBreathingGuide, setEnableBreathingGuide] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);

  const isPlaylistMode = content?.id === 'm1' || content?.id === 'mood-0' || content?.id === 'mood-1' || content?.id === 'mood-2' || content?.id === 'soundscape-0' || content?.id === 'soundscape-1' || content?.id === 'soundscape-2';
  const playlistTitle = content?.id === 'm1' ? 'Full Meditation' : content?.id === 'mood-0' ? 'Deep Sleep Environment' : content?.id === 'mood-1' ? 'Deep Focus Environment' : content?.id === 'mood-2' ? 'Morning Energy Environment' : content?.id === 'soundscape-0' ? 'Rain Sounds' : content?.id === 'soundscape-1' ? 'Focus Frequencies' : content?.id === 'soundscape-2' ? 'Forest Ambience' : 'Curated Playlist';
  const currentPlaylist = content?.id === 'm1' ? MEDITATION_TRACKS : content?.id === 'mood-0' ? DEEP_SLEEP_TRACKS : content?.id === 'mood-1' ? DEEP_FOCUS_TRACKS : content?.id === 'mood-2' ? HAPPY_HIGH_ENERGY_TRACKS : content?.id === 'soundscape-0' ? RAIN_SOUNDS_TRACKS : content?.id === 'soundscape-1' ? FOCUS_FREQUENCIES_TRACKS : content?.id === 'soundscape-2' ? FOREST_AMBIENCE_TRACKS : [];

  const currentTrack = isPlaylistMode && currentPlaylist.length > 0 ? currentPlaylist[activeTrackIndex] : null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (isPlaying) {
        audioRef.current.play().catch(e => console.log('Audio play error:', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeTrackIndex, content, isMuted]);

  
  const pattern = content?.breathwork_pattern || { inhale: 4, hold: 4, exhale: 4, rest: 0 };
  const totalDuration = (content?.duration_minutes || 5) * 60;

  useEffect(() => {
    if (content) {
      setTimeRemaining(totalDuration);
      setIsPlaying(true);
      setIsCompleted(false);
      setPhase("Prepare");
    }
  }, [content, totalDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // Auto-hide controls when playing
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        if (!showPlaylist) setShowControls(false);
      }, 4500);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [isPlaying, showPlaylist]);

  // Session Countdown Timer
  useEffect(() => {
    if (!isPlaying || isCompleted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isCompleted, timeRemaining]);

  useEffect(() => {
    if (timeRemaining === 0 && isPlaying && !isCompleted) {
      handleComplete();
    }
  }, [timeRemaining, isPlaying, isCompleted]);

  // Breathwork Guidance State Machine with Per-Second Countdown
  useEffect(() => {
    if (!isPlaying || isCompleted || !enableBreathingGuide) return;

    let targetDuration = 3;
    if (phase === 'Prepare') targetDuration = 3;
    else if (phase === 'Inhale') targetDuration = pattern.inhale;
    else if (phase === 'Hold') targetDuration = pattern.hold;
    else if (phase === 'Exhale') targetDuration = pattern.exhale;
    else if (phase === 'Rest') targetDuration = pattern.rest || 2;

    setPhaseSecondsLeft(targetDuration);

    const secondInterval = setInterval(() => {
      setPhaseSecondsLeft((prev) => Math.max(1, prev - 1));
    }, 1000);

    const phaseTimer = setTimeout(() => {
      triggerHapticLight();
      setPhase((current) => {
        switch (current) {
          case 'Prepare': return 'Inhale';
          case 'Inhale': return pattern.hold > 0 ? 'Hold' : 'Exhale';
          case 'Hold': return 'Exhale';
          case 'Exhale': return pattern.rest > 0 ? 'Rest' : 'Inhale';
          case 'Rest': return 'Inhale';
          default: return 'Inhale';
        }
      });
    }, targetDuration * 1000);

    return () => {
      clearInterval(secondInterval);
      clearTimeout(phaseTimer);
    };
  }, [isPlaying, phase, pattern, isCompleted, enableBreathingGuide]);

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

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleTrackEnded = () => {
    if (isPlaylistMode && currentPlaylist.length > 0) {
      setActiveTrackIndex((prev) => (prev < currentPlaylist.length - 1 ? prev + 1 : 0));
    }
  };

  return createPortal(
    <AnimatePresence>
      {content && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#050811',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
          onClick={resetControlsTimeout}
        >
          {isCompleted ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ 
                zIndex: 10, 
                textAlign: 'center', 
                color: 'white', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                padding: '24px'
              }}
            >
              <Confetti width={window.innerWidth} height={window.innerHeight} recycle={false} colors={['#10B981', '#38BDF8', '#FFFFFF']} />
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                boxShadow: '0 0 30px rgba(16, 185, 129, 0.25)'
              }}>
                <Check size={40} color="#10B981" />
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>Mindful Session Complete</h2>
              <p style={{ color: 'rgba(255, 255, 255, 0.75)', margin: '0 0 32px', fontSize: '15px' }}>
                Your mindful state has been preserved and vitality logged.
              </p>
              <button 
                onClick={onClose}
                style={{ 
                  padding: '16px 40px', 
                  borderRadius: '30px', 
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #E2E8F0 100%)', 
                  color: '#0F172A', 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
                }}
              >
                Return to Calm Space
              </button>
            </motion.div>
          ) : (
            <>
              {/* Cinematic Ambient Background Layer */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
                <motion.img 
                  key={isPlaylistMode && currentTrack ? currentTrack.id : content.id}
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{ scale: [1, 1.06, 1], opacity: 0.65 }}
                  transition={{ 
                    scale: { duration: 35, repeat: Infinity, ease: 'easeInOut' },
                    opacity: { duration: 0.8 }
                  }}
                  src={isPlaylistMode && currentTrack ? currentTrack.cover : (content.cover_image_url || 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1200&q=80')} 
                  alt="Atmosphere"  
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {/* Luxury Multi-Stage Vignette Gradients */}
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'radial-gradient(circle at center, rgba(5, 8, 17, 0.2) 0%, rgba(5, 8, 17, 0.75) 75%, rgba(5, 8, 17, 0.95) 100%)' 
                }} />
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'linear-gradient(to bottom, rgba(5, 8, 17, 0.7) 0%, transparent 25%, transparent 65%, rgba(5, 8, 17, 0.95) 100%)' 
                }} />
                <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }} />
              </div>

              {/* Hidden Native Audio Element */}
              {isPlaylistMode && currentTrack && (
                <audio 
                  ref={audioRef} 
                  src={currentTrack.audioUrl} 
                  autoPlay={isPlaying}
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      setCurrentTime(audioRef.current.currentTime);
                      if (!isNaN(audioRef.current.duration) && audioRef.current.duration > 0) {
                        setDuration(audioRef.current.duration);
                      }
                    }
                  }}
                  onLoadedMetadata={() => {
                    if (audioRef.current && !isNaN(audioRef.current.duration)) {
                      setDuration(audioRef.current.duration);
                    }
                  }}
                  onEnded={handleTrackEnded}
                />
              )}

              {/* Top Navigation Bar */}
              <AnimatePresence>
                {showControls && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.25 }}
                    style={{ 
                      position: 'absolute', 
                      top: 0, 
                      left: 0, 
                      right: 0, 
                      padding: 'calc(env(safe-area-inset-top, 24px) + 16px) 20px 16px', 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      zIndex: 30 
                    }}
                  >
                    {/* Frosted Close Pill */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticLight();
                        onClose();
                      }}
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        borderRadius: '50%', 
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.05) 100%)', 
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.3)', 
                        color: 'white',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                      }}
                      aria-label="Close Player"
                    >
                      <X size={20} />
                    </button>

                    {/* Environment / Track Info Pill */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      letterSpacing: '-0.2px'
                    }}>
                      <span style={{ color: '#38BDF8', display: 'flex', alignItems: 'center' }}>
                        <Wind size={14} style={{ marginRight: '4px' }} />
                        {playlistTitle}
                      </span>
                      {isPlaylistMode && currentPlaylist.length > 0 && (
                        <span style={{ opacity: 0.6 }}>• {activeTrackIndex + 1}/{currentPlaylist.length}</span>
                      )}
                    </div>

                    {/* Session Remaining Countdown Pill */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600
                    }}>
                      <Clock size={14} style={{ opacity: 0.7 }} />
                      <span>{formatTime(timeRemaining)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Centerpiece: Sacred Breathing Mandala & Guidance */}
              <div style={{ 
                flex: 1, 
                position: 'relative', 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                justifyContent: 'center', 
                zIndex: 10,
                padding: '0 24px'
              }}>
                {/* Pulsing Ethereal Radial Rings */}
                <div style={{ position: 'relative', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <motion.div
                    animate={{ 
                      scale: !isPlaying ? 1 : 
                             phase === 'Inhale' ? 1.65 : 
                             phase === 'Hold' ? 1.65 : 
                             phase === 'Exhale' ? 0.95 : 1,
                      opacity: isPlaying ? [0.4, 0.8, 0.4] : 0.3
                    }}
                    transition={{ 
                      duration: phase === 'Inhale' ? pattern.inhale : phase === 'Exhale' ? pattern.exhale : (pattern.hold || 3), 
                      ease: 'easeInOut'
                    }}
                    style={{ 
                      position: 'absolute', 
                      inset: '-20px', 
                      borderRadius: '50%',
                      background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(56, 189, 248, 0) 70%)',
                      filter: 'blur(24px)',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Concentric Glass Halo Rings */}
                  <motion.div
                    animate={{ 
                      scale: !isPlaying ? 1 : 
                             phase === 'Inhale' ? 1.5 : 
                             phase === 'Hold' ? [1.5, 1.53, 1.5] : 
                             phase === 'Exhale' ? 0.9 : 1
                    }}
                    transition={{ 
                      duration: phase === 'Inhale' ? pattern.inhale : phase === 'Exhale' ? pattern.exhale : (pattern.hold || 3), 
                      ease: 'easeInOut',
                      repeat: phase === 'Hold' && isPlaying ? Infinity : 0
                    }}
                    style={{ 
                      position: 'absolute', 
                      inset: 0, 
                      borderRadius: '50%', 
                      border: '1.5px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: '0 0 40px rgba(56, 189, 248, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.1)'
                    }}
                  />

                  <motion.div
                    animate={{ 
                      scale: !isPlaying ? 1 : 
                             phase === 'Inhale' ? 1.25 : 
                             phase === 'Hold' ? 1.25 : 
                             phase === 'Exhale' ? 0.85 : 1
                    }}
                    transition={{ 
                      duration: phase === 'Inhale' ? pattern.inhale : phase === 'Exhale' ? pattern.exhale : (pattern.hold || 3), 
                      ease: 'easeInOut'
                    }}
                    style={{ 
                      position: 'absolute', 
                      inset: '30px', 
                      borderRadius: '50%', 
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      background: 'radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.02) 100%)'
                    }}
                  />

                  {/* Inner Breathing Core with Text */}
                  <motion.div
                    style={{
                      width: '130px',
                      height: '130px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.08) 100%)',
                      backdropFilter: 'blur(32px)',
                      WebkitBackdropFilter: 'blur(32px)',
                      border: '1px solid rgba(255, 255, 255, 0.6)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.7)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      zIndex: 2,
                      cursor: 'pointer'
                    }}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnableBreathingGuide(!enableBreathingGuide);
                      triggerHapticLight();
                    }}
                  >
                    <span style={{ 
                      fontSize: '18px', 
                      fontWeight: 700, 
                      color: '#FFFFFF',
                      letterSpacing: '-0.3px',
                      textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                    }}>
                      {enableBreathingGuide ? phase : 'Listening'}
                    </span>
                    {enableBreathingGuide && isPlaying && (
                      <span style={{ 
                        fontSize: '13px', 
                        color: '#38BDF8', 
                        fontWeight: 600,
                        marginTop: '2px'
                      }}>
                        {phaseSecondsLeft}s
                      </span>
                    )}
                  </motion.div>
                </div>

                {/* Rhythmic Affirmation / Breathing Instruction */}
                <div style={{ marginTop: '36px', textAlign: 'center', maxWidth: '300px' }}>
                  <motion.p
                    key={phase}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{ 
                      margin: 0, 
                      fontSize: '15px', 
                      fontWeight: 500, 
                      color: 'rgba(255, 255, 255, 0.85)', 
                      letterSpacing: '-0.2px',
                      textShadow: '0 2px 10px rgba(0,0,0,0.6)'
                    }}
                  >
                    {enableBreathingGuide ? (
                      phase === 'Prepare' ? 'Settle in and relax your shoulders...' :
                      phase === 'Inhale' ? 'Breathe in slowly through your nose...' :
                      phase === 'Hold' ? 'Hold softly, suspended in stillness...' :
                      phase === 'Exhale' ? 'Gently release all tension and breath...' :
                      'Rest peacefully before the next rhythm...'
                    ) : (
                      'Immerse in ambient frequency flow...'
                    )}
                  </motion.p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnableBreathingGuide(!enableBreathingGuide);
                      triggerHapticLight();
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '12px',
                      marginTop: '8px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    {enableBreathingGuide ? 'Switch to Soundscape Only' : 'Enable Guided Breathing'}
                  </button>
                </div>
              </div>

              {/* Bottom Ultra-Sheer Glass Control Island */}
              <AnimatePresence>
                {showControls && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.25 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                      position: 'absolute', 
                      bottom: 'calc(env(safe-area-inset-bottom, 24px) + 12px)', 
                      left: '16px', 
                      right: '16px', 
                      zIndex: 30,
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 100%)',
                      backdropFilter: 'blur(32px)',
                      WebkitBackdropFilter: 'blur(32px)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                      borderRadius: '28px',
                      padding: '20px 20px 16px'
                    }}
                  >
                    {/* Track Title & Artist Info */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '17px', 
                          fontWeight: 700, 
                          color: '#FFFFFF', 
                          letterSpacing: '-0.3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {isPlaylistMode && currentTrack ? currentTrack.title : content.title}
                        </h3>
                        <p style={{ 
                          margin: '2px 0 0', 
                          fontSize: '13px', 
                          color: 'rgba(255, 255, 255, 0.7)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {isPlaylistMode && currentTrack ? currentTrack.subtitle : content.description}
                        </p>
                      </div>

                      {/* Mute Toggle */}
                      <button
                        onClick={() => {
                          setIsMuted(!isMuted);
                          triggerHapticLight();
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '50%',
                          width: '36px',
                          height: '36px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      </button>
                    </div>

                    {/* Audio Progress Scrubber */}
                    {isPlaylistMode && duration > 0 && (
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', minWidth: '32px' }}>
                            {formatTime(currentTime)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={handleSeek}
                            style={{
                              flex: 1,
                              accentColor: '#38BDF8',
                              height: '4px',
                              cursor: 'pointer'
                            }}
                          />
                          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', minWidth: '32px', textAlign: 'right' }}>
                            {formatTime(duration)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Primary Playback Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {/* Tracks Drawer Trigger */}
                      {isPlaylistMode && currentPlaylist.length > 0 ? (
                        <button
                          onClick={() => {
                            triggerHapticLight();
                            setShowPlaylist(true);
                          }}
                          style={{
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '16px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <ListMusic size={16} color="#38BDF8" />
                          <span>Tracks ({currentPlaylist.length})</span>
                        </button>
                      ) : (
                        <div style={{ width: '80px' }} />
                      )}

                      {/* Center Controls: Prev / Play / Next */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <button
                          onClick={() => {
                            triggerHapticLight();
                            if (isPlaylistMode && currentPlaylist.length > 0) {
                              setActiveTrackIndex((prev) => (prev > 0 ? prev - 1 : currentPlaylist.length - 1));
                            } else {
                              setTimeRemaining((prev) => Math.min(totalDuration, prev + 15));
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.85)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px'
                          }}
                          aria-label="Previous Track"
                        >
                          <SkipBack size={24} />
                        </button>

                        {/* Luxury Glass Play Button */}
                        <button
                          onClick={() => {
                            triggerHapticLight();
                            setIsPlaying(!isPlaying);
                          }}
                          style={{
                            width: '58px',
                            height: '58px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 249, 255, 0.8) 100%)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.9)'
                          }}
                          aria-label={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? (
                            <Pause size={24} color="#0F172A" fill="#0F172A" />
                          ) : (
                            <Play size={24} color="#0F172A" fill="#0F172A" style={{ marginLeft: '2px' }} />
                          )}
                        </button>

                        <button
                          onClick={() => {
                            triggerHapticLight();
                            if (isPlaylistMode && currentPlaylist.length > 0) {
                              setActiveTrackIndex((prev) => (prev < currentPlaylist.length - 1 ? prev + 1 : 0));
                            } else {
                              setTimeRemaining((prev) => Math.max(0, prev - 15));
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.85)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px'
                          }}
                          aria-label="Next Track"
                        >
                          <SkipForward size={24} />
                        </button>
                      </div>

                      <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 500 }}>
                          {isPlaylistMode ? 'Auto-loop' : 'Guided'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Slide-up Ultra-Sheer Glass Playlist Drawer */}
              <AnimatePresence>
                {showPlaylist && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowPlaylist(false)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 40
                      }}
                    />

                    {/* Drawer Content */}
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        maxHeight: '75vh',
                        background: 'linear-gradient(135deg, rgba(20, 27, 45, 0.85) 0%, rgba(10, 15, 30, 0.95) 100%)',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 -20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        borderTopLeftRadius: '28px',
                        borderTopRightRadius: '28px',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 50,
                        overflow: 'hidden'
                      }}
                    >
                      {/* Pull Bar */}
                      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
                        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.3)' }} />
                      </div>

                      {/* Drawer Header */}
                      <div style={{
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'white' }}>
                            {playlistTitle}
                          </h4>
                          <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                            {currentPlaylist.length} curated soundscapes
                          </span>
                        </div>
                        <button
                          onClick={() => setShowPlaylist(false)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={18} />
                        </button>
                      </div>

                      {/* Track List */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 32px' }}>
                        {currentPlaylist.map((track, idx) => {
                          const isActive = activeTrackIndex === idx;
                          return (
                            <div
                              key={track.id}
                              onClick={() => {
                                setActiveTrackIndex(idx);
                                setIsPlaying(true);
                                setShowPlaylist(false);
                                triggerHapticLight();
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '12px',
                                borderRadius: '16px',
                                background: isActive ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                                border: isActive ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid transparent',
                                cursor: 'pointer',
                                marginBottom: '6px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <img
                                src={track.cover}
                                alt={track.title}
                                style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
                              />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  color: isActive ? '#38BDF8' : 'white',
                                  fontSize: '15px',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {track.title}
                                </div>
                                <div style={{
                                  color: 'rgba(255, 255, 255, 0.6)',
                                  fontSize: '12px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginTop: '2px'
                                }}>
                                  {track.subtitle}
                                </div>
                              </div>
                              {isActive && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', paddingLeft: '8px' }}>
                                  <motion.span
                                    animate={{ height: ['4px', '14px', '4px'] }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ width: '3px', background: '#38BDF8', borderRadius: '2px' }}
                                  />
                                  <motion.span
                                    animate={{ height: ['12px', '4px', '12px'] }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                                    style={{ width: '3px', background: '#38BDF8', borderRadius: '2px' }}
                                  />
                                  <motion.span
                                    animate={{ height: ['6px', '16px', '6px'] }}
                                    transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                                    style={{ width: '3px', background: '#38BDF8', borderRadius: '2px' }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};


