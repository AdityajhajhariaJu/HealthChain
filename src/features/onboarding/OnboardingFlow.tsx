import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Loader2 
} from 'lucide-react';

interface GoalOption {
  title: string;
  desc: string;
  icon: React.ReactNode;
  route: string;
  badge: string;
}

const GOAL_OPTIONS: GoalOption[] = [
  { 
    title: 'Chronic Management', 
    desc: 'Connect symptoms, labs & multi-specialist causal synthesis', 
    icon: <HeartPulse size={26} color="#F43F5E" />,
    route: '/app/consult',
    badge: 'Clinical Causal Engine'
  },
  { 
    title: 'Track Calories', 
    desc: 'Calibrate metabolic rate, macros & nutrition targets', 
    icon: <Flame size={26} color="#F59E0B" />,
    route: '/app/dietician',
    badge: 'Metabolic & BMR'
  },
  { 
    title: 'Mental Clarity', 
    desc: 'Optimize sleep architecture, circadian rhythm & vitality', 
    icon: <Moon size={26} color="#8B5CF6" />,
    route: '/app/today',
    badge: 'Circadian Vitality'
  }
];

const AGE_BRACKETS = [
  { label: '18–25', defaultAge: '22', hint: 'Young Adult' },
  { label: '26–35', defaultAge: '28', hint: 'Prime' },
  { label: '36–49', defaultAge: '42', hint: 'Mid-Vital' },
  { label: '50–64', defaultAge: '56', hint: 'Mature' },
  { label: '65+', defaultAge: '68', hint: 'Senior' },
];

const COMMON_CONDITIONS = [
  'Hypertension',
  'Type 2 Diabetes',
  'GERD / Acid Reflux',
  'Asthma',
  'PCOS / Hormonal',
  'Hypothyroidism',
  'High Cholesterol',
  'Migraine'
];

const COMMON_MEDICATIONS: { name: string; slot: 'morning' | 'midday' | 'evening' | 'bedtime' }[] = [
  { name: 'Metformin', slot: 'midday' },
  { name: 'Lisinopril', slot: 'morning' },
  { name: 'Atorvastatin', slot: 'bedtime' },
  { name: 'Levothyroxine', slot: 'morning' },
  { name: 'Ventolin', slot: 'morning' },
];

const COMMON_ALLERGIES: { name: string; severity: 'mild' | 'moderate' | 'severe' }[] = [
  { name: 'Penicillin', severity: 'severe' },
  { name: 'Sulfa Drugs', severity: 'severe' },
  { name: 'Aspirin', severity: 'moderate' },
  { name: 'Peanuts', severity: 'severe' },
  { name: 'Dairy / Lactose', severity: 'mild' }
];

export default function OnboardingFlow() {
  const [step, setStep] = useState<number>(0);
  const [selectedGoal, setSelectedGoal] = useState<GoalOption | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // Profile Form State initialized from existing profile if available
  const existingProfile = getProfile();
  const [name, setName] = useState<string>(existingProfile?.demographics?.name || '');
  const [age, setAge] = useState<string>(existingProfile?.demographics?.age ? String(existingProfile.demographics.age) : '28');
  const [gender, setGender] = useState<string>(existingProfile?.demographics?.gender || 'Male');
  
  // Height State
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [heightCm, setHeightCm] = useState<string>(existingProfile?.demographics?.height ? String(existingProfile.demographics.height) : '172');
  const [feetVal, setFeetVal] = useState<string>('5');
  const [inchVal, setInchVal] = useState<string>('8');

  // Weight State
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [weightKg, setWeightKg] = useState<string>(existingProfile?.demographics?.weight ? String(existingProfile.demographics.weight) : '70');
  const [weightLbs, setWeightLbs] = useState<string>('154');

  // Conditions State
  const [hasNoConditions, setHasNoConditions] = useState<boolean>(false);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  // Medications State
  const [hasNoMeds, setHasNoMeds] = useState<boolean>(false);
  const [selectedMeds, setSelectedMeds] = useState<{ name: string; slot: 'morning' | 'midday' | 'evening' | 'bedtime' }[]>([]);

  // Allergies State
  const [hasNoAllergies, setHasNoAllergies] = useState<boolean>(false);
  const [selectedAllergies, setSelectedAllergies] = useState<{ name: string; severity: 'mild' | 'moderate' | 'severe' }[]>([]);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 2) {
          triggerHapticLight();
          setStep(1);
        } else if (step === 1) {
          triggerHapticLight();
          setStep(0);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step]);

  // Height Helpers
  const updateCm = (cm: number) => {
    const clamped = Math.max(80, Math.min(240, cm));
    setHeightCm(String(clamped));
    const totalIn = clamped / 2.54;
    setFeetVal(String(Math.floor(totalIn / 12)));
    setInchVal(String(Math.round(totalIn % 12)));
  };

  // Weight Helpers
  const updateKg = (kg: number) => {
    const clamped = Math.max(30, Math.min(250, kg));
    setWeightKg(String(clamped));
    setWeightLbs(String(Math.round(clamped * 2.20462)));
  };

  // Condition toggles
  const toggleCondition = (cond: string) => {
    triggerHapticSelection();
    setHasNoConditions(false);
    setSelectedConditions(prev => 
      prev.includes(cond) ? prev.filter(c => c !== cond) : [...prev, cond]
    );
  };

  const selectNoConditions = () => {
    triggerHapticSelection();
    setHasNoConditions(true);
    setSelectedConditions([]);
  };

  // Medication toggles
  const toggleMedication = (med: { name: string; slot: 'morning' | 'midday' | 'evening' | 'bedtime' }) => {
    triggerHapticSelection();
    setHasNoMeds(false);
    setSelectedMeds(prev => 
      prev.some(m => m.name === med.name) 
        ? prev.filter(m => m.name !== med.name) 
        : [...prev, med]
    );
  };

  const selectNoMeds = () => {
    triggerHapticSelection();
    setHasNoMeds(true);
    setSelectedMeds([]);
  };

  // Allergy toggles
  const toggleAllergy = (all: { name: string; severity: 'mild' | 'moderate' | 'severe' }) => {
    triggerHapticSelection();
    setHasNoAllergies(false);
    setSelectedAllergies(prev => 
      prev.some(a => a.name === all.name) 
        ? prev.filter(a => a.name !== all.name) 
        : [...prev, all]
    );
  };

  const selectNoAllergies = () => {
    triggerHapticSelection();
    setHasNoAllergies(true);
    setSelectedAllergies([]);
  };

  // Goal Selection handler
  const handleGoalSelect = (goal: GoalOption) => {
    triggerHapticMedium();
    setSelectedGoal(goal);
    try {
      localStorage.setItem('hc_primary_focus', goal.title);
    } catch(e) {}
    setStep(2);
  };

  // Skip Escape Hatch (Zero-Trap)
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

  // Save & Launch
  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    triggerHapticMedium();
    try {
      // 1. Commit complete profile
      completeProfileOnboarding({
        demographics: {
          name: name.trim() || existingProfile?.demographics?.name || 'Patient',
          age: age ? parseInt(age, 10) : 28,
          gender: gender || 'Male',
          height: heightCm || '172',
          weight: weightKg || '70',
          bloodGroup: existingProfile?.demographics?.bloodGroup || 'Unknown',
          emergencyContact: existingProfile?.demographics?.emergencyContact || '',
        },
        conditions: hasNoConditions ? [] : selectedConditions,
        medications: hasNoMeds ? [] : selectedMeds.map(m => ({
          name: m.name,
          dosage: 'As prescribed',
          circadianSlot: m.slot,
          time: m.slot === 'morning' ? '08:00' : m.slot === 'midday' ? '13:00' : m.slot === 'evening' ? '19:00' : '22:00'
        })),
        allergies: hasNoAllergies ? [] : selectedAllergies,
        healthFocus: selectedGoal?.title || '',
      });

      // 2. Sync medications schedule if present
      if (!hasNoMeds && selectedMeds.length > 0) {
        try {
          await syncMedicationsFromProfile(selectedMeds.map(m => ({ name: m.name, timing: m.slot })));
        } catch (err) {
          console.warn('VitaminScheduleService sync deferred:', err);
        }
      }

      // 3. Complete onboarding status & award points
      localStorage.setItem('hc_onboarded', 'true');
      awardPoints(20, 'Welcome to HealthChain360! 🌟', 'welcome');
      awardPoints(50, 'Health Profile Initialized ✨', 'milestone', 'profile_onboarding_init');

      // 4. Dispatch events for instant live hydration
      window.dispatchEvent(new Event('hc_profile_updated'));
      window.dispatchEvent(new Event('hc_cases_updated'));
      window.dispatchEvent(new Event('hc_biomarkers_updated'));

      triggerHapticSuccess();
      setStep(3); // Celebration pulse
      setTimeout(() => {
        navigate(selectedGoal?.route || '/app/today', { replace: true });
      }, 1300);
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
      aria-label="Welcome Onboarding Flow"
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
        flexDirection: 'column'
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }} />

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', padding: '32px', overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(16px)' }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 'min-content', padding: '24px 0' }}
            >
              <div style={{ background: 'rgba(255,255,255,0.8)', padding: '16px', borderRadius: '50%', marginBottom: '32px', border: '1px solid rgba(15,23,42,0.1)' }}>
                <Sparkles size={36} color="#10B981" />
              </div>
              <h1 style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '-1px', textAlign: 'center', color: '#0F172A', margin: '0 0 16px 0', lineHeight: 1.15 }}>
                Let's build your<br/>health story.
              </h1>
              <p style={{ color: '#475569', fontSize: '18px', textAlign: 'center', margin: 0, fontWeight: 400, opacity: 0.9 }}>
                Clinical precision meets daily wellness.
              </p>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
                onClick={() => { triggerHapticLight(); setStep(1); }}
                style={{
                  marginTop: 'auto',
                  marginBottom: '20px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(15,23,42,0.15)',
                  padding: '16px 32px',
                  borderRadius: '99px',
                  color: '#0F172A',
                  fontSize: '17px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backdropFilter: 'blur(12px)',
                  cursor: 'pointer'
                }}
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.9)' }}
                whileTap={{ scale: 0.95 }}
              >
                Begin Journey <ChevronRight size={20} />
              </motion.button>
            </motion.div>
          )}
          
          {/* STEP 1: Goal Focus Selection */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: '540px', margin: '0 auto', width: '100%', minHeight: 'min-content' }}
            >
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: '999px', marginBottom: '12px' }}>
                  <Sparkles size={12} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    STEP 1 OF 2 • CORE FOCUS
                  </span>
                </div>
                <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 8px 0', color: '#0F172A', lineHeight: 1.2 }}>
                  What brings you to<br/><span style={{ color: '#059669' }}>HealthChain</span>?
                </h2>
                <p style={{ color: '#64748B', fontSize: '15px', margin: 0, lineHeight: 1.4 }}>
                  Select your primary focus to calibrate your personalized experience.
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
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%)',
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                      border: '1.5px solid rgba(255, 255, 255, 0.85)',
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
                      <p style={{ margin: 0, color: '#64748B', fontSize: '13px', lineHeight: 1.3 }}>{goal.desc}</p>
                    </div>
                    <ChevronRight size={20} color="#0D9488" style={{ flexShrink: 0 }} />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Goal-Adaptive Health Profile Calibration */}
          {step === 2 && selectedGoal && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              style={{ maxWidth: '640px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '32px' }}
            >
              {/* Header Navigation & Goal Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <button
                  type="button"
                  onClick={() => { triggerHapticLight(); setStep(1); }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '999px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ECFDF5', border: '1px solid #6EE7B7', padding: '4px 12px', borderRadius: '999px' }}>
                  <Sparkles size={12} color="#059669" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#047857', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    +50 PTS REWARD • HEALTH PROFILE
                  </span>
                </div>
              </div>

              {/* Dynamic Contextual Title */}
              <div style={{ textAlign: 'left', marginBottom: '4px' }}>
                <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0', letterSpacing: '-0.4px', lineHeight: 1.25 }}>
                  {selectedGoal.title === 'Track Calories'
                    ? 'Calibrate Metabolic Baseline'
                    : selectedGoal.title === 'Chronic Management'
                    ? 'Calibrate Clinical Baseline'
                    : 'Calibrate Vitality Baseline'}
                </h2>
                <p style={{ color: '#475569', fontSize: '13.5px', margin: 0, lineHeight: 1.4 }}>
                  {selectedGoal.title === 'Track Calories'
                    ? 'Add height, weight & age so Ava calculates your basal metabolic rate (BMR) & daily macro targets.'
                    : selectedGoal.title === 'Chronic Management'
                    ? 'Add age, conditions, medications & allergies so the multi-specialist engine has your clinical background.'
                    : 'Add age, medications & sleep baseline for personalized circadian routines & focus scores.'}
                </p>
              </div>

              {/* CARD 1: Demographics & Biometrics */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '20px',
                  border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} color="#0D9488" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Biometrics &amp; Demographics</h4>
                </div>

                {/* Age Brackets & Fine Tuning */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>Age Bracket</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setAge(prev => String(Math.max(18, (parseInt(prev, 10) || 28) - 1))); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F766E', minWidth: '42px', textAlign: 'center' }}>
                        {age} yrs
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setAge(prev => String(Math.min(100, (parseInt(prev, 10) || 28) + 1))); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #CBD5E1', background: '#FFFFFF', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {AGE_BRACKETS.map(b => {
                      const currentAge = parseInt(age, 10) || 28;
                      const isSelected = (b.label === '18–25' && currentAge >= 18 && currentAge <= 25) ||
                                         (b.label === '26–35' && currentAge >= 26 && currentAge <= 35) ||
                                         (b.label === '36–49' && currentAge >= 36 && currentAge <= 49) ||
                                         (b.label === '50–64' && currentAge >= 50 && currentAge <= 64) ||
                                         (b.label === '65+' && currentAge >= 65);
                      return (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => { triggerHapticSelection(); setAge(b.defaultAge); }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            border: isSelected ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                            background: isSelected ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : '#FFFFFF',
                            color: isSelected ? '#FFFFFF' : '#64748B',
                            boxShadow: isSelected ? '0 2px 8px rgba(13, 148, 136, 0.25)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Gender Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>Biological Sex</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {['Male', 'Female', 'Other'].map(g => {
                      const isSel = gender === g;
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() => { triggerHapticSelection(); setGender(g); }}
                          style={{
                            padding: '10px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSel ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                            background: isSel ? '#F0FDFA' : '#FFFFFF',
                            color: isSel ? '#0F766E' : '#64748B',
                            boxShadow: isSel ? '0 2px 8px rgba(15, 118, 110, 0.15)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Height & Weight Stepper Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  {/* Height */}
                  <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Ruler size={14} color="#0D9488" /> Height
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setHeightUnit(prev => prev === 'cm' ? 'ft' : 'cm'); }}
                        style={{ fontSize: '11px', fontWeight: 700, color: '#0F766E', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer' }}
                      >
                        {heightUnit.toUpperCase()} ⇄
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); updateCm((parseFloat(heightCm) || 170) - 1); }}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', fontWeight: 800 }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        {heightUnit === 'cm' ? `${heightCm} cm` : `${feetVal}'${inchVal}"`}
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); updateCm((parseFloat(heightCm) || 170) + 1); }}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Weight */}
                  <div style={{ background: '#FFFFFF', borderRadius: '14px', padding: '12px 14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Scale size={14} color="#0D9488" /> Weight
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); setWeightUnit(prev => prev === 'kg' ? 'lbs' : 'kg'); }}
                        style={{ fontSize: '11px', fontWeight: 700, color: '#0F766E', background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer' }}
                      >
                        {weightUnit.toUpperCase()} ⇄
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); updateKg((parseFloat(weightKg) || 70) - 1); }}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', fontWeight: 800 }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        {weightUnit === 'kg' ? `${weightKg} kg` : `${weightLbs} lbs`}
                      </span>
                      <button
                        type="button"
                        onClick={() => { triggerHapticSelection(); updateKg((parseFloat(weightKg) || 70) + 1); }}
                        style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', cursor: 'pointer', fontWeight: 800 }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 2: Diagnosed Conditions */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '20px',
                  border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} color="#0D9488" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>Known Conditions</h4>
                  </div>
                  <button
                    type="button"
                    onClick={selectNoConditions}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 8px',
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

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {COMMON_CONDITIONS.map(cond => {
                    const isSel = selectedConditions.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => toggleCondition(cond)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 12px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: isSel ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                          background: isSel ? '#F0FDFA' : '#FFFFFF',
                          color: isSel ? '#0F766E' : '#64748B',
                          boxShadow: isSel ? '0 2px 8px rgba(15, 118, 110, 0.12)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSel && <Check size={13} color="#0F766E" />}
                        {cond}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CARD 3: Medications & Allergies */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: '20px',
                  padding: isMobile ? '16px' : '20px',
                  border: '1.5px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* Medications */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Pill size={16} color="#0D9488" />
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Regular Medications</span>
                    </div>
                    <button
                      type="button"
                      onClick={selectNoMeds}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: hasNoMeds ? '1.5px solid #059669' : '1px solid #E2E8F0',
                        background: hasNoMeds ? '#ECFDF5' : '#FFFFFF',
                        color: hasNoMeds ? '#047857' : '#64748B',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ None
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {COMMON_MEDICATIONS.map(m => {
                      const isSel = selectedMeds.some(item => item.name === m.name);
                      return (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => toggleMedication(m)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSel ? '1.5px solid #0F766E' : '1px solid #E2E8F0',
                            background: isSel ? '#F0FDFA' : '#FFFFFF',
                            color: isSel ? '#0F766E' : '#64748B',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSel && <Check size={13} color="#0F766E" />}
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Allergies */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Known Allergies</span>
                    <button
                      type="button"
                      onClick={selectNoAllergies}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        border: hasNoAllergies ? '1.5px solid #059669' : '1px solid #E2E8F0',
                        background: hasNoAllergies ? '#ECFDF5' : '#FFFFFF',
                        color: hasNoAllergies ? '#047857' : '#64748B',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ None
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {COMMON_ALLERGIES.map(a => {
                      const isSel = selectedAllergies.some(item => item.name === a.name);
                      return (
                        <button
                          key={a.name}
                          type="button"
                          onClick={() => toggleAllergy(a)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border: isSel ? '1.5px solid #E11D48' : '1px solid #E2E8F0',
                            background: isSel ? '#FFF1F2' : '#FFFFFF',
                            color: isSel ? '#BE123C' : '#64748B',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isSel && <Check size={13} color="#BE123C" />}
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bottom Actions Sticky Section */}
              <div
                style={{
                  position: 'sticky',
                  bottom: 0,
                  padding: '16px 0 8px 0',
                  background: 'linear-gradient(180deg, rgba(250, 245, 240, 0) 0%, rgba(250, 245, 240, 0.95) 30%, rgba(250, 245, 240, 1) 100%)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  alignItems: 'center',
                  zIndex: 10
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
                    boxShadow: '0 10px 25px rgba(5, 150, 105, 0.35)',
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

                {/* Secondary Escape Hatch (Zero Trap Heuristic H3) */}
                <button
                  type="button"
                  onClick={handleSkip}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px'
                  }}
                >
                  Skip for now • Go straight to {selectedGoal.title} ›
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Celebration Pulse & Auto-Redirect */}
          {step === 3 && selectedGoal && (
            <motion.div
              key="step3"
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
                padding: '24px'
              }}
            >
              <motion.div
                initial={{ scale: 0.6, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 16px 36px rgba(5, 150, 105, 0.4)',
                  marginBottom: '20px'
                }}
              >
                <Sparkles size={40} color="#FFFFFF" />
              </motion.div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 14px',
                  borderRadius: '999px',
                  background: '#ECFDF5',
                  border: '1px solid #6EE7B7',
                  color: '#047857',
                  fontSize: '12px',
                  fontWeight: 800,
                  marginBottom: '12px'
                }}
              >
                +50 PTS REWARD UNLOCKED • 70 TOTAL PTS
              </div>

              <h2 style={{ fontSize: isMobile ? '28px' : '32px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-0.5px' }}>
                Health Profile Calibrated!
              </h2>
              <p style={{ color: '#475569', fontSize: '15px', margin: '0 0 24px 0', maxWidth: '360px', lineHeight: 1.4 }}>
                Personalizing your {selectedGoal.title} experience with your verified biometrics...
              </p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#0D9488', fontSize: '13.5px', fontWeight: 700, background: '#F0FDFA', padding: '8px 16px', borderRadius: '999px', border: '1px solid #99F6E4' }}>
                <Loader2 size={16} className="animate-spin" /> Launching {selectedGoal.title}...
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}