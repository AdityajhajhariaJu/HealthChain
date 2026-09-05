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
  Pin, 
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
  Plus
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
import { VitaminSchedulerModal } from '../../components/ui/VitaminSchedulerModal';
import { getVitaminSchedule, VitaminItem } from '../../services/VitaminScheduleService';
import { HydrationTrackerModal } from '../../components/ui/HydrationTrackerModal';
import { getHydrationData, addWaterLog, HydrationDayData } from '../../services/HydrationService';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { SensualLineChart } from '../../components/ui/SensualLineChart';

import { VitalityNav } from '../../components/ui/FitnessNav';
import { LivingHeartIcon } from '../../components/ui/LivingHeartIcon';
import { getItemSync, setItemSync } from '../../services/storage';

import { getProfile } from '../../services/ProfileEngine';
import { ClinicalFrictionModal } from '../../components/ui/ClinicalFrictionModal';

import { CLINICAL_ARTICLES, MedicalArticle } from '../../data/ClinicalArticles';
export { CLINICAL_ARTICLES } from '../../data/ClinicalArticles';
export type { MedicalArticle } from '../../data/ClinicalArticles';
import { ClinicalArticleSection } from './ClinicalArticleSection';
import { VitalityStreakBanner } from './VitalityStreakBanner';

const HABIT_RATIONALES: Record<string, { summary: string; detail: string; biomarker: string }> = {
  hydration: {
    summary: 'Activates intravascular blood volume expansion.',
    detail: 'Rapid hydration upon waking offsets overnight hemoconcentration, lowering resting sympathetic tone and supporting renal clearance of inflammatory markers.',
    biomarker: 'Osmolality / Cortisol'
  },
  calm_reset: {
    summary: 'Engages aortic arch baroreceptors for parasympathetic tone.',
    detail: 'Controlled rhythmic respiration dampens adrenergic surges, boosting High-Frequency Heart Rate Variability (HF-HRV) and lowering acute autonomic stress.',
    biomarker: 'RMSSD / Vagal Tone'
  },
  vitamins: {
    summary: 'Saturates essential mitochondrial coenzymes.',
    detail: 'Consistent daily administration maintains steady micronutrient serum concentration, optimizing cellular Krebs cycle bioenergetics and antioxidant enzyme activity.',
    biomarker: 'Bioavailability'
  }
};

export default function CaseDashboard() {
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [showARLens, setShowARLens] = useState(false);
  const [showCompleteProfileModal, setShowCompleteProfileModal] = useState(false);
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
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [expandedRationale, setExpandedRationale] = useState<string | null>(null);
  const [showVitaminModal, setShowVitaminModal] = useState(false);
  const [vitaminSchedule, setVitaminSchedule] = useState<VitaminItem[]>(() => getVitaminSchedule());
  const [showHydrationModal, setShowHydrationModal] = useState(false);
  const [hydrationData, setHydrationData] = useState<HydrationDayData>(() => getHydrationData());
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>(() => {
    try {
      const stored = getItemSync(`healthchain_habits_${todayDateStr}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleHabitsUpdated = () => {
      try {
        const stored = getItemSync(`healthchain_habits_${todayDateStr}`);
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
      const stored = getItemSync(`healthchain_habits_${todayDateStr}`);
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
    setItemSync(`healthchain_habits_${todayDateStr}`, JSON.stringify(next));

    if (isNowDone) {
      triggerHapticSuccess();
      awardPoints(2, `Daily Habit: ${title}`, 'lifestyle', `habit_${habitId}_${todayDateStr}`);
    } else {
      triggerHapticLight();
    }
  };

  const [activeMeditation, setActiveMeditation] = useState<FitnessContent | null>(null);
  const lastMeditationRef = useRef<FitnessContent | null>(null);

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
      background: 'linear-gradient(180deg, #FFF8F4 0%, #FFF2E8 35%, #FDF0E7 100%)',
      backgroundColor: '#FFF2E8',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : '24px',
      overflowX: 'clip'
    }}>
      <div style={{ paddingTop: isMobile ? "8px" : "16px" }}><VitalityNav /></div>
        
        <div style={{ padding: isMobile ? '0 12px 20px' : '0 24px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: 12 }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.5px' }}>Dashboard</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  navigate('/app/ava', {
                    state: {
                      initialPrompt: 'Hi Ava, I would like to do a quick clinical health check-in. Can you review my day and recent biomarkers?'
                    }
                  });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)',
                  color: '#FFFFFF',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.15)'
                }}
              >
                <Sparkles size={14} color="#38BDF8" /> Ask Ava
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                <LivingHeartIcon size={16} color="#F43F5E" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Live Biometrics</span>
              </div>
            </div>
          </div>
          
          {/* Gamified Vitality Streak, 7-Day Horizon, Mystery Drop & Trophy Catch */}
          <VitalityStreakBanner completedHabits={completedHabits} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '10px' : '14px' }}>
            
            {/* The Glassmorphic Arch Canvas Tile */}
              <div 
                role="button"
                tabIndex={0}
                aria-label="Health Canvas War Room"
                onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticLight();
                    navigate('/app/war-room');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.05) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: '1px solid rgba(255, 255, 255, 0.8)', 
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255,255,255,0.7), inset 0 0 30px rgba(255,255,255,0.4)', 
                  gridRow: 'span 2',
                  borderRadius: isMobile ? '80px 80px 24px 24px' : '160px 160px 32px 32px', 
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isMobile ? '18px 12px' : '24px',
                  minHeight: isMobile ? '220px' : '260px'
                }}
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
                   <h3 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#334155', margin: '0 0 4px', lineHeight: 1.1, letterSpacing: '-0.5px' }}>Health<br/>Canvas</h3>
                   <p style={{ fontSize: '11px', color: '#64748B', margin: 0, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>DR. JENKINS</p>
                </div>
              </div>

              
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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: '1px solid rgba(255, 255, 255, 0.85)', 
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 30px rgba(255,255,255,0.4)', 
                  borderRadius: isMobile ? '24px' : '32px',
                  padding: isMobile ? '14px 14px' : '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '125px' : '140px',
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
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.7) 100%)', 
                    backdropFilter: 'blur(12px)', 
                    WebkitBackdropFilter: 'blur(12px)', 
                    boxShadow: '0 4px 12px rgba(15,23,42,0.3), inset 0 1px 0 rgba(255,255,255,0.3)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Scan size={isMobile ? 18 : 20} color="#FFF" />
                  </div>
                  <div className="micro-badge" style={{ background: '#EF4444', color: '#FFF', padding: '3px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    NEW
                  </div>
                </div>
                <div>
                  <h4 style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', lineHeight: 1.25, letterSpacing: '-0.3px' }}>Clinical Lens</h4>
                  <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#64748B', margin: 0, fontWeight: 500, lineHeight: 1.3 }}>Scan food for glycemic spikes</p>
                </div>
              </motion.div>

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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['hydration'] ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.85)', 
                  boxShadow: completedHabits['hydration'] 
                    ? '0 20px 40px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255,255,255,0.95)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255,255,255,0.95)', 
                  borderRadius: isMobile ? '24px' : '32px',
                  padding: isMobile ? '14px 14px' : '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '125px' : '140px',
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
                        ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                        : 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(5, 150, 105, 0.1) 100%)', 
                      boxShadow: completedHabits['hydration'] ? '0 4px 12px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.6)',
                      border: completedHabits['hydration'] ? 'none' : '1px solid rgba(16, 185, 129, 0.3)',
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
                      <Droplets size={isMobile ? 18 : 20} color="#059669" />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={(e) => handleQuickWater(250, e)}
                      title="Quick log 1 glass (+250ml)"
                      aria-label="Quick log 250ml water"
                      style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '999px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#065F46',
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
                        background: completedHabits['hydration'] ? '#DCFCE7' : 'rgba(16, 185, 129, 0.12)', 
                        color: completedHabits['hydration'] ? '#15803D' : '#065F46', 
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
                  <h4 style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {hydrationData.currentMl >= hydrationData.targetMl 
                      ? 'Goal Reached 💧' 
                      : completedHabits['hydration'] 
                        ? 'Hydrated 💧' 
                        : 'Hydrate 500ml'}
                  </h4>
                  <p style={{ fontSize: isMobile ? '11px' : '12px', color: completedHabits['hydration'] ? '#10B981' : '#64748B', margin: '0 0 4px', fontWeight: 500, lineHeight: 1.3 }}>
                    {hydrationData.currentMl > 0 
                      ? `${hydrationData.currentMl.toLocaleString()} / ${hydrationData.targetMl.toLocaleString()} ml • ${Math.round((hydrationData.currentMl / hydrationData.targetMl) * 100)}%`
                      : 'Tap to log sips & track'}
                  </p>

                  {/* Sleek Mini Fluid Progress Bar */}
                  <div style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '999px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    overflow: 'hidden',
                    marginBottom: '8px',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((hydrationData.currentMl / hydrationData.targetMl) * 100))}%`,
                      background: 'linear-gradient(90deg, #34D399 0%, #059669 100%)',
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
                      aria-label="Open Cellular Hydration Tracker"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: '#065F46',
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
                        background: expandedRationale === 'hydration' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.22)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: '#065F46',
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
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#065F46', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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

              {/* Habit 2: Calm Reset */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label={`Calm Space Reset - ${completedHabits['calm_reset'] ? 'Completed' : 'Tap to start reset'}`}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => {
                  triggerHapticLight();
                  toggleHabit('calm_reset', 'Calm Space Reset');
                  if (!completedHabits['calm_reset']) {
                    setActiveMeditation({
                      id: 'm1',
                      category_id: 'meditation',
                      is_active: true,
                      type: 'meditation',
                      title: 'Full Meditation',
                      subtitle: 'Immersive audio journey',
                      description: 'Our most complete meditation experience.',
                      cover_image_url: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&q=80',
                      audio_url: '',
                      video_url: '',
                      duration_minutes: 30,
                      calories_estimate: 0,
                      difficulty: 'Beginner',
                      equipment: [],
                      is_premium: false,
                      is_featured: true
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticLight();
                    toggleHabit('calm_reset', 'Calm Space Reset');
                  }
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['calm_reset'] ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.85)', 
                  boxShadow: completedHabits['calm_reset'] 
                    ? '0 20px 40px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255,255,255,0.95)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255,255,255,0.95)', 
                  borderRadius: isMobile ? '24px' : '32px',
                  padding: isMobile ? '14px 14px' : '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '125px' : '140px',
                  cursor: 'pointer',
                  transition: 'border 0.3s ease, box-shadow 0.3s ease'
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
                    background: completedHabits['calm_reset'] 
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                    : 'linear-gradient(135deg, rgba(45, 212, 191, 0.2) 0%, rgba(20, 184, 166, 0.1) 100%)', 
                    boxShadow: completedHabits['calm_reset'] ? '0 4px 12px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.6)',
                    border: completedHabits['calm_reset'] ? 'none' : '1px solid rgba(45, 212, 191, 0.3)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    {completedHabits['calm_reset'] ? (
                      <Check size={isMobile ? 18 : 20} color="#FFF" />
                    ) : (
                      <Wind size={isMobile ? 18 : 20} color="#0D9488" />
                    )}
                  </div>
                  <div 
                    className="tabular-nums micro-badge"
                    style={{ 
                      background: completedHabits['calm_reset'] ? '#DCFCE7' : 'rgba(45, 212, 191, 0.15)', 
                      color: completedHabits['calm_reset'] ? '#15803D' : '#0F766E', 
                      padding: '3px 8px', 
                      borderRadius: '999px',
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.4px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    {completedHabits['calm_reset'] ? '✓ +2 PTS' : 'MINDFUL'}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {completedHabits['calm_reset'] ? 'Mind Reset 🧘' : 'Calm Space'}
                  </h4>
                  <p style={{ fontSize: isMobile ? '11px' : '12px', color: completedHabits['calm_reset'] ? '#10B981' : '#64748B', margin: '0 0 6px', fontWeight: 500, lineHeight: 1.3 }}>
                    {completedHabits['calm_reset'] ? 'HRV baroreflex tuned' : '5-min nervous reset'}
                  </p>

                  <button
                    type="button"
                    data-compact="true"
                    onClick={(e) => toggleRationale('calm_reset', e)}
                    aria-label="Toggle clinical rationale for calm reset"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: expandedRationale === 'calm_reset' ? 'rgba(13, 148, 136, 0.18)' : 'rgba(13, 148, 136, 0.08)',
                      border: '1px solid rgba(13, 148, 136, 0.25)',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#0D9488',
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
                        transform: expandedRationale === 'calm_reset' ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                      }} 
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {expandedRationale === 'calm_reset' && (
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
                        border: '1px solid rgba(45, 212, 191, 0.3)',
                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#0D9488', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Mechanism
                        </span>
                        <span className="tabular-nums" style={{ fontSize: '9px', fontWeight: 700, color: '#64748B' }}>
                          {HABIT_RATIONALES.calm_reset.biomarker}
                        </span>
                      </div>
                      <p style={{ fontSize: '10.5px', color: '#334155', margin: 0, lineHeight: 1.35, fontWeight: 500 }}>
                        {HABIT_RATIONALES.calm_reset.detail}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Habit 3: Daily Vitamins / Micronutrients */}
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
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 100%)', 
                  backdropFilter: 'blur(32px)', 
                  WebkitBackdropFilter: 'blur(32px)', 
                  border: completedHabits['vitamins'] ? '1.5px solid #10B981' : '1px solid rgba(255, 255, 255, 0.85)', 
                  boxShadow: completedHabits['vitamins'] 
                    ? '0 20px 40px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255,255,255,0.95)' 
                    : '0 20px 40px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255,255,255,0.95)', 
                  borderRadius: isMobile ? '24px' : '32px',
                  padding: isMobile ? '14px 14px' : '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isMobile ? '125px' : '140px',
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
                  <h4 style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {completedHabits['vitamins'] ? 'Vitamins Taken 💊' : 'Daily Vitamins'}
                  </h4>
                  <p style={{ fontSize: isMobile ? '11px' : '12px', color: completedHabits['vitamins'] ? '#10B981' : '#64748B', margin: '0 0 6px', fontWeight: 500, lineHeight: 1.3 }}>
                    {completedHabits['vitamins'] 
                      ? 'Cellular micronutrients taken' 
                      : `${vitaminSchedule.filter(v => v.enabled).length} scheduled • Tap to set times`}
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
              aria-label="Complete Health Profile (Takes 2 mins)"
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
                      Complete Health Profile
                    </h4>
                    <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', background: '#ECFDF5', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      +50 PTS REWARD
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#64748B', lineHeight: 1.3 }}>
                    Add age, conditions, medications & allergies • Takes 2 mins
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
                Start Setup <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}

        {isProfileComplete && (
          <div style={{ padding: isMobile ? '0 12px 14px' : '0 24px 18px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 16px',
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '14px',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#065F46', whiteSpace: 'nowrap' }}>
                  Clinical Dossier Active
                </span>
                {profile?.demographics?.age && (
                  <span style={{ fontSize: '11.5px', color: '#059669', opacity: 0.85, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    ({profile.demographics.age}y • {profile.demographics.bloodGroup && profile.demographics.bloodGroup !== 'Unknown' ? profile.demographics.bloodGroup : 'Verified'})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHapticLight();
                  setShowCompleteProfileModal(true);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0F766E',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                Edit / Update →
              </button>
            </div>
          </div>
        )}
        {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}


        <div style={{ position: 'relative', margin: '0 0 16px 0' }}>
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
                    <div style={{ color: 'white', marginBottom: '8px' }}>
                      {type.icon}
                    </div>
                    <span style={{ color: 'white', fontWeight: 600, fontSize: '14px', textAlign: 'center', lineHeight: '1.2' }}>{type.name}</span>
                  </motion.button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 10 Clinical Evidence Dossiers & Immersive Reading Section */}
      <ClinicalArticleSection />

      <ClinicalFrictionModal isOpen={showFrictionModal} onComplete={() => setShowFrictionModal(false)} />

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
            const stored = getItemSync(`healthchain_habits_${todayDateStr}`);
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
            const stored = getItemSync(`healthchain_habits_${todayDateStr}`);
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
    </div>
  );
};

