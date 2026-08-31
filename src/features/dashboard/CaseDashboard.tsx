import { useNavigate } from 'react-router-dom';
import { useActionIslandStore } from '../../store/actionIslandStore';
import { FitnessNav } from '../../components/ui/FitnessNav';
import {Activity, Bike, ChevronRight, Clock, Crosshair, Dumbbell, Flame, Footprints, Gamepad2, Heart, HeartPulse, Moon, MoreHorizontal, Music, Play, Settings2, Sparkles, Swords, Target, Waves, Wind, Zap, Share2, Bookmark} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';


import { useIsMobile } from '../../hooks/useIsMobile';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { WorkoutPlayer } from '../../components/ui/WorkoutPlayer';
import { triggerHapticLight } from '../../services/haptics';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { ContentDetailPage } from '../../components/ui/ContentDetailPage';
import { SensualLineChart } from '../../components/ui/SensualLineChart';

import { FatigueModeToggle } from '../../components/ui/FatigueModeToggle';

import { ImmersiveFeatureFeed } from './ImmersiveFeatureFeed';
import { CinematicCheckbox } from '../../components/ui/CinematicCheckbox';
import { getProfile } from '../../services/ProfileEngine';
import { ClinicalFrictionModal } from '../../components/ui/ClinicalFrictionModal';


export default function CaseDashboard() {
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [programs, setPrograms] = useState<any[]>([]);
  const [categories, setCategories] = useState<FitnessCategory[]>([]);
  const [featured, setFeatured] = useState<FitnessContent[]>([]);
  const [contentMap, setContentMap] = useState<Record<string, FitnessContent[]>>({});
  const [difficultyMap, setDifficultyMap] = useState<Record<string, FitnessContent[]>>({});
  const [specialtyContent, setSpecialtyContent] = useState<FitnessContent[]>([]);
  const [activeCollection, setActiveCollection] = useState<{title: string, items: FitnessContent[]} | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'fitness' | 'meditation'>('fitness');
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  useEffect(() => {
    const profile = getProfile();
    const tasks: any[] = [];
    if (profile?.medications?.length) {
      profile.medications.forEach((m: any, i: number) => tasks.push({ id: 'med_'+i, title: m.name || m, subtitle: 'Scheduled Medication' }));
    }
    if (tasks.length === 0) {
      tasks.push({ id: 'task_default', title: 'Complete Health Profile', subtitle: 'Takes 2 mins' });
    }
    setDailyTasks(tasks);
  }, []);


  const [selectedContent, setSelectedContent] = useState<FitnessContent | null>(null);
  const [activeMeditation, setActiveMeditation] = useState<FitnessContent | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);

  useEffect(() => {
    loadFitnessData();
  }, []);

  const handleProgramClick = async (prog: any) => {
    triggerHapticLight();
    try {
      const episodes = await FitnessService.getProgramEpisodes(prog.id);
      setActiveCollection({ title: prog.title, items: episodes.length > 0 ? episodes : featured });
    } catch (e) {
      setActiveCollection({ title: prog.title, items: featured });
    }
  };

  const loadFitnessData = async () => {
    try {
      setLoading(true);
      const [cats, feats, progs, allContent, specialty] = await Promise.all([
        FitnessService.getCategories(),
        FitnessService.getFeaturedContent(),
        FitnessService.getPrograms(),
        FitnessService.getAllActiveContent(),
        FitnessService.getSpecialtyContent()
      ]);
      
      const map: Record<string, FitnessContent[]> = {};
      const beginner: FitnessContent[] = [];
      const intermediate: FitnessContent[] = [];
      const advanced: FitnessContent[] = [];
      
      allContent.forEach(item => {
        // Group by Category
        if (!map[item.category_id]) map[item.category_id] = [];
        map[item.category_id].push(item);
        
        // Group by Difficulty
        if (item.difficulty === 'Beginner') beginner.push(item);
        if (item.difficulty === 'Intermediate') intermediate.push(item);
        if (item.difficulty === 'Advanced') advanced.push(item);
      });
      
      setPrograms(progs);
      setCategories(cats);
      setFeatured(feats);
      setContentMap(map);
      setDifficultyMap({
        'Beginner': beginner,
        'Intermediate': intermediate,
        'Advanced': advanced
      });
      setSpecialtyContent(specialty);
      setError(null);
    } catch (err) {
      console.error('Failed to load fitness data', err);
      setError('Unable to load fitness data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

    const getFallbackImage = (type: string, id: string) => {
    const num = id.charCodeAt(0) % 3;
    if (type === 'meditation' || type === 'breathwork' || type === 'soundscape') {
      return [
        'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=800&q=80'
      ][num];
    }
    if (type === 'yoga') {
      return [
        'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=800&q=80'
      ][num];
    }
    return [
      'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80'
    ][num];
  };

  const handleStartContent = (content: FitnessContent) => {
    setSelectedContent(null);
    if (content.type === 'meditation' || content.type === 'breathwork' || content.type === 'soundscape') {
      setActiveMeditation(content);
    } else {
      setActiveWorkout({
        ...content,
        steps: [
          { name: 'Warm up', duration: 60, image: content.cover_image_url || 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80' },
          { name: 'Main Activity', duration: 180, image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80' },
          { name: 'Cool down', duration: 60, image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80' }
        ]
      });
    }
  };

  


// Premium Apple-Style Components
const ProgramCard = ({ title, subtitle, gradient, icon, onClick }: any) => (
  <div onClick={onClick} style={{
    minWidth: '240px', height: '135px', borderRadius: '24px', background: gradient,
    padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden', flexShrink: 0
  }}>
    <div>
      <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>{title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: '13px', fontWeight: 500 }}>{subtitle}</p>
    </div>
    <div style={{ alignSelf: 'flex-end', color: 'rgba(255,255,255,0.9)' }}>
      {icon}
    </div>
  </div>
);

const VerticalWorkoutRow = ({ item, onClick, getFallbackImage }: any) => (
  <div onClick={onClick} style={{ display: 'flex', gap: '16px', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}>
    <div style={{ position: 'relative', width: '120px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0 }}>
      <img loading="lazy" decoding="async" src={item.cover_image_url || getFallbackImage(item.type, item.id)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {item.is_featured && (
        <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(255,255,255,0.9)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>
          NEW
        </div>
      )}
    </div>
    <div style={{ flex: 1, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }}>
      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h4>
      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
        {item.duration_minutes}min • {item.difficulty ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1) : 'Open'}
      </p>
    </div>
  </div>
);

const MeditationHeroCard = ({ item, onClick, getFallbackImage }: any) => (
  <div onClick={onClick} style={{
    width: '75vw', maxWidth: '260px', height: '220px', borderRadius: '24px', overflow: 'hidden', position: 'relative', cursor: 'pointer', flexShrink: 0,
    boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)'
  }}>
    <img loading="lazy" decoding="async" src={item.cover_image_url || getFallbackImage(item.type, item.id)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }} />
    <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
      <div>
        <h3 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>{item.title}</h3>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '8px', marginTop: '8px' }}>
          <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
            <div style={{ width: '2px', height: '8px', background: 'white', borderRadius: '1px' }} />
            <div style={{ width: '2px', height: '12px', background: 'white', borderRadius: '1px' }} />
            <div style={{ width: '2px', height: '8px', background: 'white', borderRadius: '1px' }} />
          </div>
          <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>Ambient</span>
        </div>
      </div>
      <button style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', minWidth: '40px', minHeight: '40px', flexShrink: 0 }}>
        <Play size={20} fill="#0F172A" color="#0F172A" style={{ marginLeft: '3px' }} />
      </button>
    </div>
  </div>
);

const MindfulnessGridItem = ({ item, onClick, getFallbackImage }: any) => (
  <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }}>
    <div style={{ aspectRatio: '1', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 16px -6px rgba(0,0,0,0.08)' }}>
      <img loading="lazy" decoding="async" src={item.cover_image_url || getFallbackImage(item.type, item.id)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
    <div>
      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h4>
      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94A3B8' }}>{item.duration_minutes} min</p>
    </div>
  </div>
);


  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF9F6', padding: '24px' }}>
        <p style={{ color: '#64748B', marginBottom: '16px', textAlign: 'center' }}>{error}</p>
        <button onClick={loadFitnessData} style={{ padding: '12px 24px', backgroundColor: '#10B981', color: 'white', borderRadius: '99px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '80px' }}>
        <div style={{ width: '100%', height: '140px', borderRadius: '24px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
        <div style={{ width: '40%', height: '24px', borderRadius: '8px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
        <div style={{ display: 'flex', gap: '16px', overflowX: 'hidden' }}>
          {[1,2,3].map(i => <div key={i} style={{ minWidth: '130px', height: '180px', borderRadius: '24px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />)}
        </div>
      </div>
    );
  }

  // Group content for the new Apple-style layout
  const allWorkouts = Object.values(contentMap).flat().filter(c => ['workout', 'hiit', 'strength', 'yoga'].includes(c.type));
  const beginnerWorkouts = allWorkouts.filter(w => w.difficulty === 'Beginner').slice(0, 4);
  const intermediateWorkouts = allWorkouts.filter(w => w.difficulty === 'Intermediate').slice(0, 4);
  
  const allMeditations = Object.values(contentMap).flat().filter(c => ['meditation', 'breathwork', 'soundscape'].includes(c.type));
  const heroMeditations = allMeditations.slice(0, 3);
  const gridMeditations = allMeditations.slice(3, 7);

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#FBF9F6', // Premium creme background for Apple style
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <FatigueModeToggle />

          <div style={{ paddingTop: "12px" }}>
          {/* Our Own Meditation Hub (Hero) */}
          <section>
            <div style={{ padding: '0 24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Our Own Meditation Hub</h2>
            </div>
            <div className="hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
              <MeditationHeroCard item={{ title: 'Full Meditation Environment', cover_image_url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80', type: 'meditation', id: 'm1' }} onClick={() => triggerHapticLight()} getFallbackImage={getFallbackImage} />
              <MeditationHeroCard item={{ title: 'A Diff Experience', cover_image_url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80', type: 'meditation', id: 'm2' }} onClick={() => triggerHapticLight()} getFallbackImage={getFallbackImage} />
            </div>
          </section>

          <div style={{ padding: '0 24px', marginBottom: '32px' }}><ImmersiveFeatureFeed /></div>
          {/* The Mindfulness Library */}
          <section style={{ padding: '0 12px' }}>
            <div style={{ padding: '0 12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>The Mindfulness Library</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Curated experiences for every mood</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Relaxing Sleep Music */}
              <div onClick={() => triggerHapticLight()} className="active-scale scroll-snap-item" style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80" alt="Relaxing Sleep Music" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 80%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                  <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Relaxing Sleep Music</h3>
                </div>
              </div>
              {/* Relaxing Study Music */}
              <div onClick={() => triggerHapticLight()} className="active-scale scroll-snap-item" style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80" alt="Relaxing Study Music" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 80%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                  <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Relaxing Study Music</h3>
                </div>
              </div>
              {/* Power Workout Songs */}
              <div onClick={() => triggerHapticLight()} className="active-scale scroll-snap-item" style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80" alt="Power Workout Songs" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, transparent 80%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                  <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Power Workout Songs</h3>
                </div>
              </div>
            </div>
          </section>


          </div>
        
        <div style={{ padding: '0 24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A', letterSpacing: '-0.5px' }}>Daily Clinical Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {dailyTasks.map(task => (
              <div key={task.id} onClick={() => task.id === 'task_2' && setShowFrictionModal(true)}>
                <CinematicCheckbox label={task.title} sublabel={task.subtitle} />
              </div>
            ))}
            <div onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)', color: '#FFF', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginTop: '8px', boxShadow: '0 12px 32px rgba(15,23,42,0.2)' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px', fontWeight: 700 }}>Enter Collaborative Health Canvas</span>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>1 new note from Dr. Jenkins</span>
              </div>
              <ChevronRight size={20} color="#FFF" />
            </div>
          </div>
        </div>
        <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><FitnessNav /></div>
      


      
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
            {false && (<>
                      {/* STEP 1: BROWSE PROGRAMS (The 7 Curated Collections) */}
            <section>
              <div style={{ padding: '0 24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '2px' }}>Browse Programs <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} /></h2>
                <span onClick={() => { triggerHapticLight(); setActiveCollection({title: "All Programs", items: featured}); }} style={{ fontSize: '15px', fontWeight: 600, color: '#10B981', cursor: 'pointer' }}>See All</span>
              </div>
              <div className="hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}>
                {programs.map((prog) => {
                  let IconComp = Zap;
                  if (prog.icon_name === 'Flame') IconComp = Flame;
                  if (prog.icon_name === 'Sparkles') IconComp = Sparkles;
                  if (prog.icon_name === 'Activity') IconComp = Activity;
                  if (prog.icon_name === 'Moon') IconComp = Moon;
                  if (prog.icon_name === 'Target') IconComp = Target;
                  if (prog.icon_name === 'Heart') IconComp = Heart;
                  
                  return (
                    <ProgramCard 
                      key={prog.id} 
                      title={prog.title} 
                      subtitle={prog.subtitle} 
                      gradient={prog.gradient} 
                      icon={<IconComp size={28} />} 
                      onClick={() => { triggerHapticLight(); setActiveCollection({title: 'Collection', items: featured || []}); }} 
                    />
                  );
                })}
              </div>
            </section>

            {/* STEP 3: DIFFICULTY HUBS (3 Banners) */}
            <section style={{ padding: '0 12px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Beginner Banner */}
                <div onClick={() => { triggerHapticLight(); setActiveCollection({title: "Beginner Workouts", items: difficultyMap["Beginner"] || []}); }} className="active-scale scroll-snap-item" style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80" alt="Beginner Workouts" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Beginner Workouts</h3>
                  </div>
                </div>

                {/* Intermediate Banner */}
                <div onClick={() => { triggerHapticLight(); setActiveCollection({title: "Intermediate Workouts", items: difficultyMap["Intermediate"] || []}); }} className="active-scale scroll-snap-item" style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80" alt="Intermediate Workouts" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Intermediate Workouts</h3>
                  </div>
                </div>

                {/* Advanced Banner */}
                <div onClick={() => { triggerHapticLight(); setActiveCollection({title: "Advanced Workouts", items: difficultyMap["Advanced"] || []}); }} className="active-scale scroll-snap-item" style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1511295742362-92c96b1cf484?w=800&q=80" alt="Advanced Workouts" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Advanced Workouts</h3>
                  </div>
                </div>

              </div>
            </section>

            {/* STEP 2: ACTIVITY TYPES (The 11 Modalities with Image Thumbnails) */}
            <section style={{ margin: '8px 0 24px' }}>
              <div style={{ padding: '0 24px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '2px' }}>Activity Types <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} /></h2>
              </div>
              <div className="hide-scrollbar scroll-snap-x" style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 24px 8px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
                
                {[
                  { name: 'Strength', icon: <Dumbbell size={20} />, img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&q=80', color: '#FF416C' },
                  { name: 'Yoga', icon: <Wind size={20} />, img: 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?w=400&q=80', color: '#8E2DE2' },
                  { name: 'Core', icon: <Target size={20} />, img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80', color: '#f5af19' },
                  { name: 'HIIT', icon: <Zap size={20} />, img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', color: '#FF4B2B' },
                  { name: 'Pilates', icon: <Sparkles size={20} />, img: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400&q=80', color: '#4A00E0' },
                  { name: 'Dance', icon: <Music size={20} />, img: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=400&q=80', color: '#fecfef' },
                  { name: 'Kickboxing', icon: <Swords size={20} />, img: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80', color: '#f12711' },
                  { name: 'Treadmill', icon: <Footprints size={20} />, img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80', color: '#00C9FF' },
                  { name: 'Cycling', icon: <Bike size={20} />, img: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80', color: '#11998e' },
                  { name: 'Rowing', icon: <Waves size={20} />, img: '/images/rowing-crew.png', color: '#3b82f6' },
                  { name: 'Cooldown', icon: <Moon size={20} />, img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80', color: '#66a6ff' }
                ].map((type, i) => (
                  <button 
                    key={i}
                    style={{
                      flexShrink: 0,
                      width: '130px',
                      height: '115px',
                      borderRadius: '20px',
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%), url(${type.img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '16px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02) translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 8px 20px ${type.color}40`;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1) translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                  >
                    <div style={{ color: type.color, background: 'rgba(255,255,255,0.9)', padding: '6px', borderRadius: '50%', display: 'flex' }}>
                      {type.icon}
                    </div>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.3px', textAlign: 'left', lineHeight: '1.1' }}>
                      {type.name}
                    </span>
                  </button>
                ))}

              </div>
            </section>

            </>)}
          {/* Our Own Music Library */}
          <section style={{ padding: '0 24px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Our Own Music Library <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} style={{ verticalAlign: 'middle' }} /></h2>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#10B981', cursor: 'pointer' }}>See All</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { title: 'Balm Music', duration: '45 min', img: 'https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=400&q=80' },
                { title: 'Calm Music', duration: '60 min', img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=400&q=80' },
                { title: 'Calm Songs 1', duration: '30 min', img: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=400&q=80' },
                { title: 'Calm Songs 2', duration: '20 min', img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80' }
              ].map((item, i) => (
                <div key={i} onClick={() => triggerHapticLight()} style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }}>
                  <div style={{ aspectRatio: '1', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 16px -6px rgba(0,0,0,0.08)' }}>
                    <img loading="lazy" decoding="async" src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h4>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94A3B8' }}>{item.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Soundscapes */}
          <section>
            <div style={{ padding: '0 24px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Soundscapes</h2>
            </div>
            <div className="hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
              {[
                { name: 'Rain Sounds', icon: <Waves size={24} />, color: '#3b82f6', img: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=400&q=80' },
                { name: 'Focus Frequencies', icon: <Activity size={24} />, color: '#8b5cf6', img: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=400&q=80' },
                { name: 'Forest Ambience', icon: <Wind size={24} />, color: '#10b981', img: 'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?w=400&q=80' }
              ].map((type, i) => (
                <button 
                  key={i}
                  style={{
                    flexShrink: 0, width: '140px', height: '140px', borderRadius: '50%',
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%), url(${type.img})`,
                    backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', padding: '16px', border: 'none', cursor: 'pointer',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                  }}
                  onClick={() => triggerHapticLight()}
                >
                  <div style={{ color: 'white', marginBottom: '8px' }}>{type.icon}</div>
                  <span style={{ color: 'white', fontWeight: 600, fontSize: '14px', textAlign: 'center', lineHeight: '1.2' }}>{type.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>


            {/* STEP 4: SPECIALTY & GAMING */}
            <section style={{ padding: '0 16px', marginBottom: '40px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '2px' }}>Specialty & Gaming <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} /></h2>
                <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Interactive fitness experiences</p>
              </div>
              <div style={{ borderRadius: '24px', overflow: 'hidden', position: 'relative', height: '180px', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)' }}>
                  <img loading="lazy" decoding="async" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800" alt="Mindful Play" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', flexDirection: 'column', padding: '20px' }}>
                    <div className="hide-scrollbar" style={{ display: 'flex', gap: '8px', marginBottom: 'auto', overflowX: 'auto', paddingBottom: '4px' }}>
                      <button onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setActiveCollection({title: "Activity Games", items: specialtyContent.filter(s => s.category_id === categories.find(c => c.slug === "hand-eye")?.id) || []}); }} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}><Gamepad2 size={16} /> Activity Games</button>
                      <button onClick={(e) => { e.stopPropagation(); triggerHapticLight(); setActiveCollection({title: "Hand-Eye Coordination", items: specialtyContent.filter(s => s.category_id === categories.find(c => c.slug === "hand-eye")?.id) || []}); }} style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '8px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }}><Crosshair size={16} /> Coordination</button>
                    </div>
                    <div>
                      <h3 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>Mindful Play</h3>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', margin: '4px 0 0' }}>Engage your senses with relaxing interactive games.</p>
                    </div>
                  </div>
                </div>
              </section>


          
      {/* Articles for You */}
        <section style={{ padding: '32px 0 100px' }}>
          <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#2E2B5F', letterSpacing: '-0.3px' }}>Articles for you</h2>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, cursor: 'pointer' }}>View all</span>
          </div>
          
          <div className="hide-scrollbar" style={{ display: 'flex', overflowX: 'auto', gap: '16px', padding: '0 24px 24px 24px', WebkitOverflowScrolling: 'touch', margin: 0 }}>
            {[
              { 
                title: 'Overcome Overthinking - 10 Simple Tips from a Therapist', 
                img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=500&q=80',
                isPopular: true
              },
              { 
                title: 'WANT TO GAIN MUSCLE? THE 6 MOST IMPORTANT RULES', 
                img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=80',
                isPopular: true
              }
            ].map((art, i) => (
              <div key={i} onClick={() => triggerHapticLight()} style={{ 
                width: '260px', 
                minWidth: '260px', 
                background: '#FFFFFF', 
                borderRadius: '16px', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)', 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden', 
                cursor: 'pointer' 
              }}>
                {/* Image Section */}
                <div style={{ position: 'relative', height: '150px', width: '100%' }}>
                  <img loading="lazy" decoding="async" src={art.img} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Badge */}
                  {art.isPopular && (
                    <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(255,255,255,0.85)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(4px)', minWidth: '40px', minHeight: '40px', flexShrink: 0 }}>
                      <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#2E2B5F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Flame size={8} color="#FFF" strokeWidth={3} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#2E2B5F' }}>Popular</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', backdropFilter: 'blur(4px)', padding: 0, minWidth: '32px', minHeight: '32px', flexShrink: 0 }}>
                      <Heart size={16} strokeWidth={1.5} />
                    </button>
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', backdropFilter: 'blur(4px)', padding: 0, minWidth: '32px', minHeight: '32px', flexShrink: 0 }}>
                      <Share2 size={16} strokeWidth={1.5} />
                    </button>
                    <button style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', backdropFilter: 'blur(4px)', padding: 0, minWidth: '32px', minHeight: '32px', flexShrink: 0 }}>
                      <Bookmark size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Text Section */}
                <div style={{ padding: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#2E2B5F', lineHeight: '1.4' }}>
                    {art.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>

      <ClinicalFrictionModal isOpen={showFrictionModal} onComplete={() => setShowFrictionModal(false)} />
      <ContentDetailPage 
        content={selectedContent}
        onClose={() => setSelectedContent(null)}
        onStart={handleStartContent}
      />

      {activeMeditation && (
        <MeditationPlayer 
          content={activeMeditation} 
          onClose={() => setActiveMeditation(null)} 
        />
      )}

      {activeWorkout && (
        <WorkoutPlayer 
          isOpen={!!activeWorkout} 
          onClose={() => setActiveWorkout(null)}
          workout={activeWorkout}
        />
      )}
    
      <BottomSheetOverlay isOpen={!!activeCollection} onClose={() => setActiveCollection(null)}>
        <div style={{ padding: '24px 20px', minHeight: '60vh' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', marginBottom: '24px', letterSpacing: '-0.5px' }}>
            {activeCollection?.title}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activeCollection?.items.length === 0 ? (
              <p style={{ color: '#64748B', textAlign: 'center', marginTop: '40px' }}>No content available in this collection yet.</p>
            ) : (
              activeCollection?.items.map(item => (
                <div key={item.id} style={{ height: '220px' }}>
                  <ImmersiveMediaCard
                    layoutId={`card-${item.id}`}
                    title={item.title}
                    subtitle={item.subtitle}
                    bgImage={item.cover_image_url || getFallbackImage(item.type, item.id)}
                    duration={`${item.duration_minutes} min`}
                    tags={[item.difficulty]}
                    isPremium={item.is_premium}
                    aspectRatio="wide"
                    onClick={() => {
                      triggerHapticLight();
                      setActiveCollection(null);
                      if (item.type === 'meditation' || item.type === 'soundscape' || item.type === 'sleep_story') {
                        setActiveMeditation(item);
                      } else {
                        setSelectedContent(item);
                      }
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </BottomSheetOverlay>
</div>
  );
};

