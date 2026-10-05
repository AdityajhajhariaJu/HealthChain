import { Capacitor } from '@capacitor/core';
import { createClient } from '@supabase/supabase-js';
import { safariSafeAuthStorage } from './safariSafeAuthStorage';
import { healthConsentFetch } from './healthConsentFetch';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.healthchain.local';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'hc-anon-fallback';

if (!import.meta.env.VITE_SUPABASE_URL && !import.meta.env.DEV) {
  console.error(
    'CRITICAL: VITE_SUPABASE_URL environment variable is not configured. Supabase cloud features will fail.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: healthConsentFetch(supabaseUrl) },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Capacitor.getPlatform() === 'web',
    storageKey: 'healthchain_auth_token',
    storage: typeof window !== 'undefined' ? safariSafeAuthStorage : undefined,
    flowType: Capacitor.getPlatform() === 'web' ? 'implicit' : 'pkce',
  },
});
