import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * A hybrid storage solution for React + Capacitor.
 * It reads/writes to localStorage synchronously for immediate UI updates,
 * and asynchronously syncs to Capacitor Preferences (which is safer on native).
 */

let _syncing = false;

export async function syncStorageFromPreferences() {
  if (Capacitor.getPlatform() === 'web') {
    return; // Web just uses localStorage under the hood, so no need to sync or patch
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

  // Globally patch localStorage to ensure ALL direct calls across the app are synced natively
  // and protected against QuotaExceeded errors (e.g. Ava Health Buddy, Dietician, Settings)
  const originalSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(key, value) {
    try {
      originalSetItem(key, value);
    } catch (e) {
      console.warn(`localStorage quota exceeded for ${key}, but syncing to native Preferences anyway.`);
    }
    
    Preferences.set({ key, value }).catch(e => console.warn('Native storage error:', e));
  };

  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function(key) {
    originalRemoveItem(key);
    
    Preferences.remove({ key }).catch(e => console.warn('Native remove error:', e));
  };

  const originalClear = localStorage.clear.bind(localStorage);
  localStorage.clear = function() {
    originalClear();
    
    Preferences.clear().catch(e => console.warn('Native clear error:', e));
  };
}

export function setItemSync(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage setItem failed (possibly quota exceeded):', e);
  }
  
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.set({ key, value }).catch(e => console.warn('Failed to save to preferences', e));
  }
}

export function getItemSync(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('localStorage getItem blocked:', e);
    return null;
  }
}

export function removeItemSync(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('localStorage removeItem blocked:', e);
  }
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.remove({ key }).catch(e => console.warn('Failed to remove from preferences', e));
  }
}
