import { mergeProfileFields } from './ProfileFieldMerge';
import { mergeGutThreads } from './GutThreadMerge';
import { preserveDietPlanState } from './DietProfileMerge';
const aliases = [['dietProfile','profile'], ['dietMealPlan','mealPlan'], ['dietArchivedPlans','archivedPlans'], ['dietGrocery','groceryList'], ['dietGuardrails','guardrails']];
function canonical(profile: any) {
  const result = { ...(profile || {}), ...(profile?.dietician ? { dietician: { ...profile.dietician } } : {}) };
  for (const [key, alias] of aliases) {
    if (!Object.prototype.hasOwnProperty.call(result, key) && Object.prototype.hasOwnProperty.call(result.dietician || {}, alias)) result[key] = result.dietician[alias];
    if (result.dietician) delete result.dietician[alias];
  }
  if (result.dietician && !Object.keys(result.dietician).length) delete result.dietician;
  return result;
}
/** Entity histories retain their established rules; user preferences merge as facts. */
export function mergeConnectedProfiles(base: any, local: any, remote: any, owner: string, profile: string) {
  const result = mergeProfileFields(canonical(base), canonical(local), canonical(remote));
  const records = preserveDietPlanState(result.merged, local, remote);
  const resolved = { ...result.merged };
  for (const key of ['dietMealPlan', 'dietArchivedPlans', 'dietResetAt']) if (Object.prototype.hasOwnProperty.call(records, key)) resolved[key] = records[key];
  const reset = Math.max(Date.parse(local?.dietResetAt || '') || 0, Date.parse(remote?.dietResetAt || '') || 0);
  const resetFields = new Set<string>();
  const l = canonical(local), r = canonical(remote);
  for (const key of ['dietProfile', 'dietGrocery', 'dietGuardrails', 'dietEveryday']) {
    const stamp = (p: any) => key === 'dietProfile' ? p[key]?.preferencesUpdatedAt : key === 'dietEveryday' ? p[key]?.updatedAt : p[key + 'UpdatedAt'];
    if (reset && reset >= Math.max(Date.parse(stamp(l) || '') || 0, Date.parse(stamp(r) || '') || 0)) {
      resetFields.add(key); if (Object.prototype.hasOwnProperty.call(records, key)) resolved[key] = records[key];
    }
  }
  if (!resetFields.has('dietEveryday') && records.dietEveryday) {
    resolved.dietEveryday = { ...(result.merged.dietEveryday || {}), favorites: records.dietEveryday.favorites, pantry: records.dietEveryday.pantry };
  }
  for (const [key, alias] of aliases) if (Object.prototype.hasOwnProperty.call(resolved, key)) resolved.dietician = { ...(resolved.dietician || {}), [alias]: resolved[key] };
  if (local?.gutResolutionThreads || remote?.gutResolutionThreads) resolved.gutResolutionThreads = mergeGutThreads(local?.gutResolutionThreads, remote?.gutResolutionThreads, `hc_unified_profile_${owner}`, profile);
  const special = new Set(['gutResolutionThreads', 'dietMealPlan', 'dietArchivedPlans', 'dietResetAt']);
  return { merged: resolved, conflicts: result.conflicts.filter(field => !special.has(field.path[0]) &&
    !(field.path[0] === 'dietEveryday' && ['favorites','pantry'].includes(field.path[1])) &&
    !resetFields.has(field.path[0])) };
}
