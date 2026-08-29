import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Play, Lock, Flame, Sparkles, Stethoscope } from 'lucide-react';
import { getCases } from '../../services/CaseEngine';
import { getProfile, isProUser, verifyProStatus } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
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
    <div style={{ minHeight: '100vh', paddingBottom: '128px', paddingTop: '16px', fontFamily: 'sans-serif', maxWidth: 1120, margin: '0 auto' }}>
      
      <div style={{ padding: '0 16px' }}>
        <section
          style={{
            borderRadius: 28,
            padding: isMobile ? '26px 24px' : '38px',
            color: '#fff',
            background: 'linear-gradient(135deg, #0f172a, #153d45 65%, #059669)',
            backdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(15,23,42,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            marginBottom: '32px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#99f6e4', fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: isMobile ? 12 : 16 }}>
            <Sparkles size={15} /> Your health command centre
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: isMobile ? 18 : 24, flexWrap: 'wrap', alignItems: 'end' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? 28 : 38, letterSpacing: -1.2, lineHeight: 1.1 }}>
                Good to see you{profile?.demographics?.name ? ', ' + (profile.demographics.name.split(' ')[0] || 'User') : '.'}
              </h1>
              <p style={{ color: '#cbd5e1', lineHeight: 1.5, maxWidth: 620, margin: '12px 0 0', fontSize: isMobile ? 14 : 16 }}>
                Start with parallel AI specialist perspectives, then bring their findings into a Deep Collaborative Specialist review for consensus when your case needs deeper correlation.
              </p>
            </div>
            <button onClick={() => navigate('/app/consult?new=true')} style={{ background: '#fff', color: '#0f172a', padding: isMobile ? '12px 16px' : '14px 20px', fontWeight: 800, width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', borderRadius: 99, border: 'none', cursor: 'pointer', fontSize: '16px' }}>
              <Stethoscope size={18} /> Start Quick Consult
            </button>
          </div>
        </section>
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
           style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', height: '160px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', cursor: 'pointer' }} 
           onClick={() => setSelectedContent(workouts[4])}
         >
            <img src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&q=80" style={{ width: '100%', height: '96px', objectFit: 'cover' }} />
            <span style={{ color: 'black', fontWeight: 'bold', textAlign: 'center', marginTop: '8px' }}>Yoga</span>
         </div>
         <div 
           style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', height: '160px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', cursor: 'pointer' }} 
           onClick={() => setSelectedContent(workouts[3])}
         >
            <img src="https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&q=80" style={{ width: '100%', height: '96px', objectFit: 'cover' }} />
            <span style={{ color: 'black', fontWeight: 'bold', textAlign: 'center', marginTop: '8px' }}>Strength</span>
         </div>
         <div 
           style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', height: '160px', backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', cursor: 'pointer' }} 
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
}