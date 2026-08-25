import { supabase } from './supabaseClient';
import { safariSafeAuthStorage } from './safariSafeAuthStorage';

/**
 * The Supabase session is the source of truth for account access.
 * localStorage flags are only UI hints and must never authorize a workflow.
 */
export async function getActiveSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (!error && data?.session) return data.session;
    
    // DO NOT explicitly call refreshSession() here.
    // If getSession() didn't return a session, it means the internal recovery process
    // either hasn't finished or determined the session is invalid.
    // Calling refreshSession() manually here races with the internal client and causes
    // token revocation due to reuse detection.
    return null;
  } catch {
    return null;
  }
}

export async function hasActiveSession() {
  return Boolean(await getActiveSession());
}
