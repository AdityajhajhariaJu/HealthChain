import { normalizeFoodLocation } from './food-location.js';
const text = (value, limit = 80) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');
const realDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
  new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const list = (value, limit = 20) =>
  [...new Set((Array.isArray(value) ? value : []).map((item) => text(item)).filter(Boolean))].slice(
    0,
    limit
  );
export const DIET_EQUIPMENT = ['Hob', 'Oven', 'Microwave', 'Rice cooker', 'Blender', 'No cooking'];
export const DIET_PURPOSES = [
  'Meal planning',
  'Simple logging',
  'Nutrition tracking',
  'Food and symptoms',
];
export const DIET_VOICE_LANGUAGES = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'en-IN': 'English (India)',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'es-ES': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'pt-BR': 'Portuguese',
  'ja-JP': 'Japanese',
};

export function normalizeDietPreferences(raw = {}) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const travel = normalizeFoodLocation({
    countryCode: raw.travelCountryCode,
    region: raw.travelRegion,
  });
  const equipment = list(raw.equipment, 6).filter((item) => DIET_EQUIPMENT.includes(item));
  return {
    purposes: list(raw.purposes, 4).filter((item) => DIET_PURPOSES.includes(item)),
    showNumbers: raw.showNumbers !== false,
    dislikes: list(raw.dislikes),
    budget: ['Economical', 'Flexible'].includes(raw.budget) ? raw.budget : 'Flexible',
    currency: /^[A-Z]{3}$/.test(raw.currency || '') ? raw.currency : '',
    maxPrepMinutes: [15, 30, 60].includes(Number(raw.maxPrepMinutes))
      ? Number(raw.maxPrepMinutes)
      : 30,
    skill: raw.skill === 'Confident' ? 'Confident' : 'Beginner',
    equipment: equipment.includes('No cooking') ? ['No cooking'] : equipment,
    householdSize:
      Number.isInteger(Number(raw.householdSize)) &&
      Number(raw.householdSize) >= 1 &&
      Number(raw.householdSize) <= 12
        ? Number(raw.householdSize)
        : 1,
    voiceLocale: Object.hasOwn(DIET_VOICE_LANGUAGES, raw.voiceLocale || '') ? raw.voiceLocale : '',
    travelCountryCode: travel.countryCode,
    travelRegion: travel.region,
    travelUntil: realDate(raw.travelUntil) ? raw.travelUntil : '',
    usePantry: raw.usePantry === true,
  };
}

/** Only explicit non-medical preferences enter automatic recipe generation. */
export function dietPlanningPreferences(profile) {
  const value = normalizeDietPreferences(profile?.practical);
  const restrictions = Array.isArray(profile?.restrictions) ? profile.restrictions : [];
  return {
    budget: value.budget,
    maxPrepMinutes: value.maxPrepMinutes,
    skill: value.skill,
    equipment: value.equipment,
    dislikes: value.dislikes,
    dietaryPattern: restrictions.includes('Vegan')
      ? 'Vegan'
      : restrictions.includes('Vegetarian')
        ? 'Vegetarian'
        : 'Any',
  };
}

export function validPlanningPreferences(value) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          'budget',
          'maxPrepMinutes',
          'skill',
          'equipment',
          'dislikes',
          'dietaryPattern',
          'pantry',
        ].includes(key)
    )
  )
    return false;
  const p = normalizeDietPreferences(value);
  return (
    ['Economical', 'Flexible'].includes(value.budget) &&
    value.maxPrepMinutes === p.maxPrepMinutes &&
    ['Beginner', 'Confident'].includes(value.skill) &&
    Array.isArray(value.equipment) &&
    JSON.stringify(value.equipment) === JSON.stringify(p.equipment) &&
    Array.isArray(value.dislikes) &&
    JSON.stringify(value.dislikes) === JSON.stringify(p.dislikes) &&
    ['Any', 'Vegetarian', 'Vegan'].includes(value.dietaryPattern) &&
    (value.pantry === undefined ||
      (Array.isArray(value.pantry) &&
        JSON.stringify(value.pantry) === JSON.stringify(list(value.pantry, 20))))
  );
}

export function dietMealSlots(schedule) {
  const names =
    schedule === '3 Meals'
      ? ['Breakfast', 'Lunch', 'Dinner']
      : schedule === '5 Small Meals'
        ? ['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner']
        : ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
  return names.map((name) => ({ name, percent: 1 / names.length }));
}

export function mealSlotFor(type, schedule) {
  const names = dietMealSlots(schedule).map((slot) => slot.name);
  const t = String(type || '')
    .trim()
    .toLowerCase();
  if (t.includes('breakfast')) return 'Breakfast';
  if (t.includes('lunch')) return 'Lunch';
  if (t.includes('dinner') || t.includes('supper')) return 'Dinner';
  if (t.includes('snack'))
    return names.includes('Snack')
      ? 'Snack'
      : names.includes('Morning Snack')
        ? t.includes('evening')
          ? 'Evening Snack'
          : 'Morning Snack'
        : 'Other meals';
  return 'Other meals';
}

export function locationMealIdeas(countryCode, cuisine) {
  const indian = cuisine?.includes('Indian') || (cuisine === 'Local' && countryCode === 'IN');
  const byCountry = {
    JP: ['Rice, tofu and vegetables', 'Miso soup and rice', 'Soba with vegetables'],
    MX: ['Beans and corn tortillas', 'Vegetable quesadilla', 'Rice with beans and vegetables'],
    US: ['Oats, fruit and nuts', 'Bean and vegetable bowl', 'Egg and wholegrain toast'],
    GB: ['Porridge and fruit', 'Jacket potato and beans', 'Vegetable soup and bread'],
    FR: ['Yogurt, fruit and oats', 'Lentil salad and bread', 'Vegetable omelette'],
    DE: ['Wholegrain bread and cheese', 'Lentil soup', 'Potatoes and vegetables'],
  };
  return indian
    ? [
        'Dal, rice and vegetables',
        'Idli and sambar',
        'Roti and vegetable curry',
        'Khichdi and curd',
      ]
    : byCountry[countryCode] || [
        'Grain and bean bowl',
        'Oats and fruit',
        'Vegetable soup',
        'Egg or tofu with vegetables',
      ];
}
