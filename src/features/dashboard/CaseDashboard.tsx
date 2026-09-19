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
              {/* Habit 1: Daily Hydration Tracking */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label={`Daily Hydration - ${completedHabits['hydration'] ? 'Goal Met' : 'Open intake tracker'}`}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
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
                  background: completedHabits['hydration']
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(224, 242, 254, 0.5) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(240, 249, 255, 0.5) 100%)',
                  backdropFilter: 'blur(28px)',
                  WebkitBackdropFilter: 'blur(28px)',
                  border: completedHabits['hydration'] 
                    ? '1.5px solid rgba(14, 165, 233, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: completedHabits['hydration']
                    ? '0 16px 36px rgba(14, 165, 233, 0.1), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 20px rgba(14, 165, 233, 0.05)'
                    : '0 16px 36px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 20px rgba(255,255,255,0.5)',
                  borderRadius: isMobile ? '24px' : '28px',
                  padding: isMobile ? '14px 13px 13px' : '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '142px' : '155px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  userSelect: 'none',
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease'
                }}
              >
                {/* Top Row: Glowing Icon on left, single tactile action button on right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div
                    aria-hidden="true"
                    style={{ 
                      width: isMobile ? '36px' : '40px', 
                      height: isMobile ? '36px' : '40px', 
                      minWidth: isMobile ? '36px' : '40px', 
                      minHeight: isMobile ? '36px' : '40px', 
                      flexShrink: 0,
                      borderRadius: '50%', 
                      background: completedHabits['hydration'] 
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                        : 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)', 
                      boxShadow: completedHabits['hydration']
                        ? '0 6px 14px rgba(16, 185, 129, 0.28), inset 0 1px 0 rgba(255,255,255,0.5)'
                        : '0 6px 14px rgba(2, 132, 199, 0.28), inset 0 1px 0 rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.6)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {completedHabits['hydration'] ? (
                      <Check size={isMobile ? 16 : 18} color="#FFF" strokeWidth={3} />
                    ) : (
                      <Droplets size={isMobile ? 16 : 18} color="#FFF" strokeWidth={2.2} />
                    )}
                  </div>

                  {/* Single Action Button on Right */}
                  {completedHabits['hydration'] ? (
                    <div 
                      style={{ 
                        background: 'rgba(16, 185, 129, 0.12)', 
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#059669', 
                        padding: '3px 8px', 
                        borderRadius: '999px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        flexShrink: 0
                      }}
                    >
                      <Check size={10} strokeWidth={3} />
                      <span>Goal Met</span>
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => handleQuickWater(250, e)}
                      title="Quick log 1 glass (+250ml)"
                      aria-label="Quick log 250ml water"
                      style={{
                        background: 'rgba(14, 165, 233, 0.12)',
                        border: '1px solid rgba(14, 165, 233, 0.28)',
                        borderRadius: '999px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#0284C7',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        boxShadow: '0 1px 4px rgba(14, 165, 233, 0.08)'
                      }}
                    >
                      <Plus size={11} strokeWidth={2.5} /> 250ml
                    </motion.button>
                  )}
                </div>

                {/* Centerpiece: Bold Hero KPI with Goal & Category */}
                <div style={{ margin: '8px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                    <span 
                      className="tabular-nums"
                      style={{ 
                        fontSize: isMobile ? '21px' : '23px', 
                        fontWeight: 800, 
                        color: '#0F172A', 
                        letterSpacing: '-0.6px', 
                        lineHeight: 1 
                      }}
                    >
                      {hydrationData.currentMl > 0 ? hydrationData.currentMl.toLocaleString() : '0'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                      / {hydrationData.targetMl >= 1000 ? `${(hydrationData.targetMl / 1000).toFixed(1).replace('.0', '')}k` : hydrationData.targetMl} ml
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginTop: '3px'
                  }}>
                    <span style={{ 
                      fontSize: isMobile ? '13px' : '14px', 
                      fontWeight: 700, 
                      color: completedHabits['hydration'] ? '#0284C7' : '#1E293B',
                      letterSpacing: '-0.2px'
                    }}>
                      Hydration
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '10.5px', fontWeight: 700, color: completedHabits['hydration'] ? '#0284C7' : '#94A3B8' }}>
                      {Math.round((hydrationData.currentMl / hydrationData.targetMl) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Bottom: Fluid Progress Track & Micro Science Link */}
                <div>
                  <div style={{
                    width: '100%',
                    height: '5px',
                    borderRadius: '999px',
                    background: 'rgba(14, 165, 233, 0.15)',
                    overflow: 'hidden',
                    marginBottom: '5px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((hydrationData.currentMl / hydrationData.targetMl) * 100))}%`,
                      background: 'linear-gradient(90deg, #38BDF8 0%, #0284C7 100%)',
                      boxShadow: '0 1px 6px rgba(2, 132, 199, 0.4)',
                      borderRadius: '999px',
                      transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#0284C7', fontWeight: 700 }}>
                      <Sparkles size={9} /> Gut Mucosa
                    </span>
                    <span style={{ color: '#94A3B8', fontWeight: 600 }}>
                      Details ›
                    </span>
                  </div>
                </div>
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
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowVitaminModal(true);
                  }
                }}
                style={{
                  background: completedHabits['vitamins']
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.92) 0%, rgba(240, 253, 244, 0.5) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(254, 252, 232, 0.5) 100%)',
                  backdropFilter: 'blur(28px)',
                  WebkitBackdropFilter: 'blur(28px)',
                  border: completedHabits['vitamins'] 
                    ? '1.5px solid rgba(16, 185, 129, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: completedHabits['vitamins']
                    ? '0 16px 36px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 20px rgba(16, 185, 129, 0.05)'
                    : '0 16px 36px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 20px rgba(255,255,255,0.5)',
                  borderRadius: isMobile ? '24px' : '28px',
                  padding: isMobile ? '14px 13px 13px' : '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '142px' : '155px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  userSelect: 'none',
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease'
                }}
              >
                {/* Top Row: Glowing Icon on left, single status/badge on right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div 
                    aria-hidden="true"
                    style={{ 
                      width: isMobile ? '36px' : '40px', 
                      height: isMobile ? '36px' : '40px', 
                      minWidth: isMobile ? '36px' : '40px', 
                      minHeight: isMobile ? '36px' : '40px', 
                      flexShrink: 0,
                      borderRadius: '50%', 
                      background: completedHabits['vitamins'] 
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                        : 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)', 
                      boxShadow: completedHabits['vitamins']
                        ? '0 6px 14px rgba(16, 185, 129, 0.28), inset 0 1px 0 rgba(255,255,255,0.5)'
                        : '0 6px 14px rgba(217, 119, 6, 0.28), inset 0 1px 0 rgba(255,255,255,0.5)',
                      border: '1px solid rgba(255,255,255,0.6)',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {completedHabits['vitamins'] ? (
                      <Check size={isMobile ? 16 : 18} color="#FFF" strokeWidth={3} />
                    ) : (
                      <Pill size={isMobile ? 16 : 18} color="#FFF" strokeWidth={2.2} />
                    )}
                  </div>

                  {/* Single Action Button on Right */}
                  {completedHabits['vitamins'] ? (
                    <div 
                      style={{ 
                        background: 'rgba(16, 185, 129, 0.12)', 
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: '#059669', 
                        padding: '3px 8px', 
                        borderRadius: '999px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        flexShrink: 0
                      }}
                    >
                      <Check size={10} strokeWidth={3} />
                      <span>Taken</span>
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleHabit('vitamins', 'Daily Micronutrient / Rx');
                      }}
                      title="Mark all vitamins taken"
                      aria-label="Mark all vitamins taken"
                      style={{
                        background: 'rgba(245, 158, 11, 0.12)',
                        border: '1px solid rgba(245, 158, 11, 0.28)',
                        borderRadius: '999px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#B45309',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        boxShadow: '0 1px 4px rgba(217, 119, 6, 0.08)'
                      }}
                    >
                      <Check size={11} strokeWidth={2.5} /> Done
                    </motion.button>
                  )}
                </div>

                {/* Centerpiece: Bold Hero KPI with Goal & Category */}
                <div style={{ margin: '8px 0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span 
                      className="tabular-nums"
                      style={{ 
                        fontSize: isMobile ? '21px' : '23px', 
                        fontWeight: 800, 
                        color: '#0F172A', 
                        letterSpacing: '-0.6px', 
                        lineHeight: 1 
                      }}
                    >
                      {completedHabits['vitamins'] 
                        ? (vitaminSchedule.length > 0 ? `${vitaminSchedule.length}/${vitaminSchedule.length}` : 'All') 
                        : (vitaminSchedule.length > 0 ? `${vitaminSchedule.filter(v => Boolean(v.takenToday)).length}/${vitaminSchedule.length}` : '0/1')}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>
                      {completedHabits['vitamins'] ? 'Doses Taken' : (vitaminSchedule.length > 0 ? 'Doses' : 'Scheduled')}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginTop: '3px'
                  }}>
                    <span style={{ 
                      fontSize: isMobile ? '13px' : '14px', 
                      fontWeight: 700, 
                      color: completedHabits['vitamins'] ? '#15803D' : '#1E293B',
                      letterSpacing: '-0.2px'
                    }}>
                      Daily Rx
                    </span>
                    <span className="tabular-nums" style={{ fontSize: '10.5px', fontWeight: 700, color: completedHabits['vitamins'] ? '#15803D' : '#94A3B8' }}>
                      {completedHabits['vitamins'] ? '100%' : (vitaminSchedule.length > 0 ? `${Math.round((vitaminSchedule.filter(v => Boolean(v.takenToday)).length / vitaminSchedule.length) * 100)}%` : 'Pending')}
                    </span>
                  </div>
                </div>

                {/* Bottom: Progress Track & Micro Science Link */}
                <div>
                  <div style={{
                    width: '100%',
                    height: '5px',
                    borderRadius: '999px',
                    background: 'rgba(245, 158, 11, 0.16)',
                    overflow: 'hidden',
                    marginBottom: '5px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: completedHabits['vitamins'] 
                        ? '100%' 
                        : `${vitaminSchedule.length > 0 ? Math.round((vitaminSchedule.filter(v => Boolean(v.takenToday)).length / vitaminSchedule.length) * 100) : 0}%`,
                      background: completedHabits['vitamins']
                        ? 'linear-gradient(90deg, #34D399 0%, #059669 100%)'
                        : 'linear-gradient(90deg, #FBBF24 0%, #D97706 100%)',
                      boxShadow: completedHabits['vitamins']
                        ? '0 1px 6px rgba(16, 185, 129, 0.4)'
                        : '0 1px 6px rgba(217, 119, 6, 0.4)',
                      borderRadius: '999px',
                      transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: '#B45309', fontWeight: 700 }}>
                      <Sparkles size={9} /> Micronutrients
                    </span>
                    <span style={{ color: '#94A3B8', fontWeight: 600 }}>
                      Details ›
                    </span>
                  </div>
                </div>
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
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03)',
              position: 'relative',
              zIndex: 1,
              padding: isMobile ? '16px 14px 20px' : '22px 22px 26px',
              borderRadius: isMobile ? '24px' : '28px',
            }}
          >
            {/* 1. Calm Space Section */}
            <section style={{ marginBottom: '22px' }}>
              <div style={{ marginBottom: '14px' }}>
                <h2 style={{ fontSize: isMobile ? '19px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', letterSpacing: '-0.5px' }}>
                  Calm Space
                </h2>
                <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, fontWeight: 400 }}>
                  Choose a sound and begin.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '10px' : '14px' }}>
                {[
                  {
                    id: 'm1',
                    title: 'Meditate',
                    fullTitle: 'Full Meditation',
                    subtitle: '30 min',
                    durationMinutes: 30,
                    img: '/images/thumb_zen_stones_1788260013795.jpg',
                    categoryId: 'meditation',
                    type: 'meditation' as const,
                    description: 'Our most complete meditation experience.'
                  },
                  {
                    id: 'mood-0',
                    title: 'Sleep',
                    fullTitle: 'Deep Sleep',
                    subtitle: '45 min',
                    durationMinutes: 45,
                    img: '/images/thumb_night_clouds_1788262545783.jpg',
                    categoryId: 'mood',
                    type: 'meditation' as const,
                    description: 'A guided progression into delta-wave sleep.'
                  },
                  {
                    id: 'mood-1',
                    title: 'Focus',
                    fullTitle: 'Deep Focus',
                    subtitle: '60 min',
                    durationMinutes: 60,
                    img: '/images/thumb_focus_sphere_1788262954419.jpg',
                    categoryId: 'mood',
                    type: 'meditation' as const,
                    description: 'Designed for deep work.'
                  },
                  {
                    id: 'mood-2',
                    title: 'Energy',
                    fullTitle: 'Morning Energy',
                    subtitle: '30 min',
                    durationMinutes: 30,
                    img: '/images/thumb_energy_sun_1788263731169.jpg',
                    categoryId: 'mood',
                    type: 'meditation' as const,
                    description: 'An energizing morning protocol.'
                  }
                ].map((item) => {
                  const handleSelect = () => {
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
                  };

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2, borderColor: '#CBD5E1', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSelect}
                      role="button"
                      tabIndex={0}
                      aria-label={`Play ${item.fullTitle}`}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect();
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobile ? '8px 10px' : '10px 14px',
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        minWidth: 0,
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0, overflow: 'hidden' }}>
                        <div style={{
                          width: isMobile ? '42px' : '48px',
                          height: isMobile ? '42px' : '48px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#F1F5F9',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)'
                        }}>
                          <img
                            loading="lazy"
                            decoding="async"
                            src={item.img}
                            alt={item.title}
                            onError={(e) => {
                              e.currentTarget.src = '/images/thumb_zen_stones_1788260013795.jpg';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: isMobile ? '14px' : '15px',
                            fontWeight: 700,
                            color: '#0F172A',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}>
                            {item.title}
                          </h3>
                          <p style={{
                            margin: '2px 0 0 0',
                            fontSize: isMobile ? '12px' : '13px',
                            color: '#64748B',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        paddingLeft: isMobile ? '4px' : '8px'
                      }}>
                        <Play size={13} fill="#0D9488" color="#0D9488" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>

            {/* Subtle Divider */}
            <div style={{ height: '1px', background: '#F1F5F9', margin: '4px 0 20px' }} />

            {/* 2. Soundscapes Section */}
            <section>
              <div style={{ marginBottom: '14px' }}>
                <h2 style={{ fontSize: isMobile ? '19px' : '20px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', letterSpacing: '-0.5px' }}>
                  Soundscapes
                </h2>
                <p style={{ fontSize: '13.5px', color: '#64748B', margin: 0, fontWeight: 400 }}>
                  Immersive audio environments
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '10px' : '14px' }}>
                {[
                  {
                    id: 'soundscape-0',
                    title: 'Rain',
                    fullTitle: 'Rain Sounds',
                    subtitle: 'Ambient',
                    durationMinutes: 120,
                    img: '/images/thumb_rain_window_1788262571496.jpg',
                    categoryId: 'soundscape',
                    type: 'soundscape' as const,
                    description: 'A continuous, looping recording of gentle rain falling on leaves.'
                  },
                  {
                    id: 'soundscape-1',
                    title: 'Focus Freqs',
                    fullTitle: 'Focus Freqs',
                    subtitle: '432Hz',
                    durationMinutes: 120,
                    img: '/images/thumb_freq_cymatics_1788264629537.jpg',
                    categoryId: 'soundscape',
                    type: 'soundscape' as const,
                    description: 'A continuous 432Hz frequency hum mixed with subtle brown noise.'
                  },
                  {
                    id: 'soundscape-2',
                    title: 'Forest Aura',
                    fullTitle: 'Forest Aura',
                    subtitle: 'Nature',
                    durationMinutes: 120,
                    img: '/images/thumb_water_drop_1788260024692.jpg',
                    categoryId: 'soundscape',
                    type: 'soundscape' as const,
                    description: 'A spatial audio recording of a temperate forest. Features gentle wind and distant birdsong.'
                  },
                  {
                    id: 'soundscape-3',
                    title: 'Ocean Waves',
                    fullTitle: 'Ocean Waves',
                    subtitle: 'Deep Delta',
                    durationMinutes: 120,
                    img: '/images/thumb_dark_ocean_1788262557769.jpg',
                    categoryId: 'soundscape',
                    type: 'soundscape' as const,
                    description: 'Continuous soothing ambient pad and ocean tide surf for deep relaxation.'
                  }
                ].map((item) => {
                  const handleSelect = () => {
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
                  };

                  return (
                    <motion.div
                      key={item.id}
                      whileHover={{ y: -2, borderColor: '#CBD5E1', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleSelect}
                      role="button"
                      tabIndex={0}
                      aria-label={`Play ${item.fullTitle}`}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect();
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMobile ? '8px 10px' : '10px 14px',
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        minWidth: 0,
                        userSelect: 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0, overflow: 'hidden' }}>
                        <div style={{
                          width: isMobile ? '42px' : '48px',
                          height: isMobile ? '42px' : '48px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          background: '#F1F5F9',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)'
                        }}>
                          <img
                            loading="lazy"
                            decoding="async"
                            src={item.img}
                            alt={item.title}
                            onError={(e) => {
                              e.currentTarget.src = '/images/thumb_rain_window_1788262571496.jpg';
                            }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                          <h3 style={{
                            margin: 0,
                            fontSize: isMobile ? '14px' : '15px',
                            fontWeight: 700,
                            color: '#0F172A',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}>
                            {item.title}
                          </h3>
                          <p style={{
                            margin: '2px 0 0 0',
                            fontSize: isMobile ? '12px' : '13px',
                            color: '#64748B',
                            fontWeight: 500,
                            lineHeight: 1.2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%'
                          }}>
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        paddingLeft: isMobile ? '4px' : '8px'
                      }}>
                        <Play size={13} fill="#0D9488" color="#0D9488" />
                      </div>
                    </motion.div>
                  );
                })}
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
