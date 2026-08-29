import os

files = {
    'src/components/ui/ImmersiveMediaCard.tsx': '''import React from 'react';
import { motion } from 'framer-motion';
import { Play, Lock } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface ImmersiveMediaCardProps {
  title: string;
  subtitle?: string;
  bgImage: string;
  tags?: string[];
  duration?: string;
  isPremium?: boolean;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'wide';
  onClick?: () => void;
  children?: React.ReactNode;
}

export function ImmersiveMediaCard({
  title,
  subtitle,
  bgImage,
  tags = [],
  duration,
  isPremium,
  aspectRatio = 'square',
  onClick,
  children
}: ImmersiveMediaCardProps) {
  
  const aspectStyles: Record<string, React.CSSProperties> = {
    square: { aspectRatio: '1 / 1' },
    video: { aspectRatio: '16 / 9' },
    portrait: { aspectRatio: '3 / 4' },
    wide: { aspectRatio: '21 / 9' }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        triggerHapticLight();
        if (onClick) onClick();
      }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '24px',
        cursor: 'pointer',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        flexShrink: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minWidth: aspectRatio === 'wide' ? '300px' : aspectRatio === 'video' ? '280px' : '180px',
        ...aspectStyles[aspectRatio]
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.2), transparent)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
        {isPremium && (
          <div style={{
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(12px)',
            color: 'white',
            padding: '6px',
            borderRadius: '9999px'
          }}>
            <Lock size={14} />
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 8 }}>
        {tags.map(tag => (
          <span key={tag} style={{
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(12px)',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            padding: '4px 8px',
            borderRadius: '9999px'
          }}>
            {tag}
          </span>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '16px',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}>
        {subtitle && <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 500, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{subtitle}</p>}
        <h3 style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', lineHeight: 1.2, margin: '0 0 4px' }}>{title}</h3>
        {duration && (
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
            {duration}
          </p>
        )}
        {children}
      </div>
    </motion.div>
  );
}''',

    'src/components/ui/SwimlaneCarousel.tsx': '''import React, { useRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface SwimlaneCarouselProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}

export function SwimlaneCarousel({ title, subtitle, onSeeAll, children }: SwimlaneCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', padding: '0 16px', marginBottom: '12px' }}>
        <div>
          {subtitle && <p style={{ color: '#9ca3af', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 2px' }}>{subtitle}</p>}
          <h2 style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>{title}</h2>
        </div>
        {onSeeAll && (
          <button 
            onClick={onSeeAll}
            style={{ color: '#9ca3af', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
          >
            See All <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '16px',
          padding: '0 16px 16px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {React.Children.map(children, (child) => (
          <div style={{ scrollSnapAlign: 'start', flexShrink: 0 }}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}''',

    'src/components/ui/BottomSheetOverlay.tsx': '''import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface BottomSheetOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  bgImage?: string;
}

export function BottomSheetOverlay({ isOpen, onClose, children, bgImage }: BottomSheetOverlayProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              triggerHapticLight();
              onClose();
            }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)'
            }}
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 61,
              height: '92vh',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#0F0F11',
              borderTopLeftRadius: '32px',
              borderTopRightRadius: '32px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div 
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '48px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
                cursor: 'pointer'
              }}
            >
              <div style={{ width: '48px', height: '6px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '9999px', marginTop: '8px' }} />
            </div>

            <button 
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 20,
                backgroundColor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(12px)',
                padding: '8px',
                borderRadius: '9999px',
                color: 'rgba(255,255,255,0.8)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            {bgImage && (
              <div 
                style={{
                  position: 'relative',
                  height: '256px',
                  width: '100%',
                  flexShrink: 0,
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.2), #0F0F11)'
                }} />
              </div>
            )}

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px 24px 96px',
              color: 'white',
              position: 'relative'
            }}>
               {!bgImage && <div style={{ marginTop: '32px' }} />}
               {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}''',

    'src/components/ui/ZenBreathingPlayer.tsx': '''import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play } from 'lucide-react';
import { triggerHapticLight } from '../../services/haptics';

interface ZenBreathingPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  bgImage?: string;
}

export function ZenBreathingPlayer({ isOpen, onClose, bgImage = 'https://images.unsplash.com/photo-1518085250985-78e7bbdf6a62?auto=format&fit=crop&q=80' }: ZenBreathingPlayerProps) {
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  
  useEffect(() => {
    if (!isPlaying) return;
    
    let currentPhase = 'Inhale';
    const interval = setInterval(() => {
      triggerHapticLight();
      if (currentPhase === 'Inhale') { currentPhase = 'Hold'; }
      else if (currentPhase === 'Hold') { currentPhase = 'Exhale'; }
      else { currentPhase = 'Inhale'; }
      
      setPhase(currentPhase as any);
    }, 4000); 
    
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'white',
          fontFamily: 'sans-serif',
          backgroundColor: 'black',
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', zIndex: 10, paddingTop: '48px' }}>
          <button 
            onClick={onClose} 
            style={{ padding: '8px', backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
          >
            <X size={24} color="white" />
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, position: 'relative', width: '100%' }}>
            <motion.div 
                style={{ position: 'absolute', width: '256px', height: '256px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '9999px' }}
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.5 : phase === 'Exhale' ? 1 : 1.5) : 1 }}
                transition={{ duration: 4, ease: "easeInOut" }}
            />
            <motion.div 
                style={{ position: 'absolute', width: '192px', height: '192px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '9999px' }}
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.4 : phase === 'Exhale' ? 1 : 1.4) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.1 }}
            />
            <motion.div 
                style={{ position: 'absolute', width: '128px', height: '128px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)' }}
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.2 : phase === 'Exhale' ? 1 : 1.2) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.2 }}
            >
                <span style={{ fontSize: '20px', fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{isPlaying ? phase : 'Ready'}</span>
            </motion.div>
        </div>

        <div style={{ width: '100%', padding: '32px', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', marginBottom: '32px' }}>
            <button 
                onClick={() => {
                    triggerHapticLight();
                    setIsPlaying(!isPlaying);
                }}
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(24px)',
                  borderRadius: '9999px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  border: '1px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 0 40px rgba(255,255,255,0.1)',
                  cursor: 'pointer'
                }}
            >
                {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" style={{ marginLeft: '8px' }} />}
            </button>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontWeight: 500, padding: '0 16px' }}>
                <span>00:00</span>
                <span>10:00</span>
            </div>
            <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '9999px', overflow: 'hidden', margin: '0 16px' }}>
                <div style={{ height: '100%', backgroundColor: 'white', width: '0' }} />
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}''',

    'src/components/ui/WorkoutPlayer.tsx': '''import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Pause, Play } from 'lucide-react';
import { triggerHapticLight, triggerHapticMedium } from '../../services/haptics';
import { Workout } from '../../services/ContentLibraryEngine';

interface WorkoutPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Workout;
}

export function WorkoutPlayer({ isOpen, onClose, workout }: WorkoutPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = workout.steps[currentStep];

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
          zIndex: 100,
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'sans-serif'
        }}
      >
        <div style={{ position: 'relative', flex: 1, backgroundColor: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div 
                style={{
                  position: 'absolute',
                  inset: 0,
                  filter: 'blur(64px)',
                  opacity: 0.3,
                  backgroundImage: `url(${workout.coverImage})`,
                  backgroundSize: 'cover'
                }}
            />
            <button 
              onClick={onClose} 
              style={{ position: 'absolute', top: '48px', left: '24px', zIndex: 20, padding: '8px', backgroundColor: 'rgba(0,0,0,0.1)', backdropFilter: 'blur(12px)', borderRadius: '9999px', border: 'none', cursor: 'pointer' }}
            >
                <ChevronLeft size={24} color="black" />
            </button>
            
            <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80" 
                alt="Exercise"
                style={{ position: 'relative', zIndex: 10, height: '100%', width: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: 0.9 }}
            />
            
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '48px', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', zIndex: 20 }}>
                <span style={{ color: 'white', fontWeight: 500 }}>Workout Preview</span>
                <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', background: 'none', border: 'none', cursor: 'pointer' }}>Skip</button>
            </div>
        </div>

        <div style={{ height: '40vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px', position: 'relative', zIndex: 30 }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'black', margin: '0 0 4px' }}>{step?.title || workout.title}</h2>
            <p style={{ color: '#6b7280', fontWeight: 500, marginBottom: 'auto' }}>
                {step?.reps ? `${step.reps} Reps` : `${step?.duration || 30} Seconds`} • {step?.sets || 1} Sets
            </p>

            <button style={{ color: '#007AFF', fontWeight: 600, fontSize: '14px', marginBottom: '32px', letterSpacing: '0.05em', background: 'none', border: 'none', cursor: 'pointer' }}>
                INSTRUCTIONS
            </button>

            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px 32px' }}>
                <button 
                    style={{ color: 'black', fontWeight: 600, fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.5, background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => { triggerHapticLight(); setCurrentStep(Math.max(0, currentStep - 1)); }}
                >
                    PREV
                </button>
                <button 
                    onClick={() => {
                        triggerHapticLight();
                        setIsPlaying(!isPlaying);
                    }}
                    style={{ width: '64px', height: '64px', backgroundColor: '#1C1C1E', borderRadius: '9999px', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: 'none', cursor: 'pointer' }}
                >
                    {isPlaying ? <Pause size={28} fill="white" color="white" /> : <Play size={28} fill="white" color="white" style={{ marginLeft: '4px' }} />}
                </button>
                <button 
                    style={{ color: 'black', fontWeight: 600, fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => { 
                        triggerHapticMedium(); 
                        if (currentStep < workout.steps.length - 1) setCurrentStep(currentStep + 1); 
                        else onClose(); 
                    }}
                >
                    NEXT
                </button>
            </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}''',

    'src/features/dashboard/CaseDashboard.tsx': '''import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Lock, Flame } from 'lucide-react';
import { getCases } from '../../services/CaseEngine';
import { getProfile, isProUser, verifyProStatus } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { ActiveCaseBar } from '../../components/layout/AppShell';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { ZenBreathingPlayer } from '../../components/ui/ZenBreathingPlayer';
import { WorkoutPlayer } from '../../components/ui/WorkoutPlayer';
import { triggerHapticLight } from '../../services/haptics';
import { 
  getRecommendedWorkouts, 
  getAudioLibrary, 
  getArticles, 
  getPrograms,
  ContentItem,
  Workout
} from '../../services/ContentLibraryEngine';

export default function CaseDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  const [cases, setCases] = useState(getCases());
  const [profile, setProfile] = useState(getProfile());
  const [isPremium, setIsPremium] = useState(isProUser());
  
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showWorkout, setShowWorkout] = useState<Workout | null>(null);

  const workouts = getRecommendedWorkouts();
  const audioTracks = getAudioLibrary();
  const articles = getArticles();
  const programs = getPrograms();

  useEffect(() => {
    verifyProStatus().then(setIsPremium).catch(() => {});
    const refresh = () => {
      setCases(getCases());
      setProfile(getProfile());
    };
    window.addEventListener('hc_cases_updated', refresh);
    window.addEventListener('hc_profile_updated', refresh);
    return () => {
      window.removeEventListener('hc_cases_updated', refresh);
      window.removeEventListener('hc_profile_updated', refresh);
    };
  }, []);

  if (id) {
    const item = cases.find((c: any) => c.id === id);
    if (!item) return <div style={{ padding: '32px', textAlign: 'center', color: 'white' }}>Case not found.</div>;
    return (
      <div style={{ paddingTop: '80px', paddingLeft: '16px', paddingRight: '16px', color: 'white' }}>
        <button onClick={() => navigate('/app/today')} style={{ color: '#3b82f6', marginBottom: '16px', background: 'none', border: 'none', cursor: 'pointer' }}>&larr; Back to Today</button>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{item.title}</h1>
        <p style={{ color: '#9ca3af' }}>Clinical details view is preserved.</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'black', color: 'white', paddingBottom: '128px', paddingTop: '64px', fontFamily: 'sans-serif' }}>
      
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 4px' }}>Today</h1>
        <p style={{ color: '#9ca3af', fontWeight: 500, margin: 0 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div style={{ padding: '0 16px', marginBottom: '32px' }}>
        <ActiveCaseBar navigate={navigate} />
      </div>

      <SwimlaneCarousel title="Top Programs" subtitle="Most popular picks right now">
        {programs.map(prog => (
          <ImmersiveMediaCard
            key={prog.id}
            title={prog.title}
            subtitle={prog.subtitle}
            bgImage={prog.coverImage}
            aspectRatio="video"
            tags={prog.tags}
            duration={`${prog.episodes} EPISODES`}
            onClick={() => setSelectedContent(prog)}
          />
        ))}
      </SwimlaneCarousel>

      <SwimlaneCarousel title="Activity Types">
         <div 
           style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', height: '160px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer' }} 
           onClick={() => setSelectedContent(workouts[4])}
         >
            <img src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&q=80" style={{ width: '100%', height: '96px', objectFit: 'cover' }} />
            <span style={{ color: 'black', fontWeight: 'bold', textAlign: 'center', marginTop: '8px' }}>Yoga</span>
         </div>
         <div 
           style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', height: '160px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer' }} 
           onClick={() => setSelectedContent(workouts[3])}
         >
            <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80" style={{ width: '100%', height: '96px', objectFit: 'cover' }} />
            <span style={{ color: 'black', fontWeight: 'bold', textAlign: 'center', marginTop: '8px' }}>Strength</span>
         </div>
         <div 
           style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', height: '160px', backgroundColor: 'white', borderRadius: '24px', overflow: 'hidden', cursor: 'pointer' }} 
           onClick={() => setShowBreathing(true)}
         >
            <img src="https://images.unsplash.com/photo-1518085250985-78e7bbdf6a62?auto=format&fit=crop&q=80" style={{ width: '100%', height: '96px', objectFit: 'cover' }} />
            <span style={{ color: 'black', fontWeight: 'bold', textAlign: 'center', marginTop: '8px' }}>Meditation</span>
         </div>
      </SwimlaneCarousel>

      <SwimlaneCarousel title="Free Workouts @ Home">
        {workouts.map(workout => (
          <ImmersiveMediaCard
            key={workout.id}
            title={workout.title}
            bgImage={workout.coverImage}
            aspectRatio="wide"
            tags={workout.tags}
            duration={`${workout.duration} Min • ${workout.calories} Cal`}
            isPremium={workout.isPremium}
            onClick={() => {
                if(workout.isPremium && !isPremium) {
                   triggerHapticLight();
                } else {
                   setSelectedContent(workout);
                }
            }}
          />
        ))}
      </SwimlaneCarousel>

      <SwimlaneCarousel title="Mindfulness" subtitle="Relax and recover">
        {audioTracks.map(track => (
          <ImmersiveMediaCard
            key={track.id}
            title={track.title}
            subtitle={track.subtitle}
            bgImage={track.coverImage}
            aspectRatio="square"
            isPremium={track.isPremium}
            onClick={() => setSelectedContent(track)}
          >
             <div style={{ position: 'absolute', bottom: '16px', right: '16px', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', borderRadius: '9999px', padding: '8px' }}>
                <Play size={16} fill="white" />
             </div>
          </ImmersiveMediaCard>
        ))}
      </SwimlaneCarousel>

      <SwimlaneCarousel title="Articles for you" subtitle="Editor's Picks">
        {articles.map(article => (
          <div 
            key={article.id} 
            style={{ width: '300px', backgroundColor: 'white', borderRadius: '32px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} 
            onClick={() => setSelectedContent(article)}
          >
             <div style={{ height: '160px', position: 'relative' }}>
                <img src={article.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', bottom: '12px', left: '12px', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', padding: '4px 12px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                   <Flame size={12} color="#DC2626" />
                   <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'black', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Popular</span>
                </div>
             </div>
             <div style={{ padding: '20px' }}>
                <h3 style={{ color: 'black', fontWeight: 'bold', fontSize: '18px', lineHeight: 1.2, margin: '0 0 8px' }}>{article.title}</h3>
                <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500, margin: 0 }}>{article.readTime} min read</p>
             </div>
          </div>
        ))}
      </SwimlaneCarousel>

      <BottomSheetOverlay 
        isOpen={!!selectedContent} 
        onClose={() => setSelectedContent(null)}
        bgImage={selectedContent?.coverImage}
      >
         {selectedContent && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#0F0F11', margin: '-64px -24px 0', padding: '40px 24px 0', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', color: 'white' }}>
                <h1 style={{ fontSize: '30px', fontWeight: 800, margin: '0 0 4px' }}>{selectedContent.title}</h1>
                <p style={{ color: '#9ca3af', fontWeight: 500, margin: '0 0 24px' }}>
                    {selectedContent.duration ? `${selectedContent.duration} min` : ''} 
                    {selectedContent.subtitle ? ` • ${selectedContent.subtitle}` : ''}
                </p>
                <p style={{ color: '#d1d5db', lineHeight: 1.6, fontSize: '18px', margin: '0 0 32px' }}>
                    Feel the beauty of the surroundings, relax your mind, imagine being in nature, and soothe your spirit with rhythmic and harmonious breathing.
                </p>
                <div style={{ marginTop: 'auto', paddingBottom: '32px' }}>
                    <button 
                        style={{ width: '100%', backgroundColor: '#10B981', color: 'white', fontWeight: 'bold', fontSize: '18px', padding: '16px', borderRadius: '9999px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', border: 'none', cursor: 'pointer' }}
                        onClick={() => {
                            triggerHapticLight();
                            setSelectedContent(null);
                            if (selectedContent.category === 'Meditation') setShowBreathing(true);
                            if (selectedContent.type === 'workout') setShowWorkout(selectedContent as Workout);
                        }}
                    >
                        Start
                    </button>
                </div>
            </div>
         )}
      </BottomSheetOverlay>

      <ZenBreathingPlayer 
         isOpen={showBreathing} 
         onClose={() => setShowBreathing(false)} 
      />

      {showWorkout && (
         <WorkoutPlayer 
            isOpen={!!showWorkout} 
            onClose={() => setShowWorkout(null)}
            workout={showWorkout}
         />
      )}

    </div>
  );
}'''
}

for filepath, content in files.items():
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("All files rewritten securely with inline styles.")
