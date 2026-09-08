import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import { useNavigate } from 'react-router-dom';
import { 
  triggerHapticLight, 
  triggerHapticMedium, 
  triggerHapticSuccess, 
  triggerHapticSelection 
} from '../../services/haptics';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { getProfile, completeProfileOnboarding } from '../../services/ProfileEngine';
import { syncMedicationsFromProfile } from '../../services/VitaminScheduleService';
import { useIsMobile } from '../../hooks/useIsMobile';
import { 
  Flame, 
  Moon, 
  ChevronRight, 
  Sparkles, 
  HeartPulse, 
  ArrowLeft, 
  Check, 
  Ruler, 
  Scale, 
  Pill, 
  ShieldCheck, 
  Activity, 
  Loader2,
  Plus,
  X
} from 'lucide-react';

interface GoalOption {
  title: string;
  desc: string;
  icon: React.ReactNode;
  route: string;
  badge: string;
  dataPills: { label: string; icon: string }[];
}

type CircadianSlot = 'morning' | 'midday' | 'evening' | 'bedtime';
type AllergySeverity = 'mild' | 'moderate' | 'severe';

const GOAL_OPTIONS: GoalOption[] = [
  { 
    title: 'Chronic Management', 
    desc: 'Connect symptoms, labs & multi-specialist causal synthesis', 
    icon: <HeartPulse size={26} color="#F43F5E" />,
    route: '/app/consult',
    badge: 'Clinical Causal Engine',
    dataPills: [
      { label: 'Conditions', icon: '🩺' },
      { label: 'Chrono-Meds', icon: '💊' },
      { label: 'Allergies', icon: '💉' },
      { label: 'Biometrics', icon: '🧬' }
    ]
  },
  { 
    title: 'Track Calories', 
    desc: 'Calibrate metabolic rate, macros & nutrition targets', 
    icon: <Flame size={26} color="#F59E0B" />,
    route: '/app/dietician',
    badge: 'Metabolic & BMR',
    dataPills: [
      { label: 'Weight & Height', icon: '⚖️' },
      { label: 'Live BMR', icon: '🔥' },
      { label: 'Food Allergies', icon: '🥛' },
      { label: 'Metabolic', icon: '🩸' }
    ]
  },
  { 
    title: 'Mental Clarity', 
    desc: 'Optimize sleep architecture, circadian rhythm & vitality', 
    icon: <Moon size={26} color="#8B5CF6" />,
    route: '/app/today',
    badge: 'Circadian Vitality',
    dataPills: [
      { label: 'Circadian Timing', icon: '🌅' },
      { label: 'Sleep & Vitals', icon: '🌙' },
      { label: 'Daily Vitamins', icon: '💊' },
      { label: 'Vitality XP', icon: '💎' }
    ]
  }
];

const AGE_BRACKETS = [
  { range: '18–25', stage: 'Gen Z', defaultAge: 22, hint: 'Metabolic Velocity' },
  { range: '26–35', stage: 'Prime', defaultAge: 28, hint: 'Hormonal Peak' },
  { range: '36–49', stage: 'Mid-Life', defaultAge: 42, hint: 'Cellular Recovery' },
  { range: '50–64', stage: 'Mature', defaultAge: 56, hint: 'Vascular Focus' },
  { range: '65+', stage: 'Senior', defaultAge: 68, hint: 'Longevity Protection' },
];

const COMMON_CONDITIONS = [
  { name: 'Hypertension', category: 'Cardiovascular', icon: '🩺' },
  { name: 'Type 2 Diabetes', category: 'Metabolic', icon: '🩸' },
  { name: 'GERD / Acid Reflux', category: 'Gastrointestinal', icon: '🔥' },
  { name: 'Hypothyroidism', category: 'Endocrine', icon: '🦋' },
  { name: 'PCOS / Hormonal', category: 'Endocrine', icon: '🌸' },
  { name: 'Dysautonomia / POTS', category: 'Autonomic', icon: '🫀' },
  { name: 'High Cholesterol', category: 'Cardiovascular', icon: '🧬' },
  { name: 'Migraine / Cephalgia', category: 'Neurological', icon: '⚡' },
  { name: 'Asthma', category: 'Respiratory', icon: '🫁' },
  { name: 'Fatty Liver', category: 'Hepatic', icon: '🥩' },
  { name: 'Celiac Disease', category: 'Immune', icon: '🌾' },
  { name: 'Lower Back Strain', category: 'Kinetic', icon: '🦴' },
];

const PRESET_MEDICATIONS: { name: string; defaultSlot: CircadianSlot; hint: string }[] = [
  { name: 'Metformin', defaultSlot: 'midday', hint: 'Glucose' },
  { name: 'Lisinopril', defaultSlot: 'morning', hint: 'Blood Pressure' },
  { name: 'Atorvastatin', defaultSlot: 'bedtime', hint: 'Lipids' },
  { name: 'Levothyroxine', defaultSlot: 'morning', hint: 'Thyroid' },
  { name: 'Sertraline', defaultSlot: 'morning', hint: 'Neuro' },
  { name: 'Magnesium Glycinate', defaultSlot: 'bedtime', hint: 'Sleep & Muscle' },
  { name: 'Vitamin D3 / K2', defaultSlot: 'morning', hint: 'Immunity' },
  { name: 'Ventolin Inhaler', defaultSlot: 'morning', hint: 'Respiratory' },
];

const CIRCADIAN_SLOT_META: Record<CircadianSlot, { label: string; icon: string; color: string; bg: string }> = {
  morning: { label: 'Morning', icon: '🌅', color: '#0F766E', bg: '#CCFBF1' },
  midday: { label: 'Midday', icon: '☀️', color: '#0D9488', bg: '#ECFDF5' },
  evening: { label: 'Evening', icon: '🌇', color: '#D97706', bg: '#FEF3C7' },
  bedtime: { label: 'Bedtime', icon: '🌙', color: '#4338CA', bg: '#EEF2FF' },
};

const COMMON_ALLERGIES = [
  { name: 'Penicillin', icon: '💉', defaultSeverity: 'severe' as const },
  { name: 'Sulfa Drugs', icon: '💊', defaultSeverity: 'severe' as const },
  { name: 'Aspirin / NSAIDs', icon: '🩸', defaultSeverity: 'moderate' as const },
  { name: 'Peanuts & Tree Nuts', icon: '🥜', defaultSeverity: 'severe' as const },
  { name: 'Dairy / Lactose', icon: '🥛', defaultSeverity: 'mild' as const },
  { name: 'Gluten / Wheat', icon: '🌾', defaultSeverity: 'moderate' as const },
  { name: 'Shellfish', icon: '🦐', defaultSeverity: 'severe' as const },
  { name: 'Latex', icon: '🧤', defaultSeverity: 'moderate' as const },
];

export default function OnboardingFlow() {
  // Steps: 
  // 0: Welcome
  // 1: Goal Select
  // 2: Profile Page 1 (Biometrics & Demographics)
  // 3: Profile Page 2 (Conditions)
  // 4: Profile Page 3 (Medications & Allergies)
  // 5: Celebration & Redirect
  const [step, setStep] = useState<number>(0);
  const [selectedGoal, setSelectedGoal] = useState<GoalOption | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Form State initialized from storage
  const existingProfile = getProfile();
  const [name, setName] = useState<string>(existingProfile?.demographics?.name || '');
  const [age, setAge] = useState<number>(existingProfile?.demographics?.age ? Number(existingProfile.demographics.age) : 28);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>(
    (existingProfile?.demographics?.gender as any) || 'Male'
  );
  
  // Height State
  const [heightCm, setHeightCm] = useState<number>(
    existingProfile?.demographics?.height ? Number(existingProfile.demographics.height) : 172
  );
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');

  // Weight State
  const [weightKg, setWeightKg] = useState<number>(
    existingProfile?.demographics?.weight ? Number(existingProfile.demographics.weight) : 70
  );
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // Conditions State
  const [hasNoConditions, setHasNoConditions] = useState<boolean>(false);
  const [conditions, setConditions] = useState<string[]>(existingProfile?.conditions || []);
  const [customCondition, setCustomCondition] = useState('');

  // Medications State
  const [hasNoMeds, setHasNoMeds] = useState<boolean>(false);
  const [medications, setMedications] = useState<{ name: string; slot: CircadianSlot }[]>([]);
  const [customMed, setCustomMed] = useState('');

  // Allergies State
  const [hasNoAllergies, setHasNoAllergies] = useState<boolean>(false);
  const [allergies, setAllergies] = useState<{ name: string; severity: AllergySeverity }[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  // Live BMI & BMR
  const bmi = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return 23.6;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  }, [heightCm, weightKg]);

  const bmiCategory = useMemo(() => {
    if (bmi < 18.5) return { label: 'Lean Baseline 💧', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' };
    if (bmi < 25) return { label: 'Optimal Health Zone 🎯', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' };
    if (bmi < 30) return { label: 'Elevated Biomass ⚡', color: '#D97706', bg: '#FEF3C7', border: '#FDE68A' };
    return { label: 'High Metabolic Load 🔥', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' };
  }, [bmi]);

  const bmr = useMemo(() => {
    if (!heightCm || !weightKg || !age) return 1650;
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === 'Male' ? Math.round(base + 5) : Math.round(base - 161);
  }, [heightCm, weightKg, age, gender]);

  const idealWeightRange = useMemo(() => {
    if (!heightCm || heightCm <= 0) return '55 – 74 kg';
    const heightM = heightCm / 100;
    const minW = Math.round(18.5 * heightM * heightM);
    const maxW = Math.round(24.9 * heightM * heightM);
    return `${minW} – ${maxW} kg`;
  }, [heightCm]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step > 0) {
        triggerHapticLight();
        setStep(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  // Handlers
  const handleGoalSelect = (goal: GoalOption) => {
    triggerHapticMedium();
    setSelectedGoal(goal);
    try {
      localStorage.setItem('hc_primary_focus', goal.title);
    } catch(e) {}
    setStep(2); // Move to Profile Page 1
  };

  const handleSkip = () => {
    triggerHapticLight();
    try {
      localStorage.setItem('hc_onboarded', 'true');
      if (selectedGoal?.title) {
        localStorage.setItem('hc_primary_focus', selectedGoal.title);
      }
    } catch(e) {}
    awardPoints(20, 'Welcome to HealthChain360! 🌟', 'welcome');
    navigate(selectedGoal?.route || '/app/today', { replace: true });
  };

  const toggleCondition = (condName: string) => {
    triggerHapticSelection();
    setHasNoConditions(false);
    setConditions(prev => 
      prev.includes(condName) ? prev.filter(c => c !== condName) : [...prev, condName]
    );
  };

  const addCustomCondition = () => {
    if (!customCondition.trim()) return;
    triggerHapticLight();
    if (!conditions.includes(customCondition.trim())) {
      setConditions(prev => [...prev, customCondition.trim()]);
    }
    setCustomCondition('');
  };

  const toggleMedication = (medName: string, defaultSlot: CircadianSlot) => {
    triggerHapticSelection();
    setHasNoMeds(false);
    setMedications(prev => {
      const exists = prev.find(m => m.name === medName);
      if (exists) return prev.filter(m => m.name !== medName);
      return [...prev, { name: medName, slot: defaultSlot }];
    });
  };

  const updateMedSlot = (medName: string, slot: CircadianSlot) => {
    triggerHapticLight();
    setMedications(prev => prev.map(m => m.name === medName ? { ...m, slot } : m));
  };

  const toggleAllergy = (allName: string, defaultSeverity: AllergySeverity) => {
    triggerHapticSelection();
    setHasNoAllergies(false);
    setAllergies(prev => {
      const exists = prev.find(a => a.name === allName);
      if (exists) return prev.filter(a => a.name !== allName);
      return [...prev, { name: allName, severity: defaultSeverity }];
    });
  };

  // Final Complete & Launch
  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    triggerHapticMedium();
    try {
      completeProfileOnboarding({
        demographics: {
          name: name.trim() || existingProfile?.demographics?.name || 'Patient',
          age: age || 28,
          gender: gender || 'Male',
          height: String(heightCm),
          weight: String(weightKg),
          bloodGroup: existingProfile?.demographics?.bloodGroup || 'Unknown',
          emergencyContact: existingProfile?.demographics?.emergencyContact || '',
        },
        conditions: hasNoConditions ? [] : conditions,
        medications: hasNoMeds ? [] : medications.map(m => ({
          name: m.name,
          dosage: 'As directed',
          circadianSlot: m.slot,
          time: m.slot === 'morning' ? '08:30' : m.slot === 'midday' ? '13:00' : m.slot === 'evening' ? '18:30' : '21:30'
        })),
        allergies: hasNoAllergies ? [] : allergies,
        healthFocus: selectedGoal?.title || '',
      });

      if (!hasNoMeds && medications.length > 0) {
        try {
          await syncMedicationsFromProfile(medications.map(m => ({ name: m.name, timing: m.slot })));
        } catch (err) {
          console.warn('Medication schedule sync deferred:', err);
        }
      }

      localStorage.setItem('hc_onboarded', 'true');
      awardPoints(20, 'Welcome to HealthChain360! 🌟', 'welcome');
      awardPoints(50, 'Health Profile Initialized ✨', 'milestone', 'profile_onboarding_init');

      window.dispatchEvent(new Event('hc_profile_updated'));
      window.dispatchEvent(new Event('hc_cases_updated'));
      window.dispatchEvent(new Event('hc_biomarkers_updated'));

      triggerHapticSuccess();
      setStep(5); // Move to celebration pulse
      setTimeout(() => {
        navigate(selectedGoal?.route || '/app/today', { replace: true });
      }, 1200);
    } catch (err) {
      console.error('Failed to complete onboarding profile:', err);
      localStorage.setItem('hc_onboarded', 'true');
      navigate(selectedGoal?.route || '/app/today', { replace: true });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label="HealthChain Onboarding Experience"
      style={{ 
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        minHeight: '100dvh',
        background: 'url("/ava-floral-bg.jpg") center/cover no-repeat, #FAF5F0',
        zIndex: 9999, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.48)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)' }} />

      {/* Safe Area Container */}
      <div 
        style={{ 
          position: 'relative', 
          zIndex: 1, 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          overflowY: 'auto', 
          paddingTop: 'max(76px, calc(env(safe-area-inset-top, 0px) + 38px))',
          paddingBottom: 'max(36px, calc(env(safe-area-inset-bottom, 0px) + 24px))',
          paddingLeft: isMobile ? '16px' : '32px',
          paddingRight: isMobile ? '16px' : '32px',
        }}
      >
        <AnimatePresence mode="wait">
          
          {/* ========================================================================= */}
          {/* STEP 0: WELCOME HERO                                                      */}
          {/* ========================================================================= */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(16px)' }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 'min-content', padding: '24px 0' }}
            >
              <div style={{ background: 'rgba(255,255,255,0.85)', padding: '18px', borderRadius: '50%', marginBottom: '28px', border: '1px solid rgba(15,23,42,0.1)', boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)' }}>
                <Sparkles size={38} color="#059669" />
              </div>
              <h1 style={{ fontSize: isMobile ? '32px' : '40px', fontWeight: 800, letterSpacing: '-1px', textAlign: 'center', color: '#0F172A', margin: '0 0 14px 0', lineHeight: 1.15 }}>
                Let's build your<br/>health story.
              </h1>
              <p style={{ color: '#475569', fontSize: isMobile ? '16px' : '18px', textAlign: 'center', margin: '0 0 40px 0', fontWeight: 500, maxWidth: '380px', lineHeight: 1.4 }}>
                Clinical precision meets daily wellness. Start with a personalized baseline.
              </p>

              <motion.button
                onClick={() => { triggerHapticLight(); setStep(1); }}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                  border: 'none',
                  padding: '16px 36px',
                  borderRadius: '999px',
                  color: '#FFFFFF',
                  fontSize: '17px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 25px rgba(5, 150, 105, 0.3)',
                  cursor: 'pointer'
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Begin Journey <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: GOAL FOCUS SELECTION                                              */}
          {/* ========================================================================= */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '540px', margin: '0 auto', width: '100%', minHeight: 'min-content' }}
            >
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: '999px', marginBottom: '12px' }}>
                  <Sparkles size={12} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    STEP 1 • CORE FOCUS
                  </span>
                </div>
                <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 8px 0', color: '#0F172A', lineHeight: 1.2 }}>
                  What brings you to<br/><span style={{ color: '#059669' }}>HealthChain</span>?
                </h2>
                <p style={{ color: '#64748B', fontSize: '15px', margin: 0, lineHeight: 1.4 }}>
                  Select your primary focus to personalize your experience.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {GOAL_OPTIONS.map((goal, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 + 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleGoalSelect(goal)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.45) 100%)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
                      borderRadius: '20px',
                      padding: '18px 20px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0 }}>
                      {goal.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>{goal.title}</h3>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px', background: '#F1F5F9', color: '#475569' }}>
                          {goal.badge}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#64748B', fontSize: '13px', lineHeight: 1.35 }}>{goal.desc}</p>
                    </div>
                    <ChevronRight size={20} color="#0D9488" style={{ flexShrink: 0 }} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

                    {/* ========================================================================= */}
          {/* STEP 2: PROFILE PAGE 1 OF 3 — BIOMETRICS & METABOLIC CALIBRATION         */}
          {/* ========================================================================= */}
          {step === 2 && selectedGoal && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ maxWidth: '580px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 'min-content' }}
            >
              {/* Top Navigation & Gamified Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { triggerHapticLight(); setStep(1); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </motion.button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1.5px solid #6EE7B7', padding: '5px 12px', borderRadius: '999px', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.12)' }}>
                  <Sparkles size={13} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#047857', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    💎 +50 VITALITY PTS
                  </span>
                </div>
              </div>

              {/* Engaging 3-Step Progress Track */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(90deg, #059669, #10B981)', transition: 'all 0.3s ease' }} />
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#E2E8F0', transition: 'all 0.3s ease' }} />
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#E2E8F0', transition: 'all 0.3s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>
                  <span>Stage 1 of 3: Biometrics &amp; Metabolic 🧬</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>33% Calibrated</span>
                </div>
              </div>

              {/* Contextual Title */}
              <div>
                <h2 style={{ fontSize: isMobile ? '23px' : '27px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.4px', lineHeight: 1.25 }}>
                  {selectedGoal.title === 'Track Calories'
                    ? 'Calibrate Metabolic Baseline'
                    : selectedGoal.title === 'Chronic Management'
                    ? 'Calibrate Clinical Baseline'
                    : 'Calibrate Vitality Baseline'}
                </h2>
                <p style={{ color: '#475569', fontSize: '13px', margin: 0, lineHeight: 1.35 }}>
                  {selectedGoal.title === 'Track Calories'
                    ? 'Add height, weight & age so Ava calibrates your personalized BMR & macro targets.'
                    : 'Provide your biometrics so our clinical intelligence calibrates against optimal physiological ranges.'}
                </p>
              </div>

              {/* Biometrics Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '22px',
                  border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Age Brackets & Fine Tuning */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>🎂</span> Age Bracket &amp; Exact Age
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#F8FAFC', padding: '3px 6px', borderRadius: '999px', border: '1px solid #E2E8F0' }}>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setAge(prev => Math.max(18, prev - 1)); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 900, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}
                      >
                        −
                      </button>
                      <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#0F766E', minWidth: '44px', textAlign: 'center' }}>
                        {age} yrs
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setAge(prev => Math.min(100, prev + 1)); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 900, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F172A' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* 5-Column Responsive Age Bracket Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {AGE_BRACKETS.map(b => {
                      const isSelected = (b.range === '18–25' && age >= 18 && age <= 25) ||
                                         (b.range === '26–35' && age >= 26 && age <= 35) ||
                                         (b.range === '36–49' && age >= 36 && age <= 49) ||
                                         (b.range === '50–64' && age >= 50 && age <= 64) ||
                                         (b.range === '65+' && age >= 65);
                      return (
                        <motion.button
                          key={b.range}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => { triggerHapticSelection(); setAge(b.defaultAge); }}
                          style={{
                            padding: '8px 2px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            border: isSelected ? '1.5px solid #059669' : '1px solid #CBD5E1',
                            background: isSelected ? 'linear-gradient(135deg, #059669 0%, #0D9488 100%)' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#334155',
                            boxShadow: isSelected ? '0 4px 14px rgba(5, 150, 105, 0.28)' : '0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 800, lineHeight: 1.1 }}>{b.range}</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 700, opacity: isSelected ? 0.95 : 0.65, letterSpacing: '0.2px' }}>{b.stage}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Biological Sex */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                    <span>🧬</span> Biological Sex
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {[
                      { label: 'Male', emoji: '👨' },
                      { label: 'Female', emoji: '👩' },
                      { label: 'Other', emoji: '✨' }
                    ].map(g => {
                      const isSel = gender === g.label;
                      return (
                        <motion.button
                          key={g.label}
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { triggerHapticSelection(); setGender(g.label as any); }}
                          style={{
                            padding: '10px 8px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            border: isSel ? '2px solid #059669' : '1px solid #CBD5E1',
                            background: isSel ? 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)' : '#FFFFFF',
                            color: isSel ? '#065F46' : '#475569',
                            boxShadow: isSel ? '0 4px 12px rgba(5, 150, 105, 0.15)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <span style={{ fontSize: '15px' }}>{g.emoji}</span>
                          <span>{g.label}</span>
                          {isSel && <Check size={14} color="#059669" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Height & Weight Stepper Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '10px' }}>
                  {/* Height */}
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '12px 14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Ruler size={14} color="#0D9488" /> Height
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setHeightUnit(prev => prev === 'cm' ? 'ft' : 'cm'); }}
                        style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}
                      >
                        {heightUnit.toUpperCase()} ⇄
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setHeightCm(prev => Math.max(100, prev - 1)); }}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', fontWeight: 900, fontSize: '18px', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        −
                      </button>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                          {heightUnit === 'cm' ? `${heightCm}` : `${Math.floor((heightCm / 2.54) / 12)}'${Math.round((heightCm / 2.54) % 12)}"`}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginLeft: '3px' }}>
                          {heightUnit === 'cm' ? 'cm' : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setHeightCm(prev => Math.min(230, prev + 1)); }}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', fontWeight: 900, fontSize: '18px', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Weight */}
                  <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '12px 14px', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <Scale size={14} color="#0D9488" /> Weight
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setWeightUnit(prev => prev === 'kg' ? 'lbs' : 'kg'); }}
                        style={{ fontSize: '11px', fontWeight: 800, color: '#0F766E', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}
                      >
                        {weightUnit.toUpperCase()} ⇄
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setWeightKg(prev => Math.max(30, prev - 1)); }}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', fontWeight: 900, fontSize: '18px', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        −
                      </button>
                      <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.5px' }}>
                          {weightUnit === 'kg' ? `${weightKg}` : `${Math.round(weightKg * 2.20462)}`}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', marginLeft: '3px' }}>
                          {weightUnit === 'kg' ? 'kg' : 'lbs'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setWeightKg(prev => Math.min(220, prev + 1)); }}
                        style={{ width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', fontWeight: 900, fontSize: '18px', color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Metabolic Equilibrium Spectrum Gauge */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
                    borderRadius: 18,
                    padding: '14px 16px',
                    border: '1.5px solid #99F6E4',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.08)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: '10.5px', fontWeight: 900, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Activity size={12} /> METABOLIC EQUILIBRIUM
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F172A', marginTop: 2, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>BMI: {bmi}</span>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 800, 
                          padding: '2px 8px', 
                          borderRadius: '999px', 
                          background: bmiCategory.bg, 
                          color: bmiCategory.color,
                          border: `1px solid ${bmiCategory.border}`
                        }}>
                          {bmiCategory.label}
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', background: 'rgba(255, 255, 255, 0.85)', padding: '5px 10px', borderRadius: '10px', border: '1px solid #99F6E4' }}>
                      <div style={{ fontSize: '10px', color: '#047857', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}>
                        <Flame size={12} color="#EA580C" /> BMR
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 900, color: '#0F766E' }}>{bmr} <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748B' }}>kcal</span></div>
                    </div>
                  </div>

                  {/* Spectrum Track */}
                  <div style={{ width: '100%', height: '8px', background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 35%, #F59E0B 70%, #EF4444 100%)', borderRadius: 999, position: 'relative', marginTop: 8, marginBottom: 8 }}>
                    <motion.div
                      layout
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        left: `${Math.min(96, Math.max(4, ((bmi - 15) / 25) * 100))}%`,
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#FFFFFF',
                        border: '3px solid #0F766E',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                        transform: 'translateX(-50%)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#047857', fontWeight: 700 }}>
                    <span>WHO Optimal: <strong>{idealWeightRange}</strong></span>
                    <span style={{ fontStyle: 'italic', opacity: 0.85 }}>✨ Real-Time Calibration</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Natural Flow (Zero Overlap / Zero Cutout) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                  marginTop: '14px',
                  paddingBottom: 'max(36px, calc(env(safe-area-inset-bottom, 0px) + 20px))'
                }}
              >
                <motion.button
                  type="button"
                  onClick={() => { triggerHapticMedium(); setStep(3); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Continue to Conditions <ChevronRight size={18} />
                </motion.button>

                <button
                  type="button"
                  onClick={handleSkip}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 10px',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px'
                  }}
                >
                  Skip for now • Go straight to {selectedGoal.title} ›
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: PROFILE PAGE 2 OF 3 — CHRONIC HEALTH & MEDICAL CONDITIONS         */}
          {/* ========================================================================= */}
          {step === 3 && selectedGoal && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ maxWidth: '620px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 'min-content' }}
            >
              {/* Top Navigation & Gamified Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { triggerHapticLight(); setStep(2); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </motion.button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1.5px solid #6EE7B7', padding: '5px 12px', borderRadius: '999px', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.12)' }}>
                  <Sparkles size={13} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#047857', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    💎 +50 VITALITY PTS
                  </span>
                </div>
              </div>

              {/* Engaging 3-Step Progress Track */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(90deg, #059669, #10B981)' }} />
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(90deg, #059669, #10B981)' }} />
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: '#E2E8F0' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>
                  <span>Stage 2 of 3: Clinical Conditions 🩺 ({conditions.length} Active)</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>66% Calibrated</span>
                </div>
              </div>

              {/* Headline */}
              <div>
                <h2 style={{ fontSize: isMobile ? '23px' : '27px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.4px', lineHeight: 1.25 }}>
                  Diagnosed or Suspected Conditions
                </h2>
                <p style={{ color: '#475569', fontSize: '13px', margin: 0, lineHeight: 1.35 }}>
                  Select any diagnosed or recurring conditions. Tap to toggle or choose "None / Healthy Baseline".
                </p>
              </div>

              {/* Conditions Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '22px',
                  border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* None Shortcut */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="#0D9488" /> Clinical History
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setHasNoConditions(true);
                      setConditions([]);
                    }}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: hasNoConditions ? '1.5px solid #059669' : '1px solid #E2E8F0',
                      background: hasNoConditions ? '#ECFDF5' : '#FFFFFF',
                      color: hasNoConditions ? '#047857' : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ None / Healthy Baseline
                  </button>
                </div>

                {/* Emoji Pills Grid */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COMMON_CONDITIONS.map((c) => {
                    const isSelected = conditions.includes(c.name);
                    return (
                      <motion.button
                        key={c.name}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleCondition(c.name)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '999px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: isSelected ? '#CCFBF1' : '#FFFFFF',
                          color: isSelected ? '#0F766E' : '#334155',
                          boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.18)' : '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '15px' }}>{c.icon}</span>
                        <span>{c.name}</span>
                        <span style={{ fontSize: '10px', opacity: 0.6, fontWeight: 600 }}>({c.category})</span>
                        {isSelected && <Check size={13} color="#0F766E" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom Condition Adder */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    placeholder="Add custom condition (e.g. Hashimoto's, Histamine)..."
                    value={customCondition}
                    onChange={(e) => setCustomCondition(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCondition(); } }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomCondition}
                    style={{
                      padding: '0 14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#0F766E',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>

              {/* Action Buttons in Natural Flow (Zero Overlap / Zero Cutout) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                  marginTop: '14px',
                  paddingBottom: 'max(36px, calc(env(safe-area-inset-bottom, 0px) + 20px))'
                }}
              >
                <motion.button
                  type="button"
                  onClick={() => { triggerHapticMedium(); setStep(4); }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Continue to Medications &amp; Allergies <ChevronRight size={18} />
                </motion.button>

                <button
                  type="button"
                  onClick={handleSkip}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 10px',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px'
                  }}
                >
                  Skip for now • Go straight to {selectedGoal.title} ›
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: PROFILE PAGE 3 OF 3 — MEDICATIONS & ALLERGIES                     */}
          {/* ========================================================================= */}
          {step === 4 && selectedGoal && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 25 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -25 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              style={{ maxWidth: '620px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 'min-content' }}
            >
              {/* Top Navigation & Gamified Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { triggerHapticLight(); setStep(3); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </motion.button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)', border: '1.5px solid #6EE7B7', padding: '5px 12px', borderRadius: '999px', boxShadow: '0 2px 8px rgba(5, 150, 105, 0.12)' }}>
                  <Sparkles size={13} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#047857', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                    💎 +50 VITALITY PTS
                  </span>
                </div>
              </div>

              {/* Engaging 3-Step Progress Track */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '4px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(90deg, #059669, #10B981)' }} />
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(90deg, #059669, #10B981)' }} />
                  <div style={{ flex: 1, height: '6px', borderRadius: '999px', background: 'linear-gradient(90deg, #059669, #10B981)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>
                  <span>Stage 3 of 3: Chrono-Meds &amp; Allergies 💊</span>
                  <span style={{ color: '#059669', fontWeight: 800 }}>Final Step!</span>
                </div>
              </div>

              {/* Headline */}
              <div>
                <h2 style={{ fontSize: isMobile ? '23px' : '27px', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0', letterSpacing: '-0.4px', lineHeight: 1.25 }}>
                  Chrono-Medications &amp; Allergies
                </h2>
                <p style={{ color: '#475569', fontSize: '13px', margin: 0, lineHeight: 1.35 }}>
                  Ensure clinical safety by syncing your daily medication timing and substance sensitivities.
                </p>
              </div>

              {/* Medications Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '20px',
                  border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Pill size={16} color="#0D9488" /> Regular Medications &amp; Supplements
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setHasNoMeds(true);
                      setMedications([]);
                    }}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: hasNoMeds ? '1.5px solid #059669' : '1px solid #E2E8F0',
                      background: hasNoMeds ? '#ECFDF5' : '#FFFFFF',
                      color: hasNoMeds ? '#047857' : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ None / No Prescriptions
                  </button>
                </div>

                {/* Preset Meds */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PRESET_MEDICATIONS.map((m) => {
                    const isSelected = medications.some((item) => item.name === m.name);
                    return (
                      <motion.button
                        key={m.name}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleMedication(m.name, m.defaultSlot)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 13px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                          background: isSelected ? '#CCFBF1' : '#FFFFFF',
                          color: isSelected ? '#0F766E' : '#334155',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Pill size={13} color={isSelected ? '#0D9488' : '#64748B'} />
                        <span>{m.name}</span>
                        {isSelected && <Check size={13} color="#0D9488" />}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Custom Medication Adder */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Add medication (e.g. Omega 3, CoQ10)..."
                    value={customMed}
                    onChange={(e) => setCustomMed(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customMed.trim()) {
                          toggleMedication(customMed.trim(), 'morning');
                          setCustomMed('');
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customMed.trim()) {
                        toggleMedication(customMed.trim(), 'morning');
                        setCustomMed('');
                      }
                    }}
                    style={{
                      padding: '0 14px',
                      borderRadius: '12px',
                      border: 'none',
                      background: '#0F766E',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                {/* Selected Medications Circadian Timing Slots */}
                {medications.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #E2E8F0', paddingTop: '12px' }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0F766E', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Circadian Intake Schedules
                    </span>
                    {medications.map((m) => (
                      <div
                        key={m.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#F8FAFC',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0'
                        }}
                      >
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0F172A' }}>{m.name}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {(['morning', 'midday', 'evening', 'bedtime'] as CircadianSlot[]).map((slot) => {
                            const isSlot = m.slot === slot;
                            const slotColor = slot === 'morning' ? '#F59E0B' : slot === 'midday' ? '#F97316' : slot === 'evening' ? '#8B5CF6' : '#6366F1';
                            const slotEmoji = slot === 'morning' ? '🌅' : slot === 'midday' ? '☀️' : slot === 'evening' ? '🌇' : '🌙';
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => updateMedSlot(m.name, slot)}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  border: isSlot ? `1.5px solid ${slotColor}` : '1px solid #E2E8F0',
                                  background: isSlot ? '#FFFFFF' : '#F1F5F9',
                                  color: isSlot ? slotColor : '#64748B',
                                  boxShadow: isSlot ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                {slotEmoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Allergies Card */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '20px',
                  border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldCheck size={16} color="#E11D48" /> Known Substance &amp; Drug Allergies
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticSelection();
                      setHasNoAllergies(true);
                      setAllergies([]);
                    }}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      border: hasNoAllergies ? '1.5px solid #059669' : '1px solid #E2E8F0',
                      background: hasNoAllergies ? '#ECFDF5' : '#FFFFFF',
                      color: hasNoAllergies ? '#047857' : '#64748B',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ No Known Allergies
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COMMON_ALLERGIES.map((a) => {
                    const isSelected = allergies.some((item) => item.name === a.name);
                    return (
                      <motion.button
                        key={a.name}
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleAllergy(a.name, a.defaultSeverity)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 13px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSelected ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                          background: isSelected ? '#FFF1F2' : '#FFFFFF',
                          color: isSelected ? '#BE123C' : '#334155',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span>{a.icon}</span>
                        <span>{a.name}</span>
                        <span style={{ fontSize: '10px', opacity: 0.65 }}>({a.defaultSeverity})</span>
                        {isSelected && <Check size={13} color="#BE123C" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons in Natural Flow (Zero Overlap / Zero Cutout) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  alignItems: 'center',
                  marginTop: '14px',
                  paddingBottom: 'max(36px, calc(env(safe-area-inset-bottom, 0px) + 20px))'
                }}
              >
                <motion.button
                  type="button"
                  onClick={handleSaveAndContinue}
                  disabled={isSaving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    borderRadius: '16px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                    color: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 8px 24px rgba(5, 150, 105, 0.35)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Saving Profile...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} /> Save &amp; Launch {selectedGoal.title} (+50 PTS) <ChevronRight size={18} />
                    </>
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={handleSkip}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 10px',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px'
                  }}
                >
                  Skip for now • Go straight to {selectedGoal.title} ›
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: CELEBRATION PULSE & AUTO-REDIRECT                                 */}
          {/* ========================================================================= */}
          {step === 5 && selectedGoal && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                padding: '24px',
                position: 'relative'
              }}
            >
              <Confetti
                width={typeof window !== 'undefined' ? window.innerWidth : 400}
                height={typeof window !== 'undefined' ? window.innerHeight : 800}
                recycle={false}
                numberOfPieces={300}
                colors={['#10B981', '#059669', '#34D399', '#3B82F6', '#F59E0B', '#8B5CF6']}
              />

              <motion.div
                initial={{ scale: 0.6, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  width: '88px',
                  height: '88px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 16px 40px rgba(5, 150, 105, 0.45)',
                  marginBottom: '20px'
                }}
              >
                <Sparkles size={44} color="#FFFFFF" />
              </motion.div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 16px',
                  borderRadius: '999px',
                  background: '#ECFDF5',
                  border: '1.5px solid #6EE7B7',
                  color: '#047857',
                  fontSize: '12.5px',
                  fontWeight: 900,
                  marginBottom: '14px',
                  boxShadow: '0 2px 10px rgba(5, 150, 105, 0.15)'
                }}
              >
                💎 +50 VITALITY PTS REWARD UNLOCKED • 70 TOTAL PTS
              </div>

              <h2 style={{ fontSize: isMobile ? '28px' : '34px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                Health Profile Calibrated! 🌟
              </h2>
              <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 24px 0', maxWidth: '360px', lineHeight: 1.4 }}>
                Personalizing your {selectedGoal.title} experience with your verified clinical baseline...
              </p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0D9488', fontSize: '14px', fontWeight: 800, background: '#F0FDFA', padding: '10px 20px', borderRadius: '999px', border: '1.5px solid #99F6E4', boxShadow: '0 2px 8px rgba(13, 148, 136, 0.1)' }}>
                <Loader2 size={18} className="animate-spin" /> Launching {selectedGoal.title}...
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
