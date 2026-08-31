import { DieticianDashboardTracker } from './DieticianDashboardTracker';
import { ARGroceryLens } from '../../components/ui/ARGroceryLens';
import { Scan } from 'lucide-react';
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
  Activity,
  Brain,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  analyzeFoodEntry,
  generateMealPlan,
  generateDieticianAdvice,
  generateNutritionalGuardrails,
  generateGroceryList,
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
export const CUISINES = ['North Indian', 'South Indian', 'Mediterranean', 'Middle Eastern', 'Mexican', 'East Asian', 'Western', 'Keto', 'Any'];
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
  const [guardrails, setGuardrails] = useState<any[]>([]);
  const [isGeneratingGuardrails, setIsGeneratingGuardrails] = useState(false);

  const [isGeneratingGrocery, setIsGeneratingGrocery] = useState(false);


  const [advice, setAdvice] = useState<any>(null);
  const [isFetchingAdvice, setIsFetchingAdvice] = useState(false);
  const [groceryList, setGroceryList] = useState<any[]>(DEFAULT_GROCERY_CATEGORIES);
  const [copiedGrocery, setCopiedGrocery] = useState(false);
  const [selectedPlanDay, setSelectedPlanDay] = useState<number>(1);

  const [currentDate, setCurrentDate] = useState(formatLocalDate(new Date()));
  const [isLoggingFood, setIsLoggingFood] = useState(false);
  const [showARLens, setShowARLens] = useState(false);
  const [foodInput, setFoodInput] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('Breakfast');
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showResetDietConfirm, setShowResetDietConfirm] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

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
        const unified = getCoreProfile() || {};
          const profileKey = getProfileKey();
          
          if (localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile'))) {
             unified.dietProfile = JSON.parse(localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile')) || '{}');
             unified.dietFoodLogs = JSON.parse(localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_food_logs')) || '{}');
             unified.dietHydration = JSON.parse(localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_hydration')) || '{}');
             unified.dietMealPlan = JSON.parse(localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_meal_plan')) || '{}');
             unified.dietAdvice = localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_advice'));
             unified.dietGrocery = JSON.parse(localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_grocery_list')) || '{}');
             
             updateProfileFeatureData('dietProfile', unified.dietProfile);
             updateProfileFeatureData('dietFoodLogs', unified.dietFoodLogs);
             updateProfileFeatureData('dietHydration', unified.dietHydration);
             updateProfileFeatureData('dietMealPlan', unified.dietMealPlan);
             updateProfileFeatureData('dietAdvice', unified.dietAdvice);
             updateProfileFeatureData('dietGrocery', unified.dietGrocery);
             
             localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile'));
             localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_food_logs'));
             localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_hydration'));
             localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_meal_plan'));
             localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_diet_advice'));
             localStorage.removeItem(profileKey.replace('hc_unified_profile', 'hc_grocery_list'));
          }
  
          const savedProfile = unified.dietProfile ? JSON.stringify(unified.dietProfile) : null;
          const savedLogs = unified.dietFoodLogs ? JSON.stringify(unified.dietFoodLogs) : null;
          const savedHydration = unified.dietHydration ? JSON.stringify(unified.dietHydration) : null;
          const savedPlan = unified.dietMealPlan ? JSON.stringify(unified.dietMealPlan) : null;
          const savedAdvice = unified.dietAdvice || null;
          const savedGrocery = unified.dietGrocery ? JSON.stringify(unified.dietGrocery) : null;

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
    load().finally(() => setIsHydrated(true));
    return () => { cancelled = true; };
  }, []);

  // Save state to local storage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const data = { profile, foodLogs, hydration, mealPlan, advice, groceryList };
      updateProfileFeatureData('dietician', data);
      
      if (profile) updateProfileFeatureData('dietProfile', profile);
        updateProfileFeatureData('dietFoodLogs', foodLogs);
        updateProfileFeatureData('dietHydration', hydration);
        if (mealPlan) updateProfileFeatureData('dietMealPlan', mealPlan);
        if (advice) updateProfileFeatureData('dietAdvice', advice);
        if (groceryList) updateProfileFeatureData('dietGrocery', groceryList);
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

  // Dynamic Presets from Meal Plan
  const dynamicPresets = React.useMemo(() => {
    if (!mealPlan || !mealPlan.plan || mealPlan.plan.length === 0) return QUICK_PRESETS;
    
    // Extract up to 6 unique meals from the generated plan
    const meals: any[] = [];
    const seen = new Set();
    
    for (const day of mealPlan.plan) {
      if (!day.meals) continue;
      for (const meal of day.meals) {
        if (!seen.has(meal.name)) {
          seen.add(meal.name);
          meals.push({
            name: meal.name,
            portion: meal.portion || '1 serving',
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            emoji: '??',
            type: meal.type || 'Meal'
          });
        }
        if (meals.length >= 6) return meals;
      }
    }
    
    return meals.length > 0 ? meals : QUICK_PRESETS;
  }, [mealPlan]);

  if (!profile) {
    return <OnboardingWizard onComplete={(p) => {
      const fullProfile = { ...p, ...calculateTargets(p) };
      setProfile(fullProfile);
      
      // Persist to unified profile
      const unified = getCoreProfile() || {};
      unified.dietProfile = fullProfile;
      try {
        localStorage.setItem(getProfileKey(), JSON.stringify(unified));
      } catch (e) {}
    }} />;
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

  
  
  const handleGenerateGrocery = async () => {
    if (isGeneratingGrocery) return;
    if (!mealPlan) {
      toast.error('No Meal Plan', 'Please generate a 7-day meal plan first.');
      return;
    }
    setIsGeneratingGrocery(true);
    try {
      const data = await generateGroceryList(mealPlan);
      if (data && data.groceryList) {
        if (isMounted.current) setGroceryList(data.groceryList);
        updateProfileFeatureData('dietician', { groceryList: data.groceryList });
        awardPoints(2, '🛒 Smart List Created', 'lifestyle', `grocery_${Date.now()}`);
        triggerHapticSuccess();
      } else {
        toast.error('Generation Failed', 'Could not extract grocery list. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Failed to connect to AI matrix.');
    } finally {
      if (isMounted.current) setIsGeneratingGrocery(false);
    }
  };

  const handleGenerateGuardrails = async () => {
    if (isGeneratingGuardrails) return;
    setIsGeneratingGuardrails(true);
    try {
      const data = await generateNutritionalGuardrails(profile);
      if (data && data.guardrails) {
        if (isMounted.current) setGuardrails(data.guardrails);
        updateProfileFeatureData('dietician', { guardrails: data.guardrails });
        awardPoints(2, '🛡️ Shield Activated', 'lifestyle', `guardrails_${Date.now()}`);
        triggerHapticSuccess();
      } else {
        toast.error('Generation Failed', 'Could not synthesize medical guardrails. Please try again.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Failed to connect to AI matrix.');
    } finally {
      if (isMounted.current) setIsGeneratingGuardrails(false);
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
      } else {
        toast.error('Generation Failed', 'Failed to parse the meal plan from AI. Please try again.');
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
              overflowX: 'visible', width: isMobile ? '100%' : 'auto', maxWidth: '100%', flexWrap: 'wrap',
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

            
              <DieticianDashboardTracker 
                profile={profile} 
                foodLogs={foodLogs} 
                currentDate={currentDate}
                onLogMeal={(mealName) => { setSelectedMealType(mealName); setIsLoggingFood(true); }}
                onSnap={() => setShowARLens(true)}
                onOpenSettings={() => { triggerHapticLight(); toast.success('Coming Soon', 'Fasting & Diet settings will be available in the next update!'); }}
                onOpenGallery={() => setShowARLens(true)}
              />
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
                <div className="hide-scrollbar scrollable-row" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
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
                          flexShrink: 0, padding: '10px 18px', borderRadius: '12px', border: `1px solid ${isSelected ? '#059669' : '#E2E8F0'}`,
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

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleGenerateGrocery}
                  disabled={isGeneratingGrocery}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
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
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    flex: isMobile ? 1 : 'unset',
                    justifyContent: 'center',
                    opacity: isGeneratingGrocery ? 0.7 : 1
                  }}
                >
                  {isGeneratingGrocery ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  {isGeneratingGrocery ? 'Generating...' : 'Auto-Generate'}
                </button>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row', marginBottom: '20px', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                    Nutritional Guardrails & Bio-Compatibility Matrix
                  </h2>
                  <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                    Autonomous clinical safety screening configured specifically to your medical profile.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleGenerateGuardrails}
                    disabled={isGeneratingGuardrails}
                    style={{
                      background: guardrails.length > 0 ? '#FFFFFF' : '#0F172A',
                      color: guardrails.length > 0 ? '#334155' : '#FFF',
                      border: guardrails.length > 0 ? '1px solid #CBD5E1' : 'none',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: isGeneratingGuardrails ? 'not-allowed' : 'pointer',
                      opacity: isGeneratingGuardrails ? 0.7 : 1,
                    }}
                  >
                    {isGeneratingGuardrails ? (
                      <><Loader2 size={15} className="spin" /> Synthesizing...</>
                    ) : (
                      <><ShieldCheck size={15} /> {guardrails.length > 0 ? 'Recalibrate Guardrails' : 'Initialize Matrix'}</>
                    )}
                  </button>
                </div>
              </div>

              {guardrails.length === 0 && !isGeneratingGuardrails ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: '#FFFFFF', borderRadius: '24px', border: '1px solid #E2E8F0' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                    <ShieldCheck size={32} />
                  </div>
                  <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px 0' }}>Matrix Offline</h3>
                  <p style={{ color: '#64748B', fontSize: '14.5px', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
                    Generate your personalized safety guardrails to ensure your meal plan strictly adheres to your clinical needs and conditions.
                  </p>
                  <button onClick={handleGenerateGuardrails} style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', color: '#FFF', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}>
                    Initialize Matrix
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  {guardrails.map((gr: any, idx: number) => {
                    let IconComponent = ShieldCheck;
                    if (gr.icon === 'Zap') IconComponent = Zap;
                    if (gr.icon === 'Heart') IconComponent = Heart;
                    if (gr.icon === 'Layers') IconComponent = Layers;
                    if (gr.icon === 'Activity') IconComponent = Activity;
                    if (gr.icon === 'Droplet') IconComponent = Droplet;
                    if (gr.icon === 'Brain') IconComponent = Brain;
                    if (gr.icon === 'Flame') IconComponent = Flame;

                    let bgColor = '#F1F5F9';
                    let iconColor = '#64748B';
                    let targetColor = '#0F172A';
                    
                    if (gr.color === 'orange') { bgColor = '#FEF3C7'; iconColor = '#D97706'; targetColor = '#D97706'; }
                    if (gr.color === 'blue') { bgColor = '#EFF6FF'; iconColor = '#2563EB'; targetColor = '#2563EB'; }
                    if (gr.color === 'green') { bgColor = '#ECFDF5'; iconColor = '#059669'; targetColor = '#059669'; }
                    if (gr.color === 'purple') { bgColor = '#F3E8FF'; iconColor = '#7E22CE'; targetColor = '#7E22CE'; }
                    if (gr.color === 'red') { bgColor = '#FEE2E2'; iconColor = '#DC2626'; targetColor = '#DC2626'; }

                    return (
                      <div key={idx} style={{ background: '#FFFFFF', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{gr.title}</h3>
                            <span style={{ fontSize: '12px', color: targetColor, fontWeight: 700 }}>{gr.target}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                          {gr.description}
                        </p>
                        <div style={{ fontSize: '12px', background: '#F8FAFC', padding: '10px 14px', borderRadius: '10px', color: '#334155' }}>
                          <strong>Key Nutrients:</strong> {gr.keyNutrients}
                        </div>
                      </div>
                    );
                  })}
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
                    maxHeight: 'calc(100vh - 140px)',
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
                      {dynamicPresets.map((preset, pIdx) => (
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
                      updateProfileFeatureData('dietProfile', null);
                          updateProfileFeatureData('dietFoodLogs', null);
                          updateProfileFeatureData('dietHydration', null);
                          updateProfileFeatureData('dietMealPlan', null);
                          updateProfileFeatureData('dietAdvice', null);
                          updateProfileFeatureData('dietGrocery', null);
                      setProfile(null);
                        adviceFetched.current = false;
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


        

        {showARLens && <ARGroceryLens 
          onClose={() => setShowARLens(false)} 
          onLogFood={(food) => {
            triggerHapticSuccess();
            const updatedLogs = { ...foodLogs };
            updatedLogs[currentDate] = updatedLogs[currentDate] ? [...updatedLogs[currentDate]] : [];
            updatedLogs[currentDate].push({
              ...food,
              id: Date.now() + Math.random(),
            });
            setFoodLogs(updatedLogs);
            setShowARLens(false);
            awardPoints(5, 'AI Food Scanned & Logged', 'lifestyle', `ar_scan_${Date.now()}`);
          }} 
        />}
      </div>
    </div>
  );
}

