/** Compatibility view for legacy consumers. The hub owns every new reward and growth fact. */
import { completeActivity, getGamificationHub, tendIsland } from './GamificationHub';
import { observeActivity } from './gamification/telemetry';
export interface GardenState {
  level: number;
  vitalityScore: number;
  streakDays: number;
  bloomCount: number;
  waterCount: number;
  breathworkMinutes: number;
  cleanMealsCount: number;
  lastWateredDate: string;
  gardenStage: 'sprout' | 'blooming' | 'lush' | 'zen_master';
}
export function getGardenState(): GardenState {
  const state = getGamificationHub();
  return {
    level: state.stage.level,
    vitalityScore: state.garden.vitalityScore,
    streakDays: state.garden.streakDays,
    bloomCount: state.garden.bloomCount,
    waterCount: state.garden.waterCount,
    breathworkMinutes: 0,
    cleanMealsCount: 0,
    lastWateredDate: state.garden.lastWateredDate,
    gardenStage: (['sprout', 'sprout', 'blooming', 'lush', 'zen_master'] as const)[
      state.stage.level - 1
    ],
  };
}
export function recordGardenAction(
  action: 'water' | 'breathwork' | 'clean_meal' | 'flare_free'
): GardenState {
  if (action === 'water') tendIsland();
  else if (action === 'breathwork')
    completeActivity('calm.completed', `breathwork:${getGamificationHub().today}`);
  else observeActivity(`garden:${action}`, 'completed');
  return getGardenState();
}
