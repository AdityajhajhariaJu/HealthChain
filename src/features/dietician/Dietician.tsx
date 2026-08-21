import { useState, useEffect, useRef, useMemo } from 'react';

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0); 
}
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + deltaDays);
  return formatLocalDate(d);
}

import {
  Apple,
  Utensils,
  Droplet,
  Target,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Plus,
  ArrowRight,
  Flame,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  analyzeFoodEntry,
  generateMealPlan,
  generateDieticianAdvice,
} from '../../services/geminiService';
import { addEvent, addNutritionLog, getProfileKey } from '../../services/ProfileEngine';
import { getLatestHealthMemory, recordHealthMemory, syncHealthMemoryFromSupabase } from '../../services/HealthMemory';
import { OnboardingWizard } from './DieticianComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getActiveSession } from '../../services/authSession';
import FocusTrap from '../../components/ui/FocusTrap';

// --- Constants & Helpers ---
export const GOALS = ['Lose weight', 'Maintain', 'Gain muscle'];
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { id: 'light', label: 'Light', desc: 'Exercise 1-3 times/week' },
  { id: 'moderate', label: 'Moderate', desc: 'Exercise 4-5 times/week' },
  { id: 'active', label: 'Very Active', desc: 'Daily exercise or physical job' },
];
export const RESTRICTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Lactose-free', 'None'];
export const MEDICAL_CONDITIONS = ['Diabetes', 'PCOS', 'Hypertension', 'Thyroid', 'None'];
export const CUISINES = ['North Indian', 'South Indian', 'Mediterranean', 'Western', 'Keto', 'Any'];
export const MEAL_SCHEDULES = [
  '3 Meals',
  '3 Meals + 1 Snack',
  '5 Small Meals',
  'Intermittent Fasting (16:8)',
];

function calculateTargets(p) {
  // Mifflin-St Jeor Equation
  let bmr = 10 * Math.max(20, parseFloat(p.weight || '70')) + 6.25 * Math.max(50, parseFloat(p.height || '170')) - 5 * Math.max(1, parseInt(p.age || '30'));
  bmr = p.gender === 'male' ? bmr + 5 : bmr - 161;

  let multiplier = 1.2;
  if (p.activityLevel === 'light') multiplier = 1.375;
  if (p.activityLevel === 'moderate') multiplier = 1.55;
  if (p.activityLevel === 'active') multiplier = 1.725;

  let tdee = bmr * multiplier;
  let targetCalories = Math.round(tdee);

  if (p.targetDays && parseInt(p.targetDays) > 0 && p.goal !== 'Maintain') {
    const weightDiff = Math.abs(Math.max(20, parseFloat(p.weight || '70')) - parseFloat(p.targetWeight));
    const totalCalorieChange = weightDiff * 7700; // ~7700 kcal per kg of body weight
    const dailyChange = totalCalorieChange / (parseInt(p.targetDays) || 1);
    const safeDailyChange = Math.min(dailyChange, 1000);

    if (p.goal === 'Lose weight') targetCalories = Math.round(tdee - safeDailyChange);
    if (p.goal === 'Gain muscle') targetCalories = Math.round(tdee + safeDailyChange);
  } else {
    if (p.goal === 'Lose weight') targetCalories -= 500;
    if (p.goal === 'Gain muscle') targetCalories += 500;
  }

  // Practical split: 20% Protein, 50% Carbs, 30% Fat
  const targetProtein = Math.round((targetCalories * 0.2) / 4);
  const targetCarbs = Math.round((targetCalories * 0.5) / 4);
  const targetFat = Math.round((targetCalories * 0.3) / 9);

  return { targetCalories, targetProtein, targetCarbs, targetFat };
}

// --- Main Component ---
export default function Dietician() {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'mealplan'
  const [profile, setProfile] = useState<any>(null);
  const [foodLogs, setFoodLogs] = useState<any>({});
  const [hydration, setHydration] = useState<any>({});
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [advice, setAdvice] = useState<any>(null);
  const [isFetchingAdvice, setIsFetchingAdvice] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoggingFood, setIsLoggingFood] = useState(false);
  const [foodInput, setFoodInput] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Load the fast local copy first, then hydrate missing diet state from the
  // durable Health Memory ledger after sign-in/reinstall. Ava chat is
  // intentionally not part of this recovery path.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const profileKey = getProfileKey();
        const savedProfile = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile'));
        const savedLogs = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_food_logs'));
        const savedHydration = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_hydration'));
        const savedPlan = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_meal_plan'));
        const savedAdvice = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_advice'));

        if (savedProfile) setProfile({ ...JSON.parse(savedProfile), ...calculateTargets(JSON.parse(savedProfile)) });
        if (savedLogs) setFoodLogs(JSON.parse(savedLogs));
        if (savedHydration) setHydration(JSON.parse(savedHydration));
        if (savedPlan) setMealPlan(JSON.parse(savedPlan));
        if (savedAdvice) setAdvice(savedAdvice);

        await syncHealthMemoryFromSupabase();
        if (cancelled || savedProfile || savedLogs || savedHydration || savedPlan || savedAdvice) return;
        const snapshot = getLatestHealthMemory('diet', 'dietician')?.payload?.state;
        if (!snapshot) return;
        if (snapshot.profile) setProfile({ ...snapshot.profile, ...calculateTargets(snapshot.profile) });
        if (snapshot.foodLogs) setFoodLogs(snapshot.foodLogs);
        if (snapshot.hydration) setHydration(snapshot.hydration);
        if (snapshot.mealPlan) setMealPlan(snapshot.mealPlan);
        if (snapshot.advice) setAdvice(snapshot.advice);
      } catch (e) {
        console.error('Failed to restore diet state:', e);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // Save state to local storage when it changes
  useEffect(() => {
    if (profile) localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_diet_profile'), JSON.stringify(profile));
  }, [profile]);
  useEffect(() => {
    try {
      localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_food_logs'), JSON.stringify(foodLogs));
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        const dates = Object.keys(foodLogs).sort();
        const dropCount = Math.max(1, Math.floor(dates.length * 0.2));
        const datesToKeep = dates.slice(dropCount);
        const newLogs: Record<string, any[]> = {};
        datesToKeep.forEach(date => newLogs[date] = foodLogs[date]);
        try {
          localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_food_logs'), JSON.stringify(newLogs));
        } catch (e2) {
          console.error('Storage full, unable to save food logs:', e2);
        }
      }
    }
  }, [foodLogs]);
  useEffect(() => {
    try { localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_hydration'), JSON.stringify(hydration)); } catch(e) {}
  }, [hydration]);
  useEffect(() => {
    if (mealPlan) localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_meal_plan'), JSON.stringify(mealPlan));
  }, [mealPlan]);
  useEffect(() => {
    if (advice) localStorage.setItem(getProfileKey().replace('hc_unified_profile', 'hc_diet_advice'), advice);
  }, [advice]);
  useEffect(() => {
    if (!profile) return;
    const dailyFood = foodLogs[currentDate] || [];
    recordHealthMemory({
      kind: 'diet', source: 'dietician', title: `Diet log: ${currentDate}`, occurredAt: new Date(`${currentDate}T12:00:00`).toISOString(),
      payload: { profile: { goal: profile.goal, targetCalories: profile.targetCalories, targetProtein: profile.targetProtein }, food: dailyFood, hydration: hydration || {}, mealPlan: mealPlan || null },
      dedupeKey: `diet-day:${currentDate}`,
    });
  }, [profile, foodLogs, hydration, mealPlan, currentDate]);

  // One compact, deduplicated recovery snapshot makes the user's structured
  // diet state available after browser/app reinstall without storing source
  // documents. Keep the log window bounded; individual day entries remain in
  // Health Memory as they are used.
  useEffect(() => {
    if (!profile) return;
    const dates = Object.keys(foodLogs).sort().slice(-180);
    const boundedLogs = dates.reduce<Record<string, any[]>>((result, date) => {
      result[date] = foodLogs[date];
      return result;
    }, {});
    recordHealthMemory({
      kind: 'diet', source: 'dietician', title: 'Diet workspace snapshot',
      occurredAt: new Date().toISOString(),
      payload: { state: { profile, foodLogs: boundedLogs, hydration, mealPlan, advice } },
      dedupeKey: 'diet-state-snapshot',
    });
  }, [profile, foodLogs, hydration, mealPlan, advice]);

  const adviceFetched = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Fetch advice if not present
  useEffect(() => {
    if (profile && !advice && !isFetchingAdvice && !adviceFetched.current) {
      adviceFetched.current = true;
      setIsFetchingAdvice(true);
      generateDieticianAdvice(profile).then((res) => {
        if (isMounted.current) {
          setAdvice(res);
          setIsFetchingAdvice(false);
        }
        addEvent('diet', 'dietician', 'Generated Dietician Advice', { advice: res });
      }).catch(err => {
        console.error('Failed to fetch advice:', err);
        if (isMounted.current) setIsFetchingAdvice(false);
      });
    }
  }, [profile, advice]);

  if (!profile) {
    return <OnboardingWizard onComplete={(p) => setProfile({ ...p, ...calculateTargets(p) })} />;
  }

  // Derived state for current day
  const todayLogs = foodLogs[currentDate] || [];
  const { consumedCalories, consumedProtein, consumedCarbs, consumedFat } = useMemo(() => {
    return {
      consumedCalories: todayLogs.reduce((sum, item) => sum + (item.calories || 0), 0),
      consumedProtein: todayLogs.reduce((sum, item) => sum + (item.protein || 0), 0),
      consumedCarbs: todayLogs.reduce((sum, item) => sum + (item.carbs || 0), 0),
      consumedFat: todayLogs.reduce((sum, item) => sum + (item.fat || 0), 0)
    };
  }, [todayLogs]);
  const waterGlasses = hydration[currentDate] || 0;

  const handleAddFood = async () => {
    if (isAnalyzingFood) return;
    if (!foodInput.trim()) return;
    setIsAnalyzingFood(true);
    try {
      const result = await analyzeFoodEntry(foodInput);
      if (result && result.items) {
        const updatedLogs = { ...foodLogs };
        updatedLogs[currentDate] = updatedLogs[currentDate] ? [...updatedLogs[currentDate]] : [];

        result.items.forEach((item) => {
          updatedLogs[currentDate].push({
            ...item,
            type: selectedMealType,
            id: Date.now() + Math.random(),
          });
        });
        if (isMounted.current) {
          setFoodLogs(updatedLogs);
          setIsLoggingFood(false);
          setFoodInput('');
        }

        addEvent('diet', 'dietician', `Logged Food: ${result.items.map((i) => i.name).join(', ')}`, {
          items: result.items,
          type: selectedMealType,
        });
      }
    } catch (err) {
      console.error('Failed to analyze food:', err);
      alert('Failed to analyze food entry. Please try again.');
    } finally {
      if (isMounted.current) setIsAnalyzingFood(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (isGeneratingPlan) return;
      if (!(await getActiveSession())) {
        window.dispatchEvent(new CustomEvent('hc_require_auth', { 
          detail: { 
            title: 'Authentication Required', 
            message: 'You need to log in or sign up to generate a personalized meal plan.' 
          } 
        }));
        return;
      }
    setIsGeneratingPlan(true);
    try {
      const plan = await generateMealPlan(profile, 7);
      if (plan) {
        if (isMounted.current) setMealPlan(plan);
        addEvent('diet', 'dietician', 'Generated 7-Day Meal Plan', { plan });
      }
    } catch (err) {
      console.error('Failed to generate meal plan:', err);
      alert('Failed to generate meal plan. Please try again.');
    } finally {
      if (isMounted.current) setIsGeneratingPlan(false);
    }
  };

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-lg)',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFF',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.25)',
              }}
            >
              <Apple size={28} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: isMobile ? '24px' : '32px',
                  fontWeight: 800,
                  color: '#0F172A',
                  margin: '0 0 4px 0',
                  letterSpacing: '-1px',
                }}
              >
                AI Dietician
              </h1>
              <p style={{ fontSize: '15px', color: '#64748B', margin: 0, fontWeight: 500 }}>
                Precision nutrition powered by your medical profile.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '6px',
              background: '#FFFFFF',
              padding: '6px',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
            }}
          >
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'dashboard' ? '#F8FAFC' : 'transparent',
                color: activeTab === 'dashboard' ? '#0F172A' : '#64748B',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'dashboard' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('mealplan')}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'mealplan' ? '#F8FAFC' : 'transparent',
                color: activeTab === 'mealplan' ? '#0F172A' : '#64748B',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'mealplan' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
              }}
            >
              Meal Planner
            </button>
            <div style={{ width: '1px', height: '24px', background: '#E2E8F0', margin: '8px' }} />
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to reset your diet profile?')) {
                  localStorage.removeItem(getProfileKey().replace('hc_unified_profile', 'hc_diet_profile'));
                  localStorage.removeItem(getProfileKey().replace('hc_unified_profile', 'hc_meal_plan'));
                  localStorage.removeItem(getProfileKey().replace('hc_unified_profile', 'hc_diet_advice'));
                  localStorage.removeItem(getProfileKey().replace('hc_unified_profile', 'hc_food_logs'));
                  localStorage.removeItem(getProfileKey().replace('hc_unified_profile', 'hc_hydration'));
                  setProfile(null);
                  setAdvice(null);
                  setMealPlan(null);
                  setFoodLogs({});
                  setHydration({ glasses: 0, goal: 8 });
                }
              }}
              style={{
                padding: '10px',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
              }}
              title="Reset Profile"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Date Selector */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '16px' }}>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() - 1);
                    setCurrentDate(d.toISOString().split('T')[0]);
                  }}
                  style={{
                    padding: '10px',
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '160px',
                  }}
                >
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {currentDate === new Date().toISOString().split('T')[0]
                      ? 'Today'
                      : new Date(currentDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                  </h2>
                  <span
                    style={{
                      fontSize: '12px',
                      color: '#64748B',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                    }}
                  >
                    Daily Summary
                  </span>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setDate(d.getDate() + 1);
                    setCurrentDate(d.toISOString().split('T')[0]);
                  }}
                  style={{
                    padding: '10px',
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <button
                onClick={() => setIsLoggingFood(true)}
                style={{
                  background: '#10B981',
                  color: '#FFF',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 700,
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                  transition: 'transform 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
              >
                <Plus size={18} /> Log Food
              </button>
            </div>

            <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1.2fr 2fr', gap: '20px' }}>
              {/* Left Col: Macros & Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Beautiful Calorie Ring Card */}
                <div
                  style={{
                    background: 'linear-gradient(145deg, #FFFFFF, #F8FAFC)',
                    borderRadius: '32px',
                    padding: isMobile ? '16px 12px' : '24px 20px',
                    border: '1px solid #F1F5F9',
                    textAlign: 'center',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.04)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Decorative blobs */}
                  <div
                    style={{
                      position: 'absolute',
                      top: -50,
                      right: -50,
                      width: 150,
                      height: 150,
                      background:
                        'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%)',
                      borderRadius: '50%',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -50,
                      left: -50,
                      width: 150,
                      height: 150,
                      background:
                        'radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)',
                      borderRadius: '50%',
                    }}
                  />

                  <div
                    style={{
                      position: 'relative',
                      width: '220px',
                      height: '220px',
                      margin: '0 auto 32px auto',
                      zIndex: 1,
                    }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: 'rotate(-90deg)',
                        filter: 'drop-shadow(0 4px 12px rgba(16,185,129,0.2))',
                      }}
                    >
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="6" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="6"
                        strokeDasharray="283"
                        strokeDashoffset={
                          283 - 283 * Math.min(consumedCalories / profile.targetCalories, 1)
                        }
                        strokeLinecap="round"
                        style={{
                          transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#34D399" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div
                      style={{
                        position: 'absolute',
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: isMobile ? '32px' : '42px',
                          fontWeight: 800,
                          color: '#0F172A',
                          lineHeight: 1,
                          letterSpacing: '-1px',
                        }}
                      >
                        {Math.max(profile.targetCalories - consumedCalories, 0)}
                      </span>
                      <span
                        style={{
                          fontSize: '14px',
                          color: '#64748B',
                          fontWeight: 700,
                          marginTop: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                        }}
                      >
                        kcal remaining
                      </span>
                    </div>
                  </div>

                  <div
                    style={{ display: 'flex', justifyContent: 'space-between', padding: '0 16px' }}
                  >
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px',
                        }}
                      >
                        Base Goal
                      </div>
                      <div style={{ color: '#0F172A', fontWeight: 800, fontSize: '18px' }}>
                        {profile.targetCalories}
                      </div>
                    </div>
                    <div style={{ width: '1px', background: '#E2E8F0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '4px',
                        }}
                      >
                        Food
                      </div>
                      <div style={{ color: '#10B981', fontWeight: 800, fontSize: '18px' }}>
                        {consumedCalories}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Macro Progress Bars */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '32px',
                    padding: '20px',
                    border: '1px solid #F1F5F9',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Target size={20} color="#6366F1" /> Macronutrients
                  </h3>
                  <div style={{ height: '220px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Protein (g)', Consumed: consumedProtein, Target: profile.targetProtein },
                          { name: 'Carbs (g)', Consumed: consumedCarbs, Target: profile.targetCarbs },
                          { name: 'Fat (g)', Consumed: consumedFat, Target: profile.targetFat },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                        <Tooltip
                          cursor={{ fill: '#F8FAFC' }}
                          contentStyle={{ borderRadius: 'var(--radius-lg)', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                        <Bar dataKey="Consumed" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Bar dataKey="Target" fill="#E2E8F0" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Right Col: Timeline & Advice */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* AI Advice Banner */}
                {advice && (
                  <div
                    style={{
                      background: 'linear-gradient(to right, #EEF2FF, #F5F3FF)',
                      borderRadius: '24px',
                      padding: '24px',
                      border: '1px solid #E0E7FF',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-lg)',
                        background: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#6366F1',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.1)',
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4
                        style={{
                          margin: '0 0 8px 0',
                          color: '#312E81',
                          fontSize: '16px',
                          fontWeight: 700,
                        }}
                      >
                        AI Clinical Insight
                      </h4>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '14px',
                          color: '#4F46E5',
                          lineHeight: 1.6,
                          fontWeight: 500,
                        }}
                      >
                        {advice}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hydration Tracker */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '32px',
                    padding: '20px',
                    border: '1px solid #F1F5F9',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '24px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Droplet size={20} color="#0EA5E9" /> Hydration
                    </h3>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0EA5E9' }}>
                      {waterGlasses} / 8 Glasses
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between' }}>
                    {[...Array(8)].map((_, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          const newHydration = { ...hydration };
                          newHydration[currentDate] =
                            (newHydration[currentDate] || 0) > i ? i : i + 1;
                          setHydration(newHydration);
                        }}
                        style={{
                          width: '40px',
                          height: '56px',
                          borderRadius: '20px',
                          border: 'none',
                          cursor: 'pointer',
                          background:
                            i < waterGlasses
                              ? 'linear-gradient(135deg, #38BDF8, #0284C7)'
                              : '#F1F5F9',
                          color: i < waterGlasses ? '#FFF' : '#CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow:
                            i < waterGlasses ? '0 4px 12px rgba(2, 132, 199, 0.3)' : 'none',
                          transition: 'background 0.3s',
                        }}
                      >
                        <Droplet size={20} fill={i < waterGlasses ? '#FFF' : 'none'} />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Logged Meals */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '32px',
                    padding: '20px',
                    border: '1px solid #F1F5F9',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.03)',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '24px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: '#0F172A',
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <Utensils size={20} color="#F59E0B" /> Food Log
                    </h3>
                  </div>

                  {todayLogs.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '40px 20px',
                        background: '#F8FAFC',
                        borderRadius: '24px',
                        border: '1px dashed #CBD5E1',
                      }}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#F1F5F9',
                          color: '#94A3B8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px auto',
                        }}
                      >
                        <Utensils size={24} />
                      </div>
                      <h4
                        style={{
                          color: '#334155',
                          fontSize: '15px',
                          fontWeight: 700,
                          margin: '0 0 8px 0',
                        }}
                      >
                        No meals logged today
                      </h4>
                      <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
                        Click "Log Food" to track your nutrition.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <AnimatePresence>
                        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((mealType) => {
                          const meals = todayLogs.filter((l) => l.type === mealType);
                          if (meals.length === 0) return null;
                          return (
                            <motion.div
                              key={mealType}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <h4
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 800,
                                  color: '#64748B',
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px',
                                  marginBottom: '12px',
                                }}
                              >
                                {mealType}
                              </h4>
                              <div
                                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                              >
                                {meals.map((item) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '16px 20px',
                                      background: '#F8FAFC',
                                      borderRadius: 'var(--radius-lg)',
                                      border: '1px solid #F1F5F9',
                                      transition: 'all 0.2s',
                                      cursor: 'default',
                                    }}
                                    onMouseEnter={(e) =>
                                      (e.currentTarget.style.background = '#F1F5F9')
                                    }
                                    onMouseLeave={(e) =>
                                      (e.currentTarget.style.background = '#F8FAFC')
                                    }
                                  >
                                    <div
                                      style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
                                    >
                                      <div
                                        style={{
                                          width: '40px',
                                          height: '40px',
                                          borderRadius: 'var(--radius-lg)',
                                          background: '#FFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '20px',
                                          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                        }}
                                      >
                                        {item.emoji || '🍽️'}
                                      </div>
                                      <div>
                                        <div
                                          style={{
                                            fontWeight: 700,
                                            color: '#0F172A',
                                            fontSize: '15px',
                                          }}
                                        >
                                          {item.name}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: '12px',
                                            color: '#64748B',
                                            fontWeight: 500,
                                            marginTop: '2px',
                                          }}
                                        >
                                          {item.portion}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <div
                                        style={{
                                          fontWeight: 800,
                                          color: '#10B981',
                                          fontSize: '16px',
                                        }}
                                      >
                                        {item.calories}{' '}
                                        <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                                          kcal
                                        </span>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: '12px',
                                          color: '#64748B',
                                          fontWeight: 500,
                                          marginTop: '2px',
                                          display: 'flex',
                                          gap: '8px',
                                        }}
                                      >
                                        <span>P: {item.protein}g</span>
                                        <span>C: {item.carbs}g</span>
                                        <span>F: {item.fat}g</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Meal Planner Tab */}
        {activeTab === 'mealplan' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '20px',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 8px 0',
                  }}
                >
                  Your AI Meal Plan
                </h2>
                <p style={{ color: '#64748B', margin: 0, fontSize: '15px' }}>
                  Generated specifically for your goals, medical conditions, and preferences.
                </p>
              </div>
              <button
                onClick={handleGeneratePlan}
                disabled={isGeneratingPlan}
                style={{
                  background: '#0F172A',
                  color: '#FFF',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-lg)',
                  fontWeight: 700,
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: isGeneratingPlan ? 'not-allowed' : 'pointer',
                  opacity: isGeneratingPlan ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                }}
              >
                {isGeneratingPlan ? (
                  <>
                    <Loader2 size={16} className="spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Regenerate Plan
                  </>
                )}
              </button>
            </div>

            {!mealPlan ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '80px 20px',
                  background: '#FFFFFF',
                  borderRadius: '32px',
                  border: '1px solid #F1F5F9',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#F8FAFC',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px auto',
                  }}
                >
                  <Calendar size={40} />
                </div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 12px 0',
                  }}
                >
                  No Meal Plan Generated
                </h3>
                <p
                  style={{
                    color: '#64748B',
                    fontSize: '15px',
                    maxWidth: '400px',
                    margin: '0 auto 32px auto',
                    lineHeight: 1.6,
                  }}
                >
                  Click generate to create a custom 7-day meal plan based on your unified medical
                  profile.
                </p>
                <button
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  style={{
                    background: '#10B981',
                    color: '#FFF',
                    border: 'none',
                    padding: '16px 32px',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 800,
                    fontSize: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: isGeneratingPlan ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 size={20} className="spin" /> Building Perfect Plan...
                    </>
                  ) : (
                    'Generate 7-Day Plan'
                  )}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {mealPlan.days.map((day, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '32px',
                      padding: isMobile ? '20px' : '40px',
                      border: '1px solid #F1F5F9',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        borderBottom: '1px solid #F1F5F9',
                        paddingBottom: '24px',
                      }}
                    >
                      <h3
                        style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                      >
                        Day {day.day}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '16px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#64748B',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Flame size={16} color="#F59E0B" /> {day.totalCalories} kcal
                        </span>
                        <span style={{ color: '#F43F5E' }}>P: {day.totalProtein}g</span>
                        <span style={{ color: '#3B82F6' }}>C: {day.totalCarbs}g</span>
                        <span style={{ color: '#F59E0B' }}>F: {day.totalFat}g</span>
                        <button
                          onClick={() => {
                            addNutritionLog({
                              type: 'meal_plan_day',
                              calories: day.totalCalories,
                              protein: day.totalProtein,
                              carbs: day.totalCarbs,
                              fat: day.totalFat,
                              description: `Logged Day ${day.day} from Meal Plan`,
                              dayNumber: day.day
                            });
                            alert(`Day ${day.day} meals logged to Nutrition Tracker!`);
                          }}
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#0F172A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={14} /> Log to Tracker
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {day.meals.map((meal, i) => (
                        <div
                          key={i}
                          style={{
                            background: '#F8FAFC',
                            borderRadius: '24px',
                            padding: '24px',
                            border: '1px solid #E2E8F0',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              bottom: 0,
                              width: '4px',
                              background:
                                i === 0
                                  ? '#F59E0B'
                                  : i === 1
                                    ? '#3B82F6'
                                    : i === 2
                                      ? '#6366F1'
                                      : '#10B981',
                            }}
                          />
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#64748B',
                              textTransform: 'uppercase',
                              letterSpacing: '1px',
                              marginBottom: '8px',
                            }}
                          >
                            {meal.type}
                          </div>
                          <h4
                            style={{
                              fontSize: '16px',
                              fontWeight: 700,
                              color: '#0F172A',
                              margin: '0 0 12px 0',
                              lineHeight: 1.4,
                            }}
                          >
                            {meal.name}
                          </h4>
                          <p
                            style={{
                              fontSize: '14px',
                              color: '#475569',
                              margin: '0 0 16px 0',
                              lineHeight: 1.5,
                            }}
                          >
                            {meal.description}
                          </p>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '13px',
                              fontWeight: 600,
                            }}
                          >
                            <span
                              style={{
                                color: '#10B981',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Flame size={14} /> {meal.calories} kcal
                            </span>
                            <span style={{ color: '#94A3B8' }}>
                              P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Floating Food Logger Modal */}
        <AnimatePresence>
          {isLoggingFood && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
            >
              <FocusTrap isActive={isLoggingFood}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(15, 23, 42, 0.4)',
                  backdropFilter: 'blur(8px)',
                }}
                onClick={() => setIsLoggingFood(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '32px',
                  padding: '24px',
                  width: '100%',
                  maxWidth: '600px',
                  position: 'relative',
                  zIndex: 1001,
                  boxShadow: '0 24px 48px rgba(0,0,0,0.1)',
                }}
              >
                <button
                  onClick={() => setIsLoggingFood(false)}
                  style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: '#F1F5F9',
                    border: 'none',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#64748B',
                    cursor: 'pointer',
                  }}
                >
                  <X size={18} />
                </button>

                <h3
                  style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 8px 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-lg)',
                      background: '#DCFCE7',
                      color: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Utensils size={20} />
                  </div>
                  Log Food
                </h3>
                <p style={{ color: '#64748B', fontSize: '15px', marginBottom: '20px' }}>
                  Type what you ate in natural language. Our AI will analyze the portions and
                  macros.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
                  {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedMealType(type)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-lg)',
                        border: `1px solid ${selectedMealType === type ? '#10B981' : '#E2E8F0'}`,
                        background: selectedMealType === type ? '#ECFDF5' : '#FFFFFF',
                        color: selectedMealType === type ? '#059669' : '#64748B',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <textarea
                    value={foodInput}
                    onChange={(e) => setFoodInput(e.target.value)}
                    placeholder="e.g. I had two slices of whole wheat toast with half an avocado and two scrambled eggs..."
                    style={{
                      width: '100%',
                      height: '140px',
                      padding: '20px',
                      borderRadius: '20px',
                      border: '1px solid #E2E8F0',
                      background: '#F8FAFC',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                      outline: 'none',
                      resize: 'none',
                      color: '#0F172A',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      right: '16px',
                      color: '#94A3B8',
                    }}
                  >
                    <Sparkles size={20} />
                  </div>
                </div>

                <button
                  onClick={handleAddFood}
                  disabled={isAnalyzingFood || !foodInput.trim()}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: '#0F172A',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    fontWeight: 800,
                    fontSize: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    cursor: isAnalyzingFood || !foodInput.trim() ? 'not-allowed' : 'pointer',
                    opacity: isAnalyzingFood || !foodInput.trim() ? 0.7 : 1,
                    transition: 'all 0.2s',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.2)',
                  }}
                >
                  {isAnalyzingFood ? (
                    <>
                      <Loader2 size={20} className="spin" /> Analyzing Nutrition...
                    </>
                  ) : (
                    'Log Entry'
                  )}
                </button>
              </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
