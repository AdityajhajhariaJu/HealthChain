import { isOwnerErased } from './DurableHealthStorage';
export interface AccountScope {
  accountId: string;
  profileId: string;
  key: string;
  epoch: number;
}
let epoch = 0;
let lastKey = '';
export function captureAccountScope(): AccountScope {
  let accountId = 'guest';
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('hc_guest_mode') !== 'true') {
      const account = JSON.parse(localStorage.getItem('hc_account') || '{}');
      if (typeof account.id === 'string' && account.id) accountId = account.id;
    }
  } catch { /* Unavailable storage is an anonymous scope. */ }
  const profileId = 'profile_1';
  const key = 'hc_health_memory_' + accountId + '_' + profileId;
  if (lastKey !== key) {
    lastKey = key;
    epoch++;
  }
  return { accountId, profileId, key, epoch };
}
export function invalidateAccountScope() { epoch++; }
export function isAccountScopeCurrent(scope: AccountScope) {
  const current = captureAccountScope();
  return !isOwnerErased(scope.accountId) && current.key === scope.key && current.epoch === scope.epoch;
}
if (typeof window !== 'undefined')
  window.addEventListener('hc_logout', () => {
    invalidateAccountScope();
  });
