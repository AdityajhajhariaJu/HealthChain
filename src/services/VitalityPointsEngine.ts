import { getProfile, saveProfile } from './ProfileEngine';
import { triggerHapticSuccess } from './haptics';

export interface PointsTransaction {
  id: string;
  amount: number;
  reason: string;
  category: 'welcome' | 'signup' | 'streak' | 'consult' | 'checkin' | 'lifestyle' | 'research' | 'milestone' | 'mindful' | 'trivia' | 'mystery';
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
  { level: 1, name: 'Health Explorer', min: 0, max: 25, badge: '🥉', color: '#059669', bg: '#ECFDF5', perk: 'Standard AI Consults & Longitudinal Symptom Tracking' },
  { level: 2, name: 'Wellness Advocate', min: 26, max: 75, badge: '🥈', color: '#2563EB', bg: '#EFF6FF', perk: 'Advanced Biomarker Trends & Priority Processing' },
  { level: 3, name: 'Longevity Pioneer', min: 76, max: 150, badge: '🥇', color: '#7C3AED', bg: '#F5F3FF', perk: 'Multi-Specialist Deep Consensus & Predictive Patterns' },
  { level: 4, name: 'Health Master', min: 151, max: 9999, badge: '💎', color: '#D97706', bg: '#FFFBEB', perk: 'Executive Clinical Briefs & Master Tier Recognition' },
];

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return 'pts_' + crypto.randomUUID().replace(/-/g, '').substring(0, 9);
  }
  return 'pts_' + Math.random().toString(36).substr(2, 9);
};

export function getVitalityPoints(): number {
  ensureWelcomeGrant();
  const profile = getProfile();
  return typeof profile?.points === 'number' ? profile.points : 5;
}

export function getVitalityState(): VitalityState {
  ensureWelcomeGrant();
  const profile = getProfile();
  const points = typeof profile?.points === 'number' ? profile.points : 5;
  const history: PointsTransaction[] = profile?.pointsHistory || [];
  
  const lifetimeEarned = history.reduce((acc, h) => acc + (h.amount > 0 ? h.amount : 0), 0) || points;

  let currentTier: VitalityTier = TIERS[0];
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].min) {
      currentTier = TIERS[i];
      break;
    }
  }

  const tierSpan = currentTier.max - currentTier.min;
  const progressInTier = Math.max(0, points - currentTier.min);
  const tierProgress = currentTier.level === 4 ? 100 : Math.min(100, Math.round((progressInTier / (tierSpan + 1)) * 100));
  const pointsToNextTier = currentTier.level === 4 ? 0 : Math.max(0, currentTier.max + 1 - points);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTransactions = history.filter(h => h.date && h.date.startsWith(todayStr));

  const hasDailyCheckin = (profile?.dailyCheckins || []).some((c: any) => c.date && c.date.startsWith(todayStr));
  const hasLifestyleLog = (profile?.dailyCheckins || []).some((c: any) => c.date && c.date.startsWith(todayStr) && c.lifestyle && Object.keys(c.lifestyle).length > 0);
  const hasResearchSearch = todayTransactions.some(t => t.category === 'research');
  const hasClinicalConsult = todayTransactions.some(t => t.category === 'consult');

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
    }
  };
}

export function awardPoints(amount: number, reason: string, category: PointsTransaction['category'] = 'checkin', dedupeKey?: string): boolean {
  if (amount <= 0) return false;

  const profile = getProfile();
  if (!profile.pointsHistory) {
    profile.pointsHistory = [];
  }

  if (dedupeKey) {
    const exists = profile.pointsHistory.some((h: any) => h.dedupeKey === dedupeKey);
    if (exists) return false;
  }

  const currentPoints = typeof profile.points === 'number' ? profile.points : 5;
  const newPoints = currentPoints + amount;
  profile.points = newPoints;

  const transaction: PointsTransaction & { dedupeKey?: string } = {
    id: generateId(),
    amount,
    reason,
    category,
    date: new Date().toISOString(),
    dedupeKey,
  };

  profile.pointsHistory.unshift(transaction);
  if (profile.pointsHistory.length > 50) {
    profile.pointsHistory = profile.pointsHistory.slice(0, 50);
  }

  saveProfile(profile);

  try {
    triggerHapticSuccess();
  } catch {}

  window.dispatchEvent(new Event('hc_points_updated'));
  window.dispatchEvent(new CustomEvent('hc_points_awarded', {
    detail: { amount, reason, newTotal: newPoints, category }
  }));

  return true;
}

export function ensureWelcomeGrant(): void {
  try {
    const profile = getProfile();
    if (typeof profile.points !== 'number' || profile.points < 5) {
      profile.points = 5;
      if (!profile.pointsHistory) profile.pointsHistory = [];
      const hasWelcome = profile.pointsHistory.some((h: any) => h.category === 'welcome');
      if (!hasWelcome) {
        profile.pointsHistory.unshift({
          id: generateId(),
          amount: 5,
          reason: 'Welcome Health Grant',
          category: 'welcome',
          date: new Date().toISOString(),
        });
      }
      saveProfile(profile);
      window.dispatchEvent(new Event('hc_points_updated'));
    }
  } catch (e) {
    console.error('Failed to ensure welcome grant', e);
  }
}

export function awardSignupBonus(): void {
  awardPoints(5, 'Account Created Bonus', 'signup', 'bonus_account_signup');
}

export function awardMindfulPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(3, '🧘 60s Mindful HRV Reset', 'mindful', `mindful_${todayStr}`);
}

export function awardTriviaPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(2, '🧠 Longevity Brain Byte Solved', 'trivia', `trivia_${todayStr}`);
}

export function awardMysteryDrop(amount: number = 3): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(amount, `✨ Daily Mystery Drop (+${amount} PTS)`, 'mystery', `mystery_${todayStr}`);
}

export function awardMythBusterPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(2, '🔮 Clinical MythBuster Solved', 'trivia', `mythbuster_${todayStr}`);
}

export function awardPhytoPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(2, '🌈 Phytonutrient Rainbow Shield', 'lifestyle', `phyto_${todayStr}`);
}

export function awardHydrationPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(2, '💧 Optimal Cellular Osmosis Goal', 'lifestyle', `hydration_${todayStr}`);
}

export function awardMicroMovementPoints(): boolean {
  const todayStr = new Date().toISOString().split('T')[0];
  return awardPoints(2, '⚡ 90s Posture & Metabolic Flow', 'lifestyle', `movement_${todayStr}`);
}
