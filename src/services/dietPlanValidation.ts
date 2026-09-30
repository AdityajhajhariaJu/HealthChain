export { validateGeneratedMealPlan } from '../../shared/diet-plan-validation.js';

export function hasUnverifiableDietConstraints(profile: any, coreAllergies: unknown): boolean {
  const restrictions = Array.isArray(profile?.restrictions) ? profile.restrictions : [];
  const allergies = Array.isArray(coreAllergies) ? coreAllergies : [];
  return restrictions.some((item: unknown) => typeof item === 'string' && item.trim() && !['none', 'vegetarian', 'vegan'].includes(item.toLowerCase())) || allergies.length > 0;
}
