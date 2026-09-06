import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  HeartPulse,
  ShieldCheck,
  Sparkles,
  User,
  Plus,
  X,
  AlertCircle,
  Pill,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Clock,
  Dna,
  Scale,
  Ruler
} from 'lucide-react';
import { completeProfileOnboarding, getProfileKey } from '../../services/ProfileEngine';
import { useIsMobile } from '../../hooks/useIsMobile';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { getItemSync, setItemSync } from '../../services/storage';
import { triggerHapticLight, triggerHapticMedium, triggerHapticSuccess } from '../../services/haptics';
import { syncMedicationsFromProfile } from '../../services/VitaminScheduleService';

type CircadianSlot = 'morning' | 'midday' | 'evening' | 'bedtime';
type AllergySeverity = 'mild' | 'moderate' | 'severe';

const AGE_BRACKETS = [
  { label: '18–25 Gen Z', min: 18, max: 25, defaultAge: 22, hint: 'Metabolic Velocity' },
  { label: '26–35 Prime', min: 26, max: 35, defaultAge: 30, hint: 'Hormonal Baseline' },
  { label: '36–49 Mid-Vital', min: 36, max: 49, defaultAge: 42, hint: 'Cellular Recovery' },
  { label: '50–64 Mature', min: 50, max: 64, defaultAge: 56, hint: 'Vascular & Joint Focus' },
  { label: '65+ Senior', min: 65, max: 100, defaultAge: 70, hint: 'Longevity Protection' },
];

const COMMON_CONDITIONS = [
  { name: 'Hypertension', category: 'Cardiovascular', icon: '🩺' },
  { name: 'Type 2 Diabetes', category: 'Metabolic', icon: '🩸' },
  { name: 'Asthma', category: 'Respiratory', icon: '🫁' },
  { name: 'Migraine / Cephalgia', category: 'Neurological', icon: '⚡' },
  { name: 'Lower Back & Sacral Strain', category: 'Kinetic', icon: '🦴' },
  { name: 'GERD / Reflux', category: 'Gastrointestinal', icon: '🔥' },
  { name: 'Hypothyroidism', category: 'Endocrine', icon: '🦋' },
  { name: 'PCOS / Hormonal', category: 'Endocrine', icon: '🌸' },
  { name: 'Dysautonomia / POTS', category: 'Autonomic', icon: '🫀' },
  { name: 'High Cholesterol', category: 'Cardiovascular', icon: '🧬' },
  { name: 'Fatty Liver', category: 'Hepatic', icon: '🥩' },
  { name: 'Celiac Disease', category: 'Immune', icon: '🌾' },
];

const PRESET_MEDICATIONS: { name: string; defaultSlot: CircadianSlot }[] = [
  { name: 'Metformin', defaultSlot: 'midday' },
  { name: 'Lisinopril', defaultSlot: 'morning' },
  { name: 'Atorvastatin', defaultSlot: 'bedtime' },
  { name: 'Levothyroxine', defaultSlot: 'morning' },
  { name: 'Sertraline', defaultSlot: 'morning' },
  { name: 'Magnesium Glycinate', defaultSlot: 'bedtime' },
  { name: 'Vitamin D3 / K2', defaultSlot: 'morning' },
  { name: 'Omega-3 EPA/DHA', defaultSlot: 'midday' },
];

const COMMON_ALLERGIES: { name: string; defaultSeverity: AllergySeverity }[] = [
  { name: 'Penicillin', defaultSeverity: 'severe' },
  { name: 'Sulfa Drugs', defaultSeverity: 'severe' },
  { name: 'Aspirin / NSAIDs', defaultSeverity: 'moderate' },
  { name: 'Peanuts & Tree Nuts', defaultSeverity: 'severe' },
  { name: 'Latex', defaultSeverity: 'moderate' },
  { name: 'Shellfish', defaultSeverity: 'severe' },
  { name: 'Dairy / Lactose', defaultSeverity: 'mild' },
  { name: 'Gluten / Wheat', defaultSeverity: 'moderate' },
];

const FAMILY_CONDITIONS = [
  'Heart Disease',
  'Type 2 Diabetes',
  'Hypertension',
  'Autoimmune Disease',
  'Thyroid Disorders',
  'Colorectal Issues',
  'Early Stroke',
  'Osteoporosis',
];

const HEALTH_FOCUS_OPTIONS = [
  { id: 'root_cause', title: 'Uncover Root Causes', desc: 'Connect multi-system kinetic, vascular & dietary triggers', icon: '🔍' },
  { id: 'metabolic', title: 'Metabolic Balance & Energy', desc: 'Optimize glucose, postprandial fatigue & daily vitality', icon: '⚡' },
  { id: 'kinetic', title: 'Postural & Kinetic Relief', desc: 'Craniosacral dural spine alignment and tension headaches', icon: '🦴' },
  { id: 'gut_brain', title: 'Gut-Brain Equilibrium', desc: 'Food sensitivities, DAO histamines & microbiome health', icon: '🌱' },
  { id: 'pharmacy', title: 'Medication Safety & Chrono', desc: 'Guard against contraindications and circadian clashes', icon: '💊' },
];

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const CIRCADIAN_SLOT_META: Record<CircadianSlot, { label: string; icon: string; time: string; color: string; bg: string }> = {
  morning: { label: 'Morning', icon: '🌅', time: '08:30', color: '#0F766E', bg: '#CCFBF1' },
  midday: { label: 'Midday', icon: '☀️', time: '13:00', color: '#0D9488', bg: '#ECFDF5' },
  evening: { label: 'Evening', icon: '🌇', time: '18:30', color: '#D97706', bg: '#FEF3C7' },
  bedtime: { label: 'Bedtime', icon: '🌙', time: '21:30', color: '#4338CA', bg: '#EEF2FF' },
};

export default function ProfileOnboarding({ onComplete }: { onComplete?: () => void }) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const account = useMemo(() => {
    try {
      return JSON.parse(getItemSync('hc_account') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [step, setStep] = useState(0);

  // Step 0: Demographics & Biometrics
  const [name, setName] = useState(account.name || '');
  const [age, setAge] = useState<number>(28);
  const [gender, setGender] = useState<'Female' | 'Male' | 'Non-binary' | 'Other'>('Female');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitMode, setUnitMode] = useState<'metric' | 'imperial'>('metric');
  const [heightCm, setHeightCm] = useState<number>(172);
  const [weightKg, setWeightKg] = useState<number>(68);
  const [emergencyContact, setEmergencyContact] = useState('');

  // Step 1: Medical Snapshot
  const [conditions, setConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState('');
  const [medications, setMedications] = useState<{ name: string; slot: CircadianSlot }[]>([]);
  const [customMed, setCustomMed] = useState('');
  const [allergies, setAllergies] = useState<{ name: string; severity: AllergySeverity }[]>([]);
  const [customAllergy, setCustomAllergy] = useState('');
  const [nkda, setNkda] = useState(false);
  const [familyHistory, setFamilyHistory] = useState<string[]>([]);
  const [customFamily, setCustomFamily] = useState('');

  // Step 2: Health Focus
  const [healthFocus, setHealthFocus] = useState('Uncover Root Causes');

  // Live BMI & BMR calculations
  const bmi = useMemo(() => {
    if (!heightCm || !weightKg || heightCm <= 0) return 0;
    const heightM = heightCm / 100;
    return parseFloat((weightKg / (heightM * heightM)).toFixed(1));
  }, [heightCm, weightKg]);

  const bmiCategory = useMemo(() => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6', bg: '#EFF6FF' };
    if (bmi < 25) return { label: 'Optimal Equilibrium', color: '#059669', bg: '#ECFDF5' };
    if (bmi < 30) return { label: 'Elevated Biomass', color: '#D97706', bg: '#FEF3C7' };
    return { label: 'High Metabolic Load', color: '#DC2626', bg: '#FEF2F2' };
  }, [bmi]);

  const bmr = useMemo(() => {
    if (!heightCm || !weightKg || !age) return 0;
    // Mifflin-St Jeor equation
    let base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return gender === 'Male' ? Math.round(base + 5) : Math.round(base - 161);
  }, [heightCm, weightKg, age, gender]);

  const idealWeightRange = useMemo(() => {
    if (!heightCm || heightCm <= 0) return '55 - 72 kg';
    const heightM = heightCm / 100;
    const minW = Math.round(18.5 * heightM * heightM);
    const maxW = Math.round(24.9 * heightM * heightM);
    return `${minW} – ${maxW} kg`;
  }, [heightCm]);

  const canContinue = step === 0 ? Boolean(name.trim() && age > 0) : true;

  const toggleCondition = (cond: string) => {
    triggerHapticLight();
    setConditions((prev) => (prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]));
  };

  const addCustomCondition = () => {
    if (!customCondition.trim()) return;
    triggerHapticLight();
    if (!conditions.includes(customCondition.trim())) {
      setConditions((prev) => [...prev, customCondition.trim()]);
    }
    setCustomCondition('');
  };

  const toggleMedication = (medName: string, defaultSlot: CircadianSlot) => {
    triggerHapticLight();
    setMedications((prev) => {
      const exists = prev.find((m) => m.name === medName);
      if (exists) return prev.filter((m) => m.name !== medName);
      return [...prev, { name: medName, slot: defaultSlot }];
    });
  };

  const updateMedSlot = (medName: string, slot: CircadianSlot) => {
    triggerHapticLight();
    setMedications((prev) => prev.map((m) => (m.name === medName ? { ...m, slot } : m)));
  };

  const addCustomMed = () => {
    if (!customMed.trim()) return;
    triggerHapticLight();
    if (!medications.find((m) => m.name.toLowerCase() === customMed.trim().toLowerCase())) {
      setMedications((prev) => [...prev, { name: customMed.trim(), slot: 'morning' }]);
    }
    setCustomMed('');
  };

  const toggleAllergy = (allergyName: string, defaultSeverity: AllergySeverity) => {
    triggerHapticLight();
    setNkda(false);
    setAllergies((prev) => {
      const exists = prev.find((a) => a.name === allergyName);
      if (exists) return prev.filter((a) => a.name !== allergyName);
      return [...prev, { name: allergyName, severity: defaultSeverity }];
    });
  };

  const updateAllergySeverity = (allergyName: string, severity: AllergySeverity) => {
    triggerHapticLight();
    setAllergies((prev) => prev.map((a) => (a.name === allergyName ? { ...a, severity } : a)));
  };

  const addCustomAllergy = () => {
    if (!customAllergy.trim()) return;
    triggerHapticLight();
    setNkda(false);
    if (!allergies.find((a) => a.name.toLowerCase() === customAllergy.trim().toLowerCase())) {
      setAllergies((prev) => [...prev, { name: customAllergy.trim(), severity: 'moderate' }]);
    }
    setCustomAllergy('');
  };

  const toggleFamily = (item: string) => {
    triggerHapticLight();
    setFamilyHistory((prev) => (prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item]));
  };

  const addCustomFamily = () => {
    if (!customFamily.trim()) return;
    triggerHapticLight();
    if (!familyHistory.includes(customFamily.trim())) {
      setFamilyHistory((prev) => [...prev, customFamily.trim()]);
    }
    setCustomFamily('');
  };

  const finish = async () => {
    triggerHapticSuccess();
    setItemSync('hc_onboarded', 'true');

    const formattedMeds = medications.map((m) => {
      const slotMeta = CIRCADIAN_SLOT_META[m.slot];
      return `${m.name} (${slotMeta.label} ${slotMeta.time})`;
    });

    const formattedAllergies = nkda
      ? ['No Known Drug Allergies (NKDA)']
      : allergies.map((a) => `${a.name} [${a.severity.toUpperCase()}]`);

    completeProfileOnboarding({
      demographics: {
        name: name.trim(),
        age: String(age),
        gender,
        bloodGroup,
        height: `${heightCm} cm`,
        weight: `${weightKg} kg`,
      },
      allergies: formattedAllergies,
      conditions,
      medications: formattedMeds,
      familyHistory,
      healthFocus,
    });

    try {
      await syncMedicationsFromProfile(medications.map((m) => ({ name: m.name, timing: m.slot })));
    } catch (e) {
      console.warn('Medication circadian schedule sync bypassed:', e);
    }

    awardPoints(50, 'Medical Profile Initialized ✨', 'milestone', 'profile_onboarding_init');
    if (onComplete) onComplete();
    else navigate('/app/today', { replace: true });
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(circle at top right, #CCFBF1 0%, #F8FAFC 45%, #F0FDFA 100%)',
        padding: isMobile ? '20px 14px 40px' : '36px 20px 60px',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Brand Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#0F172A', fontWeight: 850, fontSize: '17px' }}>
            <img
              src="/logo.png"
              alt="HealthChain360.ai"
              style={{ width: '28px', height: '28px', borderRadius: '7px', objectFit: 'contain' }}
              onError={(e) => {
                e.currentTarget.src = '/logo.jpg';
              }}
            />
            <span>HealthChain360<span style={{ color: '#0D9488' }}>.ai</span></span>
          </div>

          <div
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              color: '#047857',
              fontSize: 12,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <Sparkles size={13} />
            <span>Whole-Body Diagnostic Profile</span>
          </div>
        </div>

        <main
          style={{
            background: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid rgba(204, 251, 241, 0.6)',
            borderRadius: 28,
            boxShadow: '0 20px 60px rgba(15, 118, 110, 0.08)',
            overflow: 'hidden',
          }}
        >
          {/* Step Progress Indicators */}
          <div
            style={{
              padding: isMobile ? '20px 18px 0' : '26px 36px 0',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}
          >
            {[
              { label: 'Biometrics & BMI', icon: Activity },
              { label: 'Multi-System Clues', icon: ClipboardList },
              { label: 'Health Focus', icon: ShieldCheck },
            ].map((s, index) => {
              const Icon = s.icon;
              const isActive = index === step;
              const isPast = index < step;
              return (
                <div
                  key={s.label}
                  onClick={() => {
                    if (isPast) {
                      triggerHapticLight();
                      setStep(index);
                    }
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 14,
                    background: isActive
                      ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                      : isPast
                      ? '#ECFDF5'
                      : '#F8FAFC',
                    color: isActive ? '#FFFFFF' : isPast ? '#047857' : '#94A3B8',
                    border: isActive
                      ? '1.5px solid #0F766E'
                      : isPast
                      ? '1px solid #A7F3D0'
                      : '1px solid #E2E8F0',
                    fontSize: 12,
                    fontWeight: 800,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    cursor: isPast ? 'pointer' : 'default',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {isPast ? <Check size={14} /> : <Icon size={14} />}
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <section style={{ padding: isMobile ? '20px 18px 30px' : '28px 36px 36px' }}>
            <AnimatePresence mode="wait">
              {/* STEP 0: BIOMETRICS & LIVE METABOLIC SPECTRUM GAUGE */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}
                >
                  {/* Name Input */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      aria-label="Your full name"
                      style={inputStyle}
                    />
                  </div>

                  {/* Age: Bracket Pills + Micro-Stepper */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Age *</label>
                      <span style={{ fontSize: 12, color: '#0D9488', fontWeight: 700 }}>
                        {AGE_BRACKETS.find((b) => age >= b.min && age <= b.max)?.hint || 'Biological Vitality'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {AGE_BRACKETS.map((b) => {
                        const isMatch = age >= b.min && age <= b.max;
                        return (
                          <button
                            key={b.label}
                            type="button"
                            onClick={() => {
                              triggerHapticLight();
                              setAge(b.defaultAge);
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              border: isMatch ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                              background: isMatch ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' : '#FFFFFF',
                              color: isMatch ? '#FFFFFF' : '#475569',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: isMatch ? '0 2px 8px rgba(13, 148, 136, 0.25)' : 'none',
                            }}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Micro-Stepper */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticLight();
                          setAge((prev) => Math.max(14, prev - 1));
                        }}
                        style={stepperBtnStyle}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(parseInt(e.target.value, 10) || 18)}
                        style={{ ...inputStyle, width: '90px', textAlign: 'center', fontWeight: 800 }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticLight();
                          setAge((prev) => Math.min(105, prev + 1));
                        }}
                        style={stepperBtnStyle}
                      >
                        +
                      </button>
                      <span style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>years young</span>
                    </div>
                  </div>

                  {/* Biological Sex: 3 Endocrine Cards */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                      Biological Sex (Endocrine Baseline)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
                      {[
                        { id: 'Female', title: 'Female (XX)', desc: 'Estrogen/progesterone circadian clearance & iron index' },
                        { id: 'Male', title: 'Male (XY)', desc: 'Androgen baseline, lipid synthesis & metabolic rate' },
                        { id: 'Other', title: 'Non-binary / Other', desc: 'Customized physiological parameters' },
                      ].map((s) => {
                        const isSelected = gender === s.id;
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              triggerHapticLight();
                              setGender(s.id as any);
                            }}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 16,
                              border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                              background: isSelected ? '#F0FDFA' : '#FFFFFF',
                              cursor: 'pointer',
                              boxShadow: isSelected ? '0 4px 14px rgba(13, 148, 136, 0.12)' : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 800, color: isSelected ? '#0F766E' : '#1E293B' }}>
                              {s.title}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4, lineHeight: 1.4 }}>
                              {s.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Blood Group: 4x2 Grid */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                      Blood Group Antigen Matrix
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {BLOOD_GROUPS.map((bg) => {
                        const isSelected = bloodGroup === bg;
                        return (
                          <button
                            key={bg}
                            type="button"
                            onClick={() => {
                              triggerHapticLight();
                              setBloodGroup(bg);
                            }}
                            style={{
                              padding: '6px 14px',
                              borderRadius: 10,
                              border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                              background: isSelected ? '#CCFBF1' : '#FFFFFF',
                              color: isSelected ? '#0F766E' : '#334155',
                              fontWeight: 800,
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            {bg}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Height & Weight Steppers */}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                    {/* Height */}
                    <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 18, border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Ruler size={15} color="#0D9488" /> Height
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0D9488' }}>
                          {heightCm} cm
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setHeightCm((prev) => Math.max(120, prev - 1));
                          }}
                          style={stepperBtnStyle}
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="120"
                          max="220"
                          value={heightCm}
                          onChange={(e) => setHeightCm(parseInt(e.target.value, 10))}
                          style={{ flex: 1, accentColor: '#0D9488' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setHeightCm((prev) => Math.min(220, prev + 1));
                          }}
                          style={stepperBtnStyle}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Weight */}
                    <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 18, border: '1px solid #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Scale size={15} color="#0D9488" /> Weight
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#0D9488' }}>
                          {weightKg} kg
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setWeightKg((prev) => Math.max(35, prev - 1));
                          }}
                          style={stepperBtnStyle}
                        >
                          -
                        </button>
                        <input
                          type="range"
                          min="35"
                          max="180"
                          value={weightKg}
                          onChange={(e) => setWeightKg(parseInt(e.target.value, 10))}
                          style={{ flex: 1, accentColor: '#0D9488' }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setWeightKg((prev) => Math.min(180, prev + 1));
                          }}
                          style={stepperBtnStyle}
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
                      padding: '16px 18px',
                      border: '1.5px solid #99F6E4',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: '#0F766E', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                          LIVE METABOLIC EQUILIBRIUM GAUGE
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1C1917', marginTop: 2 }}>
                          BMI: <strong>{bmi}</strong> • <span style={{ color: bmiCategory.color }}>{bmiCategory.label}</span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#047857', fontWeight: 600 }}>Estimated BMR</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#0F766E' }}>{bmr} kcal/day</div>
                      </div>
                    </div>

                    {/* Spectrum Track */}
                    <div style={{ width: '100%', height: '8px', background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 35%, #F59E0B 70%, #EF4444 100%)', borderRadius: 999, position: 'relative', marginTop: 10 }}>
                      <div
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          left: `${Math.min(96, Math.max(4, ((bmi - 15) / 25) * 100))}%`,
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: '#FFFFFF',
                          border: '2.5px solid #0F766E',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          transform: 'translateX(-50%)',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#047857', marginTop: 8, fontWeight: 600 }}>
                      <span>Healthy Weight Interval: <strong>{idealWeightRange}</strong></span>
                      <span>WHO Clinical Standards</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 1: MULTI-SYSTEM MEDICAL SNAPSHOT (THE NO-MORE-TEXTAREA UPGRADE) */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}
                >
                  {/* Chronic Conditions */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🩺 Chronic Health Conditions</span>
                      </label>
                      <span style={{ fontSize: 11.5, color: '#0D9488', fontWeight: 700 }}>
                        {conditions.length} active
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {COMMON_CONDITIONS.map((c) => {
                        const isSelected = conditions.includes(c.name);
                        return (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => toggleCondition(c.name)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                              background: isSelected ? '#CCFBF1' : '#FFFFFF',
                              color: isSelected ? '#0F766E' : '#334155',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <span>{c.icon}</span> {c.name}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={customCondition}
                        onChange={(e) => setCustomCondition(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomCondition())}
                        placeholder="Add other diagnosed condition..."
                        aria-label="Add custom diagnosed condition"
                        style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={addCustomCondition}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 11,
                          border: 'none',
                          background: '#0D9488',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Regular Medications & Circadian Timing */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>💊 Regular Prescriptions & Circadian Clock</span>
                      </label>
                      <span style={{ fontSize: 11.5, color: '#0D9488', fontWeight: 700 }}>
                        {medications.length} scheduled
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {PRESET_MEDICATIONS.map((m) => {
                        const isSelected = Boolean(medications.find((med) => med.name === m.name));
                        return (
                          <button
                            key={m.name}
                            type="button"
                            onClick={() => toggleMedication(m.name, m.defaultSlot)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                              background: isSelected ? '#0D9488' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : '#334155',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + {m.name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Meds List with Circadian Slot Selector */}
                    {medications.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        {medications.map((m) => (
                          <div
                            key={m.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: '#F8FAFC',
                              borderRadius: 12,
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{m.name}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {(['morning', 'midday', 'evening', 'bedtime'] as CircadianSlot[]).map((slot) => {
                                const meta = CIRCADIAN_SLOT_META[slot];
                                const isCur = m.slot === slot;
                                return (
                                  <button
                                    key={slot}
                                    type="button"
                                    onClick={() => updateMedSlot(m.name, slot)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: 6,
                                      border: isCur ? '1px solid #0D9488' : '1px solid #E2E8F0',
                                      background: isCur ? meta.bg : '#FFFFFF',
                                      color: isCur ? meta.color : '#64748B',
                                      fontSize: 11,
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {meta.icon} {meta.label}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => toggleMedication(m.name, m.slot)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '0 4px',
                                }}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        value={customMed}
                        onChange={(e) => setCustomMed(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomMed())}
                        placeholder="Add custom medicine..."
                        aria-label="Add custom medicine"
                        style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}
                      />
                      <button
                        type="button"
                        onClick={addCustomMed}
                        style={{
                          padding: '8px 14px',
                          borderRadius: 11,
                          border: 'none',
                          background: '#0D9488',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: 'pointer',
                        }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Clinical Allergy Guard */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🛡️ Allergy & Contraindication Guard</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHapticLight();
                          setNkda(!nkda);
                          if (!nkda) setAllergies([]);
                        }}
                        style={{
                          fontSize: 11.5,
                          padding: '3px 9px',
                          borderRadius: 999,
                          border: nkda ? '1px solid #10B981' : '1px solid #E2E8F0',
                          background: nkda ? '#ECFDF5' : '#FFFFFF',
                          color: nkda ? '#047857' : '#64748B',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {nkda ? '✓ NKDA (No Known Allergies)' : 'Set NKDA'}
                      </button>
                    </div>

                    {!nkda && (
                      <>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                          {COMMON_ALLERGIES.map((a) => {
                            const isSelected = Boolean(allergies.find((item) => item.name === a.name));
                            return (
                              <button
                                key={a.name}
                                type="button"
                                onClick={() => toggleAllergy(a.name, a.defaultSeverity)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: 999,
                                  border: isSelected ? '1.5px solid #EF4444' : '1px solid #E2E8F0',
                                  background: isSelected ? '#FEF2F2' : '#FFFFFF',
                                  color: isSelected ? '#DC2626' : '#334155',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                + {a.name}
                              </button>
                            );
                          })}
                        </div>

                        {/* Active Allergies with Severity Selector */}
                        {allergies.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                            {allergies.map((a) => (
                              <div
                                key={a.name}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 12px',
                                  background: '#FEF2F2',
                                  borderRadius: 12,
                                  border: '1px solid #FECDD3',
                                }}
                              >
                                <span style={{ fontWeight: 700, fontSize: 13, color: '#991B1B' }}>{a.name}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {(['mild', 'moderate', 'severe'] as AllergySeverity[]).map((sev) => {
                                    const isCur = a.severity === sev;
                                    return (
                                      <button
                                        key={sev}
                                        type="button"
                                        onClick={() => updateAllergySeverity(a.name, sev)}
                                        style={{
                                          padding: '3px 8px',
                                          borderRadius: 6,
                                          border: isCur ? '1px solid #DC2626' : '1px solid #E2E8F0',
                                          background: isCur ? '#DC2626' : '#FFFFFF',
                                          color: isCur ? '#FFFFFF' : '#64748B',
                                          fontSize: 11,
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        {sev.toUpperCase()}
                                      </button>
                                    );
                                  })}
                                  <button
                                    type="button"
                                    onClick={() => toggleAllergy(a.name, a.severity)}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#991B1B',
                                      cursor: 'pointer',
                                      padding: '0 4px',
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                          <input
                            type="text"
                            value={customAllergy}
                            onChange={(e) => setCustomAllergy(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomAllergy())}
                            placeholder="Add other allergen..."
                            aria-label="Add custom allergen"
                            style={{ ...inputStyle, padding: '8px 12px', fontSize: 13 }}
                          />
                          <button
                            type="button"
                            onClick={addCustomAllergy}
                            style={{
                              padding: '8px 14px',
                              borderRadius: 11,
                              border: 'none',
                              background: '#EF4444',
                              color: '#FFF',
                              fontWeight: 700,
                              fontSize: 13,
                              cursor: 'pointer',
                            }}
                          >
                            + Add
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Family History */}
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
                      🧬 Relevant Family History
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {FAMILY_CONDITIONS.map((f) => {
                        const isSelected = familyHistory.includes(f);
                        return (
                          <button
                            key={f}
                            type="button"
                            onClick={() => toggleFamily(f)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 999,
                              border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                              background: isSelected ? '#CCFBF1' : '#FFFFFF',
                              color: isSelected ? '#0F766E' : '#334155',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {isSelected ? '✓ ' : '+ '} {f}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: HEALTH FOCUS */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <div>
                    <h2 style={{ margin: '0 0 6px', fontSize: 18, color: '#0F172A', fontWeight: 800 }}>
                      What is your primary clinical focus?
                    </h2>
                    <p style={{ margin: 0, fontSize: 13.5, color: '#64748B', lineHeight: 1.5 }}>
                      This guides Dr. Ava and the Connection Detective Engine to prioritize relevant cascades.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {HEALTH_FOCUS_OPTIONS.map((opt) => {
                      const isSelected = healthFocus === opt.title;
                      return (
                        <div
                          key={opt.id}
                          onClick={() => {
                            triggerHapticLight();
                            setHealthFocus(opt.title);
                          }}
                          style={{
                            padding: '14px 16px',
                            borderRadius: 16,
                            border: isSelected ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                            background: isSelected ? '#F0FDFA' : '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            boxShadow: isSelected ? '0 4px 16px rgba(13, 148, 136, 0.12)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: 24 }}>{opt.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14.5, fontWeight: 800, color: isSelected ? '#0F766E' : '#1E293B' }}>
                              {opt.title}
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{opt.desc}</div>
                          </div>
                          {isSelected && <Check size={18} color="#0D9488" />}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      background: '#F0FDFA',
                      border: '1px solid #CCFBF1',
                      color: '#0F766E',
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>What happens next:</strong> Your Whole-Body Medical Profile will be calibrated. From there, Dr. Ava and the multi-specialist panel cross-correlate every symptom, meal, and kinetic check-in.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Stepper Actions */}
            <div
              style={{
                marginTop: 28,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => (step ? setStep(step - 1) : navigate('/', { replace: true }))}
                style={{ ...secondaryButton, visibility: step || true ? 'visible' : 'hidden' }}
              >
                <ArrowLeft size={16} />
                {step ? 'Back' : 'Back to home'}
              </button>

              <button
                type="button"
                onClick={() => (step === 2 ? finish() : setStep(step + 1))}
                disabled={!canContinue}
                style={{
                  ...primaryButton,
                  opacity: canContinue ? 1 : 0.45,
                  cursor: canContinue ? 'pointer' : 'not-allowed',
                }}
              >
                {step === 2 ? 'Launch HealthChain360 Record ✨' : 'Continue'}{' '}
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1.5px solid #CCFBF1',
  borderRadius: 12,
  padding: '12px 14px',
  background: '#FFFFFF',
  color: '#0F172A',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
} as any;

const stepperBtnStyle = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  border: '1px solid #CCFBF1',
  background: '#F0FDFA',
  color: '#0F766E',
  fontSize: '18px',
  fontWeight: 800,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
} as any;

const primaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  borderRadius: 14,
  padding: '14px 22px',
  background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
  color: '#FFF',
  fontWeight: 800,
  fontSize: 14.5,
  boxShadow: '0 6px 20px rgba(13, 148, 136, 0.3)',
};

const secondaryButton = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  border: 'none',
  background: 'transparent',
  color: '#64748B',
  fontWeight: 750,
  cursor: 'pointer',
  padding: '10px 14px',
};
