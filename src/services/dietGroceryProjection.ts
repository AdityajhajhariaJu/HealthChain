import type { FullMealPlan } from './dietPlanLifecycle';
import type { PantryItem } from './dietEveryday';
const planMealKey = (day: number, id: string) => `${day}:${id}`;
export interface GroceryItem {
  id: string;
  name: string;
  checked: boolean;
  amount: number;
  unit: 'g' | 'ml' | 'piece';
  ingredient: string;
  manual?: boolean;
  packageSize?: number;
  packages?: number;
  requiredAmount?: number;
  pantryUsed?: number;
}
export interface GroceryCategory {
  category: string;
  emoji: string;
  items: GroceryItem[];
}
export type GroceryOptions = {
  pantry?: PantryItem[];
  householdSize?: number;
  selectedMeals?: string[];
};
const aliases: Record<string, string> = {
  'garbanzo beans': 'chickpeas',
  chickpea: 'chickpeas',
  scallion: 'spring onion',
  scallions: 'spring onion',
  'spring onions': 'spring onion',
  cilantro: 'coriander leaves',
  'coriander leaf': 'coriander leaves',
  'bell peppers': 'bell pepper',
  capsicum: 'bell pepper',
  aubergine: 'eggplant',
  courgette: 'zucchini',
  'plain yoghurt': 'plain yogurt',
  yoghurt: 'yogurt',
  tomatoes: 'tomato',
  onions: 'onion',
  carrots: 'carrot',
  potatoes: 'potato',
  eggs: 'egg',
};
export const canonicalIngredient = (name: string) => {
  const clean = name.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
  return aliases[clean] || clean;
};
const keyFor = (name: string, unit: string) => `${canonicalIngredient(name)}:${unit}`;
const idFor = (key: string) => `ingredient:${encodeURIComponent(key)}`;
function categoryFor(name: string): string {
  if (/\b(oil|salt|spice|cumin|turmeric|cinnamon|herb|honey|sugar)\b/.test(name))
    return 'Oils, spices and pantry';
  if (/\b(milk|yogurt|curd|cheese|paneer|egg|butter)\b/.test(name)) return 'Dairy and eggs';
  if (
    /\b(chicken|fish|beef|pork|salmon|tuna|turkey|shrimp|tofu|beans|chickpeas|lentils|dal)\b/.test(
      name
    )
  )
    return 'Protein foods';
  if (/\b(rice|oats|bread|flour|pasta|noodles|roti|tortilla|quinoa|bulgur)\b/.test(name))
    return 'Grains and starches';
  if (
    /\b(tomato|onion|carrot|potato|spinach|broccoli|vegetable|fruit|apple|banana|berries|pepper|cucumber|eggplant|zucchini|avocado|leaves)\b/.test(
      name
    )
  )
    return 'Fruit and vegetables';
  return 'Other ingredients · check aisle';
}
/** Stock is subtracted once per ingredient and matching unit; consumed food is never changed. */
export function projectDietGroceries(
  plan: FullMealPlan | null,
  previous: GroceryCategory[] = [],
  options: GroceryOptions = {}
): GroceryCategory[] {
  const previousItems = (Array.isArray(previous) ? previous : []).flatMap(
    (category) => category.items || []
  );
  const byId = new Map(previousItems.map((item) => [item.id, item]));
  const household =
    Number.isInteger(options.householdSize) &&
    options.householdSize! >= 1 &&
    options.householdSize! <= 12
      ? options.householdSize!
      : 1;
  const selected = options.selectedMeals === undefined ? null : new Set(options.selectedMeals);
  const totals = new Map<
    string,
    { ingredient: string; amount: number; unit: GroceryItem['unit'] }
  >();
  for (const day of plan?.days || [])
    for (const meal of day.meals || []) {
      if (selected && !selected.has(planMealKey(day.day, meal.id))) continue;
      const multiplier =
        Number.isFinite(meal.servingMultiplier) && meal.servingMultiplier > 0
          ? meal.servingMultiplier
          : 1;
      for (const ingredient of meal.ingredients || []) {
        if (
          !ingredient?.name?.trim() ||
          !Number.isFinite(ingredient.amount) ||
          ingredient.amount <= 0 ||
          !['g', 'ml', 'piece'].includes(ingredient.unit)
        )
          continue;
        const key = keyFor(ingredient.name, ingredient.unit),
          old = totals.get(key);
        totals.set(key, {
          ingredient: old?.ingredient || canonicalIngredient(ingredient.name),
          unit: ingredient.unit,
          amount: (old?.amount || 0) + ingredient.amount * multiplier * household,
        });
      }
    }
  const stock = new Map<string, number>();
  for (const item of options.pantry || [])
    if (!item.deletedAt && Number.isFinite(item.amount) && item.amount > 0) {
      const key = keyFor(item.name, item.unit);
      stock.set(key, (stock.get(key) || 0) + item.amount);
    }
  const grouped = new Map<string, GroceryItem[]>();
  for (const [key, value] of [...totals].sort(([a], [b]) => a.localeCompare(b))) {
    const requiredAmount = Math.round(value.amount * 10) / 10;
    const pantryUsed = Math.min(requiredAmount, stock.get(key) || 0);
    const amount = Math.round((requiredAmount - pantryUsed) * 10) / 10;
    if (amount <= 0) continue;
    const id = idFor(key),
      old = byId.get(id);
    const packageSize = old?.packageSize && old.packageSize > 0 ? old.packageSize : undefined;
    const packages = packageSize ? Math.ceil(amount / packageSize) : undefined;
    const item: GroceryItem = {
      id,
      ingredient: value.ingredient,
      amount,
      unit: value.unit,
      requiredAmount,
      pantryUsed,
      packageSize,
      packages,
      name: `${value.ingredient} — ${amount} ${value.unit}${packages ? ` · ${packages} × ${packageSize} ${value.unit} packs` : ''}`,
      checked: old?.amount === amount && old.checked === true,
    };
    const category = categoryFor(value.ingredient);
    grouped.set(category, [...(grouped.get(category) || []), item]);
  }
  const manual = previousItems.filter((item) => item.manual);
  if (manual.length) grouped.set('My extra items', manual);
  return [...grouped].map(([category, items]) => ({ category, emoji: '🛒', items }));
}
