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
  Droplets, 
  Sparkles, 
  BookOpen, 
  Award, 
  X, 
  ShieldCheck,
  Info,
  ChevronDown,
  ArrowRight,
  FolderHeart,
  Pill,
  Plus,
  FileText,
  GitMerge,
  Zap,
  Leaf
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
import { getVitaminSchedule, VitaminItem } from '../../services/VitaminScheduleService';
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
import { TherapeuticOutcomeCard } from '../../components/ui/TherapeuticOutcomeCard';
import { ConnectionDetectiveModal } from '../../components/ui/ConnectionDetectiveModal';
import { TriggerSensitivityModal } from '../../components/ui/TriggerSensitivityModal';
import { ClinicalArticleSection } from './ClinicalArticleSection';
import { CalmSpaceSection } from './CalmSpaceSection';

const HABIT_RATIONALES: Record<string, { summary: string; detail: string; biomarker: string }> = {
  hydration: {
    summary: 'Supports daily hydration and energy.',
    detail: 'Drinking water consistently throughout the day supports circulation, energy levels, and healthy digestion.',
    biomarker: 'Hydration / Energy'
  },
  vitamins: {
    summary: 'Maintains consistent nutrient levels.',
    detail: 'Taking vitamins at regular times supports steady daily absorption and nutritional balance.',
    biomarker: 'Nutrient Balance'
  }
};

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
  const [expandedRationale, setExpandedRationale] = useState<string | null>(null);
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

  const toggleRationale = (habitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHapticSelection();
    setExpandedRationale(prev => prev === habitId ? null : habitId);
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
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticSelection();
                    setShowZenGardenModal(true);
                  }
                }}
                style={{
                  backgroundImage: 'linear-gradient(180deg, rgba(255, 255, 255, 0.0) 0%, rgba(255, 255, 255, 0.0) 48%, rgba(240, 253, 244, 0.82) 76%, rgba(240, 253, 244, 0.98) 100%), url(/images/zen-garden-dashboard.webp)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
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
                  padding: isMobile ? '18px 12px' : '24px',
                  minHeight: isMobile ? '220px' : '260px'
                }}
              >
                {/* Zen Sanctuary pill badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: isMobile ? '16px' : '20px',
                    background: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(167, 243, 208, 0.9)',
                    borderRadius: '999px',
                    padding: '4px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.15)',
                    zIndex: 1,
                  }}
                >
                  <span style={{ fontSize: '11px' }}>🌸</span>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    Zen Sanctuary
                  </span>
                </div>
                
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', textShadow: '0 1px 12px rgba(255,255,255,0.9)' }}>
                   <h3 className="serif-heading" style={{ fontSize: isMobile ? '26px' : '32px', fontWeight: 700, color: '#134E4A', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>Zen<br/>Garden</h3>
                   <p style={{ fontSize: '11px', color: '#0D9488', margin: 0, fontWeight: 800, letterSpacing: '1.2px', textTransform: 'uppercase' }}>PAUSE · BREATHE · RESET</p>
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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.35) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: '1px solid rgba(255, 255, 255, 0.95)', 
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 30px rgba(255,255,255,0.6)', 
                  borderRadius: isMobile ? '32px' : '40px',
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
                    background: 'linear-gradient(135deg, #A7C796 0%, #8EB67A 100%)', 
                    boxShadow: '0 8px 16px rgba(167, 199, 150, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)', 
                    border: '1px solid rgba(255,255,255,0.5)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Scan size={isMobile ? 18 : 20} color="#FFF" />
                  </div>
                  <div className="micro-badge" style={{ background: '#FFD180', color: '#B45309', padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    NEW
                  </div>
                </div>
                <div>
                  <h4 className="serif-heading" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#2D3748', lineHeight: 1.25, letterSpacing: '-0.3px' }}>Clinical Lens</h4>
                  <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#64748B', margin: 0, fontWeight: 600, lineHeight: 1.3 }}>Scan food for glycemic spikes</p>
                </div>
              </motion.div>

              {/* Connection Detective Bento Tile */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label="Connection Detective - Gut, food and biomarker connections"
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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.35) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: '1px solid rgba(255, 255, 255, 0.95)', 
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 30px rgba(255,255,255,0.6)', 
                  borderRadius: isMobile ? '32px' : '40px',
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
                    background: 'linear-gradient(135deg, #7DD3FC 0%, #38BDF8 100%)', 
                    boxShadow: '0 8px 16px rgba(56, 189, 248, 0.3), inset 0 1px 0 rgba(255,255,255,0.4)', 
                    border: '1px solid rgba(255,255,255,0.5)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <GitMerge size={isMobile ? 18 : 20} color="#FFF" />
                  </div>
                  <div className="micro-badge" style={{ background: '#E0F2FE', color: '#0284C7', padding: '4px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    CORRELATIONS
                  </div>
                </div>
                <div>
                  <h4 className="serif-heading" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#2D3748', lineHeight: 1.25, letterSpacing: '-0.3px' }}>Connection Detective</h4>
                  <p style={{ fontSize: isMobile ? '12px' : '13px', color: '#64748B', margin: 0, fontWeight: 600, lineHeight: 1.3 }}>Gut, food & biomarker connections</p>
                </div>
              </motion.div>

              {/* Point 3: Real Therapeutic Outcome & Symptom Delta Tracking */}
              <TherapeuticOutcomeCard span2={true} />

              {/* Point 3: Interactive Daily Habit Bento Stack */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label={`Daily Hydration - ${completedHabits['hydration'] ? 'Completed' : 'Tap to manage intake or mark done'}`}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => {
                  triggerHapticLight();
                  setShowHydrationModal(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowHydrationModal(true);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.35) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['hydration'] ? '1px solid rgba(56, 189, 248, 0.6)' : '1px solid rgba(255, 255, 255, 0.95)', 
                  boxShadow: completedHabits['hydration'] 
                    ? '0 20px 40px rgba(56, 189, 248, 0.1), inset 0 1px 0 rgba(255,255,255,0.95)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.95)', 
                  borderRadius: isMobile ? '32px' : '40px',
                  padding: isMobile ? '16px' : '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '135px' : '150px',
                  cursor: 'pointer',
                  transition: 'border 0.3s ease, box-shadow 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div 
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle hydration habit"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHabit('hydration', 'Morning Hydration (500ml)');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleHabit('hydration', 'Morning Hydration (500ml)');
                      }
                    }}
                    style={{ 
                      width: isMobile ? '38px' : '44px', 
                      height: isMobile ? '38px' : '44px', 
                      minWidth: isMobile ? '38px' : '44px', 
                      minHeight: isMobile ? '38px' : '44px', 
                      flexShrink: 0,
                      borderRadius: '50%', 
                      background: completedHabits['hydration'] 
                        ? 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)' 
                        : 'linear-gradient(135deg, rgba(14, 165, 233, 0.18) 0%, rgba(2, 132, 199, 0.1) 100%)', 
                      boxShadow: completedHabits['hydration'] ? '0 4px 12px rgba(2, 132, 199, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.6)',
                      border: completedHabits['hydration'] ? 'none' : '1px solid rgba(14, 165, 233, 0.3)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                  >
                    {completedHabits['hydration'] ? (
                      <Check size={isMobile ? 18 : 20} color="#FFF" />
                    ) : (
                      <Droplets size={isMobile ? 18 : 20} color="#0284C7" />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleQuickWater(250, e)}
                      title="Quick log 1 glass (+250ml)"
                      aria-label="Quick log 250ml water"
                      style={{
                        background: 'rgba(14, 165, 233, 0.1)',
                        border: '1px solid rgba(14, 165, 233, 0.25)',
                        borderRadius: '999px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#0369A1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Plus size={10} /> 250ml
                    </button>
                    <div 
                      className="tabular-nums micro-badge"
                      style={{ 
                        background: completedHabits['hydration'] ? '#E0F2FE' : 'rgba(14, 165, 233, 0.12)', 
                        color: completedHabits['hydration'] ? '#0284C7' : '#0369A1', 
                        padding: '3px 8px', 
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: 700,
                        letterSpacing: '0.4px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {completedHabits['hydration'] ? '✓ +2 PTS' : 'DAILY'}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="serif-heading" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#2D3748', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {hydrationData.currentMl >= hydrationData.targetMl 
                      ? 'Goal Reached 💧' 
                      : completedHabits['hydration'] 
                        ? 'Hydrated 💧' 
                        : 'Hydrate 500ml'}
                  </h4>
                  <p style={{ fontSize: isMobile ? '12px' : '13px', color: completedHabits['hydration'] ? '#0284C7' : '#64748B', margin: '0 0 8px', fontWeight: 600, lineHeight: 1.3 }}>
                    {hydrationData.currentMl > 0 
                      ? `${hydrationData.currentMl.toLocaleString()} / ${hydrationData.targetMl.toLocaleString()} ml • ${Math.round((hydrationData.currentMl / hydrationData.targetMl) * 100)}%`
                      : 'Tap to log sips & track'}
                  </p>

                  {/* Sleek Mini Fluid Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '999px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    overflow: 'hidden',
                    marginBottom: '12px',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((hydrationData.currentMl / hydrationData.targetMl) * 100))}%`,
                      background: 'linear-gradient(90deg, #BAE6FD 0%, #38BDF8 100%)',
                      borderRadius: '999px',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      data-compact="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticLight();
                        setShowHydrationModal(true);
                      }}
                      aria-label="Open Hydration Tracker"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(14, 165, 233, 0.1)',
                        border: '1px solid rgba(14, 165, 233, 0.25)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#0369A1',
                        cursor: 'pointer',
                        minWidth: 'unset',
                        minHeight: 'unset',
                        height: 'auto',
                        width: 'fit-content',
                      }}
                    >
                      <Droplets size={10} />
                      <span>Track</span>
                    </button>

                    <button
                      type="button"
                      data-compact="true"
                      onClick={(e) => toggleRationale('hydration', e)}
                      aria-label="Toggle clinical rationale for hydration"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: expandedRationale === 'hydration' ? 'rgba(14, 165, 233, 0.16)' : 'rgba(14, 165, 233, 0.08)',
                        border: '1px solid rgba(14, 165, 233, 0.22)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#0369A1',
                        cursor: 'pointer',
                        minWidth: 'unset',
                        minHeight: 'unset',
                        height: 'auto',
                        width: 'fit-content',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Info size={10} />
                      <span>Science</span>
                      <ChevronDown 
                        size={10} 
                        style={{ 
                          transform: expandedRationale === 'hydration' ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }} 
                      />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedRationale === 'hydration' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                      style={{
                        overflow: 'hidden',
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '14px',
                        padding: '8px 10px',
                        border: '1px solid rgba(14, 165, 233, 0.25)',
                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#0369A1', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Mechanism
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '9px', fontWeight: 700, color: '#64748B' }}>
                          {HABIT_RATIONALES.hydration.biomarker}
                        </span>
                      </div>
                      <p style={{ fontSize: '10.5px', color: '#334155', margin: 0, lineHeight: 1.35, fontWeight: 500 }}>
                        {HABIT_RATIONALES.hydration.detail}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Habit 2: Daily Vitamins / Micronutrients */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label={`Daily Vitamins / Micronutrients - ${completedHabits['vitamins'] ? 'Completed' : 'Tap to manage schedule or mark done'}`}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => {
                  triggerHapticLight();
                  setShowVitaminModal(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowVitaminModal(true);
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.35) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['vitamins'] ? '1px solid rgba(251, 191, 36, 0.6)' : '1px solid rgba(255, 255, 255, 0.95)', 
                  boxShadow: completedHabits['vitamins'] 
                    ? '0 20px 40px rgba(251, 191, 36, 0.1), inset 0 1px 0 rgba(255,255,255,0.95)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.95)', 
                  borderRadius: isMobile ? '32px' : '40px',
                  padding: isMobile ? '16px' : '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '135px' : '150px',
                  cursor: 'pointer',
                  transition: 'border 0.3s ease, box-shadow 0.3s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div 
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle all vitamins taken"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHabit('vitamins', 'Daily Micronutrient / Rx');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        toggleHabit('vitamins', 'Daily Micronutrient / Rx');
                      }
                    }}
                    style={{ 
                      width: isMobile ? '38px' : '44px', 
                      height: isMobile ? '38px' : '44px', 
                      minWidth: isMobile ? '38px' : '44px', 
                      minHeight: isMobile ? '38px' : '44px', 
                      flexShrink: 0,
                      borderRadius: '50%', 
                      background: completedHabits['vitamins'] 
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)', 
                      boxShadow: completedHabits['vitamins'] ? '0 4px 12px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.6)',
                      border: completedHabits['vitamins'] ? 'none' : '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                  >
                    {completedHabits['vitamins'] ? (
                      <Check size={isMobile ? 18 : 20} color="#FFF" />
                    ) : (
                      <Clock size={isMobile ? 18 : 20} color="#D97706" />
                    )}
                  </div>
                  <div 
                    className="tabular-nums micro-badge"
                    style={{ 
                      background: completedHabits['vitamins'] ? '#DCFCE7' : 'rgba(245, 158, 11, 0.15)', 
                      color: completedHabits['vitamins'] ? '#15803D' : '#B45309', 
                      padding: '3px 8px', 
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {completedHabits['vitamins'] ? '✓ +2 PTS' : 'RX / VIT'}
                  </div>
                </div>

                <div>
                  <h4 className="serif-heading" style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#2D3748', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {completedHabits['vitamins'] ? 'Taken 💊' : 'Daily Vitamins'}
                  </h4>
                  <p style={{ fontSize: isMobile ? '12px' : '13px', color: completedHabits['vitamins'] ? '#B45309' : '#64748B', margin: '0 0 8px', fontWeight: 600, lineHeight: 1.3 }}>
                    {completedHabits['vitamins'] ? 'Logged' : 'Log supplements'}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      data-compact="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticLight();
                        setShowVitaminModal(true);
                      }}
                      aria-label="Open Vitamin & Pill Schedule"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(217, 119, 6, 0.3)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#B45309',
                        cursor: 'pointer',
                        minWidth: 'unset',
                        minHeight: 'unset',
                        height: 'auto',
                        width: 'fit-content',
                      }}
                    >
                      <Pill size={10} />
                      <span>Schedule</span>
                    </button>

                    <button
                      type="button"
                      data-compact="true"
                      onClick={(e) => toggleRationale('vitamins', e)}
                      aria-label="Toggle clinical rationale for vitamins"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: expandedRationale === 'vitamins' ? 'rgba(217, 119, 6, 0.18)' : 'rgba(217, 119, 6, 0.08)',
                        border: '1px solid rgba(217, 119, 6, 0.25)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#B45309',
                        cursor: 'pointer',
                        minWidth: 'unset',
                        minHeight: 'unset',
                        height: 'auto',
                        width: 'fit-content',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Info size={10} />
                      <span>Science</span>
                      <ChevronDown 
                        size={10} 
                        style={{ 
                          transform: expandedRationale === 'vitamins' ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }} 
                      />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedRationale === 'vitamins' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                      style={{
                        overflow: 'hidden',
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '14px',
                        padding: '8px 10px',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        boxShadow: '0 4px 12px rgba(217, 119, 6, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#B45309', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Mechanism
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '9px', fontWeight: 700, color: '#64748B' }}>
                          {HABIT_RATIONALES.vitamins.biomarker}
                        </span>
                      </div>
                      <p style={{ fontSize: '10.5px', color: '#334155', margin: 0, lineHeight: 1.35, fontWeight: 500 }}>
                        {HABIT_RATIONALES.vitamins.detail}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
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
        {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}

        <CalmSpaceSection onSelect={setActiveMeditation} sectionRef={calmSpaceRef} />

        <div
          aria-hidden="true"
          style={{ display: 'none' }}
        >
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
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.5px' }}>Calm Space</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0 }}>Meditation and restorative sound</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px', padding: '0 16px 16px' }}>
              {[
                { 
                  id: 'm1', 
                  title: 'Full Meditation', 
                  subtitle: 'Guided audio',
                  duration: '30 MIN',
                  img: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80',
                  description: 'Our most complete meditation experience.'
                },
                {
                  id: 'mood-0',
                  title: 'Deep Sleep',
                  subtitle: 'Sleep soundscape',
                  duration: '45 MIN',
                  img: '/images/thumb_night_clouds_1788262545783.jpg',
                  description: 'A guided progression into delta-wave sleep.'
                },
                {
                  id: 'mood-1',
                  title: 'Deep Focus',
                  subtitle: 'Focus soundscape',
                  duration: '60 MIN',
                  img: '/images/thumb_focus_sphere_1788262954419.jpg',
                  description: 'Designed for deep work.'
                },
                {
                  id: 'mood-2',
                  title: 'Morning Energy',
                  subtitle: 'Morning protocol',
                  duration: '30 MIN',
                  img: '/images/thumb_energy_sun_1788263731169.jpg',
                  description: 'An energizing morning protocol.'
                }
              ].map((item, i) => {
                const handleSelectMeditation = () => {
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
                };
                return (
                  <div 
                    key={i} 
                    onClick={handleSelectMeditation}
                    role="button"
                    tabIndex={0}
                    aria-label={`Play ${item.title}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectMeditation();
                      }
                    }}
                    className="active-scale" 
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer' }}
                  >
                    <div style={{ position: 'relative', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 10px 24px rgba(0,0,0,0.12)', aspectRatio: '1/1' }}>
                    <img 
                      loading="lazy" 
                      decoding="async" 
                      src={item.img} 
                      alt={item.title} 
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&q=80';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }} 
                    />
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700, color: 'white', letterSpacing: '0.4px' }}>
                      {item.duration}
                    </div>
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '15px', fontWeight: 700, color: '#0F172A', lineHeight: 1.2 }}>{item.title}</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748B', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.subtitle}</p>
                  </div>
                </div>
              );
            })}
            </div>
          </section>

          {/* Soundscapes */}
          <section style={{
            marginBottom: '0',
            padding: '8px 0 16px'
          }}>
            <div style={{ padding: '0 16px', marginBottom: '16px' }}>
              <h2 className="serif-heading" style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 2px', color: '#2D3748', letterSpacing: '-0.5px' }}>Soundscapes</h2>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0, fontWeight: 600 }}>Immersive audio environments</p>
            </div>
            <div className="hide-scrollbar scrollable-row" style={{ display: 'flex', gap: '18px', overflowX: 'auto', padding: '6px 20px 28px', scrollbarWidth: 'none', margin: 0, WebkitOverflowScrolling: 'touch' }}>
              {[
                { 
                  name: 'Rain Sounds', 
                  desc: 'Deep Focus',
                  format: 'Ambient Audio',
                  icon: <Droplets size={20} color="#38BDF8" fill="#38BDF8" />, 
                  accentColor: '#38BDF8',
                  shadowColor: 'rgba(14, 165, 233, 0.35)',
                  overlayGradient: 'linear-gradient(180deg, rgba(2, 6, 23, 0.08) 0%, rgba(14, 116, 144, 0.25) 40%, rgba(2, 6, 23, 0.92) 100%)',
                  img: '/images/thumb_rain_window_1788262571496.jpg'
                },
                { 
                  name: 'Focus Freqs', 
                  desc: '432Hz Tone',
                  format: 'Calm Tone',
                  icon: <Zap size={20} color="#E879F9" fill="#E879F9" />, 
                  accentColor: '#E879F9',
                  shadowColor: 'rgba(192, 132, 252, 0.35)',
                  overlayGradient: 'linear-gradient(180deg, rgba(15, 5, 29, 0.08) 0%, rgba(88, 28, 135, 0.28) 40%, rgba(15, 5, 29, 0.92) 100%)',
                  img: '/images/thumb_night_clouds_1788262545783.jpg'
                },
                { 
                  name: 'Forest Aura', 
                  desc: 'Nature Calm',
                  format: 'Nature Sounds',
                  icon: <Leaf size={20} color="#4ADE80" fill="#4ADE80" />, 
                  accentColor: '#4ADE80',
                  shadowColor: 'rgba(34, 197, 94, 0.35)',
                  overlayGradient: 'linear-gradient(180deg, rgba(2, 44, 34, 0.08) 0%, rgba(6, 78, 59, 0.28) 40%, rgba(2, 30, 24, 0.92) 100%)',
                  img: '/images/thumb_water_drop_1788260024692.jpg'
                }
              ].map((type, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0, width: isMobile ? '165px' : '190px', height: isMobile ? '210px' : '230px', display: 'flex' }}>
                  <motion.button 
                    whileHover={{ y: -5, scale: 1.025 }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      width: '100%', height: '100%', borderRadius: '32px',
                      backgroundImage: `${type.overlayGradient}, url(${type.img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex', flexDirection: 'column',
                      justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 16px 18px', 
                      border: '1.5px solid rgba(255, 255, 255, 0.38)', cursor: 'pointer',
                      boxShadow: `0 22px 44px -10px ${type.shadowColor}, 0 6px 16px rgba(0, 0, 0, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.65), inset 0 -1px 0 rgba(0, 0, 0, 0.3)`,
                      position: 'relative', overflow: 'hidden'
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
                                  type.name === 'Focus Freqs' ? '432Hz ambient hum' :
                                  'Immersive woodland ecosystem',
                        description: type.name === 'Rain Sounds' ? 'A continuous, looping recording of gentle rain falling on leaves.' : 
                                     type.name === 'Focus Freqs' ? 'A continuous 432Hz frequency hum mixed with subtle brown noise.' :
                                     'A spatial audio recording of a temperate forest. Features gentle wind and distant birdsong.',
                        cover_image_url: type.img,
                        audio_url: '',
                        video_url: '',
                        duration_minutes: 120,
                        calories_estimate: 0,
                        difficulty: 'Beginner', equipment: [], is_premium: false, is_featured: true
                      });
                    }}
                  >
                    {/* Ambient Glow Aura */}
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
                      background: 'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
                      pointerEvents: 'none'
                    }} />

                    {/* Top Action Row: Frosted Glass Ambient Pill & Play Pill */}
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
                      {/* Ambient Icon Frosted Disc */}
                      <div style={{
                        width: '42px', height: '42px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.12) 100%)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1.5px solid rgba(255, 255, 255, 0.65)',
                        boxShadow: '0 8px 18px rgba(0, 0, 0, 0.3), inset 0 1.5px 0 rgba(255, 255, 255, 0.85)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {type.icon}
                      </div>

                      {/* Radiant Frosted Play Pill */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.15) 100%)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        padding: '5px 11px',
                        borderRadius: '999px',
                        border: '1.5px solid rgba(255, 255, 255, 0.7)',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                      }}>
                        <Play size={10} color="#FFFFFF" fill="#FFFFFF" />
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '0.6px' }}>
                          PLAY
                        </span>
                      </div>
                    </div>

                    {/* Bottom Information Cluster */}
                    <div style={{ width: '100%', textAlign: 'left', zIndex: 1, marginTop: 'auto' }}>
                      {/* Pre-title Chip */}
                      <span style={{ 
                        display: 'inline-block',
                        background: 'rgba(255, 255, 255, 0.16)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '9.5px', 
                        fontWeight: 800, 
                        color: type.accentColor, 
                        letterSpacing: '0.8px', 
                        textTransform: 'uppercase', 
                        marginBottom: '6px',
                        textShadow: `0 0 10px ${type.shadowColor}`
                      }}>
                        {type.desc}
                      </span>

                      {/* Main Title */}
                      <span className="serif-heading" style={{ 
                        color: '#FFFFFF', 
                        fontWeight: 700, 
                        fontSize: '19px', 
                        lineHeight: '1.15', 
                        display: 'block', 
                        letterSpacing: '-0.4px',
                        marginBottom: '8px',
                        textShadow: '0 3px 14px rgba(0, 0, 0, 0.95)'
                      }}>
                        {type.name.split(' ')[0]}<br/>{type.name.split(' ')[1]}
                      </span>

                      {/* Audio Format Row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '11px' }}>
                          <span style={{ width: '2.5px', height: '6px', background: type.accentColor, borderRadius: '2px' }} />
                          <span style={{ width: '2.5px', height: '10px', background: type.accentColor, borderRadius: '2px' }} />
                          <span style={{ width: '2.5px', height: '5px', background: type.accentColor, borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.9)', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.85)' }}>
                          {type.format}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                </div>
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
        onClose={() => setShowVitaminModal(false)}
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
        onClose={() => setShowHydrationModal(false)}
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
          window.setTimeout(() => {
            calmSpaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
        }}
      />

    </div>
  );
};
