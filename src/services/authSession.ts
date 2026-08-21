import { supabase } from './supabaseClient';

/**
 * The Supabase session is the source of truth for account access.
 * localStorage flags are only UI hints and must never authorize a workflow.
 */
export async function getActiveSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function hasActiveSession() {
  return Boolean(await getActiveSession());
}
