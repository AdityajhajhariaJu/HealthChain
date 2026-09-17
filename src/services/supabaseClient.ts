import { createClient } from '@supabase/supabase-js';
import { safariSafeAuthStorage } from './safariSafeAuthStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://supabase.healthchain.local';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'hc-anon-fallback';

if (!import.meta.env.VITE_SUPABASE_URL && !import.meta.env.DEV) {
  console.error('CRITICAL: VITE_SUPABASE_URL environment variable is not configured. Supabase cloud features will fail.');
}


if (typeof window === 'undefined' && typeof global !== 'undefined') {
  if (!global.WebSocket) {
    // Mock WebSocket for Node.js tests since @supabase/realtime-js requires it
    global.WebSocket = class WebSocket {
      constructor() {}
      send() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    } as any;
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
