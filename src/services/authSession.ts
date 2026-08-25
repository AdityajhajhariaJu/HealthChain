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
    
    // If session was momentarily lost during Safari tab wake-up, attempt auto-refresh
    const hasStoredToken = Boolean(
      safariSafeAuthStorage.getItem('healthchain_auth_token') ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('isAuthenticated') === 'true')
    );

    if (hasStoredToken) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData?.session) {
        return refreshData.session;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function hasActiveSession() {
  return Boolean(await getActiveSession());
}
