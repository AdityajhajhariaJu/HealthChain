import { getProfileEngineState, getProfileKey } from './ProfileEngine';
import { getItemSync, removeItemSync, setItemSync } from './storage';

export interface GardenState {
  level: number;
  vitalityScore: number; // 0 - 100
  streakDays: number;
  bloomCount: number;
  waterCount: number;
  breathworkMinutes: number;
  cleanMealsCount: number;
  lastWateredDate: string;
  gardenStage: 'sprout' | 'blooming' | 'lush' | 'zen_master';
}

const GARDEN_STORAGE_KEY = 'hc_wellness_zen_garden';

function gardenStorageKey(): string {
  return `${GARDEN_STORAGE_KEY}:${getProfileKey()}:${getProfileEngineState()?.activeId || 'profile_1'}`;
}

export function getGardenState(): GardenState {
  try {
    const raw = getItemSync(gardenStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      // Self-healing: clear legacy mock seed (waterCount 22, breathworkMinutes 45, level 3)
      if (
        parsed &&
        parsed.waterCount === 22 &&
        parsed.breathworkMinutes === 45 &&
        parsed.cleanMealsCount === 18
      ) {
        removeItemSync(gardenStorageKey());
      } else {
        return parsed;
      }
    }
    const initial: GardenState = {
      level: 1,
      vitalityScore: 0,
      streakDays: 0,
      bloomCount: 0,
      waterCount: 0,
      breathworkMinutes: 0,
      cleanMealsCount: 0,
      lastWateredDate: '',
      gardenStage: 'sprout',
    };
    setItemSync(gardenStorageKey(), JSON.stringify(initial));
    return initial;
  } catch {
    return {
      level: 1,
      vitalityScore: 0,
      streakDays: 0,
      bloomCount: 0,
      waterCount: 0,
      breathworkMinutes: 0,
      cleanMealsCount: 0,
      lastWateredDate: '',
      gardenStage: 'sprout',
    };
  }
}

export function recordGardenAction(
  action: 'water' | 'breathwork' | 'clean_meal' | 'flare_free'
): GardenState {
  const current = getGardenState();
  const updated = { ...current };

  if (action === 'water') {
    const today = new Date().toLocaleDateString('en-CA');
    if (updated.lastWateredDate !== today) {
      const previousWateredDate = updated.lastWateredDate;
      const dayGap = previousWateredDate
        ? Math.round(
            (new Date(`${today}T12:00:00`).getTime() -
              new Date(`${previousWateredDate}T12:00:00`).getTime()) /
              86400000
          )
        : 0;
      updated.waterCount += 1;
      updated.vitalityScore = Math.min(100, updated.vitalityScore + 4);
      updated.bloomCount += 1;
      updated.streakDays = dayGap === 1 ? Math.max(1, updated.streakDays) + 1 : 1;
      updated.lastWateredDate = today;
    }
  } else if (action === 'breathwork') {
    updated.breathworkMinutes += 5;
    updated.vitalityScore = Math.min(100, updated.vitalityScore + 6);
    updated.bloomCount += 2;
  } else if (action === 'clean_meal') {
    updated.cleanMealsCount += 1;
    updated.vitalityScore = Math.min(100, updated.vitalityScore + 3);
  } else if (action === 'flare_free') {
    updated.streakDays += 1;
    updated.vitalityScore = Math.min(100, updated.vitalityScore + 8);
  }

  if (updated.vitalityScore >= 90) {
    updated.gardenStage = 'zen_master';
    updated.level = 5;
  } else if (updated.vitalityScore >= 75) {
    updated.gardenStage = 'lush';
    updated.level = 4;
  } else if (updated.vitalityScore >= 50) {
    updated.gardenStage = 'blooming';
    updated.level = 3;
  } else {
    updated.gardenStage = 'sprout';
    updated.level = 2;
  }

  setItemSync(gardenStorageKey(), JSON.stringify(updated));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('hc_garden_updated', { detail: updated }));
  }
  return updated;
}
