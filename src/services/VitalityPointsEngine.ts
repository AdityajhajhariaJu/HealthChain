import { triggerHapticSuccess } from './haptics';
import { getProfile } from './ProfileEngine';
import { getGamificationHub, reportLegacyActivity } from './GamificationHub';
import { activityStreak, shiftActivityDay } from './gamification/model';
import { getItemSync } from './storage';
import { getHabitStorageKey } from './profileScope';

export interface PointsTransaction {
  id: string;
  amount: number;
  reason: string;
  category:
    | 'welcome'
    | 'signup'
    | 'streak'
    | 'consult'
    | 'checkin'
    | 'lifestyle'
    | 'research'
    | 'milestone'
    | 'mindful'
    | 'trivia'
    | 'mystery';
  date: string;
  icon?: string;
}

export interface VitalityTier {
  level: number;
  name: string;
  min: number;
  max: number;
  badge: string;
  color: string;
  bg: string;
  perk: string;
}

export interface VitalityState {
  points: number;
  lifetimeEarned: number;
  tier: string;
  tierLevel: number;
  tierMin: number;
  tierMax: number;
  tierProgress: number;
  pointsToNextTier: number;
  history: PointsTransaction[];
  completedQuests: {
    dailyCheckin: boolean;
    lifestyleLog: boolean;
    researchSearch: boolean;
    clinicalConsult: boolean;
  };
}

export const TIERS: VitalityTier[] = [
  {
    level: 1,
    name: 'Record Starter',
    min: 0,
    max: 25,
    badge: '🥉',
    color: '#059669',
    bg: '#ECFDF5',
    perk: 'Celebrate beginning a useful, reusable health record',
  },
  {
    level: 2,
    name: 'Routine Builder',
    min: 26,
    max: 75,
    badge: '🥈',
    color: '#2563EB',
    bg: '#EFF6FF',
    perk: 'Celebrate consistent check-ins and observation logging',
  },
  {
    level: 3,
    name: 'Prepared Advocate',
    min: 76,
    max: 150,
    badge: '🥇',
    color: '#7C3AED',
    bg: '#F5F3FF',
    perk: 'Celebrate preparing records and questions for appointments',
  },
  {
    level: 4,
    name: 'Connected Historian',
    min: 151,
    max: 9999,
    badge: '💎',
    color: '#D97706',
    bg: '#FFFBEB',
    perk: 'Celebrate maintaining a connected longitudinal history',
  },
];

export function getVitalityPoints(): number {
  return getGamificationHub().points;
}

export function getVitalityState(): VitalityState {
  const hub = getGamificationHub();
  const points = hub.points;
  const earnedHistory: PointsTransaction[] = hub.history
    .filter((item) => item.points > 0)
    .map((item) => ({
      id: item.id,
      amount: item.points,
      reason: item.title,
      category: item.category,
      date: item.at,
    }));
  const legacyHistory = (getProfile()?.pointsHistory || []).filter(
    (item: any) =>
      typeof item?.id === 'string' &&
      typeof item.reason === 'string' &&
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      Number.isFinite(Date.parse(item.date))
  ) as PointsTransaction[];
  const history = [
    ...new Map([...legacyHistory, ...earnedHistory].map((item) => [item.id, item])).values(),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 120);
  const lifetimeEarned = hub.lifetimeEarned;

  let currentTier: VitalityTier = TIERS[0];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) {
      currentTier = TIERS[i];
      break;
    }
  }

  const tierSpan = currentTier.max - currentTier.min;
  const progressInTier = Math.max(0, points - currentTier.min);
  const tierProgress =
    currentTier.level === 4
      ? 100
      : Math.min(100, Math.round((progressInTier / (tierSpan + 1)) * 100));
  const pointsToNextTier = currentTier.level === 4 ? 0 : Math.max(0, currentTier.max + 1 - points);

  const today = hub.history.filter((item) => item.day === hub.today);
  const hasDailyCheckin = today.some((item) => item.type === 'record.saved');
  const hasLifestyleLog = hasDailyCheckin;
  const hasResearchSearch = today.some((item) => item.type === 'research.saved');
  const hasClinicalConsult = today.some((item) => item.type === 'preparation.saved');

  return {
    points,
    lifetimeEarned,
    tier: currentTier.name,
    tierLevel: currentTier.level,
    tierMin: currentTier.min,
    tierMax: currentTier.max,
    tierProgress,
    pointsToNextTier,
    history,
    completedQuests: {
      dailyCheckin: hasDailyCheckin,
      lifestyleLog: hasLifestyleLog,
      researchSearch: hasResearchSearch,
      clinicalConsult: hasClinicalConsult,
    },
  };
}

/** Existing feature APIs delegate all eligibility and amounts to the shared hub. */
export function awardPoints(
  amount: number,
  reason: string,
  category: PointsTransaction['category'] = 'checkin',
  dedupeKey?: string
): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  try {
    const result = reportLegacyActivity(reason, category, dedupeKey);
    if (result.points) triggerHapticSuccess();
    return result.saved && result.points > 0;
  } catch {
    return false;
  }
}
export function ensureWelcomeGrant(): void {
  getGamificationHub();
}

export function awardSignupBonus(): void {
  awardPoints(5, 'Account Created Bonus', 'signup', 'bonus_account_signup');
}

export function awardPhytoPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(2, '🌈 Phytonutrient Rainbow Shield', 'lifestyle', `phyto_${todayStr}`);
}

export function awardMicroMovementPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(2, '⚡ 90s Posture & Metabolic Flow', 'lifestyle', `movement_${todayStr}`);
}

export interface DailyStreakInfo {
  currentStreak: number;
  todayCompleted: boolean;
  isDailyRewardClaimedToday: boolean;
  weekActivity: {
    dayLabel: string;
    dateStr: string;
    isCompleted: boolean;
    isToday: boolean;
  }[];
}

export function getDailyStreak(): DailyStreakInfo {
  const hub = getGamificationHub();
  const profile = getProfile();
  const todayStr = hub.today;
  const activeDates = new Set(hub.history.map((item) => item.day));
  if (hub.garden.lastWateredDate) activeDates.add(hub.garden.lastWateredDate);
  for (const item of profile?.dailyCheckins || [])
    if (typeof item?.date === 'string') activeDates.add(item.date.slice(0, 10));
  for (const item of profile?.pointsHistory || [])
    if (
      typeof item?.date === 'string' &&
      ['checkin', 'lifestyle', 'mindful', 'streak', 'mystery'].includes(item.category)
    )
      activeDates.add(item.date.slice(0, 10));
  // Retain the earlier habit/check-in streak evidence without granting rewards.
  for (let offset = 0; offset < 60; offset++) {
    const day = shiftActivityDay(todayStr, -offset);
    try {
      const habits = JSON.parse(getItemSync(getHabitStorageKey(day)) || '{}');
      if (Object.values(habits).some(Boolean)) activeDates.add(day);
    } catch {
      /* A malformed habit cannot manufacture an active day. */
    }
  }
  const checkDayActive = (date: string) => activeDates.has(date);
  const todayCompleted = checkDayActive(todayStr);
  const isDailyRewardClaimedToday = hub.tendedToday;

  const streak = activityStreak(activeDates, todayStr);

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekActivity: DailyStreakInfo['weekActivity'] = [];

  for (let i = 6; i >= 0; i--) {
    const dateStr = shiftActivityDay(todayStr, -i);
    const d = new Date(`${dateStr}T12:00:00Z`);
    const isToday = i === 0;
    const isCompleted = checkDayActive(dateStr);
    weekActivity.push({
      dayLabel: dayNames[d.getUTCDay()],
      dateStr,
      isCompleted,
      isToday,
    });
  }

  return {
    currentStreak: streak,
    todayCompleted,
    isDailyRewardClaimedToday,
    weekActivity,
  };
}
