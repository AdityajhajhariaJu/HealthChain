import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (supabaseUrl === 'https://placeholder-project.supabase.co') {
  console.error('CRITICAL: VITE_SUPABASE_URL is not set. Supabase features will fail.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
