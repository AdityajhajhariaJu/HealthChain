import { createClient } from '@supabase/supabase-js';
import { safariSafeAuthStorage } from './safariSafeAuthStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.healthchain.local';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'hc-anon-fallback';

if (!import.meta.env.VITE_SUPABASE_URL && !import.meta.env.DEV) {
  console.error('CRITICAL: VITE_SUPABASE_URL environment variable is not configured. Supabase cloud features will fail.');
}

// For Node.js (Vitest) environments to avoid WebSocket error
let transport;
try { transport = typeof window === 'undefined' ? require('ws') : undefined; } catch(e) {}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    transport,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'healthchain_auth_token',
    storage: typeof window !== 'undefined' ? safariSafeAuthStorage : undefined,
    flowType: 'implicit',
  },
});
