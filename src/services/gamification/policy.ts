export type ActivityFamily = 'record' | 'reflect' | 'calm' | 'learn' | 'prepare';
export type ActivityType = keyof typeof ACTIVITY_RULES;
export const ACTIVITY_RULES = {
  'record.saved': { family: 'record', title: 'A useful record saved', category: 'checkin' },
  'reflection.saved': { family: 'reflect', title: 'A reflection saved', category: 'lifestyle' },
  'calm.completed': { family: 'calm', title: 'A calming session completed', category: 'mindful' },
  'garden.tended': { family: 'calm', title: 'Your island tended', category: 'mindful' },
  'research.saved': { family: 'learn', title: 'A research source saved', category: 'research' },
  'preparation.saved': {
    family: 'prepare',
    title: 'Appointment preparation saved',
    category: 'consult',
  },
  'profile.completed': {
    family: 'prepare',
    title: 'Your profile organized',
    category: 'milestone',
  },
} as const;
export const GROWTH_PER_ACTIVITY = [3, 2, 1] as const;
export const POINTS_PER_ACTIVITY = 5;
export const ISLAND_STAGES = [
  {
    level: 1,
    name: 'A little sanctuary',
    growth: 0,
    days: 0,
    unlock: 'Your cottage and resting tree',
  },
  { level: 2, name: 'First blossoms', growth: 9, days: 3, unlock: 'Flower beds and a garden path' },
  {
    level: 3,
    name: 'A peaceful pond',
    growth: 45,
    days: 10,
    unlock: 'A pond, bridge and shaded bench',
  },
  {
    level: 4,
    name: 'A flourishing retreat',
    growth: 150,
    days: 28,
    unlock: 'A pavilion, greenhouse and lanterns',
  },
  {
    level: 5,
    name: 'Your cozy haven',
    growth: 360,
    days: 60,
    unlock: 'An orchard and a little windmill',
  },
] as const;
export type IslandTheme = 'meadow' | 'blossom' | 'dusk';
export const ISLAND_THEMES = [
  {
    id: 'meadow',
    label: 'Meadow',
    sky: '#c9e8e3',
    grass: '#93be85',
    leaves: '#71a67e',
    flowers: '#e9b384',
    roof: '#dc977a',
  },
  {
    id: 'blossom',
    label: 'Blossom',
    sky: '#efd9e1',
    grass: '#adc694',
    leaves: '#dfa8b6',
    flowers: '#f3ce85',
    roof: '#bd8190',
  },
  {
    id: 'dusk',
    label: 'Golden dusk',
    sky: '#dcd5ed',
    grass: '#94a799',
    leaves: '#81968b',
    flowers: '#efd39e',
    roof: '#ad8395',
  },
] as const;
