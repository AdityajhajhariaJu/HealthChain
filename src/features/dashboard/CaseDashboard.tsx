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
  ShieldCheck 
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

import { useIsMobile } from '../../hooks/useIsMobile';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { CinematicCheckbox } from '../../components/ui/CinematicCheckbox';
import { ARGroceryLens } from '../../components/ui/ARGroceryLens';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { SensualLineChart } from '../../components/ui/SensualLineChart';

import { FatigueModeToggle } from '../../components/ui/FatigueModeToggle';
import { VitalityNav } from '../../components/ui/FitnessNav';
import DailySymptomCheckinWidget from './DailySymptomCheckinWidget';
import MindfulHRVCard from '../../components/ui/MindfulHRVCard';
import { LivingHeartIcon } from '../../components/ui/LivingHeartIcon';

import { getProfile } from '../../services/ProfileEngine';
import { ClinicalFrictionModal } from '../../components/ui/ClinicalFrictionModal';

import { CLINICAL_ARTICLES, MedicalArticle } from '../../data/ClinicalArticles';
export { CLINICAL_ARTICLES } from '../../data/ClinicalArticles';
export type { MedicalArticle } from '../../data/ClinicalArticles';
import { ClinicalArticleSection } from './ClinicalArticleSection';


export default function CaseDashboard() {
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showFrictionModal, setShowFrictionModal] = useState(false);
  const [showARLens, setShowARLens] = useState(false);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);

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
      <FatigueModeToggle />
      <div style={{ paddingTop: isMobile ? "8px" : "16px" }}><VitalityNav /></div>
        
        <div style={{ padding: '0 24px 24px' }}>
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
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            
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
                role="button"
                tabIndex={0}
                aria-label="Clinical AR Food Lens"
                onClick={() => { triggerHapticLight(); setShowARLens(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticLight();
                    setShowARLens(true);
                  }
                }}
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
                role="button"
                tabIndex={0}
                aria-label={`Daily Hydration - ${completedHabits['hydration'] ? 'Completed' : 'Tap to mark done'}`}
                onClick={() => toggleHabit('hydration', 'Morning Hydration (500ml)')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHabit('hydration', 'Morning Hydration (500ml)');
                  }
                }}
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
                role="button"
                tabIndex={0}
                aria-label={`Calm Space Reset - ${completedHabits['calm_reset'] ? 'Completed' : 'Tap to start reset'}`}
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
                role="button"
                tabIndex={0}
                aria-label={`Daily Vitamins / Micronutrients - ${completedHabits['vitamins'] ? 'Completed' : 'Tap to mark done'}`}
                onClick={() => toggleHabit('vitamins', 'Daily Micronutrient / Rx')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHabit('vitamins', 'Daily Micronutrient / Rx');
                  }
                }}
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

        {/* Daily Clinical Protocols & Actions */}
        {dailyTasks.length > 0 && (
          <div style={{ padding: '0 24px 28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 2px', color: '#0F172A', letterSpacing: '-0.3px' }}>
                  Daily Clinical Protocols
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                  Scheduled medications & essential profile actions
                </p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', background: '#ECFDF5', color: '#059669' }}>
                +5 PTS EACH
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dailyTasks.map((task) => (
                <CinematicCheckbox
                  key={task.id}
                  label={task.title}
                  sublabel={task.subtitle}
                  initialChecked={!!completedHabits[task.id]}
                  onToggle={(checked) => {
                    toggleHabit(task.id, task.title);
                    if (checked) {
                      awardPoints(5, `Protocol: ${task.title}`, 'lifestyle', `proto_${task.id}_${todayDateStr}`);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
        {showARLens && <ARGroceryLens onClose={() => setShowARLens(false)} />}

        {/* Point 1: Clinical Symptom & Energy Check-in Widget */}
        <div style={{ padding: '0 24px 28px' }}>
          <DailySymptomCheckinWidget />
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

            {/* 4-4-4-4 Resonant HRV Coherence Box Breathing */}
            <div style={{ padding: '0 16px 20px' }}>
              <MindfulHRVCard />
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

      {/* 10 Clinical Evidence Dossiers & Immersive Reading Section */}
      <ClinicalArticleSection />

      <ClinicalFrictionModal isOpen={showFrictionModal} onComplete={() => setShowFrictionModal(false)} />

      {activeMeditation && (
        <MeditationPlayer 
          content={activeMeditation} 
          onClose={() => setActiveMeditation(null)} 
        />
      )}
    </div>
  );
};

