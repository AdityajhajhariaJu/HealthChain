/* Legacy catalogue quarantined: automatic substitutions and relief timelines have not received verified clinical review. */
export interface DietarySwap {
  triggerName: string;
  category: 'FODMAP' | 'HISTAMINE' | 'DAIRY' | 'ACID_REFLUX' | 'GLUTEN_GRAIN' | 'NIGHTSHADE' | 'ADDITIVE';
  offendingCompound: string;
  biologicalMechanism: string;
  smartReplacement: string;
  replacementDetails: string;
  expectedReliefTimeline: string;
}

const DIETARY_SWAPS_DATABASE: Record<string, DietarySwap> = {};

/**
 * Look up a clinical dietary swap for a suspected food.
 */
export function getClinicalDietarySwap(foodName: string): DietarySwap | null {
  if (!foodName || typeof foodName !== 'string') return null;
  const clean = foodName.trim().toLowerCase();

  if (DIETARY_SWAPS_DATABASE[clean]) {
    return DIETARY_SWAPS_DATABASE[clean];
  }

  for (const [key, data] of Object.entries(DIETARY_SWAPS_DATABASE)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keyRegex = new RegExp(`(^|[^a-z0-9])${escapedKey}([^a-z0-9]|$)`, 'i');

    const triggerClean = data.triggerName.trim().toLowerCase();
    const escapedTrigger = triggerClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const triggerRegex = new RegExp(`(^|[^a-z0-9])${escapedTrigger}([^a-z0-9]|$)`, 'i');

    if (keyRegex.test(clean) || triggerRegex.test(clean)) {
      return data;
    }
  }

  return null;
}

export function getAllClinicalDietarySwaps(): DietarySwap[] {
  return Object.values(DIETARY_SWAPS_DATABASE);
}

/**
 * Retrieves swaps filtered by category.
 */
export function getClinicalDietarySwapsByCategory(category: DietarySwap['category']): DietarySwap[] {
  return Object.values(DIETARY_SWAPS_DATABASE).filter((s) => s.category === category);
}
