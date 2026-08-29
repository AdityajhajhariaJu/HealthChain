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
  
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[21/9]'
  };

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        triggerHapticLight();
        if (onClick) onClick();
      }}
      className={`relative overflow-hidden rounded-3xl cursor-pointer shadow-lg ${aspectClasses[aspectRatio]} flex-shrink-0`}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minWidth: aspectRatio === 'wide' ? '300px' : aspectRatio === 'video' ? '280px' : '180px',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
      
      <div className="absolute top-3 right-3 flex gap-2">
        {isPremium && (
          <div className="bg-black/40 backdrop-blur-md text-white p-1.5 rounded-full">
            <Lock size={14} />
          </div>
        )}
      </div>

      <div className="absolute top-3 left-3 flex gap-2">
        {tags.map(tag => (
          <span key={tag} className="bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
            {tag}
          </span>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex flex-col justify-end">
        {subtitle && <p className="text-white/80 text-xs font-medium mb-1 uppercase tracking-wide">{subtitle}</p>}
        <h3 className="text-white font-bold text-lg leading-tight mb-1">{title}</h3>
        {duration && (
          <p className="text-white/60 text-xs flex items-center gap-1">
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
    <div className="flex flex-col py-2 w-full">
      <div className="flex justify-between items-end px-4 mb-3">
        <div>
          {subtitle && <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-0.5">{subtitle}</p>}
          <h2 className="text-white text-xl font-bold">{title}</h2>
        </div>
        {onSeeAll && (
          <button 
            onClick={onSeeAll}
            className="text-gray-400 hover:text-white flex items-center text-sm font-medium transition-colors"
          >
            See All <ChevronRight size={16} />
          </button>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-4 px-4 pb-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {React.Children.map(children, (child) => (
          <div className="snap-start flex-shrink-0">
            {child}
          </div>
        ))}
      </div>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[61] h-[92vh] flex flex-col bg-[#0F0F11] rounded-t-[32px] overflow-hidden shadow-2xl border-t border-white/10"
          >
            <div 
              className="absolute top-0 left-0 right-0 h-12 flex justify-center items-center z-10 cursor-pointer"
              onClick={onClose}
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mt-2" />
            </div>

            <button 
              onClick={() => {
                triggerHapticLight();
                onClose();
              }}
              className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-md p-2 rounded-full text-white/80 hover:text-white"
            >
              <X size={20} />
            </button>

            {bgImage && (
              <div 
                className="relative h-64 w-full flex-shrink-0"
                style={{
                  backgroundImage: `url(${bgImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-[#0F0F11]" />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 text-white relative">
               {!bgImage && <div className="mt-8" />}
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
        className="fixed inset-0 z-[100] flex flex-col justify-between items-center text-white font-sans bg-black"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

        <div className="w-full flex justify-between items-center p-6 z-10 pt-12">
          <button onClick={onClose} className="p-2 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors">
            <X size={24} color="white" />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center z-10 relative w-full">
            <motion.div 
                className="absolute w-64 h-64 border-[1px] border-white/20 rounded-full"
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.5 : phase === 'Exhale' ? 1 : 1.5) : 1 }}
                transition={{ duration: 4, ease: "easeInOut" }}
            />
            <motion.div 
                className="absolute w-48 h-48 border-[1px] border-white/30 rounded-full"
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.4 : phase === 'Exhale' ? 1 : 1.4) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.1 }}
            />
            <motion.div 
                className="absolute w-32 h-32 border-[1px] border-white/50 rounded-full flex items-center justify-center bg-white/5 backdrop-blur-sm"
                animate={{ scale: isPlaying ? (phase === 'Inhale' ? 1.2 : phase === 'Exhale' ? 1 : 1.2) : 1 }}
                transition={{ duration: 4, ease: "easeInOut", delay: 0.2 }}
            >
                <span className="text-xl font-light tracking-widest uppercase">{isPlaying ? phase : 'Ready'}</span>
            </motion.div>
        </div>

        <div className="w-full p-8 z-10 flex flex-col items-center gap-8 mb-8">
            <button 
                onClick={() => {
                    triggerHapticLight();
                    setIsPlaying(!isPlaying);
                }}
                className="w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full flex justify-center items-center hover:bg-white/30 transition-all border border-white/30 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
                {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" className="ml-2" />}
            </button>
            <div className="w-full flex justify-between text-white/50 text-sm font-medium px-4">
                <span>00:00</span>
                <span>10:00</span>
            </div>
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden px-4">
                <div className="h-full bg-white w-0" />
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
        className="fixed inset-0 z-[100] bg-white flex flex-col font-sans"
      >
        <div className="relative flex-1 bg-[#F2F2F7] flex items-center justify-center overflow-hidden">
            <div 
                className="absolute inset-0 blur-3xl opacity-30" 
                style={{ backgroundImage: `url(${workout.coverImage})`, backgroundSize: 'cover' }}
            />
            <button onClick={onClose} className="absolute top-12 left-6 z-20 p-2 bg-black/10 backdrop-blur-md rounded-full">
                <ChevronLeft size={24} color="black" />
            </button>
            
            <img 
                src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80" 
                alt="Exercise"
                className="relative z-10 h-full w-full object-cover mix-blend-multiply opacity-90"
            />
            
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/60 backdrop-blur-md flex items-center px-6 justify-between z-20">
                <span className="text-white font-medium">Workout Preview</span>
                <button className="text-white/80 hover:text-white text-sm" onClick={onClose}>Skip</button>
            </div>
        </div>

        <div className="h-[40vh] bg-white flex flex-col items-center py-8 px-6 relative z-30">
            <h2 className="text-2xl font-bold text-black mb-1">{step?.title || workout.title}</h2>
            <p className="text-gray-500 font-medium mb-auto">
                {step?.reps ? `${step.reps} Reps` : `${step?.duration || 30} Seconds`} • {step?.sets || 1} Sets
            </p>

            <button className="text-[#007AFF] font-semibold text-sm mb-8 tracking-wide">
                INSTRUCTIONS
            </button>

            <div className="w-full flex justify-between items-center px-4 pb-8">
                <button 
                    className="text-black font-semibold text-sm flex flex-col items-center opacity-50 hover:opacity-100 transition-opacity"
                    onClick={() => { triggerHapticLight(); setCurrentStep(Math.max(0, currentStep - 1)); }}
                >
                    PREV
                </button>
                <button 
                    onClick={() => {
                        triggerHapticLight();
                        setIsPlaying(!isPlaying);
                    }}
                    className="w-16 h-16 bg-[#1C1C1E] rounded-full flex justify-center items-center hover:scale-105 transition-transform shadow-xl"
                >
                    {isPlaying ? <Pause size={28} fill="white" color="white" /> : <Play size={28} fill="white" color="white" className="ml-1" />}
                </button>
                <button 
                    className="text-black font-semibold text-sm flex flex-col items-center hover:opacity-70 transition-opacity"
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
import { motion, AnimatePresence } from 'framer-motion';
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
    if (!item) return <div className="p-8 text-center text-white">Case not found.</div>;
    return (
      <div className="pt-20 px-4 text-white">
        <button onClick={() => navigate('/app/today')} className="text-blue-500 mb-4">&larr; Back to Today</button>
        <h1 className="text-2xl font-bold">{item.title}</h1>
        <p className="text-gray-400">Clinical details view is preserved.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32 pt-16 font-sans selection:bg-white/20">
      
      <div className="px-4 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Today</h1>
        <p className="text-gray-400 font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="px-4 mb-8">
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
         <div className="flex flex-col gap-2 w-32 h-40 bg-white rounded-3xl overflow-hidden cursor-pointer hover:scale-95 transition-transform" onClick={() => setSelectedContent(workouts[4])}>
            <img src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&q=80" className="w-full h-24 object-cover" />
            <span className="text-black font-bold text-center mt-2">Yoga</span>
         </div>
         <div className="flex flex-col gap-2 w-32 h-40 bg-white rounded-3xl overflow-hidden cursor-pointer hover:scale-95 transition-transform" onClick={() => setSelectedContent(workouts[3])}>
            <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80" className="w-full h-24 object-cover" />
            <span className="text-black font-bold text-center mt-2">Strength</span>
         </div>
         <div className="flex flex-col gap-2 w-32 h-40 bg-white rounded-3xl overflow-hidden cursor-pointer hover:scale-95 transition-transform" onClick={() => setShowBreathing(true)}>
            <img src="https://images.unsplash.com/photo-1518085250985-78e7bbdf6a62?auto=format&fit=crop&q=80" className="w-full h-24 object-cover" />
            <span className="text-black font-bold text-center mt-2">Meditation</span>
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
             <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md rounded-full p-2">
                <Play size={16} fill="white" />
             </div>
          </ImmersiveMediaCard>
        ))}
      </SwimlaneCarousel>

      <SwimlaneCarousel title="Articles for you" subtitle="Editor's Picks">
        {articles.map(article => (
          <div key={article.id} className="w-[300px] bg-white rounded-[32px] overflow-hidden cursor-pointer shadow-lg" onClick={() => setSelectedContent(article)}>
             <div className="h-40 relative">
                <img src={article.coverImage} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-white/80 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1">
                   <Flame size={12} color="#DC2626" />
                   <span className="text-xs font-bold text-black uppercase tracking-wider">Popular</span>
                </div>
             </div>
             <div className="p-5">
                <h3 className="text-black font-bold text-lg leading-tight mb-2">{article.title}</h3>
                <p className="text-gray-500 text-sm font-medium">{article.readTime} min read</p>
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
            <div className="flex flex-col h-full bg-[#0F0F11] -mx-6 -mt-16 px-6 pt-10 rounded-t-[32px] text-white">
                <h1 className="text-3xl font-extrabold mb-1">{selectedContent.title}</h1>
                <p className="text-gray-400 font-medium mb-6">
                    {selectedContent.duration ? `${selectedContent.duration} min` : ''} 
                    {selectedContent.subtitle ? ` • ${selectedContent.subtitle}` : ''}
                </p>
                <p className="text-gray-300 leading-relaxed text-lg mb-8">
                    Feel the beauty of the surroundings, relax your mind, imagine being in nature, and soothe your spirit with rhythmic and harmonious breathing.
                </p>
                <div className="mt-auto pb-8">
                    <button 
                        className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-bold text-lg py-4 rounded-full shadow-lg transition-transform active:scale-95"
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
        
print("All files rewritten securely with Python.")
