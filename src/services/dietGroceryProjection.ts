import type { FullMealPlan } from './dietPlanLifecycle';

export interface GroceryItem { id: string; name: string; checked: boolean; amount: number; unit: 'g' | 'ml' | 'piece'; ingredient: string }
export interface GroceryCategory { category: string; emoji: string; items: GroceryItem[] }

const keyFor = (name: string, unit: string) => `${name.trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ')}:${unit}`;
const idFor = (key: string) => `ingredient:${encodeURIComponent(key)}`;

/** Derive quantities from the active plan revision; checked state follows the stable ingredient key. */
export function projectDietGroceries(plan: FullMealPlan | null, previous: GroceryCategory[] = []): GroceryCategory[] {
  if (!plan?.days?.length) return [];
  const checked = new Map<string, boolean>();
  for (const category of Array.isArray(previous) ? previous : [])
    for (const item of Array.isArray(category?.items) ? category.items : []) checked.set(item.id, item.checked === true);
  const totals = new Map<string, { ingredient: string; amount: number; unit: GroceryItem['unit'] }>();
  for (const day of plan.days) for (const meal of day.meals || []) {
    if (!Array.isArray(meal.ingredients)) continue;
    const multiplier = Number.isFinite(meal.servingMultiplier) && meal.servingMultiplier > 0 ? meal.servingMultiplier : 1;
    for (const ingredient of meal.ingredients) {
      if (!ingredient?.name?.trim() || !Number.isFinite(ingredient.amount) || ingredient.amount <= 0 ||
        !['g', 'ml', 'piece'].includes(ingredient.unit)) continue;
      const key = keyFor(ingredient.name, ingredient.unit);
      const old = totals.get(key);
      totals.set(key, { ingredient: old?.ingredient || ingredient.name.trim(), unit: ingredient.unit,
        amount: (old?.amount || 0) + ingredient.amount * multiplier });
    }
  }
  if (!totals.size) return [];
  const items: GroceryItem[] = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const amount = Math.round(value.amount * 10) / 10;
      return { id: idFor(key), ingredient: value.ingredient, amount, unit: value.unit,
        name: `${value.ingredient} — ${amount} ${value.unit}`, checked: checked.get(idFor(key)) || false };
    });
  return [{ category: 'Plan ingredients · verify quantities', emoji: '🛒', items }];
}
