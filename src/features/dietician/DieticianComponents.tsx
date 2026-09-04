import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Apple, Utensils, Target, CheckCircle2, ChevronRight, ChevronLeft, 
  ArrowRight, Flame, Scale, Ruler, Heart, Sparkles, Zap, Activity, 
  Clock, ShieldCheck, Droplets, User, Info, Check, X 
} from 'lucide-react';
import { GOALS, ACTIVITY_LEVELS, RESTRICTIONS, MEDICAL_CONDITIONS, CUISINES, MEAL_SCHEDULES } from './Dietician';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getProfile as getCoreProfile } from '../../services/ProfileEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';

function computeTargets(p: any) {
  let parsedWeight = parseFloat(p.weight);
  if (p.weightUnit === 'lbs') parsedWeight = parsedWeight * 0.453592;
  const w = Math.max(20, !Number.isNaN(parsedWeight) ? parsedWeight : 70);

  let parsedHeight = parseFloat(p.height);
  if (p.heightUnit === 'ft') {
    const ft = parseFloat(p.heightFt) || 0;
    const inc = parseFloat(p.heightIn) || 0;
    parsedHeight = (ft * 30.48) + (inc * 2.54);
  }
  const h = Math.max(50, !Number.isNaN(parsedHeight) ? parsedHeight : 170);

  const parsedAge = parseInt(p.age, 10);
  const age = Math.max(1, !Number.isNaN(parsedAge) ? parsedAge : 30);
  
  let bmr = 10 * w + 6.25 * h - 5 * age;
  bmr = p.gender === 'female' ? bmr - 161 : bmr + 5;

  let multiplier = 1.2;
  if (p.activityLevel === 'light') multiplier = 1.375;
  if (p.activityLevel === 'moderate') multiplier = 1.55;
  if (p.activityLevel === 'active') multiplier = 1.725;

  let tdee = bmr * multiplier;
  let targetCalories = Math.round(tdee);

  const parsedDays = parseInt(p.targetDays, 10);
  if (!Number.isNaN(parsedDays) && parsedDays > 0 && p.goal !== 'Maintain') {
    const parsedTargetW = parseFloat(p.targetWeight);
    const targetW = !Number.isNaN(parsedTargetW) ? parsedTargetW : w;
    const weightDiff = Math.abs(w - targetW);
    const totalCalorieChange = weightDiff * 7700;
    const dailyChange = totalCalorieChange / (parsedDays || 1);
    const safeDailyChange = Math.min(dailyChange, 1000);

    if (p.goal === 'Lose weight') targetCalories = Math.round(tdee - safeDailyChange);
    if (p.goal === 'Gain muscle' || p.goal === 'Lean mass preservation') targetCalories = Math.round(tdee + safeDailyChange);
  } else {
    if (p.goal === 'Lose weight') targetCalories -= 500;
    if (p.goal === 'Gain muscle' || p.goal === 'Lean mass preservation') targetCalories += 500;
  }

  targetCalories = Math.max(1200, Number.isNaN(targetCalories) ? 2000 : targetCalories);
  const targetProtein = Math.round((targetCalories * 0.25) / 4);
  const targetCarbs = Math.round((targetCalories * 0.45) / 4);
  const targetFat = Math.round((targetCalories * 0.3) / 9);

  return { bmr: Math.round(bmr), tdee: Math.round(tdee), targetCalories, targetProtein, targetCarbs, targetFat };
}

export function OnboardingWizard({ 
  onComplete, 
  initialData, 
  onCancel 
}: { 
  onComplete: (data: any) => void;
  initialData?: any;
  onCancel?: () => void;
}) {
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const coreProfile = getCoreProfile();

  const [data, setData] = useState(() => {
    if (initialData) {
      return {
        weight: initialData.weight ? String(initialData.weight) : (coreProfile?.weight ? String(coreProfile.weight) : ''),
        weightUnit: initialData.weightUnit || 'kg',
        targetWeight: initialData.targetWeight ? String(initialData.targetWeight) : '',
        targetDays: initialData.targetDays ? String(initialData.targetDays) : '90',
        height: initialData.height ? String(initialData.height) : (coreProfile?.height ? String(coreProfile.height) : ''),
        heightUnit: initialData.heightUnit || 'cm',
        heightFt: initialData.heightFt || '',
        heightIn: initialData.heightIn || '',
        age: initialData.age ? String(initialData.age) : (coreProfile?.age ? String(coreProfile.age) : ''),
        gender: initialData.gender || (coreProfile?.gender?.toLowerCase() === 'female' ? 'female' : 'male'),
        goal: initialData.goal || 'Lose weight',
        activityLevel: initialData.activityLevel || 'moderate',
        restrictions: initialData.restrictions || ['None'],
        medicalConditions: initialData.medicalConditions || ['None'],
        cuisine: initialData.cuisine || 'North Indian',
        mealSchedule: initialData.mealSchedule || '3 Meals + 1 Snack',
      };
    }

    const rawConds = (coreProfile?.conditions || []).map((c: any) => typeof c === 'string' ? c : c.name || '');
    const matchedConds = MEDICAL_CONDITIONS.filter(mc => rawConds.some((rc: string) => rc.toLowerCase().includes(mc.toLowerCase())));
    const allergies = (coreProfile?.allergies || []).map((a: any) => typeof a === 'string' ? a : a?.name || '');
    const matchedRestrictions = RESTRICTIONS.filter(r => allergies.some((a: string) => a.toLowerCase().includes(r.toLowerCase())));

    return {
      weight: coreProfile?.weight ? String(coreProfile.weight) : '',
      weightUnit: 'kg',
      targetWeight: coreProfile?.weight ? String(Math.max(20, Number(coreProfile.weight) - 5)) : '',
      targetDays: '90',
      height: coreProfile?.height ? String(coreProfile.height) : '',
      heightUnit: 'cm',
      heightFt: '',
      heightIn: '',
      age: coreProfile?.age ? String(coreProfile.age) : '',
      gender: coreProfile?.gender?.toLowerCase() === 'female' ? 'female' : 'male',
      goal: 'Lose weight',
      activityLevel: 'moderate',
      restrictions: matchedRestrictions.length > 0 ? matchedRestrictions : ['None'],
      medicalConditions: matchedConds.length > 0 ? matchedConds : ['None'],
      cuisine: 'North Indian',
      mealSchedule: '3 Meals + 1 Snack',
    };
  });

  const next = () => {
    try { triggerHapticLight(); } catch {}
    setStep((s) => Math.min(8, s + 1));
  };

  const prev = () => {
    try { triggerHapticLight(); } catch {}
    setStep((s) => Math.max(1, s - 1));
  };

  // Live Metrics
  const parsedW = parseFloat(data.weight);
  const parsedH = parseFloat(data.height) / 100;
  const w = !Number.isNaN(parsedW) ? parsedW : 0;
  const h = !Number.isNaN(parsedH) ? parsedH : 0;
  const targetW = parseFloat(data.targetWeight);
  const bmi = (w > 0 && h > 0) ? (w / (h * h)).toFixed(1) : null;
  
  let bmiCategory = '';
  let bmiColor = '#059669';
  if (bmi) {
    const num = parseFloat(bmi);
    if (num < 18.5) { bmiCategory = 'Underweight'; bmiColor = '#D97706'; }
    else if (num <= 24.9) { bmiCategory = 'Optimal Range'; bmiColor = '#059669'; }
    else if (num <= 29.9) { bmiCategory = 'Overweight'; bmiColor = '#D97706'; }
    else { bmiCategory = 'Obesity Class'; bmiColor = '#DC2626'; }
  }

  const calculated = computeTargets(data);

  return (
    <div
      style={{
        minHeight: '85vh',
        padding: isMobile ? '12px 8px 100px' : '24px 16px 100px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      {/* Immersive Ambient Glow Elements */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '15%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '15%',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 253, 244, 0.9) 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderRadius: isMobile ? '28px' : '36px',
          padding: isMobile ? '24px 18px' : '44px 40px',
          maxWidth: '600px',
          width: '100%',
          boxShadow: '0 25px 60px -15px rgba(5, 150, 105, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.9) inset, 0 10px 25px rgba(0, 0, 0, 0.03)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          position: 'relative',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Shimmering Progress Bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'rgba(226, 232, 240, 0.6)',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ scaleX: step / 8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #059669 0%, #10B981 50%, #34D399 100%)',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)',
            }}
          />
        </div>

        {/* Header with Step indicator and back button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {step > 1 && step < 8 ? (
              <button
                onClick={prev}
                aria-label="Back"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                }}
              >
                <Apple size={20} />
              </div>
            )}
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.2px' }}>
                Clinical Dietician Setup
              </div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                Metabolic Target Engine · Step {step} of 8
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px',
                background: 'rgba(5, 150, 105, 0.1)',
                color: '#047857',
                border: '1px solid rgba(5, 150, 105, 0.2)',
              }}
            >
              {Math.round((step / 8) * 100)}% Ready
            </div>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Close"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  background: 'rgba(241, 245, 249, 0.8)',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* STEP 1: METABOLIC BASELINE */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2
              style={{
                fontSize: isMobile ? '22px' : '26px',
                fontWeight: 800,
                color: '#0F172A',
                marginBottom: '6px',
                letterSpacing: '-0.5px',
              }}
            >
              Let's establish your metabolic baseline.
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '20px', lineHeight: 1.45 }}>
              We use the gold-standard <strong style={{ color: '#0F172A' }}>Mifflin-St Jeor equation</strong> to compute your basal expenditure and macro partitioning.
            </p>

            {/* Gender Toggle */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                Biological Sex (for metabolic coefficient)
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['male', 'female'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setData({ ...data, gender: g })}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: `1.5px solid ${data.gender === g ? '#059669' : '#E2E8F0'}`,
                      background: data.gender === g ? '#ECFDF5' : '#FFFFFF',
                      color: data.gender === g ? '#065F46' : '#64748B',
                      fontWeight: 700,
                      fontSize: '13px',
                      textTransform: 'capitalize',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <User size={15} />
                    {g === 'male' ? 'Male (BMR +5)' : 'Female (BMR -161)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Unit Toggles */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '2px' }}>
                <button onClick={() => setData({...data, weightUnit: 'kg'})} style={{ background: data.weightUnit === 'kg' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.weightUnit === 'kg' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.weightUnit === 'kg' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>kg</button>
                <button onClick={() => setData({...data, weightUnit: 'lbs'})} style={{ background: data.weightUnit === 'lbs' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.weightUnit === 'lbs' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.weightUnit === 'lbs' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>lbs</button>
              </div>
              <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: '8px', padding: '2px' }}>
                <button onClick={() => setData({...data, heightUnit: 'cm'})} style={{ background: data.heightUnit === 'cm' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.heightUnit === 'cm' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.heightUnit === 'cm' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>cm</button>
                <button onClick={() => setData({...data, heightUnit: 'ft'})} style={{ background: data.heightUnit === 'ft' ? '#FFF' : 'transparent', border: 'none', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: data.heightUnit === 'ft' ? '#0F172A' : '#64748B', cursor: 'pointer', boxShadow: data.heightUnit === 'ft' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>ft/in</button>
              </div>
            </div>

            {/* Weight & Target Weight */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Scale size={13} color="#059669" /> Current Weight ({data.weightUnit})
                </label>
                <input
                  type="number"
                  min="20"
                  max="600"
                  value={data.weight}
                  onChange={(e) => setData({ ...data, weight: e.target.value })}
                  placeholder={data.weightUnit === 'kg' ? "e.g. 75" : "e.g. 165"}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Target size={13} color="#059669" /> Target Weight ({data.weightUnit})
                </label>
                <input
                  type="number"
                  min="20"
                  max="600"
                  value={data.targetWeight}
                  onChange={(e) => setData({ ...data, targetWeight: e.target.value })}
                  placeholder={data.weightUnit === 'kg' ? "e.g. 70" : "e.g. 150"}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
            </div>

            {/* Height & Age */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Ruler size={13} color="#059669" /> Height ({data.heightUnit})
                </label>
                {data.heightUnit === 'cm' ? (
                  <input
                    type="number"
                    min="50"
                    max="260"
                    value={data.height}
                    onChange={(e) => setData({ ...data, height: e.target.value })}
                    placeholder="e.g. 175"
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '14px',
                      border: '1.5px solid #E2E8F0',
                      outline: 'none',
                      background: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#0F172A',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="number"
                      min="3"
                      max="8"
                      value={data.heightFt}
                      onChange={(e) => setData({ ...data, heightFt: e.target.value })}
                      placeholder="ft"
                      style={{
                        width: '100%',
                        padding: '14px 12px',
                        borderRadius: '14px',
                        border: '1.5px solid #E2E8F0',
                        outline: 'none',
                        background: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#0F172A',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      }}
                    />
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={data.heightIn}
                      onChange={(e) => setData({ ...data, heightIn: e.target.value })}
                      placeholder="in"
                      style={{
                        width: '100%',
                        padding: '14px 12px',
                        borderRadius: '14px',
                        border: '1.5px solid #E2E8F0',
                        outline: 'none',
                        background: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#0F172A',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                      }}
                    />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  <Clock size={13} color="#059669" /> Age (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={data.age}
                  onChange={(e) => setData({ ...data, age: e.target.value })}
                  placeholder="e.g. 29"
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '14px',
                    border: '1.5px solid #E2E8F0',
                    outline: 'none',
                    background: '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0F172A',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                />
              </div>
            </div>

            {/* Timeframe */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                <Clock size={13} color="#059669" /> Target Duration (Days)
              </label>
              <input
                type="number"
                min="7"
                max="730"
                value={data.targetDays}
                onChange={(e) => setData({ ...data, targetDays: e.target.value })}
                placeholder="e.g. 90"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1.5px solid #E2E8F0',
                  outline: 'none',
                  background: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#0F172A',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              />
            </div>

            {/* Live Instant Biometric Feedback Box */}
            {bmi && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  padding: '14px 16px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                  marginBottom: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(5, 150, 105, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#059669',
                    }}
                  >
                    <Activity size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      BMI: {bmi}
                    </div>
                    <div style={{ fontSize: '11px', color: bmiColor, fontWeight: 700 }}>
                      {bmiCategory}
                    </div>
                  </div>
                </div>

                {w > 0 && targetW > 0 && (
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>
                    {w === targetW ? (
                      <span style={{ color: '#059669' }}>⚖️ Maintenance Plan</span>
                    ) : (
                      <span>
                        {w > targetW ? '📉 -' : '📈 +'}{Math.abs(w - targetW).toFixed(1)} kg over {data.targetDays || 90}d
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            <button
              onClick={next}
              disabled={(data.heightUnit === 'cm' ? [data.weight, data.targetWeight, data.height, data.age, data.targetDays] : [data.weight, data.targetWeight, data.heightFt, data.age, data.targetDays]).some(v => v === '' || v == null)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: (data.heightUnit === 'cm' ? [data.weight, data.targetWeight, data.height, data.age, data.targetDays] : [data.weight, data.targetWeight, data.heightFt, data.age, data.targetDays]).some(v => v === '' || v == null) ? 'not-allowed' : 'pointer',
                opacity: (data.heightUnit === 'cm' ? [data.weight, data.targetWeight, data.height, data.age, data.targetDays] : [data.weight, data.targetWeight, data.heightFt, data.age, data.targetDays]).some(v => v === '' || v == null) ? 0.5 : 1,
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              Continue to Goal Setup <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* STEP 2: PRIMARY GOAL */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              What is your primary clinical goal?
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '22px' }}>
              Your caloric deficit/surplus and macronutrient ratios will calibrate automatically.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {[
                { 
                  id: 'Lose weight', 
                  title: 'Fat Loss & Metabolic Reset', 
                  subtitle: 'Targeted caloric deficit with high protein satiety to spare lean tissue.', 
                  icon: Flame, 
                  color: '#EF4444', 
                  bg: '#FEF2F2' 
                },
                { 
                  id: 'Maintain', 
                  title: 'Metabolic Balance & Longevity', 
                  subtitle: 'Energy equilibrium with steady glycemic control and mitochondrial support.', 
                  icon: Heart, 
                  color: '#059669', 
                  bg: '#ECFDF5' 
                },
                { 
                  id: 'Lean mass preservation', 
                  title: 'Lean Mass Preservation & Recovery', 
                  subtitle: 'Optimized amino acid distribution and micronutrient density to sustain lean muscle mass and metabolic vitality.', 
                  icon: Zap, 
                  color: '#3B82F6', 
                  bg: '#EFF6FF' 
                },
              ].map((item) => {
                const isSelected = data.goal === item.id || (item.id === 'Lean mass preservation' && data.goal === 'Gain muscle');
                const IconComponent = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setData({ ...data, goal: item.id });
                      setTimeout(next, 160);
                    }}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '20px',
                      border: `2px solid ${isSelected ? '#059669' : '#E2E8F0'}`,
                      background: isSelected ? '#ECFDF5' : '#FFFFFF',
                      boxShadow: isSelected ? '0 8px 20px rgba(5, 150, 105, 0.15)' : '0 2px 8px rgba(0,0,0,0.02)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          background: item.bg,
                          color: item.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <IconComponent size={22} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: isSelected ? '#065F46' : '#0F172A', marginBottom: '3px' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '12px', color: isSelected ? '#047857' : '#64748B', lineHeight: 1.35 }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', flexShrink: 0 }}>
                        <Check size={15} />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 3: ACTIVITY LEVEL */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              How active is your daily routine?
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '22px' }}>
              Physical activity sets your Total Daily Energy Expenditure (TDEE) multiplier.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {ACTIVITY_LEVELS.map((level) => {
                const isSelected = data.activityLevel === level.id;
                return (
                  <motion.button
                    key={level.id}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setData({ ...data, activityLevel: level.id });
                      setTimeout(next, 160);
                    }}
                    style={{
                      padding: '18px 16px',
                      borderRadius: '18px',
                      border: `2px solid ${isSelected ? '#059669' : '#E2E8F0'}`,
                      background: isSelected ? '#ECFDF5' : '#FFFFFF',
                      boxShadow: isSelected ? '0 8px 20px rgba(5, 150, 105, 0.12)' : '0 2px 8px rgba(0,0,0,0.02)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontWeight: 800, fontSize: '15px', color: isSelected ? '#065F46' : '#0F172A' }}>
                        {level.label}
                      </div>
                      {isSelected && <CheckCircle2 size={18} color="#059669" />}
                    </div>
                    <div style={{ fontSize: '12px', color: isSelected ? '#047857' : '#64748B', lineHeight: 1.4 }}>
                      {level.desc}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 4: DIETARY RESTRICTIONS */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Any dietary preferences or restrictions?
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '22px' }}>
              Select all that apply. Your 7-day meal plans and grocery lists will adapt strictly.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
              {RESTRICTIONS.map((r) => {
                const isSelected = data.restrictions.includes(r);
                return (
                  <motion.button
                    key={r}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (r === 'None') {
                        setData({ ...data, restrictions: ['None'] });
                      } else {
                        const newRest = isSelected
                          ? data.restrictions.filter((x: string) => x !== r)
                          : [...data.restrictions.filter((x: string) => x !== 'None'), r];
                        setData({ ...data, restrictions: newRest.length > 0 ? newRest : ['None'] });
                      }
                    }}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '999px',
                      border: `1.5px solid ${isSelected ? '#059669' : '#E2E8F0'}`,
                      background: isSelected ? '#059669' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? '0 4px 14px rgba(5, 150, 105, 0.25)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSelected && <Check size={15} />}
                    {r}
                  </motion.button>
                );
              })}
            </div>

            <button
              onClick={next}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Continue <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* STEP 5: MEDICAL CONDITIONS */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Clinical guardrails & biomarkers?
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '22px' }}>
              Our AI dietician implements clinical nutritional therapy protocols (e.g. low GI for Diabetes, anti-inflammatory for PCOS).
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
              {MEDICAL_CONDITIONS.map((c) => {
                const isSelected = data.medicalConditions.includes(c);
                return (
                  <motion.button
                    key={c}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => {
                      if (c === 'None') {
                        setData({ ...data, medicalConditions: ['None'] });
                      } else {
                        const newCond = isSelected
                          ? data.medicalConditions.filter((x: string) => x !== c)
                          : [...data.medicalConditions.filter((x: string) => x !== 'None'), c];
                        setData({ ...data, medicalConditions: newCond.length > 0 ? newCond : ['None'] });
                      }
                    }}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '999px',
                      border: `1.5px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                      background: isSelected ? '#3B82F6' : '#FFFFFF',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isSelected ? '0 4px 14px rgba(59, 130, 246, 0.25)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isSelected && <Check size={15} />}
                    {c}
                  </motion.button>
                );
              })}
            </div>

            <button
              onClick={next}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '16px',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              Continue to Cuisine Setup <ArrowRight size={16} />
            </button>
          </motion.div>
        )}

        {/* STEP 6: CUISINE PREFERENCE */}
        {step === 6 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              What is your culinary style?
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '22px' }}>
              Recipes will prioritize authentic native spices, ingredients, and realistic prep methods.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
              {CUISINES.map((c) => {
                const isSelected = data.cuisine === c;
                return (
                  <motion.button
                    key={c}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setData({ ...data, cuisine: c });
                      setTimeout(next, 160);
                    }}
                    style={{
                      padding: '18px 14px',
                      borderRadius: '16px',
                      border: `2px solid ${isSelected ? '#F59E0B' : '#E2E8F0'}`,
                      background: isSelected ? '#FFFBEB' : '#FFFFFF',
                      color: isSelected ? '#92400E' : '#334155',
                      fontWeight: 800,
                      fontSize: '14px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 6px 16px rgba(245, 158, 11, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Utensils size={18} style={{ margin: '0 auto 6px', color: isSelected ? '#D97706' : '#94A3B8' }} />
                    {c}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 7: MEAL SCHEDULE */}
        {step === 7 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 style={{ fontSize: isMobile ? '22px' : '26px', fontWeight: 800, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.5px' }}>
              Daily Meal Timing & Schedule
            </h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '22px' }}>
              Choose a structure that matches your work rhythm and digestion windows.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {MEAL_SCHEDULES.map((m) => {
                const isSelected = data.mealSchedule === m;
                return (
                  <motion.button
                    key={m}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setData({ ...data, mealSchedule: m });
                      setTimeout(next, 160);
                    }}
                    style={{
                      padding: '18px 20px',
                      borderRadius: '18px',
                      border: `2px solid ${isSelected ? '#6366F1' : '#E2E8F0'}`,
                      background: isSelected ? '#EEF2FF' : '#FFFFFF',
                      color: isSelected ? '#4338CA' : '#334155',
                      fontWeight: 800,
                      fontSize: '15px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      boxShadow: isSelected ? '0 6px 18px rgba(99, 102, 241, 0.15)' : '0 2px 6px rgba(0,0,0,0.02)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Clock size={18} color={isSelected ? '#6366F1' : '#94A3B8'} />
                      <span>{m}</span>
                    </div>
                    {isSelected && <CheckCircle2 size={20} color="#6366F1" />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* STEP 8: REVEAL & COMPUTED METABOLIC BLUEPRINT */}
        {step === 8 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center' }}
          >
            <div
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                color: '#FFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                boxShadow: '0 12px 30px rgba(16, 185, 129, 0.35)',
              }}
            >
              <Sparkles size={36} />
            </div>

            <h2 style={{ fontSize: isMobile ? '24px' : '28px', fontWeight: 900, color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.8px' }}>
              Metabolic Blueprint Ready!
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '24px', lineHeight: 1.5 }}>
              Your clinical targets have been computed and synchronized across your HealthChain ecosystem.
            </p>

            {/* Calculated Blueprint Card */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '20px',
                border: '1.5px solid #A7F3D0',
                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.08)',
                marginBottom: '28px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Flame size={18} color="#EF4444" />
                  <span style={{ fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>Daily Caloric Budget</span>
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#059669' }}>
                  {calculated.targetCalories} <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>kcal/day</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#FEF2F2', padding: '12px 10px', borderRadius: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase' }}>Protein (25%)</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#DC2626', marginTop: '2px' }}>{calculated.targetProtein}g</div>
                </div>
                <div style={{ background: '#EFF6FF', padding: '12px 10px', borderRadius: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>Carbs (45%)</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#2563EB', marginTop: '2px' }}>{calculated.targetCarbs}g</div>
                </div>
                <div style={{ background: '#FFFBEB', padding: '12px 10px', borderRadius: '14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>Healthy Fat (30%)</div>
                  <div style={{ fontSize: '17px', fontWeight: 900, color: '#D97706', marginTop: '2px' }}>{calculated.targetFat}g</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', fontSize: '12px', color: '#475569' }}>
                <ShieldCheck size={15} color="#059669" />
                <span>Calibrated for: <strong>{data.goal}</strong> · {data.cuisine} cuisine · {data.mealSchedule}</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                triggerHapticSuccess();
                onComplete(data);
              }}
              style={{
                width: '100%',
                padding: '18px',
                background: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #0F172A 100%)',
                color: '#FFF',
                border: 'none',
                borderRadius: '18px',
                fontWeight: 800,
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 12px 30px rgba(4, 120, 87, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
              }}
            >
              Enter Dietician Dashboard <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
