import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { isErasedStorageKey } from './DurableHealthStorage';

let nativeStorageQueue: Promise<unknown> = Promise.resolve();
let hydrationPromise: Promise<void> | null = null;
let hydrationChanges: Set<string> | null = null;
let hydrationCleared = false;
let clearingThroughHelper = false;
function queueNativeStorage(work: () => Promise<unknown>) {
  nativeStorageQueue = nativeStorageQueue.catch(() => {}).then(work);
  void nativeStorageQueue.catch((error) => console.warn('Native storage error:', error));
}
export async function flushNativeStorage() {
  await nativeStorageQueue;
}

/**
 * A hybrid storage solution for React + Capacitor.
 * It reads/writes to localStorage synchronously for immediate UI updates,
 * and asynchronously syncs to Capacitor Preferences (which is safer on native).
 */

export function syncStorageFromPreferences(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    return Promise.resolve();
  }
  if (hydrationPromise) return hydrationPromise;
  const changes = new Set<string>();
  hydrationChanges = changes;
  hydrationCleared = false;
  let finished = false;
  let timeout: ReturnType<typeof setTimeout>;
  const restore = async () => {
    const { keys } = await Preferences.keys();
    if (finished) return;
    const snapshots = new Map(keys.map((key) => [key, getItemSync(key)]));
    let next = 0;
    // Bound bridge concurrency and the complete operation, including value reads.
    await Promise.all(
      Array.from({ length: Math.min(8, keys.length) }, async () => {
        while (!finished && next < keys.length) {
          const key = keys[next++];
          try {
            const { value } = await Preferences.get({ key });
            if (
              !finished &&
              !hydrationCleared &&
              !changes.has(key) &&
              value !== null &&
              !isErasedStorageKey(key) &&
              getItemSync(key) === snapshots.get(key)
            ) {
              localStorage.setItem(key, value);
            }
          } catch (error) {
            console.warn('Native preference could not be restored:', key, error);
          }
        }
      })
    );
  };
  hydrationPromise = Promise.race([
    restore(),
    new Promise<void>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Native storage startup timeout')), 2000);
    }),
  ])
    .catch((error) => {
      console.warn('Failed to restore native preferences:', error);
    })
    .finally(() => {
      finished = true;
      clearTimeout(timeout);
      if (hydrationChanges === changes) hydrationChanges = null;
      hydrationPromise = null;
    });
  return hydrationPromise;
}

export function setItemSync(key: string, value: string) {
  if (isErasedStorageKey(key)) return;
  hydrationChanges?.add(key);
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(
      `localStorage quota exceeded for ${key}, but syncing to native Preferences anyway.`
    );
  }

  if (Capacitor.getPlatform() !== 'web') {
    queueNativeStorage(async () => {
      if (!isErasedStorageKey(key)) await Preferences.set({ key, value });
    });
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
  } catch (e) {
    return null;
  }
}

export function removeItemSync(key: string) {
  hydrationChanges?.add(key);
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage removeItem failed for ${key}`, e);
  }
  if (Capacitor.getPlatform() !== 'web') {
    queueNativeStorage(() => Preferences.remove({ key }));
  }
}

export function clearSync() {
  hydrationCleared = true;
  clearingThroughHelper = true;
  try {
    localStorage.clear();
  } catch (e) {
    console.warn('localStorage.clear failed', e);
  } finally {
    clearingThroughHelper = false;
  }
  if (Capacitor.getPlatform() !== 'web') {
    queueNativeStorage(() => Preferences.clear());
  }
}

export function getSessionItemSync(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setSessionItemSync(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch (e) {
    console.warn(`sessionStorage setItem failed for ${key}`, e);
  }
}

export function removeSessionItemSync(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch (e) {
    console.warn(`sessionStorage removeItem failed for ${key}`, e);
  }
}

// Ensure clear still clears native
try {
  if (typeof localStorage !== 'undefined' && localStorage.clear) {
    const originalClear = localStorage.clear.bind(localStorage);
    localStorage.clear = function () {
      hydrationCleared = true;
      try {
        originalClear();
      } catch (e) {
        console.warn('localStorage.clear failed', e);
      }
      if (Capacitor.getPlatform() !== 'web' && !clearingThroughHelper) {
        queueNativeStorage(() => Preferences.clear());
      }
    };
  }
} catch (e) {
  console.warn('localStorage access blocked globally', e);
}
