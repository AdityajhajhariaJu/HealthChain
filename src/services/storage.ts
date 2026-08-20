import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * A hybrid storage solution for React + Capacitor.
 * It reads/writes to localStorage synchronously for immediate UI updates,
 * and asynchronously syncs to Capacitor Preferences (which is safer on native).
 */

export async function syncStorageFromPreferences() {
  if (Capacitor.getPlatform() === 'web') {
    return; // Web just uses localStorage under the hood
  }

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
    console.warn(`localStorage quota exceeded for ${key}, but syncing to native Preferences anyway.`);
  }
  
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.set({ key, value }).catch(e => console.warn('Native storage error:', e));
  }
}

export function getItemSync(key: string): string | null {
  try {
    const val = localStorage.getItem(key);
    // Backward compatibility if any compressed strings are lingering
    if (val && val.startsWith('??LZ??')) {
      // Just return null to force a fresh fetch from cloud (safest since LZString is gone)
      return null; 
    }
    return val;
  } catch(e) {
    return null;
  }
}

export function removeItemSync(key: string) {
  localStorage.removeItem(key);
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.remove({ key }).catch(e => console.warn('Native remove error:', e));
  }
}

// Ensure clear still clears native
const originalClear = localStorage.clear.bind(localStorage);
localStorage.clear = function() {
  originalClear();
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.clear().catch(e => console.warn('Native clear error:', e));
  }
};
