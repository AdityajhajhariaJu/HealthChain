import { getProfile, saveProfile } from './ProfileEngine';

export interface DietMealEntry {
  id: string | number;
  name: string;
  date?: string;
  loggedAt?: string;
  [key: string]: unknown;
}

type MealWriteResult = { ok: true; foodLogs: Record<string, DietMealEntry[]> } | { ok: false; error: 'profile_unavailable' | 'invalid_entry' | 'conflict' | 'not_found' | 'storage_failure' };

let serial: Promise<unknown> = Promise.resolve();
function serialize<T>(work: () => Promise<T>): Promise<T> {
  const next = serial.then(work, work);
  serial = next.catch(() => undefined);
  return next;
}

const sameId = (a: string | number, b: string | number) => String(a) === String(b);
const logsFrom = (profile: any): Record<string, DietMealEntry[]> => {
  const value = profile?.dietFoodLogs || profile?.dietician?.foodLogs;
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
};

/** Interim single local profile snapshot until meal observations replace legacy projections. */
export function saveDietMealEntries(localDate: string, entries: DietMealEntry[]): Promise<MealWriteResult> {
  return serialize(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate) || entries.length === 0 ||
        entries.some((item) => !item || item.id == null || !item.name?.trim())) return { ok: false, error: 'invalid_entry' };
    const profile = getProfile();
    if (!profile) return { ok: false, error: 'profile_unavailable' };
    const current = logsFrom(profile);
    const day = Array.isArray(current[localDate]) ? current[localDate] : [];
    const nutrition = Array.isArray(profile.nutrition?.recentLogs) ? profile.nutrition.recentLogs : [];
    if (entries.some((item) => day.some((old) => sameId(old.id, item.id)) || nutrition.some((old: any) => sameId(old.id, item.id)))) {
      return { ok: false, error: 'conflict' };
    }
    const dated = entries.map((item) => ({ ...item, date: localDate, loggedAt: item.loggedAt || new Date().toISOString() }));
    const foodLogs = { ...current, [localDate]: [...day, ...dated] };
    const next = {
      ...profile, dietFoodLogs: foodLogs,
      dietician: { ...(profile.dietician || {}), foodLogs },
      nutrition: { ...(profile.nutrition || {}), recentLogs: [...nutrition, ...dated.map((item) => ({ ...item, meal: item.name }))] },
    };
    await saveProfile(next);
    const confirmed = getProfile();
    if (!dated.every((item) =>
      confirmed?.dietFoodLogs?.[localDate]?.some((record: DietMealEntry) => sameId(record.id, item.id)) &&
      confirmed?.nutrition?.recentLogs?.some((record: DietMealEntry) => sameId(record.id, item.id)))) {
      return { ok: false, error: 'storage_failure' };
    }
    return { ok: true, foodLogs };
  });
}

export function deleteDietMealEntry(localDate: string, id: string | number): Promise<MealWriteResult> {
  return serialize(async () => {
    const profile = getProfile();
    if (!profile) return { ok: false, error: 'profile_unavailable' };
    const current = logsFrom(profile);
    const day = Array.isArray(current[localDate]) ? current[localDate] : [];
    if (!day.some((item) => sameId(item.id, id))) return { ok: false, error: 'not_found' };
    const foodLogs = { ...current, [localDate]: day.filter((item) => !sameId(item.id, id)) };
    const nutrition = Array.isArray(profile.nutrition?.recentLogs) ? profile.nutrition.recentLogs : [];
    await saveProfile({
      ...profile, dietFoodLogs: foodLogs,
      dietician: { ...(profile.dietician || {}), foodLogs },
      nutrition: { ...(profile.nutrition || {}), recentLogs: nutrition.filter((item: DietMealEntry) => !sameId(item.id, id)) },
    });
    const confirmed = getProfile();
    if (confirmed?.dietFoodLogs?.[localDate]?.some((item: DietMealEntry) => sameId(item.id, id)) ||
        confirmed?.nutrition?.recentLogs?.some((item: DietMealEntry) => sameId(item.id, id))) {
      return { ok: false, error: 'storage_failure' };
    }
    return { ok: true, foodLogs };
  });
}
