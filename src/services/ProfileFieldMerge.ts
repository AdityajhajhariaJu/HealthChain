import { normalizeMedications } from './MedicationScheduleModel';
/** Three-way field merge. Absence, null, false, zero and empty arrays are distinct. */
const object = (v: any): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const unsafe = new Set(['__proto__', 'constructor', 'prototype']);
const claims = new Set(['isPro', 'proExpiresAt', 'is_pro', 'pro_expires_at', 'ai_token_usage', 'ai_usage_reset_date', 'access_token', 'refresh_token']);
export function cleanProfile(value: any): any {
  if (Array.isArray(value)) return value.map(cleanProfile);
  if (!object(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !unsafe.has(key) && !claims.has(key)).map(([key, val]) => [key, cleanProfile(key === 'medications' && Array.isArray(val) ? normalizeMedications(val) : val)]));
}
function stable(value: any): string {
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (object(value)) return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
export const sameProfileValue = (a: any, b: any) => stable(a) === stable(b);
export type ProfileFieldConflict = { path: string[]; local?: any; remote?: any; localMissing: boolean; remoteMissing: boolean };
export function mergeProfileFields(base: any, local: any, remote: any) {
  const conflicts: ProfileFieldConflict[] = [];
  function merge(b: any, l: any, r: any, path: string[]): any {
    // These are delivery stamps, not user-edited facts. Nested entity edit stamps remain meaningful.
    if (['updatedAt', 'demographics.updatedAt', 'dietProfile.preferencesUpdatedAt', 'dietEveryday.updatedAt', 'dietGroceryUpdatedAt', 'dietGuardrailsUpdatedAt'].includes(path.join('.')))
      return (Date.parse(l || '') || 0) > (Date.parse(r || '') || 0) ? l : r ?? l;
    if (sameProfileValue(l, b)) return r;
    if (sameProfileValue(r, b) || sameProfileValue(l, r)) return l;
    if (object(l) && object(r) && (object(b) || b === undefined)) {
      const result: Record<string, any> = {};
      for (const key of new Set([...Object.keys(b || {}), ...Object.keys(l), ...Object.keys(r)])) {
        if (unsafe.has(key) || claims.has(key)) continue;
        const value = merge(b?.[key], l[key], r[key], [...path, key]);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    // Arrays are reviewed as a field: silently unioning medications/allergies can undo removals.
    conflicts.push({ path, local: l, remote: r, localMissing: l === undefined, remoteMissing: r === undefined });
    return r;
  }
  return { merged: cleanProfile(merge(cleanProfile(base || {}), cleanProfile(local || {}), cleanProfile(remote || {}), [])), conflicts };
}
export function applyProfileChoice(data: any, field: ProfileFieldConflict, choice: 'local' | 'remote') {
  if (!Array.isArray(field.path) || !field.path.length || field.path.length > 64 || field.path.some(key => typeof key !== 'string' || unsafe.has(key))) throw new Error('Invalid profile conflict field. Reopen the review.');
  const result = structuredClone(data);
  let target = result;
  for (const key of field.path.slice(0, -1)) { if (!object(target[key])) target[key] = {}; target = target[key]; }
  const key = field.path[field.path.length - 1];
  if (field[choice + 'Missing' as 'localMissing' | 'remoteMissing']) delete target[key];
  else target[key] = structuredClone(field[choice]);
  return result;
}
export function legacyProfileData(row: any) {
  const map: Record<string, string> = { full_name: 'profileName', demographics: 'demographics', conditions: 'conditions', medications: 'medications', allergies: 'allergies', family_history: 'familyHistory', timeline: 'timeline', vitals: 'vitals', nutrition: 'nutrition', health_focus: 'healthFocus' };
  const result: any = {};
  for (const [from, to] of Object.entries(map)) if (row && Object.prototype.hasOwnProperty.call(row, from)) result[to] = row[from];
  if (row?.demographics && Object.prototype.hasOwnProperty.call(row.demographics, 'onboardingCompletedAt')) result.onboardingCompletedAt = row.demographics.onboardingCompletedAt;
  return cleanProfile(result);
}
