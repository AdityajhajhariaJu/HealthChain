const timestamp = (value) => Date.parse(value || '') || 0;
const field = (profile, key, nestedKey) => Object.prototype.hasOwnProperty.call(profile || {}, key)
  ? profile[key] : profile?.dietician?.[nestedKey];

/** A later sync of another profile field must not roll back a newer meal plan. */
export function preserveDietPlanState(merged, local, remote) {
  const localPlan = field(local, 'dietMealPlan', 'mealPlan');
  const remotePlan = field(remote, 'dietMealPlan', 'mealPlan');
  const localArchives = field(local, 'dietArchivedPlans', 'archivedPlans');
  const remoteArchives = field(remote, 'dietArchivedPlans', 'archivedPlans');
  if (localPlan === undefined && remotePlan === undefined && localArchives === undefined && remoteArchives === undefined) return merged;
  const planTime = (plan) => timestamp(plan?.updatedAt || plan?.createdAt);
  const latestReset = Math.max(timestamp(local?.dietResetAt), timestamp(remote?.dietResetAt));
  const candidates = [remotePlan, localPlan].filter(plan => plan && typeof plan === 'object');
  candidates.sort((a, b) => planTime(b) - planTime(a));
  const plan = candidates[0] || null;
  if (latestReset && latestReset >= planTime(plan)) {
    return { ...merged, dietMealPlan: null, dietArchivedPlans: [],
      dietResetAt: new Date(latestReset).toISOString(),
      dietician: { ...(merged.dietician || {}), mealPlan: null, archivedPlans: [] } };
  }
  const archives = new Map();
  for (const archived of [...(Array.isArray(remoteArchives) ? remoteArchives : []), ...(Array.isArray(localArchives) ? localArchives : [])]) {
    if (!archived?.id || archived.id === plan?.id || (latestReset && planTime(archived) <= latestReset)) continue;
    const previous = archives.get(archived.id);
    if (!previous || planTime(archived) >= planTime(previous)) archives.set(archived.id, archived);
  }
  const archivedPlans = [...archives.values()].sort((a, b) => planTime(b) - planTime(a));
  return { ...merged, dietMealPlan: plan, dietArchivedPlans: archivedPlans,
    dietician: { ...(merged.dietician || {}), mealPlan: plan, archivedPlans: archivedPlans } };
}
