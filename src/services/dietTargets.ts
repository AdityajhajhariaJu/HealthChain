export interface DietTargets {
  bmr: number;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  weightKg: number;
  heightCm: number;
  targetWeightKg: number | null;
}

export type DietTargetResult =
  | { available: true; targets: DietTargets }
  | { available: false; reason: string };

const numberFrom = (value: unknown) => value === '' || value == null ? NaN : Number(value);

/** One unit-normalized estimate for setup preview, saved profile, and reload. */
export function calculateDietTargets(profile: any): DietTargetResult {
  const age = numberFrom(profile?.age);
  if (!Number.isInteger(age) || age < 18 || age > 120) {
    return { available: false, reason: 'A general calorie estimate requires an adult age from 18 to 120.' };
  }
  const sex = profile?.gender;
  if (sex !== 'male' && sex !== 'female') {
    return { available: false, reason: 'Choose the equation coefficient before calculating a target.' };
  }
  if (sex === 'female' && profile?.pregnancyStatus !== 'no') {
    return { available: false, reason: 'This general adult estimate is unavailable during pregnancy or breastfeeding, or when that status is unknown.' };
  }

  const enteredWeight = numberFrom(profile?.weight);
  const weightKg = profile?.weightUnit === 'lbs' ? enteredWeight * 0.45359237 : enteredWeight;
  const heightCm = profile?.heightUnit === 'ft'
    ? numberFrom(profile?.heightFt) * 30.48 + (profile?.heightIn === '' || profile?.heightIn == null ? 0 : numberFrom(profile.heightIn)) * 2.54
    : numberFrom(profile?.height);
  if (!Number.isFinite(weightKg) || weightKg < 25 || weightKg > 500 || !Number.isFinite(heightCm) || heightCm < 100 || heightCm > 250) {
    return { available: false, reason: 'Enter a valid measured weight and height to see an estimate.' };
  }
  if (profile?.heightUnit === 'ft' && (numberFrom(profile?.heightFt) < 3 || numberFrom(profile?.heightIn || 0) < 0 || numberFrom(profile?.heightIn || 0) >= 12)) {
    return { available: false, reason: 'Enter feet and inches with inches below 12.' };
  }

  const activity = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 } as const;
  const multiplier = activity[profile?.activityLevel as keyof typeof activity];
  if (!multiplier) return { available: false, reason: 'Choose an activity level to see an estimate.' };

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'female' ? -161 : 5);
  const tdee = bmr * multiplier;
  const goal = profile?.goal;
  if (!['Maintain', 'Lose weight', 'Gain muscle', 'Lean mass preservation'].includes(goal)) {
    return { available: false, reason: 'Choose a planning goal to see an estimate.' };
  }
  let targetCalories = tdee;
  let targetWeightKg: number | null = null;
  if (goal === 'Lose weight' || goal === 'Gain muscle') {
    const enteredTarget = numberFrom(profile?.targetWeight);
    const days = numberFrom(profile?.targetDays);
    targetWeightKg = profile?.weightUnit === 'lbs' ? enteredTarget * 0.45359237 : enteredTarget;
    if (!Number.isFinite(targetWeightKg) || targetWeightKg < 25 || targetWeightKg > 500 || !Number.isInteger(days) || days < 1 || days > 3650) {
      return { available: false, reason: 'A weight-change estimate needs a valid target weight and time period.' };
    }
    if (goal === 'Lose weight' && targetWeightKg >= weightKg) return { available: false, reason: 'The target weight must be below the current weight for this goal.' };
    if (goal !== 'Lose weight' && targetWeightKg <= weightKg) return { available: false, reason: 'The target weight must be above the current weight for this goal.' };
    const dailyChange = Math.min(Math.abs(weightKg - targetWeightKg) * 7700 / days, 1000);
    targetCalories += goal === 'Lose weight' ? -dailyChange : dailyChange;
  }
  if (!Number.isFinite(targetCalories) || targetCalories < 1200) {
    return { available: false, reason: 'These inputs produce a target outside the supported general range. Review the goal with a qualified clinician or dietitian.' };
  }
  const roundedCalories = Math.round(targetCalories);
  return { available: true, targets: {
    bmr: Math.round(bmr), tdee: Math.round(tdee), targetCalories: roundedCalories,
    targetProtein: Math.round(roundedCalories * 0.25 / 4),
    targetCarbs: Math.round(roundedCalories * 0.45 / 4),
    targetFat: Math.round(roundedCalories * 0.3 / 9),
    weightKg, heightCm, targetWeightKg,
  } };
}

export function targetFields(profile: any) {
  const result = calculateDietTargets(profile);
  return result.available
    ? { ...result.targets, targetEstimateReason: null }
    : { targetCalories: null, targetProtein: null, targetCarbs: null, targetFat: null, targetEstimateReason: result.reason };
}
