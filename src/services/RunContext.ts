/**
 * Stable, account-scoped identities for transient client runs.
 *
 * These values are deliberately used only for UI/session state. Durable
 * clinical records remain in Supabase and are never replaced by this cache.
 */
export type RunWorkflow =
  | 'mdt'
  | 'quick-consult'
  | 'parallel'
  | 'conference'
  | 'lab'
  | 'profile'
  | 'diet'
  | 'trials';

const safePart = (value: unknown, fallback: string) => {
  const text = String(value || fallback).trim();
  return text.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || fallback;
};

export function getAccountScope(): string {
  try {
    const account = JSON.parse(localStorage.getItem('hc_account') || 'null');
    if (account?.id) return safePart(account.id, 'account');
  } catch {}
  return 'guest';
}

export function getProfileScope(): string {
  try {
    const account = getAccountScope();
    const raw = localStorage.getItem(`hc_unified_profile_${account}`) || localStorage.getItem('hc_unified_profile');
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

export function makeRunId(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function getRunScope(workflow: RunWorkflow, caseId = 'draft', runId = 'session'): string {
  return `hc_run_v2_${safePart(workflow, 'workflow')}_${getAccountScope()}_${getProfileScope()}_${safePart(caseId, 'draft')}_${safePart(runId, 'session')}`;
}

export function clearRunStorage(workflow?: RunWorkflow, caseId?: string) {
  if (typeof sessionStorage === 'undefined') return;
  const prefix = 'hc_run_v2_';
  const casePart = caseId ? `_${safePart(caseId, 'draft')}_` : null;
  try {
    Object.keys(sessionStorage).forEach((key) => {
      if (!key.startsWith(prefix)) return;
      if (workflow && !key.includes(`_${workflow}_`)) return;
      if (casePart && !key.includes(casePart)) return;
      sessionStorage.removeItem(key);
    });
  } catch {}
}

export function readRunJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

export function writeRunJson(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}
