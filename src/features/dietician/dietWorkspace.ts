import { resolveFoodLocation } from '../../../shared/food-location';
import { getProfile as getCoreProfile } from '../../services/ProfileEngine';
import { targetFields } from '../../services/dietTargets';

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

// --- Constants & Helpers ---
export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Minimal ambulation' },
  { id: 'light', label: 'Light', desc: 'Active movement 1-3 days/week' },
  { id: 'moderate', label: 'Moderate', desc: 'Active physical movement 4-5 days/week' },
  { id: 'active', label: 'Very Active', desc: 'Daily functional physical activity or active work' },
];
export const RESTRICTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Lactose-free', 'None'];
export const MEDICAL_CONDITIONS = ['Diabetes', 'PCOS', 'Hypertension', 'Thyroid', 'None'];
export const CUISINES = [
  'Local',
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
    name: 'Oats with almonds and berries',
    portion: 'Amount not recorded',
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    emoji: '🥣',
    type: 'Breakfast',
  },
  {
    name: 'Dal with roti and salad',
    portion: 'Amount not recorded',
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    emoji: '🥗',
    type: 'Lunch',
  },
  {
    name: 'Avocado toast with eggs',
    portion: 'Amount not recorded',
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    emoji: '🥑',
    type: 'Breakfast',
  },
  {
    name: 'Moong dal khichdi with curd',
    portion: 'Amount not recorded',
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    emoji: '🍲',
    type: 'Dinner',
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

export function calculateTargets(p: any) {
  return targetFields(p);
}

export function withFoodLocation(p: any) {
  return {
    ...p,
    ...resolveFoodLocation(p, getCoreProfile()?.demographics),
    ...calculateTargets(p),
  };
}

export function getInitialDietProfile(): any {
  try {
    const core = getCoreProfile();
    if (core?.dietResetAt && !core?.dietProfile) return null;
    if (core?.dietician?.profile) {
      return withFoodLocation(core.dietician.profile);
    }
    if (core?.dietProfile) {
      return withFoodLocation(core.dietProfile);
    }
  } catch (e) {}
  return null;
}

export const validTabs = [
  'dashboard',
  'mealplan',
  'sensitivities',
  'calendar',
  'insights',
  'grocery',
  'guardrails',
  'longevity',
] as const;
export type DietTab = (typeof validTabs)[number];

export const resolveTabKey = (raw?: string | null): DietTab => {
  if (!raw) return 'dashboard';
  const clean = raw.trim().toLowerCase();
  if (clean === 'food-detective') return 'sensitivities';
  if (clean === 'elimination' || clean === 'elimination-suite') {
    return 'sensitivities';
  }
  if (clean === 'diet-plan') return 'mealplan';
  if ((validTabs as readonly string[]).includes(clean)) return clean as DietTab;
  return 'dashboard';
};
