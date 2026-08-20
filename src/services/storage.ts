import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';
import LZString from 'lz-string';

/**
 * A hybrid storage solution for React + Capacitor.
 * It reads/writes to localStorage synchronously for immediate UI updates,
 * and asynchronously syncs to Capacitor Preferences (which is safer on native).
 * 
 * Includes global transparent LZString compression for massive payloads to prevent 5MB Web quota crashes.
 */

// --- GLOBAL LOCALSTORAGE COMPRESSION PATCH ---
const originalSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  try {
    let finalValue = value;
    if (typeof value === 'string' && value.length > 50000) {
      const compressed = LZString.compressToUTF16(value);
      if (compressed.length < value.length) {
        finalValue = '??LZ??' + compressed;
      }
    }
    originalSetItem(key, finalValue);
  } catch (e) {
    console.warn(`localStorage quota exceeded for ${key}, but syncing to native Preferences anyway.`);
  }
  
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.set({ key, value }).catch(e => console.warn('Native storage error:', e));
  }
};

const originalGetItem = localStorage.getItem.bind(localStorage);
localStorage.getItem = function(key) {
  try {
    const val = originalGetItem(key);
    if (val && val.startsWith('??LZ??')) {
      return LZString.decompressFromUTF16(val.substring(6)) || val;
    }
    return val;
  } catch(e) {
    return null;
  }
};

const originalRemoveItem = localStorage.removeItem.bind(localStorage);
localStorage.removeItem = function(key) {
  originalRemoveItem(key);
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.remove({ key }).catch(e => console.warn('Native remove error:', e));
  }
};

const originalClear = localStorage.clear.bind(localStorage);
localStorage.clear = function() {
  originalClear();
  if (Capacitor.getPlatform() !== 'web') {
    Preferences.clear().catch(e => console.warn('Native clear error:', e));
  }
};
// ----------------------------------------------


let _syncing = false;

export async function syncStorageFromPreferences() {
  if (Capacitor.getPlatform() === 'web') {
    return; // Web just uses localStorage under the hood
  }

  try {
    const keys = await Preferences.keys();
    for (const key of keys.keys) {
      const { value } = await Preferences.get({ key });
      if (value) {
        // use the patched setItem so it gets compressed
        localStorage.setItem(key, value);
      }
    }
    console.log('✅ Storage synced from Capacitor Preferences');
  } catch (e) {
    console.warn('Failed to sync from preferences', e);
  }
}

export function setItemSync(key: string, value: string) {
  // uses the globally patched localStorage which handles compression
  localStorage.setItem(key, value);
}

export function getItemSync(key: string): string | null {
  // uses the globally patched localStorage which handles decompression
  return localStorage.getItem(key);
}

export function removeItemSync(key: string) {
  localStorage.removeItem(key);
}
