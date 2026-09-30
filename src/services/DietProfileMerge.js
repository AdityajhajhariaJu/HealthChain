const timestamp = (value) => Date.parse(value || '') || 0;
const field = (profile, key, nestedKey) =>
  Object.prototype.hasOwnProperty.call(profile || {}, key)
    ? profile[key]
    : profile?.dietician?.[nestedKey];

/** A later sync of another profile field must not roll back a newer meal plan. */
function preservePlanState(merged, local, remote) {
  const localPlan = field(local, 'dietMealPlan', 'mealPlan');
  const remotePlan = field(remote, 'dietMealPlan', 'mealPlan');
  const localArchives = field(local, 'dietArchivedPlans', 'archivedPlans');
  const remoteArchives = field(remote, 'dietArchivedPlans', 'archivedPlans');
  if (
    localPlan === undefined &&
    remotePlan === undefined &&
    localArchives === undefined &&
    remoteArchives === undefined
  )
    return merged;
  const planTime = (plan) => timestamp(plan?.updatedAt || plan?.createdAt);
  const latestReset = Math.max(timestamp(local?.dietResetAt), timestamp(remote?.dietResetAt));
  const candidates = [remotePlan, localPlan].filter((plan) => plan && typeof plan === 'object');
  candidates.sort((a, b) => planTime(b) - planTime(a));
  const plan = candidates[0] || null;
  if (latestReset && latestReset >= planTime(plan)) {
    return {
      ...merged,
      dietMealPlan: null,
      dietArchivedPlans: [],
      dietResetAt: new Date(latestReset).toISOString(),
      dietician: { ...(merged.dietician || {}), mealPlan: null, archivedPlans: [] },
    };
  }
  const archives = new Map();
  for (const archived of [
    ...(Array.isArray(remoteArchives) ? remoteArchives : []),
    ...(Array.isArray(localArchives) ? localArchives : []),
  ]) {
    if (
      !archived?.id ||
      archived.id === plan?.id ||
      (latestReset && planTime(archived) <= latestReset)
    )
      continue;
    const previous = archives.get(archived.id);
    if (!previous || planTime(archived) >= planTime(previous)) archives.set(archived.id, archived);
  }
  const archivedPlans = [...archives.values()].sort((a, b) => planTime(b) - planTime(a));
  return {
    ...merged,
    dietMealPlan: plan,
    dietArchivedPlans: archivedPlans,
    dietician: { ...(merged.dietician || {}), mealPlan: plan, archivedPlans: archivedPlans },
  };
}

export function preserveDietPlanState(merged, local, remote) {
  let result = preservePlanState(merged, local, remote);
  const resetTime = Math.max(timestamp(local?.dietResetAt), timestamp(remote?.dietResetAt));
  const lp = field(local, 'dietProfile', 'profile'),
    rp = field(remote, 'dietProfile', 'profile');
  if (lp?.preferencesUpdatedAt || rp?.preferencesUpdatedAt) {
    const newest =
      timestamp(lp?.preferencesUpdatedAt) >= timestamp(rp?.preferencesUpdatedAt) ? lp : rp;
    const value = resetTime && timestamp(newest?.preferencesUpdatedAt) <= resetTime ? null : newest;
    result = {
      ...result,
      dietProfile: value,
      dietician: { ...(result.dietician || {}), profile: value },
    };
  }
  for (const [key, nested] of [
    ['dietGrocery', 'groceryList'],
    ['dietGuardrails', 'guardrails'],
  ]) {
    const stamp = `${key}UpdatedAt`;
    if (local?.[stamp] || remote?.[stamp]) {
      const newest = timestamp(local?.[stamp]) >= timestamp(remote?.[stamp]) ? local : remote;
      const value =
        resetTime && timestamp(newest[stamp]) <= resetTime ? [] : field(newest, key, nested);
      result = {
        ...result,
        [key]: value,
        [stamp]: newest[stamp],
        dietician: { ...(result.dietician || {}), [nested]: value },
      };
    }
  }
  const a = local?.dietEveryday;
  const b = remote?.dietEveryday;
  if (!a && !b) return result;
  const newest = timestamp(a?.updatedAt) >= timestamp(b?.updatedAt) ? a : b;
  const mergeRecords = (key) => {
    const records = new Map();
    for (const item of [
      ...(Array.isArray(b?.[key]) ? b[key] : []),
      ...(Array.isArray(a?.[key]) ? a[key] : []),
    ]) {
      if (!item?.id) continue;
      const old = records.get(item.id);
      if (
        !old ||
        timestamp(item.updatedAt) > timestamp(old.updatedAt) ||
        (timestamp(item.updatedAt) === timestamp(old.updatedAt) && item.deletedAt)
      )
        records.set(item.id, item);
    }
    return [...records.values()].map((item) =>
      resetTime && timestamp(item.updatedAt) <= resetTime
        ? {
            ...item,
            updatedAt: new Date(resetTime).toISOString(),
            deletedAt: item.deletedAt || new Date(resetTime).toISOString(),
          }
        : item
    );
  };
  return {
    ...result,
    dietEveryday: {
      ...newest,
      ...(resetTime && timestamp(newest?.updatedAt) <= resetTime
        ? {
            reminders: [],
            selectedPlanId: undefined,
            selectedMeals: [],
            updatedAt: new Date(resetTime).toISOString(),
          }
        : {}),
      favorites: mergeRecords('favorites'),
      pantry: mergeRecords('pantry'),
    },
  };
}
