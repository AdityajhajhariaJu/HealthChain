/**
 * Stable, account-scoped identities for transient client runs.
 *
 * These values are deliberately used only for UI/session state. Durable
 * clinical records remain in Supabase and are never replaced by this cache.
 */
export type RunWorkflow =
  'mdt' | 'quick-consult' | 'parallel' | 'conference' | 'lab' | 'profile' | 'diet' | 'trials';

const safePart = (value: unknown, fallback: string) => {
  const text = String(value || fallback).trim();
  return text.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || fallback;
};

export function getAccountScope(): string {
  try {
    if (localStorage.getItem('hc_guest_mode') === 'true') return 'guest';
    const account = JSON.parse(localStorage.getItem('hc_account') || 'null');
    if (account?.id) return safePart(account.id, 'account');
  } catch {}
  return 'guest';
}

export function getProfileScope(): string {
  try {
    const account = getAccountScope();
    const raw = localStorage.getItem(`hc_unified_profile_${account}`);
    if (!raw) return 'profile-default';
    const state = JSON.parse(raw);
    const activeId = state?.activeId || state?.id || 'profile_1';
    const profile = state?.profiles?.[activeId] || state;
    const stable = JSON.stringify({
      activeId,
      id: profile?.id || activeId,
      updatedAt: profile?.demographics?.updatedAt || profile?.updatedAt,
      version: profile?.version,
    });
    let hash = 0;
    for (let i = 0; i < stable.length; i++) hash = ((hash << 5) - hash + stable.charCodeAt(i)) | 0;
    return safePart(`profile-${Math.abs(hash)}`, 'profile-default');
  } catch {
    return 'profile-default';
  }
}

export function getRunScope(workflow: RunWorkflow, caseId = 'draft', runId = 'session'): string {
  return `hc_run_v2_${safePart(workflow, 'workflow')}_${getAccountScope()}_${getProfileScope()}_${safePart(caseId, 'draft')}_${safePart(runId, 'session')}`;
}
