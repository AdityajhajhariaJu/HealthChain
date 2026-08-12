import { Preferences } from '@capacitor/preferences';

/**
 * A hybrid storage solution for React + Capacitor.
 * It reads/writes to localStorage synchronously for immediate UI updates,
 * and asynchronously syncs to Capacitor Preferences (which is safer on native).
 */

export async function syncStorageFromPreferences() {
  try {
    const keys = await Preferences.keys();
    for (const key of keys.keys) {
      const { value } = await Preferences.get({ key });
      if (value) {
        localStorage.setItem(key, value);
      }
    }
    console.log('✅ Storage synced from Capacitor Preferences');
  } catch (e) {
    console.warn('Failed to sync from preferences', e);
  }
}

export function setItemSync(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage setItem failed (possibly quota exceeded):', e);
  }
  Preferences.set({ key, value }).catch(e => console.warn('Failed to save to preferences', e));
}

export function getItemSync(key: string): string | null {
  return localStorage.getItem(key);
}

export function removeItemSync(key: string) {
  localStorage.removeItem(key);
  Preferences.remove({ key }).catch(e => console.warn('Failed to remove from preferences', e));
}
