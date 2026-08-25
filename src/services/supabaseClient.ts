import { createClient } from '@supabase/supabase-js';
import { safariSafeAuthStorage } from './safariSafeAuthStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-project.supabase.co') {
  console.error('CRITICAL: VITE_SUPABASE_URL is not set. Supabase features will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'healthchain_auth_token',
    storage: typeof window !== 'undefined' ? safariSafeAuthStorage : undefined,
    flowType: 'pkce',
    // Safari / WebKit tab close deadlock mitigation:
    // WebKit frequently deadlocks navigator.locks when a tab is closed or backgrounded.
    // Providing a direct pass-through lock prevents getSession() hangs on Safari tab reopen.
    lock: (async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
      return await fn();
    }) as any,
  },
});
