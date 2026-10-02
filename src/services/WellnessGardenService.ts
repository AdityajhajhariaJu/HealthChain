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
    vitalityScore: state.next
      ? Math.min(100, Math.round((state.growth / state.next.growth) * 100))
      : 100,
    streakDays: state.participationDays,
    bloomCount: state.growth,
    waterCount: state.history.filter((item) => item.type === 'garden.tended').length,
    breathworkMinutes: 0,
    cleanMealsCount: 0,
    lastWateredDate: state.history.find((item) => item.type === 'garden.tended')?.day || '',
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
