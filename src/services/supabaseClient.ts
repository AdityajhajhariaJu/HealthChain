import { createClient } from '@supabase/supabase-js';
import { safariSafeAuthStorage } from './safariSafeAuthStorage';
import WebSocket from 'ws';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-project.supabase.co') {
  console.error('CRITICAL: VITE_SUPABASE_URL is not set. Supabase features will fail.');
}

// Set up global polyfill for WebSocket in Node environments (e.g. Vitest)
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  const _global = global as any;
  if (!_global.WebSocket) {
    _global.WebSocket = WebSocket;
  }
  if (!_global.fetch) {
    _global.fetch = fetch;
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'healthchain_auth_token',
    storage: typeof window !== 'undefined' ? safariSafeAuthStorage : undefined,
    flowType: 'implicit',
  },
});
