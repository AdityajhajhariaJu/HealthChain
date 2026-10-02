import { getProfile, saveProfile } from './ProfileEngine';
import { getActiveProfileScope } from './profileScope';
import { getItemSync } from './storage';
import {
  createLedger,
  activityDay,
  normalizeLedger,
  projectLedger,
  recordActivity,
  type GamificationLedger,
} from './gamification/model';
import type { ActivityType, IslandTheme } from './gamification/policy';
import { earnedTrophies, TROPHIES } from './gamification/trophies';
import { getActivityTelemetry, observeActivity } from './gamification/telemetry';

let cachedScope = '',
  cachedRaw = '',
  cachedLedger: GamificationLedger | undefined;
let cachedProjection:
  | {
      ledger: GamificationLedger;
      day: string;
      state: ReturnType<typeof projectLedger>;
      trophies: string[];
    }
  | undefined;
function persist(ledger: GamificationLedger): boolean {
  const scope = getActiveProfileScope(),
    profile = getProfile();
  profile.gamification = ledger;
  // The existing owner-scoped profile snapshot/outbox carries this field to the cloud.
  void saveProfile(profile, { gamificationOnly: true });
  const raw = JSON.stringify(getProfile().gamification);
  if (getActiveProfileScope() !== scope || raw !== JSON.stringify(ledger)) return false;
  cachedScope = scope;
  cachedRaw = raw;
  cachedLedger = ledger;
  window.dispatchEvent(new Event('hc_gamification_updated'));
  window.dispatchEvent(new Event('hc_garden_updated'));
  window.dispatchEvent(new Event('hc_points_updated'));
  return true;
}
export function getGamificationLedger(): GamificationLedger {
  const scope = getActiveProfileScope(),
    profile = getProfile(),
    gardenRaw = profile.gamification ? '' : getItemSync(`hc_wellness_zen_garden:${scope}`),
    raw = profile.gamification
      ? JSON.stringify(profile.gamification)
      : JSON.stringify([profile.points, profile.pointsHistory, gardenRaw]);
  if (scope === cachedScope && raw === cachedRaw && cachedLedger) return cachedLedger;
  const existing = normalizeLedger(profile.gamification);
  if (existing) {
    cachedScope = scope;
    cachedRaw = raw;
    cachedLedger = existing;
    return existing;
  }
  let garden: any = {};
  try {
    garden = JSON.parse(gardenRaw || '{}');
  } catch {
    /* Invalid legacy data cannot seed rewards. */
  }
  const ledger = createLedger(profile, garden);
  // Reads stay pure: migration is committed with the first explicit command.
  cachedScope = scope;
  cachedRaw = raw;
  cachedLedger = ledger;
  return ledger;
}
export function getGamificationHub() {
  const ledger = getGamificationLedger();
  const day = activityDay(new Date(), ledger.timezone);
  if (!cachedProjection || cachedProjection.ledger !== ledger || cachedProjection.day !== day) {
    const state = projectLedger(ledger);
    cachedProjection = {
      ledger,
      day,
      state,
      trophies: earnedTrophies(ledger, state).filter((slug) =>
        TROPHIES.some((trophy) => trophy.slug === slug)
      ),
    };
  }
  return {
    ...cachedProjection.state,
    trophies: cachedProjection.trophies,
    telemetry: getActivityTelemetry(),
    timezone: ledger.timezone,
  };
}
export function completeActivity(
  type: ActivityType,
  sourceId: string,
  expectedScope = getActiveProfileScope()
) {
  if (expectedScope !== getActiveProfileScope()) return { saved: false, points: 0, growth: 0 };
  observeActivity(`action:${type}`, 'completed');
  const result = recordActivity(getGamificationLedger(), type, sourceId);
  if (!result.added) return { saved: true, points: 0, growth: 0 };
  if (!persist(result.ledger)) return { saved: false, points: 0, growth: 0 };
  if (result.points) {
    const snapshot = projectLedger(result.ledger);
    const receipt = snapshot.history.find((item) => item.id === `${type}:${sourceId}`);
    window.dispatchEvent(
      new CustomEvent('hc_points_awarded', {
        detail: {
          amount: result.points,
          reason: receipt?.title,
          newTotal: snapshot.points,
          category: receipt?.category,
        },
      })
    );
  }
  return { saved: true, points: result.points, growth: result.growth };
}
export function tendIsland() {
  const state = getGamificationHub();
  return completeActivity('garden.tended', state.today);
}
export function setIslandTheme(value: IslandTheme) {
  if (!['meadow', 'blossom', 'dusk'].includes(value)) return false;
  return persist({ ...getGamificationLedger(), theme: { value, at: new Date().toISOString() } });
}
export function importEarnedTrophies(slugs: string[], expectedScope: string) {
  if (expectedScope !== getActiveProfileScope()) return;
  const ledger = getGamificationLedger(),
    importedBadges = [
      ...new Set([
        ...ledger.importedBadges,
        ...slugs.filter((slug) => /^[a-z0-9_]{1,64}$/.test(slug)),
      ]),
    ].sort();
  if (JSON.stringify(importedBadges) !== JSON.stringify([...ledger.importedBadges].sort()))
    persist({ ...ledger, importedBadges });
}
/** Compatibility for existing callers; amounts and medical wording never determine a reward. */
export function reportLegacyActivity(reason: string, category: string, key?: string) {
  const text = `${key || ''} ${reason}`.toLowerCase();
  let type: ActivityType | undefined;
  if (
    /generated|synthesis|refined|connection map|simulation|ava_consult|clinical review investigation|hydration_500|hydration_target|phyto|movement|trivia|mystery|onboarding tour|diet_log_|quick_diet_|guardrails_|diet_plan_/.test(
      text
    )
  ) {
    observeActivity(`feature:${category}`, 'completed');
    return { saved: true, points: 0, growth: 0 };
  }
  if (category === 'mindful') type = 'calm.completed';
  else if (/trial_save|saved research/.test(text)) type = 'research.saved';
  else if (
    /brief_q_update|visit_outcome|copied clinician|exported.*(archive|profile|report)/.test(text)
  )
    type = 'preparation.saved';
  else if (/profile.*(complet|initial)|dossier initialized|onboarding_init/.test(text))
    type = 'profile.completed';
  else if (/feedback|snapshot logged|photo_/.test(text)) type = 'reflection.saved';
  else if (category === 'checkin' || category === 'lifestyle') type = 'record.saved';
  if (!type) {
    observeActivity(`feature:${category}`, 'completed');
    return { saved: true, points: 0, growth: 0 };
  }
  const ledger = getGamificationLedger();
  if (key && ledger.legacySourceKeys.includes(key)) return { saved: true, points: 0, growth: 0 };
  // Explicitly keyed source events are permanent. Unkeyed UI acknowledgments share a daily key.
  const sourceId =
    type === 'profile.completed' ? 'core-profile' : key || `${type}:${projectLedger(ledger).today}`;
  return completeActivity(type, sourceId);
}
