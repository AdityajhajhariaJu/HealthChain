import React, { useState, useEffect, useRef, useMemo } from 'react';

export function formatLocalDate(date: Date): string {
  const validDate = (date instanceof Date && !Number.isNaN(date.getTime())) ? date : new Date();
  const year = validDate.getFullYear();
  const month = String(validDate.getMonth() + 1).padStart(2, '0');
  const day = String(validDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(dateStr?: string): Date {
  if (!dateStr || typeof dateStr !== 'string' || !dateStr.includes('-')) {
    return new Date();
  }
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || Number.isNaN(parts[0]) || Number.isNaN(parts[1]) || Number.isNaN(parts[2])) {
    return new Date();
  }
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, 12, 0, 0); 
}

export function shiftDateString(dateStr: string, deltaDays: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + (Number.isNaN(deltaDays) ? 0 : deltaDays));
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
  ShoppingCart,
  ShieldCheck,
  Printer,
  Trash2,
  Copy,
  Check,
  Info,
  Heart,
  Zap,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  analyzeFoodEntry,
  generateMealPlan,
  generateDieticianAdvice,
} from '../../services/geminiService';
import { addEvent, addNutritionLog, getProfileKey, getProfile as getCoreProfile, updateProfileFeatureData } from '../../services/ProfileEngine';
import { getLatestHealthMemory, recordHealthMemory, syncHealthMemoryFromSupabase } from '../../services/HealthMemory';
import { OnboardingWizard } from './DieticianComponents';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getActiveSession } from '../../services/authSession';
import FocusTrap from '../../components/ui/FocusTrap';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { canUseTrial, recordTrialUsage, openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';

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

export const QUICK_PRESETS = [
  { name: 'Steel-Cut Oats with Almonds & Berries', portion: '1 bowl (250g)', calories: 340, protein: 14, carbs: 52, fat: 8, emoji: '🥣', type: 'Breakfast' },
  { name: 'Dal Tadka + 2 Whole Wheat Rotis + Salad', portion: '1 plate', calories: 450, protein: 18, carbs: 68, fat: 12, emoji: '🥗', type: 'Lunch' },
  { name: 'Grilled Paneer / Chicken Tikka Quinoa Bowl', portion: '1 bowl (300g)', calories: 430, protein: 32, carbs: 30, fat: 18, emoji: '🍗', type: 'Lunch' },
  { name: 'Sourdough Avocado Toast with 2 Poached Eggs', portion: '2 slices', calories: 380, protein: 20, carbs: 28, fat: 22, emoji: '🥑', type: 'Breakfast' },
  { name: 'Moong Dal Khichdi + Desi Ghee & Curd', portion: '1 bowl', calories: 360, protein: 15, carbs: 54, fat: 10, emoji: '🍲', type: 'Dinner' },
  { name: 'Whey Protein Isolate & Supergreens Shake', portion: '1 scoop (350ml)', calories: 220, protein: 28, carbs: 18, fat: 4, emoji: '🥤', type: 'Snack' },
];

export const DEFAULT_GROCERY_CATEGORIES = [
  {
    category: 'Fresh Produce & Antioxidant Greens',
    emoji: '🥬',
    items: [
      { id: 'gp1', name: 'Baby Spinach / Palak (500g)', checked: false },
      { id: 'gp2', name: 'English Cucumbers & Tomatoes (1kg)', checked: false },
      { id: 'gp3', name: 'Avocados or Hass Pears (3 pcs)', checked: false },
      { id: 'gp4', name: 'Fresh Lemons & Mint Leaves', checked: false },
      { id: 'gp5', name: 'Bell Peppers / Shimla Mirch (Tri-color)', checked: false },
      { id: 'gp6', name: 'Fresh Ginger Root & Garlic bulbs', checked: false },
    ]
  },
  {
    category: 'Whole Grains & Complex Legumes',
    emoji: '🌾',
    items: [
      { id: 'gg1', name: 'Organic Yellow Moong Dal (1kg)', checked: false },
      { id: 'gg2', name: 'Rolled Steel-Cut Oats (1kg)', checked: false },
      { id: 'gg3', name: 'Organic White / Tricolor Quinoa (500g)', checked: false },
      { id: 'gg4', name: 'Whole Wheat / Multigrain Atta', checked: false },
      { id: 'gg5', name: 'Brown Basmati Rice / Millets', checked: false },
    ]
  },
  {
    category: 'Clean Proteins & Probiotics',
    emoji: '🥚',
    items: [
      { id: 'gpr1', name: 'Fresh Low-Fat Paneer / Organic Tofu (400g)', checked: false },
      { id: 'gpr2', name: 'Free-Range Eggs (Pack of 12)', checked: false },
      { id: 'gpr3', name: 'Probiotic Set Greek Dahi / Curd (800g)', checked: false },
      { id: 'gpr4', name: 'Whey Protein Isolate or Plant Blend', checked: false },
    ]
  },
  {
    category: 'Cold-Pressed Fats, Seeds & Spices',
    emoji: '🫒',
    items: [
      { id: 'gf1', name: 'Extra Virgin Cold-Pressed Olive Oil (500ml)', checked: false },
      { id: 'gf2', name: 'Raw California Almonds & Walnuts (250g)', checked: false },
      { id: 'gf3', name: 'Chia Seeds & Roasted Flaxseeds (200g)', checked: false },
      { id: 'gf4', name: 'Pure Desi Cow Ghee (A2)', checked: false },
      { id: 'gf5', name: 'Organic Haldi (Turmeric) & Cumin (Jeera)', checked: false },
      { id: 'gf6', name: 'Himalayan Pink Mineral Salt', checked: false },
    ]
  }
];

function calculateTargets(p: any) {
  const safeWeight = (!p?.weight || Number.isNaN(parseFloat(p.weight))) ? 70 : Math.max(20, parseFloat(p.weight));
  const safeHeight = (!p?.height || Number.isNaN(parseFloat(p.height))) ? 170 : Math.max(50, parseFloat(p.height));
  const safeAge = (!p?.age || Number.isNaN(parseInt(p.age, 10))) ? 30 : Math.max(1, parseInt(p.age, 10));

  let bmr = 10 * safeWeight + 6.25 * safeHeight - 5 * safeAge;
  bmr = p?.gender === 'female' ? bmr - 161 : bmr + 5;

  let multiplier = 1.2;
  if (p?.activityLevel === 'light') multiplier = 1.375;
  if (p?.activityLevel === 'moderate') multiplier = 1.55;
  if (p?.activityLevel === 'active') multiplier = 1.725;

  let tdee = bmr * multiplier;
  let targetCalories = Math.round(tdee);

  const targetDays = parseInt(p?.targetDays, 10);
  if (!Number.isNaN(targetDays) && targetDays > 0 && p?.goal !== 'Maintain') {
    const targetWeight = (!p?.targetWeight || Number.isNaN(parseFloat(p.targetWeight))) ? 65 : parseFloat(p.targetWeight);
    const weightDiff = Math.abs(safeWeight - targetWeight);
    const totalCalorieChange = weightDiff * 7700; // ~7700 kcal per kg
    const dailyChange = totalCalorieChange / targetDays;
    const safeDailyChange = Math.min(dailyChange, 1000);

    if (p?.goal === 'Lose weight') targetCalories = Math.round(tdee - safeDailyChange);
    if (p?.goal === 'Gain muscle') targetCalories = Math.round(tdee + safeDailyChange);
  } else {
    if (p?.goal === 'Lose weight') targetCalories -= 500;
    if (p?.goal === 'Gain muscle') targetCalories += 500;
  }

  // Safe floor
  targetCalories = Math.max(1200, Number.isNaN(targetCalories) ? 2000 : targetCalories);

  // Practical split: 25% Protein, 45% Carbs, 30% Fat
  const targetProtein = Math.round((targetCalories * 0.25) / 4);
  const targetCarbs = Math.round((targetCalories * 0.45) / 4);
  const targetFat = Math.round((targetCalories * 0.3) / 9);

  return { targetCalories, targetProtein, targetCarbs, targetFat };
}

// --- Main Component ---
export default function Dietician() {
  const isMobile = useIsMobile();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mealplan' | 'grocery' | 'guardrails'>('dashboard');
  const [profile, setProfile] = useState<any>(null);
  const [foodLogs, setFoodLogs] = useState<any>({});
  const [hydration, setHydration] = useState<any>({});
  const [mealPlan, setMealPlan] = useState<any>(null);
  const [advice, setAdvice] = useState<any>(null);
  const [isFetchingAdvice, setIsFetchingAdvice] = useState(false);
  const [groceryList, setGroceryList] = useState<any[]>(DEFAULT_GROCERY_CATEGORIES);
  const [copiedGrocery, setCopiedGrocery] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(1);

  const [currentDate, setCurrentDate] = useState(formatLocalDate(new Date()));
  const [isLoggingFood, setIsLoggingFood] = useState(false);
  const [foodInput, setFoodInput] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showResetDietConfirm, setShowResetDietConfirm] = useState(false);

  // Hydrate diet state
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const coreProfile = getCoreProfile();
        if (coreProfile?.dietician) {
          const { profile: p, foodLogs: fl, hydration: h, mealPlan: mp, advice: a, groceryList: gl } = coreProfile.dietician;
          if (p) setProfile({ ...p, ...calculateTargets(p) });
          if (fl) setFoodLogs(fl);
          if (h) setHydration(h);
          if (mp) setMealPlan(mp);
          if (a) setAdvice(a);
          if (gl) setGroceryList(gl);
          return;
        }
        const profileKey = getProfileKey();
        const savedProfile = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile'));
        const savedLogs = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_food_logs'));
        const savedHydration = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_hydration'));
        const savedPlan = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_meal_plan'));
        const savedAdvice = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_advice'));
        const savedGrocery = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_grocery_list'));

        if (savedProfile) {
          try {
            const parsed = JSON.parse(savedProfile);
            setProfile({ ...parsed, ...calculateTargets(parsed) });
          } catch (e) {
            console.warn('Corrupt savedProfile in diet', e);
          }
        }
        if (savedLogs) {
          try { setFoodLogs(JSON.parse(savedLogs)); } catch (e) {}
        }
        if (savedHydration) {
          try { setHydration(JSON.parse(savedHydration)); } catch (e) {}
        }
        if (savedPlan) {
          try { setMealPlan(JSON.parse(savedPlan)); } catch (e) {}
        }
        if (savedAdvice) setAdvice(savedAdvice);
        if (savedGrocery) {
          try { setGroceryList(JSON.parse(savedGrocery)); } catch (e) {}
        }

        await syncHealthMemoryFromSupabase();
        if (cancelled || savedProfile || savedLogs || savedHydration || savedPlan || savedAdvice) return;
        const snapshot = getLatestHealthMemory('diet', 'dietician')?.payload?.state;
        if (!snapshot) return;
        if (snapshot.profile) setProfile({ ...snapshot.profile, ...calculateTargets(snapshot.profile) });
        if (snapshot.foodLogs) setFoodLogs(snapshot.foodLogs);
        if (snapshot.hydration) setHydration(snapshot.hydration);
        if (snapshot.mealPlan) setMealPlan(snapshot.mealPlan);
        if (snapshot.advice) setAdvice(snapshot.advice);
        if (snapshot.groceryList) setGroceryList(snapshot.groceryList);
      } catch (e) {
        console.error('Failed to restore diet state:', e);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  // Save state to local storage when it changes
  useEffect(() => {
    try {
      const data = { profile, foodLogs, hydration, mealPlan, advice, groceryList };
      updateProfileFeatureData('dietician', data);
      
      const pKey = getProfileKey();
      if (profile) localStorage.setItem(pKey.replace('hc_unified_profile', 'hc_diet_profile'), JSON.stringify(profile));
      localStorage.setItem(pKey.replace('hc_unified_profile', 'hc_food_logs'), JSON.stringify(foodLogs));
      localStorage.setItem(pKey.replace('hc_unified_profile', 'hc_hydration'), JSON.stringify(hydration));
      if (mealPlan) localStorage.setItem(pKey.replace('hc_unified_profile', 'hc_meal_plan'), JSON.stringify(mealPlan));
      if (advice) localStorage.setItem(pKey.replace('hc_unified_profile', 'hc_diet_advice'), advice);
      if (groceryList) localStorage.setItem(pKey.replace('hc_unified_profile', 'hc_grocery_list'), JSON.stringify(groceryList));
    } catch(e) {}
  }, [profile, foodLogs, hydration, mealPlan, advice, groceryList]);

  // Record Health Memory snapshots
  useEffect(() => {
    if (!profile) return;
    const dailyFood = foodLogs[currentDate] || [];
    recordHealthMemory({
      kind: 'diet', source: 'dietician', title: `Diet log: ${currentDate}`, occurredAt: new Date(`${currentDate}T12:00:00`).toISOString(),
      payload: { profile: { goal: profile.goal, targetCalories: profile.targetCalories, targetProtein: profile.targetProtein }, food: dailyFood, hydration: hydration || {}, mealPlan: mealPlan || null },
      dedupeKey: `diet-day:${currentDate}`,
    });
  }, [profile, foodLogs, hydration, mealPlan, currentDate]);

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

  // Derived state for current day
  const todayLogs = foodLogs[currentDate] || [];
  const { consumedCalories, consumedProtein, consumedCarbs, consumedFat } = useMemo(() => {
    return {
      consumedCalories: todayLogs.reduce((sum: number, item: any) => sum + (item.calories || 0), 0),
      consumedProtein: todayLogs.reduce((sum: number, item: any) => sum + (item.protein || 0), 0),
      consumedCarbs: todayLogs.reduce((sum: number, item: any) => sum + (item.carbs || 0), 0),
      consumedFat: todayLogs.reduce((sum: number, item: any) => sum + (item.fat || 0), 0)
    };
  }, [todayLogs]);

  if (!profile) {
    return <OnboardingWizard onComplete={(p) => setProfile({ ...p, ...calculateTargets(p) })} />;
  }

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

        result.items.forEach((item: any) => {
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
          triggerHapticSuccess();
          awardPoints(2, '🍏 Logged Food in Clinical Dietician', 'lifestyle', `diet_log_${currentDate}`);
        }

        addEvent('diet', 'dietician', `Logged Food: ${result.items.map((i: any) => i.name).join(', ')}`, {
          items: result.items,
          type: selectedMealType,
        });
      }
    } catch (err) {
      console.error('Failed to analyze food:', err);
      toast.error('Analysis Failed', 'Failed to analyze food entry. Please try again.');
    } finally {
      if (isMounted.current) setIsAnalyzingFood(false);
    }
  };

  const handleAddPreset = (preset: typeof QUICK_PRESETS[0]) => {
    triggerHapticLight();
    const updatedLogs = { ...foodLogs };
    updatedLogs[currentDate] = updatedLogs[currentDate] ? [...updatedLogs[currentDate]] : [];
    updatedLogs[currentDate].push({
      name: preset.name,
      portion: preset.portion,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      emoji: preset.emoji,
      type: preset.type,
      id: Date.now() + Math.random(),
    });
    setFoodLogs(updatedLogs);
    setIsLoggingFood(false);
    awardPoints(2, '🍏 Logged Food in Clinical Dietician', 'lifestyle', `diet_log_${currentDate}`);
  };

  const handleDeleteFood = (id: number) => {
    triggerHapticLight();
    const updatedLogs = { ...foodLogs };
    if (updatedLogs[currentDate]) {
      updatedLogs[currentDate] = updatedLogs[currentDate].filter((item: any) => item.id !== id);
      setFoodLogs(updatedLogs);
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

    if (!canUseTrial('dietician')) {
      openTrialModal('Clinical Dietician (1 Free Trial Meal Plan)');
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const plan = await generateMealPlan(profile, 7);
      if (plan) {
        if (isMounted.current) {
          setMealPlan(plan);
          awardPoints(3, '✨ Generated 7-Day Precision Meal Plan', 'lifestyle', `diet_plan_${Date.now()}`);
          triggerHapticSuccess();
          recordTrialUsage('dietician');
        }
        addEvent('diet', 'dietician', 'Generated 7-Day Meal Plan', { plan });
      }
    } catch (err) {
      console.error('Failed to generate meal plan:', err);
      toast.error('Generation Failed', 'Failed to generate meal plan. Please try again.');
    } finally {
      if (isMounted.current) setIsGeneratingPlan(false);
    }
  };

  const toggleGroceryItem = (catIndex: number, itemId: string) => {
    triggerHapticLight();
    const updated = [...groceryList];
    const cat = updated[catIndex];
    if (cat && cat.items) {
      cat.items = cat.items.map((item: any) => item.id === itemId ? { ...item, checked: !item.checked } : item);
      setGroceryList(updated);
    }
  };

  const copyGroceryListText = async () => {
    triggerHapticLight();
    let text = `🛒 HealthChain 7-Day Grocery List (${profile?.cuisine || 'Healthy'} Plan)\n\n`;
    groceryList.forEach(cat => {
      text += `${cat.emoji} ${cat.category}\n`;
      cat.items.forEach((item: any) => {
        text += `  ${item.checked ? '☑' : '☐'} ${item.name}\n`;
      });
      text += `\n`;
    });
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedGrocery(true);
      setTimeout(() => setCopiedGrocery(false), 2500);
    } catch (e) {
      console.warn('Failed to copy grocery list to clipboard:', e);
    }
  };

  const handlePrintDossier = () => {
    triggerHapticLight();
    window.print();
  };

  const normalizedPlanDays = mealPlan?.plan || mealPlan?.days || [];
  const currentSelectedDayObj = normalizedPlanDays.find((d: any) => (d.day || d.dayNumber) === selectedPlanDay) || normalizedPlanDays[0];

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1
                  style={{
                    fontSize: isMobile ? '24px' : '30px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: 0,
                    letterSpacing: '-0.8px',
                  }}
                >
                  AI Clinical Dietician
                </h1>
                <span
                  style={{
                    padding: '3px 8px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#059669',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Active
                </span>
              </div>
              <p style={{ fontSize: '14.5px', color: '#64748B', margin: '2px 0 0 0', fontWeight: 500 }}>
                Precision metabolic nutrition adapted to your conditions & biomarkers.
              </p>
            </div>
          </div>

          {/* Navigation Pill Bar */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              background: '#FFFFFF',
              padding: '4px 6px',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              overflowX: 'auto',
              width: isMobile ? '100%' : 'auto',
              maxWidth: '100%',
              flexWrap: 'nowrap',
              WebkitOverflowScrolling: 'touch',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'dashboard' ? '#0F172A' : 'transparent',
                color: activeTab === 'dashboard' ? '#FFFFFF' : '#64748B',
                fontWeight: 700,
                fontSize: isMobile ? '12.5px' : '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Target size={15} /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('mealplan')}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'mealplan' ? '#0F172A' : 'transparent',
                color: activeTab === 'mealplan' ? '#FFFFFF' : '#64748B',
                fontWeight: 700,
                fontSize: isMobile ? '12.5px' : '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Calendar size={15} /> 7-Day Plan
            </button>
            <button
              onClick={() => setActiveTab('grocery')}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'grocery' ? '#0F172A' : 'transparent',
                color: activeTab === 'grocery' ? '#FFFFFF' : '#64748B',
                fontWeight: 700,
                fontSize: isMobile ? '12.5px' : '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <ShoppingCart size={15} /> Grocery List
            </button>
            <button
              onClick={() => setActiveTab('guardrails')}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'guardrails' ? '#0F172A' : 'transparent',
                color: activeTab === 'guardrails' ? '#FFFFFF' : '#64748B',
                fontWeight: 700,
                fontSize: isMobile ? '12.5px' : '13px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={15} /> Guardrails
            </button>
            <div style={{ width: '1px', height: '22px', background: '#E2E8F0', margin: '6px 2px', flexShrink: 0 }} />
            <button
              onClick={() => setShowResetDietConfirm(true)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                flexShrink: 0,
              }}
              title="Reset Profile"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          >
            {/* Date Selector & Action */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'space-between' : 'flex-start', gap: '14px' }}>
                <button
                  onClick={() => {
                    const d = parseLocalDate(currentDate);
                    d.setDate(d.getDate() - 1);
                    setCurrentDate(formatLocalDate(d));
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronLeft size={18} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '160px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {currentDate === formatLocalDate(new Date())
                      ? 'Today'
                      : parseLocalDate(currentDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                  </h2>
                  <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Daily Nutrition Log
                  </span>
                </div>
                <button
                  onClick={() => {
                    const d = parseLocalDate(currentDate);
                    d.setDate(d.getDate() + 1);
                    setCurrentDate(formatLocalDate(d));
                  }}
                  style={{
                    padding: '8px 12px',
                    background: '#FFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setIsLoggingFood(true)}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFF',
                    border: 'none',
                    padding: '11px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    flex: isMobile ? 1 : 'unset',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={16} /> Log Meal / Snack
                </button>
              </div>
            </div>

            <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: isMobile ? 'column' : 'unset', gridTemplateColumns: isMobile ? 'unset' : '1.15fr 1.85fr', gap: '20px' }}>
              
              {/* Left Col: Macros & Calorie Ring */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Calorie Ring Card */}
                <div
                  style={{
                    background: 'linear-gradient(145deg, #FFFFFF, #F8FAFC)',
                    borderRadius: '24px',
                    padding: isMobile ? '20px 16px' : '24px 20px',
                    border: '1px solid #E2E8F0',
                    textAlign: 'center',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      width: '190px',
                      height: '190px',
                      margin: '0 auto 20px auto',
                      zIndex: 1,
                    }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      style={{
                        width: '100%',
                        height: '100%',
                        transform: 'rotate(-90deg)',
                        filter: 'drop-shadow(0 4px 10px rgba(16,185,129,0.2))',
                      }}
                    >
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#F1F5F9" strokeWidth="7" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="url(#dietGradient)"
                        strokeWidth="7"
                        strokeDasharray="283"
                        strokeDashoffset={
                          283 - 283 * Math.min(consumedCalories / (profile.targetCalories || 2000), 1)
                        }
                        strokeLinecap="round"
                        style={{
                          transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                      />
                      <defs>
                        <linearGradient id="dietGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#10B981" />
                          <stop offset="100%" stopColor="#059669" />
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
                          fontSize: isMobile ? '32px' : '38px',
                          fontWeight: 800,
                          color: '#0F172A',
                          lineHeight: 1,
                          letterSpacing: '-1px',
                        }}
                      >
                        {Math.max((profile.targetCalories || 2000) - consumedCalories, 0)}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          fontWeight: 700,
                          marginTop: '4px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.8px',
                        }}
                      >
                        kcal remaining
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 10px', background: '#F8FAFC', borderRadius: '16px', border: '1px solid #F1F5F9' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                        Daily Target
                      </div>
                      <div style={{ color: '#0F172A', fontWeight: 800, fontSize: '16px' }}>
                        {profile.targetCalories} kcal
                      </div>
                    </div>
                    <div style={{ width: '1px', background: '#E2E8F0' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px' }}>
                        Consumed
                      </div>
                      <div style={{ color: '#059669', fontWeight: 800, fontSize: '16px' }}>
                        {consumedCalories} kcal
                      </div>
                    </div>
                  </div>
                </div>

                {/* Macro Progress Chart */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: 800,
                      color: '#0F172A',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Target size={18} color="#6366F1" /> Macronutrient Balance
                  </h3>
                  <div style={{ height: '180px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Protein', Consumed: consumedProtein, Target: profile.targetProtein },
                          { name: 'Carbs', Consumed: consumedCarbs, Target: profile.targetCarbs },
                          { name: 'Fat', Consumed: consumedFat, Target: profile.targetFat },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                        <Tooltip
                          cursor={{ fill: '#F8FAFC' }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                        <Bar dataKey="Consumed" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                        <Bar dataKey="Target" fill="#E2E8F0" radius={[4, 4, 0, 0]} maxBarSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Condition-Aware Clinical Guardrail Badges */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={18} color="#059669" /> Active Guardrails
                    </h3>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '6px' }}>
                      Clinical Profile Safe
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(profile.medicalConditions || []).includes('Diabetes') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#FEF3C7', borderRadius: '10px', border: '1px solid #FDE68A' }}>
                        <span style={{ fontSize: '14px' }}>⚡</span>
                        <div style={{ fontSize: '12px', color: '#92400E', fontWeight: 600 }}>
                          <strong>Low GI Target (&lt; 55)</strong>: High viscous fiber &amp; low simple starch.
                        </div>
                      </div>
                    )}
                    {(profile.medicalConditions || []).includes('Hypertension') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#EFF6FF', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                        <span style={{ fontSize: '14px' }}>🧂</span>
                        <div style={{ fontSize: '12px', color: '#1E40AF', fontWeight: 600 }}>
                          <strong>Sodium Ceiling &lt; 2,000mg</strong>: Potassium-rich DASH mineral balance.
                        </div>
                      </div>
                    )}
                    {(profile.medicalConditions || []).includes('PCOS') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#FDF2F8', borderRadius: '10px', border: '1px solid #FBCFE8' }}>
                        <span style={{ fontSize: '14px' }}>🌸</span>
                        <div style={{ fontSize: '12px', color: '#9D174D', fontWeight: 600 }}>
                          <strong>Hormonal Anti-Inflammatory</strong>: Omega-3s, Inositol &amp; Zinc rich.
                        </div>
                      </div>
                    )}
                    {(profile.medicalConditions || []).includes('Thyroid') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#F5F3FF', borderRadius: '10px', border: '1px solid #DDD6FE' }}>
                        <span style={{ fontSize: '14px' }}>🦋</span>
                        <div style={{ fontSize: '12px', color: '#5B21B6', fontWeight: 600 }}>
                          <strong>Thyroid Micronutrients</strong>: Selenium, Iodine balance &amp; cooked cruciferous.
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: '14px' }}>🛡️</span>
                      <div style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                        <strong>Metabolic Lipids</strong>: Saturated fat &lt; 10% total calories.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Col: Advice, Hydration & Food Log */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* AI Advice Banner */}
                {advice && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #EFF6FF 0%, #EEF2FF 100%)',
                      borderRadius: '20px',
                      padding: '20px',
                      border: '1px solid #DBEAFE',
                      display: 'flex',
                      gap: '14px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563EB',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0', color: '#1E3A8A', fontSize: '15px', fontWeight: 800 }}>
                        AI Dietician Clinical Brief
                      </h4>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#1E40AF', lineHeight: 1.55, fontWeight: 500 }}>
                        {advice}
                      </p>
                    </div>
                  </div>
                )}

                {/* Hydration Tracker */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Droplet size={18} color="#0EA5E9" /> Cellular Hydration
                    </h3>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#0284C7' }}>
                      {waterGlasses} / 8 Glasses ({waterGlasses * 250} ml)
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between' }}>
                    {[...Array(8)].map((_, i) => (
                      <motion.button
                        key={i}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          triggerHapticLight();
                          const newHydration = { ...hydration };
                          newHydration[currentDate] = (newHydration[currentDate] || 0) > i ? i : i + 1;
                          setHydration(newHydration);
                        }}
                        style={{
                          width: '42px',
                          height: '52px',
                          borderRadius: '14px',
                          border: 'none',
                          cursor: 'pointer',
                          background:
                            i < waterGlasses
                              ? 'linear-gradient(135deg, #38BDF8 0%, #0284C7 100%)'
                              : '#F1F5F9',
                          color: i < waterGlasses ? '#FFF' : '#CBD5E1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: i < waterGlasses ? '0 4px 12px rgba(2, 132, 199, 0.25)' : 'none',
                          transition: 'all 0.2s',
                        }}
                        title={`Glass ${i + 1} (250ml)`}
                      >
                        <Droplet size={18} fill={i < waterGlasses ? '#FFF' : 'none'} />
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Logged Meals */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    flex: 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Utensils size={18} color="#F59E0B" /> Today's Meals ({todayLogs.length})
                    </h3>
                    {todayLogs.length > 0 && (
                      <button
                        onClick={() => setIsLoggingFood(true)}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#059669',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={13} /> Add
                      </button>
                    )}
                  </div>

                  {todayLogs.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '36px 16px',
                        background: '#F8FAFC',
                        borderRadius: '16px',
                        border: '1px dashed #CBD5E1',
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: '#F1F5F9',
                          color: '#94A3B8',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 12px auto',
                        }}
                      >
                        <Utensils size={20} />
                      </div>
                      <h4 style={{ color: '#334155', fontSize: '14.5px', fontWeight: 700, margin: '0 0 6px 0' }}>
                        No meals logged for this day
                      </h4>
                      <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 16px 0' }}>
                        Type what you ate in natural language or pick from quick presets.
                      </p>
                      <button
                        onClick={() => setIsLoggingFood(true)}
                        style={{
                          background: '#10B981',
                          color: '#FFF',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        + Log First Meal
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <AnimatePresence>
                        {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((mealType) => {
                          const meals = todayLogs.filter((l: any) => l.type === mealType);
                          if (meals.length === 0) return null;
                          return (
                            <motion.div key={mealType} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                              <h4
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 800,
                                  color: '#64748B',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.8px',
                                  marginBottom: '8px',
                                }}
                              >
                                {mealType}
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {meals.map((item: any) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '12px 16px',
                                      background: '#F8FAFC',
                                      borderRadius: '14px',
                                      border: '1px solid #F1F5F9',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div
                                        style={{
                                          width: '36px',
                                          height: '36px',
                                          borderRadius: '10px',
                                          background: '#FFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '18px',
                                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                        }}
                                      >
                                        {item.emoji || '🍽️'}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px' }}>
                                          {item.name}
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 500 }}>
                                          {item.portion || '1 serving'}
                                        </div>
                                      </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, color: '#059669', fontSize: '14.5px' }}>
                                          {item.calories} <span style={{ fontSize: '11px', color: '#94A3B8' }}>kcal</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                                          P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteFood(item.id)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#CBD5E1',
                                          cursor: 'pointer',
                                          padding: '4px',
                                          borderRadius: '6px',
                                        }}
                                        title="Delete Entry"
                                        onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                                        onMouseLeave={(e) => (e.currentTarget.style.color = '#CBD5E1')}
                                      >
                                        <Trash2 size={15} />
                                      </button>
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

        {/* TAB 2: 7-DAY MEAL PLAN */}
        {activeTab === 'mealplan' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                marginBottom: '20px',
                gap: '12px',
              }}
            >
              <div>
                <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  7-Day Precision Meal Plan
                </h2>
                <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                  Tailored for {profile.cuisine} cuisine, {profile.targetCalories} kcal target &amp; your medical guardrails.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {mealPlan && (
                  <button
                    onClick={handlePrintDossier}
                    style={{
                      background: '#FFFFFF',
                      color: '#334155',
                      border: '1px solid #CBD5E1',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    <Printer size={15} /> Print Dossier
                  </button>
                )}
                <button
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  style={{
                    background: '#0F172A',
                    color: '#FFF',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: isGeneratingPlan ? 'not-allowed' : 'pointer',
                    opacity: isGeneratingPlan ? 0.7 : 1,
                  }}
                >
                  {isGeneratingPlan ? (
                    <>
                      <Loader2 size={16} className="spin" /> Synthesizing Plan...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> {mealPlan ? 'Regenerate Plan' : 'Generate 7-Day Plan'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {!mealPlan ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px auto',
                  }}
                >
                  <Calendar size={32} />
                </div>
                <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>
                  No Active 7-Day Plan
                </h3>
                <p style={{ color: '#64748B', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
                  Generate an authentic, chef-grade nutritional schedule that balances your macros and guards against your health conditions.
                </p>
                <button
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFF',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '14px',
                    fontWeight: 800,
                    fontSize: '15px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: isGeneratingPlan ? 'not-allowed' : 'pointer',
                    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {isGeneratingPlan ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
                  Generate My 7-Day Plan
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Day selector tabs */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {normalizedPlanDays.map((day: any, idx: number) => {
                    const dayNum = day.day || idx + 1;
                    const isSelected = selectedPlanDay === dayNum;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          triggerHapticLight();
                          setSelectedPlanDay(dayNum);
                        }}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '12px',
                          border: `1px solid ${isSelected ? '#059669' : '#E2E8F0'}`,
                          background: isSelected ? '#ECFDF5' : '#FFFFFF',
                          color: isSelected ? '#065F46' : '#64748B',
                          fontWeight: 800,
                          fontSize: '13px',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                        }}
                      >
                        Day {dayNum}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day View */}
                {currentSelectedDayObj && (
                  <div
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      padding: isMobile ? '20px' : '28px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '20px',
                        borderBottom: '1px solid #F1F5F9',
                        paddingBottom: '16px',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Day {currentSelectedDayObj.day || selectedPlanDay} Nutritional Blueprint
                      </h3>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Flame size={15} color="#F59E0B" /> {currentSelectedDayObj.total_calories || currentSelectedDayObj.totalCalories || profile.targetCalories} kcal
                        </span>
                        
                        <button
                          onClick={() => {
                            triggerHapticSuccess();
                            const mealsToLog = currentSelectedDayObj.meals || [];
                            const updatedLogs = { ...foodLogs };
                            updatedLogs[currentDate] = updatedLogs[currentDate] ? [...updatedLogs[currentDate]] : [];
                            
                            mealsToLog.forEach((m: any) => {
                              updatedLogs[currentDate].push({
                                name: m.name,
                                portion: '1 serving',
                                calories: m.calories || 300,
                                protein: m.protein || 15,
                                carbs: m.carbs || 40,
                                fat: m.fat || 10,
                                emoji: '🍽️',
                                type: m.type || 'Meal',
                                id: Date.now() + Math.random(),
                              });
                            });
                            setFoodLogs(updatedLogs);
                            awardPoints(2, '🍏 Logged Full Meal Plan Day', 'lifestyle', `diet_day_${currentDate}`);
                            toast.success('Meals Logged', `Day ${currentSelectedDayObj.day || selectedPlanDay} meals added to today's food log!`);
                          }}
                          style={{
                            background: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#166534',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Plus size={13} /> Log Entire Day to Tracker
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                      {(currentSelectedDayObj.meals || []).map((meal: any, mIdx: number) => (
                        <div
                          key={mIdx}
                          style={{
                            background: '#F8FAFC',
                            borderRadius: '16px',
                            padding: '18px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: '#059669',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '6px',
                              }}
                            >
                              {meal.type}
                            </div>
                            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0', lineHeight: 1.4 }}>
                              {meal.name}
                            </h4>
                            {meal.description && (
                              <p style={{ fontSize: '12.5px', color: '#64748B', margin: '0 0 12px 0', lineHeight: 1.5 }}>
                                {meal.description}
                              </p>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 600 }}>
                            <span style={{ color: '#059669', fontWeight: 700 }}>
                              {meal.calories} kcal
                            </span>
                            <span style={{ color: '#94A3B8' }}>
                              P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: SMART GROCERY LIST */}
        {activeTab === 'grocery' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                flexDirection: isMobile ? 'column' : 'row',
                marginBottom: '20px',
                gap: '12px',
              }}
            >
              <div>
                <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  Smart Grocery Shopping List
                </h2>
                <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                  Categorized grocery checklist mapped to your 7-day meal plan. Check off items as you shop.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={copyGroceryListText}
                  style={{
                    background: '#0F172A',
                    color: '#FFF',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  {copiedGrocery ? <Check size={15} color="#34D399" /> : <Copy size={15} />}
                  {copiedGrocery ? 'Copied to Clipboard!' : 'Copy Shopping List'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
              {groceryList.map((cat, catIdx) => {
                const total = cat.items.length;
                const done = cat.items.filter((i: any) => i.checked).length;

                return (
                  <div
                    key={catIdx}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: '24px',
                      padding: '22px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ fontSize: '15.5px', fontWeight: 800, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{cat.emoji}</span> {cat.category}
                      </h3>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: done === total ? '#059669' : '#64748B' }}>
                        {done} / {total}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cat.items.map((item: any) => (
                        <div
                          key={item.id}
                          onClick={() => toggleGroceryItem(catIdx, item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            background: item.checked ? '#F8FAFC' : '#FFFFFF',
                            borderRadius: '12px',
                            border: `1px solid ${item.checked ? '#E2E8F0' : '#F1F5F9'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '6px',
                              border: `2px solid ${item.checked ? '#059669' : '#CBD5E1'}`,
                              background: item.checked ? '#059669' : '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#FFF',
                              flexShrink: 0,
                            }}
                          >
                            {item.checked && <Check size={14} strokeWidth={3} />}
                          </div>
                          <span
                            style={{
                              fontSize: '13.5px',
                              fontWeight: 600,
                              color: item.checked ? '#94A3B8' : '#1E293B',
                              textDecoration: item.checked ? 'line-through' : 'none',
                            }}
                          >
                            {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* TAB 4: CLINICAL GUARDRAILS */}
        {activeTab === 'guardrails' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                Nutritional Guardrails &amp; Bio-Compatibility Matrix
              </h2>
              <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                Autonomous clinical safety screening configured specifically to your medical profile.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
              {/* Card 1: Glycemic Index */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706' }}>
                    <Zap size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Glycemic Load &amp; Insulin Stability</h3>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>GI &lt; 55 Target Active</span>
                  </div>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  Restricts high-glycemic simple carbohydrates to prevent postprandial glucose spikes. Prioritizes resistant starches, legumes, and high-fiber grains.
                </p>
                <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', color: '#334155' }}>
                  <strong>Key Nutrients:</strong> Viscous beta-glucans, Fenugreek (Methi) seeds, Inositol.
                </div>
              </div>

              {/* Card 2: Cardiovascular & Sodium */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                    <Heart size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Cardio-Renal DASH Balance</h3>
                    <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 700 }}>Sodium &lt; 2,000mg Daily</span>
                  </div>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  Balances potassium-to-sodium ratio to reduce endothelial tension and support optimal blood pressure regulation.
                </p>
                <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', color: '#334155' }}>
                  <strong>Key Nutrients:</strong> Potassium citrate, Magnesium glycinate foods, Dark leafy greens.
                </div>
              </div>

              {/* Card 3: Anti-Inflammatory & Lipid Quality */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Polyphenol &amp; Lipid Optimization</h3>
                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>Omega-3 to Omega-6 Ratio &lt; 1:4</span>
                  </div>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  Eliminates industrial trans-fats and excessive omega-6 seed oils. Replaces them with cold-pressed extra virgin olive oil, ghee, and walnuts.
                </p>
                <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', color: '#334155' }}>
                  <strong>Key Nutrients:</strong> Curcumin + Piperine, Oleocanthal, Alpha-linolenic acid (ALA).
                </div>
              </div>

              {/* Card 4: Gut Microbiome & Probiotics */}
              <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Microbiome &amp; SCFA Production</h3>
                    <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 700 }}>30+ Plant Types / Week</span>
                  </div>
                </div>
                <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  Diversified prebiotic fibers feed commensal gut bacteria (Akkermansia, Bifidobacteria) to generate Short-Chain Fatty Acids (Butyrate) for intestinal mucosal integrity.
                </p>
                <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', color: '#334155' }}>
                  <strong>Key Nutrients:</strong> Set Probiotic Dahi, Fermented veggies, Prebiotic inulin.
                </div>
              </div>
            </div>
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
                    background: 'rgba(15, 23, 42, 0.5)',
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
                    borderRadius: '28px',
                    padding: isMobile ? '24px 18px' : '28px',
                    width: '100%',
                    maxWidth: '560px',
                    position: 'relative',
                    zIndex: 1001,
                    boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                  }}
                >
                  <button
                    onClick={() => setIsLoggingFood(false)}
                    style={{
                      position: 'absolute',
                      top: '20px',
                      right: '20px',
                      background: '#F1F5F9',
                      border: 'none',
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748B',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: '#DCFCE7',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Utensils size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Log Meal / Nutrition
                      </h3>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                        Powered by Gemini AI Precision Nutrition
                      </span>
                    </div>
                  </div>

                  {/* Meal type selection */}
                  <div style={{ display: 'flex', gap: '6px', margin: '18px 0 14px 0', flexWrap: 'wrap' }}>
                    {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedMealType(type)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '10px',
                          border: `1px solid ${selectedMealType === type ? '#059669' : '#E2E8F0'}`,
                          background: selectedMealType === type ? '#ECFDF5' : '#FFFFFF',
                          color: selectedMealType === type ? '#065F46' : '#64748B',
                          fontWeight: 700,
                          fontSize: '13px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {/* Quick Presets */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                      ⚡ 1-Tap Quick Nutritious Presets:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {QUICK_PRESETS.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          onClick={() => handleAddPreset(preset)}
                          style={{
                            padding: '6px 10px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            color: '#1E293B',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#ECFDF5')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        >
                          <span>{preset.emoji}</span> {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Natural Language Input */}
                  <div style={{ position: 'relative', marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                      Or type in plain English / Hindi:
                    </label>
                    <textarea
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value)}
                      placeholder="e.g. 2 whole wheat rotis with 1 bowl of moong dal, a small bowl of curd, and cucumber salad..."
                      style={{
                        width: '100%',
                        height: '110px',
                        padding: '14px',
                        borderRadius: '16px',
                        border: '1px solid #CBD5E1',
                        background: '#F8FAFC',
                        fontSize: '14.5px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        resize: 'none',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    onClick={handleAddFood}
                    disabled={isAnalyzingFood || !foodInput.trim()}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: '#0F172A',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '14px',
                      fontWeight: 800,
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: isAnalyzingFood || !foodInput.trim() ? 'not-allowed' : 'pointer',
                      opacity: isAnalyzingFood || !foodInput.trim() ? 0.7 : 1,
                    }}
                  >
                    {isAnalyzingFood ? (
                      <>
                        <Loader2 size={18} className="spin" /> Analyzing Nutritional Breakdown...
                      </>
                    ) : (
                      'Analyze & Log Meal (+2 PTS)'
                    )}
                  </button>
                </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Reset Diet Profile Confirmation Modal */}
        <AnimatePresence>
          {showResetDietConfirm && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}
              onClick={() => setShowResetDietConfirm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  padding: isMobile ? '24px 20px' : '32px 28px',
                  maxWidth: '440px',
                  width: '100%',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                  border: '1px solid #F1F5F9'
                }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  <Trash2 size={24} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#0F172A', fontWeight: 700 }}>
                  Reset Diet Profile & Plan?
                </h3>
                <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#64748B', lineHeight: 1.5 }}>
                  This will reset your personalized diet profile, active meal plans, grocery checklist, and food logs for this profile.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowResetDietConfirm(false)}
                    style={{ flex: 1, padding: '10px 16px', borderRadius: '12px' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const pKey = getProfileKey();
                      localStorage.removeItem(pKey.replace('hc_unified_profile', 'hc_diet_profile'));
                      localStorage.removeItem(pKey.replace('hc_unified_profile', 'hc_meal_plan'));
                      localStorage.removeItem(pKey.replace('hc_unified_profile', 'hc_diet_advice'));
                      localStorage.removeItem(pKey.replace('hc_unified_profile', 'hc_food_logs'));
                      localStorage.removeItem(pKey.replace('hc_unified_profile', 'hc_hydration'));
                      localStorage.removeItem(pKey.replace('hc_unified_profile', 'hc_grocery_list'));
                      setProfile(null);
                      setAdvice(null);
                      setMealPlan(null);
                      setFoodLogs({});
                      setHydration({});
                      setGroceryList(DEFAULT_GROCERY_CATEGORIES);
                      setShowResetDietConfirm(false);
                      toast.success('Diet Profile Reset', 'Your diet plan and profile targets have been reset.');
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: '#EF4444',
                      color: '#FFF',
                      border: 'none',
                      fontWeight: 650,
                      cursor: 'pointer'
                    }}
                  >
                    Reset Diet
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
