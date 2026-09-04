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
  ArrowRight 
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useIsMobile } from '../../hooks/useIsMobile';
import { SwimlaneCarousel } from '../../components/ui/SwimlaneCarousel';
import { BottomSheetOverlay } from '../../components/ui/BottomSheetOverlay';
import { ImmersiveMediaCard } from '../../components/ui/ImmersiveMediaCard';
import { MeditationPlayer } from '../../components/ui/MeditationPlayer';
import { CinematicCheckbox } from '../../components/ui/CinematicCheckbox';
import { ARGroceryLens } from '../../components/ui/ARGroceryLens';
import { triggerHapticLight, triggerHapticSuccess, triggerHapticSelection } from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { FitnessService, FitnessContent, FitnessCategory } from '../../services/FitnessService';
import { SensualLineChart } from '../../components/ui/SensualLineChart';

import { FatigueModeToggle } from '../../components/ui/FatigueModeToggle';
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
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);

  // Point 3: Interactive Daily Habit Bento Stack & Progressive Disclosure
  const todayDateStr = new Date().toISOString().split('T')[0];
  const [expandedRationale, setExpandedRationale] = useState<string | null>(null);
  const [completedHabits, setCompletedHabits] = useState<Record<string, boolean>>(() => {
    try {
      const stored = getItemSync(`healthchain_habits_${todayDateStr}`);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

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
            
            {/* The Rajasthani Palace Gate Health Canvas Tile */}
              <motion.div 
                role="button"
                tabIndex={0}
                aria-label="Enter Health Canvas Multi-Agent War Room"
                onClick={() => { triggerHapticLight(); navigate('/app/war-room'); }} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerHapticLight();
                    navigate('/app/war-room');
                  }
                }}
                whileHover={{ 
                  y: -4, 
                  scale: 1.015,
                  boxShadow: '0 24px 48px rgba(180, 83, 9, 0.16), 0 6px 18px rgba(0, 0, 0, 0.06), inset 0 2px 0 rgba(255, 255, 255, 0.9), inset 0 0 28px rgba(254, 243, 199, 0.55)'
                }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                style={{
                  gridRow: 'span 2',
                  borderRadius: isMobile ? '80px 80px 24px 24px' : '140px 140px 32px 32px',
                  background: 'linear-gradient(180deg, rgba(254, 243, 199, 0.5) 0%, rgba(255, 255, 255, 0.78) 32%, rgba(248, 250, 252, 0.95) 100%)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  boxShadow: '0 20px 40px rgba(180, 83, 9, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.8), inset 0 0 24px rgba(254, 243, 199, 0.4)',
                  padding: isMobile ? '16px 10px 14px' : '20px 14px 18px',
                  minHeight: isMobile ? '280px' : '320px',
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  userSelect: 'none'
                }}
              >
                {/* Ambient Gate Radial Backlight */}
                <div 
                  style={{
                    position: 'absolute',
                    top: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: isMobile ? '160px' : '200px',
                    height: isMobile ? '160px' : '200px',
                    background: 'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 75%)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />

                {/* Top Bar: Live War Room Badge */}
                <div style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', justifyContent: 'center' }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: 'rgba(255, 255, 255, 0.88)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(16, 185, 129, 0.32)',
                      padding: '3px 10px',
                      borderRadius: '999px',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.12)',
                    }}
                  >
                    <motion.span
                      animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#10B981',
                        display: 'inline-block',
                        boxShadow: '0 0 8px #10B981',
                      }}
                    />
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: '#065F46',
                        letterSpacing: '1.2px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Live War Room
                    </span>
                  </div>
                </div>

                {/* Center Architecture: The Rajasthani Palace Gate SVG */}
                <div 
                  style={{ 
                    position: 'relative', 
                    zIndex: 5, 
                    width: isMobile ? '135px' : '155px', 
                    height: isMobile ? '150px' : '172px',
                    margin: isMobile ? '4px 0 2px' : '8px 0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg
                    viewBox="0 0 160 176"
                    width="100%"
                    height="100%"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ filter: 'drop-shadow(0 4px 12px rgba(180, 83, 9, 0.15))' }}
                  >
                    <defs>
                      <linearGradient id="rpgGoldLeaf" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#B45309" />
                        <stop offset="30%" stopColor="#FBBF24" />
                        <stop offset="65%" stopColor="#FDE68A" />
                        <stop offset="100%" stopColor="#D97706" />
                      </linearGradient>

                      <linearGradient id="rpgDoorWood" x1="0" y1="0" x2="0" y2="100%">
                        <stop offset="0%" stopColor="#78350F" />
                        <stop offset="50%" stopColor="#451A03" />
                        <stop offset="100%" stopColor="#1E0B02" />
                      </linearGradient>

                      <radialGradient id="rpgPortalGlow" cx="50%" cy="65%" r="60%">
                        <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
                        <stop offset="35%" stopColor="#F59E0B" stopOpacity="0.75" />
                        <stop offset="65%" stopColor="#0284C7" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
                      </radialGradient>

                      <filter id="rpgLanternGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Outer Arch Border Trim (Dotted Filigree) */}
                    <rect
                      x="14"
                      y="16"
                      width="132"
                      height="148"
                      rx="14"
                      fill="none"
                      stroke="url(#rpgGoldLeaf)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                      opacity="0.5"
                    />

                    {/* Kalash Apex Finial */}
                    <path d="M 80 8 L 82 14 L 84 15 L 80 18 L 76 15 L 78 14 Z" fill="url(#rpgGoldLeaf)" />
                    <circle cx="80" cy="7" r="2.2" fill="#FDE047" />
                    <path d="M 74 18 C 76 16 84 16 86 18" stroke="#B45309" strokeWidth="1.5" fill="none" />

                    {/* Ornate Spandrel Filigree Flanking Apex */}
                    <path d="M 28 28 C 38 28 46 22 54 20" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
                    <path d="M 132 28 C 122 28 114 22 106 20" stroke="#D97706" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />

                    {/* Outer Multicusped Rajput Arch Moldings */}
                    <path
                      d="M 80 20 C 74 24 68 28 62 33 C 55 33 49 41 45 49 C 38 51 34 60 32 70 C 26 73 24 82 24 92 L 24 162 L 136 162 L 136 92 C 136 82 134 73 128 70 C 126 60 122 51 115 49 C 111 41 105 33 98 33 C 92 28 86 24 80 20 Z"
                      fill="none"
                      stroke="url(#rpgGoldLeaf)"
                      strokeWidth="2.2"
                    />

                    {/* Inner Portal Void (War Room Ambient Glow radiating from inside) */}
                    <path
                      d="M 80 26 C 75 30 70 34 65 38 C 58 39 53 46 50 53 C 44 55 40 63 38 72 C 33 76 31 84 31 92 L 31 162 L 129 162 L 129 92 C 129 84 127 76 122 72 C 120 63 116 55 110 53 C 107 46 102 39 95 38 C 90 34 85 30 80 26 Z"
                      fill="url(#rpgPortalGlow)"
                    />

                    {/* Inside War Room Emitted Light Fan */}
                    <path d="M 80 80 L 22 162 L 138 162 Z" fill="url(#rpgGoldLeaf)" opacity="0.16" />
                    <circle cx="80" cy="96" r="26" fill="#FEF08A" opacity="0.22" />

                    {/* Fluted Sandstone Side Columns */}
                    {/* Left Column */}
                    <rect x="18" y="84" width="10" height="78" fill="#D97706" opacity="0.2" />
                    <line x1="23" y1="84" x2="23" y2="162" stroke="#B45309" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    <path d="M 16 84 L 30 84 L 28 88 L 18 88 Z" fill="url(#rpgGoldLeaf)" />
                    <rect x="16" y="156" width="14" height="8" rx="2" fill="url(#rpgGoldLeaf)" />

                    {/* Right Column */}
                    <rect x="132" y="84" width="10" height="78" fill="#D97706" opacity="0.2" />
                    <line x1="137" y1="84" x2="137" y2="162" stroke="#B45309" strokeWidth="1" strokeDasharray="2 2" opacity="0.4" />
                    <path d="M 130 84 L 144 84 L 142 88 L 132 88 Z" fill="url(#rpgGoldLeaf)" />
                    <rect x="130" y="156" width="14" height="8" rx="2" fill="url(#rpgGoldLeaf)" />

                    {/* Rajasthani Carved Palace Doors (Parted in center revealing inner light) */}
                    {/* Left Door Leaf */}
                    <g>
                      <path
                        d="M 33 92 L 33 162 L 75 162 L 75 74 C 68 76 64 82 62 86 C 56 87 52 90 49 92 Z"
                        fill="url(#rpgDoorWood)"
                        stroke="#92400E"
                        strokeWidth="1"
                      />
                      {/* Horizontal Brass Bands (Patta) */}
                      <line x1="34" y1="104" x2="74" y2="104" stroke="url(#rpgGoldLeaf)" strokeWidth="1.8" />
                      <line x1="34" y1="124" x2="74" y2="124" stroke="url(#rpgGoldLeaf)" strokeWidth="1.8" />
                      <line x1="34" y1="144" x2="74" y2="144" stroke="url(#rpgGoldLeaf)" strokeWidth="1.8" />
                      {/* Brass Studs (Killi) */}
                      <circle cx="42" cy="104" r="1.8" fill="#FDE047" />
                      <circle cx="54" cy="104" r="1.8" fill="#FDE047" />
                      <circle cx="66" cy="104" r="1.8" fill="#FDE047" />
                      <circle cx="42" cy="124" r="1.8" fill="#FDE047" />
                      <circle cx="54" cy="124" r="1.8" fill="#FDE047" />
                      <circle cx="66" cy="124" r="1.8" fill="#FDE047" />
                      <circle cx="42" cy="144" r="1.8" fill="#FDE047" />
                      <circle cx="54" cy="144" r="1.8" fill="#FDE047" />
                      <circle cx="66" cy="144" r="1.8" fill="#FDE047" />
                      {/* Left Brass Door Pull Ring (Kadi) */}
                      <circle cx="68" cy="128" r="3.8" fill="none" stroke="#FDE047" strokeWidth="1.6" />
                      <circle cx="68" cy="124" r="1.6" fill="#B45309" />
                    </g>

                    {/* Right Door Leaf */}
                    <g>
                      <path
                        d="M 127 92 L 127 162 L 85 162 L 85 74 C 92 76 96 82 98 86 C 104 87 108 90 111 92 Z"
                        fill="url(#rpgDoorWood)"
                        stroke="#92400E"
                        strokeWidth="1"
                      />
                      {/* Horizontal Brass Bands (Patta) */}
                      <line x1="86" y1="104" x2="126" y2="104" stroke="url(#rpgGoldLeaf)" strokeWidth="1.8" />
                      <line x1="86" y1="124" x2="126" y2="124" stroke="url(#rpgGoldLeaf)" strokeWidth="1.8" />
                      <line x1="86" y1="144" x2="126" y2="144" stroke="url(#rpgGoldLeaf)" strokeWidth="1.8" />
                      {/* Brass Studs (Killi) */}
                      <circle cx="94" cy="104" r="1.8" fill="#FDE047" />
                      <circle cx="106" cy="104" r="1.8" fill="#FDE047" />
                      <circle cx="118" cy="104" r="1.8" fill="#FDE047" />
                      <circle cx="94" cy="124" r="1.8" fill="#FDE047" />
                      <circle cx="106" cy="124" r="1.8" fill="#FDE047" />
                      <circle cx="118" cy="124" r="1.8" fill="#FDE047" />
                      <circle cx="94" cy="144" r="1.8" fill="#FDE047" />
                      <circle cx="106" cy="144" r="1.8" fill="#FDE047" />
                      <circle cx="118" cy="144" r="1.8" fill="#FDE047" />
                      {/* Right Brass Door Pull Ring (Kadi) */}
                      <circle cx="92" cy="128" r="3.8" fill="none" stroke="#FDE047" strokeWidth="1.6" />
                      <circle cx="92" cy="124" r="1.6" fill="#B45309" />
                    </g>

                    {/* Radiant Portal Light Beaming through the parted doors */}
                    <rect x="76" y="72" width="8" height="90" fill="#FEF08A" opacity="0.85" />
                    <line x1="80" y1="46" x2="80" y2="162" stroke="#FFFFFF" strokeWidth="1.6" opacity="0.95" />

                    {/* Hanging Royal Palace Brass Lantern (Fanoos / Diya) */}
                    <line x1="80" y1="20" x2="80" y2="50" stroke="#B45309" strokeWidth="1.2" />
                    <g filter="url(#rpgLanternGlow)">
                      <polygon points="80,48 85,55 83,65 77,65 75,55" fill="#F59E0B" opacity="0.4" />
                    </g>
                    <polygon points="80,48 85,55 83,64 77,64 75,55" fill="#78350F" stroke="url(#rpgGoldLeaf)" strokeWidth="1.2" />
                    <circle cx="80" cy="58" r="2.8" fill="#FEF08A" />
                    <path d="M 79 64 L 80 68 L 81 64 Z" fill="url(#rpgGoldLeaf)" />

                    {/* Carved Sandstone Threshold Plinth */}
                    <rect x="22" y="162" width="116" height="7" rx="2" fill="url(#rpgGoldLeaf)" />
                    <line x1="22" y1="164" x2="138" y2="164" stroke="#78350F" strokeWidth="0.8" opacity="0.4" />
                  </svg>
                </div>

                {/* Bottom Info & Interactive Action Button Pill */}
                <div 
                  style={{ 
                    position: 'relative', 
                    zIndex: 10, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    textAlign: 'center',
                    gap: '2px',
                    width: '100%'
                  }}
                >
                  <h3
                    style={{
                      fontSize: isMobile ? '18px' : '21px',
                      fontWeight: 800,
                      color: '#1E293B',
                      margin: 0,
                      lineHeight: 1.15,
                      letterSpacing: '-0.3px',
                    }}
                  >
                    Health Canvas
                  </h3>
                  
                  <p
                    style={{
                      fontSize: '9.5px',
                      color: '#B45309',
                      margin: '0 0 6px',
                      fontWeight: 700,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Multi-Agent Hub
                  </p>

                  {/* Tactile Button Affordance */}
                  <motion.div
                    whileHover={{ scale: 1.05, boxShadow: '0 6px 18px rgba(15, 23, 42, 0.28)' }}
                    whileTap={{ scale: 0.96 }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                      color: '#F8FAFC',
                      padding: isMobile ? '5px 12px' : '6px 14px',
                      borderRadius: '999px',
                      fontSize: isMobile ? '10.5px' : '11.5px',
                      fontWeight: 700,
                      border: '1px solid rgba(245, 158, 11, 0.45)',
                      boxShadow: '0 4px 12px rgba(15, 23, 42, 0.18), inset 0 1px 1px rgba(255, 255, 255, 0.22)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Sparkles size={11} color="#FBBF24" />
                    <span>Enter Gate</span>
                    <ArrowRight size={12} color="#F59E0B" />
                  </motion.div>
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
                aria-label={`Daily Hydration - ${completedHabits['hydration'] ? 'Completed' : 'Tap to mark done'}`}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => toggleHabit('hydration', 'Morning Hydration (500ml)')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHabit('hydration', 'Morning Hydration (500ml)');
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
                  <div style={{ 
                    width: isMobile ? '38px' : '44px', 
                    height: isMobile ? '38px' : '44px', 
                    minWidth: isMobile ? '38px' : '44px', 
                    minHeight: isMobile ? '38px' : '44px', 
                    flexShrink: 0,
                    borderRadius: '50%', 
                    background: completedHabits['hydration'] 
                      ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' 
                      : 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)', 
                    boxShadow: completedHabits['hydration'] ? '0 4px 12px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.4)' : 'inset 0 1px 0 rgba(255,255,255,0.6)',
                    border: completedHabits['hydration'] ? 'none' : '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    {completedHabits['hydration'] ? (
                      <Check size={isMobile ? 18 : 20} color="#FFF" />
                    ) : (
                      <Droplets size={isMobile ? 18 : 20} color="#0EA5E9" />
                    )}
                  </div>
                  <div 
                    className="tabular-nums micro-badge"
                    style={{ 
                      background: completedHabits['hydration'] ? '#DCFCE7' : 'rgba(56, 189, 248, 0.15)', 
                      color: completedHabits['hydration'] ? '#15803D' : '#0284C7', 
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

                <div>
                  <h4 style={{ fontSize: isMobile ? '14px' : '15px', fontWeight: 700, margin: '0 0 3px', color: '#0F172A', lineHeight: 1.25, letterSpacing: '-0.3px' }}>
                    {completedHabits['hydration'] ? 'Hydrated 💧' : 'Hydrate 500ml'}
                  </h4>
                  <p style={{ fontSize: isMobile ? '11px' : '12px', color: completedHabits['hydration'] ? '#10B981' : '#64748B', margin: '0 0 6px', fontWeight: 500, lineHeight: 1.3 }}>
                    {completedHabits['hydration'] ? 'Optimal cellular hydration' : 'Tap to mark complete'}
                  </p>

                  <button
                    type="button"
                    data-compact="true"
                    onClick={(e) => toggleRationale('hydration', e)}
                    aria-label="Toggle clinical rationale for hydration"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: expandedRationale === 'hydration' ? 'rgba(14, 165, 233, 0.18)' : 'rgba(14, 165, 233, 0.08)',
                      border: '1px solid rgba(14, 165, 233, 0.25)',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: '#0284C7',
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
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        boxShadow: '0 4px 12px rgba(14, 165, 233, 0.08), inset 0 1px 0 rgba(255,255,255,0.95)'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, color: '#0284C7', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
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
                aria-label={`Daily Vitamins / Micronutrients - ${completedHabits['vitamins'] ? 'Completed' : 'Tap to mark done'}`}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                onClick={() => toggleHabit('vitamins', 'Daily Micronutrient / Rx')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHabit('vitamins', 'Daily Micronutrient / Rx');
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
                  <div style={{ 
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
                    transition: 'all 0.3s ease'
                  }}>
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
                    {completedHabits['vitamins'] ? 'Cellular micronutrients' : 'Tap to mark complete'}
                  </p>

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

        {/* Daily Clinical Protocols & Actions */}
        {dailyTasks.length > 0 && (
          <div style={{ padding: isMobile ? '0 12px 24px' : '0 24px 28px' }}>
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

