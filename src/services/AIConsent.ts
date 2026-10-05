import { AI_CONSENT_VERSION } from '../../shared/privacy-consent.js';
import { captureAccountScope, isAccountScopeCurrent, type AccountScope } from './AccountScope';
import { getItemSync, removeItemSync, setItemSync } from './storage';
import { hasHealthDataConsent, HEALTH_DATA_CONSENT_CHANGED } from './HealthDataConsent';

export { AI_CONSENT_VERSION };
export const AI_CONSENT_EVENT = 'hc_ai_consent_requested';
export const AI_CONSENT_CHANGED = 'hc_ai_consent_changed';
const pending = new Map<number, { scope: AccountScope; complete: (allowed: boolean) => void }>();
let nextId = 0;
const keyFor = (scope: AccountScope) => 'hc_ai_consent_' + scope.accountId;
export function hasAIConsent(scope = captureAccountScope()) {
  if (scope.accountId !== 'guest' && !hasHealthDataConsent(scope)) return false;
  try {
    const record = JSON.parse(getItemSync(keyFor(scope)) || 'null');
    return (
      isAccountScopeCurrent(scope) &&
      record?.version === AI_CONSENT_VERSION &&
      record?.accepted === true
    );
  } catch {
    return false;
  }
}
export function acceptAIConsent(scope = captureAccountScope()) {
  if (
    !isAccountScopeCurrent(scope) ||
    (scope.accountId !== 'guest' && !hasHealthDataConsent(scope))
  )
    return false;
  setItemSync(
    keyFor(scope),
    JSON.stringify({
      version: AI_CONSENT_VERSION,
      accepted: true,
      acceptedAt: new Date().toISOString(),
    })
  );
  window.dispatchEvent(new Event(AI_CONSENT_CHANGED));
  return hasAIConsent(scope);
}
export function revokeAIConsent() {
  removeItemSync(keyFor(captureAccountScope()));
  for (const request of [...pending.values()]) request.complete(false);
  window.dispatchEvent(new Event(AI_CONSENT_CHANGED));
}
export function pendingAIConsent() {
  return [...pending.values()].some((request) => isAccountScopeCurrent(request.scope));
}
export function resolveAIConsent(allowed: boolean) {
  const current = captureAccountScope();
  const accepted = allowed && pendingAIConsent() && acceptAIConsent(current);
  for (const request of [...pending.values()])
    request.complete(accepted && isAccountScopeCurrent(request.scope));
}
export function requestAIConsent(signal?: AbortSignal): Promise<void> {
  const scope = captureAccountScope();
  if (signal?.aborted) return Promise.reject(new DOMException('Request cancelled.', 'AbortError'));
  if (scope.accountId !== 'guest' && !hasHealthDataConsent(scope))
    return Promise.reject(
      new Error(
        'Cloud health processing is paused. Enable cloud health storage in Settings before using signed-in AI features.'
      )
    );
  if (hasAIConsent(scope)) return Promise.resolve();
  if (typeof window === 'undefined') return Promise.reject(new Error('AI permission is required.'));
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const cleanup = () => {
      pending.delete(id);
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      window.removeEventListener('hc_logout', cancel);
      window.removeEventListener('hc_account_scope_changed', cancel);
      window.removeEventListener('hc_profile_updated', checkScope);
      window.removeEventListener('storage', checkScope);
      window.dispatchEvent(new Event(AI_CONSENT_EVENT));
    };
    const complete = (allowed: boolean) => {
      cleanup();
      if (allowed && isAccountScopeCurrent(scope)) resolve();
      else reject(new Error('AI permission was not given. Your information was not sent.'));
    };
    const cancel = () => complete(false);
    const checkScope = () => {
      if (!isAccountScopeCurrent(scope)) complete(false);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Request cancelled.', 'AbortError'));
    };
    const timer = setTimeout(cancel, 120000);
    pending.set(id, { scope, complete });
    signal?.addEventListener('abort', abort, { once: true });
    window.addEventListener('hc_logout', cancel, { once: true });
    window.addEventListener('hc_account_scope_changed', cancel, { once: true });
    window.addEventListener('hc_profile_updated', checkScope);
    window.addEventListener('storage', checkScope);
    window.dispatchEvent(new Event(AI_CONSENT_EVENT));
  });
}

if (typeof window !== 'undefined')
  window.addEventListener(HEALTH_DATA_CONSENT_CHANGED, () => {
    if (captureAccountScope().accountId !== 'guest' && !hasHealthDataConsent()) revokeAIConsent();
  });
