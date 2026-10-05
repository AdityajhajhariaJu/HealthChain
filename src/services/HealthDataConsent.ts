import { captureAccountScope, isAccountScopeCurrent, type AccountScope } from './AccountScope';
import { getItemSync, setItemSync } from './storage';

export const HEALTH_DATA_CONSENT_VERSION = '2026-10-05-cloud-health';
export const HEALTH_DATA_CONSENT_CHANGED = 'hc_health_data_consent_changed';
export const OPEN_HEALTH_DATA_CONSENT = 'hc_open_health_data_consent';
const keyFor = (scope: AccountScope) => 'hc_health_data_consent_' + scope.accountId;

export function healthDataChoice(scope = captureAccountScope()): boolean | null {
  if (scope.accountId === 'guest' || !isAccountScopeCurrent(scope)) return null;
  try {
    const record = JSON.parse(getItemSync(keyFor(scope)) || 'null');
    return record?.version === HEALTH_DATA_CONSENT_VERSION &&
      record?.accountId === scope.accountId &&
      typeof record?.accepted === 'boolean'
      ? record.accepted
      : null;
  } catch {
    return null;
  }
}

export function hasHealthDataConsent(scope = captureAccountScope()) {
  return healthDataChoice(scope) === true;
}

export function setHealthDataConsent(accepted: boolean, scope = captureAccountScope()) {
  if (scope.accountId === 'guest' || !isAccountScopeCurrent(scope)) return false;
  setItemSync(
    keyFor(scope),
    JSON.stringify({
      version: HEALTH_DATA_CONSENT_VERSION,
      accountId: scope.accountId,
      accepted,
      recordedAt: new Date().toISOString(),
    })
  );
  const saved = healthDataChoice(scope) === accepted;
  if (saved) window.dispatchEvent(new Event(HEALTH_DATA_CONSENT_CHANGED));
  return saved;
}
