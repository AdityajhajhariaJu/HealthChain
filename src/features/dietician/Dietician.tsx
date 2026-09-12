import { DieticianDashboardTracker } from './DieticianDashboardTracker';
import { ARGroceryLens } from '../../components/ui/ARGroceryLens';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import LongevityBioStackCard from '../../components/ui/LongevityBioStackCard';

export function formatLocalDate(date: Date): string {
  const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
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
  if (
    parts.length < 3 ||
    Number.isNaN(parts[0]) ||
    Number.isNaN(parts[1]) ||
    Number.isNaN(parts[2])
  ) {
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
  BookOpen,
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
  MessageCircle,
  Edit2,
  Pause,
  Play,
  StopCircle,
  Archive,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  analyzeFoodEntry,
  generateMealPlan,
  generateNutritionalGuardrails,
  generateGroceryList,
} from '../../services/geminiService';
import {
  addEvent,
  addNutritionLog,
  getProfileKey,
  getProfile as getCoreProfile,
  updateProfileFeatureData,
} from '../../services/ProfileEngine';
import {
  getLatestHealthMemory,
  recordHealthMemory,
  syncHealthMemoryFromSupabase,
} from '../../services/HealthMemory';
import { OnboardingWizard } from './DieticianComponents';
import { FeatureProfileDataBanner } from '../../components/ui/FeatureProfileDataBanner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getActiveSession } from '../../services/authSession';
import FocusTrap from '../../components/ui/FocusTrap';
import { awardPoints } from '../../services/VitalityPointsEngine';
import { triggerHapticLight, triggerHapticSuccess } from '../../services/haptics';
import { canUseTrial, recordTrialUsage, openTrialModal } from '../../services/TrialEngine';
import { useToast } from '../../components/ui/ToastProvider';
import { PostMealReactionTimeline } from '../../components/ui/PostMealReactionTimeline';
import { DigestionCalendarHeatmap } from '../../components/ui/DigestionCalendarHeatmap';
import { EliminationProtocolSuite } from '../../components/ui/EliminationProtocolSuite';
import { SmartCorrelationInsightsView } from '../../components/ui/SmartCorrelationInsightsView';
import { FeatureMissionHeader } from '../../components/ui/FeatureMissionHeader';
import { FeatureId } from '../../services/FeatureArchitectureContract';
import {
  FullMealPlan,
  MealPlanItem,
  PlanLifecycleStatus,
  PlanStopReason,
  PLAN_STOP_REASON_LABELS,
  PORTION_ESTIMATE_DISCLAIMER,
  NON_CAUSAL_TIMING_DISCLAIMER,
  CLINICAL_SAFETY_GUARDRAIL,
  normalizeFullMealPlan,
  updateMealServing,
  editMealContent,
  applyMealClinicalSwap,
  transitionPlanStatus,
  archiveCurrentPlan,
  generateDietObservationsSummary,
  exportDietObservationsToCase,
} from '../../services/dietPlanLifecycle';
import {
  getAllClinicalDietarySwaps,
  getClinicalDietarySwap,
  DietarySwap,
} from '../../services/clinicalDietarySwaps';
import { getUnifiedCaseScope } from '../../services/caseWorkspace';

// --- Constants & Helpers ---
export const GOALS = ['Lose weight', 'Maintain', 'Lean mass preservation'];
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Minimal ambulation' },
  { id: 'light', label: 'Light', desc: 'Active movement 1-3 days/week' },
  { id: 'moderate', label: 'Moderate', desc: 'Active physical movement 4-5 days/week' },
  { id: 'active', label: 'Very Active', desc: 'Daily functional physical activity or active work' },
];
export const RESTRICTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Lactose-free', 'None'];
export const MEDICAL_CONDITIONS = ['Diabetes', 'PCOS', 'Hypertension', 'Thyroid', 'None'];
export const CUISINES = [
  'North Indian',
  'South Indian',
  'Mediterranean',
  'Middle Eastern',
  'Mexican',
  'East Asian',
  'Western',
  'Keto',
  'Any',
];
export const MEAL_SCHEDULES = [
  '3 Meals',
  '3 Meals + 1 Snack',
  '5 Small Meals',
  'Intermittent Fasting (16:8)',
];

export const QUICK_PRESETS = [
  {
    name: 'Steel-Cut Oats with Almonds & Berries',
    portion: '1 bowl (250g)',
    calories: 340,
    protein: 14,
    carbs: 52,
    fat: 8,
    emoji: '🥣',
    type: 'Breakfast',
  },
  {
    name: 'Dal Tadka + 2 Whole Wheat Rotis + Salad',
    portion: '1 plate',
    calories: 450,
    protein: 18,
    carbs: 68,
    fat: 12,
    emoji: '🥗',
    type: 'Lunch',
  },
  {
    name: 'Grilled Paneer / Chicken Tikka Quinoa Bowl',
    portion: '1 bowl (300g)',
    calories: 430,
    protein: 32,
    carbs: 30,
    fat: 18,
    emoji: '🍗',
    type: 'Lunch',
  },
  {
    name: 'Sourdough Avocado Toast with 2 Poached Eggs',
    portion: '2 slices',
    calories: 380,
    protein: 20,
    carbs: 28,
    fat: 22,
    emoji: '🥑',
    type: 'Breakfast',
  },
  {
    name: 'Moong Dal Khichdi + Desi Ghee & Curd',
    portion: '1 bowl',
    calories: 360,
    protein: 15,
    carbs: 54,
    fat: 10,
    emoji: '🍲',
    type: 'Dinner',
  },
  {
    name: 'Whey Protein Isolate & Supergreens Shake',
    portion: '1 scoop (350ml)',
    calories: 220,
    protein: 28,
    carbs: 18,
    fat: 4,
    emoji: '🥤',
    type: 'Snack',
  },
];

export const PANTRY_STAPLES = [
  { name: 'Double Espresso', emoji: '☕' },
  { name: 'Fresh Avocado', emoji: '🥑' },
  { name: '2 Poached Eggs', emoji: '🥚' },
  { name: 'Sourdough Toast', emoji: '🍞' },
  { name: 'Rolled Oats & Berries', emoji: '🥣' },
  { name: 'Low-Fat Paneer / Tofu', emoji: '🧀' },
  { name: 'Yellow Moong Dal', emoji: '🍲' },
  { name: 'Grilled Chicken Breast', emoji: '🍗' },
  { name: 'Cucumber Tomato Salad', emoji: '🥗' },
  { name: 'Greek Set Curd', emoji: '🥛' },
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
    ],
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
    ],
  },
  {
    category: 'Clean Proteins & Probiotics',
    emoji: '🥚',
    items: [
      { id: 'gpr1', name: 'Fresh Low-Fat Paneer / Organic Tofu (400g)', checked: false },
      { id: 'gpr2', name: 'Free-Range Eggs (Pack of 12)', checked: false },
      { id: 'gpr3', name: 'Probiotic Set Greek Dahi / Curd (800g)', checked: false },
      { id: 'gpr4', name: 'Whey Protein Isolate or Plant Blend', checked: false },
    ],
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
    ],
  },
];

function calculateTargets(p: any) {
  const safeWeight =
    !p?.weight || Number.isNaN(parseFloat(p.weight)) ? 70 : Math.max(20, parseFloat(p.weight));
  const safeHeight =
    !p?.height || Number.isNaN(parseFloat(p.height)) ? 170 : Math.max(50, parseFloat(p.height));
  const safeAge =
    !p?.age || Number.isNaN(parseInt(p.age, 10)) ? 30 : Math.max(1, parseInt(p.age, 10));

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
    const targetWeight =
      !p?.targetWeight || Number.isNaN(parseFloat(p.targetWeight))
        ? 65
        : parseFloat(p.targetWeight);
    const weightDiff = Math.abs(safeWeight - targetWeight);
    const totalCalorieChange = weightDiff * 7700; // ~7700 kcal per kg
    const dailyChange = totalCalorieChange / targetDays;
    const safeDailyChange = Math.min(dailyChange, 1000);

    if (p?.goal === 'Lose weight') targetCalories = Math.round(tdee - safeDailyChange);
    if (p?.goal === 'Gain muscle' || p?.goal === 'Lean mass preservation')
      targetCalories = Math.round(tdee + safeDailyChange);
  } else {
    if (p?.goal === 'Lose weight') targetCalories -= 500;
    if (p?.goal === 'Gain muscle' || p?.goal === 'Lean mass preservation') targetCalories += 500;
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
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabs = [
    'dashboard',
    'mealplan',
    'sensitivities',
    'calendar',
    'elimination',
    'insights',
    'grocery',
    'guardrails',
    'longevity',
  ] as const;
  type DietTab = (typeof validTabs)[number];

  const resolveTabKey = (raw?: string | null): DietTab | null => {
    if (!raw) return null;
    const clean = raw.trim().toLowerCase();
    if (clean === 'food-detective') return 'sensitivities';
    if (clean === 'elimination-suite') return 'elimination';
    if (clean === 'diet-plan') return 'mealplan';
    if ((validTabs as readonly string[]).includes(clean)) return clean as DietTab;
    return null;
  };

  const searchTab = searchParams.get('tab');
  const stateTab = (location.state as { tab?: string } | null)?.tab;
  const initialTab: DietTab = resolveTabKey(searchTab) || resolveTabKey(stateTab) || 'dashboard';
  const [activeTab, setActiveTabState] = useState<DietTab>(initialTab);

  const setActiveTab = (nextTab: DietTab) => {
    setActiveTabState(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  };

  useEffect(() => {
    const currentSearchTab = searchParams.get('tab');
    const currentStateTab = (location.state as { tab?: string } | null)?.tab;
    const resolved = resolveTabKey(currentSearchTab) || resolveTabKey(currentStateTab);
    if (resolved && resolved !== activeTab) {
      setActiveTabState(resolved);
    }
  }, [searchParams, location.state]);
  const caseIdParam = searchParams.get('caseId') || (location.state as any)?.caseId;
  const activeCaseScope = useMemo(() => getUnifiedCaseScope(caseIdParam), [caseIdParam]);

  const [profile, setProfile] = useState<any>(null);
  const [foodLogs, setFoodLogs] = useState<any>({});
  const [hydration, setHydration] = useState<any>({});
  const [mealPlan, setMealPlan] = useState<FullMealPlan | null>(null);
  const [archivedPlans, setArchivedPlans] = useState<FullMealPlan[]>([]);
  const [editingMeal, setEditingMeal] = useState<{ day: number; meal: MealPlanItem } | null>(null);
  const [editMealForm, setEditMealForm] = useState<{
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    description: string;
  }>({
    name: '',
    portion: '1 serving',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    description: '',
  });
  const [swappingMeal, setSwappingMeal] = useState<{ day: number; meal: MealPlanItem } | null>(
    null
  );
  const [customSwapName, setCustomSwapName] = useState<string>('');
  const [customSwapRationale, setCustomSwapRationale] = useState<string>('');
  const [showStopPlanModal, setShowStopPlanModal] = useState<boolean>(false);
  const [selectedStopReason, setSelectedStopReason] =
    useState<PlanStopReason>('digestive_discomfort');
  const [stopReasonDetails, setStopReasonDetails] = useState<string>('');
  const [showArchivedPlansModal, setShowArchivedPlansModal] = useState<boolean>(false);
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
  const [mealLatency, setMealLatency] = useState<
    '<30m Acute' | '1–2h Postprandial' | '4h+ Delayed'
  >('<30m Acute');
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [showResetDietConfirm, setShowResetDietConfirm] = useState(false);
  const [showSavedMealsModal, setShowSavedMealsModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const detectedTriggers = useMemo(() => {
    const text = foodInput.toLowerCase();
    const triggers: { label: string; icon: string; color: string; bg: string }[] = [];
    if (
      text.includes('spinach') ||
      text.includes('tomato') ||
      text.includes('wine') ||
      text.includes('aged') ||
      text.includes('fermented') ||
      text.includes('avocado') ||
      text.includes('vinegar')
    ) {
      triggers.push({ label: 'Histamine/Amines', icon: '🍷', color: '#B45309', bg: '#FEF3C7' });
    }
    if (
      text.includes('wheat') ||
      text.includes('roti') ||
      text.includes('bread') ||
      text.includes('pasta') ||
      text.includes('atta') ||
      text.includes('maida') ||
      text.includes('toast') ||
      text.includes('sourdough')
    ) {
      triggers.push({ label: 'Gluten / Wheat', icon: '🌾', color: '#B45309', bg: '#FEF3C7' });
    }
    if (
      text.includes('milk') ||
      text.includes('curd') ||
      text.includes('paneer') ||
      text.includes('cheese') ||
      text.includes('butter') ||
      text.includes('dahi') ||
      text.includes('whey')
    ) {
      triggers.push({ label: 'Dairy / Lactose', icon: '🥛', color: '#0369A1', bg: '#E0F2FE' });
    }
    if (
      text.includes('coffee') ||
      text.includes('espresso') ||
      text.includes('caffeine') ||
      text.includes('tea')
    ) {
      triggers.push({ label: 'Caffeine Active', icon: '☕', color: '#4338CA', bg: '#EEF2FF' });
    }
    if (
      text.includes('onion') ||
      text.includes('garlic') ||
      text.includes('apple') ||
      text.includes('beans') ||
      text.includes('chickpea')
    ) {
      triggers.push({ label: 'High FODMAP', icon: '🧄', color: '#7C3AED', bg: '#F5F3FF' });
    }
    return triggers;
  }, [foodInput]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showResetDietConfirm) setShowResetDietConfirm(false);
        if (showSavedMealsModal) setShowSavedMealsModal(false);
        if (showARLens) setShowARLens(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResetDietConfirm, showSavedMealsModal, showARLens]);

  // Hydrate diet state
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const coreProfile = getCoreProfile();
        if (coreProfile?.dietician) {
          const {
            profile: p,
            foodLogs: fl,
            hydration: h,
            mealPlan: mp,
            advice: a,
            groceryList: gl,
          } = coreProfile.dietician;
          if (p) setProfile({ ...p, ...calculateTargets(p) });
          if (fl) setFoodLogs(fl);
          if (h) setHydration(h);
          if (mp)
            setMealPlan(normalizeFullMealPlan(mp, { caseId: activeCaseScope.caseId || undefined }));
          if (coreProfile?.dietArchivedPlans && Array.isArray(coreProfile.dietArchivedPlans)) {
            setArchivedPlans(
              coreProfile.dietArchivedPlans.map((p: any) => normalizeFullMealPlan(p))
            );
          }
          if (a) setAdvice(a);
          if (gl) setGroceryList(gl);
          return;
        }
        const unified = getCoreProfile() || {};
        const profileKey = getProfileKey();

        try {
          if (localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile'))) {
            unified.dietProfile = JSON.parse(
              localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_diet_profile')) ||
                '{}'
            );
            unified.dietFoodLogs = JSON.parse(
              localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_food_logs')) || '{}'
            );
            unified.dietHydration = JSON.parse(
              localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_hydration')) || '{}'
            );
            unified.dietMealPlan = JSON.parse(
              localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_meal_plan')) || '{}'
            );
            unified.dietAdvice = localStorage.getItem(
              profileKey.replace('hc_unified_profile', 'hc_diet_advice')
            );
            unified.dietGrocery = JSON.parse(
              localStorage.getItem(profileKey.replace('hc_unified_profile', 'hc_grocery_list')) ||
                '{}'
            );

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
        } catch (migErr) {
          console.error('Diet migration error, skipping corrupted legacy entries:', migErr);
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
          try {
            setFoodLogs(JSON.parse(savedLogs));
          } catch (e) {}
        }
        if (savedHydration) {
          try {
            setHydration(JSON.parse(savedHydration));
          } catch (e) {}
        }
        if (savedPlan) {
          try {
            setMealPlan(
              normalizeFullMealPlan(JSON.parse(savedPlan), {
                caseId: activeCaseScope.caseId || undefined,
              })
            );
          } catch (e) {}
        }
        if (unified?.dietArchivedPlans && Array.isArray(unified.dietArchivedPlans)) {
          setArchivedPlans(unified.dietArchivedPlans.map((p: any) => normalizeFullMealPlan(p)));
        }
        if (savedAdvice) setAdvice(savedAdvice);
        if (savedGrocery) {
          try {
            setGroceryList(JSON.parse(savedGrocery));
          } catch (e) {}
        }

        await syncHealthMemoryFromSupabase();
        if (cancelled || savedProfile || savedLogs || savedHydration || savedPlan || savedAdvice)
          return;
        const snapshot = getLatestHealthMemory('diet', 'dietician')?.payload?.state;
        if (!snapshot) return;
        if (snapshot.profile)
          setProfile({ ...snapshot.profile, ...calculateTargets(snapshot.profile) });
        if (snapshot.foodLogs) setFoodLogs(snapshot.foodLogs);
        if (snapshot.hydration) setHydration(snapshot.hydration);
        if (snapshot.mealPlan)
          setMealPlan(
            normalizeFullMealPlan(snapshot.mealPlan, {
              caseId: activeCaseScope.caseId || undefined,
            })
          );
        if (snapshot.archivedPlans && Array.isArray(snapshot.archivedPlans)) {
          setArchivedPlans(snapshot.archivedPlans.map((p: any) => normalizeFullMealPlan(p)));
        }
        if (snapshot.advice) setAdvice(snapshot.advice);
        if (snapshot.groceryList) setGroceryList(snapshot.groceryList);
      } catch (e) {
        console.error('Failed to restore diet state:', e);
      }
    };
    load().finally(() => setIsHydrated(true));
    window.addEventListener('hc_profile_updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('hc_profile_updated', load);
    };
  }, [activeCaseScope.caseId]);

  // Save state to local storage when it changes
  useEffect(() => {
    if (!isHydrated) return;
    try {
      const data = { profile, foodLogs, hydration, mealPlan, advice, groceryList, archivedPlans };
      updateProfileFeatureData('dietician', data);

      if (profile) updateProfileFeatureData('dietProfile', profile);
      updateProfileFeatureData('dietFoodLogs', foodLogs);
      updateProfileFeatureData('dietHydration', hydration);
      if (mealPlan) updateProfileFeatureData('dietMealPlan', mealPlan);
      if (archivedPlans.length > 0) updateProfileFeatureData('dietArchivedPlans', archivedPlans);
      if (advice) updateProfileFeatureData('dietAdvice', advice);
      if (groceryList) updateProfileFeatureData('dietGrocery', groceryList);
    } catch (e) {}
  }, [profile, foodLogs, hydration, mealPlan, advice, groceryList, archivedPlans]);

  // Record Health Memory snapshots
  useEffect(() => {
    if (!profile) return;
    const safeOccurredAt = (() => {
      try {
        const d = new Date(`${currentDate}T12:00:00`);
        return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
      } catch {
        return new Date().toISOString();
      }
    })();
    const dailyFood = foodLogs[currentDate] || [];
    recordHealthMemory({
      kind: 'diet',
      source: 'dietician',
      title: `Diet log: ${currentDate}`,
      occurredAt: safeOccurredAt,
      payload: {
        profile: {
          goal: profile.goal,
          targetCalories: profile.targetCalories,
          targetProtein: profile.targetProtein,
        },
        food: dailyFood,
        hydration: hydration || {},
        mealPlan: mealPlan || null,
      },
      dedupeKey: `diet-day:${currentDate}`,
    });
  }, [profile, foodLogs, hydration, mealPlan, currentDate]);

  const adviceFetched = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Keyboard dismissals for all interactive modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showARLens) setShowARLens(false);
        else if (isLoggingFood) setIsLoggingFood(false);
        else if (showResetDietConfirm) setShowResetDietConfirm(false);
        else if (showSavedMealsModal) setShowSavedMealsModal(false);
        else if (isEditingProfile) setIsEditingProfile(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showARLens, isLoggingFood, showResetDietConfirm, showSavedMealsModal, isEditingProfile]);

  // Synthesize clinical nutritional advice deterministically (0 token burn)
  useEffect(() => {
    if (profile && !advice) {
      const conditions = (profile.medicalConditions || profile.conditions || []).map((c: any) =>
        (typeof c === 'string' ? c : c?.condition || '').toLowerCase()
      );
      const cuisine = profile.cuisine || '';
      const calories = profile.targetCalories || 2000;

      let rule = '';
      if (
        conditions.some(
          (c: string) =>
            c.includes('gerd') ||
            c.includes('reflux') ||
            c.includes('heartburn') ||
            c.includes('lpr')
        )
      ) {
        rule =
          'Prioritize alkaline, low-acid foods and finish dinner at least 3 hours before sleep to prevent esophageal micro-irritation.';
      } else if (
        conditions.some(
          (c: string) =>
            c.includes('ibs') || c.includes('bloat') || c.includes('sibo') || c.includes('gut')
        )
      ) {
        rule =
          'Incorporate gentle soluble fiber and space meals 3 to 4 hours to activate migrating motor complex (MMC) motility.';
      } else if (
        conditions.some(
          (c: string) =>
            c.includes('pots') || c.includes('dysautonomia') || c.includes('tachycardia')
        )
      ) {
        rule =
          'Maintain steady fluid volume and electrolyte balance with complex carbs to minimize postprandial splanchnic blood pooling.';
      } else if (
        conditions.some(
          (c: string) =>
            c.includes('diabet') ||
            c.includes('insulin') ||
            c.includes('glucose') ||
            c.includes('metabolic')
        )
      ) {
        rule =
          'Anchor each meal with 25-30g of lean protein and healthy fats before complex carbs to stabilize postprandial glucose.';
      } else if (
        conditions.some(
          (c: string) => c.includes('histamine') || c.includes('mcas') || c.includes('allergy')
        )
      ) {
        rule =
          'Prioritize fresh, non-fermented whole foods and minimize high-histamine culprits to preserve DAO enzyme capacity.';
      } else {
        rule = `Target ${calories} kcal/day with whole-food nutrient density and balanced macronutrient distribution.`;
      }

      const cuisineNote =
        cuisine && !cuisine.toLowerCase().includes('not specified')
          ? ` Optimized for your ${cuisine} culinary preferences.`
          : ' Ensure consistent protein distribution across all feeding windows.';

      const synthesizedAdvice = `${rule}${cuisineNote}`;
      setAdvice(synthesizedAdvice);
      updateProfileFeatureData('dietAdvice', synthesizedAdvice);
    }
  }, [profile, advice]);

  // Derived state for current day
  const todayLogs = foodLogs[currentDate] || [];
  const { consumedCalories, consumedProtein, consumedCarbs, consumedFat } = useMemo(() => {
    // ⚡ Bolt Performance Optimization:
    // Consolidated 4 separate array reductions into a single O(N) pass.
    let cal = 0,
      pro = 0,
      car = 0,
      fat = 0;
    for (let i = 0; i < todayLogs.length; i++) {
      const item = todayLogs[i];
      cal += item.calories || 0;
      pro += item.protein || 0;
      car += item.carbs || 0;
      fat += item.fat || 0;
    }
    return {
      consumedCalories: cal,
      consumedProtein: pro,
      consumedCarbs: car,
      consumedFat: fat,
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
            portion: (meal as any).portion || '1 serving',
            calories: meal.calories || 0,
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0,
            emoji:
              (meal as any).emoji ||
              (meal.type?.toLowerCase().includes('break')
                ? '🥣'
                : meal.type?.toLowerCase().includes('lunch')
                  ? '🥗'
                  : meal.type?.toLowerCase().includes('din')
                    ? '🍲'
                    : meal.type?.toLowerCase().includes('snack')
                      ? '🥑'
                      : '🍽️'),
            type: meal.type || 'Meal',
          });
        }
        if (meals.length >= 6) return meals;
      }
    }

    return meals.length > 0 ? meals : QUICK_PRESETS;
  }, [mealPlan]);

  const handleSaveProfile = (p: any) => {
    const fullProfile = { ...p, ...calculateTargets(p) };
    setProfile(fullProfile);

    // Persist to unified profile
    const unified = getCoreProfile() || {};
    unified.dietProfile = fullProfile;
    try {
      localStorage.setItem(getProfileKey(), JSON.stringify(unified));
    } catch (e) {}
    updateProfileFeatureData('dietProfile', fullProfile);
    toast.success('Preferences updated', 'Your food-planning preferences were refreshed.');
  };

  if (!profile) {
    return <OnboardingWizard onComplete={handleSaveProfile} />;
  }

  const waterGlasses = hydration[currentDate] || 0;

  const syncToUnifiedNutritionLogs = (mealItem: any) => {
    try {
      const text = (mealItem.name || '').toLowerCase();
      const sensitivities: string[] = [];
      if (
        text.includes('spinach') ||
        text.includes('tomato') ||
        text.includes('wine') ||
        text.includes('aged') ||
        text.includes('fermented') ||
        text.includes('avocado') ||
        text.includes('pickle') ||
        text.includes('achaar')
      )
        sensitivities.push('histamine');
      if (
        text.includes('wheat') ||
        text.includes('roti') ||
        text.includes('bread') ||
        text.includes('pasta') ||
        text.includes('atta') ||
        text.includes('maida') ||
        text.includes('toast') ||
        text.includes('sourdough')
      )
        sensitivities.push('gluten');
      if (
        text.includes('milk') ||
        text.includes('curd') ||
        text.includes('paneer') ||
        text.includes('cheese') ||
        text.includes('butter') ||
        text.includes('dahi') ||
        text.includes('whey')
      )
        sensitivities.push('lactose_casein');
      if (
        text.includes('coffee') ||
        text.includes('espresso') ||
        text.includes('caffeine') ||
        text.includes('tea') ||
        text.includes('chai')
      )
        sensitivities.push('caffeine');
      if (
        text.includes('onion') ||
        text.includes('garlic') ||
        text.includes('chickpea') ||
        text.includes('beans') ||
        text.includes('chana') ||
        text.includes('besan') ||
        text.includes('dal')
      )
        sensitivities.push('fructans_gos');

      addNutritionLog({
        meal: mealItem.name,
        calories: mealItem.calories || 0,
        protein: mealItem.protein || 0,
        carbs: mealItem.carbs || 0,
        fat: mealItem.fat || 0,
        type: mealItem.type || selectedMealType,
        latency: mealItem.latency || mealLatency,
        sensitivities,
        date: currentDate,
      });
    } catch (e) {
      console.warn('Failed to sync to unified nutrition logs:', e);
    }
  };

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
          const loggedEntry = {
            ...item,
            type: selectedMealType,
            latency: mealLatency,
            id: Date.now() + Math.random(),
          };
          updatedLogs[currentDate].push(loggedEntry);
          syncToUnifiedNutritionLogs(loggedEntry);
        });
        if (isMounted.current) {
          setFoodLogs(updatedLogs);
          setIsLoggingFood(false);
          setFoodInput('');
          triggerHapticSuccess();
          awardPoints(5, 'Logged Daily Nutrition', 'lifestyle', `diet_log_${currentDate}`);
        }

        addEvent(
          'diet',
          'dietician',
          `Logged Food: ${result.items.map((i: any) => i.name).join(', ')} (${mealLatency})`,
          {
            items: result.items,
            type: selectedMealType,
            latency: mealLatency,
          }
        );
      }
    } catch (err) {
      console.error('Failed to analyze food:', err);
      toast.error('Analysis Failed', 'Failed to analyze food entry. Please try again.');
    } finally {
      if (isMounted.current) setIsAnalyzingFood(false);
    }
  };

  const handleAddPreset = (preset: (typeof QUICK_PRESETS)[0]) => {
    triggerHapticLight();
    const updatedLogs = { ...foodLogs };
    updatedLogs[currentDate] = updatedLogs[currentDate] ? [...updatedLogs[currentDate]] : [];
    const entry = {
      name: preset.name,
      portion: preset.portion,
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat,
      emoji: preset.emoji,
      type: selectedMealType,
      latency: mealLatency,
      id: Date.now() + Math.random(),
    };
    updatedLogs[currentDate].push(entry);
    syncToUnifiedNutritionLogs(entry);
    setFoodLogs(updatedLogs);
    setIsLoggingFood(false);
    awardPoints(5, 'Logged Daily Nutrition', 'lifestyle', `diet_log_${currentDate}`);
  };

  const handleDeleteFood = (id: number) => {
    triggerHapticLight();
    const updatedLogs = { ...foodLogs };
    if (updatedLogs[currentDate]) {
      const removedItem = updatedLogs[currentDate].find((item: any) => item.id === id);
      updatedLogs[currentDate] = updatedLogs[currentDate].filter((item: any) => item.id !== id);
      setFoodLogs(updatedLogs);
      updateProfileFeatureData('dietFoodLogs', updatedLogs);
      updateProfileFeatureData('dietician', { foodLogs: updatedLogs });
      toast.info(
        'Meal Removed',
        `"${removedItem?.name || 'Meal'}" removed from daily nutrition log.`
      );
    }
  };

  const handleUpdateHydration = (delta: number) => {
    triggerHapticLight();
    const current = hydration[currentDate] || 0;
    const next = Math.max(0, current + delta);
    const updated = { ...hydration, [currentDate]: next };
    setHydration(updated);
    updateProfileFeatureData('dietHydration', updated);
    updateProfileFeatureData('dietician', { hydration: updated });
    if (next >= 8 && current < 8) {
      awardPoints(
        2,
        'Daily Optimal Hydration Target (2L)',
        'lifestyle',
        `hydration_target_${currentDate}`
      );
      toast.success(
        'Hydration Target Met! 💧',
        'You reached your 2,000ml daily hydration goal (+2 PTS)'
      );
      triggerHapticSuccess();
    } else if (delta > 0) {
      toast.info('Hydration Logged', `${next * 250}ml logged for today (${next}/8 glasses).`);
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
        awardPoints(
          10,
          'Created Food-Planning Guardrails',
          'lifestyle',
          `guardrails_${Date.now()}`
        );
        triggerHapticSuccess();
      } else {
        toast.error(
          'Generation Failed',
          'Could not synthesize medical guardrails. Please try again.'
        );
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
      window.dispatchEvent(
        new CustomEvent('hc_require_auth', {
          detail: {
            title: 'Authentication Required',
            message: 'You need to log in or sign up to generate a personalized meal plan.',
          },
        })
      );
      return;
    }

    if (!canUseTrial('dietician')) {
      openTrialModal('Food Planner (1 Free Trial Meal Plan)');
      return;
    }

    setIsGeneratingPlan(true);
    try {
      const rawPlan = await generateMealPlan(profile, 7);
      if (rawPlan) {
        if (isMounted.current) {
          const normalized = normalizeFullMealPlan(rawPlan, {
            caseId: activeCaseScope.caseId || undefined,
            profileKey: getProfileKey(),
          });
          if (
            mealPlan &&
            ((mealPlan.days && mealPlan.days.length > 0) ||
              (mealPlan.plan && mealPlan.plan.length > 0))
          ) {
            const updatedArchived = archiveCurrentPlan(mealPlan, archivedPlans);
            setArchivedPlans(updatedArchived);
            updateProfileFeatureData('dietArchivedPlans', updatedArchived);
          }
          setMealPlan(normalized);
          updateProfileFeatureData('dietMealPlan', normalized);
          awardPoints(
            15,
            'Created Editable 7-Day Meal Blueprint',
            'lifestyle',
            `diet_plan_${Date.now()}`
          );
          triggerHapticSuccess();
          recordTrialUsage('dietician');
          toast.success(
            'Blueprint Created',
            '7-Day meal plan generated. You can edit meals, adjust portions, and swap ingredients.'
          );
        }
        addEvent('diet', 'dietician', 'Generated 7-Day Meal Plan', { plan: rawPlan });
      } else {
        toast.error(
          'Generation Failed',
          'Failed to parse the meal plan from AI. Please try again.'
        );
      }
    } catch (err) {
      console.error('Failed to generate meal plan:', err);
      toast.error('Generation Failed', 'Failed to generate meal plan. Please try again.');
    } finally {
      if (isMounted.current) setIsGeneratingPlan(false);
    }
  };

  // --- Package 7 Plan Lifecycle Handlers ---
  const handleSelectPlan = () => {
    if (!mealPlan) return;
    triggerHapticSuccess();
    const updated = transitionPlanStatus(mealPlan, 'selected');
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    toast.success('Plan Selected', 'Plan selected as your active blueprint.');
  };

  const handleActivatePlan = () => {
    if (!mealPlan) return;
    triggerHapticSuccess();
    const updated = transitionPlanStatus(mealPlan, 'active');
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    toast.success('Plan Active', 'You are now actively following this meal blueprint!');
  };

  const handlePausePlan = () => {
    if (!mealPlan) return;
    triggerHapticLight();
    const updated = transitionPlanStatus(mealPlan, 'paused');
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    toast.info(
      'Plan Paused',
      'Meal plan paused. Your daily logs and reactions remain completely safe.'
    );
  };

  const handleResumePlan = () => {
    if (!mealPlan) return;
    triggerHapticSuccess();
    const updated = transitionPlanStatus(mealPlan, 'active');
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    toast.success('Plan Resumed', 'Welcome back! Plan adherence resumed.');
  };

  const handleCompletePlan = () => {
    if (!mealPlan) return;
    triggerHapticSuccess();
    const updated = transitionPlanStatus(mealPlan, 'completed', {
      completionNotes: 'Completed 7-Day structured nutritional blueprint.',
    });
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    awardPoints(
      25,
      'Completed Clinical Meal Blueprint',
      'lifestyle',
      `diet_complete_${Date.now()}`
    );
    toast.success(
      'Cycle Completed!',
      'Congratulations on completing this plan! Full history preserved in your calendar.'
    );
  };

  const handleConfirmStopPlan = () => {
    if (!mealPlan) return;
    triggerHapticLight();
    const updated = transitionPlanStatus(mealPlan, 'stopped', {
      stopReason: selectedStopReason,
      stopReasonDetails: stopReasonDetails.trim() || undefined,
    });
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    setShowStopPlanModal(false);
    toast.info(
      'Plan Stopped',
      'Your plan has been marked stopped. All logged days and past reactions remain permanently intact.'
    );
  };

  const handleServingMultiplierChange = (dayNum: number, mealId: string, multiplier: number) => {
    if (!mealPlan) return;
    triggerHapticLight();
    const updated = updateMealServing(mealPlan, dayNum, mealId, multiplier);
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    toast.success(
      'Portion Adjusted',
      `Serving updated to ${multiplier}x. Daily totals recalculated.`
    );
  };

  const handleExportToCasePrep = () => {
    triggerHapticSuccess();
    const summary = generateDietObservationsSummary(mealPlan, foodLogs, activeCaseScope.caseItem);
    if (activeCaseScope.caseId) {
      exportDietObservationsToCase(activeCaseScope.caseId, summary);
    }
    toast.success(
      'Exported to Case Prep',
      'Factual dietary observations added to your appointment visit brief.'
    );
    const targetUrl = activeCaseScope.caseId
      ? `/app/case-prep?caseId=${encodeURIComponent(activeCaseScope.caseId)}`
      : '/app/case-prep';
    navigate(targetUrl, { state: { initialBriefNote: summary.summary } });
  };

  const handleStartEditMeal = (day: number, meal: MealPlanItem) => {
    setEditingMeal({ day, meal });
    setEditMealForm({
      name: meal.name,
      portion: meal.portion || '1 serving',
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      description: meal.description || '',
    });
  };

  const handleSaveEditMeal = () => {
    if (!mealPlan || !editingMeal) return;
    triggerHapticSuccess();
    const updated = editMealContent(mealPlan, editingMeal.day, editingMeal.meal.id, {
      name: editMealForm.name.trim() || editingMeal.meal.name,
      portion: editMealForm.portion.trim() || editingMeal.meal.portion,
      calories: Number(editMealForm.calories) || editingMeal.meal.calories,
      protein: Number(editMealForm.protein) || editingMeal.meal.protein,
      carbs: Number(editMealForm.carbs) || editingMeal.meal.carbs,
      fat: Number(editMealForm.fat) || editingMeal.meal.fat,
      description: editMealForm.description,
    });
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    setEditingMeal(null);
    toast.success('Meal Updated', 'Nutritional estimates and day totals recalculated.');
  };

  const handleApplySwap = (swap: DietarySwap) => {
    if (!mealPlan || !swappingMeal) return;
    triggerHapticSuccess();
    const updated = applyMealClinicalSwap(mealPlan, swappingMeal.day, swappingMeal.meal.id, swap);
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    setSwappingMeal(null);
    toast.success('Swap Applied', `Replaced with ${swap.smartReplacement}. Day totals updated.`);
  };

  const handleApplyCustomSwap = () => {
    if (!mealPlan || !swappingMeal || !customSwapName.trim()) return;
    triggerHapticSuccess();
    const customSwap: DietarySwap = {
      triggerName: swappingMeal.meal.name,
      category: 'ADDITIVE',
      offendingCompound: 'User personalized preference',
      biologicalMechanism: customSwapRationale.trim() || 'User-selected ingredient tolerance swap',
      smartReplacement: customSwapName.trim(),
      replacementDetails: 'Custom personalized tolerance swap',
      expectedReliefTimeline: 'Within 24 hours',
    };
    const updated = applyMealClinicalSwap(
      mealPlan,
      swappingMeal.day,
      swappingMeal.meal.id,
      customSwap
    );
    setMealPlan(updated);
    updateProfileFeatureData('dietMealPlan', updated);
    setSwappingMeal(null);
    setCustomSwapName('');
    setCustomSwapRationale('');
    toast.success('Custom Swap Applied', `Replaced with ${customSwap.smartReplacement}.`);
  };

  const handleRestoreArchivedPlan = (archived: FullMealPlan) => {
    triggerHapticSuccess();
    if (mealPlan) {
      const updatedArchived = archiveCurrentPlan(mealPlan, archivedPlans);
      setArchivedPlans(updatedArchived);
      updateProfileFeatureData('dietArchivedPlans', updatedArchived);
    }
    const reactivated = transitionPlanStatus(archived, 'active');
    setMealPlan(reactivated);
    updateProfileFeatureData('dietMealPlan', reactivated);
    setShowArchivedPlansModal(false);
    toast.success(
      'Blueprint Restored',
      'Past blueprint restored as active plan. Historical logs remained intact.'
    );
  };

  const toggleGroceryItem = (catIndex: number, itemId: string) => {
    triggerHapticLight();
    const updated = [...groceryList];
    const cat = updated[catIndex];
    if (cat && cat.items) {
      cat.items = cat.items.map((item: any) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      setGroceryList(updated);
    }
  };

  const copyGroceryListText = async () => {
    triggerHapticLight();
    let text = `🛒 HealthChain 7-Day Grocery List (${profile?.cuisine || 'Healthy'} Plan)\n\n`;
    groceryList.forEach((cat) => {
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
  const currentSelectedDayObj =
    normalizedPlanDays.find((d: any) => (d.day || d.dayNumber) === selectedPlanDay) ||
    normalizedPlanDays[0];

  const currentFeatureId: FeatureId =
    activeTab === 'elimination'
      ? 'elimination-suite'
      : activeTab === 'sensitivities' || activeTab === 'insights'
        ? 'food-detective'
        : 'diet-plan';

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <FeatureMissionHeader
          featureId={currentFeatureId}
          activeCaseId={activeCaseScope.caseId || undefined}
          onNavigateTab={(tabKey) => {
            if (tabKey === 'insights' || tabKey === 'sensitivities') setActiveTab('sensitivities');
            else if (tabKey === 'elimination') setActiveTab('elimination');
            else if (tabKey === 'plan' || tabKey === 'mealplan') setActiveTab('mealplan');
            else setActiveTab('dashboard');
          }}
          style={{ marginBottom: '20px' }}
        />

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
                  AI Food Planner
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
                    letterSpacing: '0.5px',
                  }}
                >
                  Active
                </span>
              </div>
              <p
                style={{
                  fontSize: '14.5px',
                  color: '#64748B',
                  margin: '2px 0 0 0',
                  fontWeight: 500,
                }}
              >
                Editable meal examples, food logs, and condition-aware questions in one place.
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
              onClick={() => {
                triggerHapticLight();
                setActiveTab('sensitivities');
              }}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'sensitivities' ? '#0F172A' : 'transparent',
                color: activeTab === 'sensitivities' ? '#FFFFFF' : '#64748B',
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
              <Activity size={15} color={activeTab === 'sensitivities' ? '#34D399' : '#64748B'} />{' '}
              Post-Meal Sensitivities
            </button>
            <button
              onClick={() => {
                triggerHapticLight();
                setActiveTab('calendar');
              }}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'calendar' ? '#0F172A' : 'transparent',
                color: activeTab === 'calendar' ? '#FFFFFF' : '#64748B',
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
              <Calendar size={15} color={activeTab === 'calendar' ? '#38BDF8' : '#64748B'} />{' '}
              Digestion Calendar
            </button>
            <button
              onClick={() => {
                triggerHapticLight();
                setActiveTab('elimination');
              }}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'elimination' ? '#0F172A' : 'transparent',
                color: activeTab === 'elimination' ? '#FFFFFF' : '#64748B',
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
              <Target size={15} color={activeTab === 'elimination' ? '#F43F5E' : '#64748B'} />{' '}
              Symptom Hunt
            </button>
            <button
              onClick={() => {
                triggerHapticLight();
                setActiveTab('insights');
              }}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'insights' ? '#0F172A' : 'transparent',
                color: activeTab === 'insights' ? '#FFFFFF' : '#64748B',
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
              <Sparkles size={15} color={activeTab === 'insights' ? '#C084FC' : '#64748B'} /> Smart
              Insights
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
              <ShoppingCart size={15} /> Smart Grocery
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
            <button
              onClick={() => setActiveTab('longevity')}
              style={{
                padding: isMobile ? '8px 12px' : '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'longevity' ? '#0F172A' : 'transparent',
                color: activeTab === 'longevity' ? '#FFFFFF' : '#64748B',
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
              <Sparkles size={15} color={activeTab === 'longevity' ? '#38BDF8' : '#64748B'} />{' '}
              Longevity Bio-Stack
            </button>
            <div
              style={{
                width: '1px',
                height: '22px',
                background: '#E2E8F0',
                margin: '6px 2px',
                flexShrink: 0,
              }}
            />
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
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isMobile ? 'space-between' : 'flex-start',
                  gap: '14px',
                }}
              >
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
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '160px',
                  }}
                >
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    {currentDate === formatLocalDate(new Date())
                      ? 'Today'
                      : parseLocalDate(currentDate).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#64748B',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.8px',
                    }}
                  >
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
                  <Plus size={16} /> Log Meal
                </button>
                <button
                  onClick={() => navigate('/app/nutrition-log')}
                  style={{
                    background: '#0F172A',
                    color: '#FFF',
                    border: 'none',
                    padding: '11px 16px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                    flex: isMobile ? 1 : 'unset',
                    justifyContent: 'center',
                  }}
                  title="Ambient Natural Language & Voice Food Tracking"
                >
                  <Sparkles size={16} color="#34D399" /> Ambient Log
                </button>
              </div>
            </div>

            <DieticianDashboardTracker
              profile={profile}
              foodLogs={foodLogs}
              currentDate={currentDate}
              waterGlasses={waterGlasses}
              onLogMeal={(mealName: string) => {
                setSelectedMealType(mealName);
                setIsLoggingFood(true);
              }}
              onDeleteMeal={handleDeleteFood}
              onUpdateHydration={handleUpdateHydration}
              onSnap={() => setShowARLens(true)}
              onOpenSettings={() => {
                triggerHapticLight();
                setIsEditingProfile(true);
              }}
              onOpenSavedMeals={() => {
                triggerHapticLight();
                setShowSavedMealsModal(true);
              }}
              onOpenGallery={() => setShowARLens(true)}
              onSelectTab={(t: any) => setActiveTab(t)}
            />
          </motion.div>
        )}

        {/* TAB: POST-MEAL SENSITIVITIES TIMELINE (media_1788704739504.png) */}
        {activeTab === 'sensitivities' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '8px' }}
          >
            <FeatureMissionHeader
              featureId="food-detective"
              onNavigateTab={(t) => setActiveTab(t as any)}
              style={{ marginBottom: '16px' }}
            />
            <PostMealReactionTimeline
              onOpenQuickMeal={() => {
                setSelectedMealType('Quick Meal');
                setIsLoggingFood(true);
              }}
            />
          </motion.div>
        )}

        {/* TAB: MONTHLY DIGESTION & BLOATING CALENDAR HEATMAP (media_1788704751525.png) */}
        {activeTab === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '8px' }}
          >
            <FeatureMissionHeader
              featureId="food-detective"
              onNavigateTab={(t) => setActiveTab(t as any)}
              style={{ marginBottom: '16px' }}
            />
            <DigestionCalendarHeatmap
              onOpenQuickMeal={() => {
                setSelectedMealType('Quick Meal');
                setIsLoggingFood(true);
              }}
            />
          </motion.div>
        )}

        {/* TAB: 4-WEEK CLINICAL ELIMINATION SUITE (media_1788704747359.png) */}
        {activeTab === 'elimination' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '8px' }}
          >
            <FeatureMissionHeader
              featureId="elimination-suite"
              onNavigateTab={(t) => setActiveTab(t as any)}
              style={{ marginBottom: '16px' }}
            />
            <EliminationProtocolSuite
              onOpenQuickMeal={() => {
                setSelectedMealType('Quick Meal');
                setIsLoggingFood(true);
              }}
              onOpenCalendarHeatmap={() => setActiveTab('calendar')}
              onOpenPostMealTimeline={() => setActiveTab('sensitivities')}
            />
          </motion.div>
        )}

        {/* TAB: SMART CORRELATION INSIGHTS (media_1788703634311.png) */}
        {activeTab === 'insights' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{ marginTop: '8px' }}
          >
            <FeatureMissionHeader
              featureId="food-detective"
              onNavigateTab={(t) => setActiveTab(t as any)}
              style={{ marginBottom: '16px' }}
            />
            <SmartCorrelationInsightsView
              onOpenElimination={() => setActiveTab('elimination')}
              onOpenTimeline={() => setActiveTab('sensitivities')}
              onOpenHeatmap={() => setActiveTab('calendar')}
            />
          </motion.div>
        )}

        {/* TAB 2: 7-DAY MEAL PLAN */}
        {activeTab === 'mealplan' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FeatureMissionHeader
              featureId="diet-plan"
              onNavigateTab={(t) => setActiveTab(t as any)}
              style={{ marginBottom: '16px' }}
            />
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
                <h2
                  style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 4px 0',
                  }}
                >
                  Editable 7-Day Meal Example
                </h2>
                <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                  An AI-generated starting point for {profile.cuisine} preferences and an estimated{' '}
                  {profile.targetCalories} kcal target.
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
                {mealPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      setActiveTab('grocery');
                    }}
                    style={{
                      background: '#ECFDF5',
                      color: '#065F46',
                      border: '1px solid #A7F3D0',
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
                    <ShoppingCart size={15} /> Smart Grocery
                  </button>
                )}
                {mealPlan && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticLight();
                      navigate('/app/ava', {
                        state: {
                          initialPrompt: `I generated an editable 7-day meal example with an estimated daily target of ${profile?.targetCalories || 2000} kcal. Please review it as a planning aid, identify assumptions and missing information, and list questions for a clinician or registered dietitian. Do not describe it as a prescription.`,
                        },
                      });
                    }}
                    style={{
                      background: '#EEF2FF',
                      color: '#4F46E5',
                      border: '1px solid #C7D2FE',
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
                    <MessageCircle size={15} /> Discuss with Ava
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
                      <Sparkles size={16} />{' '}
                      {mealPlan ? 'Regenerate Example' : 'Create 7-Day Example'}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div
              role="note"
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                margin: '-4px 0 20px',
                padding: '13px 15px',
                borderRadius: '14px',
                background: '#FFF7F2',
                border: '1px solid #F8D8C6',
                color: '#7C2D12',
              }}
            >
              <Info size={18} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.55 }}>
                <strong>Editable planning aid.</strong> Portions, calories, and nutrients are
                estimates. Verify packaged-food labels and review condition-specific restrictions,
                allergies, pregnancy needs, kidney disease, diabetes treatment, or eating-disorder
                concerns with a qualified clinician or registered dietitian.
              </p>
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
                <h3
                  style={{
                    fontSize: '19px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 8px 0',
                  }}
                >
                  No Active 7-Day Plan
                </h3>
                <p
                  style={{
                    color: '#64748B',
                    fontSize: '14.5px',
                    maxWidth: '440px',
                    margin: '0 auto 24px auto',
                    lineHeight: 1.6,
                  }}
                >
                  Generate an authentic, chef-grade nutritional schedule that balances your macros
                  and guards against your health conditions.
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
                  {isGeneratingPlan ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Generate My 7-Day Plan
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Plan Lifecycle & Governance Card */}
                <div
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    padding: isMobile ? '16px' : '20px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#64748B',
                          textTransform: 'uppercase',
                          letterSpacing: '0.6px',
                        }}
                      >
                        Blueprint Status:
                      </span>
                      {(() => {
                        const status = mealPlan.lifecycle?.status || 'draft';
                        const config = {
                          draft: {
                            bg: '#F1F5F9',
                            color: '#475569',
                            border: '#CBD5E1',
                            label: 'Draft Blueprint',
                          },
                          selected: {
                            bg: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '#BFDBFE',
                            label: 'Selected Blueprint',
                          },
                          active: {
                            bg: '#ECFDF5',
                            color: '#047857',
                            border: '#A7F3D0',
                            label: 'Active (Following)',
                          },
                          paused: {
                            bg: '#FFFBEB',
                            color: '#B45309',
                            border: '#FDE68A',
                            label: 'Paused',
                          },
                          completed: {
                            bg: '#FAF5FF',
                            color: '#7E22CE',
                            border: '#E9D5FF',
                            label: 'Completed Cycle',
                          },
                          stopped: {
                            bg: '#FFF1F2',
                            color: '#BE123C',
                            border: '#FECDD3',
                            label: 'Stopped',
                          },
                        }[status];
                        return (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 800,
                              background: config.bg,
                              color: config.color,
                              border: `1px solid ${config.border}`,
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: config.color,
                              }}
                            />
                            {config.label}
                          </span>
                        );
                      })()}
                      {activeCaseScope.caseItem && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            fontSize: '11.5px',
                            color: '#475569',
                            fontWeight: 600,
                          }}
                        >
                          <BookOpen size={12} color="#059669" /> Case:{' '}
                          {activeCaseScope.caseItem.title}
                        </span>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {(!mealPlan.lifecycle || mealPlan.lifecycle.status === 'draft') && (
                        <>
                          <button
                            type="button"
                            onClick={handleSelectPlan}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#F8FAFC',
                              border: '1px solid #CBD5E1',
                              color: '#334155',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Select Plan
                          </button>
                          <button
                            type="button"
                            onClick={handleActivatePlan}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#059669',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Play size={13} /> Start Following
                          </button>
                        </>
                      )}

                      {mealPlan.lifecycle?.status === 'selected' && (
                        <>
                          <button
                            type="button"
                            onClick={handleActivatePlan}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#059669',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Play size={13} /> Start Following
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowStopPlanModal(true)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              color: '#BE123C',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Stop / Archive...
                          </button>
                        </>
                      )}

                      {mealPlan.lifecycle?.status === 'active' && (
                        <>
                          <button
                            type="button"
                            onClick={handlePausePlan}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#FFFBEB',
                              border: '1px solid #FDE68A',
                              color: '#B45309',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Pause size={13} /> Pause Plan
                          </button>
                          <button
                            type="button"
                            onClick={handleCompletePlan}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              color: '#065F46',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <CheckCircle2 size={13} /> Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowStopPlanModal(true)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              color: '#BE123C',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Stop Plan...
                          </button>
                        </>
                      )}

                      {mealPlan.lifecycle?.status === 'paused' && (
                        <>
                          <button
                            type="button"
                            onClick={handleResumePlan}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#059669',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <Play size={13} /> Resume Plan
                          </button>
                          <button
                            type="button"
                            onClick={handleCompletePlan}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#ECFDF5',
                              border: '1px solid #A7F3D0',
                              color: '#065F46',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowStopPlanModal(true)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '10px',
                              background: '#FFF1F2',
                              border: '1px solid #FECDD3',
                              color: '#BE123C',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Stop Plan...
                          </button>
                        </>
                      )}

                      {(mealPlan.lifecycle?.status === 'completed' ||
                        mealPlan.lifecycle?.status === 'stopped') && (
                        <button
                          type="button"
                          onClick={handleActivatePlan}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            background: '#059669',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <RefreshCw size={13} /> Reactivate Plan
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleExportToCasePrep}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '10px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          color: '#166534',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <FileText size={13} /> Export to Case Prep
                      </button>

                      {archivedPlans.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowArchivedPlansModal(true)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            color: '#475569',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Archive size={13} /> Past Plans ({archivedPlans.length})
                        </button>
                      )}
                    </div>
                  </div>

                  {mealPlan.lifecycle?.status === 'stopped' && mealPlan.lifecycle.stopReason && (
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#FFF1F2',
                        border: '1px solid #FECDD3',
                        fontSize: '12.5px',
                        color: '#9F1239',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertCircle size={15} color="#BE123C" />
                      <span>
                        <strong>Stopped Reason:</strong>{' '}
                        {PLAN_STOP_REASON_LABELS[mealPlan.lifecycle.stopReason] ||
                          mealPlan.lifecycle.stopReason}
                        {mealPlan.lifecycle.stopReasonDetails
                          ? ` — "${mealPlan.lifecycle.stopReasonDetails}"`
                          : ''}
                      </span>
                    </div>
                  )}

                  {/* Non-destructive History Retention Guarantee */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11.5px',
                      color: '#64748B',
                      background: '#F8FAFC',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #F1F5F9',
                    }}
                  >
                    <ShieldCheck size={14} color="#059669" />
                    <span>
                      <strong>Non-destructive history retention:</strong> Changing, pausing, or
                      stopping a plan never alters past daily food logs or recorded reactions. Past
                      logs remain permanently intact in your calendar.
                    </span>
                  </div>
                </div>

                {/* Day selector tabs */}
                <div
                  role="tablist"
                  aria-label="7-Day Plan Days"
                  className="hide-scrollbar scrollable-row"
                  style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {normalizedPlanDays.map((day: any, idx: number) => {
                    const dayNum = day.day || idx + 1;
                    const isSelected = selectedPlanDay === dayNum;
                    return (
                      <button
                        key={idx}
                        role="tab"
                        aria-selected={isSelected}
                        aria-label={`Day ${dayNum}`}
                        onClick={() => {
                          triggerHapticLight();
                          setSelectedPlanDay(dayNum);
                        }}
                        style={{
                          flexShrink: 0,
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
                      <h3
                        style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                      >
                        Day {currentSelectedDayObj.day || selectedPlanDay} Nutritional Blueprint
                      </h3>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Flame size={15} color="#F59E0B" />{' '}
                          {currentSelectedDayObj.total_calories ||
                            (currentSelectedDayObj as any).totalCalories ||
                            profile.targetCalories}{' '}
                          kcal
                        </span>

                        <button
                          onClick={() => {
                            triggerHapticSuccess();
                            const mealsToLog = currentSelectedDayObj.meals || [];
                            const updatedLogs = { ...foodLogs };
                            updatedLogs[currentDate] = updatedLogs[currentDate]
                              ? [...updatedLogs[currentDate]]
                              : [];

                            mealsToLog.forEach((m: any) => {
                              updatedLogs[currentDate].push({
                                name: m.name,
                                portion: m.portion || '1 serving',
                                calories: m.calories || 300,
                                protein: m.protein || 15,
                                carbs: m.carbs || 40,
                                fat: m.fat || 10,
                                emoji: m.emoji || '🍽️',
                                type: m.type || 'Meal',
                                id: Date.now() + Math.random(),
                              });
                            });
                            setFoodLogs(updatedLogs);
                            awardPoints(
                              2,
                              '🍏 Logged Full Meal Plan Day',
                              'lifestyle',
                              `diet_day_${currentDate}`
                            );
                            toast.success(
                              'Meals Logged',
                              `Day ${currentSelectedDayObj.day || selectedPlanDay} meals added to today's food log!`
                            );
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

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile
                          ? '1fr'
                          : 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: '16px',
                      }}
                    >
                      {(currentSelectedDayObj.meals || []).map(
                        (meal: MealPlanItem, mIdx: number) => {
                          const dayNum = currentSelectedDayObj.day || selectedPlanDay;
                          const multiplier = meal.servingMultiplier || 1.0;
                          return (
                            <div
                              key={meal.id || mIdx}
                              style={{
                                background: '#F8FAFC',
                                borderRadius: '16px',
                                padding: '18px',
                                border: '1px solid #E2E8F0',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '12px',
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '6px',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      color: '#059669',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.8px',
                                    }}
                                  >
                                    {meal.type}
                                  </span>

                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditMeal(dayNum, meal)}
                                      title="Edit meal content or portions"
                                      style={{
                                        background: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#475569',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <Edit2 size={11} /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSwappingMeal({ day: dayNum, meal })}
                                      title="Clinically swap this meal"
                                      style={{
                                        background: '#ECFDF5',
                                        border: '1px solid #A7F3D0',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: '#065F46',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                      }}
                                    >
                                      <RefreshCw size={11} /> Swap
                                    </button>
                                  </div>
                                </div>

                                <h4
                                  style={{
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    color: '#0F172A',
                                    margin: '0 0 6px 0',
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {meal.name}
                                </h4>

                                {meal.isSwapped && meal.originalName && (
                                  <div
                                    style={{
                                      fontSize: '11px',
                                      background: '#EFF6FF',
                                      color: '#1D4ED8',
                                      border: '1px solid #BFDBFE',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      marginBottom: '8px',
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    <strong>Swapped from:</strong> {meal.originalName}
                                    {meal.swapRationale ? ` · ${meal.swapRationale}` : ''}
                                  </div>
                                )}

                                {meal.description && (
                                  <p
                                    style={{
                                      fontSize: '12px',
                                      color: '#64748B',
                                      margin: '0 0 10px 0',
                                      lineHeight: 1.5,
                                    }}
                                  >
                                    {meal.description}
                                  </p>
                                )}
                              </div>

                              {/* Serving Multiplier Selector */}
                              <div>
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '6px',
                                  }}
                                >
                                  <span
                                    style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}
                                  >
                                    Serving: {meal.portion || '1 serving'}
                                  </span>
                                  <div style={{ display: 'flex', gap: '3px' }}>
                                    {[0.5, 1.0, 1.5, 2.0].map((mult) => (
                                      <button
                                        key={mult}
                                        type="button"
                                        onClick={() =>
                                          handleServingMultiplierChange(dayNum, meal.id, mult)
                                        }
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          border:
                                            multiplier === mult
                                              ? '1px solid #059669'
                                              : '1px solid #E2E8F0',
                                          background: multiplier === mult ? '#ECFDF5' : '#FFFFFF',
                                          color: multiplier === mult ? '#065F46' : '#64748B',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        {mult}x
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingTop: '8px',
                                    borderTop: '1px solid #E2E8F0',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                  }}
                                >
                                  <span style={{ color: '#059669', fontWeight: 700 }}>
                                    {meal.calories} kcal
                                  </span>
                                  <span style={{ color: '#94A3B8', fontSize: '11.5px' }}>
                                    P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Portion and Nutrient Disclaimer & Clinical Guardrail */}
                    <div
                      style={{
                        marginTop: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontSize: '12px',
                          color: '#475569',
                          lineHeight: 1.5,
                        }}
                      >
                        <Info
                          size={16}
                          color="#64748B"
                          style={{ flexShrink: 0, marginTop: '2px' }}
                        />
                        <span>
                          <strong>Portion & Nutrient Estimates:</strong>{' '}
                          {PORTION_ESTIMATE_DISCLAIMER}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          background: '#FEF2F2',
                          border: '1px solid #FEE2E2',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontSize: '12px',
                          color: '#991B1B',
                          lineHeight: 1.5,
                        }}
                      >
                        <ShieldCheck
                          size={16}
                          color="#DC2626"
                          style={{ flexShrink: 0, marginTop: '2px' }}
                        />
                        <span>
                          <strong>Clinical Safety Guardrail:</strong> {CLINICAL_SAFETY_GUARDRAIL}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: SMART GROCERY LIST */}
        {activeTab === 'grocery' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
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
                <h2
                  style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 4px 0',
                  }}
                >
                  Smart Grocery Shopping List
                </h2>
                <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                  Categorized grocery checklist mapped to your 7-day meal plan. Check off items as
                  you shop.
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
                    opacity: isGeneratingGrocery ? 0.7 : 1,
                  }}
                >
                  {isGeneratingGrocery ? (
                    <Loader2 size={16} className="spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
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

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '20px',
              }}
            >
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '14px',
                      }}
                    >
                      <h3
                        style={{
                          fontSize: '15.5px',
                          fontWeight: 800,
                          color: '#0F172A',
                          margin: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>{cat.emoji}</span> {cat.category}
                      </h3>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: done === total ? '#059669' : '#64748B',
                        }}
                      >
                        {done} / {total}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {cat.items.map((item: any) => (
                        <div
                          key={item.id}
                          role="checkbox"
                          aria-checked={item.checked}
                          aria-label={item.name}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleGroceryItem(catIdx, item.id);
                            }
                          }}
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
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
                <h2
                  style={{
                    fontSize: isMobile ? '20px' : '24px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 4px 0',
                  }}
                >
                  Nutritional Guardrails & Bio-Compatibility Matrix
                </h2>
                <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
                  AI-assisted food-plan checks using the profile details you supplied. Verify
                  allergies, restrictions, and changes with a qualified clinician or dietitian.
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
                    <>
                      <Loader2 size={15} className="spin" /> Synthesizing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />{' '}
                      {guardrails.length > 0 ? 'Update Guardrails' : 'Create Guardrails'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {guardrails.length === 0 && !isGeneratingGuardrails ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#F1F5F9',
                    color: '#64748B',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 18px auto',
                  }}
                >
                  <ShieldCheck size={32} />
                </div>
                <h3
                  style={{
                    fontSize: '19px',
                    fontWeight: 800,
                    color: '#0F172A',
                    margin: '0 0 8px 0',
                  }}
                >
                  Matrix Offline
                </h3>
                <p
                  style={{
                    color: '#64748B',
                    fontSize: '14.5px',
                    maxWidth: '440px',
                    margin: '0 auto 24px auto',
                    lineHeight: 1.6,
                  }}
                >
                  Create editable planning guardrails from the information you entered. These are AI
                  suggestions, not confirmation that a meal is safe or clinically appropriate.
                </p>
                <button
                  onClick={handleGenerateGuardrails}
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    color: '#FFF',
                    border: 'none',
                    padding: '14px 28px',
                    borderRadius: '14px',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: 'pointer',
                  }}
                >
                  Initialize Matrix
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: '20px',
                }}
              >
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

                  if (gr.color === 'orange') {
                    bgColor = '#FEF3C7';
                    iconColor = '#D97706';
                    targetColor = '#D97706';
                  }
                  if (gr.color === 'blue') {
                    bgColor = '#EFF6FF';
                    iconColor = '#2563EB';
                    targetColor = '#2563EB';
                  }
                  if (gr.color === 'green') {
                    bgColor = '#ECFDF5';
                    iconColor = '#059669';
                    targetColor = '#059669';
                  }
                  if (gr.color === 'purple') {
                    bgColor = '#F3E8FF';
                    iconColor = '#7E22CE';
                    targetColor = '#7E22CE';
                  }
                  if (gr.color === 'red') {
                    bgColor = '#FEE2E2';
                    iconColor = '#DC2626';
                    targetColor = '#DC2626';
                  }

                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '24px',
                        padding: '24px',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          marginBottom: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: bgColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: iconColor,
                          }}
                        >
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <h3
                            style={{
                              fontSize: '16px',
                              fontWeight: 800,
                              color: '#0F172A',
                              margin: 0,
                            }}
                          >
                            {gr.title}
                          </h3>
                          <span style={{ fontSize: '12px', color: targetColor, fontWeight: 700 }}>
                            {gr.target}
                          </span>
                        </div>
                      </div>
                      <p
                        style={{
                          fontSize: '13.5px',
                          color: '#475569',
                          lineHeight: 1.6,
                          margin: '0 0 12px 0',
                        }}
                      >
                        {gr.description}
                      </p>
                      <div
                        style={{
                          fontSize: '12px',
                          background: '#F8FAFC',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          color: '#334155',
                        }}
                      >
                        <strong>Key Nutrients:</strong> {gr.keyNutrients}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: LONGEVITY BIO-STACK */}
        {activeTab === 'longevity' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LongevityBioStackCard />
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
                  role="dialog"
                  aria-modal="true"
                  aria-label="Log Meal"
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
                      width: '44px',
                      height: '44px',
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

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px',
                    }}
                  >
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
                      <h3
                        style={{ fontSize: '19px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                      >
                        Log Meal / Nutrition
                      </h3>
                      <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
                        AI-assisted estimates • verify labels and portions
                      </span>
                    </div>
                  </div>

                  {/* Meal type selection */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '6px',
                      margin: '18px 0 14px 0',
                      flexWrap: 'wrap',
                    }}
                  >
                    {['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner'].map(
                      (type) => (
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
                      )
                    )}
                  </div>

                  {/* Quick Presets */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: '8px',
                      }}
                    >
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

                  {/* 1-Tap Pantry Staples */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: '6px',
                      }}
                    >
                      🥗 1-Tap Pantry Staples (Tap to append):
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {PANTRY_STAPLES.map((staple) => (
                        <button
                          key={staple.name}
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setFoodInput((prev) =>
                              prev.trim() ? `${prev.trim()}, ${staple.name}` : staple.name
                            );
                          }}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            border: '1px solid #E2E8F0',
                            background: '#FFFFFF',
                            color: '#334155',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F0FDFA')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#FFFFFF')}
                        >
                          <span>{staple.emoji}</span> {staple.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Latency / Reaction Window Chips */}
                  <div style={{ marginBottom: '14px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                        ⏱️ Post-Meal Reaction Window:
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#0D9488' }}>
                        TriggerBite Latency
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {(['<30m Acute', '1–2h Postprandial', '4h+ Delayed'] as const).map((lat) => (
                        <button
                          key={lat}
                          type="button"
                          onClick={() => {
                            triggerHapticLight();
                            setMealLatency(lat);
                          }}
                          style={{
                            padding: '5px 11px',
                            borderRadius: '999px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            border:
                              mealLatency === lat ? '1.5px solid #0D9488' : '1px solid #E2E8F0',
                            background: mealLatency === lat ? '#CCFBF1' : '#FFFFFF',
                            color: mealLatency === lat ? '#0F766E' : '#475569',
                          }}
                        >
                          {lat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Natural Language Input */}
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <label
                      htmlFor="dietician-food-input"
                      style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: '6px',
                      }}
                    >
                      Or type in plain English / Hindi:
                    </label>
                    <textarea
                      id="dietician-food-input"
                      aria-label="Meal items in plain English or Hindi"
                      value={foodInput}
                      onChange={(e) => setFoodInput(e.target.value)}
                      placeholder="e.g. 2 whole wheat rotis with 1 bowl of moong dal, a small bowl of curd, and cucumber salad..."
                      style={{
                        width: '100%',
                        height: '100px',
                        padding: '14px',
                        borderRadius: '16px',
                        border: '1.5px solid #CCFBF1',
                        background: '#FFFFFF',
                        fontSize: '14.5px',
                        fontFamily: 'inherit',
                        outline: 'none',
                        resize: 'none',
                        color: '#0F172A',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Live Biochemical Trigger Sensitivity Warning */}
                  {foodInput.trim().length > 2 && (
                    <div
                      style={{
                        marginBottom: '16px',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: '#0F766E',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase',
                          marginBottom: '6px',
                        }}
                      >
                        TriggerBite Biochemical Guard
                      </div>
                      {detectedTriggers.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {detectedTriggers.map((t) => (
                            <span
                              key={t.label}
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                color: t.color,
                                background: t.bg,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>{t.icon}</span> {t.label}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#059669',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span>🛡️</span> Clinically Low Flare Risk detected
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleAddFood}
                    disabled={isAnalyzingFood || !foodInput.trim()}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background:
                        isAnalyzingFood || !foodInput.trim()
                          ? '#E2E8F0'
                          : 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                      color: isAnalyzingFood || !foodInput.trim() ? '#94A3B8' : '#FFF',
                      border: 'none',
                      borderRadius: '14px',
                      fontWeight: 800,
                      fontSize: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: isAnalyzingFood || !foodInput.trim() ? 'not-allowed' : 'pointer',
                      boxShadow:
                        isAnalyzingFood || !foodInput.trim()
                          ? 'none'
                          : '0 6px 20px rgba(13, 148, 136, 0.35)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {isAnalyzingFood ? (
                      <>
                        <Loader2 size={18} className="spin" /> Estimating meal details…
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
                padding: '20px',
              }}
              onClick={() => setShowResetDietConfirm(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Reset Diet Profile"
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
                  border: '1px solid #F1F5F9',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: '#FEE2E2',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <Trash2 size={24} />
                </div>
                <h3
                  style={{ margin: '0 0 8px', fontSize: '18px', color: '#0F172A', fontWeight: 700 }}
                >
                  Reset Diet Profile & Plan?
                </h3>
                <p
                  style={{
                    margin: '0 0 24px',
                    fontSize: '14px',
                    color: '#64748B',
                    lineHeight: 1.5,
                  }}
                >
                  This will reset your personalized diet profile, active meal plans, grocery
                  checklist, and food logs for this profile.
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
                      toast.success(
                        'Diet Profile Reset',
                        'Your diet plan and profile targets have been reset.'
                      );
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: '12px',
                      background: '#EF4444',
                      color: '#FFF',
                      border: 'none',
                      fontWeight: 650,
                      cursor: 'pointer',
                    }}
                  >
                    Reset Diet
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Onboarding Wizard Edit Overlay */}
        <AnimatePresence>
          {isEditingProfile && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Edit Diet Profile"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1100,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                overflowY: 'auto',
              }}
            >
              <div
                style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}
              >
                <OnboardingWizard
                  initialData={profile}
                  onCancel={() => setIsEditingProfile(false)}
                  onComplete={(data) => {
                    handleSaveProfile(data);
                    setIsEditingProfile(false);
                  }}
                />
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Saved Meals Modal */}
        <AnimatePresence>
          {showSavedMealsModal && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1050,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
              }}
              onClick={() => setShowSavedMealsModal(false)}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label="Saved Meals"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  width: '100%',
                  maxWidth: '560px',
                  maxHeight: '85vh',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  border: '1px solid #E2E8F0',
                  overflow: 'hidden',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: 'rgba(5, 150, 105, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669',
                      }}
                    >
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <h3
                        style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                      >
                        Saved Meals Library
                      </h3>
                      <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                        Quick-log your curated &amp; plan-derived meals
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSavedMealsModal(false)}
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: '#F1F5F9',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: '#64748B',
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                <div
                  style={{
                    padding: '20px 24px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {dynamicPresets.map((preset: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: '16px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <span style={{ fontSize: '24px', flexShrink: 0 }}>{preset.emoji}</span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 750,
                              fontSize: '14px',
                              color: '#0F172A',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {preset.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            {preset.calories} kcal · {preset.protein}g P · {preset.carbs}g C ·{' '}
                            {preset.fat}g F · {preset.portion}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleAddPreset(preset);
                          setShowSavedMealsModal(false);
                          toast.success('Meal Logged', `Logged ${preset.name} to today's diary.`);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          background: '#059669',
                          color: '#FFFFFF',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(5, 150, 105, 0.25)',
                        }}
                      >
                        Log Meal
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Package 7: Stop Plan Modal with Structured Reasons */}
        <AnimatePresence>
          {showStopPlanModal && (
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
              <FocusTrap isActive={showStopPlanModal}>
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
                  onClick={() => setShowStopPlanModal(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Stop Meal Blueprint"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: isMobile ? '20px' : '28px',
                    width: '100%',
                    maxWidth: '520px',
                    position: 'relative',
                    zIndex: 1001,
                    boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#FFF1F2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#BE123C',
                        }}
                      >
                        <StopCircle size={20} />
                      </div>
                      <div>
                        <h3
                          style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                        >
                          Stop Meal Blueprint
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                          Record why this blueprint was discontinued for your clinical records.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStopPlanModal(false)}
                      style={{
                        background: '#F1F5F9',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748B',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                      Reason for Stopping:
                    </label>
                    <select
                      value={selectedStopReason}
                      onChange={(e) => setSelectedStopReason(e.target.value as PlanStopReason)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        background: '#FFFFFF',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {Object.entries(PLAN_STOP_REASON_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                      Additional Notes (Optional):
                    </label>
                    <textarea
                      value={stopReasonDetails}
                      onChange={(e) => setStopReasonDetails(e.target.value)}
                      placeholder="e.g. Caused bloating after day 3 dinners, or clinician advised higher sodium..."
                      rows={3}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        color: '#0F172A',
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* History Safety Assurance */}
                  <div
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#475569',
                      lineHeight: 1.5,
                    }}
                  >
                    <ShieldCheck
                      size={16}
                      color="#059669"
                      style={{ flexShrink: 0, marginTop: '2px' }}
                    />
                    <span>
                      <strong>Non-Destructive Guarantee:</strong> Stopping this blueprint archives
                      it safely. All past daily food logs, symptom reactions, and calendar records
                      remain 100% intact.
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      marginTop: '6px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowStopPlanModal(false)}
                      style={{
                        padding: '9px 16px',
                        borderRadius: '10px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Keep Active
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmStopPlan}
                      style={{
                        padding: '9px 18px',
                        borderRadius: '10px',
                        background: '#BE123C',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <StopCircle size={14} /> Stop Blueprint
                    </button>
                  </div>
                </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>

        {/* Package 7: Edit Meal Modal */}
        <AnimatePresence>
          {editingMeal && (
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
              <FocusTrap isActive={!!editingMeal}>
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
                  onClick={() => setEditingMeal(null)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Edit Meal"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: isMobile ? '20px' : '28px',
                    width: '100%',
                    maxWidth: '520px',
                    position: 'relative',
                    zIndex: 1001,
                    boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#ECFDF5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#059669',
                        }}
                      >
                        <Edit2 size={18} />
                      </div>
                      <div>
                        <h3
                          style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                        >
                          Edit Day {editingMeal.day} Meal
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                          Adjust meal contents, portion assumptions, and estimated macros.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingMeal(null)}
                      style={{
                        background: '#F1F5F9',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748B',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Meal Name
                    </label>
                    <input
                      type="text"
                      value={editMealForm.name}
                      onChange={(e) =>
                        setEditMealForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Portion Assumption
                    </label>
                    <input
                      type="text"
                      value={editMealForm.portion}
                      onChange={(e) =>
                        setEditMealForm((prev) => ({ ...prev, portion: e.target.value }))
                      }
                      placeholder="e.g. 1 bowl (300g) or 2 medium slices"
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                        Calories (kcal)
                      </label>
                      <input
                        type="number"
                        value={editMealForm.calories}
                        onChange={(e) =>
                          setEditMealForm((prev) => ({
                            ...prev,
                            calories: Number(e.target.value) || 0,
                          }))
                        }
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                        Protein (g)
                      </label>
                      <input
                        type="number"
                        value={editMealForm.protein}
                        onChange={(e) =>
                          setEditMealForm((prev) => ({
                            ...prev,
                            protein: Number(e.target.value) || 0,
                          }))
                        }
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                        Carbs (g)
                      </label>
                      <input
                        type="number"
                        value={editMealForm.carbs}
                        onChange={(e) =>
                          setEditMealForm((prev) => ({
                            ...prev,
                            carbs: Number(e.target.value) || 0,
                          }))
                        }
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                        Fat (g)
                      </label>
                      <input
                        type="number"
                        value={editMealForm.fat}
                        onChange={(e) =>
                          setEditMealForm((prev) => ({ ...prev, fat: Number(e.target.value) || 0 }))
                        }
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                      Description / Recipe Notes
                    </label>
                    <textarea
                      value={editMealForm.description}
                      onChange={(e) =>
                        setEditMealForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={2}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '10px',
                      marginTop: '6px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setEditingMeal(null)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditMeal}
                      style={{
                        padding: '8px 18px',
                        borderRadius: '10px',
                        background: '#059669',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>

        {/* Package 7: Clinical Dietary Swaps Modal */}
        <AnimatePresence>
          {swappingMeal && (
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
              <FocusTrap isActive={!!swappingMeal}>
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
                  onClick={() => setSwappingMeal(null)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Clinical Dietary Swap"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: isMobile ? '20px' : '28px',
                    width: '100%',
                    maxWidth: '560px',
                    position: 'relative',
                    zIndex: 1001,
                    boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    maxHeight: 'calc(100vh - 120px)',
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#ECFDF5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#059669',
                        }}
                      >
                        <RefreshCw size={18} />
                      </div>
                      <div>
                        <h3
                          style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                        >
                          Clinical Dietary Swap
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                          Replace <strong>{swappingMeal.meal.name}</strong> with a tolerance-tested
                          clinical alternative.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSwappingMeal(null)}
                      style={{
                        background: '#F1F5F9',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748B',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                    Select a Clinically Rationalized Swap:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {getAllClinicalDietarySwaps().map((swap, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 700,
                              color: '#0F172A',
                              marginBottom: '2px',
                            }}
                          >
                            {swap.smartReplacement}
                          </div>
                          <div
                            style={{
                              fontSize: '11.5px',
                              color: '#059669',
                              fontWeight: 600,
                              marginBottom: '4px',
                            }}
                          >
                            Category: {swap.category.replace('_', ' ')} · Triggers:{' '}
                            {swap.triggerName}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>
                            {swap.biologicalMechanism}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplySwap(swap)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#059669',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Apply Swap
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Custom Swap */}
                  <div
                    style={{
                      borderTop: '1px solid #E2E8F0',
                      paddingTop: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
                      Or Enter a Custom Replacement:
                    </div>
                    <input
                      type="text"
                      placeholder="Replacement food / dish name..."
                      value={customSwapName}
                      onChange={(e) => setCustomSwapName(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Reason / rationale (optional)..."
                      value={customSwapRationale}
                      onChange={(e) => setCustomSwapRationale(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                      }}
                    />
                    <button
                      type="button"
                      disabled={!customSwapName.trim()}
                      onClick={handleApplyCustomSwap}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: customSwapName.trim() ? '#0F172A' : '#E2E8F0',
                        color: customSwapName.trim() ? '#FFFFFF' : '#94A3B8',
                        border: 'none',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: customSwapName.trim() ? 'pointer' : 'not-allowed',
                        alignSelf: 'flex-end',
                      }}
                    >
                      Apply Custom Swap
                    </button>
                  </div>
                </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>

        {/* Package 7: Archived Past Plans Modal */}
        <AnimatePresence>
          {showArchivedPlansModal && (
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
              <FocusTrap isActive={showArchivedPlansModal}>
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
                  onClick={() => setShowArchivedPlansModal(false)}
                />
                <motion.div
                  role="dialog"
                  aria-modal="true"
                  aria-label="Past Nutritional Blueprints"
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '24px',
                    padding: isMobile ? '20px' : '28px',
                    width: '100%',
                    maxWidth: '560px',
                    position: 'relative',
                    zIndex: 1001,
                    boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    maxHeight: 'calc(100vh - 120px)',
                    overflowY: 'auto',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: '#F8FAFC',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#475569',
                        }}
                      >
                        <Archive size={18} />
                      </div>
                      <div>
                        <h3
                          style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}
                        >
                          Past Nutritional Blueprints
                        </h3>
                        <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                          Safely archived blueprints with full non-destructive history.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowArchivedPlansModal(false)}
                      style={{
                        background: '#F1F5F9',
                        border: 'none',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748B',
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {archivedPlans.map((archived, idx) => (
                      <div
                        key={archived.id || idx}
                        style={{
                          padding: '14px',
                          borderRadius: '14px',
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                            {archived.title || `Blueprint (${archived.days?.length || 7} Days)`}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            Archived:{' '}
                            {new Date(
                              archived.lifecycle?.updatedAt || archived.createdAt || Date.now()
                            ).toLocaleDateString()}{' '}
                            · Status: {archived.lifecycle?.status || 'archived'}
                          </div>
                          {archived.lifecycle?.stopReason && (
                            <div style={{ fontSize: '11.5px', color: '#BE123C', marginTop: '4px' }}>
                              Stop reason:{' '}
                              {PLAN_STOP_REASON_LABELS[archived.lifecycle.stopReason] ||
                                archived.lifecycle.stopReason}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestoreArchivedPlan(archived)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '8px',
                            background: '#059669',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </FocusTrap>
            </div>
          )}
        </AnimatePresence>

        {showARLens && (
          <ARGroceryLens
            onClose={() => setShowARLens(false)}
            onLogFood={(food) => {
              triggerHapticSuccess();
              const updatedLogs = { ...foodLogs };
              updatedLogs[currentDate] = updatedLogs[currentDate]
                ? [...updatedLogs[currentDate]]
                : [];
              const entry = {
                ...food,
                id: Date.now() + Math.random(),
              };
              updatedLogs[currentDate].push(entry);
              syncToUnifiedNutritionLogs(entry);
              setFoodLogs(updatedLogs);
              setShowARLens(false);
              awardPoints(5, 'AI Food Scanned & Logged', 'lifestyle', `ar_scan_${Date.now()}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
