import React, { useState, useEffect } from 'react';
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
}