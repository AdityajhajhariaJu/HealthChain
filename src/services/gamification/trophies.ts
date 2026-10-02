import type { GamificationLedger } from './model';
import { projectLedger } from './model';
export const TROPHIES = [
  {
    slug: 'first_checkin',
    title: 'First record',
    desc: 'Saved a useful personal record.',
    icon: '📝',
    color: '#D97706',
    category: 'Records',
  },
  {
    slug: '3_day_streak',
    title: 'Three days of care',
    desc: 'Participated on three days. They do not need to be consecutive.',
    icon: '🌱',
    color: '#67957C',
    category: 'Continuity',
  },
  {
    slug: 'clinical_scholar',
    title: 'A source worth keeping',
    desc: 'Saved a research source for later reference.',
    icon: '📖',
    color: '#059669',
    category: 'Learning',
  },
  {
    slug: 'mindful_master',
    title: 'A moment of calm',
    desc: 'Completed a calming session.',
    icon: '🧘',
    color: '#7C3AED',
    category: 'Calm',
  },
  {
    slug: 'early_bird',
    title: 'Morning record',
    desc: 'A previously earned morning-record milestone.',
    icon: '🌅',
    color: '#2563EB',
    category: 'Record',
  },
  {
    slug: 'night_owl',
    title: 'Evening reflection',
    desc: 'A previously earned evening-reflection milestone.',
    icon: '🌙',
    color: '#6366F1',
    category: 'Reflection',
  },
  {
    slug: 'iron_lungs',
    title: 'Breathing session',
    desc: 'A previously earned guided-breathing milestone.',
    icon: '💨',
    color: '#0891B2',
    category: 'Calm',
  },
  {
    slug: 'profile_complete',
    title: 'An organized profile',
    desc: 'Completed your core profile.',
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
  return [
    ...new Set([
      ...ledger.importedBadges,
      ...(types.has('record.saved') ? ['first_checkin'] : []),
      ...(state.participationDays >= 3 ? ['3_day_streak'] : []),
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
