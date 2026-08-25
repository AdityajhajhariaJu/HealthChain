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
    // Safari / WebKit tab close deadlock mitigation with proper async mutex chaining:
    lock: (async (name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      const currentLock = memoryLocks.get(name) || Promise.resolve();
      let resolveNext!: () => void;
      const nextLock = new Promise<void>((resolve) => { resolveNext = resolve; });
      
      memoryLocks.set(name, currentLock.then(() => nextLock));
      
      await currentLock;
      try {
        return await fn();
      } finally {
        resolveNext();
        if (memoryLocks.get(name) === nextLock) {
          memoryLocks.delete(name);
        }
      }
    }) as any,
  },
});
