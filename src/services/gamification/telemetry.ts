/** Bounded operational metadata only. This module must not import health/auth repositories. */
export interface ActivityTelemetry {
  counts: Record<string, { completed: number; failed: number }>;
  recent: { operation: string; status: 'completed' | 'failed'; at: string; durationMs?: number }[];
}
let pending: ActivityTelemetry | undefined,
  pendingScope = '',
  timer: ReturnType<typeof setTimeout> | undefined;
let installed = false;
const appApiRoutes = new Set([
  'gemini',
  'trials',
  'recover',
  'food-product',
  'delete-account',
  'create-order',
  'verify-payment',
  'razorpay-webhook',
  'push-test',
  'admin-content',
  'cron',
]);
function scope() {
  try {
    const account = JSON.parse(localStorage.getItem('hc_account') || '{}').id;
    const key =
      localStorage.getItem('hc_guest_mode') === 'true'
        ? 'hc_unified_profile_guest'
        : account
          ? `hc_unified_profile_${account}`
          : 'hc_unified_profile';
    const profile = JSON.parse(localStorage.getItem(key) || '{}').activeId || 'profile_1';
    return `${key}:${profile}`;
  } catch {
    return 'hc_unified_profile_guest:profile_1';
  }
}
const storageKey = (ownerScope: string) => `hc_gamification_activity:${ownerScope}`;
const validOperation = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[a-zA-Z0-9_:.\/-]{1,100}$/.test(value) &&
  !['__proto__', 'constructor', 'prototype'].includes(value);
function load(ownerScope: string): ActivityTelemetry {
  const result: ActivityTelemetry = { counts: {}, recent: [] };
  try {
    const parsed = JSON.parse(sessionStorage.getItem(storageKey(ownerScope)) || 'null');
    const count = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    for (const [operation, value] of Object.entries(parsed?.counts || {}).slice(0, 121) as [
      string,
      any,
    ][]) {
      if (validOperation(operation))
        result.counts[operation] = {
          completed: count(value?.completed),
          failed: count(value?.failed),
        };
    }
    result.recent = (Array.isArray(parsed?.recent) ? parsed.recent : [])
      .slice(0, 60)
      .filter(
        (item: any) =>
          validOperation(item?.operation) &&
          ['completed', 'failed'].includes(item?.status) &&
          Number.isFinite(Date.parse(item?.at))
      )
      .map((item: any) => ({
        operation: item.operation,
        status: item.status,
        at: item.at,
        ...(typeof item.durationMs === 'number' && Number.isFinite(item.durationMs)
          ? { durationMs: count(item.durationMs) }
          : {}),
      }));
  } catch {
    /* Unavailable telemetry never blocks a user action. */
  }
  return result;
}
export function flushActivityTelemetry() {
  if (timer) clearTimeout(timer);
  timer = undefined;
  if (!pending) return;
  try {
    sessionStorage.setItem(storageKey(pendingScope), JSON.stringify(pending));
  } catch {
    /* Best-effort observability. */
  }
}
export function getActivityTelemetry() {
  return scope() === pendingScope && pending ? pending : load(scope());
}
export function observeActivity(
  operation: string,
  status: 'completed' | 'failed',
  durationMs?: number,
  ownerScope = scope()
) {
  if (ownerScope !== scope() || !validOperation(operation)) return;
  if (ownerScope !== pendingScope || !pending) {
    flushActivityTelemetry();
    pendingScope = ownerScope;
    pending = load(ownerScope);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pending.counts, operation) &&
    Object.keys(pending.counts).length >= 120
  )
    operation = 'other';
  const counts = pending.counts[operation] || { completed: 0, failed: 0 };
  pending.counts[operation] = { ...counts, [status]: counts[status] + 1 };
  pending.recent = [
    {
      operation,
      status,
      at: new Date().toISOString(),
      ...(typeof durationMs === 'number' ? { durationMs: Math.round(durationMs) } : {}),
    },
    ...pending.recent,
  ].slice(0, 60);
  if (!timer) timer = setTimeout(flushActivityTelemetry, 1500);
}
export function installActivityTelemetry() {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;
  const originalFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    let operation = '';
    try {
      const input = args[0],
        url = new URL(
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
          location.href
        );
      if (url.pathname.startsWith('/api/')) {
        const route = url.pathname.split('/')[2];
        operation = appApiRoutes.has(route) ? `api:/api/${route}` : 'api:other';
      } else if (/supabase\.(co|in)$/.test(url.hostname))
        operation = `api:supabase/${url.pathname.split('/')[1] || 'service'}`;
      else if (url.hostname === 'clinicaltrials.gov') operation = 'api:clinicaltrials';
      else if (url.hostname === 'eutils.ncbi.nlm.nih.gov') operation = 'api:pubmed';
      else if (!/\.(js|css|png|jpg|jpeg|svg|webp|mp4|m4a|woff2?)(?:$|\?)/i.test(url.pathname))
        operation = 'api:other';
    } catch {
      /* Preserve native fetch validation. */
    }
    const ownerScope = scope(),
      start = performance.now();
    try {
      const response = await originalFetch.apply(this, args);
      if (operation)
        observeActivity(
          operation,
          response.ok ? 'completed' : 'failed',
          performance.now() - start,
          ownerScope
        );
      return response;
    } catch (error) {
      if (operation) observeActivity(operation, 'failed', performance.now() - start, ownerScope);
      throw error;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushActivityTelemetry();
  });
  window.addEventListener('pagehide', flushActivityTelemetry);
  window.addEventListener('hc_logout', () => {
    flushActivityTelemetry();
    pending = undefined;
    pendingScope = '';
  });
}
