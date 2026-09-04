import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Check,
  Moon,
  Layers,
  Sliders,
  Trophy,
  Sparkles,
  Flame
} from 'lucide-react';
import { triggerHapticLight, triggerHapticMedium, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessContent, FitnessService } from '../../services/FitnessService';
import { supabase } from '../../services/supabaseClient';
import { useActionIslandStore } from '../../store/actionIslandStore';
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

export type AtmosphereTheme = 'meditation' | 'sleep' | 'focus' | 'energy' | 'rain' | 'frequency' | 'forest';

// Point 1: Clinical Breathwork Presets
export type BreathModeKey = 'sleep_478' | 'box_4444' | 'hrv_coherent' | 'energize_22';

export interface BreathworkPatternConfig {
  key: BreathModeKey;
  label: string;
  shortName: string;
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
  benefit: string;
}

export const CLINICAL_BREATH_PRESETS: Record<BreathModeKey, BreathworkPatternConfig> = {
  sleep_478: {
    key: 'sleep_478',
    label: '4-7-8 Sleep Method',
    shortName: '4-7-8 Sleep',
    inhale: 4,
    hold: 7,
    exhale: 8,
    rest: 0,
    benefit: 'Vagus nerve stimulation for parasympathetic deep sleep'
  },
  box_4444: {
    key: 'box_4444',
    label: 'Box Breathing (4-4-4-4)',
    shortName: 'Box 4-4',
    inhale: 4,
    hold: 4,
    exhale: 4,
    rest: 4,
    benefit: 'Navy SEAL protocol to balance nervous system & focus'
  },
  hrv_coherent: {
    key: 'hrv_coherent',
    label: 'HRV Resonance (5.5s)',
    shortName: 'HRV 5.5s',
    inhale: 5.5,
    hold: 0,
    exhale: 5.5,
    rest: 0,
    benefit: 'Optimal cardiovascular resonance & baroreflex gain'
  },
  energize_22: {
    key: 'energize_22',
    label: 'Awaken Rhythm (2-2)',
    shortName: 'Awaken 2-2',
    inhale: 2,
    hold: 0,
    exhale: 2,
    rest: 0,
    benefit: 'Rapid cellular oxygenation & morning alertness'
  }
};

// Point 2: Dual-Layer Ambient Soundscape Mixer
export type AmbientLayerKey = 'off' | 'rain' | 'forest' | 'frequency';

export const AMBIENT_LAYERS: Record<AmbientLayerKey, { label: string; icon: string; url: string }> = {
  off: { label: 'None', icon: 'Off', url: '' },
  rain: { label: 'Rain on Glass', icon: '🌧️', url: '/audio/Raindrops on Glass.m4a' },
  forest: { label: 'Whispering Pines', icon: '🍃', url: '/audio/Whispering Pines.m4a' },
  frequency: { label: '432Hz Resonant Drone', icon: '〰️', url: '/audio/432Hz Clarity.m4a' }
};

interface LivingAtmosphereCanvasProps {
  theme: AtmosphereTheme;
  phase: 'Prepare' | 'Inhale' | 'Hold' | 'Exhale' | 'Rest';
  isPlaying: boolean;
}

export const LivingAtmosphereCanvas: React.FC<LivingAtmosphereCanvasProps> = ({
  theme,
  phase,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      baseSize: number;
      alpha: number;
      baseAlpha: number;
      color: string;
      pulseOffset: number;
      length?: number;
    }

    const particles: Particle[] = [];
    const count = theme === 'rain' ? 130 : theme === 'sleep' ? 90 : theme === 'forest' ? 55 : theme === 'frequency' ? 40 : 65;

    let shootingStar: { x: number; y: number; length: number; speed: number; opacity: number; active: boolean } = {
      x: 0,
      y: 0,
      length: 120,
      speed: 16,
      opacity: 0,
      active: false
    };

    const triggerShootingStar = () => {
      if (theme !== 'sleep' || shootingStar.active) return;
      shootingStar = {
        x: Math.random() * width * 0.7,
        y: Math.random() * (height * 0.35),
        length: 80 + Math.random() * 80,
        speed: 12 + Math.random() * 8,
        opacity: 0.9,
        active: true
      };
    };

    const shootingStarInterval = setInterval(() => {
      if (Math.random() > 0.4) triggerShootingStar();
    }, 6500);

    const getThemeColors = () => {
      switch (theme) {
        case 'sleep':
          return ['rgba(226, 232, 255, ', 'rgba(196, 181, 253, ', 'rgba(253, 230, 138, '];
        case 'rain':
          return ['rgba(186, 230, 253, ', 'rgba(147, 197, 253, ', 'rgba(224, 242, 254, '];
        case 'frequency':
          return ['rgba(167, 139, 250, ', 'rgba(56, 189, 248, ', 'rgba(236, 72, 153, '];
        case 'forest':
          return ['rgba(110, 231, 183, ', 'rgba(253, 224, 71, ', 'rgba(52, 211, 153, '];
        case 'energy':
          return ['rgba(253, 224, 71, ', 'rgba(251, 146, 60, ', 'rgba(254, 240, 138, '];
        case 'focus':
          return ['rgba(56, 189, 248, ', 'rgba(125, 211, 252, ', 'rgba(148, 163, 184, '];
        default:
          return ['rgba(56, 189, 248, ', 'rgba(192, 132, 252, ', 'rgba(255, 255, 255, '];
      }
    };

    const colors = getThemeColors();

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      if (theme === 'rain') {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: -1.2 + Math.random() * 0.4,
          vy: 9 + Math.random() * 11,
          size: 1 + Math.random() * 1.5,
          baseSize: 1,
          length: 14 + Math.random() * 20,
          alpha: 0.15 + Math.random() * 0.4,
          baseAlpha: 0.3,
          color,
          pulseOffset: 0
        });
      } else {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35 - (theme === 'energy' || theme === 'forest' ? 0.3 : 0),
          size: 1.5 + Math.random() * 3.5,
          baseSize: 1.5 + Math.random() * 3.5,
          alpha: 0.2 + Math.random() * 0.6,
          baseAlpha: 0.2 + Math.random() * 0.6,
          color,
          pulseOffset: Math.random() * Math.PI * 2
        });
      }
    }

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      let breathScale = 1;
      let breathGlow = 1;
      if (phase === 'Inhale') {
        breathScale = 1.15;
        breathGlow = 1.35;
      } else if (phase === 'Hold') {
        breathScale = 1.18;
        breathGlow = 1.4;
      } else if (phase === 'Exhale') {
        breathScale = 0.92;
        breathGlow = 0.85;
      }

      if (theme === 'rain') {
        for (const p of particles) {
          p.x += p.vx;
          p.y += isPlaying ? p.vy : p.vy * 0.3;

          if (p.y > height) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x < 0) p.x = width;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 3, p.y + (p.length || 15));
          ctx.strokeStyle = `${p.color}${p.alpha})`;
          ctx.lineWidth = p.size;
          ctx.stroke();
        }
      } else if (theme === 'frequency') {
        const cx = width / 2;
        const cy = height / 2;
        const ringCount = 5;

        for (let r = 0; r < ringCount; r++) {
          const ringProgress = (time * 0.35 + r / ringCount) % 1;
          const radius = ringProgress * Math.min(width, height) * 0.48;
          const ringAlpha = (1 - ringProgress) * 0.35 * (isPlaying ? 1 : 0.4);

          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha})`;
          ctx.lineWidth = 1.5 + (1 - ringProgress) * 2;
          ctx.stroke();

          if (r % 2 === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.7, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(167, 139, 250, ${ringAlpha * 0.6})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        for (const p of particles) {
          p.x += p.vx;
          p.y += p.vy;

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          const currentAlpha = (Math.sin(time * 3 + p.pulseOffset) * 0.3 + 0.7) * p.baseAlpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * breathScale, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${currentAlpha * breathGlow})`;
          ctx.shadowBlur = 12;
          ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        if (theme === 'sleep' && shootingStar.active) {
          ctx.beginPath();
          ctx.moveTo(shootingStar.x, shootingStar.y);
          ctx.lineTo(shootingStar.x + shootingStar.length * 0.7, shootingStar.y + shootingStar.length * 0.5);
          ctx.strokeStyle = `rgba(255, 255, 255, ${shootingStar.opacity})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#FFFFFF';
          ctx.stroke();
          ctx.shadowBlur = 0;

          shootingStar.x += shootingStar.speed;
          shootingStar.y += shootingStar.speed * 0.7;
          shootingStar.opacity -= 0.025;

          if (shootingStar.opacity <= 0 || shootingStar.x > width || shootingStar.y > height) {
            shootingStar.active = false;
          }
        }

        if (theme === 'energy') {
          const sunX = width / 2;
          const sunY = -60;
          const beamCount = 6;
          for (let b = 0; b < beamCount; b++) {
            const angle = (Math.PI / 4) + (b / beamCount) * (Math.PI / 2) + Math.sin(time * 0.2 + b) * 0.05;
            const beamLength = Math.max(width, height) * 1.2;
            const targetX = sunX + Math.cos(angle) * beamLength;
            const targetY = sunY + Math.sin(angle) * beamLength;

            const grad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, beamLength);
            grad.addColorStop(0, 'rgba(253, 224, 71, 0.15)');
            grad.addColorStop(0.5, 'rgba(251, 146, 60, 0.05)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            ctx.beginPath();
            ctx.moveTo(sunX, sunY);
            ctx.lineTo(targetX - 80, targetY);
            ctx.lineTo(targetX + 80, targetY);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
          }
        }

        for (const p of particles) {
          if (theme === 'forest') {
            p.x += Math.sin(time + p.pulseOffset) * 0.6;
            p.y -= 0.35 + Math.cos(time + p.pulseOffset) * 0.3;
          } else if (theme === 'energy') {
            p.y -= 0.5;
            p.x += Math.sin(time * 0.8 + p.pulseOffset) * 0.3;
          } else {
            p.x += p.vx;
            p.y += p.vy;
          }

          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;

          const currentAlpha = (Math.sin(time * 2 + p.pulseOffset) * 0.35 + 0.65) * p.baseAlpha;
          const currentSize = p.baseSize * breathScale * (theme === 'forest' ? (Math.sin(time * 3 + p.pulseOffset) * 0.4 + 1.1) : 1);

          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.5, currentSize), 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${currentAlpha * breathGlow})`;
          
          if (theme === 'forest' || theme === 'sleep') {
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color + '0.8)';
          }
          
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        if (theme === 'focus') {
          ctx.lineWidth = 0.5;
          for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
              const dx = particles[i].x - particles[j].x;
              const dy = particles[i].y - particles[j].y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 85) {
                const alpha = (1 - dist / 85) * 0.15 * (isPlaying ? 1 : 0.5);
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
                ctx.stroke();
              }
            }
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      clearInterval(shootingStarInterval);
    };
  }, [theme, phase, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  );
};

interface MeditationPlayerProps {
  content: FitnessContent | null;
  onClose: () => void;
}

export const MeditationPlayer: React.FC<MeditationPlayerProps> = ({ content, onClose }) => {
  const navigate = useNavigate();
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
  const [showSleepTimerSheet, setShowSleepTimerSheet] = useState(false);
  const [sleepTimerOption, setSleepTimerOption] = useState<'off' | '15' | '30' | '45' | '60' | 'end_of_track'>('off');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hideControlsTimer = useRef<NodeJS.Timeout | null>(null);
  const isCrossfading = useRef(false);

  const contentTitleLower = (content?.title || '').toLowerCase();
  const contentTypeLower = (content?.type || '').toLowerCase();

  const isSleep = content?.id === 'mood-0' || contentTypeLower === 'sleep_story' || contentTitleLower.includes('sleep') || contentTitleLower.includes('slumber') || contentTitleLower.includes('lullaby');
  const isRain = content?.id === 'soundscape-0' || contentTitleLower.includes('rain') || contentTitleLower.includes('storm') || contentTitleLower.includes('drizzle');
  const isFrequency = content?.id === 'soundscape-1' || contentTitleLower.includes('frequency') || contentTitleLower.includes('frequencies') || contentTitleLower.includes('hz') || contentTitleLower.includes('cymatic') || contentTitleLower.includes('binaural');
  const isForest = content?.id === 'soundscape-2' || contentTitleLower.includes('forest') || contentTitleLower.includes('woodland') || contentTitleLower.includes('pines') || contentTitleLower.includes('nature');
  const isFocus = content?.id === 'mood-1' || contentTitleLower.includes('focus') || contentTitleLower.includes('study') || contentTitleLower.includes('work') || contentTitleLower.includes('productivity');
  const isEnergy = content?.id === 'mood-2' || contentTitleLower.includes('energy') || contentTitleLower.includes('morning') || contentTitleLower.includes('wake') || contentTitleLower.includes('vitality');

  const playlistTitle = 
    isSleep ? 'Deep Sleep' :
    isRain ? 'Rain Sounds' :
    isFrequency ? 'Focus Frequencies' :
    isForest ? 'Forest Ambience' :
    isFocus ? 'Deep Focus' :
    isEnergy ? 'Morning Energy' :
    (content?.title || 'Full Meditation');

  // Point 1: Clinical Breathwork Presets
  const defaultBreathMode: BreathModeKey = 
    isSleep ? 'sleep_478' :
    isFocus ? 'box_4444' :
    isEnergy ? 'energize_22' :
    'hrv_coherent';

  const [activeBreathMode, setActiveBreathMode] = useState<BreathModeKey>(defaultBreathMode);
  const [showBreathSelector, setShowBreathSelector] = useState(false);

  useEffect(() => {
    setActiveBreathMode(defaultBreathMode);
  }, [content?.id]);

  // Point 2: Dual-Layer Ambient Soundscape Mixer
  const ambientAudioRef = useRef<HTMLAudioElement | null>(null);
  const [ambientLayer, setAmbientLayer] = useState<AmbientLayerKey>('off');
  const [ambientVolume, setAmbientVolume] = useState<number>(0.26);
  const [showAmbientMixer, setShowAmbientMixer] = useState<boolean>(false);

  useEffect(() => {
    if (ambientAudioRef.current) {
      if (ambientLayer === 'off') {
        ambientAudioRef.current.pause();
      } else {
        ambientAudioRef.current.volume = isMuted ? 0 : ambientVolume;
        if (isPlaying) {
          ambientAudioRef.current.play().catch(e => console.log('Ambient play error:', e));
        } else {
          ambientAudioRef.current.pause();
        }
      }
    }
  }, [isPlaying, ambientLayer, ambientVolume, isMuted]);

  // Point 3: Post-Session Mindful Summary & Streak Celebration
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    minutesLogged: 5,
    pointsAwarded: 5,
    mindfulStreak: 3
  });

  // Point 5: Dismiss Island on Player active open
  useEffect(() => {
    useActionIslandStore.getState().dismissIsland();
  }, []);

  const currentPlaylist = 
    isSleep ? DEEP_SLEEP_TRACKS :
    isRain ? RAIN_SOUNDS_TRACKS :
    isFrequency ? FOCUS_FREQUENCIES_TRACKS :
    isForest ? FOREST_AMBIENCE_TRACKS :
    isFocus ? DEEP_FOCUS_TRACKS :
    isEnergy ? HAPPY_HIGH_ENERGY_TRACKS :
    MEDITATION_TRACKS;

  const isPlaylistMode = currentPlaylist.length > 0;
  const currentTrack = isPlaylistMode ? currentPlaylist[activeTrackIndex % currentPlaylist.length] : null;

  const atmosphereTheme: AtmosphereTheme = 
    isSleep || (currentTrack && (currentTrack.title.includes('Sleep') || currentTrack.title.includes('Lullaby') || currentTrack.title.includes('Dream'))) ? 'sleep' :
    isRain || (currentTrack && currentTrack.title.includes('Rain')) ? 'rain' :
    isFrequency || (currentTrack && (currentTrack.title.includes('Frequency') || currentTrack.title.includes('Hz') || currentTrack.title.includes('Wave') || currentTrack.title.includes('Quantum'))) ? 'frequency' :
    isForest || (currentTrack && (currentTrack.title.includes('Forest') || currentTrack.title.includes('Pines') || currentTrack.title.includes('Woodland'))) ? 'forest' :
    isFocus || (currentTrack && (currentTrack.title.includes('Focus') || currentTrack.title.includes('Momentum') || currentTrack.title.includes('Study'))) ? 'focus' :
    isEnergy || (currentTrack && (currentTrack.title.includes('Energy') || currentTrack.title.includes('Sun') || currentTrack.title.includes('Morning'))) ? 'energy' :
    'meditation';

  const vibrationThemeColors = {
    sleep: { ring: 'rgba(196, 181, 253, 0.85)', glow: 'rgba(167, 139, 250, 0.55)', fill: 'rgba(167, 139, 250, 0.08)' },
    rain: { ring: 'rgba(56, 189, 248, 0.85)', glow: 'rgba(14, 165, 233, 0.55)', fill: 'rgba(56, 189, 248, 0.08)' },
    frequency: { ring: 'rgba(217, 70, 239, 0.85)', glow: 'rgba(168, 85, 247, 0.6)', fill: 'rgba(192, 132, 252, 0.1)' },
    forest: { ring: 'rgba(52, 211, 153, 0.85)', glow: 'rgba(16, 185, 129, 0.55)', fill: 'rgba(52, 211, 153, 0.08)' },
    energy: { ring: 'rgba(251, 191, 36, 0.9)', glow: 'rgba(245, 158, 11, 0.6)', fill: 'rgba(253, 224, 71, 0.12)' },
    focus: { ring: 'rgba(56, 189, 248, 0.85)', glow: 'rgba(56, 189, 248, 0.55)', fill: 'rgba(56, 189, 248, 0.08)' },
    meditation: { ring: 'rgba(56, 189, 248, 0.85)', glow: 'rgba(168, 85, 247, 0.55)', fill: 'rgba(56, 189, 248, 0.08)' }
  }[atmosphereTheme] || { ring: 'rgba(56, 189, 248, 0.85)', glow: 'rgba(56, 189, 248, 0.55)', fill: 'rgba(56, 189, 248, 0.08)' };

  // Point 6: Seamless Audio Crossfade Engine
  const switchTrackSmoothly = (newIndex: number) => {
    triggerHapticLight();
    if (!audioRef.current || isMuted || !isPlaying) {
      setActiveTrackIndex(newIndex);
      return;
    }

    if (isCrossfading.current) return;
    isCrossfading.current = true;

    let fadeOutStep = 0;
    const fadeOutInterval = setInterval(() => {
      fadeOutStep += 1;
      if (audioRef.current) {
        audioRef.current.volume = Math.max(0, 1 - (fadeOutStep / 5));
      }
      if (fadeOutStep >= 5) {
        clearInterval(fadeOutInterval);
        setActiveTrackIndex(newIndex);
        
        setTimeout(() => {
          if (audioRef.current && !isMuted) {
            audioRef.current.volume = 0;
            let fadeInStep = 0;
            const fadeInInterval = setInterval(() => {
              fadeInStep += 1;
              if (audioRef.current) {
                audioRef.current.volume = Math.min(1, fadeInStep / 6);
              }
              if (fadeInStep >= 6) {
                clearInterval(fadeInInterval);
                isCrossfading.current = false;
              }
            }, 100);
          } else {
            isCrossfading.current = false;
          }
        }, 150);
      }
    }, 80);
  };

  // Point 3: Tactile Breath Haptics for Eyes-Closed Meditation
  const previousPhase = useRef<string>(phase);
  useEffect(() => {
    if (!enableBreathingGuide || !isPlaying) {
      previousPhase.current = phase;
      return;
    }

    if (previousPhase.current !== phase && phase !== 'Prepare') {
      previousPhase.current = phase;
      if (phase === 'Inhale') {
        triggerHapticLight();
      } else if (phase === 'Hold') {
        triggerHapticLight();
        setTimeout(() => triggerHapticLight(), 120);
      } else if (phase === 'Exhale') {
        triggerHapticMedium();
      }
    }
  }, [phase, enableBreathingGuide, isPlaying]);

  // Point 5: iOS Lock Screen & Dynamic Island MediaSession Integration
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    const trackTitle = isPlaylistMode && currentTrack ? currentTrack.title : (content?.title || 'Calm Meditation');
    const rawCover = isPlaylistMode && currentTrack ? currentTrack.cover : (content?.cover_image_url || '/images/thumb_night_clouds_1788262545783.jpg');
    const absoluteCover = rawCover.startsWith('http') ? rawCover : `${window.location.origin}${rawCover}`;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: `HealthChain • ${playlistTitle}`,
        album: 'Calm Space Soundscapes',
        artwork: [
          { src: absoluteCover, sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        triggerHapticLight();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        triggerHapticLight();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (isPlaylistMode && currentPlaylist.length > 0) {
          switchTrackSmoothly(activeTrackIndex > 0 ? activeTrackIndex - 1 : currentPlaylist.length - 1);
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (isPlaylistMode && currentPlaylist.length > 0) {
          switchTrackSmoothly((activeTrackIndex + 1) % currentPlaylist.length);
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch (e) {
      // ignore
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch (e) {
        // ignore
      }
    };
  }, [isPlaying, activeTrackIndex, currentTrack, isPlaylistMode, playlistTitle, content, currentPlaylist.length, isMuted]);

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

  const pattern = CLINICAL_BREATH_PRESETS[activeBreathMode];
  const totalDuration = (content?.duration_minutes || 5) * 60;

  useEffect(() => {
    if (content) {
      setTimeRemaining(totalDuration);
      setIsPlaying(true);
      setIsCompleted(false);
      setPhase("Prepare");
      setActiveTrackIndex(0);
    }
  }, [content, totalDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (ambientAudioRef.current) {
        ambientAudioRef.current.pause();
      }
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  // Auto-hide controls when playing
  const resetControlsTimeout = () => {
    if (isZenMode) {
      setShowControls(false);
      return;
    }
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (isPlaying) {
      hideControlsTimer.current = setTimeout(() => {
        if (!showPlaylist && !showAmbientMixer && !showBreathSelector) setShowControls(false);
      }, 4500);
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, [isPlaying, showPlaylist, showAmbientMixer, showBreathSelector]);

  // Point 4: Session Countdown Timer & 10s Exponential Volume Fade-Out
  useEffect(() => {
    if (!isPlaying || isCompleted || timeRemaining <= 0) return;
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const next = Math.max(0, prev - 1);
        // Fade volume out over last 10 seconds
        if (next <= 10 && next > 0 && audioRef.current && !isMuted) {
          audioRef.current.volume = Math.max(0, next / 10);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, isCompleted, timeRemaining, isMuted]);

  useEffect(() => {
    if (timeRemaining === 0 && isPlaying && !isCompleted) {
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.pause();
      }
      handleComplete();
    }
  }, [timeRemaining, isPlaying, isCompleted]);

  // Breathwork Guidance State Machine with Per-Second Countdown
  useEffect(() => {
    if (!isPlaying || isCompleted || !enableBreathingGuide) return;

    let targetDuration = 3;
    if (phase === 'Prepare') targetDuration = 3;
    else if (phase === 'Inhale') targetDuration = Math.round(pattern.inhale);
    else if (phase === 'Hold') targetDuration = Math.round(pattern.hold);
    else if (phase === 'Exhale') targetDuration = Math.round(pattern.exhale);
    else if (phase === 'Rest') targetDuration = Math.round(pattern.rest || 0);

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

  // Point 3: Post-Session Mindful Summary & Streak Celebration
  const handleComplete = async () => {
    setIsCompleted(true);
    setIsPlaying(false);
    triggerHapticSuccess();
    setShowConfetti(true);

    const minutesLogged = Math.max(1, Math.round((totalDuration - timeRemaining) / 60) || 5);
    const pointsAwarded = 5;

    setSessionStats({
      minutesLogged,
      pointsAwarded,
      mindfulStreak: 3
    });
    setShowSummaryModal(true);

    awardPoints(pointsAwarded, 'Completed Mindful Breathing Session', 'mindful');

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user && content) {
      try {
        await FitnessService.completeWellnessSession(
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

  // Point 5: Action Island Calm Trigger on Player Minimize
  const handleClose = () => {
    triggerHapticLight();
    if (isPlaying) {
      const trackTitle = isPlaylistMode && currentTrack ? currentTrack.title : (content?.title || 'Calm Meditation');
      useActionIslandStore.getState().triggerIsland(
        'calm',
        `${trackTitle}`,
        `${playlistTitle} • Active`,
        'Expand',
        () => {
          window.dispatchEvent(new CustomEvent('hc_reopen_meditation'));
        }
      );
    } else {
      useActionIslandStore.getState().dismissIsland();
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Point 8: Eyes-Closed Zen Mode (Double-tap canvas gesture)
  const [isZenMode, setIsZenMode] = useState(false);
  const [zenToastVisible, setZenToastVisible] = useState(false);
  const zenToastTimeoutRef = useRef<any>(null);

  const toggleZenMode = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    triggerHapticLight();
    setIsZenMode((prev) => {
      const next = !prev;
      if (next) {
        setShowControls(false);
        setZenToastVisible(true);
        if (zenToastTimeoutRef.current) clearTimeout(zenToastTimeoutRef.current);
        zenToastTimeoutRef.current = setTimeout(() => setZenToastVisible(false), 3200);
      } else {
        setShowControls(true);
        setZenToastVisible(false);
      }
      return next;
    });
  };

  // Keyboard Navigation & Escape Dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showSummaryModal) {
          setShowSummaryModal(false);
          setShowConfetti(false);
        } else if (showAmbientMixer) {
          setShowAmbientMixer(false);
        } else if (showSleepTimerSheet) {
          setShowSleepTimerSheet(false);
        } else if (showPlaylist) {
          setShowPlaylist(false);
        } else if (showBreathSelector) {
          setShowBreathSelector(false);
        } else if (isZenMode) {
          setIsZenMode(false);
          setShowControls(true);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSummaryModal, showAmbientMixer, showSleepTimerSheet, showPlaylist, showBreathSelector, isZenMode, isPlaying, isPlaylistMode, currentTrack, content, playlistTitle]);

  // Point 5: Haptic Precision Scrubber with Floating Time Bubble
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const scrubBarRef = useRef<HTMLDivElement | null>(null);
  const lastHapticIntervalRef = useRef<number>(-1);

  const calculateScrubTimeFromEvent = (clientX: number) => {
    if (!scrubBarRef.current || duration <= 0) return 0;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const clampedX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = clampedX / rect.width;
    return ratio * duration;
  };

  const handleScrubStart = (clientX: number) => {
    if (duration <= 0) return;
    setIsScrubbing(true);
    triggerHapticLight();
    const newTime = calculateScrubTimeFromEvent(clientX);
    setScrubValue(newTime);
    lastHapticIntervalRef.current = Math.floor(newTime / 30);
  };

  const handleScrubMove = (clientX: number) => {
    if (!isScrubbing || duration <= 0) return;
    const newTime = calculateScrubTimeFromEvent(clientX);
    setScrubValue(newTime);

    // Haptic tick on 30s boundaries
    const interval = Math.floor(newTime / 30);
    if (interval !== lastHapticIntervalRef.current) {
      lastHapticIntervalRef.current = interval;
      triggerHapticLight();
    }
  };

  const handleScrubEnd = () => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    triggerHapticLight();
    setCurrentTime(scrubValue);
    if (audioRef.current) {
      audioRef.current.currentTime = scrubValue;
    }
  };

  useEffect(() => {
    if (!isScrubbing) return;
    const onPointerMove = (e: PointerEvent) => {
      handleScrubMove(e.clientX);
    };
    const onPointerUp = () => {
      handleScrubEnd();
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isScrubbing, scrubValue, duration]);

  const handleTrackEnded = () => {
    if (isPlaylistMode && currentPlaylist.length > 0) {
      if (sleepTimerOption === 'end_of_track') {
        handleComplete();
      } else {
        switchTrackSmoothly((activeTrackIndex + 1) % currentPlaylist.length);
      }
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
          onDoubleClick={toggleZenMode}
          onClick={() => {
            if (isZenMode) {
              setZenToastVisible(true);
              if (zenToastTimeoutRef.current) clearTimeout(zenToastTimeoutRef.current);
              zenToastTimeoutRef.current = setTimeout(() => setZenToastVisible(false), 2600);
              return;
            }
            resetControlsTimeout();
            if (audioRef.current && isPlaying && audioRef.current.paused) {
              audioRef.current.play().catch(() => {});
            }
          }}
        >
          {/* Point 8: Zen Mode Floating Feedback Pill */}
          <AnimatePresence>
            {zenToastVisible && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: 'absolute',
                  top: 'calc(env(safe-area-inset-top, 24px) + 24px)',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 100,
                  background: 'rgba(15, 23, 42, 0.82)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: '24px',
                  padding: '8px 18px',
                  color: 'rgba(255, 255, 255, 0.95)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  pointerEvents: 'none',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                }}
              >
                <Sparkles size={14} color="#38BDF8" />
                <span>{isZenMode ? 'Zen Mode Active • Double-tap canvas to restore controls' : 'Controls Restored'}</span>
              </motion.div>
            )}
          </AnimatePresence>

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
                  animate={{ 
                    scale: [1, 1.08, 1.02, 1],
                    x: [0, -12, 8, 0],
                    y: [0, 8, -6, 0],
                    opacity: 0.88 
                  }}
                  transition={{ 
                    scale: { duration: 40, repeat: Infinity, ease: 'easeInOut' },
                    x: { duration: 40, repeat: Infinity, ease: 'easeInOut' },
                    y: { duration: 40, repeat: Infinity, ease: 'easeInOut' },
                    opacity: { duration: 0.8 }
                  }}
                  src={isPlaylistMode && currentTrack ? currentTrack.cover : (content.id === 'mood-0' ? '/images/thumb_night_clouds_1788262545783.jpg' : (content.cover_image_url || '/images/thumb_night_clouds_1788262545783.jpg'))} 
                  alt="Atmosphere"  
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {/* Multi-Stage Cinematic Vignette */}
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'radial-gradient(ellipse at center, rgba(5, 8, 17, 0.12) 0%, rgba(5, 8, 17, 0.52) 60%, rgba(5, 8, 17, 0.92) 100%)' 
                }} />
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  background: 'linear-gradient(to bottom, rgba(5, 8, 17, 0.6) 0%, transparent 25%, transparent 65%, rgba(5, 8, 17, 0.95) 100%)' 
                }} />
                {/* 60fps Living Particle Atmosphere Engine */}
                <LivingAtmosphereCanvas theme={atmosphereTheme} phase={phase} isPlaying={isPlaying} />
              </div>

              {/* Native Audio Element with Auto-Recovery */}
              {isPlaylistMode && currentTrack && (
                <audio 
                  ref={audioRef} 
                  src={encodeURI(currentTrack.audioUrl)} 
                  autoPlay={isPlaying}
                  preload="auto"
                  playsInline
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

              {/* Point 2: Dual-Layer Ambient Soundscape Audio */}
              {ambientLayer !== 'off' && AMBIENT_LAYERS[ambientLayer]?.url && (
                <audio
                  ref={ambientAudioRef}
                  src={encodeURI(AMBIENT_LAYERS[ambientLayer].url)}
                  loop
                  autoPlay={isPlaying}
                  preload="auto"
                  playsInline
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
                        handleClose();
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

                    {/* Environment / Track Info Pill (Point 1: Single-Line Mobile Fit) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 600,
                      letterSpacing: '-0.2px',
                      whiteSpace: 'nowrap',
                      minWidth: 0,
                      flexShrink: 1
                    }}>
                      <span style={{ color: vibrationThemeColors.ring, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <Wind size={13} style={{ marginRight: '4px', flexShrink: 0 }} />
                        {playlistTitle}
                      </span>
                      {isPlaylistMode && currentPlaylist.length > 0 && (
                        <span style={{ opacity: 0.65, whiteSpace: 'nowrap', fontSize: '12px' }}>• {activeTrackIndex + 1}/{currentPlaylist.length}</span>
                      )}
                    </div>

                    {/* Point 4: Interactive Sleep Timer & Session Countdown Pill */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticLight();
                        setShowSleepTimerSheet(true);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: sleepTimerOption !== 'off'
                          ? `linear-gradient(135deg, ${vibrationThemeColors.glow} 0%, rgba(255, 255, 255, 0.1) 100%)`
                          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: sleepTimerOption !== 'off'
                          ? `1px solid ${vibrationThemeColors.ring}`
                          : '1px solid rgba(255, 255, 255, 0.25)',
                        color: 'white',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: sleepTimerOption !== 'off' ? `0 0 16px ${vibrationThemeColors.glow}` : 'none'
                      }}
                      aria-label="Set Sleep Timer"
                    >
                      {sleepTimerOption !== 'off' ? (
                        <Moon size={14} style={{ color: vibrationThemeColors.ring }} />
                      ) : (
                        <Clock size={14} style={{ opacity: 0.75 }} />
                      )}
                      <span>{formatTime(timeRemaining)}</span>
                    </button>
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
                {/* Point 1: Clinical Breathwork Rhythm Mode Pill */}
                <AnimatePresence>
                  {showControls && (
                    <motion.button
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticLight();
                        setShowBreathSelector(true);
                      }}
                      style={{
                        marginBottom: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: `1px solid ${vibrationThemeColors.ring}`,
                        boxShadow: `0 0 16px ${vibrationThemeColors.glow}`,
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        letterSpacing: '-0.2px'
                      }}
                      aria-label="Select Clinical Breathwork Rhythm"
                    >
                      <Sparkles size={13} color={vibrationThemeColors.ring} />
                      <span>{CLINICAL_BREATH_PRESETS[activeBreathMode].label}</span>
                      <Sliders size={12} style={{ opacity: 0.75, marginLeft: '2px' }} />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Center Living Acoustic Mandala & Vibration Waves Engine */}
                <div style={{ position: 'relative', width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  
                  {/* Atmospheric Glow Aura */}
                  <motion.div
                    animate={{ 
                      scale: !isPlaying ? 1 : 
                             phase === 'Inhale' ? 1.75 : 
                             phase === 'Hold' ? [1.75, 1.8, 1.75] : 
                             phase === 'Exhale' ? 1.05 : [1.1, 1.25, 1.1],
                      opacity: isPlaying ? [0.45, 0.8, 0.45] : 0.25
                    }}
                    transition={{ 
                      duration: phase === 'Prepare' ? 2.4 : phase === 'Inhale' ? pattern.inhale : phase === 'Exhale' ? pattern.exhale : (pattern.hold || 3), 
                      repeat: phase === 'Prepare' || phase === 'Hold' ? Infinity : 0,
                      ease: 'easeInOut'
                    }}
                    style={{ 
                      position: 'absolute', 
                      inset: '-25px', 
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${vibrationThemeColors.glow} 0%, rgba(0, 0, 0, 0) 70%)`,
                      filter: 'blur(30px)',
                      pointerEvents: 'none'
                    }}
                  />

                  {/* 4 Continuous Radiating Acoustic Vibration Waves (Never frozen, rippling outward) */}
                  {isPlaying && [0, 1, 2, 3].map((waveIndex) => (
                    <motion.div
                      key={`acoustic-vibration-wave-${waveIndex}`}
                      animate={{ 
                        scale: [1, 1.65, 2.45],
                        opacity: [0.75, 0.35, 0],
                        borderWidth: ['2px', '1.5px', '1px']
                      }}
                      transition={{ 
                        duration: 3.6,
                        repeat: Infinity,
                        ease: [0.22, 1, 0.36, 1],
                        delay: waveIndex * 0.9,
                      }}
                      style={{ 
                        position: 'absolute', 
                        width: '135px', 
                        height: '135px', 
                        borderRadius: '50%', 
                        borderStyle: 'solid',
                        borderColor: vibrationThemeColors.ring,
                        boxShadow: `0 0 24px ${vibrationThemeColors.glow}, inset 0 0 12px ${vibrationThemeColors.glow}`,
                        pointerEvents: 'none'
                      }}
                    />
                  ))}

                  {/* Outer Harmonic Resonance Shell */}
                  <motion.div
                    animate={{ 
                      scale: !isPlaying ? 1 : 
                             phase === 'Inhale' ? [1.1, 1.55] : 
                             phase === 'Hold' ? [1.55, 1.59, 1.55] : 
                             phase === 'Exhale' ? [1.55, 1.0] : [1.02, 1.1, 1.02],
                      opacity: !isPlaying ? 0.3 :
                               phase === 'Inhale' ? [0.4, 0.85] : 
                               phase === 'Hold' ? [0.85, 0.95, 0.85] : 
                               phase === 'Exhale' ? [0.85, 0.35] : [0.4, 0.75, 0.4]
                    }}
                    transition={{ 
                      duration: phase === 'Prepare' ? 2.2 : phase === 'Inhale' ? pattern.inhale : phase === 'Exhale' ? pattern.exhale : (pattern.hold || 3), 
                      ease: 'easeInOut',
                      repeat: phase === 'Prepare' || phase === 'Hold' ? Infinity : 0
                    }}
                    style={{ 
                      position: 'absolute', 
                      width: '230px', 
                      height: '230px', 
                      borderRadius: '50%', 
                      border: `1.5px solid ${vibrationThemeColors.ring}`,
                      boxShadow: `0 0 35px ${vibrationThemeColors.glow}, inset 0 0 20px rgba(255, 255, 255, 0.15)`,
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Inner Harmonic Resonance Wave */}
                  <motion.div
                    animate={{ 
                      scale: !isPlaying ? 1 : 
                             phase === 'Inhale' ? [1.05, 1.3] : 
                             phase === 'Hold' ? [1.3, 1.33, 1.3] : 
                             phase === 'Exhale' ? [1.3, 0.92] : [0.96, 1.05, 0.96],
                      opacity: !isPlaying ? 0.35 : [0.5, 0.85, 0.5]
                    }}
                    transition={{ 
                      duration: phase === 'Prepare' ? 1.8 : phase === 'Inhale' ? pattern.inhale : phase === 'Exhale' ? pattern.exhale : (pattern.hold || 3), 
                      ease: 'easeInOut',
                      repeat: phase === 'Prepare' || phase === 'Hold' ? Infinity : 0,
                      delay: 0.15
                    }}
                    style={{ 
                      position: 'absolute', 
                      width: '180px', 
                      height: '180px', 
                      borderRadius: '50%', 
                      border: '1.5px solid rgba(255, 255, 255, 0.5)',
                      background: vibrationThemeColors.fill,
                      boxShadow: `0 0 20px ${vibrationThemeColors.glow}, inset 0 0 15px rgba(255, 255, 255, 0.2)`,
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Inner Breathing Core with Text & Reactive Pulse */}
                  <motion.div
                    animate={{
                      scale: !isPlaying ? 1 :
                             phase === 'Inhale' ? [1, 1.12] :
                             phase === 'Hold' ? [1.12, 1.15, 1.12] :
                             phase === 'Exhale' ? [1.12, 0.98] :
                             [1, 1.04, 1],
                      boxShadow: isPlaying
                        ? [
                            `0 10px 30px rgba(0, 0, 0, 0.4), 0 0 25px ${vibrationThemeColors.glow}, inset 0 1px 2px rgba(255, 255, 255, 0.8)`,
                            `0 10px 30px rgba(0, 0, 0, 0.4), 0 0 45px ${vibrationThemeColors.glow}, inset 0 1px 2px rgba(255, 255, 255, 0.9)`,
                            `0 10px 30px rgba(0, 0, 0, 0.4), 0 0 25px ${vibrationThemeColors.glow}, inset 0 1px 2px rgba(255, 255, 255, 0.8)`,
                          ]
                        : '0 10px 30px rgba(0, 0, 0, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.7)'
                    }}
                    transition={{
                      scale: {
                        duration: phase === 'Prepare' ? 2 : phase === 'Inhale' ? pattern.inhale : phase === 'Exhale' ? pattern.exhale : (pattern.hold || 3),
                        repeat: phase === 'Prepare' || phase === 'Hold' ? Infinity : 0,
                        ease: 'easeInOut'
                      },
                      boxShadow: {
                        duration: 2.2,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }
                    }}
                    style={{
                      width: '132px',
                      height: '132px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.12) 100%)',
                      backdropFilter: 'blur(32px)',
                      WebkitBackdropFilter: 'blur(32px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.65)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      zIndex: 2,
                      cursor: 'pointer'
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={enableBreathingGuide ? "Disable breathing guide" : "Enable breathing guide"}
                    aria-pressed={enableBreathingGuide}
                    whileTap={{ scale: 0.96 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnableBreathingGuide(!enableBreathingGuide);
                      triggerHapticLight();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setEnableBreathingGuide(!enableBreathingGuide);
                        triggerHapticLight();
                      }
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
                        color: vibrationThemeColors.ring, 
                        fontWeight: 600,
                        marginTop: '2px',
                        textShadow: `0 0 10px ${vibrationThemeColors.glow}`
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                          {isPlaying && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, padding: '2px 4px' }}>
                              <motion.span animate={{ height: ['4px', '16px', '6px', '14px', '4px'] }} transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }} style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '3px', boxShadow: `0 0 8px ${vibrationThemeColors.glow}` }} />
                              <motion.span animate={{ height: ['12px', '4px', '18px', '8px', '12px'] }} transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut', delay: 0.12 }} style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '3px', boxShadow: `0 0 8px ${vibrationThemeColors.glow}` }} />
                              <motion.span animate={{ height: ['6px', '18px', '9px', '16px', '6px'] }} transition={{ duration: 0.95, repeat: Infinity, ease: 'easeInOut', delay: 0.24 }} style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '3px', boxShadow: `0 0 8px ${vibrationThemeColors.glow}` }} />
                              <motion.span animate={{ height: ['14px', '6px', '13px', '5px', '14px'] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }} style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '3px', boxShadow: `0 0 8px ${vibrationThemeColors.glow}` }} />
                              <motion.span animate={{ height: ['8px', '16px', '5px', '12px', '8px'] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }} style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '3px', boxShadow: `0 0 8px ${vibrationThemeColors.glow}` }} />
                            </div>
                          )}
                        </div>
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

                    {/* Point 5: Haptic Precision Scrubber with Floating Time Bubble */}
                    {isPlaylistMode && duration > 0 && (
                      <div style={{ marginBottom: '14px', position: 'relative' }}>
                        {/* Floating Time Bubble */}
                        <AnimatePresence>
                          {isScrubbing && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.85 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.85 }}
                              transition={{ duration: 0.15 }}
                              style={{
                                position: 'absolute',
                                bottom: '26px',
                                left: `${Math.min(94, Math.max(6, ((isScrubbing ? scrubValue : currentTime) / Math.max(1, duration)) * 100))}%`,
                                transform: 'translateX(-50%)',
                                background: 'rgba(15, 23, 42, 0.95)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: `1.5px solid ${vibrationThemeColors.ring}`,
                                boxShadow: `0 8px 24px rgba(0, 0, 0, 0.5), 0 0 16px ${vibrationThemeColors.glow}`,
                                borderRadius: '14px',
                                padding: '5px 10px',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 800,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                zIndex: 30
                              }}
                            >
                              <span>{formatTime(isScrubbing ? scrubValue : currentTime)}</span>
                              {/* Downward Arrow */}
                              <div style={{
                                position: 'absolute',
                                bottom: '-5px',
                                width: 0,
                                height: 0,
                                borderLeft: '5px solid transparent',
                                borderRight: '5px solid transparent',
                                borderTop: `5px solid ${vibrationThemeColors.ring}`
                              }} />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', minWidth: '34px', fontWeight: 600 }}>
                            {formatTime(isScrubbing ? scrubValue : currentTime)}
                          </span>

                          {/* Custom Interactive Track */}
                          <div
                            ref={scrubBarRef}
                            onPointerDown={(e) => {
                              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                              handleScrubStart(e.clientX);
                            }}
                            style={{
                              flex: 1,
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              cursor: 'pointer',
                              position: 'relative',
                              touchAction: 'none'
                            }}
                          >
                            {/* Track Rail */}
                            <div style={{
                              width: '100%',
                              height: '5px',
                              borderRadius: '3px',
                              background: 'rgba(255, 255, 255, 0.18)',
                              position: 'relative',
                              overflow: 'hidden'
                            }}>
                              {/* Filled Progress Bar */}
                              <div style={{
                                width: `${Math.min(100, Math.max(0, ((isScrubbing ? scrubValue : currentTime) / Math.max(1, duration)) * 100))}%`,
                                height: '100%',
                                background: `linear-gradient(90deg, #38BDF8 0%, ${vibrationThemeColors.ring} 100%)`,
                                borderRadius: '3px',
                                boxShadow: `0 0 10px ${vibrationThemeColors.glow}`
                              }} />
                            </div>

                            {/* Active Glowing Thumb */}
                            <motion.div
                              animate={{ 
                                scale: isScrubbing ? 1.45 : 1,
                                boxShadow: isScrubbing 
                                  ? `0 0 16px ${vibrationThemeColors.ring}, 0 2px 8px rgba(0,0,0,0.5)` 
                                  : '0 2px 6px rgba(0, 0, 0, 0.4)'
                              }}
                              transition={{ duration: 0.12 }}
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: `${Math.min(100, Math.max(0, ((isScrubbing ? scrubValue : currentTime) / Math.max(1, duration)) * 100))}%`,
                                transform: 'translate(-50%, -50%)',
                                width: '13px',
                                height: '13px',
                                borderRadius: '50%',
                                background: '#FFFFFF',
                                border: `2px solid ${vibrationThemeColors.ring}`,
                                pointerEvents: 'none'
                              }}
                            />
                          </div>

                          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.7)', minWidth: '34px', textAlign: 'right', fontWeight: 600 }}>
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
                            if (isPlaylistMode && currentPlaylist.length > 0) {
                              const newIdx = activeTrackIndex > 0 ? activeTrackIndex - 1 : currentPlaylist.length - 1;
                              switchTrackSmoothly(newIdx);
                            } else {
                              triggerHapticLight();
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
                            if (isPlaylistMode && currentPlaylist.length > 0) {
                              const newIdx = activeTrackIndex < currentPlaylist.length - 1 ? activeTrackIndex + 1 : 0;
                              switchTrackSmoothly(newIdx);
                            } else {
                              triggerHapticLight();
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

                      <div style={{ width: '88px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => {
                            triggerHapticLight();
                            setShowAmbientMixer(true);
                          }}
                          style={{
                            background: ambientLayer !== 'off' 
                              ? `linear-gradient(135deg, ${vibrationThemeColors.glow} 0%, rgba(255, 255, 255, 0.1) 100%)`
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            border: ambientLayer !== 'off' 
                              ? `1px solid ${vibrationThemeColors.ring}` 
                              : '1px solid rgba(255, 255, 255, 0.25)',
                            borderRadius: '16px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: ambientLayer !== 'off' ? `0 0 12px ${vibrationThemeColors.glow}` : 'none'
                          }}
                          aria-label="Ambient Layer Mixer"
                        >
                          <Layers size={15} color={ambientLayer !== 'off' ? vibrationThemeColors.ring : 'white'} />
                          <span>{ambientLayer !== 'off' ? AMBIENT_LAYERS[ambientLayer].icon : 'Mixer'}</span>
                        </button>
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
                              role="button"
                              tabIndex={0}
                              aria-label={`Play ${track.title}`}
                              aria-pressed={isActive}
                              onClick={() => {
                                switchTrackSmoothly(idx);
                                setIsPlaying(true);
                                setShowPlaylist(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  switchTrackSmoothly(idx);
                                  setIsPlaying(true);
                                  setShowPlaylist(false);
                                }
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '12px',
                                borderRadius: '16px',
                                background: isActive ? `${vibrationThemeColors.glow}` : 'transparent',
                                border: isActive ? `1px solid ${vibrationThemeColors.ring}` : '1px solid transparent',
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
                                  color: isActive ? vibrationThemeColors.ring : 'white',
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
                                    animate={{ height: isPlaying ? ['4px', '16px', '4px'] : '6px' }}
                                    transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '2px', boxShadow: `0 0 6px ${vibrationThemeColors.glow}` }}
                                  />
                                  <motion.span
                                    animate={{ height: isPlaying ? ['14px', '4px', '14px'] : '12px' }}
                                    transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
                                    style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '2px', boxShadow: `0 0 6px ${vibrationThemeColors.glow}` }}
                                  />
                                  <motion.span
                                    animate={{ height: isPlaying ? ['6px', '18px', '6px'] : '8px' }}
                                    transition={{ duration: 0.75, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                                    style={{ width: '3px', background: vibrationThemeColors.ring, borderRadius: '2px', boxShadow: `0 0 6px ${vibrationThemeColors.glow}` }}
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

              {/* Point 4: Ultra-Sheer Glass Sleep Timer Bottom Sheet */}
              <AnimatePresence>
                {showSleepTimerSheet && (
                  <>
                    {/* Backdrop */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowSleepTimerSheet(false)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        zIndex: 45
                      }}
                    />

                    {/* Sheet Content */}
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
                        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.92) 0%, rgba(10, 15, 29, 0.98) 100%)',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        borderTopLeftRadius: '28px',
                        borderTopRightRadius: '28px',
                        padding: '16px 20px calc(env(safe-area-inset-bottom, 24px) + 20px)',
                        zIndex: 50
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.3)' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Moon size={20} color={vibrationThemeColors.ring} />
                          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>
                            Sleep Timer
                          </h4>
                        </div>
                        <button
                          onClick={() => setShowSleepTimerSheet(false)}
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {[
                          { label: 'Off', value: 'off', durationSec: totalDuration },
                          { label: '15 Minutes', value: '15', durationSec: 15 * 60 },
                          { label: '30 Minutes', value: '30', durationSec: 30 * 60 },
                          { label: '45 Minutes', value: '45', durationSec: 45 * 60 },
                          { label: '60 Minutes (1 Hour)', value: '60', durationSec: 60 * 60 },
                          { label: 'End of Current Track', value: 'end_of_track', durationSec: Math.max(1, Math.floor(duration - currentTime)) }
                        ].map((option) => {
                          const isSelected = sleepTimerOption === option.value;
                          return (
                            <button
                              key={option.value}
                              onClick={() => {
                                triggerHapticLight();
                                setSleepTimerOption(option.value as any);
                                setTimeRemaining(option.durationSec);
                                if (audioRef.current && !isMuted) audioRef.current.volume = 1;
                                setShowSleepTimerSheet(false);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 18px',
                                borderRadius: '16px',
                                background: isSelected ? `${vibrationThemeColors.glow}` : 'rgba(255, 255, 255, 0.06)',
                                border: isSelected ? `1.5px solid ${vibrationThemeColors.ring}` : '1px solid rgba(255, 255, 255, 0.12)',
                                color: 'white',
                                fontSize: '15px',
                                fontWeight: isSelected ? 700 : 500,
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <span style={{ color: isSelected ? vibrationThemeColors.ring : 'white' }}>
                                {option.label}
                              </span>
                              {isSelected && (
                                <Check size={18} color={vibrationThemeColors.ring} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Point 1: Clinical Breathwork Rhythm Sheet */}
              <AnimatePresence>
                {showBreathSelector && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowBreathSelector(false)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        zIndex: 45
                      }}
                    />
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
                        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.94) 0%, rgba(10, 15, 29, 0.98) 100%)',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        borderTopLeftRadius: '28px',
                        borderTopRightRadius: '28px',
                        padding: '16px 20px calc(env(safe-area-inset-bottom, 24px) + 20px)',
                        zIndex: 50
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.3)' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Sparkles size={20} color={vibrationThemeColors.ring} />
                          <div>
                            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>
                              Clinical Breathwork Modes
                            </h4>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                              Autonomic regulation & heart rate variability
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowBreathSelector(false)}
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(Object.keys(CLINICAL_BREATH_PRESETS) as BreathModeKey[]).map((key) => {
                          const config = CLINICAL_BREATH_PRESETS[key];
                          const isSelected = activeBreathMode === key;
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                triggerHapticLight();
                                setActiveBreathMode(key);
                                setPhase('Prepare');
                                setShowBreathSelector(false);
                              }}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                padding: '14px 18px',
                                borderRadius: '16px',
                                background: isSelected ? `${vibrationThemeColors.glow}` : 'rgba(255, 255, 255, 0.06)',
                                border: isSelected ? `1.5px solid ${vibrationThemeColors.ring}` : '1px solid rgba(255, 255, 255, 0.12)',
                                color: 'white',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: isSelected ? vibrationThemeColors.ring : 'white' }}>
                                  {config.label}
                                </span>
                                {isSelected && <Check size={18} color={vibrationThemeColors.ring} />}
                              </div>
                              <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                                {config.benefit}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Point 2: Dual-Layer Ambient Soundscape Mixer Sheet */}
              <AnimatePresence>
                {showAmbientMixer && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowAmbientMixer(false)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        zIndex: 45
                      }}
                    />
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
                        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.94) 0%, rgba(10, 15, 29, 0.98) 100%)',
                        backdropFilter: 'blur(32px)',
                        WebkitBackdropFilter: 'blur(32px)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        borderTopLeftRadius: '28px',
                        borderTopRightRadius: '28px',
                        padding: '16px 20px calc(env(safe-area-inset-bottom, 24px) + 20px)',
                        zIndex: 50
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.3)' }} />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Layers size={20} color={vibrationThemeColors.ring} />
                          <div>
                            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'white' }}>
                              Ambient Texture Layer
                            </h4>
                            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                              Blend subtle nature sounds under your meditation
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowAmbientMixer(false)}
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

                      {/* Ambient Layer Options */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        {(Object.keys(AMBIENT_LAYERS) as AmbientLayerKey[]).map((key) => {
                          const layer = AMBIENT_LAYERS[key];
                          const isSelected = ambientLayer === key;
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                triggerHapticLight();
                                setAmbientLayer(key);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '14px',
                                borderRadius: '16px',
                                background: isSelected ? `${vibrationThemeColors.glow}` : 'rgba(255, 255, 255, 0.06)',
                                border: isSelected ? `1.5px solid ${vibrationThemeColors.ring}` : '1px solid rgba(255, 255, 255, 0.12)',
                                color: 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: isSelected ? 700 : 500
                              }}
                            >
                              <span style={{ fontSize: '18px' }}>{layer.icon}</span>
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isSelected ? vibrationThemeColors.ring : 'white' }}>
                                {layer.label}
                              </span>
                              {isSelected && <Check size={16} color={vibrationThemeColors.ring} />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Volume Slider if ambient layer active */}
                      {ambientLayer !== 'off' && (
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          borderRadius: '18px',
                          padding: '16px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600 }}>Ambient Mix Level</span>
                            <span style={{ color: vibrationThemeColors.ring, fontWeight: 700 }}>{Math.round(ambientVolume * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            aria-label="Ambient background sound volume"
                            min={0}
                            max={1}
                            step={0.02}
                            value={ambientVolume}
                            onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                            style={{
                              width: '100%',
                              accentColor: vibrationThemeColors.ring,
                              height: '6px',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              {/* Point 3: Post-Session Mindful Summary & Streak Celebration Modal */}
              <AnimatePresence>
                {showSummaryModal && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 60,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px',
                    background: 'rgba(5, 8, 17, 0.85)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)'
                  }}>
                    {showConfetti && (
                      <Confetti
                        width={typeof window !== 'undefined' ? window.innerWidth : 400}
                        height={typeof window !== 'undefined' ? window.innerHeight : 800}
                        recycle={false}
                        numberOfPieces={300}
                      />
                    )}

                    <motion.div
                      role="dialog"
                      aria-modal="true"
                      aria-label="Session Completed"
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      style={{
                        width: '100%',
                        maxWidth: '380px',
                        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
                        borderRadius: '32px',
                        padding: '32px 24px',
                        textAlign: 'center',
                        position: 'relative'
                      }}
                    >
                      {/* Trophy Glow */}
                      <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                        boxShadow: '0 0 30px rgba(245, 158, 11, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px'
                      }}>
                        <Trophy size={36} color="#0F172A" />
                      </div>

                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(245, 158, 11, 0.18)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        padding: '4px 14px',
                        borderRadius: '20px',
                        marginBottom: '12px'
                      }}>
                        <Sparkles size={14} color="#F59E0B" />
                        <span style={{ color: '#FCD34D', fontSize: '12px', fontWeight: 800, letterSpacing: '0.5px' }}>
                          +{sessionStats.pointsAwarded} VITALITY POINTS MINTED
                        </span>
                      </div>

                      <h3 style={{ fontSize: '24px', fontWeight: 800, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                        Session Completed
                      </h3>
                      <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', margin: '0 0 24px' }}>
                        Your nervous system is grounded and restored.
                      </p>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          borderRadius: '18px',
                          padding: '14px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>Mindful Time</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{sessionStats.minutesLogged} mins</div>
                        </div>

                        <div style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          borderRadius: '18px',
                          padding: '14px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>Calm Streak</div>
                          <div style={{ fontSize: '20px', fontWeight: 800, color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <Flame size={18} fill="#F59E0B" color="#F59E0B" />
                            {sessionStats.mindfulStreak} Days
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                          onClick={() => {
                            triggerHapticLight();
                            setShowSummaryModal(false);
                            setShowConfetti(false);
                            onClose();
                            const calmPrompt = `I just completed a ${sessionStats.minutesLogged}-minute restorative session ("${currentTrack?.title || playlistTitle}") in Calm Space. Can you analyze how this parasympathetic activation affects my autonomic nervous system, vagal tone, and resting heart rate metrics?`;
                            navigate('/app/ava', { state: { initialPrompt: calmPrompt, initialMessage: calmPrompt } });
                          }}
                          style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '18px',
                            background: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
                            border: 'none',
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                          }}
                        >
                          💬 Discuss Autonomic Reset with Ava
                        </button>

                        <button
                          onClick={() => {
                            triggerHapticLight();
                            setShowSummaryModal(false);
                            setShowConfetti(false);
                            onClose();
                          }}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '18px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: 'white',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Done
                        </button>
                      </div>
                    </motion.div>
                  </div>
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


