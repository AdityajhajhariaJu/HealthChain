import {
  ACTIVITY_RULES,
  GROWTH_PER_ACTIVITY,
  ISLAND_STAGES,
  POINTS_PER_ACTIVITY,
  type ActivityFamily,
  type ActivityType,
  type IslandTheme,
} from './policy';

export interface ActivityReceipt {
  id: string;
  type: ActivityType;
  at: string;
  day: string;
}
export interface GamificationLedger {
  version: 1;
  timezone: string;
  legacyPoints: number;
  legacyLifetime: number;
  legacyGardenLevel: number;
  legacyLastTended: string;
  legacyGarden?: {
    vitalityScore: number;
    streakDays: number;
    bloomCount: number;
    waterCount: number;
  };
  legacySourceKeys: string[];
  receipts: Record<string, ActivityReceipt>;
  importedBadges: string[];
  theme: { value: IslandTheme; at: string };
}
const number = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
const gardenBaseline = (value: any = {}) => ({
  vitalityScore: Math.min(100, number(value?.vitalityScore)),
  streakDays: Math.floor(number(value?.streakDays)),
  bloomCount: Math.floor(number(value?.bloomCount)),
  waterCount: Math.floor(number(value?.waterCount)),
});
export function shiftActivityDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function activityStreak(days: Set<string>, today: string): number {
  let day = days.has(today) ? today : shiftActivityDay(today, -1),
    count = 0;
  while (days.has(day)) {
    count++;
    day = shiftActivityDay(day, -1);
  }
  return count;
}
const dayFormatters = new Map<string, Intl.DateTimeFormat>();
export function activityDay(date: Date, timezone: string): string {
  let formatter = dayFormatters.get(timezone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (dayFormatters.size >= 8) dayFormatters.clear();
    dayFormatters.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(date);
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-');
}
export function createLedger(profile: any = {}, garden: any = {}): GamificationLedger {
  const seeded =
    garden?.waterCount === 22 && garden?.breathworkMinutes === 45 && garden?.cleanMealsCount === 18;
  return {
    version: 1,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    legacyPoints: typeof profile.points === 'number' ? number(profile.points) : 5,
    legacyLifetime: Math.max(
      number(profile.points),
      (Array.isArray(profile.pointsHistory) ? profile.pointsHistory : []).reduce(
        (sum: number, entry: any) => sum + number(entry.amount),
        0
      ),
      5
    ),
    legacyGardenLevel: seeded ? 1 : Math.min(5, Math.max(1, number(garden.level))),
    legacyLastTended:
      !seeded && /^\d{4}-\d{2}-\d{2}$/.test(garden.lastWateredDate || '')
        ? garden.lastWateredDate
        : '',
    legacyGarden: gardenBaseline(seeded ? {} : garden),
    legacySourceKeys: (Array.isArray(profile.pointsHistory) ? profile.pointsHistory : [])
      .map((item: any) => item.dedupeKey)
      .filter((key: any) => typeof key === 'string' && key.length <= 256),
    receipts: {},
    importedBadges: [],
    theme: { value: 'meadow', at: '' },
  };
}
export function normalizeLedger(value: any): GamificationLedger | undefined {
  if (value?.version !== 1 || typeof value.timezone !== 'string') return;
  try {
    activityDay(new Date(), value.timezone);
  } catch {
    return;
  }
  const receipts: Record<string, ActivityReceipt> = {};
  for (const [id, item] of Object.entries(value.receipts || {}) as [string, any][]) {
    if (
      !id ||
      id.length > 256 ||
      ['__proto__', 'constructor', 'prototype'].includes(id) ||
      !Object.prototype.hasOwnProperty.call(ACTIVITY_RULES, item?.type) ||
      !Number.isFinite(Date.parse(item.at))
    )
      continue;
    if (item.day !== activityDay(new Date(item.at), value.timezone)) continue;
    receipts[id] = { id, type: item.type, at: item.at, day: item.day };
  }
  return {
    ...createLedger(),
    version: 1,
    timezone: value.timezone,
    legacyPoints: number(value.legacyPoints),
    legacyLifetime: number(value.legacyLifetime),
    legacyGardenLevel: Math.min(5, Math.max(1, number(value.legacyGardenLevel))),
    legacyLastTended: typeof value.legacyLastTended === 'string' ? value.legacyLastTended : '',
    legacyGarden: gardenBaseline(value.legacyGarden),
    receipts,
    legacySourceKeys: Array.isArray(value.legacySourceKeys)
      ? value.legacySourceKeys.filter((key: any) => typeof key === 'string' && key.length <= 256)
      : [],
    importedBadges: Array.isArray(value.importedBadges)
      ? ([
          ...new Set(
            value.importedBadges.filter(
              (item: any) => typeof item === 'string' && /^[a-z0-9_]{1,64}$/.test(item)
            )
          ),
        ] as string[])
      : [],
    theme: {
      value: ['meadow', 'blossom', 'dusk'].includes(value.theme?.value)
        ? value.theme.value
        : 'meadow',
      at: Number.isFinite(Date.parse(value.theme?.at)) ? value.theme.at : '',
    },
  };
}
export function projectLedger(ledger: GamificationLedger, now = new Date()) {
  const receipts = Object.values(ledger.receipts).sort(
    (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id)
  );
  const days = new Map<string, Set<ActivityFamily>>();
  let growth = 0,
    earned = 0;
  const history = receipts.map((receipt) => {
    const family = ACTIVITY_RULES[receipt.type].family;
    const used = days.get(receipt.day) || new Set<ActivityFamily>();
    const position = used.size;
    const eligible = !used.has(family);
    const units = eligible ? GROWTH_PER_ACTIVITY[position] || 0 : 0;
    const points = units ? POINTS_PER_ACTIVITY : 0;
    used.add(family);
    days.set(receipt.day, used);
    growth += units;
    earned += points;
    return {
      ...receipt,
      growth: units,
      points,
      title: ACTIVITY_RULES[receipt.type].title,
      category: ACTIVITY_RULES[receipt.type].category,
    };
  });
  let stage: (typeof ISLAND_STAGES)[number] = ISLAND_STAGES[0];
  for (const candidate of ISLAND_STAGES)
    if (
      (growth >= candidate.growth && days.size >= candidate.days) ||
      candidate.level <= ledger.legacyGardenLevel
    )
      stage = candidate;
  const next = ISLAND_STAGES.find((candidate) => candidate.level === stage.level + 1);
  const today = activityDay(now, ledger.timezone);
  const todayGrowth = history
    .filter((item) => item.day === today)
    .reduce((sum, item) => sum + item.growth, 0);
  const baseline = gardenBaseline(ledger.legacyGarden);
  const wateredDays = new Set(
    receipts.filter((item) => item.type === 'garden.tended').map((item) => item.day)
  );
  const calmDays = new Set(
    receipts.filter((item) => item.type === 'calm.completed').map((item) => item.day)
  );
  const gardenDays = new Set(wateredDays);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ledger.legacyLastTended)) gardenDays.add(ledger.legacyLastTended);
  let streakDay = gardenDays.has(today) ? today : shiftActivityDay(today, -1),
    gardenStreak = 0;
  while (gardenDays.has(streakDay)) {
    gardenStreak++;
    if (streakDay === ledger.legacyLastTended) {
      gardenStreak += Math.max(0, baseline.streakDays - 1);
      break;
    }
    streakDay = shiftActivityDay(streakDay, -1);
  }
  return {
    growth,
    participationDays: days.size,
    points: ledger.legacyPoints + earned,
    lifetimeEarned: ledger.legacyLifetime + earned,
    history: history.reverse(),
    stage,
    next,
    nextGrowth: next ? Math.max(0, next.growth - growth) : 0,
    nextDays: next ? Math.max(0, next.days - days.size) : 0,
    today,
    todayGrowth,
    todayFamilies: [...(days.get(today) || [])],
    tendedToday:
      ledger.legacyLastTended === today ||
      receipts.some((item) => item.type === 'garden.tended' && item.day === today),
    theme: ledger.theme.value,
    garden: {
      vitalityScore: Math.min(
        100,
        baseline.vitalityScore + wateredDays.size * 4 + calmDays.size * 6
      ),
      bloomCount: baseline.bloomCount + wateredDays.size + calmDays.size * 2,
      waterCount: baseline.waterCount + wateredDays.size,
      streakDays: gardenStreak,
      lastWateredDate: [...gardenDays].sort().pop() || '',
    },
  };
}
/** At most one receipt per action type/day; only the first in a family earns growth. */
export function recordActivity(
  ledger: GamificationLedger,
  type: ActivityType,
  sourceId: string,
  now = new Date()
) {
  const id = `${type}:${sourceId}`;
  if (
    !Object.prototype.hasOwnProperty.call(ACTIVITY_RULES, type) ||
    !sourceId ||
    id.length > 256 ||
    ledger.receipts[id]
  )
    return { ledger, added: false, points: 0, growth: 0 };
  const day = activityDay(now, ledger.timezone);
  const snapshot = projectLedger(ledger, now);
  if (type === 'garden.tended' && snapshot.tendedToday)
    return { ledger, added: false, points: 0, growth: 0 };
  if (Object.values(ledger.receipts).some((item) => item.day === day && item.type === type))
    return { ledger, added: false, points: 0, growth: 0 };
  const next = {
    ...ledger,
    receipts: { ...ledger.receipts, [id]: { id, type, day, at: now.toISOString() } },
  };
  const result = projectLedger(next, now);
  return {
    ledger: next,
    added: true,
    points: result.points - snapshot.points,
    growth: result.growth - snapshot.growth,
  };
}
/** Union immutable receipts and derive capped rewards again, including simultaneous/offline devices. */
export function mergeLedgers(local: any, remote: any): GamificationLedger | undefined {
  const l = normalizeLedger(local),
    r = normalizeLedger(remote);
  if (!l || !r) return l || r;
  const timezone = [l.timezone, r.timezone].sort()[0];
  const receipts = { ...l.receipts };
  for (const [id, receipt] of Object.entries(r.receipts))
    if (!receipts[id] || receipt.at.localeCompare(receipts[id].at) < 0) receipts[id] = receipt;
  for (const item of Object.values(receipts)) item.day = activityDay(new Date(item.at), timezone);
  return {
    ...l,
    timezone,
    receipts,
    legacyPoints: Math.max(l.legacyPoints, r.legacyPoints),
    legacyLifetime: Math.max(l.legacyLifetime, r.legacyLifetime),
    legacyGardenLevel: Math.max(l.legacyGardenLevel, r.legacyGardenLevel),
    legacyLastTended: [l.legacyLastTended, r.legacyLastTended].sort()[1] || '',
    legacyGarden: {
      vitalityScore: Math.max(l.legacyGarden!.vitalityScore, r.legacyGarden!.vitalityScore),
      streakDays:
        l.legacyLastTended === r.legacyLastTended
          ? Math.max(l.legacyGarden!.streakDays, r.legacyGarden!.streakDays)
          : (l.legacyLastTended > r.legacyLastTended ? l : r).legacyGarden!.streakDays,
      bloomCount: Math.max(l.legacyGarden!.bloomCount, r.legacyGarden!.bloomCount),
      waterCount: Math.max(l.legacyGarden!.waterCount, r.legacyGarden!.waterCount),
    },
    legacySourceKeys: [...new Set([...l.legacySourceKeys, ...r.legacySourceKeys])].sort(),
    importedBadges: [...new Set([...l.importedBadges, ...r.importedBadges])].sort(),
    theme:
      l.theme.at === r.theme.at
        ? l.theme.value > r.theme.value
          ? l.theme
          : r.theme
        : l.theme.at > r.theme.at
          ? l.theme
          : r.theme,
  };
}
