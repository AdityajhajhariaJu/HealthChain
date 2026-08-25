import { get, set, del } from 'idb-keyval';

/**
 * Resilient multi-tier storage adapter for Supabase Auth.
 * Specifically mitigates Safari WebKit ITP, private browsing, and tab-close
 * storage eviction by persisting auth tokens simultaneously across:
 * 1. Synchronous In-Memory Cache
 * 2. Window LocalStorage
 * 3. 1-Year First-Party Cookie (SameSite=Lax)
 * 4. Asynchronous IndexedDB (idb-keyval)
 */

const memoryCache = new Map<string, string>();
const IDB_PREFIX = 'hc_auth_idb_';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        const raw = c.substring(nameEQ.length, c.length);
        return decodeURIComponent(raw);
      }
    }
  } catch (e) {
    console.warn('[SafariSafeAuthStorage] Cookie read error:', e);
  }
  return null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  try {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? ' Secure;' : '';
    document.cookie =
      name +
      '=' +
      encodeURIComponent(value) +
      '; expires=' +
      expires +
      '; path=/; max-age=' +
      days * 24 * 60 * 60 +
      '; SameSite=Lax;' +
      secureFlag;
  } catch (e) {
    console.warn('[SafariSafeAuthStorage] Cookie write error:', e);
  }
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  try {
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureFlag = isSecure ? ' Secure;' : '';
    document.cookie =
      name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; max-age=0; SameSite=Lax;' + secureFlag;
  } catch (e) {
    console.warn('[SafariSafeAuthStorage] Cookie remove error:', e);
  }
}

export const safariSafeAuthStorage = {
  getItem(key: string): string | null {
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
      // Ensure cookie is in sync
      setCookie(key, localVal, 365);
      return localVal;
    }

    // 3. Cookie fallback (Safari tab close / ITP recovery)
    const cookieVal = getCookie(key);
    if (cookieVal) {
      memoryCache.set(key, cookieVal);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, cookieVal);
        }
      } catch {}
      return cookieVal;
    }

    // 4. Backward compatibility: check if there is an old sb-*-auth-token key in localStorage
    if (key === 'healthchain_auth_token' && typeof window !== 'undefined' && window.localStorage) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
            const legacyVal = window.localStorage.getItem(k);
            if (legacyVal) {
              memoryCache.set(key, legacyVal);
              window.localStorage.setItem(key, legacyVal);
              setCookie(key, legacyVal, 365);
              return legacyVal;
            }
          }
        }
      } catch {}
    }

    return null;
  },

  setItem(key: string, value: string): void {
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

    // 3. Update persistent cookie (1 year lifespan)
    setCookie(key, value, 365);

    // 4. Update IndexedDB asynchronously for robust offline/PWA backup
    try {
      set(IDB_PREFIX + key, value).catch(() => {});
    } catch {}
  },

  removeItem(key: string): void {
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

    // 3. Remove from cookie
    removeCookie(key);

    // 4. Remove from IndexedDB
    try {
      del(IDB_PREFIX + key).catch(() => {});
    } catch {}
  },
};

// Asynchronous hydration from IndexedDB on startup if localStorage & cookie were wiped
if (typeof window !== 'undefined') {
  void (async () => {
    try {
      const key = 'healthchain_auth_token';
      const existing = safariSafeAuthStorage.getItem(key);
      if (!existing) {
        const idbVal = await get<string>(IDB_PREFIX + key);
        if (idbVal) {
          safariSafeAuthStorage.setItem(key, idbVal);
          // Notify Supabase if it was initialized before IDB resolved
          window.dispatchEvent(new CustomEvent('hc_auth_storage_restored'));
        }
      }
    } catch {}
  })();
}

