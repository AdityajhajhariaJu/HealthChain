import { getProfileEngineState, getProfileKey } from './ProfileEngine';

/** Stable local-storage namespace for the signed-in account and selected profile. */
export function getActiveProfileScope(): string {
  const profileId = getProfileEngineState()?.activeId || 'profile_1';
  return `${getProfileKey()}:${profileId}`;
}

export function getScopedStorageKey(base: string): string {
  return `${base}:${getActiveProfileScope()}`;
}

export function getHabitStorageKey(date: string): string {
  return getScopedStorageKey(`healthchain_habits_${date}`);
}
