import { createClient } from '@supabase/supabase-js';
import { safariSafeAuthStorage } from './safariSafeAuthStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-project.supabase.co') {
  console.error('CRITICAL: VITE_SUPABASE_URL is not set. Supabase features will fail.');
}

// In-memory lock to prevent intra-tab race conditions while bypassing the buggy navigator.locks on Safari.
const memoryLocks = new Map<string, Promise<void>>();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'healthchain_auth_token',
    storage: typeof window !== 'undefined' ? safariSafeAuthStorage : undefined,
    flowType: 'pkce',
    // Safari / WebKit tab close deadlock mitigation:
    lock: (async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      while (memoryLocks.get(name)) {
        await memoryLocks.get(name);
      }
      let resolveLock!: () => void;
      memoryLocks.set(name, new Promise((resolve) => { resolveLock = resolve; }));
      try {
        return await fn();
      } finally {
        resolveLock();
        memoryLocks.delete(name);
      }
    }) as any,
  },
});
