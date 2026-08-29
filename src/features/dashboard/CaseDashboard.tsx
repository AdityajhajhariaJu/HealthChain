import { FitnessNav } from '../../components/ui/FitnessNav';
import {Activity, Bike, ChevronRight, Clock, Crosshair, Dumbbell, Flame, Footprints, Gamepad2, Heart, HeartPulse, Moon, MoreHorizontal, Music, Play, Settings2, Sparkles, Swords, Target, Waves, Wind, Zap} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';


import { useIsMobile } from '../../hooks/useIsMobile';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { WorkoutPlayer } from '../../components/ui/WorkoutPlayer';
import { triggerHapticLight } from '../../services/haptics';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { ContentDetailPage } from '../../components/ui/ContentDetailPage';


export default function CaseDashboard() {
  const isMobile = useIsMobile();
  const [categories, setCategories] = useState<FitnessCategory[]>([]);
  const [featured, setFeatured] = useState<FitnessContent[]>([]);
  const [contentMap, setContentMap] = useState<Record<string, FitnessContent[]>>({});
  const [loading, setLoading] = useState(true);
  const [dashboardTab, setDashboardTab] = useState<'fitness' | 'meditation'>('fitness');


  const [selectedContent, setSelectedContent] = useState<FitnessContent | null>(null);
  const [activeMeditation, setActiveMeditation] = useState<FitnessContent | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<any>(null);

  useEffect(() => {
    loadFitnessData();
  }, []);

  const loadFitnessData = async () => {
    try {
      setLoading(true);
      const cats = await FitnessService.getCategories();
      const feats = await FitnessService.getFeaturedContent();
      
      const map: Record<string, FitnessContent[]> = {};
      for (const cat of cats) {
        map[cat.id] = await FitnessService.getContentByCategory(cat.id);
      }
      
      setCategories(cats);
      setFeatured(feats);
      setContentMap(map);
    } catch (err) {
      console.error('Failed to load fitness data', err);
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
      <img src={item.cover_image_url || getFallbackImage(item.type, item.id)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {item.is_featured && (
        <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(255,255,255,0.9)', color: '#000', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>
          NEW
        </div>
      )}
    </div>
    <div style={{ flex: 1, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h4>
      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
        {item.duration_minutes}min • {item.difficulty ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1) : 'Open'}
      </p>
    </div>
  </div>
);

const MeditationHeroCard = ({ item, onClick, getFallbackImage }: any) => (
  <div onClick={onClick} style={{
    minWidth: '300px', height: '220px', borderRadius: '24px', overflow: 'hidden', position: 'relative', cursor: 'pointer', flexShrink: 0,
    boxShadow: '0 12px 24px -8px rgba(0,0,0,0.15)'
  }}>
    <img src={item.cover_image_url || getFallbackImage(item.type, item.id)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
      <button style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
        <Play size={20} fill="#0F172A" color="#0F172A" style={{ marginLeft: '3px' }} />
      </button>
    </div>
  </div>
);

const MindfulnessGridItem = ({ item, onClick, getFallbackImage }: any) => (
  <div onClick={onClick} style={{ display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer' }}>
    <div style={{ aspectRatio: '1', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 8px 16px -6px rgba(0,0,0,0.08)' }}>
      <img src={item.cover_image_url || getFallbackImage(item.type, item.id)} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
    <div>
      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h4>
      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94A3B8' }}>{item.duration_minutes} min</p>
    </div>
  </div>
);


  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#10B981' }}>Loading Health Today...</div>;
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
      backgroundColor: '#FFFFFF', // Clean white background for Apple style
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><FitnessNav /></div>
      
      {/* Premium Toggle */}
      <div style={{ display: 'flex', gap: '24px', padding: '0 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <button 
          onClick={() => { triggerHapticLight(); setDashboardTab('fitness'); }}
          style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: '17px', fontWeight: 600, color: dashboardTab === 'fitness' ? '#0F172A' : '#94A3B8', borderBottom: dashboardTab === 'fitness' ? '2px solid #10B981' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
          Fitness programme
        </button>
        <button 
          onClick={() => { triggerHapticLight(); setDashboardTab('meditation'); }}
          style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: '17px', fontWeight: 600, color: dashboardTab === 'meditation' ? '#0F172A' : '#94A3B8', borderBottom: dashboardTab === 'meditation' ? '2px solid #10B981' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
          Meditation training
        </button>
      </div>

      {dashboardTab === 'fitness' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
                      {/* STEP 1: BROWSE PROGRAMS (The 7 Curated Collections) */}
            <section>
              <div style={{ padding: '0 24px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '2px' }}>Browse Programs <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} /></h2>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#10B981', cursor: 'pointer' }}>See All</span>
              </div>
              <div className="hide-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
                <ProgramCard title="Strength" subtitle="BUILD POWER" gradient="linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)" icon={<Flame size={28} />} onClick={() => {}} />
                <ProgramCard title="Pilates & Yoga" subtitle="FLEXIBILITY & CORE" gradient="linear-gradient(135deg, #4A00E0 0%, #8E2DE2 100%)" icon={<Sparkles size={28} />} onClick={() => {}} />
                <ProgramCard title="For Runners" subtitle="STAMINA & SPEED" gradient="linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)" icon={<Activity size={28} />} onClick={() => {}} />
                <ProgramCard title="Getting Started" subtitle="BEGINNER FRIENDLY" gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" icon={<Zap size={28} />} onClick={() => {}} />
                <ProgramCard title="Mindful & Relaxation" subtitle="RECOVER & BREATHE" gradient="linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)" icon={<Moon size={28} />} onClick={() => {}} />
                <ProgramCard title="For Outdoor Sports" subtitle="AGILITY & ARMOR" gradient="linear-gradient(135deg, #f12711 0%, #f5af19 100%)" icon={<Target size={28} />} onClick={() => {}} />
                <ProgramCard title="Women's Health" subtitle="EMPOWER & THRIVE" gradient="linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)" icon={<Heart size={28} />} onClick={() => {}} />
              </div>
            </section>

            {/* STEP 3: DIFFICULTY HUBS (3 Banners) */}
            <section style={{ padding: '0 12px', marginBottom: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* Beginner Banner */}
                <div style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img src="https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80" alt="Beginner Workouts" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Beginner Workouts</h3>
                  </div>
                </div>

                {/* Intermediate Banner */}
                <div style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80" alt="Intermediate Workouts" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 100%)', display: 'flex', alignItems: 'center', padding: '0 24px' }}>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px' }}>Intermediate Workouts</h3>
                  </div>
                </div>

                {/* Advanced Banner */}
                <div style={{ position: 'relative', height: '110px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                  <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80" alt="Advanced Workouts" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <div className="hide-scrollbar" style={{ display: 'flex', gap: '12px', overflowX: 'auto', padding: '0 24px 8px', scrollbarWidth: 'none', margin: '0 -24px', WebkitOverflowScrolling: 'touch' }}>
                
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

            {/* STEP 4: SPECIALTY & GAMING */}
            <section style={{ padding: '0 16px', marginBottom: '40px' }}>
              <div style={{ marginBottom: '16px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '2px' }}>Specialty & Gaming <ChevronRight size={22} color="#94A3B8" strokeWidth={2.5} /></h2>
                <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Interactive fitness experiences</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Activity Games */}
                <div style={{ borderRadius: '20px', overflow: 'hidden', position: 'relative', height: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <img src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=600&q=80" alt="Activity Games" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px' }}>
                    <Gamepad2 size={24} color="#10B981" style={{ marginBottom: '8px' }} />
                    <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: 700, lineHeight: 1.1 }}>Activity<br/>Games</h3>
                  </div>
                </div>
                {/* Hand-Eye Coordination */}
                <div style={{ borderRadius: '20px', overflow: 'hidden', position: 'relative', height: '180px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80" alt="Hand-Eye Coordination" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px' }}>
                    <Crosshair size={24} color="#3b82f6" style={{ marginBottom: '8px' }} />
                    <h3 style={{ color: 'white', margin: 0, fontSize: '16px', fontWeight: 700, lineHeight: 1.1 }}>Hand-Eye<br/>Coordination</h3>
                  </div>
                </div>
              </div>
            </section>

        </div>
      )}

      {dashboardTab === 'meditation' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* 1. Ambient Hero Cards */}
          <section>
            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', padding: '0 24px 16px', scrollbarWidth: 'none', margin: '0 -24px' }}>
              {heroMeditations.map(item => (
                <MeditationHeroCard key={item.id} item={item} getFallbackImage={getFallbackImage} onClick={() => { triggerHapticLight(); setSelectedContent(item); }} />
              ))}
              {heroMeditations.length === 0 && (
                <MeditationHeroCard item={{ title: 'Stressed', cover_image_url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80', type: 'meditation' }} getFallbackImage={getFallbackImage} onClick={() => {}} />
              )}
            </div>
          </section>

          {/* 2. Mindfulness Grid */}
          <section style={{ padding: '0 24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>Mindfulness</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {gridMeditations.length > 0 ? gridMeditations.map(item => (
                <MindfulnessGridItem key={item.id} item={item} getFallbackImage={getFallbackImage} onClick={() => { triggerHapticLight(); setSelectedContent(item); }} />
              )) : (
                <>
                  <MindfulnessGridItem item={{ title: 'Mindful Breathing', duration_minutes: 10, type: 'meditation', id: '1' }} getFallbackImage={getFallbackImage} onClick={() => {}} />
                  <MindfulnessGridItem item={{ title: 'Gratitude Guide', duration_minutes: 5, type: 'meditation', id: '2' }} getFallbackImage={getFallbackImage} onClick={() => {}} />
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Shared Knowledge Base (Articles) */}
      <section style={{ padding: '32px 24px 100px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px', color: '#0F172A' }}>Knowledge Base</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { title: 'The Science of Sleep', subtitle: 'Read • 5 min', img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&q=80' },
            { title: 'Nutrition for Recovery', subtitle: 'Read • 8 min', img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80' }
          ].map((art, i) => (
            <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden' }}>
                <img src={art.img} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>{art.title}</h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>{art.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

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
    </div>
  );
};

