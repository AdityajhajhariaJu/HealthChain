import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { hasHealthDataConsent, HEALTH_DATA_CONSENT_CHANGED } from './HealthDataConsent';

const healthTables = new Set([
  'profiles',
  'healthchain_profiles',
  'cases',
  'case_tombstones',
  'health_memory',
  'health_observations',
  'ava_messages',
  'user_fitness_history',
  'user_body_measurements',
  'user_health_metrics',
  'user_progress_photos',
  'user_program_progress',
  'user_streaks',
  'user_badges',
]);

function isHealthRequest(path: string) {
  path = decodeURIComponent(path);
  if (path.startsWith('/storage/v1/'))
    return !/^\/storage\/v1\/(?:object|render\/image)\/public\//.test(path);
  const resource = path.replace(/^\/rest\/v1\//, '').split('/')[0];
  if (path.startsWith('/rest/v1/') && healthTables.has(resource)) return true;
  return /^\/rest\/v1\/rpc\/(?:sync_(?:case|health)|restore_health|delete_case|start_fitness|complete_fitness|complete_workout)/.test(
    path
  );
}

/** Consent is a privacy control, not a substitute for server authentication/RLS. */
export function healthConsentFetch(providerUrl: string): typeof fetch {
  const providerOrigin = new URL(providerUrl).origin;
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), providerOrigin);
    if (url.origin !== providerOrigin || !isHealthRequest(url.pathname)) return fetch(input, init);
    const scope = captureAccountScope();
    const allowed = () => isAccountScopeCurrent(scope) && hasHealthDataConsent(scope);
    const refused = () =>
      new Response(
        JSON.stringify({
          code: 'HC_HEALTH_CONSENT_REQUIRED',
          message: 'Cloud health processing is paused. Your local records remain available.',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    if (!allowed()) return refused();
    const controller = new AbortController();
    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const cancel = () => controller.abort();
    const check = () => {
      if (!allowed()) cancel();
    };
    const events = [
      HEALTH_DATA_CONSENT_CHANGED,
      'hc_account_scope_changed',
      'hc_logout',
      'storage',
    ];
    if (callerSignal?.aborted) cancel();
    else callerSignal?.addEventListener('abort', cancel, { once: true });
    events.forEach((event) => window.addEventListener(event, check));
    check();
    try {
      if (!allowed()) return refused();
      if (controller.signal.aborted) throw new DOMException('Request cancelled', 'AbortError');
      const received = await fetch(input, { ...init, signal: controller.signal });
      // Keep withdrawal active while a finite PostgREST/Storage response is read.
      const body = await received.arrayBuffer();
      if (!allowed()) return refused();
      return new Response([204, 205, 304].includes(received.status) ? null : body, {
        status: received.status,
        statusText: received.statusText,
        headers: received.headers,
      });
    } catch (error) {
      if (!allowed()) return refused();
      throw error;
    } finally {
      callerSignal?.removeEventListener('abort', cancel);
      events.forEach((event) => window.removeEventListener(event, check));
    }
  };
}
