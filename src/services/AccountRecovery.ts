import { captureAccountScope, isAccountScopeCurrent } from './AccountScope';
import { createCoalescedTask } from './CoalescedTask';
import {
  flushDailyTrackerLedger,
  hydrateDailyTrackerProjections,
  migrateDailyTrackerHistory,
} from './DailyTrackerLedger';
import {
  loadObservationsFromCloud,
  retryFailedObservationQueues,
} from './HealthObservationService';
import { flushSyncOutbox } from './SyncOutbox';

/** One recovery worker for online/resume/auth events; re-read after an in-flight change. */
export const requestAccountRecovery = createCoalescedTask(async () => {
  const scope = captureAccountScope();
  await flushSyncOutbox();
  if (!isAccountScopeCurrent(scope)) return;
  await migrateDailyTrackerHistory();
  await flushDailyTrackerLedger();
  if (!isAccountScopeCurrent(scope) || scope.accountId === 'guest') return;
  await retryFailedObservationQueues();
  if (!isAccountScopeCurrent(scope)) return;
  await flushSyncOutbox(scope.accountId);
  if (!isAccountScopeCurrent(scope)) return;
  const result = await loadObservationsFromCloud();
  if (!isAccountScopeCurrent(scope)) return;
  if (['loaded', 'conflict'].includes(result.status)) await hydrateDailyTrackerProjections();
  if (isAccountScopeCurrent(scope) && result.conflicts) {
    window.dispatchEvent(
      new CustomEvent('hc_sync_error', {
        detail: {
          area: 'observations',
          message: `${result.conflicts} observation conflicts need review. Your local edits were preserved.`,
        },
      })
    );
  }
});
