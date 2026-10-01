import { normalizeDietPreferences } from '../../shared/diet-preferences';
import { getProfile, getProfileKey, saveProfile } from './ProfileEngine';

export type PantryItem = {
  id: string;
  name: string;
  amount: number;
  unit: 'g' | 'ml' | 'piece';
  updatedAt: string;
  deletedAt?: string;
};
export type FavoriteMeal = {
  id: string;
  name: string;
  type?: string;
  portion?: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  sourceId?: string;
  sourceVersion?: string;
  nutritionSource?: string;
  nutritionStatus?: string;
  originalNutritionBasis?: string;
  originalServingGrams?: number;
  originalLabelNutrients?: Record<string, number | null>;
  per100Nutrients?: Record<string, number | null>;
  amountValue?: number;
  amountUnit?: string;
  sugar?: number | null;
  fibre?: number | null;
  sodium?: number | null;
  ingredients?: any[];
  steps?: string[];
  prepMinutes?: number;
  updatedAt: string;
  deletedAt?: string;
};
export type MealReminder = {
  id: string;
  label: string;
  time: string;
  enabled: boolean;
  prepMinutes: number;
};
export type DietEveryday = {
  updatedAt?: string;
  favorites: FavoriteMeal[];
  pantry: PantryItem[];
  selectedPlanId?: string;
  selectedMeals?: string[];
  reminders?: MealReminder[];
  quietStart?: string;
  quietEnd?: string;
};
export const planMealKey = (day: number, mealId: string) => `${day}:${mealId}`;
export const emptyDietEveryday = (): DietEveryday => ({ favorites: [], pantry: [] });
export function getDietEveryday(): DietEveryday {
  const raw = getProfile()?.dietEveryday;
  return {
    ...emptyDietEveryday(),
    ...(raw || {}),
    favorites: Array.isArray(raw?.favorites) ? raw.favorites : [],
    pantry: Array.isArray(raw?.pantry) ? raw.pantry : [],
  };
}
export async function saveDietEveryday(patch: Partial<DietEveryday>): Promise<boolean> {
  const profile = getProfile();
  const key = getProfileKey();
  if (!profile) return false;
  const next = { ...getDietEveryday(), ...patch, updatedAt: new Date().toISOString() };
  await saveProfile({ ...profile, dietEveryday: next });
  return (
    getProfileKey() === key &&
    getProfile()?.id === profile.id &&
    JSON.stringify(getProfile()?.dietEveryday) === JSON.stringify(next)
  );
}
const known = (value: any) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
export function favoriteFromMeal(meal: any): FavoriteMeal {
  const multiplier =
    Number.isFinite(meal.servingMultiplier) && meal.servingMultiplier > 0
      ? meal.servingMultiplier
      : 1;
  return {
    id: crypto.randomUUID(),
    name: String(meal.name || '')
      .trim()
      .slice(0, 240),
    type: meal.type,
    portion: meal.portion,
    calories: meal.macrosNeedReview ? null : known(meal.calories),
    protein: meal.macrosNeedReview ? null : known(meal.protein),
    carbs: meal.macrosNeedReview ? null : known(meal.carbs),
    fat: meal.macrosNeedReview ? null : known(meal.fat),
    sourceId: meal.sourceId || meal.id,
    sourceVersion: meal.sourceVersion,
    nutritionSource:
      meal.nutritionSource || (meal.macrosNeedReview ? 'name_only' : 'plan_estimate'),
    nutritionStatus: meal.nutritionStatus,
    originalNutritionBasis: meal.originalNutritionBasis,
    originalServingGrams: meal.originalServingGrams,
    originalLabelNutrients: meal.originalLabelNutrients,
    per100Nutrients: meal.per100Nutrients,
    amountValue: meal.amountValue ?? meal.portionGrams,
    amountUnit: meal.amountUnit || (meal.portionGrams ? 'g' : undefined),
    sugar: meal.macrosNeedReview ? null : known(meal.sugar),
    fibre: meal.macrosNeedReview ? null : known(meal.fibre),
    sodium: meal.macrosNeedReview ? null : known(meal.sodium),
    ingredients: Array.isArray(meal.ingredients)
      ? meal.ingredients.map((item) => ({ ...item, amount: item.amount * multiplier }))
      : undefined,
    steps: meal.steps,
    prepMinutes: meal.prepMinutes,
    updatedAt: new Date().toISOString(),
  };
}
/** Reusing a food never infers density or calories from a new weight alone. */
export function reusedMealEntry(meal: any, details: any = {}) {
  const next = { ...meal, ...details };
  const amount = details.amountValue;
  const previousAmount = meal.amountValue ?? meal.portionGrams;
  const previousUnit = meal.amountUnit || (meal.portionGrams ? 'g' : undefined);
  if (amount === undefined) {
    next.amountValue = previousAmount;
    next.amountUnit = previousUnit;
    return next;
  }
  const changed = amount !== previousAmount || details.amountUnit !== previousUnit;
  if (!changed) return next;
  const matches =
    meal.per100Nutrients &&
    meal.originalNutritionBasis === (details.amountUnit === 'ml' ? 'per_100ml' : 'per_100g');
  for (const key of ['calories', 'protein', 'carbs', 'fat', 'sugar', 'fibre', 'sodium']) {
    next[key] =
      matches && known(meal.per100Nutrients[key]) !== null
        ? Math.round(meal.per100Nutrients[key] * amount) / 100
        : null;
  }
  // A changed amount invalidates the old serving's recipe quantities as well.
  if (!matches) next.ingredients = undefined;
  return next;
}
export function effectiveFoodLocation(profile: any, date: string) {
  const preferences = normalizeDietPreferences(profile?.practical);
  return preferences.travelCountryCode && preferences.travelUntil && date <= preferences.travelUntil
    ? { countryCode: preferences.travelCountryCode, region: preferences.travelRegion }
    : { countryCode: profile?.countryCode || '', region: profile?.region || '' };
}
