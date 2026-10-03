import type { GamificationLedger } from './model';
import { projectLedger, shiftActivityDay } from './model';
export const TROPHIES = [
  {
    slug: 'first_checkin',
    title: 'First Health Check-in',
    desc: 'First health check-in recorded.',
    icon: '📝',
    color: '#D97706',
    category: 'Check-in',
  },
  {
    slug: '3_day_streak',
    title: 'Three Check-ins Recorded',
    desc: 'Recorded check-ins on three consecutive days. Missing a day never erases history.',
    icon: '📅',
    color: '#DF7045',
    category: 'Continuity',
  },
  {
    slug: 'clinical_scholar',
    title: 'Research Reviewed',
    desc: 'Opened clinical research and explored its relevance.',
    icon: '🧬',
    color: '#059669',
    category: 'Research',
  },
  {
    slug: 'mindful_master',
    title: 'Calm Session Recorded',
    desc: 'Completed five minutes of a calming exercise.',
    icon: '🧘',
    color: '#7C3AED',
    category: 'Zen Mode',
  },
  {
    slug: 'early_bird',
    title: 'Morning Vitals Recorded',
    desc: 'Added a morning vital reading before 9 AM.',
    icon: '🌅',
    color: '#2563EB',
    category: 'Record',
  },
  {
    slug: 'night_owl',
    title: 'Evening Reflection Recorded',
    desc: 'Added a health note after 8 PM.',
    icon: '🌙',
    color: '#6366F1',
    category: 'Reflection',
  },
  {
    slug: 'iron_lungs',
    title: 'Breathing Session Recorded',
    desc: 'Completed a guided breathing reset.',
    icon: '💨',
    color: '#0891B2',
    category: 'Zen Mode',
  },
  {
    slug: 'profile_complete',
    title: 'Health Profile Organized',
    desc: 'Completed the core health profile fields used for case context.',
    icon: '🛡️',
    color: '#BE123C',
    category: 'Profile',
  },

  {
    slug: 'garden_bloom',
    title: 'First blossoms',
    desc: 'Unlocked the island flower beds.',
    icon: '🌸',
    color: '#BE718D',
    category: 'Garden',
  },
  {
    slug: 'garden_pond',
    title: 'Still waters',
    desc: 'Unlocked the island pond and bridge.',
    icon: '🪷',
    color: '#448C9A',
    category: 'Garden',
  },
  {
    slug: 'garden_retreat',
    title: 'A flourishing retreat',
    desc: 'Unlocked the pavilion and greenhouse.',
    icon: '🏡',
    color: '#67957C',
    category: 'Garden',
  },
  {
    slug: 'garden_haven',
    title: 'A cozy haven',
    desc: 'Unlocked the orchard and windmill.',
    icon: '🌳',
    color: '#927342',
    category: 'Garden',
  },
];
export function earnedTrophies(
  ledger: GamificationLedger,
  state = projectLedger(ledger)
): string[] {
  const types = new Set(Object.values(ledger.receipts).map((item) => item.type));
  const recordDays = new Set(
    Object.values(ledger.receipts)
      .filter((item) => item.type === 'record.saved')
      .map((item) => item.day)
  );
  const threeConsecutiveRecords = [...recordDays].some(
    (day) => recordDays.has(shiftActivityDay(day, -1)) && recordDays.has(shiftActivityDay(day, -2))
  );
  return [
    ...new Set([
      ...ledger.importedBadges,
      ...(types.has('record.saved') ? ['first_checkin'] : []),
      ...(threeConsecutiveRecords ? ['3_day_streak'] : []),
      ...(types.has('research.saved') ? ['clinical_scholar'] : []),
      ...(types.has('calm.completed') ? ['mindful_master'] : []),
      ...(types.has('profile.completed') ? ['profile_complete'] : []),
      ...['garden_bloom', 'garden_pond', 'garden_retreat', 'garden_haven'].slice(
        0,
        state.stage.level - 1
      ),
    ]),
  ];
}
