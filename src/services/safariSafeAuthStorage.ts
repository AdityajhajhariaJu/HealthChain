import { get, set, del } from 'idb-keyval';

/**
 * Resilient multi-tier storage adapter for Supabase Auth.
 * Specifically mitigates Safari WebKit ITP, private browsing, and tab-close
 * storage eviction by persisting auth tokens simultaneously across:
 * 1. Synchronous In-Memory Cache (fastest, survives SPA navigations)
 * 2. Window LocalStorage (survives page reloads)
 * 3. Asynchronous IndexedDB via idb-keyval (survives Safari tab close / ITP evictions)
 *
 * All methods are async to guarantee IndexedDB reads complete before Supabase
 * makes authentication decisions.
 */

const memoryCache = new Map<string, string>();
const IDB_PREFIX = 'hc_auth_idb_';

export const safariSafeAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    // 1. In-memory check
    if (memoryCache.has(key)) {
      const val = memoryCache.get(key);
      if (val) return val;
    }

    // 2. LocalStorage check
    let localVal: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localVal = window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn('[SafariSafeAuthStorage] localStorage read error:', e);
    }

    if (localVal) {
      memoryCache.set(key, localVal);
      return localVal;
    }

    // 3. Backward compatibility: check if there is an old sb-*-auth-token key in localStorage
    if (key === 'healthchain_auth_token' && typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
            const legacyVal = window.localStorage.getItem(k);
            if (legacyVal) {
              memoryCache.set(key, legacyVal);
              window.localStorage.setItem(key, legacyVal);
              return legacyVal;
            }
          }
        }
      } catch {}
    }

    // 4. IndexedDB fallback (durable async storage for Safari PWA/Private/ITP evictions)
    try {
      const idbVal = await get<string>(IDB_PREFIX + key);
      if (idbVal) {
        memoryCache.set(key, idbVal);
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, idbVal);
          }
        } catch {}
        // Notify Supabase/App if it was initialized before IDB resolved
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hc_auth_storage_restored'));
        }
        return idbVal;
      }
    } catch (e) {
      console.warn('[SafariSafeAuthStorage] IndexedDB read error:', e);
    }

    return null;
  },

  async setItem(key: string, value: string): Promise<void> {
    // 1. Update memory
    memoryCache.set(key, value);

    // 2. Update localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('[SafariSafeAuthStorage] localStorage write error:', e);
    }

    // 3. Update IndexedDB asynchronously for robust offline/PWA backup
    try {
      await set(IDB_PREFIX + key, value);
    } catch (e) {
      console.warn('[SafariSafeAuthStorage] IndexedDB write error:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    // 1. Remove from memory
    memoryCache.delete(key);

    // 2. Remove from localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[SafariSafeAuthStorage] localStorage remove error:', e);
    }

    // 3. Remove from IndexedDB
    try {
      await del(IDB_PREFIX + key);
    } catch (e) {
      console.warn('[SafariSafeAuthStorage] IndexedDB remove error:', e);
    }
  },
};

