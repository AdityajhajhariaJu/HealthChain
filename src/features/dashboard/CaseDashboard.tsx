import { useNavigate } from 'react-router-dom';
import { useActionIslandStore } from '../../store/actionIslandStore';
import { FitnessNav } from '../../components/ui/FitnessNav';
import { 
  Activity, 
  ChevronRight, 
  Clock, 
  Crosshair, 
  Flame, 
  Gamepad2, 
  Heart, 
  Play, 
  Waves, 
  Wind, 
  Share2, 
  Bookmark, 
  Pin, 
  Scan,
  Check,
  Droplets,
  Sparkles,
  BookOpen,
  Award,
  X,
  ShieldCheck
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

import { useIsMobile } from '../../hooks/useIsMobile';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { WorkoutPlayer } from '../../components/ui/WorkoutPlayer';
import { ARGroceryLens } from '../../components/ui/ARGroceryLens';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { ContentDetailPage } from '../../components/ui/ContentDetailPage';
import { SensualLineChart } from '../../components/ui/SensualLineChart';

import { FatigueModeToggle } from '../../components/ui/FatigueModeToggle';

import { getProfile } from '../../services/ProfileEngine';
import { ClinicalFrictionModal } from '../../components/ui/ClinicalFrictionModal';

export interface MedicalArticle {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  role: string;
  readTime: string;
  img: string;
  category: string;
  keyTakeaways: string[];
  sections: { heading: string; body: string }[];
}

export const CLINICAL_ARTICLES: MedicalArticle[] = [
  {
    id: 'art-overthinking',
    title: 'Overcome Overthinking — 10 Evidence-Based Strategies',
    subtitle: 'Clinical Cognitive Restructuring & Somatic Regulation',
    author: 'Dr. Sarah Jenkins, MD',
    role: 'Board-Certified Neuropsychiatrist & Sleep Specialist',
    readTime: '4 min read',
    img: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&q=80',
    category: 'Cognitive Health',
    keyTakeaways: [
      'Rumination activates the Default Mode Network (DMN), suppressing executive prefrontal cortex focus.',
      'The 5-4-3-2-1 Sensory Grounding protocol resets acute sympathetic nervous overdrive in 90 seconds.',
      'Scheduling a 20-minute daily "Worry Window" reduces nocturnal cognitive intrusion by 47%.'
    ],
    sections: [
      {
        heading: '1. The Neurobiology of the Overthinking Loop',
        body: 'Overthinking is not a personality flaw—it is an evolutionary threat-simulation reflex run amok. When the amygdala senses ambiguity, it triggers the Default Mode Network (DMN) to repetitively project worst-case scenarios. Without conscious somatic intervention, elevated cortisol and norepinephrine sustain an autonomic feedback loop that impairs sleep and immune resilience.'
      },
      {
        heading: '2. Somatic Interrupt: The Physiological Vagal Reset',
        body: 'When you notice circular ruminative thoughts, cognitive rationalizing rarely works because blood flow has shifted away from Broca’s verbal region. Instead, perform a double nasal inhale followed by an elongated, unforced oral exhale (the physiological sigh). This activates baroreceptor firing, lowers heart rate within three cycles, and restores prefrontal blood perfusion.'
      },
      {
        heading: '3. Cognitive Defusion & The Worry Window',
        body: 'Designate a strict 20-minute window at 4:30 PM each day. When intrusive anxieties surface during work or rest, mentally file them: "I will thoroughly analyze this at 4:30 PM." Clinical trials show that over 82% of perceived crises dissolve before the scheduled window arrives.'
      }
    ]
  },
  {
    id: 'art-muscle-hypertrophy',
    title: 'Want to Gain Muscle? The 6 Most Important Clinical Rules',
    subtitle: 'Myofibrillar Protein Synthesis, Mechanical Tension & Recovery',
    author: 'Dr. Marcus Vance, PhD, CSCS',
    role: 'Exercise Physiologist & Metabolic Researcher',
    readTime: '5 min read',
    img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80',
    category: 'Metabolic & Musculoskeletal',
    keyTakeaways: [
      'Mechanical tension within 1-3 Reps in Reserve (RIR) is the primary driver of myofibrillar hypertrophy.',
      'Daily protein intake should target 1.6 to 2.2g per kg of bodyweight distributed across 3-4 leucine-rich boluses.',
      'Over 70% of nightly Growth Hormone secretion occurs during Delta slow-wave sleep.'
    ],
    sections: [
      {
        heading: '1. Prioritize Mechanical Tension Over Metabolic Fatigue',
        body: 'Lactic acid "burn" and sweat do not equal muscle hypertrophy. True muscle growth requires high mechanical tension across muscle fibers, recruiting high-threshold Motor Units (Type IIx fibers). This occurs when sets are performed within 0 to 3 reps of muscular failure.'
      },
      {
        heading: '2. The Leucine Trigger & Protein Timing',
        body: 'Muscle Protein Synthesis (MPS) operates like an all-or-none biological switch. To trigger the mTORC1 pathway, each feeding requires approximately 2.7 to 3.0 grams of the branched-chain amino acid leucine. Distributing daily protein into 3 to 4 meals containing 30-45g each significantly outperforms continuous grazing.'
      },
      {
        heading: '3. Slow-Wave Sleep: The Primary Anabolic Window',
        body: 'Chronically sleeping less than 6.5 hours elevates evening cortisol, impairs insulin sensitivity by up to 25%, and blunts overnight myofibrillar protein synthesis. Deep sleep is when cellular repair, glycogen replenishment, and testosterone production peak.'
      }
    ]
  }
];


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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboardTab, setDashboardTab] = useState<'fitness' | 'meditation'>('fitness');
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [showARLens, setShowARLens] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<MedicalArticle | null>(null);

  // Point 3: Interactive Daily Habit Bento Stack
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`healthchain_habits_${todayDateStr}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const toggleHabit = (habitId: string, title: string) => {
    const isNowDone = !completedHabits[habitId];
    const next = { ...completedHabits, [habitId]: isNowDone };
    setCompletedHabits(next);
    try {
      localStorage.setItem(`healthchain_habits_${todayDateStr}`, JSON.stringify(next));
    } catch (e) {
      // ignore
    }

    if (isNowDone) {
      triggerHapticSuccess();
      awardPoints(2, `Daily Habit: ${title}`, 'lifestyle', `habit_${habitId}_${todayDateStr}`);
    } else {
      triggerHapticLight();
    }
  };

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
      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#BAE6FD' }}>{item.duration_minutes} min</p>
    </div>
  </div>
);


  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF2E8', padding: '24px' }}>
        <p style={{ color: '#64748B', marginBottom: '16px', textAlign: 'center' }}>{error}</p>
        <button onClick={loadFitnessData} style={{ padding: '12px 24px', backgroundColor: '#10B981', color: 'white', borderRadius: '99px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
          Try Again
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '80px', backgroundColor: '#FFF2E8', minHeight: '100vh' }}>
        <div style={{ width: '100%', height: '140px', borderRadius: '24px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
        <div style={{ width: '40%', height: '24px', borderRadius: '8px', background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 2s infinite' }} />
        <div style={{ display: 'flex', gap: '16px', overflowX: 'clip' }}>
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
      background: 'linear-gradient(180deg, #FFF8F4 0%, #FFF2E8 35%, #FDF0E7 100%)',
      backgroundColor: '#FFF2E8',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : '40px',
      overflowX: 'clip'
    }}>
      <FatigueModeToggle />
        
                  <div style={{ padding: '0 24px 24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 16px', color: '#0F172A', letterSpacing: '-0.5px' }}>Dashboard</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            
            {/* The Glassmorphic Arch Canvas Tile */}
              <div 
                onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
                style={{background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', gridRow: 'span 2',
                  borderRadius: '160px 160px 32px 32px', 
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '24px',
                  minHeight: '260px'}}
              >
                
                  {/* Pushpin */}
                  <div style={{ position: 'absolute', top: '24px', right: '28px', transform: 'rotate(15deg)', zIndex: 10 }}>
                    <Pin size={22} color="#EF4444" strokeWidth={2.5} />
                  </div>
                  
                  {/* Brass Pendant Light */}
                <div style={{ position: 'absolute', top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 2, height: 80, background: 'linear-gradient(to bottom, rgba(170,140,44,0.3) 0%, rgba(170,140,44,0.9) 100%)' }} />
                  <div style={{ width: 24, height: 36, borderRadius: '12px', background: 'rgba(255,255,255,0.9)', border: '2px solid #AA8C2C', boxShadow: '0 8px 16px rgba(170,140,44,0.2)', display: 'grid', placeItems: 'center' }}>
                    <div style={{ width: 12, height: 16, borderRadius: '6px', background: '#AA8C2C', boxShadow: '0 0 8px #AA8C2C' }} />
                  </div>
                </div>
                
                <div style={{ position: 'relative', zIndex: 1, marginTop: '80px', textAlign: 'center' }}>
                   <h3 style={{ fontSize: '26px', fontWeight: 800, color: '#334155', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>Health<br/>Canvas</h3>
                   <p style={{ fontSize: '11px', color: '#64748B', margin: 0, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>DR. JENKINS</p>
                </div>
              </div>

              
              {/* AR Lens Bento Tile */}
              <div 
                onClick={() => { triggerHapticLight(); setShowARLens(true); }}
                style={{background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', borderRadius: '32px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'}}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 4px 12px rgba(15,23,42,0.3), inset 0 2px 4px rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Scan size={20} color="#FFF" />
                  </div>
                  <div style={{ background: '#EF4444', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '12px' }}>
                    NEW
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.3px' }}>Clinical Lens</h4>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0, fontWeight: 500 }}>Scan food for glycemic spikes</p>
                </div>
              </div>

              {/* Point 3: Interactive Daily Habit Bento Stack */}
              <div 
                onClick={() => toggleHabit('hydration', 'Morning Hydration (500ml)')}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['hydration'] ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.8)', 
                  boxShadow: completedHabits['hydration'] 
                    ? '0 20px 40px rgba(16, 185, 129, 0.2), inset 0 2px 0 rgba(255,255,255,0.7)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7)', 
                  borderRadius: '32px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    background: completedHabits['hydration'] 
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)', 
                    boxShadow: completedHabits['hydration'] ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none',
                    border: completedHabits['hydration'] ? 'none' : '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    {completedHabits['hydration'] ? (
                      <Check size={20} color="#FFF" />
                    ) : (
                      <Droplets size={20} color="#0EA5E9" />
                    )}
                  </div>
                  <div style={{ 
                    background: completedHabits['hydration'] ? '#DCFCE7' : 'rgba(56, 189, 248, 0.15)', 
                    color: completedHabits['hydration'] ? '#15803D' : '#0284C7', 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    padding: '4px 8px', 
                    borderRadius: '12px' 
                  }}>
                    {completedHabits['hydration'] ? '+2 PTS' : 'DAILY'}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                    {completedHabits['hydration'] ? 'Hydrated 💧' : 'Hydrate 500ml'}
                  </h4>
                  <p style={{ fontSize: '12px', color: completedHabits['hydration'] ? '#10B981' : '#64748B', margin: 0, fontWeight: 500 }}>
                    {completedHabits['hydration'] ? 'Optimal cellular hydration' : 'Tap to mark complete'}
                  </p>
                </div>
              </div>

              {/* Habit 2: Calm Reset */}
              <div 
                onClick={() => {
                  triggerHapticLight();
                  toggleHabit('calm_reset', 'Calm Space Reset');
                  if (!completedHabits['calm_reset']) {
                    const track = allMeditations[0] || heroMeditations[0] || null;
                    if (track) setActiveMeditation(track);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['calm_reset'] ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.8)', 
                  boxShadow: completedHabits['calm_reset'] 
                    ? '0 20px 40px rgba(16, 185, 129, 0.2), inset 0 2px 0 rgba(255,255,255,0.7)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7)', 
                  borderRadius: '32px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    background: completedHabits['calm_reset'] 
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)', 
                    boxShadow: completedHabits['calm_reset'] ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none',
                    border: completedHabits['calm_reset'] ? 'none' : '1px solid rgba(45, 212, 191, 0.3)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    {completedHabits['calm_reset'] ? (
                      <Check size={20} color="#FFF" />
                    ) : (
                      <Wind size={20} color="#0D9488" />
                    )}
                  </div>
                  <div style={{ 
                    background: completedHabits['calm_reset'] ? '#DCFCE7' : 'rgba(45, 212, 191, 0.15)', 
                    color: completedHabits['calm_reset'] ? '#15803D' : '#0F766E', 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    padding: '4px 8px', 
                    borderRadius: '12px' 
                  }}>
                    {completedHabits['calm_reset'] ? '+2 PTS' : 'MINDFUL'}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                    {completedHabits['calm_reset'] ? 'Mind Reset 🧘' : 'Calm Space'}
                  </h4>
                  <p style={{ fontSize: '12px', color: completedHabits['calm_reset'] ? '#10B981' : '#64748B', margin: 0, fontWeight: 500 }}>
                    {completedHabits['calm_reset'] ? 'HRV baroreflex tuned' : '5-min nervous reset'}
                  </p>
                </div>
              </div>

              {/* Habit 3: Daily Vitamins / Micronutrients */}
              <div 
                onClick={() => toggleHabit('vitamins', 'Daily Micronutrient / Rx')}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['vitamins'] ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.8)', 
                  boxShadow: completedHabits['vitamins'] 
                    ? '0 20px 40px rgba(16, 185, 129, 0.2), inset 0 2px 0 rgba(255,255,255,0.7)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7)', 
                  borderRadius: '32px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '140px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%', 
                    background: completedHabits['vitamins'] 
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)', 
                    boxShadow: completedHabits['vitamins'] ? '0 4px 12px rgba(16, 185, 129, 0.4)' : 'none',
                    border: completedHabits['vitamins'] ? 'none' : '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    {completedHabits['vitamins'] ? (
                      <Check size={20} color="#FFF" />
                    ) : (
                      <Clock size={20} color="#D97706" />
                    )}
                  </div>
                  <div style={{ 
                    background: completedHabits['vitamins'] ? '#DCFCE7' : 'rgba(245, 158, 11, 0.15)', 
                    color: completedHabits['vitamins'] ? '#15803D' : '#B45309', 
                    fontSize: '10px', 
                    fontWeight: 800, 
                    padding: '4px 8px', 
                    borderRadius: '12px' 
                  }}>
                    {completedHabits['vitamins'] ? '+2 PTS' : 'RX / VIT'}
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 4px', color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                    {completedHabits['vitamins'] ? 'Vitamins Taken 💊' : 'Daily Vitamins'}
                  </h4>
                  <p style={{ fontSize: '12px', color: completedHabits['vitamins'] ? '#10B981' : '#64748B', margin: 0, fontWeight: 500 }}>
                    {completedHabits['vitamins'] ? 'Cellular micronutrients' : 'Tap to mark complete'}
                  </p>
                </div>
              </div>
          </div>
        </div>

        <div style={{ paddingBottom: "32px", borderTop: "1px solid rgba(0,0,0,0.03)", paddingTop: "32px" }}>
          <FitnessNav />
          {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}
        </div>

          <div style={{ position: 'relative', margin: '0 0 40px 0' }}>
          {/* Small, distinct patches of color perfectly matched to the thumbnails directly above them */}
          {/* Top Left: Full Meditation (Zen Turquoise) */}
          <div style={{ position: 'absolute', top: '10%', left: '20%', width: '110px', height: '110px', background: 'rgba(45, 212, 191, 0.4)', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          {/* Top Right: Deep Sleep (Lavender Violet matching the Crescent Moon) */}
          <div style={{ position: 'absolute', top: '10%', right: '20%', width: '110px', height: '110px', background: 'rgba(196, 181, 253, 0.45)', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          
          {/* Middle Left: Deep Focus (Minimalist Zen Slate) */}
          <div style={{ position: 'absolute', top: '40%', left: '20%', width: '110px', height: '110px', background: 'rgba(203, 213, 225, 0.4)', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          {/* Middle Right: Morning Energy (Radiant Golden Dawn) */}
          <div style={{ position: 'absolute', top: '40%', right: '20%', width: '110px', height: '110px', background: 'rgba(253, 224, 71, 0.45)', borderRadius: '50%', filter: 'blur(35px)', zIndex: 0 }} />
          
          {/* Bottom Left: Rain Sounds (Misty Rain Blue) */}
          <div style={{ position: 'absolute', bottom: '10%', left: '15%', width: '95px', height: '95px', background: 'rgba(56, 189, 248, 0.4)', borderRadius: '50%', filter: 'blur(30px)', zIndex: 0 }} />
          {/* Bottom Middle: Focus Frequencies (Resonant Cymatic Violet) */}
          <div style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%) translateZ(0)', width: '95px', height: '95px', background: 'rgba(217, 70, 239, 0.4)', borderRadius: '50%', filter: 'blur(30px)', willChange: 'transform', zIndex: 0 }} />
          {/* Bottom Right: Forest Ambience (Woodland Emerald) */}
          <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '95px', height: '95px', background: 'rgba(52, 211, 153, 0.4)', borderRadius: '50%', filter: 'blur(30px)', zIndex: 0 }} />

<div style={{background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', position: 'relative',
            zIndex: 1,
            paddingTop: '24px', 
            borderRadius: '32px',}}>
          {/* Our Own Meditation Hub (Hero) */}
          <section>
            <div style={{ padding: '0 16px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Your Calm Space</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Curated experiences to shift your state</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', padding: '0 16px 16px' }}>
              {[
                { 
                  id: 'm1', 
                  title: 'Full Meditation', 
                  subtitle: 'Immersive audio journey',
                  duration: '30 MIN',
                  img: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80',
                  description: 'Our most complete meditation experience.'
                },
                {
                  id: 'mood-0',
                  title: 'Deep Sleep',
                  subtitle: 'Restorative slumber',
                  duration: '45 MIN',
                  img: '/images/thumb_night_clouds_1788262545783.jpg',
                  description: 'A guided progression into delta-wave sleep.'
                },
                {
                  id: 'mood-1',
                  title: 'Deep Focus',
                  subtitle: 'Intense concentration',
                  duration: '60 MIN',
                  img: '/images/thumb_focus_sphere_1788262954419.jpg',
                  description: 'Designed for deep work.'
                },
                {
                  id: 'mood-2',
                  title: 'Morning Energy',
                  subtitle: 'Start with clarity',
                  duration: '30 MIN',
                  img: '/images/thumb_energy_sun_1788263731169.jpg',
                  description: 'An energizing morning protocol.'
                }
              ].map((item, i) => (
                <div key={i} onClick={() => {
                    triggerHapticLight();
                    setActiveMeditation({
                      id: item.id,
                      category_id: item.id === 'm1' ? 'meditation' : 'mood',
                      is_active: true,
                      type: 'meditation',
                      title: item.title,
                      subtitle: item.subtitle,
                      description: item.description,
                      cover_image_url: item.img,
                      audio_url: '',
                      video_url: '',
                      duration_minutes: item.id === 'mood-0' ? 45 : item.id === 'mood-1' ? 60 : 30,
                      calories_estimate: 0,
                      difficulty: 'Beginner',
                      equipment: [],
                      is_premium: false,
                      is_featured: true
                    });
                  }} className="active-scale" style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.12)', aspectRatio: '1/1' }}>
                    <img loading="lazy" decoding="async" src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} />
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, color: 'white', letterSpacing: '0.4px' }}>
                      {item.duration}
                    </div>
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Soundscapes */}
          <section style={{
            marginBottom: '0',
            padding: '8px 0 16px'
          }}>
            <div style={{ padding: '0 16px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Soundscapes</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Immersive audio environments</p>
            </div>
            <div className="hide-scrollbar scrollable-row" style={{ display: 'flex', gap: '20px', overflowX: 'auto', padding: '12px 20px 20px', scrollbarWidth: 'none', margin: 0, WebkitOverflowScrolling: 'touch' }}>
              {[
                { name: 'Rain Sounds', icon: <Waves size={24} />, color: '#38bdf8', img: '/images/thumb_rain_window_1788262571496.jpg' },
                { name: 'Focus Frequencies', icon: <Activity size={24} />, color: '#c084fc', img: '/images/thumb_freq_cymatics_1788264629537.jpg' },
                { name: 'Forest Ambience', icon: <Wind size={24} />, color: '#34d399', img: '/images/thumb_water_drop_1788260024692.jpg' }
              ].map((type, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0, width: '144px', height: '144px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {/* Living Vibration Halo Rings */}
                  <motion.div
                    animate={{
                      scale: [1, 1.14, 1],
                      opacity: [0.35, 0.75, 0.35]
                    }}
                    transition={{
                      duration: 3.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: i * 0.7
                    }}
                    style={{
                      position: 'absolute',
                      inset: '-6px',
                      borderRadius: '50%',
                      border: `1.5px solid ${type.color}`,
                      boxShadow: `0 0 22px ${type.color}66`,
                      pointerEvents: 'none'
                    }}
                  />
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%), url(${type.img})`,
                      backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', flexDirection: 'column',
                      justifyContent: 'center', alignItems: 'center', padding: '16px', border: `1.5px solid rgba(255, 255, 255, 0.45)`, cursor: 'pointer',
                      boxShadow: `0 10px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.4)`
                    }}
                    onClick={() => {
                      triggerHapticLight();
                      setActiveMeditation({
                        id: `soundscape-${i}`,
                        category_id: 'soundscape',
                        is_active: true,
                        type: 'soundscape',
                        title: type.name,
                        subtitle: type.name === 'Rain Sounds' ? 'Continuous gentle downpour' : 
                                  type.name === 'Focus Frequencies' ? '432Hz ambient hum' :
                                  'Immersive woodland ecosystem',
                        description: type.name === 'Rain Sounds' ? 'A continuous, looping recording of gentle rain falling on leaves. Perfect for masking background noise and creating a cozy, isolated environment for reading or sleeping.' : 
                                     type.name === 'Focus Frequencies' ? 'A continuous 432Hz frequency hum mixed with subtle brown noise. Scientifically engineered to block out distractions and narrow your attentional focus.' :
                                     'A spatial audio recording of a temperate forest. Features gentle wind, distant birdsong, and rustling leaves to create a calming, natural atmosphere anywhere you are.',
                        cover_image_url: type.img,
                        audio_url: '',
                        video_url: '',
                        duration_minutes: 120,
                        calories_estimate: 0,
                        difficulty: 'Beginner', equipment: [], is_premium: false, is_featured: true
                      });
                    }}
                  >
                    <motion.div 
                      animate={{ scale: [1, 1.12, 1] }} 
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                      style={{ color: 'white', marginBottom: '8px' }}
                    >
                      {type.icon}
                    </motion.div>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '14px', textAlign: 'center', lineHeight: '1.2' }}>{type.name}</span>
                  </motion.button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Articles for You */}
        <section style={{ padding: '32px 0 100px' }}>
          <div style={{ padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#2E2B5F', letterSpacing: '-0.3px' }}>Articles for you</h2>
            <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, cursor: 'pointer' }}>View all</span>
          </div>
          
          <div className="hide-scrollbar scrollable-row" style={{ display: 'flex', overflowX: 'auto', gap: '16px', padding: '0 24px 24px 24px', WebkitOverflowScrolling: 'touch', margin: 0 }}>
            {CLINICAL_ARTICLES.map((art) => (
              <div 
                key={art.id} 
                onClick={() => {
                  triggerHapticLight();
                  setSelectedArticle(art);
                }} 
                style={{ 
                  width: '260px', 
                  minWidth: '260px', 
                  background: '#FFFFFF', 
                  borderRadius: '20px', 
                  boxShadow: '0 6px 20px rgba(0,0,0,0.06)', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  overflow: 'hidden', 
                  cursor: 'pointer',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
              >
                {/* Image Section */}
                <div style={{ position: 'relative', height: '150px', width: '100%' }}>
                  <img loading="lazy" decoding="async" src={art.img} alt={art.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  
                  {/* Badge */}
                  <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(255,255,255,0.92)', padding: '6px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px', backdropFilter: 'blur(8px)', minWidth: '40px', minHeight: '32px', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BookOpen size={8} color="#FFF" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>{art.readTime}</span>
                  </div>

                  {/* Category Pill */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', background: 'rgba(15, 23, 42, 0.75)', padding: '4px 10px', borderRadius: '12px', backdropFilter: 'blur(8px)' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'white', letterSpacing: '0.4px', textTransform: 'uppercase' }}>{art.category}</span>
                  </div>
                </div>

                {/* Text Section */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#0F172A', lineHeight: '1.4' }}>
                    {art.title}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{art.author}</span>
                    <ChevronRight size={16} color="#94A3B8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

      {/* Point 2: Interactive Clinical Article Reader Sheet */}
      {selectedArticle && (
        <BottomSheetOverlay isOpen={!!selectedArticle} onClose={() => setSelectedArticle(null)}>
          <div style={{ padding: '20px 24px 60px', maxHeight: '85vh', overflowY: 'auto' }}>
            {/* Header Cover Banner */}
            <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '24px', overflow: 'hidden', marginBottom: '20px' }}>
              <img 
                src={selectedArticle.img} 
                alt={selectedArticle.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.2) 60%, transparent 100%)' }} />
              
              <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    triggerHapticLight();
                    setSelectedArticle(null);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Close article"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {selectedArticle.category}
                  </span>
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>•</span>
                  <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.9)' }}>
                    {selectedArticle.readTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Author Credential Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderRadius: '16px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#0EA5E9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}>
                {selectedArticle.author.split(' ')[1]?.charAt(0) || 'D'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>{selectedArticle.author}</span>
                  <ShieldCheck size={16} color="#0EA5E9" />
                </div>
                <div style={{ fontSize: '12px', color: '#64748B' }}>{selectedArticle.role}</div>
              </div>
            </div>

            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px', lineHeight: 1.2, letterSpacing: '-0.5px' }}>
              {selectedArticle.title}
            </h2>
            <p style={{ fontSize: '15px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.4, fontWeight: 500 }}>
              {selectedArticle.subtitle}
            </p>

            {/* Key Clinical Takeaways */}
            <div style={{ background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.8) 0%, rgba(240, 253, 250, 0.8) 100%)', borderRadius: '20px', padding: '18px', border: '1px solid #BFDBFE', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Sparkles size={16} color="#2563EB" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Key Clinical Takeaways
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {selectedArticle.keyTakeaways.map((takeaway, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2563EB', marginTop: '6px', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#1E3A8A', lineHeight: 1.4, fontWeight: 500 }}>{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Article Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '32px' }}>
              {selectedArticle.sections.map((section, idx) => (
                <div key={idx}>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
                    {section.heading}
                  </h3>
                  <p style={{ fontSize: '15px', color: '#334155', lineHeight: 1.6, margin: 0 }}>
                    {section.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Bookmark & Done Button */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  triggerHapticLight();
                  setSelectedArticle(null);
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
                  border: 'none',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(14, 165, 233, 0.3)'
                }}
              >
                Finished Reading
              </button>
            </div>
          </div>
        </BottomSheetOverlay>
      )}

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

