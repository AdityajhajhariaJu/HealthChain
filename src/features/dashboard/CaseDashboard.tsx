import { useNavigate } from 'react-router-dom';
import { useActionIslandStore } from '../../store/actionIslandStore';
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
  Scan, 
  Check, 
  Droplet,
  Droplets, 
  Sparkles, 
  BookOpen, 
  Award, 
  X, 
  ShieldCheck,
  ArrowRight,
  FolderHeart,
  Pill,
  Plus,
  FileText,
  GitMerge,
  Zap,
  Leaf,
  Utensils
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useIsMobile } from '../../hooks/useIsMobile';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { ARGroceryLens } from '../../components/ui/ARGroceryLens';
import { CompleteProfileModal } from '../../components/ui/CompleteProfileModal';
import { FeatureProfileDataBanner } from '../../components/ui/FeatureProfileDataBanner';
import { VitaminSchedulerModal } from '../../components/ui/VitaminSchedulerModal';
import { getVitaminSchedule, markAllVitaminsTaken, VitaminItem } from '../../services/VitaminScheduleService';
import { HydrationTrackerModal } from '../../components/ui/HydrationTrackerModal';
import { getHydrationData, addWaterLog, HydrationDayData, getTodayDateString } from '../../services/HydrationService';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { SensualLineChart } from '../../components/ui/SensualLineChart';

import { VitalityNav } from '../../components/ui/FitnessNav';
import { getItemSync, setItemSync } from '../../services/storage';
import { getHabitStorageKey } from '../../services/profileScope';

import { getProfile } from '../../services/ProfileEngine';

import { CLINICAL_ARTICLES, MedicalArticle } from '../../data/ClinicalArticles';
export { CLINICAL_ARTICLES } from '../../data/ClinicalArticles';
export type { MedicalArticle } from '../../data/ClinicalArticles';
import { ConnectionDetectiveModal } from '../../components/ui/ConnectionDetectiveModal';
import { TriggerSensitivityModal } from '../../components/ui/TriggerSensitivityModal';
import { ClinicalArticleSection } from './ClinicalArticleSection';

interface CalmAudioItem {
  id: string;
  title: string;
  fullTitle: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  durationMinutes: number;
  img: string;
  fallbackImg: string;
  categoryId: string;
  type: 'meditation' | 'soundscape';
  description: string;
}

const AudioTrackCard: React.FC<{
  item: CalmAudioItem;
  isMobile: boolean;
  onSelect: () => void;
}> = ({ item, isMobile, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Play ${item.fullTitle}`}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobile ? '10px 12px' : '12px 16px',
        background: isHovered
          ? 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 100%)'
          : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        borderRadius: isMobile ? '18px' : '20px',
        border: isHovered ? '1.5px solid rgba(13, 148, 136, 0.45)' : '1.5px solid rgba(226, 232, 240, 0.9)',
        cursor: 'pointer',
        boxShadow: isHovered
          ? '0 10px 24px rgba(13, 148, 136, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)'
          : '0 2px 8px rgba(15, 23, 42, 0.03), 0 1px 2px rgba(15, 23, 42, 0.02)',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: 0,
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Left: Thumbnail + Metadata */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px', minWidth: 0, overflow: 'hidden' }}>
        {/* Generative Visual Art Thumbnail */}
        <div
          style={{
            position: 'relative',
            width: isMobile ? '48px' : '56px',
            height: isMobile ? '48px' : '56px',
            minWidth: isMobile ? '48px' : '56px',
            borderRadius: isMobile ? '14px' : '16px',
            overflow: 'hidden',
            flexShrink: 0,
            background: '#0F172A',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), inset 0 0 0 1px rgba(255, 255, 255, 0.2)'
          }}
        >
          <motion.img
            loading="lazy"
            decoding="async"
            src={item.img}
            alt={item.title}
            animate={{ scale: isHovered ? 1.08 : 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            onError={(e) => {
              e.currentTarget.src = item.fallbackImg || '/images/calm_meditate_lotus.jpg';
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.22) 100%)',
              pointerEvents: 'none'
            }}
          />
        </div>

        {/* Text Details & Category Micro-Pill */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: isMobile ? '14px' : '15.5px',
              fontWeight: 800,
              color: '#0F172A',
              lineHeight: 1.25,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              letterSpacing: '-0.3px'
            }}
          >
            {item.title}
          </h3>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              marginTop: '4px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: item.badgeBg,
              color: item.badgeColor,
              fontSize: isMobile ? '10px' : '10.5px',
              fontWeight: 700,
              letterSpacing: '0.1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}
          >
            {item.badge}
          </div>
        </div>
      </div>

      {/* Right: Tactile Circular Play Action Button */}
      <motion.div
        animate={{
          scale: isHovered ? 1.08 : 1,
          backgroundColor: isHovered ? '#0D9488' : 'rgba(241, 245, 249, 0.95)',
          borderColor: isHovered ? '#0D9488' : 'rgba(226, 232, 240, 0.95)',
          boxShadow: isHovered
            ? '0 4px 14px rgba(13, 148, 136, 0.35)'
            : '0 2px 6px rgba(15, 23, 42, 0.04)'
        }}
        transition={{ duration: 0.2 }}
        style={{
          width: isMobile ? '32px' : '36px',
          height: isMobile ? '32px' : '36px',
          minWidth: isMobile ? '32px' : '36px',
          borderRadius: '999px',
          border: '1.5px solid rgba(226, 232, 240, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: isMobile ? '6px' : '10px'
        }}
      >
        <Play
          size={isMobile ? 11 : 12}
          fill={isHovered ? '#FFFFFF' : '#0D9488'}
          color={isHovered ? '#FFFFFF' : '#0D9488'}
          style={{ marginLeft: '1.5px' }}
        />
      </motion.div>
    </motion.div>
  );
};

const CALM_SPACE_TRACKS: CalmAudioItem[] = [
  {
    id: 'm1',
    title: 'Meditate',
    fullTitle: 'Full Meditation',
    subtitle: '30 min',
    badge: '30 min • Zen',
    badgeColor: '#0D9488',
    badgeBg: '#F0FDFA',
    durationMinutes: 30,
    img: '/images/calm_meditate_lotus.jpg',
    fallbackImg: '/images/thumb_zen_stones_1788260013795.jpg',
    categoryId: 'meditation',
    type: 'meditation',
    description: 'Our most complete meditation experience.'
  },
  {
    id: 'mood-0',
    title: 'Sleep',
    fullTitle: 'Deep Sleep',
    subtitle: '45 min',
    badge: '45 min • Twilight',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    durationMinutes: 45,
    img: '/images/calm_sleep_moon.jpg',
    fallbackImg: '/images/thumb_night_clouds_1788262545783.jpg',
    categoryId: 'mood',
    type: 'meditation',
    description: 'A guided progression into delta-wave sleep.'
  },
  {
    id: 'mood-1',
    title: 'Focus',
    fullTitle: 'Deep Focus',
    subtitle: '60 min',
    badge: '60 min • Clarity',
    badgeColor: '#0284C7',
    badgeBg: '#F0F9FF',
    durationMinutes: 60,
    img: '/images/calm_focus_prism.jpg',
    fallbackImg: '/images/thumb_focus_sphere_1788262954419.jpg',
    categoryId: 'mood',
    type: 'meditation',
    description: 'Designed for deep work.'
  },
  {
    id: 'mood-2',
    title: 'Energy',
    fullTitle: 'Morning Energy',
    subtitle: '30 min',
    badge: '30 min • Vitality',
    badgeColor: '#EA580C',
    badgeBg: '#FFF7ED',
    durationMinutes: 30,
    img: '/images/calm_energy_dawn.jpg',
    fallbackImg: '/images/thumb_energy_sun_1788263731169.jpg',
    categoryId: 'mood',
    type: 'meditation',
    description: 'An energizing morning protocol.'
  }
];

const SOUNDSCAPE_TRACKS: CalmAudioItem[] = [
  {
    id: 'soundscape-0',
    title: 'Rain',
    fullTitle: 'Rain Sounds',
    subtitle: 'Ambient',
    badge: 'Ambient • Mist',
    badgeColor: '#0284C7',
    badgeBg: '#F0F9FF',
    durationMinutes: 120,
    img: '/images/soundscape_rain_window.jpg',
    fallbackImg: '/images/thumb_rain_window_1788262571496.jpg',
    categoryId: 'soundscape',
    type: 'soundscape',
    description: 'A continuous, looping recording of gentle rain falling on leaves.'
  },
  {
    id: 'soundscape-1',
    title: 'Focus Freqs',
    fullTitle: 'Focus Freqs',
    subtitle: '432Hz',
    badge: '432 Hz • Binaural',
    badgeColor: '#D97706',
    badgeBg: '#FFFBEB',
    durationMinutes: 120,
    img: '/images/soundscape_focus_freqs.jpg',
    fallbackImg: '/images/thumb_freq_cymatics_1788264629537.jpg',
    categoryId: 'soundscape',
    type: 'soundscape',
    description: 'A continuous 432Hz frequency hum mixed with subtle brown noise.'
  },
  {
    id: 'soundscape-2',
    title: 'Forest Aura',
    fullTitle: 'Forest Aura',
    subtitle: 'Nature',
    badge: 'Nature • Biophilic',
    badgeColor: '#059669',
    badgeBg: '#ECFDF5',
    durationMinutes: 120,
    img: '/images/soundscape_forest_mist.jpg',
    fallbackImg: '/images/thumb_water_drop_1788260024692.jpg',
    categoryId: 'soundscape',
    type: 'soundscape',
    description: 'A spatial audio recording of a temperate forest. Features gentle wind and distant birdsong.'
  },
  {
    id: 'soundscape-3',
    title: 'Ocean Waves',
    fullTitle: 'Ocean Waves',
    subtitle: 'Deep Delta',
    badge: 'Deep Delta • Surf',
    badgeColor: '#0D9488',
    badgeBg: '#F0FDFA',
    durationMinutes: 120,
    img: '/images/soundscape_ocean_waves.jpg',
    fallbackImg: '/images/thumb_dark_ocean_1788262557769.jpg',
    categoryId: 'soundscape',
    type: 'soundscape',
    description: 'Continuous soothing ambient pad and ocean tide surf for deep relaxation.'
  }
];

export default function CaseDashboard() {
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [showARLens, setShowARLens] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
  const [showDetectiveModal, setShowDetectiveModal] = useState(false);
  const [profile, setProfile] = useState(() => getProfile());

  const isProfileComplete = Boolean(
    profile?.demographics?.age && 
    profile?.demographics?.gender && 
    (profile?.onboardingCompletedAt || profile?.demographics?.updatedAt)
  );

  const refreshProfileAndTasks = () => {
    const p = getProfile();
    setProfile(p);
  };

  useEffect(() => {
    refreshProfileAndTasks();
    window.addEventListener('hc_profile_updated', refreshProfileAndTasks);
    return () => window.removeEventListener('hc_profile_updated', refreshProfileAndTasks);
  }, []);

  // Daily Habit & Protocol tracking
  const todayDateStr = getTodayDateString();
  const [showVitaminModal, setShowVitaminModal] = useState(false);
  const [vitaminSchedule, setVitaminSchedule] = useState<VitaminItem[]>(() => getVitaminSchedule());
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [hydrationData, setHydrationData] = useState<HydrationDayData>(() => getHydrationData());
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>(() => {
    try {
      const stored = getItemSync(getHabitStorageKey(todayDateStr));
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleHabitsUpdated = () => {
      try {
        const stored = getItemSync(getHabitStorageKey(todayDateStr));
        if (stored) setCompletedHabits(JSON.parse(stored));
      } catch {
        // ignore
      }
      setVitaminSchedule(getVitaminSchedule());
      setHydrationData(getHydrationData());
    };
    window.addEventListener('hc_vitamins_updated', handleHabitsUpdated);
    window.addEventListener('hc_hydration_updated', handleHabitsUpdated);
    window.addEventListener('storage', handleHabitsUpdated);
    return () => {
      window.removeEventListener('hc_vitamins_updated', handleHabitsUpdated);
      window.removeEventListener('hc_hydration_updated', handleHabitsUpdated);
      window.removeEventListener('storage', handleHabitsUpdated);
    };
  }, [todayDateStr]);

  const handleQuickWater = (ml: number = 250, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    addWaterLog(ml, 'water');
    setHydrationData(getHydrationData());
    try {
      const stored = getItemSync(getHabitStorageKey(todayDateStr));
      if (stored) setCompletedHabits(JSON.parse(stored));
    } catch {}
  };

  const toggleHabit = (habitId: string, title: string) => {
    const isNowDone = !completedHabits[habitId];
    const next = { ...completedHabits, [habitId]: isNowDone };
    setCompletedHabits(next);
    setItemSync(getHabitStorageKey(todayDateStr), JSON.stringify(next));

    if (isNowDone) {
      triggerHapticSuccess();
      awardPoints(2, `Daily Habit: ${title}`, 'lifestyle', `habit_${habitId}_${todayDateStr}`);
    } else {
      triggerHapticLight();
    }
  };

  const [activeMeditation, setActiveMeditation] = useState<FitnessContent | null>(null);
  const lastMeditationRef = useRef<FitnessContent | null>(null);
  const calmSpaceRef = useRef<HTMLDivElement | null>(null);
  const [showZenGardenModal, setShowZenGardenModal] = useState(false);

  useEffect(() => {
    if (activeMeditation) {
      lastMeditationRef.current = activeMeditation;
    }
  }, [activeMeditation]);

  useEffect(() => {
    const handleReopen = () => {
      if (lastMeditationRef.current) {
        setActiveMeditation(lastMeditationRef.current);
      }
    };
    window.addEventListener('hc_reopen_meditation', handleReopen);
    return () => window.removeEventListener('hc_reopen_meditation', handleReopen);
  }, []);

  const getFallbackImage = (type: string, id: string) => {
    const num = id.charCodeAt(0) % 3;
    if (type === 'meditation' || type === 'breathwork' || type === 'soundscape') {
      return [
        'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=800&q=80'
      ][num];
    }
    return 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=800&q=80';
  };

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(180deg, #F8FAFC 0%, #F0FDFA 35%, #F8FAFC 100%)',
      backgroundColor: '#F8FAFC',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : '24px',
      overflowX: 'clip'
    }}>
      <div style={{ paddingTop: isMobile ? "8px" : "16px" }}><VitalityNav /></div>
        
        <div style={{ padding: isMobile ? '0 12px 20px' : '0 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: 12 }}>
            <h2 className="serif-heading" style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#2D3748', letterSpacing: '-0.5px' }}>Dashboard</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '10px' : '14px' }}>
            
            {/* Zen Garden arch tile */}
              <motion.div
                role="button"
                tabIndex={0}
                aria-label="Open Zen Garden"
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => {
                  triggerHapticSelection();
                  setShowZenGardenModal(true);
                }}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticSelection();
                    setShowZenGardenModal(true);
                  }
                }}
                style={{
                  backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.0) 0%, rgba(255, 255, 255, 0.0) 52%, rgba(240, 253, 244, 0.45) 78%, rgba(240, 253, 244, 0.92) 100%), url(/images/zen_opt1_minimalist_lotus.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 30%',
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: '1px solid rgba(255, 255, 255, 0.9)', 
                  boxShadow: '0 24px 48px rgba(13, 148, 136, 0.16), inset 0 2px 0 rgba(255,255,255,0.8)',
                  gridRow: 'span 2',
                  borderRadius: isMobile ? '80px 80px 32px 32px' : '160px 160px 48px 48px', 
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  padding: isMobile ? '16px 8px' : '20px 14px',
                  minHeight: isMobile ? '220px' : '260px'
                }}
              >
                {/* Bottom Centerpiece: Clean Zen Sanctuary pill & subtitle */}
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', maxWidth: '100%' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.94)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(167, 243, 208, 0.9)',
                      borderRadius: '999px',
                      padding: isMobile ? '4px 10px' : '5px 13px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 4px 14px rgba(13, 148, 136, 0.12)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: isMobile ? '11px' : '12px', lineHeight: 1, flexShrink: 0 }}>🌸</span>
                    <span style={{ fontSize: isMobile ? '9.5px' : '10.5px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.4px', textTransform: 'uppercase', whiteSpace: 'nowrap', lineHeight: 1 }}>
                      Zen Sanctuary
                    </span>
                  </div>
                  <p style={{ fontSize: isMobile ? '8.5px' : '9.5px', color: '#0D9488', margin: 0, fontWeight: 800, letterSpacing: isMobile ? '0.7px' : '1px', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    PAUSE · BREATHE · RESET
                  </p>
                </div>
              </motion.div>

              
              {/* AR Lens Bento Tile */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label="Clinical AR Food Lens"
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => { triggerHapticSelection(); setShowARLens(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticSelection();
                    setShowARLens(true);
                  }
                }}
                style={{
                  background: '#FFFFFF', 
                  border: '1px solid #E2E8F0', 
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)', 
                  borderRadius: isMobile ? '28px' : '34px',
                  padding: isMobile ? '16px' : '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '135px' : '150px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ 
                    width: isMobile ? '38px' : '44px', 
                    height: isMobile ? '38px' : '44px', 
                    minWidth: isMobile ? '38px' : '44px', 
                    minHeight: isMobile ? '38px' : '44px', 
                    flexShrink: 0,
                    borderRadius: '50%', 
                    background: '#111827', 
                    boxShadow: '0 2px 6px rgba(17, 24, 39, 0.25)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Scan size={isMobile ? 18 : 20} color="#FFFFFF" strokeWidth={2.4} />
                  </div>
                  <div className="micro-badge" style={{ background: '#EF4444', color: '#FFFFFF', padding: isMobile ? '2.5px 8px' : '3.5px 10px', borderRadius: '999px', fontSize: isMobile ? '9px' : '10px', fontWeight: 800, letterSpacing: '0.4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    NEW
                  </div>
                </div>
                <div>
                  <h4 className="serif-heading" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', lineHeight: 1.25, letterSpacing: '-0.3px' }}>Clinical Lens</h4>
                  <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#64748B', margin: 0, fontWeight: 600, lineHeight: 1.3 }}>Scan food for glycemic spikes</p>
                </div>
              </motion.div>

              {/* Gut Health Bento Tile */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label="Gut Health - Track food triggers, meal reactions & digestion"
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => { triggerHapticSelection(); setShowDetectiveModal(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticSelection();
                    setShowDetectiveModal(true);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDFA 60%, #E6FFFA 100%)', 
                  border: '1px solid #99F6E4', 
                  boxShadow: '0 4px 16px rgba(13, 148, 136, 0.06), 0 1px 2px rgba(0, 0, 0, 0.02)', 
                  borderRadius: isMobile ? '28px' : '34px',
                  padding: isMobile ? '16px' : '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '135px' : '150px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ 
                    width: isMobile ? '38px' : '44px', 
                    height: isMobile ? '38px' : '44px', 
                    minWidth: isMobile ? '38px' : '44px', 
                    minHeight: isMobile ? '38px' : '44px', 
                    flexShrink: 0,
                    borderRadius: '50%', 
                    background: 'linear-gradient(135deg, #10B981 0%, #0D9488 100%)', 
                    boxShadow: '0 2px 8px rgba(13, 148, 136, 0.28)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Utensils size={isMobile ? 18 : 20} color="#FFFFFF" strokeWidth={2.4} />
                  </div>
                </div>
                <div>
                  <h4 className="serif-heading" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', lineHeight: 1.25, letterSpacing: '-0.3px' }}>Gut Health</h4>
                  <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#64748B', margin: 0, fontWeight: 600, lineHeight: 1.3 }}>Track food triggers, meal reactions & digestion</p>
                </div>
              </motion.div>

              {/* Point 3: Interactive Daily Habit Stack - Full Width Compact Radial Cards */}
              {/* Habit 1: Daily Hydration Tracking */}
              {(() => {
                const waterMl = hydrationData.currentMl;
                const targetWaterMl = hydrationData.targetMl || 2000;
                const waterPct = targetWaterMl > 0 ? Math.min(100, Math.round((waterMl / targetWaterMl) * 100)) : 0;
                const isWaterGoal = targetWaterMl > 0 ? waterMl >= targetWaterMl : false;
                const remainingWaterMl = Math.max(0, targetWaterMl - waterMl);
                const remainingGlasses = Math.ceil(remainingWaterMl / 250);
                const currentGlasses = Math.round(waterMl / 250);
                const totalGlasses = Math.round(targetWaterMl / 250);
                const ringRadius = 29;
                const ringCircumference = 2 * Math.PI * ringRadius;
                const ringOffset = ringCircumference - (waterPct / 100) * ringCircumference;

                return (
                  <motion.div 
                    role="button"
                    tabIndex={0}
                    aria-label={`Daily Hydration - ${isWaterGoal ? 'Goal Met' : 'Open intake tracker'}`}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    onClick={() => {
                      triggerHapticLight();
                      setShowHydrationModal(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowHydrationModal(true);
                      }
                    }}
                    style={{
                      gridColumn: 'span 2',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                      borderRadius: isMobile ? '24px' : '28px',
                      padding: isMobile ? '14px 16px' : '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      userSelect: 'none',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    {/* Left: Content Information */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top Pill Badge */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#E0F2FE',
                          border: '1px solid #BAE6FD',
                          borderRadius: '999px',
                          padding: '2.5px 9px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#0284C7',
                          letterSpacing: '-0.1px',
                          marginBottom: '3px'
                        }}
                      >
                        <Droplet size={11} fill="#0284C7" color="#0284C7" />
                        <span>Hydration</span>
                      </div>

                      {/* Hero KPI Number */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: isMobile ? '19px' : '22px',
                            fontWeight: 900,
                            color: '#0F172A',
                            letterSpacing: '-0.5px',
                            lineHeight: 1
                          }}
                        >
                          {waterMl.toLocaleString()}
                        </span>
                        <span
                          style={{
                            fontSize: isMobile ? '12px' : '13px',
                            fontWeight: 600,
                            color: '#64748B'
                          }}
                        >
                          / {targetWaterMl.toLocaleString()} ml
                        </span>
                      </div>

                      {/* Contextual Subtext */}
                      <p
                        style={{
                          fontSize: isMobile ? '11px' : '11.5px',
                          fontWeight: 500,
                          color: isWaterGoal ? '#0284C7' : '#64748B',
                          margin: '2px 0 6px',
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {isWaterGoal ? (
                          <span style={{ fontWeight: 700, color: '#0284C7' }}>
                            {waterMl > targetWaterMl
                              ? `✓ Goal surpassed (+${(waterMl - targetWaterMl).toLocaleString()} ml extra) • Gut mucosa optimal`
                              : '✓ Daily hydration goal reached • Gut mucosa optimal'}
                          </span>
                        ) : (
                          `${remainingGlasses} ${remainingGlasses === 1 ? 'glass' : 'glasses'} remaining today (${remainingWaterMl.toLocaleString()} ml to goal)`
                        )}
                      </p>

                      {/* Bottom Action Row (Zero-Wrap Single Row) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                        {isWaterGoal ? (
                          <>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                background: '#E0F2FE',
                                border: '1px solid #BAE6FD',
                                borderRadius: '999px',
                                height: isMobile ? '24px' : '26px',
                                padding: isMobile ? '0 9px' : '0 11px',
                                fontSize: isMobile ? '10px' : '10.5px',
                                fontWeight: 700,
                                color: '#0284C7',
                                whiteSpace: 'nowrap',
                                lineHeight: 1
                              }}
                            >
                              <Check size={10} strokeWidth={3} /> {currentGlasses} Glasses Met
                            </span>
                            <motion.button
                              type="button"
                              data-micro="true"
                              className="btn-micro"
                              whileTap={{ scale: 0.92 }}
                              onClick={(e) => handleQuickWater(250, e)}
                              title="Log extra glass (+250ml)"
                              aria-label="Log extra 250ml water"
                              style={{
                                background: '#0284C7',
                                border: 'none',
                                borderRadius: '999px',
                                height: isMobile ? '24px' : '26px',
                                minHeight: isMobile ? '24px' : '26px',
                                maxHeight: isMobile ? '24px' : '26px',
                                minWidth: 'unset',
                                padding: isMobile ? '0 9px' : '0 11px',
                                fontSize: isMobile ? '10px' : '10.5px',
                                fontWeight: 800,
                                color: '#FFFFFF',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                lineHeight: 1,
                                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                              }}
                            >
                              <Plus size={10} strokeWidth={2.8} /> 250ml
                            </motion.button>
                          </>
                        ) : (
                          <motion.button
                            type="button"
                            data-micro="true"
                            className="btn-micro"
                            whileTap={{ scale: 0.92 }}
                            onClick={(e) => handleQuickWater(250, e)}
                            title="Quick log 1 glass (+250ml)"
                            aria-label="Quick log 250ml water"
                            style={{
                              background: '#0284C7',
                              border: 'none',
                              borderRadius: '999px',
                              height: isMobile ? '24px' : '26px',
                              minHeight: isMobile ? '24px' : '26px',
                              maxHeight: isMobile ? '24px' : '26px',
                              minWidth: 'unset',
                              padding: isMobile ? '0 11px' : '0 13px',
                              fontSize: isMobile ? '10.5px' : '11px',
                              fontWeight: 800,
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3.5px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              lineHeight: 1,
                              boxShadow: '0 2px 6px rgba(2, 132, 199, 0.25)'
                            }}
                          >
                            <Plus size={11} strokeWidth={2.8} /> 250ml
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Right: Circular Progress Ring */}
                    <div
                      style={{
                        position: 'relative',
                        width: isMobile ? '68px' : '76px',
                        height: isMobile ? '68px' : '76px',
                        minWidth: isMobile ? '68px' : '76px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <svg
                        style={{
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          overflow: 'visible'
                        }}
                        viewBox="0 0 74 74"
                      >
                        <circle
                          cx="37"
                          cy="37"
                          r={ringRadius}
                          stroke="#E0F2FE"
                          strokeWidth={6.5}
                          fill="transparent"
                        />
                        <circle
                          cx="37"
                          cy="37"
                          r={ringRadius}
                          stroke="#0284C7"
                          strokeWidth={6.5}
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringOffset}
                          strokeLinecap="round"
                          fill="transparent"
                          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                        />
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}
                      >
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: isMobile ? '15px' : '17px',
                            fontWeight: 900,
                            color: '#0F172A',
                            lineHeight: 1,
                            letterSpacing: '-0.3px'
                          }}
                        >
                          {waterPct}%
                        </span>
                        <span
                          style={{
                            fontSize: '8px',
                            fontWeight: 900,
                            color: '#0284C7',
                            letterSpacing: '0.8px',
                            textTransform: 'uppercase',
                            marginTop: '2px'
                          }}
                        >
                          {isWaterGoal ? 'MET ✓' : 'GOAL'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Habit 2: Daily Meds & Vitamins */}
              {(() => {
                const activeVitamins = vitaminSchedule.filter(v => v.enabled !== false);
                const hasConfiguredMeds = activeVitamins.length > 0;
                const totalRxDoses = hasConfiguredMeds ? activeVitamins.length : 1;
                const takenRxDoses = hasConfiguredMeds
                  ? activeVitamins.filter(v => Boolean(v.takenToday)).length
                  : (completedHabits['vitamins'] ? 1 : 0);
                const isRxDone = hasConfiguredMeds
                  ? (totalRxDoses > 0 && takenRxDoses >= totalRxDoses)
                  : Boolean(completedHabits['vitamins']);
                const rxPct = totalRxDoses > 0 ? Math.min(100, Math.round((takenRxDoses / totalRxDoses) * 100)) : 0;
                const remainingRxDoses = Math.max(0, totalRxDoses - takenRxDoses);
                const ringRadius = 29;
                const ringCircumference = 2 * Math.PI * ringRadius;
                const ringOffset = ringCircumference - (rxPct / 100) * ringCircumference;
                const nextDoseItem = activeVitamins.find(v => !v.takenToday);

                return (
                  <motion.div 
                    role="button"
                    tabIndex={0}
                    aria-label={`Daily Meds & Vitamins - ${isRxDone ? 'All Taken' : 'Tap to manage schedule or mark done'}`}
                    whileHover={{ y: -2, scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                    onClick={() => {
                      triggerHapticLight();
                      setShowVitaminModal(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowVitaminModal(true);
                      }
                    }}
                    style={{
                      gridColumn: 'span 2',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
                      borderRadius: isMobile ? '24px' : '28px',
                      padding: isMobile ? '14px 16px' : '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      userSelect: 'none',
                      transition: 'all 0.25s ease'
                    }}
                  >
                    {/* Left: Content Information */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Top Pill Badge with Unambiguous Crisp Capsule Icon */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4.5px',
                          background: '#FFFFFF',
                          border: '1px solid #FBCFE8',
                          borderRadius: '999px',
                          padding: '2.5px 9px',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#DB2777',
                          letterSpacing: '-0.1px',
                          marginBottom: '3px'
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <rect x="2.5" y="7.5" width="19" height="9" rx="4.5" stroke="#DB2777" strokeWidth="2.2" />
                          <path d="M12 7.5v9" stroke="#DB2777" strokeWidth="2" strokeDasharray="1.5 1.5" />
                          <rect x="3.5" y="8.5" width="8.5" height="7" rx="3.5" fill="#FBCFE8" opacity="0.6" />
                        </svg>
                        <span>Daily Meds & Vitamins</span>
                      </div>

                      {/* Hero KPI Number */}
                      {hasConfiguredMeds ? (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: isMobile ? '19px' : '22px',
                              fontWeight: 900,
                              color: '#0F172A',
                              letterSpacing: '-0.5px',
                              lineHeight: 1
                            }}
                          >
                            {takenRxDoses}
                          </span>
                          <span
                            style={{
                              fontSize: isMobile ? '12px' : '13px',
                              fontWeight: 600,
                              color: '#64748B'
                            }}
                          >
                            / {totalRxDoses} Taken
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: isMobile ? '17px' : '19px',
                              fontWeight: 900,
                              color: '#0F172A',
                              letterSpacing: '-0.4px',
                              lineHeight: 1
                            }}
                          >
                            0 Active
                          </span>
                          <span
                            style={{
                              fontSize: isMobile ? '11.5px' : '12.5px',
                              fontWeight: 600,
                              color: '#64748B'
                            }}
                          >
                            Meds Scheduled
                          </span>
                        </div>
                      )}

                      {/* Contextual Subtext */}
                      <p
                        style={{
                          fontSize: isMobile ? '11px' : '11.5px',
                          fontWeight: 500,
                          color: hasConfiguredMeds && isRxDone ? '#DB2777' : '#64748B',
                          margin: '2px 0 6px',
                          lineHeight: 1.25,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {hasConfiguredMeds ? (
                          isRxDone ? (
                            <span style={{ fontWeight: 700, color: '#DB2777' }}>
                              ✓ All daily meds & vitamins taken today
                            </span>
                          ) : (
                            `${nextDoseItem?.name ? nextDoseItem.name : 'Next dose'} • ${remainingRxDoses} ${remainingRxDoses === 1 ? 'dose' : 'doses'} remaining`
                          )
                        ) : (
                          'Set up daily vitamins, supplements & prescriptions'
                        )}
                      </p>

                      {/* Bottom Action Row (Zero-Wrap Single Row) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                        {hasConfiguredMeds ? (
                          isRxDone ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                background: '#FDF2F8',
                                border: '1px solid #FBCFE8',
                                borderRadius: '999px',
                                height: isMobile ? '24px' : '26px',
                                padding: isMobile ? '0 9px' : '0 11px',
                                fontSize: isMobile ? '10px' : '10.5px',
                                fontWeight: 700,
                                color: '#DB2777',
                                whiteSpace: 'nowrap',
                                lineHeight: 1
                              }}
                            >
                              <Check size={10} strokeWidth={3} /> All {totalRxDoses} Taken Today
                            </span>
                          ) : (
                            <motion.button
                              type="button"
                              data-micro="true"
                              className="btn-micro"
                              whileTap={{ scale: 0.92 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                markAllVitaminsTaken();
                                triggerHapticSuccess();
                                awardPoints(5, 'Daily Micronutrient / Rx Protocol', 'lifestyle', `habit_vitamins_${todayDateStr}`);
                                setVitaminSchedule(getVitaminSchedule());
                                try {
                                  const stored = getItemSync(getHabitStorageKey(todayDateStr));
                                  if (stored) setCompletedHabits(JSON.parse(stored));
                                } catch {}
                              }}
                              title="Mark all daily meds taken"
                              aria-label="Mark daily meds taken"
                              style={{
                                background: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
                                border: 'none',
                                borderRadius: '999px',
                                height: isMobile ? '24px' : '26px',
                                minHeight: isMobile ? '24px' : '26px',
                                maxHeight: isMobile ? '24px' : '26px',
                                minWidth: 'unset',
                                padding: isMobile ? '0 12px' : '0 14px',
                                fontSize: isMobile ? '10.5px' : '11px',
                                fontWeight: 800,
                                color: '#FFFFFF',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3.5px',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                                lineHeight: 1,
                                boxShadow: '0 2px 6px rgba(219, 39, 119, 0.25)'
                              }}
                            >
                              <Check size={11} strokeWidth={3} /> Done
                            </motion.button>
                          )
                        ) : (
                          <motion.button
                            type="button"
                            data-micro="true"
                            className="btn-micro"
                            whileTap={{ scale: 0.92 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerHapticSelection();
                              setShowVitaminModal(true);
                            }}
                            title="Set up daily meds schedule"
                            aria-label="Set up daily meds schedule"
                            style={{
                              background: 'linear-gradient(135deg, #F472B6 0%, #DB2777 100%)',
                              border: 'none',
                              borderRadius: '999px',
                              height: isMobile ? '24px' : '26px',
                              minHeight: isMobile ? '24px' : '26px',
                              maxHeight: isMobile ? '24px' : '26px',
                              minWidth: 'unset',
                              padding: isMobile ? '0 11px' : '0 13px',
                              fontSize: isMobile ? '10.5px' : '11px',
                              fontWeight: 800,
                              color: '#FFFFFF',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3.5px',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              lineHeight: 1,
                              boxShadow: '0 2px 6px rgba(219, 39, 119, 0.25)'
                            }}
                          >
                            <Plus size={11} strokeWidth={2.8} /> Add Meds
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Right: Circular Progress Ring */}
                    <div
                      style={{
                        position: 'relative',
                        width: isMobile ? '68px' : '76px',
                        height: isMobile ? '68px' : '76px',
                        minWidth: isMobile ? '68px' : '76px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <svg
                        style={{
                          width: '100%',
                          height: '100%',
                          transform: 'rotate(-90deg)',
                          overflow: 'visible'
                        }}
                        viewBox="0 0 74 74"
                      >
                        <circle
                          cx="37"
                          cy="37"
                          r={ringRadius}
                          stroke="#FCE7F3"
                          strokeWidth={6.5}
                          fill="transparent"
                        />
                        <circle
                          cx="37"
                          cy="37"
                          r={ringRadius}
                          stroke="#DB2777"
                          strokeWidth={6.5}
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={hasConfiguredMeds ? ringOffset : ringCircumference}
                          strokeLinecap="round"
                          fill="transparent"
                          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
                        />
                      </svg>
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          pointerEvents: 'none'
                        }}
                      >
                        {hasConfiguredMeds ? (
                          <>
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: isMobile ? '15px' : '17px',
                                fontWeight: 900,
                                color: '#0F172A',
                                lineHeight: 1,
                                letterSpacing: '-0.3px'
                              }}
                            >
                              {rxPct}%
                            </span>
                            <span
                              style={{
                                fontSize: '8px',
                                fontWeight: 900,
                                color: '#DB2777',
                                letterSpacing: '0.8px',
                                textTransform: 'uppercase',
                                marginTop: '2px'
                              }}
                            >
                              {isRxDone ? 'MET ✓' : 'GOAL'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Plus size={isMobile ? 15 : 17} strokeWidth={2.8} color="#DB2777" />
                            <span
                              style={{
                                fontSize: '7.5px',
                                fontWeight: 900,
                                color: '#DB2777',
                                letterSpacing: '0.6px',
                                textTransform: 'uppercase',
                                marginTop: '1px'
                              }}
                            >
                              SET UP
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
          </div>
        </div>

        {/* Complete Health Profile Action Banner */}
        {!isProfileComplete && (
          <div style={{ padding: isMobile ? '0 12px 20px' : '0 24px 24px' }}>
            <div
              onClick={() => {
                triggerHapticLight();
                setShowCompleteProfileModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F0FDF4 100%)',
                border: '1.5px solid #10B981',
                borderRadius: '20px',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
                cursor: 'pointer',
                gap: '14px',
                transition: 'all 0.2s ease',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowCompleteProfileModal(true);
                }
              }}
              aria-label="Complete health profile"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '14px',
                  background: '#ECFDF5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <FolderHeart size={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                      Complete health profile
                    </h4>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.3 }}>
                    Add age, conditions, medicines, and allergies
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  triggerHapticLight();
                  setShowCompleteProfileModal(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 14px',
                  borderRadius: '999px',
                  background: '#0F766E',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)'
                }}
              >
                Add details <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {isProfileComplete && (
          <div style={{ padding: isMobile ? '0 12px 14px' : '0 24px 18px' }}>
            <FeatureProfileDataBanner
              featureName="Daily Circadian Tracker"
              contextMessage="Medication schedule, adherence tracking, and nutrient depletion alerts."
              accentColor="#0D9488"
            />
          </div>
        )}

        {/* Minimized Calm Space & Soundscapes Hub */}
        <div
          ref={calmSpaceRef}
          id="calm-space"
          style={{
            position: 'relative',
            padding: isMobile ? '0 12px 16px' : '0 24px 20px',
            margin: '0 0 8px 0',
            scrollMarginTop: '24px'
          }}
        >
          {/* Subtle ambient lighting glows */}
          <div style={{ position: 'absolute', top: '15%', left: '20%', width: '110px', height: '110px', background: 'rgba(45, 212, 191, 0.15)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '15%', right: '20%', width: '110px', height: '110px', background: 'rgba(196, 181, 253, 0.18)', borderRadius: '50%', filter: 'blur(40px)', zIndex: 0, pointerEvents: 'none' }} />

          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 2px 8px -2px rgba(15, 23, 42, 0.03)',
              position: 'relative',
              zIndex: 1,
              padding: isMobile ? '18px 14px 22px' : '24px 24px 28px',
              borderRadius: isMobile ? '24px' : '28px',
            }}
          >
            {/* 1. Calm Space Section */}
            <section style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? '19px' : '20px', fontWeight: 800, margin: '0 0 3px', color: '#0F172A', letterSpacing: '-0.5px' }}>
                    Calm Space
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, fontWeight: 500 }}>
                    Choose a sound and begin.
                  </p>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(240, 253, 250, 0.95)',
                    border: '1px solid rgba(204, 251, 241, 0.95)',
                    color: '#0D9488',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}
                >
                  <Sparkles size={11} /> Guided Rituals
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '10px' : '14px' }}>
                {CALM_SPACE_TRACKS.map((item) => (
                  <AudioTrackCard
                    key={item.id}
                    item={item}
                    isMobile={isMobile}
                    onSelect={() => {
                      triggerHapticLight();
                      setActiveMeditation({
                        id: item.id,
                        category_id: item.categoryId,
                        is_active: true,
                        type: item.type,
                        title: item.fullTitle,
                        subtitle: item.subtitle,
                        description: item.description,
                        cover_image_url: item.img,
                        audio_url: '',
                        video_url: '',
                        duration_minutes: item.durationMinutes,
                        calories_estimate: 0,
                        difficulty: 'Beginner',
                        equipment: [],
                        is_premium: false,
                        is_featured: true
                      });
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Subtle Ambient Divider */}
            <div
              style={{
                height: '1px',
                background: 'linear-gradient(90deg, transparent 0%, rgba(226, 232, 240, 0.9) 20%, rgba(203, 213, 225, 0.9) 50%, rgba(226, 232, 240, 0.9) 80%, transparent 100%)',
                margin: '8px 0 22px'
              }}
            />

            {/* 2. Soundscapes Section */}
            <section>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? '19px' : '20px', fontWeight: 800, margin: '0 0 3px', color: '#0F172A', letterSpacing: '-0.5px' }}>
                    Soundscapes
                  </h2>
                  <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, fontWeight: 500 }}>
                    Immersive audio environments
                  </p>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: 'rgba(240, 249, 255, 0.95)',
                    border: '1px solid rgba(224, 242, 254, 0.95)',
                    color: '#0284C7',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}
                >
                  <Waves size={11} /> Spatial Audio
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '10px' : '14px' }}>
                {SOUNDSCAPE_TRACKS.map((item) => (
                  <AudioTrackCard
                    key={item.id}
                    item={item}
                    isMobile={isMobile}
                    onSelect={() => {
                      triggerHapticLight();
                      setActiveMeditation({
                        id: item.id,
                        category_id: item.categoryId,
                        is_active: true,
                        type: item.type,
                        title: item.fullTitle,
                        subtitle: item.subtitle,
                        description: item.description,
                        cover_image_url: item.img,
                        audio_url: '',
                        video_url: '',
                        duration_minutes: item.durationMinutes,
                        calories_estimate: 0,
                        difficulty: 'Beginner',
                        equipment: [],
                        is_premium: false,
                        is_featured: true
                      });
                    }}
                  />
                ))}
              </div>
            </section>
          </div>
        </div>

      <ClinicalArticleSection />

      <CompleteProfileModal
        isOpen={showCompleteProfileModal}
        onClose={() => setShowCompleteProfileModal(false)}
        onCompleted={refreshProfileAndTasks}
      />

      <VitaminSchedulerModal
        isOpen={showVitaminModal}
        onClose={() => {
          setShowVitaminModal(false);
          setVitaminSchedule(getVitaminSchedule());
          try {
            const stored = getItemSync(getHabitStorageKey(todayDateStr));
            if (stored) setCompletedHabits(JSON.parse(stored));
          } catch {}
        }}
        onUpdated={() => {
          setVitaminSchedule(getVitaminSchedule());
          try {
            const stored = getItemSync(getHabitStorageKey(todayDateStr));
            if (stored) setCompletedHabits(JSON.parse(stored));
          } catch {
            // ignore
          }
        }}
      />

      <HydrationTrackerModal
        isOpen={showHydrationModal}
        onClose={() => {
          setShowHydrationModal(false);
          setHydrationData(getHydrationData());
          try {
            const stored = getItemSync(getHabitStorageKey(todayDateStr));
            if (stored) setCompletedHabits(JSON.parse(stored));
          } catch {}
        }}
        onUpdated={() => {
          setHydrationData(getHydrationData());
          try {
            const stored = getItemSync(getHabitStorageKey(todayDateStr));
            if (stored) setCompletedHabits(JSON.parse(stored));
          } catch {
            // ignore
          }
        }}
      />

      {activeMeditation && (
        <MeditationPlayer 
          content={activeMeditation} 
          onClose={() => setActiveMeditation(null)} 
        />
      )}

      <ConnectionDetectiveModal
        isOpen={showDetectiveModal}
        onClose={() => setShowDetectiveModal(false)}
        onOpenFoodDetective={() => navigate('/app/dietician', { state: { tab: 'elimination' } })}
        onOpenConsult={() => navigate('/app/consult')}
        onOpenCasePrep={() => navigate('/app/case-prep')}
      />

      <TriggerSensitivityModal
        isOpen={showZenGardenModal}
        onClose={() => setShowZenGardenModal(false)}
        initialTab="garden"
        standaloneTab
        onOpenMindfulness={() => {
          setShowZenGardenModal(false);
          window.setTimeout(() => {
            calmSpaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }}
      />

      {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}

    </div>
  );
};
