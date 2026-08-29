import { FitnessNav } from '../../components/ui/FitnessNav';
import React, { useState, useEffect, useRef } from 'react';
import { Play, Settings2, Sparkles, Flame, Clock, HeartPulse, MoreHorizontal } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { WorkoutPlayer } from '../../components/ui/WorkoutPlayer';
import { triggerHapticLight } from '../../services/haptics';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { ContentDetailPage } from '../../components/ui/ContentDetailPage';


export const CaseDashboard: React.FC = () => {
  const isMobile = useIsMobile();
  const [categories, setCategories] = useState<FitnessCategory[]>([]);
  const [featured, setFeatured] = useState<FitnessContent[]>([]);
  const [contentMap, setContentMap] = useState<Record<string, FitnessContent[]>>({});
  const [loading, setLoading] = useState(true);

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
          { name: 'Warm up', duration: 60, image: content.cover_image_url || 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80' },
          { name: 'Main Activity', duration: 180, image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=800&q=80' },
          { name: 'Cool down', duration: 60, image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80' }
        ]
      });
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#10B981' }}>Loading Health Today...</div>;
  }

  return (
    <div style={{
      width: '100%',
      backgroundColor: '#F0FDFA', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'hidden'
    }}>
      <div style={{ paddingTop: isMobile ? "12px" : "24px" }}><FitnessNav /></div>
      <div style={{ padding: isMobile ? '12px 16px 0' : '24px 32px 0' }}>
        <section
          style={{
            position: 'relative',
            borderRadius: isMobile ? '20px' : '24px',
            padding: isMobile ? '20px 20px' : '32px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            marginBottom: '8px'
          }}
        >
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.95) 0%, rgba(4,120,87,0.95) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }} />
          <div style={{
            position: 'absolute', top: '-10%', right: '-5%', width: '150px', height: '150px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)',
            borderRadius: '50%', zIndex: 0, filter: 'blur(20px)'
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '12px',
                display: 'flex', alignItems: 'center', gap: '4px', backdropFilter: 'blur(4px)'
              }}>
                <Sparkles size={12} color="white" />
                <span style={{ color: 'white', fontSize: '11px', fontWeight: '600', letterSpacing: '0.5px' }}>HEALTH COMMAND CENTRE</span>
              </div>
            </div>

            <h1 style={{
              margin: '0', color: 'white', fontWeight: '800', lineHeight: 1.1,
              fontSize: isMobile ? '26px' : '34px', letterSpacing: '-0.5px'
            }}>
              Good to see you, <span style={{ color: '#A7F3D0' }}>Aditya.</span>
            </h1>

            <p style={{
              color: 'rgba(255,255,255,0.9)', fontSize: '14px', lineHeight: 1.4,
              margin: 0, maxWidth: '280px', fontWeight: 500
            }}>
              Your daily health insights and active plans are looking excellent today.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button 
                style={{
                  background: 'white', color: '#047857', border: 'none',
                  padding: '10px 20px', borderRadius: '14px', fontWeight: '700',
                  fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', cursor: 'pointer',
                  whiteSpace: 'nowrap', flexShrink: 0
                }}
                onClick={triggerHapticLight}
              >
                <Play size={14} fill="#047857" /> Quick Consult
              </button>
              <button 
                style={{
                  background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)',
                  padding: '10px', borderRadius: '14px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(8px)', flexShrink: 0
                }}
                onClick={triggerHapticLight}
              >
                <Settings2 size={16} />
              </button>
            </div>
          </div>
        </section>
      </div>

      
      {/* 1. Top Programs (Most Popular) */}
      <SwimlaneCarousel title="Top Programs" subtitle="Most popular picks right now">
        {featured.length > 0 ? featured.map(item => (
          <ImmersiveMediaCard
            key={item.id}
            title={item.title}
            subtitle={item.subtitle || `DESIGNED FOR ${item.difficulty.toUpperCase()}`}
            bgImage={item.cover_image_url || getFallbackImage(item.type, item.id)}
            aspectRatio="video"
            duration={item.type === 'workout' ? `${item.duration_minutes} MIN` : '12 EPISODES'}
            isPremium={item.is_premium}
            onClick={() => { triggerHapticLight(); setSelectedContent(item); }}
          />
        )) : (
          <ImmersiveMediaCard
            title="12 Stretchy Yoga Flows"
            subtitle="DESIGNED FOR RELAXATION"
            bgImage="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80"
            aspectRatio="video"
            duration="12 EPISODES"
            isPremium={false}
            onClick={() => { triggerHapticLight(); }}
          />
        )}
      </SwimlaneCarousel>

      {/* 2. Activity Types (Bento Grid) */}
      <SwimlaneCarousel title="Activity Types">
        {categories.map((cat, i) => (
          <div 
            key={cat.id}
            style={{ 
              display: 'flex', flexDirection: 'column', gap: '8px', width: '128px', height: '160px', 
              backgroundColor: 'white', borderRadius: '24px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', 
              border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden', cursor: 'pointer', flexShrink: 0 
            }} 
            onClick={() => {
              triggerHapticLight();
              const catItems = contentMap[cat.id];
              if (catItems && catItems.length > 0) setSelectedContent(catItems[0]);
            }}
          >
            <img 
              src={getFallbackImage(cat.slug, cat.id)} 
              style={{ width: '100%', height: '96px', objectFit: 'cover' }} 
              alt={cat.label} 
            />
            <span style={{ color: '#0F172A', fontWeight: '700', textAlign: 'center', marginTop: '8px', fontSize: '14px' }}>
              {cat.label}
            </span>
          </div>
        ))}
      </SwimlaneCarousel>

      {/* 3. Free Workouts @ Home */}
      <SwimlaneCarousel title="Free Workouts @ Home">
        {categories.filter(c => ['hiit', 'strength', 'running'].includes(c.slug)).map(cat => 
          (contentMap[cat.id] || []).map(item => (
            <ImmersiveMediaCard
              key={item.id}
              title={item.title}
              subtitle={`${item.duration_minutes} Min ${item.calories_estimate ? ' • ' + item.calories_estimate + ' Cal' : ''}`}
              bgImage={item.cover_image_url || getFallbackImage(item.type, item.id)}
              aspectRatio="wide"
              tags={[cat.label.toUpperCase()]}
              isPremium={item.is_premium}
              onClick={() => { triggerHapticLight(); setSelectedContent(item); }}
            />
          ))
        ).flat()}
      </SwimlaneCarousel>

      {/* 4. Mental Wellness & Focus */}
      <SwimlaneCarousel title="Mental Wellness & Focus">
        {categories.filter(c => ['meditation', 'yoga'].includes(c.slug)).map(cat => 
          (contentMap[cat.id] || []).map(item => (
            <ImmersiveMediaCard
              key={item.id}
              title={item.title}
              subtitle={`${item.duration_minutes} Min`}
              bgImage={item.cover_image_url || getFallbackImage(item.type, item.id)}
              aspectRatio="square"
              tags={['MINDFULNESS']}
              isPremium={item.is_premium}
              onClick={() => { triggerHapticLight(); setSelectedContent(item); }}
            />
          ))
        ).flat()}
      </SwimlaneCarousel>


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
}

export default CaseDashboard;


